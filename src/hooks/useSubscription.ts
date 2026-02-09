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
    enabled: !!user,
    queryFn: async (): Promise<SubscriptionData> => {
      const { data, error } = await supabase.functions.invoke("check-subscription");

      if (error || !data) {
        return {
          subscribed: false,
          status: "error",
          plan_name: "Erro na verificação",
          subscription_end: null,
          trial_days_remaining: 0,
        };
      }

      return data;
    },
    retry: 1,
    staleTime: 30000,
  });

  const refreshSubscription = () => {
    queryClient.invalidateQueries({ queryKey: ["subscription"] });
  };

  const hasValidSubscription =
    query.isLoading ||
    (query.isSuccess &&
      query.data?.subscribed === true &&
      (query.data?.status === "active" || query.data?.status === "trialing"));

  return {
    ...query,
    hasValidSubscription,
    isActive: query.data?.status === "active",
    isTrialing: query.data?.status === "trialing",
    isPastDue: query.data?.status === "past_due",
    isCancelled: query.data?.status === "cancelled",
    isError: query.isError || query.data?.status === "error",
    trialDaysRemaining: query.data?.trial_days_remaining ?? 0,
    refreshSubscription,
  };
};
