"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Get the current user's organization ID.
 * This is used by all server actions to ensure org-scoped queries.
 */
export async function getOrgId(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        console.error("❌ [getOrgId] No authenticated user found:", authError)
        return null
    }

    console.log("✅ [getOrgId] User found:", user.id)

    const { data: adminUser, error: dbError } = await supabase
        .from("admin_users")
        .select("organization_id")
        .eq("id", user.id)
        .single()

    if (dbError || !adminUser) {
        console.error("❌ [getOrgId] Admin profile lookup failed:", dbError)
        return null
    }

    return adminUser.organization_id
}

/**
 * Handle action results uniformly
 */
export type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string }

export async function handleActionError(error: unknown): Promise<{ success: false; error: string }> {
    console.error("[Action Error]", error)

    if (error instanceof Error) {
        return { success: false, error: error.message }
    }

    return { success: false, error: "Ocurrió un error inesperado" }
}

/**
 * Revalidate common paths after mutations
 */
export async function revalidatePaths(paths: string[]) {
    paths.forEach(path => revalidatePath(path))
}
