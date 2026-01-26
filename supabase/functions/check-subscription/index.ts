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

// FAIL-CLOSED: Resposta padrão de acesso negado
const DENIED_RESPONSE = {
  subscribed: false,
  status: "error",
  plan_name: "Acesso Negado",
  subscription_end: null,
  trial_days_remaining: 0
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // FAIL-CLOSED: Qualquer erro retorna acesso negado
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // Validar configuração do ambiente
    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("CRITICAL: Missing environment variables");
      return new Response(JSON.stringify(DENIED_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Retornar 200 para o frontend processar
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    logStep("Function started");

    // Validar cabeçalho de autorização
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logStep("No valid authorization header provided");
      return new Response(JSON.stringify(DENIED_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token || token.length < 10) {
      logStep("Invalid token format");
      return new Response(JSON.stringify(DENIED_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Autenticar usuário
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      logStep("Authentication failed", { error: userError?.message });
      return new Response(JSON.stringify(DENIED_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Buscar clínica do usuário
    const { data: clinicData, error: clinicError } = await supabaseClient
      .from("clinics")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (clinicError) {
      logStep("Error fetching clinic", { error: clinicError.message });
      return new Response(JSON.stringify(DENIED_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
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

    // Buscar assinatura - READ-ONLY
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("status, current_period_end, stripe_subscription_id")
      .eq("clinic_id", clinicData.id)
      .maybeSingle();

    if (subError) {
      logStep("Error fetching subscription", { error: subError.message });
      return new Response(JSON.stringify(DENIED_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
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

    // Validar status da assinatura
    const validStatuses = ["active", "trialing", "past_due", "cancelled"];
    if (!validStatuses.includes(subscription.status)) {
      logStep("Invalid subscription status", { status: subscription.status });
      return new Response(JSON.stringify(DENIED_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Subscription found", { 
      status: subscription.status, 
      periodEnd: subscription.current_period_end
    });

    // Calcular dias restantes de trial para trials locais
    let trialDaysRemaining = 0;
    let effectiveStatus = subscription.status;

    if (subscription.status === "trialing" && !subscription.stripe_subscription_id) {
      if (!subscription.current_period_end) {
        logStep("Trial without end date - denying access");
        return new Response(JSON.stringify(DENIED_RESPONSE), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const trialEnd = new Date(subscription.current_period_end);
      const now = new Date();
      
      if (now > trialEnd) {
        effectiveStatus = "cancelled";
        trialDaysRemaining = 0;
        logStep("Local trial has expired");
      } else {
        trialDaysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        logStep("Local trial active", { daysRemaining: trialDaysRemaining });
      }
    }

    // FAIL-CLOSED: Só liberar acesso para status explicitamente válidos
    const isSubscribed = effectiveStatus === "active" || effectiveStatus === "trialing";
    
    // Determinar nome do plano (sem expor IDs sensíveis)
    let planName = "Nenhum";
    if (effectiveStatus === "active") {
      planName = "Plano Profissional";
    } else if (effectiveStatus === "trialing") {
      planName = "Trial";
    } else if (effectiveStatus === "past_due") {
      planName = "Pagamento Pendente";
    }

    const response = {
      subscribed: isSubscribed,
      status: effectiveStatus,
      plan_name: planName,
      subscription_end: subscription.current_period_end,
      trial_days_remaining: trialDaysRemaining
    };

    logStep("Returning subscription status", { subscribed: isSubscribed, status: effectiveStatus });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // FAIL-CLOSED: Qualquer exceção resulta em acesso negado
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("CRITICAL ERROR - Access denied", { message: errorMessage });
    return new Response(JSON.stringify(DENIED_RESPONSE), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Retornar 200 para o frontend processar
    });
  }
});
