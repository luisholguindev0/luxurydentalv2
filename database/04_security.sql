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

-- 11. Drip Campaigns
ALTER TABLE public.drip_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access drip campaigns in org" ON public.drip_campaigns
    FOR ALL
    USING (organization_id = public.get_auth_org_id());

-- 12. Campaign Sends
ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access campaign sends in org" ON public.campaign_sends
    FOR ALL
    USING (organization_id = public.get_auth_org_id());

-- 13. Patient Feedback
ALTER TABLE public.patient_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access patient feedback in org" ON public.patient_feedback
    FOR ALL
    USING (organization_id = public.get_auth_org_id());

-- 14. Conversation Summaries
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access conversation summaries in org" ON public.conversation_summaries
    FOR ALL
    USING (organization_id = public.get_auth_org_id());
