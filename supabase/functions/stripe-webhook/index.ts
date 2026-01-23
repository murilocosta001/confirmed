import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No stripe-signature header");

    const body = await req.text();
    
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", { error: errorMessage });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(supabaseClient, stripe, session);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(supabaseClient, stripe, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabaseClient, invoice);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabaseClient, subscription);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabaseClient, subscription);
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function getClinicByStripeCustomer(supabaseClient: any, customerId: string) {
  // First try to find by stripe_customer_id in subscriptions
  const { data: subscription } = await supabaseClient
    .from("subscriptions")
    .select("clinic_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (subscription?.clinic_id) {
    return subscription.clinic_id;
  }

  return null;
}

async function getClinicByEmail(supabaseClient: any, stripe: Stripe, customerId: string) {
  // Get customer email from Stripe
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !customer.email) {
    logStep("Customer not found or no email", { customerId });
    return null;
  }

  // Find user by email
  const { data: userData } = await supabaseClient.auth.admin.listUsers();
  const user = userData?.users?.find((u: any) => u.email === customer.email);
  
  if (!user) {
    logStep("User not found for email", { email: customer.email });
    return null;
  }

  // Find clinic by user_id
  const { data: clinic } = await supabaseClient
    .from("clinics")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return clinic?.id || null;
}

async function handleCheckoutComplete(supabaseClient: any, stripe: Stripe, session: Stripe.Checkout.Session) {
  logStep("Handling checkout.session.completed", { sessionId: session.id });

  if (session.mode !== "subscription") {
    logStep("Not a subscription checkout, skipping");
    return;
  }

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  // Get subscription details from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Find clinic by customer ID or email
  let clinicId = await getClinicByStripeCustomer(supabaseClient, customerId);
  if (!clinicId) {
    clinicId = await getClinicByEmail(supabaseClient, stripe, customerId);
  }

  if (!clinicId) {
    logStep("Could not find clinic for customer", { customerId });
    return;
  }

  // Update subscription with Stripe details
  const { error } = await supabaseClient
    .from("subscriptions")
    .update({
      status: stripeSubscription.status === "trialing" ? "trialing" : "active",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("clinic_id", clinicId);

  if (error) {
    logStep("Error updating subscription", { error: error.message });
  } else {
    logStep("Subscription activated successfully", { clinicId, subscriptionId });
  }
}

async function handlePaymentSucceeded(supabaseClient: any, stripe: Stripe, invoice: Stripe.Invoice) {
  logStep("Handling invoice.payment_succeeded", { invoiceId: invoice.id });

  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    logStep("No subscription ID in invoice, skipping");
    return;
  }

  // Get subscription details from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Find clinic by customer ID
  let clinicId = await getClinicByStripeCustomer(supabaseClient, customerId);
  if (!clinicId) {
    clinicId = await getClinicByEmail(supabaseClient, stripe, customerId);
  }

  if (!clinicId) {
    logStep("Could not find clinic for customer", { customerId });
    return;
  }

  // Update subscription status to active
  const { error } = await supabaseClient
    .from("subscriptions")
    .update({
      status: "active",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("clinic_id", clinicId);

  if (error) {
    logStep("Error updating subscription", { error: error.message });
  } else {
    logStep("Subscription renewed successfully", { clinicId });
  }
}

async function handlePaymentFailed(supabaseClient: any, invoice: Stripe.Invoice) {
  logStep("Handling invoice.payment_failed", { invoiceId: invoice.id });

  const customerId = invoice.customer as string;

  // Find clinic by customer ID
  const clinicId = await getClinicByStripeCustomer(supabaseClient, customerId);

  if (!clinicId) {
    logStep("Could not find clinic for customer", { customerId });
    return;
  }

  // Update subscription status to past_due
  const { error } = await supabaseClient
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("clinic_id", clinicId);

  if (error) {
    logStep("Error updating subscription", { error: error.message });
  } else {
    logStep("Subscription marked as past_due", { clinicId });
  }
}

async function handleSubscriptionDeleted(supabaseClient: any, subscription: Stripe.Subscription) {
  logStep("Handling customer.subscription.deleted", { subscriptionId: subscription.id });

  const customerId = subscription.customer as string;

  // Find clinic by customer ID
  const clinicId = await getClinicByStripeCustomer(supabaseClient, customerId);

  if (!clinicId) {
    logStep("Could not find clinic for customer", { customerId });
    return;
  }

  // Update subscription status to cancelled
  const { error } = await supabaseClient
    .from("subscriptions")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("clinic_id", clinicId);

  if (error) {
    logStep("Error updating subscription", { error: error.message });
  } else {
    logStep("Subscription cancelled", { clinicId });
  }
}

async function handleSubscriptionUpdated(supabaseClient: any, subscription: Stripe.Subscription) {
  logStep("Handling customer.subscription.updated", { subscriptionId: subscription.id });

  const customerId = subscription.customer as string;

  // Find clinic by customer ID
  const clinicId = await getClinicByStripeCustomer(supabaseClient, customerId);

  if (!clinicId) {
    logStep("Could not find clinic for customer", { customerId });
    return;
  }

  // Map Stripe status to our status
  let status: "active" | "trialing" | "past_due" | "cancelled" = "cancelled";
  if (subscription.status === "active") status = "active";
  else if (subscription.status === "trialing") status = "trialing";
  else if (subscription.status === "past_due") status = "past_due";
  else if (subscription.status === "canceled" || subscription.status === "unpaid") status = "cancelled";

  // Update subscription
  const { error } = await supabaseClient
    .from("subscriptions")
    .update({
      status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("clinic_id", clinicId);

  if (error) {
    logStep("Error updating subscription", { error: error.message });
  } else {
    logStep("Subscription updated", { clinicId, status });
  }
}
