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

-- Drip Campaigns
CREATE INDEX idx_drip_campaigns_org_id ON public.drip_campaigns(organization_id);
CREATE INDEX idx_drip_campaigns_type ON public.drip_campaigns(type);
CREATE INDEX idx_drip_campaigns_active ON public.drip_campaigns(is_active) WHERE is_active = true;

-- Campaign Sends
CREATE INDEX idx_campaign_sends_org_id ON public.campaign_sends(organization_id);
CREATE INDEX idx_campaign_sends_campaign_id ON public.campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_patient_id ON public.campaign_sends(patient_id);
CREATE INDEX idx_campaign_sends_lead_id ON public.campaign_sends(lead_id);
CREATE INDEX idx_campaign_sends_status ON public.campaign_sends(status);
CREATE INDEX idx_campaign_sends_pending ON public.campaign_sends(status, created_at) WHERE status = 'pending';

-- Patient Feedback
CREATE INDEX idx_patient_feedback_org_id ON public.patient_feedback(organization_id);
CREATE INDEX idx_patient_feedback_patient_id ON public.patient_feedback(patient_id);
CREATE INDEX idx_patient_feedback_nps ON public.patient_feedback(nps_score);
CREATE INDEX idx_patient_feedback_recent ON public.patient_feedback(created_at DESC);

-- Conversation Summaries
CREATE INDEX idx_conversation_summaries_org_id ON public.conversation_summaries(organization_id);
CREATE INDEX idx_conversation_summaries_patient_id ON public.conversation_summaries(patient_id);
CREATE INDEX idx_conversation_summaries_lead_id ON public.conversation_summaries(lead_id);
