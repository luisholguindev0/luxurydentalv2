"use server"

import { createClient } from "@/lib/supabase/server"
import { getOrgId, handleActionError, type ActionResult } from "./base"
import type { Tables } from "@/types/database"

type Message = Tables<"messages"> & {
    patient?: { id: string; full_name: string } | null
    lead?: { id: string; name: string | null; phone: string } | null
}

interface ConversationThread {
    id: string
    type: "patient" | "lead"
    name: string
    phone: string
    lastMessage: string
    lastMessageAt: string
    messageCount: number
}

/**
 * Get all messages for the current organization
 */
export async function getMessages(options?: {
    patientId?: string
    leadId?: string
    limit?: number
}): Promise<ActionResult<Message[]>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        let query = supabase
            .from("messages")
            .select(`
                *,
                patient:patients!messages_patient_id_fkey(id, full_name),
                lead:leads!messages_lead_id_fkey(id, name, phone)
            `)
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false })

        if (options?.patientId) {
            query = query.eq("patient_id", options.patientId)
        }

        if (options?.leadId) {
            query = query.eq("lead_id", options.leadId)
        }

        if (options?.limit) {
            query = query.limit(options.limit)
        } else {
            query = query.limit(100)
        }

        const { data, error } = await query

        if (error) throw error

        return { success: true, data: data ?? [] }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get conversation threads (grouped by patient/lead)
 */
export async function getConversationThreads(): Promise<ActionResult<ConversationThread[]>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        // Get latest messages grouped by contact
        const { data: patientConvos, error: patientError } = await supabase
            .from("messages")
            .select(`
                patient_id,
                content,
                created_at,
                patient:patients!messages_patient_id_fkey(id, full_name, whatsapp_number)
            `)
            .eq("organization_id", orgId)
            .not("patient_id", "is", null)
            .order("created_at", { ascending: false })
            .limit(1000)

        if (patientError) throw patientError

        const { data: leadConvos, error: leadError } = await supabase
            .from("messages")
            .select(`
                lead_id,
                content,
                created_at,
                lead:leads!messages_lead_id_fkey(id, name, phone)
            `)
            .eq("organization_id", orgId)
            .not("lead_id", "is", null)
            .order("created_at", { ascending: false })
            .limit(1000)

        if (leadError) throw leadError

        // Group by contact and get latest message
        const patientThreads: Map<string, ConversationThread> = new Map()

        for (const msg of patientConvos || []) {
            const patient = (Array.isArray(msg.patient) ? msg.patient[0] : msg.patient) as unknown as { id: string; full_name: string; whatsapp_number: string } | null
            if (!patient || !msg.patient_id) continue

            if (!patientThreads.has(msg.patient_id)) {
                patientThreads.set(msg.patient_id, {
                    id: patient.id,
                    type: "patient",
                    name: patient.full_name,
                    phone: patient.whatsapp_number || "",
                    lastMessage: msg.content,
                    lastMessageAt: msg.created_at || "",
                    messageCount: 1,
                })
            } else {
                const thread = patientThreads.get(msg.patient_id)!
                thread.messageCount++
            }
        }

        const leadThreads: Map<string, ConversationThread> = new Map()

        for (const msg of leadConvos || []) {
            const lead = (Array.isArray(msg.lead) ? msg.lead[0] : msg.lead) as unknown as { id: string; name: string | null; phone: string } | null
            if (!lead || !msg.lead_id) continue

            if (!leadThreads.has(msg.lead_id)) {
                leadThreads.set(msg.lead_id, {
                    id: lead.id,
                    type: "lead",
                    name: lead.name || "Sin nombre",
                    phone: lead.phone,
                    lastMessage: msg.content,
                    lastMessageAt: msg.created_at || "",
                    messageCount: 1,
                })
            } else {
                const thread = leadThreads.get(msg.lead_id)!
                thread.messageCount++
            }
        }

        // Combine and sort by last message
        const threads = [
            ...Array.from(patientThreads.values()),
            ...Array.from(leadThreads.values()),
        ].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

        return { success: true, data: threads }
    } catch (error) {
        return handleActionError(error)
    }
}
