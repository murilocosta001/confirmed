-- Create a trigger to automatically create a trial subscription when a clinic is created
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (
    clinic_id,
    status,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.id,
    'trialing',
    now(),
    now() + interval '7 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on clinics table
DROP TRIGGER IF EXISTS on_clinic_created_create_trial ON public.clinics;
CREATE TRIGGER on_clinic_created_create_trial
  AFTER INSERT ON public.clinics
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_subscription();