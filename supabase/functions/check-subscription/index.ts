import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Find user's clinic
    const { data: clinicData, error: clinicError } = await supabaseClient
      .from("clinics")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (clinicError) {
      logStep("Error fetching clinic", { error: clinicError.message });
      throw new Error("Error fetching clinic data");
    }

    if (!clinicData) {
      logStep("No clinic found for user");
      return new Response(JSON.stringify({
        subscribed: false,
        status: "cancelled",
        plan_name: "Nenhum",
        subscription_end: null,
        trial_days_remaining: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // READ-ONLY: Just fetch the subscription status from database
    // All updates are handled exclusively by stripe-webhook
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("clinic_id", clinicData.id)
      .maybeSingle();

    if (subError) {
      logStep("Error fetching subscription", { error: subError.message });
      throw new Error("Error fetching subscription data");
    }

    if (!subscription) {
      logStep("No subscription found for clinic");
      return new Response(JSON.stringify({
        subscribed: false,
        status: "cancelled",
        plan_name: "Nenhum",
        subscription_end: null,
        trial_days_remaining: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Subscription found", { 
      status: subscription.status, 
      periodEnd: subscription.current_period_end
    });

    // Calculate trial days remaining for local trials
    let trialDaysRemaining = 0;
    let effectiveStatus = subscription.status;

    if (subscription.status === "trialing" && !subscription.stripe_subscription_id) {
      // Local trial - check if expired
      const trialEnd = new Date(subscription.current_period_end);
      const now = new Date();
      
      if (now > trialEnd) {
        // Trial has expired - but we don't update here, webhook or scheduled job should handle this
        effectiveStatus = "cancelled";
        trialDaysRemaining = 0;
        logStep("Local trial has expired");
      } else {
        trialDaysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        logStep("Local trial active", { daysRemaining: trialDaysRemaining });
      }
    }

    const isSubscribed = effectiveStatus === "active" || effectiveStatus === "trialing";
    
    // Determine plan name based on status (no sensitive IDs exposed)
    let planName = "Nenhum";
    if (effectiveStatus === "active") {
      planName = "Plano Profissional";
    } else if (effectiveStatus === "trialing") {
      planName = "Trial";
    } else if (effectiveStatus === "past_due") {
      planName = "Pagamento Pendente";
    }

    return new Response(JSON.stringify({
      subscribed: isSubscribed,
      status: effectiveStatus,
      plan_name: planName,
      subscription_end: subscription.current_period_end,
      trial_days_remaining: trialDaysRemaining
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
