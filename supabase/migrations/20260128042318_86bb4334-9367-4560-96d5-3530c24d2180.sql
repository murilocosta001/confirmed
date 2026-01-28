-- =====================================================
-- SECURITY FIX: Block anonymous access, enforce multi-tenant isolation
-- =====================================================

-- 1. DROP ALL EXISTING POLICIES to start fresh
-- CLINICS
DROP POLICY IF EXISTS "Users can create their own clinic" ON public.clinics;
DROP POLICY IF EXISTS "Users can update their own clinic" ON public.clinics;
DROP POLICY IF EXISTS "Users can view their own clinic" ON public.clinics;

-- PATIENTS
DROP POLICY IF EXISTS "Users can delete their clinic patients" ON public.patients;
DROP POLICY IF EXISTS "Users can insert their clinic patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update their clinic patients" ON public.patients;
DROP POLICY IF EXISTS "Users can view their clinic patients" ON public.patients;

-- APPOINTMENTS
DROP POLICY IF EXISTS "Users can create appointments for their clinic" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete appointments from their clinic" ON public.appointments;
DROP POLICY IF EXISTS "Users can update appointments from their clinic" ON public.appointments;
DROP POLICY IF EXISTS "Users can view appointments from their clinic" ON public.appointments;

-- MESSAGE_TEMPLATES
DROP POLICY IF EXISTS "Users can insert their clinic message templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can update their clinic message templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can view their clinic message templates" ON public.message_templates;

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "Users can view their clinic subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Block subscription insert from frontend" ON public.subscriptions;
DROP POLICY IF EXISTS "Block subscription update from frontend" ON public.subscriptions;
DROP POLICY IF EXISTS "Block subscription delete from frontend" ON public.subscriptions;

-- 2. Ensure RLS is enabled on ALL tables
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Create helper function to get user's clinic_id securely
CREATE OR REPLACE FUNCTION public.get_user_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clinics WHERE user_id = auth.uid() LIMIT 1
$$;

-- =====================================================
-- CLINICS TABLE - Only authenticated owners
-- =====================================================
CREATE POLICY "Authenticated users can view own clinic"
  ON public.clinics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create own clinic"
  ON public.clinics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can update own clinic"
  ON public.clinics FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No delete policy - clinics cannot be deleted

-- =====================================================
-- PATIENTS TABLE - Multi-tenant isolation by clinic_id
-- =====================================================
CREATE POLICY "Clinic owners can view their patients"
  ON public.patients FOR SELECT
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can create patients"
  ON public.patients FOR INSERT
  TO authenticated
  WITH CHECK (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can update their patients"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id())
  WITH CHECK (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can delete their patients"
  ON public.patients FOR DELETE
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id());

-- =====================================================
-- APPOINTMENTS TABLE - Multi-tenant isolation by clinic_id
-- =====================================================
CREATE POLICY "Clinic owners can view their appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can create appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can update their appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id())
  WITH CHECK (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can delete their appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id());

-- =====================================================
-- MESSAGE_TEMPLATES TABLE - Multi-tenant isolation
-- =====================================================
CREATE POLICY "Clinic owners can view their templates"
  ON public.message_templates FOR SELECT
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can create templates"
  ON public.message_templates FOR INSERT
  TO authenticated
  WITH CHECK (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can update their templates"
  ON public.message_templates FOR UPDATE
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id())
  WITH CHECK (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can delete their templates"
  ON public.message_templates FOR DELETE
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id());

-- =====================================================
-- SUBSCRIPTIONS TABLE - Read-only for owners, write via backend only
-- =====================================================
CREATE POLICY "Clinic owners can view their subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id());

-- Block ALL write operations from frontend (only service_role can write)
CREATE POLICY "Block frontend subscription inserts"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Block frontend subscription updates"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Block frontend subscription deletes"
  ON public.subscriptions FOR DELETE
  TO authenticated
  USING (false);

-- =====================================================
-- REVOKE anonymous access explicitly
-- =====================================================
REVOKE ALL ON public.clinics FROM anon;
REVOKE ALL ON public.patients FROM anon;
REVOKE ALL ON public.appointments FROM anon;
REVOKE ALL ON public.message_templates FROM anon;
REVOKE ALL ON public.subscriptions FROM anon;