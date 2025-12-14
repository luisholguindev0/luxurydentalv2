"use server"

import { createClient } from "@/lib/supabase/server"
import { getOrgId, handleActionError, type ActionResult } from "./base"
import {
    campaignCreateSchema,
    campaignUpdateSchema,
    feedbackCreateSchema,
    type CampaignCreateInput,
    type CampaignUpdateInput,
    type FeedbackCreateInput,
} from "@/lib/validations/schemas"
import { revalidatePath } from "next/cache"
import type { Tables } from "@/types/database"

// ============================================
// DRIP CAMPAIGNS
// ============================================

type Campaign = Tables<"drip_campaigns">
type CampaignSend = Tables<"campaign_sends">
type PatientFeedback = Tables<"patient_feedback">

/**
 * Get all drip campaigns for the organization
 */
export async function getCampaigns(filters?: {
    type?: Campaign["type"]
    isActive?: boolean
}): Promise<ActionResult<Campaign[]>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: "No autorizado" }

        const supabase = await createClient()

        let query = supabase
            .from("drip_campaigns")
            .select("*")
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false })

        if (filters?.type) {
            query = query.eq("type", filters.type)
        }

        if (filters?.isActive !== undefined) {
            query = query.eq("is_active", filters.isActive)
        }

        const { data, error } = await query

        if (error) throw error
        return { success: true, data: data ?? [] }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get a single campaign by ID
 */
export async function getCampaign(id: string): Promise<ActionResult<Campaign>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: "No autorizado" }

        const supabase = await createClient()
        const { data, error } = await supabase
            .from("drip_campaigns")
            .select("*")
            .eq("id", id)
            .eq("organization_id", orgId)
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Create a new drip campaign
 */
export async function createCampaign(input: CampaignCreateInput): Promise<ActionResult<Campaign>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: "No autorizado" }

        const parsed = campaignCreateSchema.safeParse(input)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0].message }
        }

        const supabase = await createClient()
        const { data, error } = await supabase
            .from("drip_campaigns")
            .insert({
                organization_id: orgId,
                ...parsed.data,
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath("/admin/marketing")
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Update a drip campaign
 */
export async function updateCampaign(
    id: string,
    input: CampaignUpdateInput
): Promise<ActionResult<Campaign>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: "No autorizado" }

        const parsed = campaignUpdateSchema.safeParse(input)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0].message }
        }

        const supabase = await createClient()
        const { data, error } = await supabase
            .from("drip_campaigns")
            .update(parsed.data)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single()

        if (error) throw error

        revalidatePath("/admin/marketing")
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Delete a drip campaign
 */
export async function deleteCampaign(id: string): Promise<ActionResult<null>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: "No autorizado" }

        const supabase = await createClient()
        const { error } = await supabase
            .from("drip_campaigns")
            .delete()
            .eq("id", id)
            .eq("organization_id", orgId)

        if (error) throw error

        revalidatePath("/admin/marketing")
        return { success: true, data: null }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Toggle campaign active status
 */
export async function toggleCampaignActive(
    id: string,
    isActive: boolean
): Promise<ActionResult<Campaign>> {
    return updateCampaign(id, { is_active: isActive })
}

// ============================================
// CAMPAIGN SENDS
// ============================================

/**
 * Get campaign sends with optional filters
 */
export async function getCampaignSends(filters?: {
    campaignId?: string
    patientId?: string
    status?: string
    limit?: number
}): Promise<ActionResult<CampaignSend[]>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: "No autorizado" }

        const supabase = await createClient()

        let query = supabase
            .from("campaign_sends")
            .select("*")
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false })

        if (filters?.campaignId) {
            query = query.eq("campaign_id", filters.campaignId)
        }

        if (filters?.patientId) {
            query = query.eq("patient_id", filters.patientId)
        }

        if (filters?.status) {
            query = query.eq("status", filters.status)
        }

        if (filters?.limit) {
            query = query.limit(filters.limit)
        }

        const { data, error } = await query

        if (error) throw error
        return { success: true, data: data ?? [] }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Create a campaign send record
 */
export async function createCampaignSend(input: {
    campaign_id: string
    patient_id?: string
    lead_id?: string
}): Promise<ActionResult<CampaignSend>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: "No autorizado" }

        if (!input.patient_id && !input.lead_id) {
            return { success: false, error: "Se requiere paciente o lead" }
        }

        const supabase = await createClient()
        const { data, error } = await supabase
            .from("campaign_sends")
            .insert({
                organization_id: orgId,
                campaign_id: input.campaign_id,
                patient_id: input.patient_id ?? null,
                lead_id: input.lead_id ?? null,
                status: "pending",
            })
            .select()
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Update campaign send status
 */
export async function updateCampaignSendStatus(
    id: string,
    status: "pending" | "sent" | "delivered" | "failed" | "clicked",
    errorMessage?: string
): Promise<ActionResult<CampaignSend>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: "No autorizado" }

        const supabase = await createClient()

        const updateData: Partial<CampaignSend> = { status }

        if (status === "sent") {
            updateData.sent_at = new Date().toISOString()
        } else if (status === "delivered") {
            updateData.delivered_at = new Date().toISOString()
        } else if (status === "failed" && errorMessage) {
            updateData.error_message = errorMessage
        }

        const { data, error } = await supabase
            .from("campaign_sends")
            .update(updateData)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

// ============================================
// PATIENT FEEDBACK
// ============================================

/**
 * Get patient feedback with optional filters
 */
export async function getPatientFeedback(filters?: {
    patientId?: string
    minNps?: number
    maxNps?: number
    limit?: number
}): Promise<ActionResult<PatientFeedback[]>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: "No autorizado" }

        const supabase = await createClient()

        let query = supabase
            .from("patient_feedback")
            .select("*")
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false })

        if (filters?.patientId) {
            query = query.eq("patient_id", filters.patientId)
        }

        if (filters?.minNps !== undefined) {
            query = query.gte("nps_score", filters.minNps)
        }

        if (filters?.maxNps !== undefined) {
            query = query.lte("nps_score", filters.maxNps)
        }

        if (filters?.limit) {
            query = query.limit(filters.limit)
        }

        const { data, error } = await query

        if (error) throw error
        return { success: true, data: data ?? [] }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Create patient feedback record
 */
export async function createPatientFeedback(
    input: FeedbackCreateInput
): Promise<ActionResult<PatientFeedback>> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: "No autorizado" }

        const parsed = feedbackCreateSchema.safeParse(input)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0].message }
        }

        const supabase = await createClient()
        const { data, error } = await supabase
            .from("patient_feedback")
            .insert({
                organization_id: orgId,
                ...parsed.data,
            })
            .select()
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

// ============================================
// ANALYTICS
// ============================================

/**
 * Get NPS summary metrics
 */
export async function getNpsSummary(): Promise<
    ActionResult<{
        avgScore: number
        totalResponses: number
        promoters: number // 9-10
        passives: number // 7-8
        detractors: number // 0-6
        npsScore: number // (promoters - detractors) / total * 100
    }>
> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: "No autorizado" }

        const supabase = await createClient()
        const { data, error } = await supabase
            .from("patient_feedback")
            .select("nps_score")
            .eq("organization_id", orgId)
            .not("nps_score", "is", null)

        if (error) throw error

        const scores = data?.map((d) => d.nps_score as number) ?? []
        const totalResponses = scores.length

        if (totalResponses === 0) {
            return {
                success: true,
                data: {
                    avgScore: 0,
                    totalResponses: 0,
                    promoters: 0,
                    passives: 0,
                    detractors: 0,
                    npsScore: 0,
                },
            }
        }

        const avgScore = scores.reduce((a, b) => a + b, 0) / totalResponses
        const promoters = scores.filter((s) => s >= 9).length
        const passives = scores.filter((s) => s >= 7 && s <= 8).length
        const detractors = scores.filter((s) => s <= 6).length
        const npsScore = Math.round(
            ((promoters - detractors) / totalResponses) * 100
        )

        return {
            success: true,
            data: {
                avgScore: Math.round(avgScore * 10) / 10,
                totalResponses,
                promoters,
                passives,
                detractors,
                npsScore,
            },
        }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get campaign performance metrics
 */
export async function getCampaignPerformance(campaignId: string): Promise<
    ActionResult<{
        totalSent: number
        delivered: number
        failed: number
        clicked: number
        deliveryRate: number
        clickRate: number
    }>
> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: "No autorizado" }

        const supabase = await createClient()
        const { data, error } = await supabase
            .from("campaign_sends")
            .select("status")
            .eq("organization_id", orgId)
            .eq("campaign_id", campaignId)

        if (error) throw error

        const sends = data ?? []
        const totalSent = sends.filter((s) =>
            ["sent", "delivered", "clicked"].includes(s.status)
        ).length
        const delivered = sends.filter((s) =>
            ["delivered", "clicked"].includes(s.status)
        ).length
        const failed = sends.filter((s) => s.status === "failed").length
        const clicked = sends.filter((s) => s.status === "clicked").length

        return {
            success: true,
            data: {
                totalSent,
                delivered,
                failed,
                clicked,
                deliveryRate: totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0,
                clickRate: delivered > 0 ? Math.round((clicked / delivered) * 100) : 0,
            },
        }
    } catch (error) {
        return handleActionError(error)
    }
}

// ============================================
// SMART MONITOR QUERIES (for cron)
// ============================================

/**
 * Get appointments that should be auto-cancelled (no-shows)
 * Returns appointments past their end_time + 15min grace period that are still "scheduled"
 */
export async function getNoShowsToCancel(orgId: string): Promise<
    ActionResult<
        Array<{
            id: string
            patient_id: string | null
            start_time: string
            end_time: string
        }>
    >
> {
    try {
        const supabase = await createClient()

        // 15 minutes grace period after appointment end
        const gracePeriodAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

        const { data, error } = await supabase
            .from("appointments")
            .select("id, patient_id, start_time, end_time")
            .eq("organization_id", orgId)
            .eq("status", "scheduled")
            .lt("end_time", gracePeriodAgo)

        if (error) throw error
        return { success: true, data: data ?? [] }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get appointments needing 24h reminder
 */
export async function getAppointmentsForReminder(
    orgId: string,
    hoursAhead: number
) {
    try {
        const supabase = await createClient()

        const now = new Date()
        const windowStart = new Date(
            now.getTime() + (hoursAhead - 0.5) * 60 * 60 * 1000
        ).toISOString()
        const windowEnd = new Date(
            now.getTime() + (hoursAhead + 0.5) * 60 * 60 * 1000
        ).toISOString()

        const { data, error } = await supabase
            .from("appointments")
            .select(
                `
                id, 
                patient_id, 
                start_time,
                patient:patients!appointments_patient_id_fkey(full_name, whatsapp_number)
            `
            )
            .eq("organization_id", orgId)
            .in("status", ["scheduled", "confirmed"])
            .gte("start_time", windowStart)
            .lte("start_time", windowEnd)

        if (error) throw error

        // Map to expected format (Supabase returns patient as array for joins)
        const mapped = (data ?? []).map((item) => ({
            id: item.id,
            patient_id: item.patient_id,
            start_time: item.start_time,
            patient: Array.isArray(item.patient) ? item.patient[0] ?? null : item.patient,
        }))

        return { success: true, data: mapped }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get dormant patients for reactivation (no appointment in X months)
 */
export async function getDormantPatients(
    orgId: string,
    monthsInactive: number = 6
): Promise<
    ActionResult<
        Array<{
            id: string
            full_name: string
            whatsapp_number: string
            last_appointment: string | null
        }>
    >
> {
    try {
        const supabase = await createClient()

        const cutoffDate = new Date()
        cutoffDate.setMonth(cutoffDate.getMonth() - monthsInactive)

        // Get patients with their last completed appointment
        const { data, error } = await supabase
            .from("patients")
            .select(
                `
                id,
                full_name,
                whatsapp_number,
                appointments!appointments_patient_id_fkey(
                    start_time
                )
            `
            )
            .eq("organization_id", orgId)

        if (error) throw error

        // Filter to patients with no recent appointments
        const dormantPatients = (data ?? [])
            .map((patient) => {
                const appointments = (patient.appointments as Array<{ start_time: string }>) ?? []
                const completedAppts = appointments.sort(
                    (a, b) =>
                        new Date(b.start_time).getTime() -
                        new Date(a.start_time).getTime()
                )
                const lastAppt = completedAppts[0]?.start_time ?? null

                return {
                    id: patient.id,
                    full_name: patient.full_name,
                    whatsapp_number: patient.whatsapp_number,
                    last_appointment: lastAppt,
                }
            })
            .filter((patient) => {
                if (!patient.last_appointment) return true // Never had an appointment
                return new Date(patient.last_appointment) < cutoffDate
            })

        return { success: true, data: dormantPatients }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get recently completed appointments for NPS follow-up
 */
export async function getAppointmentsForNps(
    orgId: string,
    hoursAfterCompletion: number = 24
) {
    try {
        const supabase = await createClient()

        const windowStart = new Date(
            Date.now() - (hoursAfterCompletion + 0.5) * 60 * 60 * 1000
        ).toISOString()
        const windowEnd = new Date(
            Date.now() - (hoursAfterCompletion - 0.5) * 60 * 60 * 1000
        ).toISOString()

        const { data, error } = await supabase
            .from("appointments")
            .select(
                `
                id,
                patient_id,
                patient:patients!appointments_patient_id_fkey(full_name, whatsapp_number)
            `
            )
            .eq("organization_id", orgId)
            .eq("status", "completed")
            .gte("updated_at", windowStart)
            .lte("updated_at", windowEnd)

        if (error) throw error

        // Map to expected format (Supabase returns patient as array for joins)
        const mapped = (data ?? []).map((item) => ({
            id: item.id,
            patient_id: item.patient_id,
            patient: Array.isArray(item.patient) ? item.patient[0] ?? null : item.patient,
        }))

        return { success: true, data: mapped }
    } catch (error) {
        return handleActionError(error)
    }
}
