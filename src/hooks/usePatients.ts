import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "./useClinic";

export interface Patient {
  id: string;
  clinic_id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  birth_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePatientData {
  name: string;
  whatsapp: string;
  email?: string;
  birth_date?: string;
  notes?: string;
}

export interface UpdatePatientData extends Partial<CreatePatientData> {
  id: string;
}

export const usePatients = () => {
  const { data: clinic } = useClinic();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["patients", clinic?.id],
    queryFn: async () => {
      if (!clinic?.id) return [];

      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("clinic_id", clinic.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Patient[];
    },
    enabled: !!clinic?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreatePatientData) => {
      if (!clinic?.id) throw new Error("Clinic not found");

      const { data: patient, error } = await supabase
        .from("patients")
        .insert({
          clinic_id: clinic.id,
          name: data.name,
          whatsapp: data.whatsapp.replace(/\D/g, ""),
          email: data.email || null,
          birth_date: data.birth_date || null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients", clinic?.id] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: UpdatePatientData) => {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp.replace(/\D/g, "");
      if (data.email !== undefined) updateData.email = data.email || null;
      if (data.birth_date !== undefined) updateData.birth_date = data.birth_date || null;
      if (data.notes !== undefined) updateData.notes = data.notes || null;

      const { data: patient, error } = await supabase
        .from("patients")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients", clinic?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients", clinic?.id] });
    },
  });

  return {
    ...query,
    patients: query.data || [],
    createPatient: createMutation.mutateAsync,
    updatePatient: updateMutation.mutateAsync,
    deletePatient: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
