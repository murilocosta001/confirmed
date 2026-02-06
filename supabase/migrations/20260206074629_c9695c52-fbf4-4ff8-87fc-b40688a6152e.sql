-- =====================================================
-- FIX: Políticas RLS para isolamento multi-tenant correto
-- Problema: Políticas atuais usam get_user_clinic_id() com LIMIT 1
-- que pode causar problemas se usuário pertencer a múltiplas clínicas
-- Solução: Usar apenas user_owns_clinic(clinic_id) que verifica
-- diretamente se o usuário pertence à clínica do registro
-- =====================================================

-- =====================================================
-- PATIENTS TABLE - Dados sensíveis de saúde
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Clinic users can view patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic users can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic users can update patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic users can delete patients" ON public.patients;

-- Novas políticas simplificadas e seguras
CREATE POLICY "Users can view patients of their clinic"
ON public.patients FOR SELECT
TO authenticated
USING (user_owns_clinic(clinic_id));

CREATE POLICY "Users can insert patients in their clinic"
ON public.patients FOR INSERT
TO authenticated
WITH CHECK (user_owns_clinic(clinic_id));

CREATE POLICY "Users can update patients in their clinic"
ON public.patients FOR UPDATE
TO authenticated
USING (user_owns_clinic(clinic_id))
WITH CHECK (user_owns_clinic(clinic_id));

CREATE POLICY "Users can delete patients in their clinic"
ON public.patients FOR DELETE
TO authenticated
USING (user_owns_clinic(clinic_id));

-- =====================================================
-- APPOINTMENTS TABLE - Agendamentos com dados de pacientes
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Clinic users can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinic users can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinic users can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinic users can delete appointments" ON public.appointments;

-- Novas políticas
CREATE POLICY "Users can view appointments of their clinic"
ON public.appointments FOR SELECT
TO authenticated
USING (user_owns_clinic(clinic_id));

CREATE POLICY "Users can insert appointments in their clinic"
ON public.appointments FOR INSERT
TO authenticated
WITH CHECK (user_owns_clinic(clinic_id));

CREATE POLICY "Users can update appointments in their clinic"
ON public.appointments FOR UPDATE
TO authenticated
USING (user_owns_clinic(clinic_id))
WITH CHECK (user_owns_clinic(clinic_id));

CREATE POLICY "Users can delete appointments in their clinic"
ON public.appointments FOR DELETE
TO authenticated
USING (user_owns_clinic(clinic_id));

-- =====================================================
-- MESSAGE_TEMPLATES TABLE - Templates de mensagem
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Clinic users can view templates" ON public.message_templates;
DROP POLICY IF EXISTS "Clinic users can insert templates" ON public.message_templates;
DROP POLICY IF EXISTS "Clinic users can update templates" ON public.message_templates;
DROP POLICY IF EXISTS "Clinic users can delete templates" ON public.message_templates;

-- Novas políticas
CREATE POLICY "Users can view templates of their clinic"
ON public.message_templates FOR SELECT
TO authenticated
USING (user_owns_clinic(clinic_id));

CREATE POLICY "Users can insert templates in their clinic"
ON public.message_templates FOR INSERT
TO authenticated
WITH CHECK (user_owns_clinic(clinic_id));

CREATE POLICY "Users can update templates in their clinic"
ON public.message_templates FOR UPDATE
TO authenticated
USING (user_owns_clinic(clinic_id))
WITH CHECK (user_owns_clinic(clinic_id));

CREATE POLICY "Users can delete templates in their clinic"
ON public.message_templates FOR DELETE
TO authenticated
USING (user_owns_clinic(clinic_id));