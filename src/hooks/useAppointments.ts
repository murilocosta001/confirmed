import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "./useClinic";
import { useToast } from "./use-toast";

export type AppointmentStatus = "pending" | "confirmed" | "cancelled_auto" | "reschedule_requested";

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_name: string;
  patient_whatsapp: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  reminder_24h_sent: boolean;
  reminder_2h_sent: boolean;
  confirmed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAppointmentData {
  patient_name: string;
  patient_whatsapp: string;
  appointment_date: string;
  appointment_time: string;
}

export const useAppointments = (date?: string) => {
  const { data: clinic } = useClinic();

  return useQuery({
    queryKey: ["appointments", clinic?.id, date],
    queryFn: async () => {
      if (!clinic) return [];

      let query = supabase
        .from("appointments")
        .select("*")
        .eq("clinic_id", clinic.id)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (date) {
        query = query.eq("appointment_date", date);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as Appointment[];
    },
    enabled: !!clinic,
  });
};

export const useCreateAppointment = () => {
  const { data: clinic } = useClinic();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateAppointmentData) => {
      if (!clinic) throw new Error("Clínica não encontrada");

      const { error } = await supabase.from("appointments").insert({
        clinic_id: clinic.id,
        patient_name: data.patient_name,
        patient_whatsapp: data.patient_whatsapp.replace(/\D/g, ""),
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: "Consulta agendada!",
        description: "A consulta foi cadastrada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao agendar",
        description: error.message,
      });
    },
  });
};

export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const updateData: Record<string, unknown> = { status };

      if (status === "confirmed") {
        updateData.confirmed_at = new Date().toISOString();
      } else if (status === "cancelled_auto") {
        updateData.cancelled_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: "Status atualizado!",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    },
  });
};

export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: "Consulta removida!",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao remover",
        description: error.message,
      });
    },
  });
};
