"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getOrgId, handleActionError, type ActionResult } from "./base"
import { appointmentCreateSchema, appointmentUpdateSchema } from "@/lib/validations/schemas"
import type { Tables, Enums } from "@/types/database"
import { validateBusinessHours, type BusinessHoursConfig } from "@/lib/utils/appointments"
import { getBusinessHoursConfig } from "@/lib/actions/organization"

// Types
type Appointment = Tables<"appointments">
type AppointmentStatus = Enums<"appointment_status">

export type AppointmentWithRelations = Appointment & {
    patient: { id: string; full_name: string; whatsapp_number: string } | null
    service: { id: string; title: string; duration_minutes: number; price: number } | null
}

/**
 * Check for conflicting appointments
 */
export async function checkConflict(
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
 * Internal implementation of createAppointment for testing
 */
export async function createAppointmentInternal(
    supabase: Awaited<ReturnType<typeof createClient>>,
    orgId: string,
    input: unknown,
    businessHoursConfig: BusinessHoursConfig,
    revalidateFn: (path: string) => void = revalidatePath
): Promise<ActionResult<Appointment>> {
    const parsed = appointmentCreateSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message }
    }

    const { patient_id, service_id, start_time, end_time, notes } = parsed.data

    // Validate business hours
    const startDate = new Date(start_time)
    const endDate = new Date(end_time)

    const hoursValidation = validateBusinessHours(startDate, endDate, businessHoursConfig)
    if (!hoursValidation.valid) {
        return { success: false, error: hoursValidation.error! }
    }

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

    // Call injected revalidation function
    try {
        revalidateFn("/admin/appointments")
    } catch {
        // Ignore revalidation errors in tests if they slip through
    }
    return { success: true, data }
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

        const [supabase, businessHours] = await Promise.all([
            createClient(),
            getBusinessHoursConfig()
        ])

        return createAppointmentInternal(supabase, orgId, input, businessHours)
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

        const [supabase, businessHours] = await Promise.all([
            createClient(),
            getBusinessHoursConfig()
        ])

        // If times are being updated, validate business hours and conflicts
        if (start_time && end_time) {
            const startDate = new Date(start_time)
            const endDate = new Date(end_time)

            const hoursValidation = validateBusinessHours(startDate, endDate, businessHours)
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
/**
 * Internal implementation of getAvailableSlots for testing
 */
export async function getAvailableSlotsInternal(
    supabase: Awaited<ReturnType<typeof createClient>>,
    orgId: string,
    date: string,
    businessHoursConfig: BusinessHoursConfig,
    durationMinutes: number = 30
): Promise<ActionResult<{ time: string; available: boolean }[]>> {
    const targetDate = new Date(date)
    const dayOfWeek = targetDate.getDay()
    const hours = businessHoursConfig[dayOfWeek]

    if (!hours) {
        return { success: true, data: [] } // Closed day
    }

    // Get existing appointments for the day
    const dayStart = new Date(targetDate)
    dayStart.setUTCHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setUTCHours(23, 59, 59, 999)

    const { data: existingAppointments, error } = await supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("organization_id", orgId)
        .neq("status", "cancelled")
        .gte("start_time", new Date(targetDate.getTime() - 86400000).toISOString())
        .lte("start_time", new Date(targetDate.getTime() + 86400000).toISOString())

    if (error) throw error

    // Generate all possible slots
    // Colombia is UTC-5
    const TIMEZONE_OFFSET = 5

    const slots: { time: string; available: boolean }[] = []

    // Start at Opening Time + Offset (e.g. 8AM + 5 = 13:00 UTC)
    const slotTime = new Date(targetDate)
    slotTime.setUTCHours(hours.open + TIMEZONE_OFFSET, 0, 0, 0)

    // Calculate Close Time in UTC
    const closeTime = new Date(targetDate)
    closeTime.setUTCHours(hours.close + TIMEZONE_OFFSET, 0, 0, 0)

    // Fix floating point comparison issues (e.g. 13:00 vs 13.00000001)
    // Add small epsilon or simple less-than-or-equal check
    while (slotTime.getTime() + durationMinutes * 60000 <= closeTime.getTime()) {
        const slotEnd = new Date(slotTime.getTime() + durationMinutes * 60000)

        // Check if slot conflicts with any existing appointment
        const isAvailable = !existingAppointments?.some(apt => {
            const aptStart = new Date(apt.start_time)
            const aptEnd = new Date(apt.end_time)
            // Strict overlap check
            return slotTime < aptEnd && slotEnd > aptStart
        })

        slots.push({
            time: slotTime.toISOString(),
            available: isAvailable
        })

        slotTime.setMinutes(slotTime.getMinutes() + 30)
    }

    return { success: true, data: slots }
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

        const [supabase, businessHours] = await Promise.all([
            createClient(),
            getBusinessHoursConfig()
        ])

        return getAvailableSlotsInternal(supabase, orgId, date, businessHours, durationMinutes)
    } catch (error) {
        return handleActionError(error)
    }
}

// No-show prediction types
export type PatientNoShowRisk = {
    patientId: string
    patientName: string
    riskScore: number // 0-100
    riskLevel: "low" | "medium" | "high"
    totalAppointments: number
    noShowCount: number
    cancelledCount: number
    noShowRate: number
    lastNoShow: string | null
}

/**
 * Get no-show prediction scores for patients
 * Calculates risk based on historical appointment behavior
 */
export async function getNoShowPredictions(options?: {
    patientId?: string
    minAppointments?: number // Only include patients with at least N appointments
}): Promise<ActionResult<PatientNoShowRisk[]>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const supabase = await createClient()

        // Get all appointments with patient info
        let query = supabase
            .from("appointments")
            .select(`
                id,
                status,
                start_time,
                patient_id,
                patient:patients(id, full_name)
            `)
            .eq("organization_id", orgId)
            .not("patient_id", "is", null)

        if (options?.patientId) {
            query = query.eq("patient_id", options.patientId)
        }

        const { data, error } = await query

        if (error) throw error

        const appointments = data ?? []

        // Group by patient
        const patientStats = new Map<string, {
            patientId: string
            patientName: string
            total: number
            noShows: number
            cancelled: number
            completed: number
            lastNoShow: string | null
            recentAppointments: { status: string; date: string }[]
        }>()

        for (const apt of appointments) {
            const patientId = apt.patient_id!
            // Supabase returns single relations as object, but TS may infer array
            const patientData = apt.patient as unknown as { id: string; full_name: string } | null
            const patientName = patientData?.full_name ?? "Desconocido"

            if (!patientStats.has(patientId)) {
                patientStats.set(patientId, {
                    patientId,
                    patientName,
                    total: 0,
                    noShows: 0,
                    cancelled: 0,
                    completed: 0,
                    lastNoShow: null,
                    recentAppointments: [],
                })
            }

            const stats = patientStats.get(patientId)!
            stats.total++

            if (apt.status === "no_show") {
                stats.noShows++
                if (!stats.lastNoShow || apt.start_time > stats.lastNoShow) {
                    stats.lastNoShow = apt.start_time
                }
            } else if (apt.status === "cancelled") {
                stats.cancelled++
            } else if (apt.status === "completed") {
                stats.completed++
            }

            // Track recent appointments (for recency weighting)
            stats.recentAppointments.push({
                status: apt.status ?? "scheduled",
                date: apt.start_time,
            })
        }

        // Calculate risk scores
        const minAppointments = options?.minAppointments ?? 1
        const predictions: PatientNoShowRisk[] = []

        for (const stats of patientStats.values()) {
            if (stats.total < minAppointments) continue

            // Base no-show rate (40% weight)
            const noShowRate = stats.noShows / stats.total
            const baseScore = noShowRate * 100 * 0.4

            // Recency factor - more recent no-shows increase risk (30% weight)
            let recencyScore = 0
            if (stats.lastNoShow) {
                const daysSinceLastNoShow = Math.floor(
                    (Date.now() - new Date(stats.lastNoShow).getTime()) / (1000 * 60 * 60 * 24)
                )
                // Recent no-shows (within 30 days) get higher recency score
                recencyScore = Math.max(0, 100 - daysSinceLastNoShow * 3) * 0.3
            }

            // Cancellation pattern (15% weight) - high cancellation also indicates risk
            const cancellationRate = stats.cancelled / stats.total
            const cancellationScore = cancellationRate * 100 * 0.15

            // Low appointment count penalty (15% weight) - new patients with any no-show are riskier
            let volumePenalty = 0
            if (stats.total < 5 && stats.noShows > 0) {
                volumePenalty = (5 - stats.total) * 5 * 0.15
            }

            // Calculate final score
            const riskScore = Math.min(100, Math.round(
                baseScore + recencyScore + cancellationScore + volumePenalty
            ))

            // Determine risk level
            let riskLevel: "low" | "medium" | "high" = "low"
            if (riskScore >= 70) {
                riskLevel = "high"
            } else if (riskScore >= 40) {
                riskLevel = "medium"
            }

            predictions.push({
                patientId: stats.patientId,
                patientName: stats.patientName,
                riskScore,
                riskLevel,
                totalAppointments: stats.total,
                noShowCount: stats.noShows,
                cancelledCount: stats.cancelled,
                noShowRate: Math.round(noShowRate * 100),
                lastNoShow: stats.lastNoShow,
            })
        }

        // Sort by risk score descending
        predictions.sort((a, b) => b.riskScore - a.riskScore)

        return { success: true, data: predictions }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get high-risk upcoming appointments
 * Combines no-show prediction with upcoming appointment schedule
 */
export async function getHighRiskAppointments(): Promise<ActionResult<{
    appointment: AppointmentWithRelations
    riskScore: number
    riskLevel: "low" | "medium" | "high"
}[]>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        // Get upcoming appointments (next 7 days)
        const now = new Date()
        const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        const [appointmentsResult, predictionsResult] = await Promise.all([
            getAppointments(now.toISOString(), weekLater.toISOString()),
            getNoShowPredictions({ minAppointments: 1 }),
        ])

        if (!appointmentsResult.success || !predictionsResult.success) {
            return { success: false, error: "Error al obtener datos" }
        }

        const riskMap = new Map(
            predictionsResult.data.map(p => [p.patientId, p])
        )

        const highRiskAppointments = appointmentsResult.data
            .filter(apt =>
                apt.status === "scheduled" || apt.status === "confirmed"
            )
            .map(apt => {
                const risk = apt.patient ? riskMap.get(apt.patient.id) : null
                return {
                    appointment: apt,
                    riskScore: risk?.riskScore ?? 0,
                    riskLevel: (risk?.riskLevel ?? "low") as "low" | "medium" | "high",
                }
            })
            .filter(item => item.riskScore >= 40) // Only medium and high risk
            .sort((a, b) => b.riskScore - a.riskScore)

        return { success: true, data: highRiskAppointments }
    } catch (error) {
        return handleActionError(error)
    }
}
