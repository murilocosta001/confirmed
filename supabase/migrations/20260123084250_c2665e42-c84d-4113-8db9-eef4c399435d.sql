-- Add survey fields to clinics table
ALTER TABLE public.clinics
ADD COLUMN clinic_type text,
ADD COLUMN clinic_type_other text,
ADD COLUMN professionals_count text,
ADD COLUMN monthly_appointments text;

-- Add comment for documentation
COMMENT ON COLUMN public.clinics.clinic_type IS 'Type of clinic: odontologica, medica, estetica, fisioterapia, psicologia, outra';
COMMENT ON COLUMN public.clinics.clinic_type_other IS 'Custom clinic type when clinic_type is outra';
COMMENT ON COLUMN public.clinics.professionals_count IS 'Number of professionals: 1, 2-5, 6-10, 10+';
COMMENT ON COLUMN public.clinics.monthly_appointments IS 'Monthly appointments range: ate-100, 101-300, 301-600, 600+';