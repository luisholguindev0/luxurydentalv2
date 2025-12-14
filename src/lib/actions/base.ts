"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Get the current user's organization ID.
 * This is used by all server actions to ensure org-scoped queries.
 */
export async function getOrgId(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: adminUser } = await supabase
        .from("admin_users")
        .select("organization_id")
        .eq("id", user.id)
        .single()

    return adminUser?.organization_id ?? null
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
