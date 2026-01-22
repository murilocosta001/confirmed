import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionData {
  subscribed: boolean;
  status: "active" | "trialing" | "past_due" | "cancelled";
  subscription_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
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
        // Default to trialing on error (be permissive during trial)
        return {
          subscribed: true,
          status: "trialing",
          subscription_end: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          trial_days_remaining: 7
        };
      }
      
      return data;
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

  const refreshSubscription = () => {
    queryClient.invalidateQueries({ queryKey: ["subscription"] });
  };

  const isActive = query.data?.status === "active" || query.data?.status === "trialing";
  const isPastDue = query.data?.status === "past_due";
  const isCancelled = query.data?.status === "cancelled";
  const isTrialing = query.data?.status === "trialing";
  const trialDaysRemaining = query.data?.trial_days_remaining ?? 0;

  return {
    ...query,
    isActive,
    isPastDue,
    isCancelled,
    isTrialing,
    trialDaysRemaining,
    refreshSubscription,
  };
};
