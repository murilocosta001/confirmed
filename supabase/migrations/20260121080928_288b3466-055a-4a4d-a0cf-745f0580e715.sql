-- Confirmed SaaS Database Schema

-- Create enum for appointment status
CREATE TYPE public.appointment_status AS ENUM (
  'pending',
  'confirmed',
  'cancelled_auto',
  'reschedule_requested'
);

-- Create enum for subscription status
CREATE TYPE public.subscription_status AS ENUM (
  'active',
  'past_due',
  'cancelled',
  'trialing'
);

-- Create clinics table
CREATE TABLE public.clinics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  opening_time TIME NOT NULL DEFAULT '08:00',
  closing_time TIME NOT NULL DEFAULT '18:00',
  confirmation_deadline_hours INTEGER NOT NULL DEFAULT 12,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinic_id)
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_whatsapp TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  reminder_24h_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_2h_sent BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clinics
CREATE POLICY "Users can view their own clinic" 
ON public.clinics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clinic" 
ON public.clinics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clinic" 
ON public.clinics 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for subscriptions (based on clinic ownership)
CREATE POLICY "Users can view their clinic subscription" 
ON public.subscriptions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE clinics.id = subscriptions.clinic_id 
    AND clinics.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their clinic subscription" 
ON public.subscriptions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE clinics.id = subscriptions.clinic_id 
    AND clinics.user_id = auth.uid()
  )
);

-- RLS Policies for appointments (based on clinic ownership)
CREATE POLICY "Users can view appointments from their clinic" 
ON public.appointments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE clinics.id = appointments.clinic_id 
    AND clinics.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create appointments for their clinic" 
ON public.appointments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE clinics.id = appointments.clinic_id 
    AND clinics.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update appointments from their clinic" 
ON public.appointments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE clinics.id = appointments.clinic_id 
    AND clinics.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete appointments from their clinic" 
ON public.appointments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE clinics.id = appointments.clinic_id 
    AND clinics.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_clinics_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_appointments_clinic_date ON public.appointments(clinic_id, appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_clinics_user_id ON public.clinics(user_id);