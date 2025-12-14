"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getOrgId, handleActionError, type ActionResult } from "./base"
import { appointmentCreateSchema, appointmentUpdateSchema } from "@/lib/validations/schemas"
import type { Tables, Enums } from "@/types/database"

// Types
type Appointment = Tables<"appointments">
type AppointmentStatus = Enums<"appointment_status">

export type AppointmentWithRelations = Appointment & {
    patient: { id: string; full_name: string; whatsapp_number: string } | null
    service: { id: string; title: string; duration_minutes: number; price: number } | null
}

// Business hours configuration (Bogotá timezone)
const BUSINESS_HOURS = {
    0: null, // Sunday - Closed
    1: { open: 8, close: 18 }, // Monday
    2: { open: 8, close: 18 }, // Tuesday
    3: { open: 8, close: 18 }, // Wednesday
    4: { open: 8, close: 18 }, // Thursday
    5: { open: 8, close: 18 }, // Friday
    6: { open: 8, close: 14 }, // Saturday
} as const

/**
 * Validate that appointment time is within business hours
 */
function validateBusinessHours(startTime: Date, endTime: Date): { valid: boolean; error?: string } {
    const dayOfWeek = startTime.getDay() as keyof typeof BUSINESS_HOURS
    const hours = BUSINESS_HOURS[dayOfWeek]

    if (!hours) {
        return { valid: false, error: "No se pueden agendar citas los domingos" }
    }

    const startHour = startTime.getHours() + startTime.getMinutes() / 60
    const endHour = endTime.getHours() + endTime.getMinutes() / 60

    if (startHour < hours.open) {
        return { valid: false, error: `La clínica abre a las ${hours.open}:00` }
    }

    if (endHour > hours.close) {
        return { valid: false, error: `La clínica cierra a las ${hours.close}:00` }
    }

    return { valid: true }
}

/**
 * Check for conflicting appointments
 */
async function checkConflict(
    supabase: Awaited<ReturnType<typeof createClient>>,
    orgId: string,
    startTime: string,
    endTime: string,
    excludeId?: string
): Promise<{ hasConflict: boolean; error?: string }> {
    let query = supabase
        .from("appointments")
        .select("id, start_time, end_time")
        .eq("organization_id", orgId)
        .neq("status", "cancelled")
        .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`)

    if (excludeId) {
        query = query.neq("id", excludeId)
    }

    const { data: conflicts, error } = await query

    if (error) {
        console.error("[Conflict Check Error]", error)
        return { hasConflict: false } // Fail open, let DB constraint catch it
    }

    if (conflicts && conflicts.length > 0) {
        return {
            hasConflict: true,
            error: "Ya existe una cita en este horario"
        }
    }

    return { hasConflict: false }
}

/**
 * Get appointments for a date range
 */
export async function getAppointments(
    startDate: string,
    endDate: string
): Promise<ActionResult<AppointmentWithRelations[]>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const supabase = await createClient()

        const { data, error } = await supabase
            .from("appointments")
            .select(`
                *,
                patient:patients(id, full_name, whatsapp_number),
                service:services(id, title, duration_minutes, price)
            `)
            .eq("organization_id", orgId)
            .gte("start_time", startDate)
            .lte("start_time", endDate)
            .order("start_time", { ascending: true })

        if (error) throw error

        return { success: true, data: data as AppointmentWithRelations[] }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get a single appointment by ID
 */
export async function getAppointmentById(id: string): Promise<ActionResult<AppointmentWithRelations>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const supabase = await createClient()

        const { data, error } = await supabase
            .from("appointments")
            .select(`
                *,
                patient:patients(id, full_name, whatsapp_number),
                service:services(id, title, duration_minutes, price)
            `)
            .eq("id", id)
            .eq("organization_id", orgId)
            .single()

        if (error) throw error

        return { success: true, data: data as AppointmentWithRelations }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Create a new appointment
 */
export async function createAppointment(
    input: unknown
): Promise<ActionResult<Appointment>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        // Validate input
        const parsed = appointmentCreateSchema.safeParse(input)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0].message }
        }

        const { patient_id, service_id, start_time, end_time, notes } = parsed.data

        // Validate business hours
        const startDate = new Date(start_time)
        const endDate = new Date(end_time)

        const hoursValidation = validateBusinessHours(startDate, endDate)
        if (!hoursValidation.valid) {
            return { success: false, error: hoursValidation.error! }
        }

        const supabase = await createClient()

        // Check for conflicts
        const conflictCheck = await checkConflict(supabase, orgId, start_time, end_time)
        if (conflictCheck.hasConflict) {
            return { success: false, error: conflictCheck.error! }
        }

        // Create appointment
        const { data, error } = await supabase
            .from("appointments")
            .insert({
                organization_id: orgId,
                patient_id,
                service_id: service_id || null,
                start_time,
                end_time,
                notes: notes || null,
                status: "scheduled"
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath("/admin/appointments")
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Update an existing appointment
 */
export async function updateAppointment(
    id: string,
    input: unknown
): Promise<ActionResult<Appointment>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        // Validate input
        const parsed = appointmentUpdateSchema.safeParse(input)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0].message }
        }

        const { start_time, end_time, ...rest } = parsed.data

        const supabase = await createClient()

        // If times are being updated, validate business hours and conflicts
        if (start_time && end_time) {
            const startDate = new Date(start_time)
            const endDate = new Date(end_time)

            const hoursValidation = validateBusinessHours(startDate, endDate)
            if (!hoursValidation.valid) {
                return { success: false, error: hoursValidation.error! }
            }

            const conflictCheck = await checkConflict(supabase, orgId, start_time, end_time, id)
            if (conflictCheck.hasConflict) {
                return { success: false, error: conflictCheck.error! }
            }
        }

        // Update appointment
        const updateData: Record<string, unknown> = { ...rest }
        if (start_time) updateData.start_time = start_time
        if (end_time) updateData.end_time = end_time

        const { data, error } = await supabase
            .from("appointments")
            .update(updateData)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single()

        if (error) throw error

        revalidatePath("/admin/appointments")
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(
    id: string,
    reason: string
): Promise<ActionResult<Appointment>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const supabase = await createClient()

        const { data, error } = await supabase
            .from("appointments")
            .update({
                status: "cancelled" as AppointmentStatus,
                cancellation_reason: reason
            })
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single()

        if (error) throw error

        revalidatePath("/admin/appointments")
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(
    id: string,
    status: AppointmentStatus
): Promise<ActionResult<Appointment>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        // Validate status transition
        const validStatuses: AppointmentStatus[] = ["scheduled", "confirmed", "completed", "cancelled", "no_show"]
        if (!validStatuses.includes(status)) {
            return { success: false, error: "Estado inválido" }
        }

        const supabase = await createClient()

        const { data, error } = await supabase
            .from("appointments")
            .update({ status })
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single()

        if (error) throw error

        revalidatePath("/admin/appointments")
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get available time slots for a specific date
 */
export async function getAvailableSlots(
    date: string,
    durationMinutes: number = 30
): Promise<ActionResult<{ time: string; available: boolean }[]>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const targetDate = new Date(date)
        const dayOfWeek = targetDate.getDay() as keyof typeof BUSINESS_HOURS
        const hours = BUSINESS_HOURS[dayOfWeek]

        if (!hours) {
            return { success: true, data: [] } // Closed day
        }

        const supabase = await createClient()

        // Get existing appointments for the day
        const dayStart = new Date(targetDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(targetDate)
        dayEnd.setHours(23, 59, 59, 999)

        const { data: existingAppointments, error } = await supabase
            .from("appointments")
            .select("start_time, end_time")
            .eq("organization_id", orgId)
            .neq("status", "cancelled")
            .gte("start_time", dayStart.toISOString())
            .lte("start_time", dayEnd.toISOString())

        if (error) throw error

        // Generate all possible slots
        const slots: { time: string; available: boolean }[] = []
        const slotTime = new Date(targetDate)
        slotTime.setHours(hours.open, 0, 0, 0)

        while (slotTime.getHours() + slotTime.getMinutes() / 60 + durationMinutes / 60 <= hours.close) {
            const slotEnd = new Date(slotTime.getTime() + durationMinutes * 60000)

            // Check if slot conflicts with any existing appointment
            const isAvailable = !existingAppointments?.some(apt => {
                const aptStart = new Date(apt.start_time)
                const aptEnd = new Date(apt.end_time)
                return slotTime < aptEnd && slotEnd > aptStart
            })

            slots.push({
                time: slotTime.toISOString(),
                available: isAvailable
            })

            slotTime.setMinutes(slotTime.getMinutes() + 30)
        }

        return { success: true, data: slots }
    } catch (error) {
        return handleActionError(error)
    }
}
