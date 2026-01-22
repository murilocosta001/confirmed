import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // First, check local subscription in database
    const { data: clinicData, error: clinicError } = await supabaseClient
      .from("clinics")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (clinicError) {
      logStep("Error fetching clinic", { error: clinicError.message });
    }

    if (clinicData) {
      const { data: localSub, error: subError } = await supabaseClient
        .from("subscriptions")
        .select("*")
        .eq("clinic_id", clinicData.id)
        .maybeSingle();

      if (subError) {
        logStep("Error fetching local subscription", { error: subError.message });
      }

      if (localSub) {
        logStep("Found local subscription", { 
          status: localSub.status, 
          periodEnd: localSub.current_period_end,
          stripeCustomerId: localSub.stripe_customer_id
        });

        // If it's a local trial (no Stripe subscription yet), check if expired
        if (localSub.status === "trialing" && !localSub.stripe_subscription_id) {
          const trialEnd = new Date(localSub.current_period_end);
          const now = new Date();
          
          if (now > trialEnd) {
            logStep("Local trial has expired");
            // Update status to cancelled
            await supabaseClient
              .from("subscriptions")
              .update({ status: "cancelled" })
              .eq("id", localSub.id);

            return new Response(JSON.stringify({
              subscribed: false,
              status: "cancelled",
              subscription_end: localSub.current_period_end,
              stripe_customer_id: localSub.stripe_customer_id,
              stripe_subscription_id: null,
              trial_days_remaining: 0
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }

          // Trial still active
          const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          logStep("Local trial still active", { daysRemaining });
          
          return new Response(JSON.stringify({
            subscribed: true,
            status: "trialing",
            subscription_end: localSub.current_period_end,
            stripe_customer_id: localSub.stripe_customer_id,
            stripe_subscription_id: null,
            trial_days_remaining: daysRemaining
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }
    }

    // Check Stripe for active subscriptions
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found, checking local subscription");
      
      // If no Stripe customer but we have a local subscription, it might be a fresh trial
      if (clinicData) {
        const { data: localSub } = await supabaseClient
          .from("subscriptions")
          .select("*")
          .eq("clinic_id", clinicData.id)
          .maybeSingle();

        if (localSub && localSub.status === "trialing") {
          const trialEnd = new Date(localSub.current_period_end);
          const now = new Date();
          const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysRemaining > 0) {
            return new Response(JSON.stringify({
              subscribed: true,
              status: "trialing",
              subscription_end: localSub.current_period_end,
              stripe_customer_id: null,
              stripe_subscription_id: null,
              trial_days_remaining: daysRemaining
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
        }
      }

      return new Response(JSON.stringify({ 
        subscribed: false,
        status: "cancelled",
        subscription_end: null,
        stripe_customer_id: null,
        trial_days_remaining: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active subscriptions
    const activeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    // Also check for trialing subscriptions
    const trialingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "trialing",
      limit: 1,
    });

    // Check for past_due subscriptions
    const pastDueSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "past_due",
      limit: 1,
    });

    let status: "active" | "trialing" | "past_due" | "cancelled" = "cancelled";
    let subscriptionEnd = null;
    let stripeSubscriptionId = null;

    if (activeSubscriptions.data.length > 0) {
      const subscription = activeSubscriptions.data[0];
      status = "active";
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      stripeSubscriptionId = subscription.id;
      logStep("Active subscription found", { subscriptionId: subscription.id });
      
      // Update local subscription
      if (clinicData) {
        await supabaseClient
          .from("subscriptions")
          .update({
            status: "active",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: subscriptionEnd
          })
          .eq("clinic_id", clinicData.id);
      }
    } else if (trialingSubscriptions.data.length > 0) {
      const subscription = trialingSubscriptions.data[0];
      status = "trialing";
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      stripeSubscriptionId = subscription.id;
      logStep("Trialing subscription found", { subscriptionId: subscription.id });
      
      // Update local subscription
      if (clinicData) {
        await supabaseClient
          .from("subscriptions")
          .update({
            status: "trialing",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: subscriptionEnd
          })
          .eq("clinic_id", clinicData.id);
      }
    } else if (pastDueSubscriptions.data.length > 0) {
      const subscription = pastDueSubscriptions.data[0];
      status = "past_due";
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      stripeSubscriptionId = subscription.id;
      logStep("Past due subscription found", { subscriptionId: subscription.id });
      
      // Update local subscription
      if (clinicData) {
        await supabaseClient
          .from("subscriptions")
          .update({
            status: "past_due",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            current_period_end: subscriptionEnd
          })
          .eq("clinic_id", clinicData.id);
      }
    } else {
      logStep("No active Stripe subscription found");
      
      // Update local subscription to cancelled if there's no active Stripe subscription
      if (clinicData) {
        await supabaseClient
          .from("subscriptions")
          .update({
            status: "cancelled",
            stripe_customer_id: customerId
          })
          .eq("clinic_id", clinicData.id);
      }
    }

    return new Response(JSON.stringify({
      subscribed: status === "active" || status === "trialing",
      status,
      subscription_end: subscriptionEnd,
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSubscriptionId,
      trial_days_remaining: 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
