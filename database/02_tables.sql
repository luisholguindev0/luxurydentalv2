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

-- 13. DRIP CAMPAIGNS (Campaign definitions)
CREATE TABLE public.drip_campaigns (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    type public.campaign_type NOT NULL,
    trigger_condition JSONB NOT NULL DEFAULT '{}'::jsonb,
    message_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    send_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 14. CAMPAIGN SENDS (Individual send tracking)
CREATE TABLE public.campaign_sends (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    campaign_id UUID NOT NULL REFERENCES public.drip_campaigns(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'clicked')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT campaign_send_recipient_check CHECK (
        (patient_id IS NOT NULL AND lead_id IS NULL) OR 
        (patient_id IS NULL AND lead_id IS NOT NULL)
    )
);

-- 15. PATIENT FEEDBACK (NPS collection)
CREATE TABLE public.patient_feedback (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
    feedback_text TEXT,
    collected_via TEXT DEFAULT 'whatsapp' CHECK (collected_via IN ('whatsapp', 'web', 'manual')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 16. CONVERSATION SUMMARIES (Memory compression for AI)
CREATE TABLE public.conversation_summaries (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    key_facts JSONB DEFAULT '[]'::jsonb,
    message_range_start TIMESTAMP WITH TIME ZONE,
    message_range_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT summary_owner_check CHECK (
        (patient_id IS NOT NULL AND lead_id IS NULL) OR 
        (patient_id IS NULL AND lead_id IS NOT NULL)
    )
);

CREATE TRIGGER set_timestamp_drip_campaigns BEFORE UPDATE ON public.drip_campaigns FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
