-- Create table for patients
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  birth_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their clinic patients"
ON public.patients
FOR SELECT
USING (
  clinic_id IN (
    SELECT id FROM public.clinics WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their clinic patients"
ON public.patients
FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT id FROM public.clinics WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their clinic patients"
ON public.patients
FOR UPDATE
USING (
  clinic_id IN (
    SELECT id FROM public.clinics WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their clinic patients"
ON public.patients
FOR DELETE
USING (
  clinic_id IN (
    SELECT id FROM public.clinics WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_patients_clinic_id ON public.patients(clinic_id);
CREATE INDEX idx_patients_whatsapp ON public.patients(whatsapp);

-- Add patient_id to appointments for linking
ALTER TABLE public.appointments ADD COLUMN patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL;