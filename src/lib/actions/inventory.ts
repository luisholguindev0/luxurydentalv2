"use server"

import { createClient } from "@/lib/supabase/server"
import { getOrgId, handleActionError, revalidatePaths, type ActionResult } from "./base"
import { inventoryItemCreateSchema, inventoryItemUpdateSchema } from "@/lib/validations/schemas"
import type { InventoryItemCreateInput, InventoryItemUpdateInput } from "@/lib/validations/schemas"
import type { Tables } from "@/types/database"

type InventoryItem = Tables<"inventory_items">

export async function getInventoryItems(search?: string): Promise<ActionResult<InventoryItem[]>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) return { success: false, error: "No autorizado" }

        let query = supabase
            .from("inventory_items")
            .select("*")
            .eq("organization_id", orgId)
            .order("name", { ascending: true })

        if (search) {
            query = query.ilike("name", `%${search}%`)
        }

        const { data, error } = await query

        if (error) throw error
        return { success: true, data: data || [] }
    } catch (error) {
        return handleActionError(error)
    }
}

export async function createInventoryItem(input: InventoryItemCreateInput): Promise<ActionResult<InventoryItem>> {
    try {
        const validation = inventoryItemCreateSchema.safeParse(input)
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message }
        }

        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) return { success: false, error: "No autorizado" }

        const { data, error } = await supabase
            .from("inventory_items")
            .insert({
                organization_id: orgId,
                ...validation.data
            })
            .select()
            .single()

        if (error) throw error

        revalidatePaths(["/admin/inventory"])
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

export async function updateInventoryItem(id: string, input: InventoryItemUpdateInput): Promise<ActionResult<InventoryItem>> {
    try {
        const validation = inventoryItemUpdateSchema.safeParse(input)
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message }
        }

        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) return { success: false, error: "No autorizado" }

        const { data, error } = await supabase
            .from("inventory_items")
            .update(validation.data)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single()

        if (error) throw error
        if (!data) return { success: false, error: "Item no encontrado" }

        revalidatePaths(["/admin/inventory"])
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

export async function deleteInventoryItem(id: string): Promise<ActionResult<null>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) return { success: false, error: "No autorizado" }

        const { error } = await supabase
            .from("inventory_items")
            .delete()
            .eq("id", id)
            .eq("organization_id", orgId)

        if (error) throw error

        revalidatePaths(["/admin/inventory"])
        return { success: true, data: null }
    } catch (error) {
        return handleActionError(error)
    }
}
