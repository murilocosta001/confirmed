import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Clinic {
  id: string;
  user_id: string;
  name: string;
  whatsapp: string;
  opening_time: string;
  closing_time: string;
  confirmation_deadline_hours: number;
  created_at: string;
  updated_at: string;
}

export const useClinic = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["clinic", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("clinics")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No clinic found
          return null;
        }
        throw error;
      }

      return data as Clinic;
    },
    enabled: !!user,
  });
};
