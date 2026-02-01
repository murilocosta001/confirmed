
-- STEP 1: Drop all existing policies that depend on user_owns_clinic
DROP POLICY IF EXISTS "Strict clinic isolation for patient SELECT" ON public.patients;
DROP POLICY IF EXISTS "Strict clinic isolation for patient INSERT" ON public.patients;
DROP POLICY IF EXISTS "Strict clinic isolation for patient UPDATE" ON public.patients;
DROP POLICY IF EXISTS "Strict clinic isolation for patient DELETE" ON public.patients;

DROP POLICY IF EXISTS "Strict clinic isolation for appointment SELECT" ON public.appointments;
DROP POLICY IF EXISTS "Strict clinic isolation for appointment INSERT" ON public.appointments;
DROP POLICY IF EXISTS "Strict clinic isolation for appointment UPDATE" ON public.appointments;
DROP POLICY IF EXISTS "Strict clinic isolation for appointment DELETE" ON public.appointments;

DROP POLICY IF EXISTS "Strict clinic isolation for template SELECT" ON public.message_templates;
DROP POLICY IF EXISTS "Strict clinic isolation for template INSERT" ON public.message_templates;
DROP POLICY IF EXISTS "Strict clinic isolation for template UPDATE" ON public.message_templates;
DROP POLICY IF EXISTS "Strict clinic isolation for template DELETE" ON public.message_templates;

DROP POLICY IF EXISTS "Strict clinic isolation for subscription SELECT" ON public.subscriptions;

DROP POLICY IF EXISTS "Authenticated users can view own clinic" ON public.clinics;
DROP POLICY IF EXISTS "Authenticated users can create own clinic" ON public.clinics;
DROP POLICY IF EXISTS "Authenticated users can update own clinic" ON public.clinics;

-- STEP 2: Drop existing functions
DROP FUNCTION IF EXISTS public.user_owns_clinic(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_clinic_id() CASCADE;
DROP FUNCTION IF EXISTS public.user_has_clinic_role(uuid, clinic_role) CASCADE;
DROP FUNCTION IF EXISTS public.user_is_clinic_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.add_clinic_owner() CASCADE;

-- STEP 3: Drop type if exists
DROP TYPE IF EXISTS public.clinic_role CASCADE;

-- STEP 4: Create role enum for clinic users
CREATE TYPE public.clinic_role AS ENUM ('owner', 'admin', 'receptionist', 'doctor');

-- STEP 5: Create clinic_users table for multi-user per clinic support
CREATE TABLE public.clinic_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role clinic_role NOT NULL DEFAULT 'receptionist',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, user_id)
);

-- STEP 6: Enable RLS on clinic_users
ALTER TABLE public.clinic_users ENABLE ROW LEVEL SECURITY;

-- STEP 7: Create trigger for updated_at on clinic_users
CREATE TRIGGER update_clinic_users_updated_at
  BEFORE UPDATE ON public.clinic_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- STEP 8: Migrate existing clinic owners to clinic_users table
INSERT INTO public.clinic_users (clinic_id, user_id, role)
SELECT id, user_id, 'owner'::clinic_role
FROM public.clinics
WHERE user_id IS NOT NULL
ON CONFLICT (clinic_id, user_id) DO NOTHING;

-- STEP 9: Revoke all from anon on clinic_users
REVOKE ALL ON public.clinic_users FROM anon;

-- STEP 10: Create user_owns_clinic using clinic_users table
CREATE OR REPLACE FUNCTION public.user_owns_clinic(_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.clinic_users 
    WHERE clinic_id = _clinic_id 
      AND user_id = auth.uid()
  )
$$;

-- STEP 11: Create get_user_clinic_id using clinic_users table
CREATE OR REPLACE FUNCTION public.get_user_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid() LIMIT 1
$$;

-- STEP 12: Create function to check user role in clinic
CREATE OR REPLACE FUNCTION public.user_has_clinic_role(_clinic_id uuid, _role clinic_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.clinic_users 
    WHERE clinic_id = _clinic_id 
      AND user_id = auth.uid()
      AND role = _role
  )
$$;

-- STEP 13: Create function to check if user is owner/admin of clinic
CREATE OR REPLACE FUNCTION public.user_is_clinic_admin(_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.clinic_users 
    WHERE clinic_id = _clinic_id 
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
$$;

-- STEP 14: Create trigger to auto-add owner to clinic_users when clinic is created
CREATE OR REPLACE FUNCTION public.add_clinic_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.clinic_users (clinic_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner')
  ON CONFLICT (clinic_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_clinic_created_add_owner
  AFTER INSERT ON public.clinics
  FOR EACH ROW
  EXECUTE FUNCTION public.add_clinic_owner();

-- STEP 15: RLS Policies for clinic_users table
CREATE POLICY "Users can view clinic members"
  ON public.clinic_users FOR SELECT
  USING (user_owns_clinic(clinic_id));

CREATE POLICY "Admins can add clinic members"
  ON public.clinic_users FOR INSERT
  WITH CHECK (user_is_clinic_admin(clinic_id));

CREATE POLICY "Admins can update clinic members"
  ON public.clinic_users FOR UPDATE
  USING (user_is_clinic_admin(clinic_id) AND user_id != auth.uid())
  WITH CHECK (user_is_clinic_admin(clinic_id) AND user_id != auth.uid());

CREATE POLICY "Owners can remove clinic members"
  ON public.clinic_users FOR DELETE
  USING (user_has_clinic_role(clinic_id, 'owner') AND user_id != auth.uid());

-- STEP 16: RLS Policies for clinics
CREATE POLICY "Users can view their clinics"
  ON public.clinics FOR SELECT
  USING (user_owns_clinic(id));

CREATE POLICY "Authenticated users can create clinic"
  ON public.clinics FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update clinic"
  ON public.clinics FOR UPDATE
  USING (user_is_clinic_admin(id))
  WITH CHECK (user_is_clinic_admin(id));

-- STEP 17: RLS Policies for patients
CREATE POLICY "Clinic users can view patients"
  ON public.patients FOR SELECT
  USING (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id));

CREATE POLICY "Clinic users can insert patients"
  ON public.patients FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id));

CREATE POLICY "Clinic users can update patients"
  ON public.patients FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id))
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id));

CREATE POLICY "Clinic users can delete patients"
  ON public.patients FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id));

-- STEP 18: RLS Policies for appointments
CREATE POLICY "Clinic users can view appointments"
  ON public.appointments FOR SELECT
  USING (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id));

CREATE POLICY "Clinic users can insert appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id));

CREATE POLICY "Clinic users can update appointments"
  ON public.appointments FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id))
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id));

CREATE POLICY "Clinic users can delete appointments"
  ON public.appointments FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id));

-- STEP 19: RLS Policies for message_templates
CREATE POLICY "Clinic users can view templates"
  ON public.message_templates FOR SELECT
  USING (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id));

CREATE POLICY "Clinic users can insert templates"
  ON public.message_templates FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id));

CREATE POLICY "Clinic users can update templates"
  ON public.message_templates FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id))
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id));

CREATE POLICY "Clinic users can delete templates"
  ON public.message_templates FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id));

-- STEP 20: RLS Policies for subscriptions (keep existing block policies, just add SELECT)
CREATE POLICY "Clinic users can view subscriptions"
  ON public.subscriptions FOR SELECT
  USING (clinic_id = get_user_clinic_id() AND user_owns_clinic(clinic_id));
