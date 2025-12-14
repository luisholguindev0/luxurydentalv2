-- Custom Types and Enums

-- User roles within an organization
CREATE TYPE public.user_role AS ENUM (
    'owner',
    'admin',
    'dentist',
    'assistant'
);

-- Appointment status workflow
CREATE TYPE public.appointment_status AS ENUM (
    'scheduled',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
);

-- Lead/Patient source
CREATE TYPE public.contact_source AS ENUM (
    'whatsapp',
    'website',
    'referral',
    'walk_in',
    'other'
);

-- Financial transaction types
CREATE TYPE public.transaction_type AS ENUM (
    'income',
    'expense',
    'payment',
    'charge'
);

-- Drip campaign types
CREATE TYPE public.campaign_type AS ENUM (
    'reactivation',
    'nps',
    'reminder',
    'promotion'
);
