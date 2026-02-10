import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    /* ================================
       1. VALIDAR VARIÁVEIS DE AMBIENTE
    ================================= */
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !stripeSecretKey) {
      throw new Error("Variáveis de ambiente não configuradas");
    }

    /* ================================
       2. PEGAR TOKEN DO USUÁRIO
    ================================= */
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header ausente");
    }

    /* ================================
       3. CRIAR CLIENTE SUPABASE
       (usando token do usuário)
    ================================= */
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Usuário não autenticado");
    }

    /* ================================
       4. INICIAR STRIPE
    ================================= */
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    /* ================================
       5. BUSCAR CUSTOMER NO STRIPE
    ================================= */
    const customers = await stripe.customers.list({
      email: user.email!,
      limit: 1,
    });

    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          user_id: user.id,
        },
      });

      customerId = customer.id;
    }

    /* ================================
       6. CRIAR PORTAL DO STRIPE
    ================================= */
    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/configuracoes`,
    });

    /* ================================
       7. RETORNAR URL
    ================================= */
    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
