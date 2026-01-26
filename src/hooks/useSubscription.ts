import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionData {
  subscribed: boolean;
  status: "active" | "trialing" | "past_due" | "cancelled" | "error";
  plan_name: string;
  subscription_end: string | null;
  trial_days_remaining: number;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async (): Promise<SubscriptionData> => {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) {
        console.error("Error checking subscription:", error);
        // FAIL-CLOSED: Negar acesso por padrão em caso de erro
        return {
          subscribed: false,
          status: "error",
          plan_name: "Erro na verificação",
          subscription_end: null,
          trial_days_remaining: 0
        };
      }
      
      // Validar que a resposta contém os campos esperados
      if (!data || typeof data.subscribed !== 'boolean' || !data.status) {
        console.error("Invalid subscription response:", data);
        // FAIL-CLOSED: Resposta inválida = acesso negado
        return {
          subscribed: false,
          status: "error",
          plan_name: "Erro na verificação",
          subscription_end: null,
          trial_days_remaining: 0
        };
      }
      
      return data;
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
    retry: 2, // Tentar 2 vezes antes de falhar
    retryDelay: 1000,
  });

  const refreshSubscription = () => {
    queryClient.invalidateQueries({ queryKey: ["subscription"] });
  };

  // FAIL-CLOSED: Só considerar ativo quando explicitamente confirmado
  // isLoading ou isError = acesso negado
  const hasValidSubscription = query.isSuccess && 
    query.data?.subscribed === true && 
    (query.data?.status === "active" || query.data?.status === "trialing");
  
  const isActive = query.isSuccess && query.data?.status === "active";
  const isPastDue = query.isSuccess && query.data?.status === "past_due";
  const isCancelled = query.isSuccess && query.data?.status === "cancelled";
  const isTrialing = query.isSuccess && query.data?.status === "trialing";
  const isError = query.isError || query.data?.status === "error";
  const trialDaysRemaining = query.data?.trial_days_remaining ?? 0;

  return {
    ...query,
    hasValidSubscription,
    isActive,
    isPastDue,
    isCancelled,
    isTrialing,
    isError,
    trialDaysRemaining,
    refreshSubscription,
  };
};
