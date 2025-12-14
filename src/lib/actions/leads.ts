"use server"

import { createClient } from "@/lib/supabase/server"
import { getOrgId, handleActionError, revalidatePaths, type ActionResult } from "./base"
import { z } from "zod"
import type { Tables } from "@/types/database"

type Lead = Tables<"leads">

// Validation schemas
const leadCreateSchema = z.object({
    name: z.string().min(1, "El nombre es requerido").optional().nullable(),
    phone: z.string().min(1, "El teléfono es requerido"),
    source: z.enum(["whatsapp", "website", "referral", "walk_in", "other"]).default("other"),
})

const leadUpdateSchema = leadCreateSchema.partial().extend({
    status: z.enum(["new", "contacted", "qualified", "converted", "lost"]).optional(),
})

export type LeadCreateInput = z.infer<typeof leadCreateSchema>
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>

/**
 * Get all leads for the current organization
 */
export async function getLeads(): Promise<ActionResult<Lead[]>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const { data, error } = await supabase
            .from("leads")
            .select("*")
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false })

        if (error) throw error

        return { success: true, data: data ?? [] }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get a single lead by ID
 */
export async function getLeadById(id: string): Promise<ActionResult<Lead>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const { data, error } = await supabase
            .from("leads")
            .select("*")
            .eq("id", id)
            .eq("organization_id", orgId)
            .single()

        if (error) throw error
        if (!data) return { success: false, error: "Lead no encontrado" }

        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Create a new lead
 */
export async function createLead(input: LeadCreateInput): Promise<ActionResult<Lead>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const validated = leadCreateSchema.safeParse(input)
        if (!validated.success) {
            return { success: false, error: validated.error.issues[0].message }
        }

        const { data, error } = await supabase
            .from("leads")
            .insert({
                ...validated.data,
                organization_id: orgId,
                status: "new",
            })
            .select()
            .single()

        if (error) {
            if (error.code === "23505") {
                return { success: false, error: "Ya existe un lead con este teléfono" }
            }
            throw error
        }

        revalidatePaths(["/admin/leads"])
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Update an existing lead
 */
export async function updateLead(id: string, input: LeadUpdateInput): Promise<ActionResult<Lead>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const validated = leadUpdateSchema.safeParse(input)
        if (!validated.success) {
            return { success: false, error: validated.error.issues[0].message }
        }

        const { data, error } = await supabase
            .from("leads")
            .update(validated.data)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single()

        if (error) throw error
        if (!data) return { success: false, error: "Lead no encontrado" }

        revalidatePaths(["/admin/leads", `/admin/leads/${id}`])
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Delete a lead
 */
export async function deleteLead(id: string): Promise<ActionResult<null>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const { error } = await supabase
            .from("leads")
            .delete()
            .eq("id", id)
            .eq("organization_id", orgId)

        if (error) throw error

        revalidatePaths(["/admin/leads"])
        return { success: true, data: null }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Convert lead to patient
 */
export async function convertLeadToPatient(id: string): Promise<ActionResult<Tables<"patients">>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        // Get the lead
        const { data: lead, error: leadError } = await supabase
            .from("leads")
            .select("*")
            .eq("id", id)
            .eq("organization_id", orgId)
            .single()

        if (leadError || !lead) {
            return { success: false, error: "Lead no encontrado" }
        }

        // Create patient from lead
        const { data: patient, error: patientError } = await supabase
            .from("patients")
            .insert({
                organization_id: orgId,
                full_name: lead.name || "Sin nombre",
                whatsapp_number: lead.phone,
            })
            .select()
            .single()

        if (patientError) {
            if (patientError.code === "23505") {
                return { success: false, error: "Ya existe un paciente con este número" }
            }
            throw patientError
        }

        // Update lead status
        await supabase
            .from("leads")
            .update({ status: "converted" })
            .eq("id", id)

        revalidatePaths(["/admin/leads", "/admin/patients"])
        return { success: true, data: patient }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get lead statistics
 */
export async function getLeadStats(): Promise<ActionResult<{
    total: number
    new: number
    contacted: number
    qualified: number
    converted: number
    lost: number
}>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const { data, error } = await supabase
            .from("leads")
            .select("status")
            .eq("organization_id", orgId)

        if (error) throw error

        const stats = {
            total: data?.length || 0,
            new: 0,
            contacted: 0,
            qualified: 0,
            converted: 0,
            lost: 0,
        }

        for (const lead of data || []) {
            const status = lead.status as keyof typeof stats
            if (status in stats && status !== "total") {
                stats[status]++
            }
        }

        return { success: true, data: stats }
    } catch (error) {
        return handleActionError(error)
    }
}
