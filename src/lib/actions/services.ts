"use server"

import { createClient } from "@/lib/supabase/server"
import { getOrgId, handleActionError, revalidatePaths, type ActionResult } from "./base"
import { serviceCreateSchema, serviceUpdateSchema, type ServiceCreateInput, type ServiceUpdateInput } from "@/lib/validations/schemas"
import type { Tables } from "@/types/database"

type Service = Tables<"services">

/**
 * Get all services for the current organization
 */
export async function getServices(activeOnly: boolean = false): Promise<ActionResult<Service[]>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        let query = supabase
            .from("services")
            .select("*")
            .eq("organization_id", orgId)
            .order("title", { ascending: true })

        if (activeOnly) {
            query = query.eq("is_active", true)
        }

        const { data, error } = await query

        if (error) throw error

        return { success: true, data: data ?? [] }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get a single service by ID
 */
export async function getServiceById(id: string): Promise<ActionResult<Service>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const { data, error } = await supabase
            .from("services")
            .select("*")
            .eq("id", id)
            .eq("organization_id", orgId)
            .single()

        if (error) throw error
        if (!data) return { success: false, error: "Servicio no encontrado" }

        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Create a new service
 */
export async function createService(input: ServiceCreateInput): Promise<ActionResult<Service>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        // Validate input
        const validated = serviceCreateSchema.safeParse(input)
        if (!validated.success) {
            return { success: false, error: validated.error.issues[0].message }
        }

        const { data, error } = await supabase
            .from("services")
            .insert({
                ...validated.data,
                organization_id: orgId,
            })
            .select()
            .single()

        if (error) throw error

        revalidatePaths(["/admin/settings"])
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Update an existing service
 */
export async function updateService(id: string, input: ServiceUpdateInput): Promise<ActionResult<Service>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        // Validate input
        const validated = serviceUpdateSchema.safeParse(input)
        if (!validated.success) {
            return { success: false, error: validated.error.issues[0].message }
        }

        const { data, error } = await supabase
            .from("services")
            .update(validated.data)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single()

        if (error) throw error
        if (!data) return { success: false, error: "Servicio no encontrado" }

        revalidatePaths(["/admin/settings"])
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Delete a service (soft delete by setting is_active = false)
 */
export async function deleteService(id: string): Promise<ActionResult<Service>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const { data, error } = await supabase
            .from("services")
            .update({ is_active: false })
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single()

        if (error) throw error

        revalidatePaths(["/admin/settings"])
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}
