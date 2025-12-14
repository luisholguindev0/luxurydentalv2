-- Enable necessary extensions
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions; -- For AI embeddings
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions; -- For fuzzy search
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
-- Common Trigger Function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. ORGANIZATIONS (Tenants)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. ADMIN USERS (Staff)
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    role public.user_role NOT NULL DEFAULT 'assistant',
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. SERVICES (Catalog)
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. PATIENTS
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    full_name TEXT NOT NULL,
    email TEXT,
    whatsapp_number TEXT NOT NULL, -- Unique per org handled via index
    address TEXT,
    notes TEXT,
    ai_notes TEXT, -- AI generated summary of patient
    ai_tags TEXT[], -- Array of strings for interests/traits
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(organization_id, whatsapp_number)
);

-- 5. LEADS (Pre-patients)
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    phone TEXT NOT NULL,
    name TEXT, -- Optional until known
    status TEXT DEFAULT 'new', -- new, contacted, converted, lost
    source public.contact_source DEFAULT 'whatsapp',
    last_contact_at TIMESTAMP WITH TIME ZONE,
    ai_tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(organization_id, phone)
);

-- 6. APPOINTMENTS
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status public.appointment_status DEFAULT 'scheduled',
    notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- 7. TRANSACTIONS (Financials)
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    patient_id UUID REFERENCES public.patients(id),
    appointment_id UUID REFERENCES public.appointments(id),
    type public.transaction_type NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. PATIENT DOCUMENTS
CREATE TABLE public.patient_documents (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. MESSAGES (Chat History)
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT message_owner_check CHECK (
        (patient_id IS NOT NULL AND lead_id IS NULL) OR 
        (patient_id IS NULL AND lead_id IS NOT NULL)
    )
);

-- 10. KNOWLEDGE DOCS (RAG)
CREATE TABLE public.knowledge_docs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    content TEXT NOT NULL,
    embedding vector(1536), -- DeepSeek/OpenAI embedding
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 11. INVENTORY ITEMS
CREATE TABLE public.inventory_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    sku TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'pcs',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 12. RATE LIMITS
CREATE TABLE public.rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER DEFAULT 1,
    last_request_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- APPLY TRIGGERS
CREATE TRIGGER set_timestamp_organizations BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_timestamp_admin_users BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_timestamp_services BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_timestamp_patients BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_timestamp_leads BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_timestamp_appointments BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_timestamp_inventory BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
-- Indexes for performance and foreign keys

-- Organizations
CREATE INDEX idx_organizations_slug ON public.organizations(slug);

-- Admin Users
CREATE INDEX idx_admin_users_org_id ON public.admin_users(organization_id);

-- Services
CREATE INDEX idx_services_org_id ON public.services(organization_id);

-- Patients
CREATE INDEX idx_patients_org_id ON public.patients(organization_id);
CREATE INDEX idx_patients_whatsapp ON public.patients(whatsapp_number);
CREATE INDEX idx_patients_name_trgm ON public.patients USING gin(full_name extensions.gin_trgm_ops); -- Fuzzy search

-- Leads
CREATE INDEX idx_leads_org_id ON public.leads(organization_id);
CREATE INDEX idx_leads_phone ON public.leads(phone);

-- Appointments
CREATE INDEX idx_appointments_org_id ON public.appointments(organization_id);
CREATE INDEX idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX idx_appointments_date_range ON public.appointments(start_time, end_time);
-- Conflict detection index (range type would be better but this covers simple lookups)

-- Transactions
CREATE INDEX idx_transactions_org_id ON public.transactions(organization_id);
CREATE INDEX idx_transactions_patient_id ON public.transactions(patient_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);

-- Messages
CREATE INDEX idx_messages_org_id ON public.messages(organization_id);
CREATE INDEX idx_messages_patient_id ON public.messages(patient_id);
CREATE INDEX idx_messages_lead_id ON public.messages(lead_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- Inventory
CREATE INDEX idx_inventory_org_id ON public.inventory_items(organization_id);

-- Knowledge Docs
CREATE INDEX idx_knowledge_docs_org_id ON public.knowledge_docs(organization_id);
-- Vector index would go here if we had data, usually HNSW
-- RLS Policies
-- COMMANDMENT: All tables must have RLS enabled.
-- COMMANDMENT: All queries must filter by organization_id.

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's org ID
-- This avoids repeating the subquery everywhere and encapsulates logic
CREATE OR REPLACE FUNCTION public.get_auth_org_id()
RETURNS UUID AS $$
    SELECT organization_id 
    FROM public.admin_users 
    WHERE id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- POLICIES

-- 1. Organizations
-- Users can view their own organization
CREATE POLICY "Users can view own organization" ON public.organizations
    FOR SELECT
    USING (id = (SELECT organization_id FROM public.admin_users WHERE id = auth.uid()));

-- 2. Admin Users
-- Users can view other users in their org
CREATE POLICY "Users can view colleagues" ON public.admin_users
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM public.admin_users WHERE id = auth.uid()));

-- 3. Services
CREATE POLICY "View services in org" ON public.services
    FOR SELECT
    USING (organization_id = public.get_auth_org_id());

CREATE POLICY "Manage services in org" ON public.services
    FOR ALL
    USING (organization_id = public.get_auth_org_id());

-- 4. Patients
CREATE POLICY "View patients in org" ON public.patients
    FOR SELECT
    USING (organization_id = public.get_auth_org_id());

CREATE POLICY "Manage patients in org" ON public.patients
    FOR ALL
    USING (organization_id = public.get_auth_org_id());

-- 5. Appointments
CREATE POLICY "View appointments in org" ON public.appointments
    FOR SELECT
    USING (organization_id = public.get_auth_org_id());

CREATE POLICY "Manage appointments in org" ON public.appointments
    FOR ALL
    USING (organization_id = public.get_auth_org_id());

-- ... (Repeat pattern for other tables) ...

-- 6. Leads
CREATE POLICY "Access leads in org" ON public.leads
    FOR ALL
    USING (organization_id = public.get_auth_org_id());

-- 7. Transactions
CREATE POLICY "Access transactions in org" ON public.transactions
    FOR ALL
    USING (organization_id = public.get_auth_org_id());

-- 8. Messages
CREATE POLICY "Access messages in org" ON public.messages
    FOR ALL
    USING (organization_id = public.get_auth_org_id());

-- 9. Inventory
CREATE POLICY "Access inventory in org" ON public.inventory_items
    FOR ALL
    USING (organization_id = public.get_auth_org_id());

-- 10. Documents
CREATE POLICY "Access documents in org" ON public.patient_documents
    FOR ALL
    USING (organization_id = public.get_auth_org_id());
-- RPC Functions

-- 1. Check Availability
CREATE OR REPLACE FUNCTION public.check_availability(
    p_org_id UUID,
    p_date DATE
)
RETURNS TABLE (
    slot_time TIMESTAMP WITH TIME ZONE,
    is_available BOOLEAN
) AS $$
BEGIN
    -- This is a placeholder. Real implementation requires complex slot logic.
    RETURN QUERY SELECT now(), true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create Appointment (Transaction Safe)
-- ...
-- Seed Data

-- 1. Default Organization
INSERT INTO public.organizations (id, slug, name, settings)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'luxury-dental-demo',
    'Luxury Dental Clinic',
    '{"currency": "COP", "timezone": "America/Bogota"}'::jsonb
) ON CONFLICT DO NOTHING;

-- 2. Default Services
INSERT INTO public.services (organization_id, title, description, price, duration_minutes)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Limpieza General', 'Limpieza profunda con ultrasonido', 150000, 45),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Valoración Inicial', 'Diagnóstico completo con cámara intraoral', 80000, 30),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Blanqueamiento', 'Blanqueamiento láser premium', 450000, 60)
ON CONFLICT DO NOTHING;
