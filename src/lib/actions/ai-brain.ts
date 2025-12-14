/**
 * AI Brain Server Actions
 * 
 * Database operations for the AI chat flow:
 * - Contact lookup/creation
 * - Message history
 * - Context building
 */

import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { Contact, ConversationContext, AppointmentContext, ServiceInfo, AIMessage } from "../ai/types"
import { processMessage } from "../ai/brain"
import { toZonedTime } from "date-fns-tz"
import { format } from "date-fns"

// Service role client for AI operations
function getAdminClient() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

const TIMEZONE = "America/Bogota"

// Cache for organization lookups (in-memory, resets on cold start)
const orgCache = new Map<string, { orgId: string; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Resolve organization from WhatsApp Phone Number ID
 * 
 * Multi-tenancy approach:
 * 1. WhatsApp Phone Number ID → Organization (stored in org settings)
 * 2. Fallback: Use first active organization (single-tenant mode)
 * 
 * To configure multi-tenant:
 * UPDATE organizations 
 * SET settings = jsonb_set(settings, '{whatsapp_phone_number_id}', '"YOUR_PHONE_ID"')
 * WHERE id = 'your-org-id';
 */
export async function resolveOrganization(whatsappPhoneNumberId?: string): Promise<string | null> {
    const supabase = getAdminClient()

    // Check cache first
    if (whatsappPhoneNumberId) {
        const cached = orgCache.get(whatsappPhoneNumberId)
        if (cached && cached.expiresAt > Date.now()) {
            return cached.orgId
        }
    }

    // Try to find org by WhatsApp Phone Number ID
    if (whatsappPhoneNumberId) {
        const { data: org } = await supabase
            .from("organizations")
            .select("id")
            .eq("settings->whatsapp_phone_number_id", whatsappPhoneNumberId)
            .single()

        if (org) {
            // Cache the result
            orgCache.set(whatsappPhoneNumberId, {
                orgId: org.id,
                expiresAt: Date.now() + CACHE_TTL_MS,
            })
            return org.id
        }
    }

    // Fallback: Get first organization (single-tenant mode)
    const { data: firstOrg } = await supabase
        .from("organizations")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .single()

    if (firstOrg) {
        console.warn("[AIBrain] Using fallback organization - configure settings.whatsapp_phone_number_id for multi-tenant")
        return firstOrg.id
    }

    console.error("[AIBrain] No organization found!")
    return null
}


/**
 * Get or create a contact from phone number
 * organizationId is required - use resolveOrganization() to get it
 */
export async function getOrCreateContact(
    phone: string,
    organizationId: string,
    profileName?: string
): Promise<Contact | null> {
    const supabase = getAdminClient()
    const cleanPhone = phone.replace(/[^\d+]/g, "")

    // Check for existing patient
    const { data: patient } = await supabase
        .from("patients")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("whatsapp_number", cleanPhone)
        .single()

    if (patient) {
        return {
            type: "patient",
            id: patient.id,
            phone: cleanPhone,
            name: patient.full_name,
            organizationId,
            aiNotes: patient.ai_notes,
            aiTags: patient.ai_tags,
        }
    }

    // Check for existing lead
    const { data: lead } = await supabase
        .from("leads")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("phone", cleanPhone)
        .single()

    if (lead) {
        await supabase.from("leads")
            .update({ last_contact_at: new Date().toISOString() })
            .eq("id", lead.id)

        return {
            type: "lead",
            id: lead.id,
            phone: cleanPhone,
            name: lead.name,
            organizationId,
        }
    }

    // Create new lead
    const { data: newLead, error } = await supabase
        .from("leads")
        .insert({
            organization_id: organizationId,
            phone: cleanPhone,
            name: profileName || null,
            source: "whatsapp",
            status: "new",
            last_contact_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (error) {
        console.error("[AIBrain] Failed to create lead:", error)
        return null
    }

    return {
        type: "lead",
        id: newLead.id,
        phone: cleanPhone,
        name: newLead.name,
        organizationId,
    }
}

/**
 * Load message history
 */
export async function getMessageHistory(contact: Contact, limit = 20): Promise<AIMessage[]> {
    const supabase = getAdminClient()

    const query = supabase
        .from("messages")
        .select("*")
        .eq("organization_id", contact.organizationId)
        .order("created_at", { ascending: false })
        .limit(limit)

    if (contact.type === "patient") {
        query.eq("patient_id", contact.id)
    } else {
        query.eq("lead_id", contact.id)
    }

    const { data } = await query

    return (data || []).reverse().map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: m.created_at ? new Date(m.created_at) : undefined,
    }))
}

/**
 * Save a message
 */
export async function saveMessage(
    contact: Contact,
    role: "user" | "assistant",
    content: string
): Promise<void> {
    const supabase = getAdminClient()

    await supabase.from("messages").insert({
        organization_id: contact.organizationId,
        role,
        content,
        patient_id: contact.type === "patient" ? contact.id : null,
        lead_id: contact.type === "lead" ? contact.id : null,
    })
}

/**
 * Get upcoming appointments
 */
export async function getContactAppointments(contact: Contact): Promise<AppointmentContext[]> {
    if (contact.type !== "patient") return []

    const supabase = getAdminClient()

    const { data } = await supabase
        .from("appointments")
        .select("*, service:services(title, duration_minutes)")
        .eq("organization_id", contact.organizationId)
        .eq("patient_id", contact.id)
        .gte("start_time", new Date().toISOString())
        .neq("status", "cancelled")
        .order("start_time")
        .limit(5)

    return (data || []).map(apt => {
        const start = toZonedTime(new Date(apt.start_time), TIMEZONE)
        return {
            id: apt.id,
            date: format(start, "yyyy-MM-dd"),
            time: format(start, "HH:mm"),
            serviceName: apt.service?.title || "Consulta",
            status: apt.status || "scheduled",
            duration: apt.service?.duration_minutes || 30,
        }
    })
}

/**
 * Get last cancellation for empathy
 */
export async function getLastCancellation(
    contact: Contact
): Promise<{ date: string; reason: string | null } | undefined> {
    if (contact.type !== "patient") return undefined

    const supabase = getAdminClient()

    const { data } = await supabase
        .from("appointments")
        .select("start_time, cancellation_reason")
        .eq("organization_id", contact.organizationId)
        .eq("patient_id", contact.id)
        .eq("status", "cancelled")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single()

    if (!data) return undefined

    return {
        date: format(toZonedTime(new Date(data.start_time), TIMEZONE), "yyyy-MM-dd"),
        reason: data.cancellation_reason,
    }
}

/**
 * Get active services
 */
export async function getServices(organizationId: string): Promise<ServiceInfo[]> {
    const supabase = getAdminClient()

    const { data } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("title")

    return (data || []).map(s => ({
        id: s.id,
        title: s.title,
        price: s.price,
        duration: s.duration_minutes,
        description: s.description,
    }))
}

// ... imports
import { DEFAULT_CLINIC_CONFIG, type ClinicConfig, type BusinessHours } from "../ai/types"

// ... existing code ...

/**
 * Get clinic configuration
 */
export async function getClinicConfig(organizationId: string): Promise<ClinicConfig> {
    const supabase = getAdminClient()

    const { data: org } = await supabase
        .from("organizations")
        .select("name, settings")
        .eq("id", organizationId)
        .single()

    if (!org) return DEFAULT_CLINIC_CONFIG

    const settings = org.settings as Record<string, unknown> || {}
    const hoursData = (settings.business_hours as Record<string, { open: string; close: string } | null>) || {}

    // Map database hours to AI type BusinessHours
    const businessHours: BusinessHours[] = []

    // Days 0-6 (Sunday-Saturday)
    for (let i = 0; i <= 6; i++) {
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
        const dayKey = dayNames[i]
        const h = hoursData[dayKey]

        businessHours.push({
            dayOfWeek: i,
            isClosed: !h,
            openTime: h?.open || "08:00",
            closeTime: h?.close || "18:00"
        })
    }

    return {
        name: org.name,
        address: (settings.address as string) || DEFAULT_CLINIC_CONFIG.address,
        phone: (settings.phone as string) || DEFAULT_CLINIC_CONFIG.phone,
        timezone: (settings.timezone as string) || DEFAULT_CLINIC_CONFIG.timezone,
        businessHours
    }
}

/**
 * Build full conversation context
 */
export async function buildConversationContext(contact: Contact): Promise<ConversationContext> {
    const [messages, appointments, services, lastCancellation, clinicConfig] = await Promise.all([
        getMessageHistory(contact),
        getContactAppointments(contact),
        getServices(contact.organizationId),
        getLastCancellation(contact),
        getClinicConfig(contact.organizationId)
    ])

    return { contact, messages, appointments, services, lastCancellation, clinicConfig }
}

/**
 * Handle incoming WhatsApp message end-to-end
 * 
 * @param phone - The sender's phone number
 * @param messageContent - The message text or transcription
 * @param organizationId - The organization ID (from resolveOrganization)
 * @param profileName - Optional WhatsApp profile name
 */
export async function handleIncomingMessage(
    phone: string,
    messageContent: string,
    organizationId: string,
    profileName?: string
): Promise<string> {
    const contact = await getOrCreateContact(phone, organizationId, profileName)

    if (!contact) {
        return "Lo siento, estamos experimentando dificultades. Intenta de nuevo más tarde."
    }

    await saveMessage(contact, "user", messageContent)

    const context = await buildConversationContext(contact)
    const response = await processMessage(messageContent, context)

    await saveMessage(contact, "assistant", response.text)

    return response.text
}
