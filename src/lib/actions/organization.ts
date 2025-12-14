"use server"

import { createClient } from "@/lib/supabase/server"
import { getOrgId, handleActionError, type ActionResult } from "./base"
import { z } from "zod"
import type { Tables } from "@/types/database"
import { revalidatePath } from "next/cache"
import { type BusinessHoursConfig, DEFAULT_BUSINESS_HOURS } from "@/lib/utils/appointments"

type Organization = Tables<"organizations">

const organizationUpdateSchema = z.object({
    name: z.string().min(1, "El nombre es requerido").optional(),
    slug: z.string().min(1, "El slug es requerido").optional(),
    settings: z.record(z.string(), z.any()).optional(),
})

export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>

/**
 * Get the current organization
 */
export async function getOrganization(): Promise<ActionResult<Organization>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const { data, error } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", orgId)
            .single()

        if (error) throw error
        if (!data) return { success: false, error: "Organización no encontrada" }

        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Update organization settings
 */
export async function updateOrganization(input: OrganizationUpdateInput): Promise<ActionResult<Organization>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const validated = organizationUpdateSchema.safeParse(input)
        if (!validated.success) {
            return { success: false, error: validated.error.issues[0].message }
        }

        const { data, error } = await supabase
            .from("organizations")
            .update(validated.data)
            .eq("id", orgId)
            .select()
            .single()

        if (error) throw error

        revalidatePath("/admin/settings")
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get business hours from organization settings
 */
export async function getBusinessHours(): Promise<ActionResult<{
    monday: { open: string; close: string } | null
    tuesday: { open: string; close: string } | null
    wednesday: { open: string; close: string } | null
    thursday: { open: string; close: string } | null
    friday: { open: string; close: string } | null
    saturday: { open: string; close: string } | null
    sunday: { open: string; close: string } | null
}>> {
    try {
        const result = await getOrganization()
        if (!result.success) return result

        const settings = result.data.settings as Record<string, unknown> || {}
        const businessHours = (settings.business_hours as Record<string, { open: string; close: string } | null>) || {}

        return {
            success: true,
            data: {
                monday: businessHours.monday || { open: "08:00", close: "18:00" },
                tuesday: businessHours.tuesday || { open: "08:00", close: "18:00" },
                wednesday: businessHours.wednesday || { open: "08:00", close: "18:00" },
                thursday: businessHours.thursday || { open: "08:00", close: "18:00" },
                friday: businessHours.friday || { open: "08:00", close: "18:00" },
                saturday: businessHours.saturday || { open: "08:00", close: "14:00" },
                sunday: businessHours.sunday || null,
            },
        }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Update business hours
 */
export async function updateBusinessHours(hours: Record<string, { open: string; close: string } | null>): Promise<ActionResult<null>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        // Get current settings
        const { data: org } = await supabase
            .from("organizations")
            .select("settings")
            .eq("id", orgId)
            .single()

        const currentSettings = (org?.settings as Record<string, unknown>) || {}

        // Merge business hours
        const newSettings = {
            ...currentSettings,
            business_hours: hours,
        }

        const { error } = await supabase
            .from("organizations")
            .update({ settings: newSettings })
            .eq("id", orgId)

        if (error) throw error

        revalidatePath("/admin/settings")
        revalidatePath("/admin/appointments")
        return { success: true, data: null }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get internal configuration for logic
 */
export async function getBusinessHoursConfig(): Promise<BusinessHoursConfig> {
    const result = await getBusinessHours()
    if (!result.success) return DEFAULT_BUSINESS_HOURS

    const settings = result.data
    const config: BusinessHoursConfig = { ...DEFAULT_BUSINESS_HOURS }

    const dayMap: Record<string, number> = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 0
    }

    Object.entries(settings).forEach(([day, hours]) => {
        const dayIndex = dayMap[day]
        if (dayIndex !== undefined) {
            if (!hours) {
                config[dayIndex] = null
            } else {
                config[dayIndex] = {
                    open: parseTime(hours.open),
                    close: parseTime(hours.close)
                }
            }
        }
    })

    return config
}

function parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(":").map(Number)
    return hours + (minutes / 60)
}
