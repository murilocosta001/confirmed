-- Create a more robust function that explicitly validates clinic ownership
-- This adds an additional security layer on top of get_user_clinic_id()
CREATE OR REPLACE FUNCTION public.user_owns_clinic(_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.clinics 
    WHERE id = _clinic_id 
      AND user_id = auth.uid()
  )
$$;

-- Drop existing policies on patients table to recreate with stronger isolation
DROP POLICY IF EXISTS "Clinic owners can view their patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic owners can create patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic owners can update their patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic owners can delete their patients" ON public.patients;

-- Recreate policies with explicit double-validation
-- SELECT: Verify both clinic_id match AND direct ownership chain
CREATE POLICY "Strict clinic isolation for patient SELECT"
ON public.patients
FOR SELECT
TO authenticated
USING (
  clinic_id = get_user_clinic_id() 
  AND user_owns_clinic(clinic_id)
);

-- INSERT: Verify the user owns the clinic they're inserting into
CREATE POLICY "Strict clinic isolation for patient INSERT"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (
  clinic_id = get_user_clinic_id()
  AND user_owns_clinic(clinic_id)
);

-- UPDATE: Verify ownership before and after update
CREATE POLICY "Strict clinic isolation for patient UPDATE"
ON public.patients
FOR UPDATE
TO authenticated
USING (
  clinic_id = get_user_clinic_id()
  AND user_owns_clinic(clinic_id)
)
WITH CHECK (
  clinic_id = get_user_clinic_id()
  AND user_owns_clinic(clinic_id)
);

-- DELETE: Strict ownership verification
CREATE POLICY "Strict clinic isolation for patient DELETE"
ON public.patients
FOR DELETE
TO authenticated
USING (
  clinic_id = get_user_clinic_id()
  AND user_owns_clinic(clinic_id)
);

-- Apply same strengthening to appointments table (contains patient contact info)
DROP POLICY IF EXISTS "Clinic owners can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinic owners can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinic owners can update their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinic owners can delete their appointments" ON public.appointments;

CREATE POLICY "Strict clinic isolation for appointment SELECT"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  clinic_id = get_user_clinic_id()
  AND user_owns_clinic(clinic_id)
);

CREATE POLICY "Strict clinic isolation for appointment INSERT"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  clinic_id = get_user_clinic_id()
  AND user_owns_clinic(clinic_id)
);

CREATE POLICY "Strict clinic isolation for appointment UPDATE"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  clinic_id = get_user_clinic_id()
  AND user_owns_clinic(clinic_id)
)
WITH CHECK (
  clinic_id = get_user_clinic_id()
  AND user_owns_clinic(clinic_id)
);

CREATE POLICY "Strict clinic isolation for appointment DELETE"
ON public.appointments
FOR DELETE
TO authenticated
USING (
  clinic_id = get_user_clinic_id()
  AND user_owns_clinic(clinic_id)
);

-- Apply same strengthening to message_templates table
DROP POLICY IF EXISTS "Clinic owners can view their templates" ON public.message_templates;
DROP POLICY IF EXISTS "Clinic owners can create templates" ON public.message_templates;
DROP POLICY IF EXISTS "Clinic owners can update their templates" ON public.message_templates;
DROP POLICY IF EXISTS "Clinic owners can delete their templates" ON public.message_templates;

CREATE POLICY "Strict clinic isolation for template SELECT"
ON public.message_templates
FOR SELECT
TO authenticated
USING (
  clinic_id = get_user_clinic_id()
  AND user_owns_clinic(clinic_id)
);

CREATE POLICY "Strict clinic isolation for template INSERT"
ON public.message_templates
FOR INSERT
TO authenticated
WITH CHECK (
  clinic_id = get_user_clinic_id()
  AND user_owns_clinic(clinic_id)
);

CREATE POLICY "Strict clinic isolation for template UPDATE"
ON public.message_templates
FOR UPDATE
TO authenticated
USING (
  clinic_id = get_user_clinic_id()
  AND user_owns_clinic(clinic_id)
)
WITH CHECK (
  clinic_id = get_user_clinic_id()
  AND user_owns_clinic(clinic_id)
);

CREATE POLICY "Strict clinic isolation for template DELETE"
ON public.message_templates
FOR DELETE
TO authenticated
USING (
  clinic_id = get_user_clinic_id()
  AND user_owns_clinic(clinic_id)
);

-- Update subscriptions SELECT policy to use double-validation
DROP POLICY IF EXISTS "Clinic owners can view their subscription" ON public.subscriptions;

CREATE POLICY "Strict clinic isolation for subscription SELECT"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  clinic_id = get_user_clinic_id()
  AND user_owns_clinic(clinic_id)
);