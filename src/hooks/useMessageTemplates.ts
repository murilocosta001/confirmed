import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "./useClinic";

export type TemplateType = "reminder_24h" | "reminder_2h";

export interface MessageTemplate {
  id: string;
  clinic_id: string;
  template_type: TemplateType;
  message_content: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_TEMPLATES: Record<TemplateType, string> = {
  reminder_24h: `Olá {nome_paciente}! 👋

Lembramos que você tem uma consulta agendada para amanhã, {data_consulta} às {hora_consulta}.

Por favor, confirme sua presença respondendo:
✅ CONFIRMAR - para confirmar
📅 REMARCAR - para solicitar remarcação

Clínica {nome_clinica}`,
  reminder_2h: `Olá {nome_paciente}! 👋

Sua consulta está confirmada para hoje às {hora_consulta}.

Te esperamos!

Clínica {nome_clinica}`,
};

export const useMessageTemplates = () => {
  const { data: clinic } = useClinic();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["message-templates", clinic?.id],
    queryFn: async () => {
      if (!clinic?.id) return [];

      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("clinic_id", clinic.id);

      if (error) throw error;
      return data as MessageTemplate[];
    },
    enabled: !!clinic?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async ({
      templateType,
      messageContent,
    }: {
      templateType: TemplateType;
      messageContent: string;
    }) => {
      if (!clinic?.id) throw new Error("Clinic not found");

      const { data, error } = await supabase
        .from("message_templates")
        .upsert(
          {
            clinic_id: clinic.id,
            template_type: templateType,
            message_content: messageContent,
          },
          {
            onConflict: "clinic_id,template_type",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates", clinic?.id] });
    },
  });

  const getTemplate = (type: TemplateType): string => {
    const saved = query.data?.find((t) => t.template_type === type);
    return saved?.message_content || DEFAULT_TEMPLATES[type];
  };

  return {
    ...query,
    templates: query.data || [],
    getTemplate,
    defaultTemplates: DEFAULT_TEMPLATES,
    upsertTemplate: upsertMutation.mutateAsync,
    isUpsertPending: upsertMutation.isPending,
  };
};
