"use server"

import { createClient } from "@/lib/supabase/server"
import { getOrgId, handleActionError, revalidatePaths, type ActionResult } from "./base"
import { patientCreateSchema, patientUpdateSchema, type PatientCreateInput, type PatientUpdateInput } from "@/lib/validations/schemas"
import type { Tables } from "@/types/database"

type Patient = Tables<"patients">

/**
 * Get all patients for the current organization with pagination and search
 */
export async function getPatients(options: {
    page?: number
    limit?: number
    query?: string
} = {}): Promise<ActionResult<{ data: Patient[], totalCount: number, pageCount: number }>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const page = options.page || 1
        const limit = options.limit || 10
        const queryStr = options.query || ""
        const offset = (page - 1) * limit

        let dbQuery = supabase
            .from("patients")
            .select("*", { count: "exact" })
            .eq("organization_id", orgId)

        if (queryStr) {
            dbQuery = dbQuery.or(`full_name.ilike.%${queryStr}%,whatsapp_number.ilike.%${queryStr}%,email.ilike.%${queryStr}%`)
        }

        const { data, error, count } = await dbQuery
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error

        const totalCount = count || 0
        const pageCount = Math.ceil(totalCount / limit)

        return {
            success: true,
            data: {
                data: data ?? [],
                totalCount,
                pageCount
            }
        }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get a single patient by ID
 */
export async function getPatientById(id: string): Promise<ActionResult<Patient>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const { data, error } = await supabase
            .from("patients")
            .select("*")
            .eq("id", id)
            .eq("organization_id", orgId)
            .single()

        if (error) throw error
        if (!data) return { success: false, error: "Paciente no encontrado" }

        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Create a new patient
 */
export async function createPatient(input: PatientCreateInput): Promise<ActionResult<Patient>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        // Validate input
        const validated = patientCreateSchema.safeParse(input)
        if (!validated.success) {
            return { success: false, error: validated.error.issues[0].message }
        }

        const { data, error } = await supabase
            .from("patients")
            .insert({
                ...validated.data,
                organization_id: orgId,
            })
            .select()
            .single()

        if (error) {
            if (error.code === "23505") {
                return { success: false, error: "Ya existe un paciente con este número de WhatsApp" }
            }
            throw error
        }

        revalidatePaths(["/admin/patients"])
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Update an existing patient
 */
export async function updatePatient(id: string, input: PatientUpdateInput): Promise<ActionResult<Patient>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        // Validate input
        const validated = patientUpdateSchema.safeParse(input)
        if (!validated.success) {
            return { success: false, error: validated.error.issues[0].message }
        }

        const { data, error } = await supabase
            .from("patients")
            .update(validated.data)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single()

        if (error) throw error
        if (!data) return { success: false, error: "Paciente no encontrado" }

        revalidatePaths(["/admin/patients", `/admin/patients/${id}`])
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Delete a patient
 */
export async function deletePatient(id: string): Promise<ActionResult<null>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const { error } = await supabase
            .from("patients")
            .delete()
            .eq("id", id)
            .eq("organization_id", orgId)

        if (error) throw error

        revalidatePaths(["/admin/patients"])
        return { success: true, data: null }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Search patients by name (fuzzy) - Legacy, use getPatients({ query }) instead
 */
export async function searchPatients(query: string): Promise<ActionResult<Patient[]>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const { data, error } = await supabase
            .from("patients")
            .select("*")
            .eq("organization_id", orgId)
            .ilike("full_name", `%${query}%`)
            .limit(20)

        if (error) throw error

        return { success: true, data: data ?? [] }
    } catch (error) {
        return handleActionError(error)
    }
}
