-- Create table for message templates
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL CHECK (template_type IN ('reminder_24h', 'reminder_2h')),
  message_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, template_type)
);

-- Enable RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their clinic message templates"
ON public.message_templates
FOR SELECT
USING (
  clinic_id IN (
    SELECT id FROM public.clinics WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their clinic message templates"
ON public.message_templates
FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT id FROM public.clinics WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their clinic message templates"
ON public.message_templates
FOR UPDATE
USING (
  clinic_id IN (
    SELECT id FROM public.clinics WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();