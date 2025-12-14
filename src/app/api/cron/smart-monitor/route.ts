import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { sendWhatsAppMessage } from "@/lib/ai/whatsapp"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"

const TIMEZONE = "America/Bogota"

// Service role client for cron jobs (bypasses RLS)
const getServiceClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    return createAdminClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
    })
}

// ============================================
// SMART MONITOR CRON
// Runs every 1 minute via Vercel Cron
// ============================================
// Tasks:
// 1. Auto-cancel no-shows (15 min after appointment end)
// 2. Send 24h reminders
// 3. Send 1h reminders
// ============================================

export async function POST(request: Request) {
    try {
        // Verify cron secret if set
        const cronSecret = process.env.CRON_SECRET
        const authHeader = request.headers.get("authorization")

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            console.warn("[smart-monitor] Unauthorized cron request")
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = getServiceClient()

        // Get all active organizations
        const { data: orgs, error: orgError } = await supabase
            .from("organizations")
            .select("id")

        if (orgError) throw orgError

        const results = {
            processed_orgs: 0,
            auto_cancelled: 0,
            reminders_24h: 0,
            reminders_1h: 0,
            messages_sent: 0,
            message_errors: 0,
            errors: [] as string[],
        }

        for (const org of orgs ?? []) {
            try {
                // 1. AUTO-CANCEL NO-SHOWS
                const autoCancelResult = await autoCancelNoShows(supabase, org.id)
                results.auto_cancelled += autoCancelResult

                // 2. SEND 24H REMINDERS
                const reminder24hResult = await send24hReminders(supabase, org.id)
                results.reminders_24h += reminder24hResult.sent
                results.messages_sent += reminder24hResult.messagesSent
                results.message_errors += reminder24hResult.messageErrors

                // 3. SEND 1H REMINDERS
                const reminder1hResult = await send1hReminders(supabase, org.id)
                results.reminders_1h += reminder1hResult.sent
                results.messages_sent += reminder1hResult.messagesSent
                results.message_errors += reminder1hResult.messageErrors

                results.processed_orgs++
            } catch (err) {
                results.errors.push(`Org ${org.id}: ${String(err)}`)
            }
        }

        console.log("[smart-monitor] Completed:", results)

        return NextResponse.json({
            success: true,
            ...results,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error("[smart-monitor] Error:", error)
        return NextResponse.json(
            { error: "Internal server error", details: String(error) },
            { status: 500 }
        )
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function autoCancelNoShows(
    supabase: ReturnType<typeof getServiceClient>,
    orgId: string
): Promise<number> {
    // 15 minutes grace period after appointment end
    const gracePeriodAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

    const { data: noShows, error: fetchError } = await supabase
        .from("appointments")
        .select("id, patient_id")
        .eq("organization_id", orgId)
        .eq("status", "scheduled")
        .lt("end_time", gracePeriodAgo)

    if (fetchError) {
        console.error("[smart-monitor] Error fetching no-shows:", fetchError)
        return 0
    }

    if (!noShows?.length) return 0

    // Update all no-shows at once
    const { error: updateError } = await supabase
        .from("appointments")
        .update({
            status: "no_show",
            cancellation_reason: "Auto-marcado como no-show por el sistema",
        })
        .in(
            "id",
            noShows.map((a) => a.id)
        )

    if (updateError) {
        console.error("[smart-monitor] Error updating no-shows:", updateError)
        return 0
    }

    console.log(`[smart-monitor] Auto-cancelled ${noShows.length} no-shows in org ${orgId}`)
    return noShows.length
}

async function send24hReminders(
    supabase: ReturnType<typeof getServiceClient>,
    orgId: string
): Promise<{ sent: number; messagesSent: number; messageErrors: number }> {
    const now = new Date()
    const windowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000).toISOString()
    const windowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000).toISOString()

    const { data: appointments, error } = await supabase
        .from("appointments")
        .select(
            `
            id,
            start_time,
            patient:patients!appointments_patient_id_fkey(id, full_name, whatsapp_number)
        `
        )
        .eq("organization_id", orgId)
        .in("status", ["scheduled", "confirmed"])
        .gte("start_time", windowStart)
        .lte("start_time", windowEnd)

    if (error) {
        console.error("[smart-monitor] Error fetching 24h reminders:", error)
        return { sent: 0, messagesSent: 0, messageErrors: 0 }
    }

    if (!appointments?.length) return { sent: 0, messagesSent: 0, messageErrors: 0 }

    let messagesSent = 0
    let messageErrors = 0

    for (const apt of appointments) {
        const patient = apt.patient as { id: string; full_name: string; whatsapp_number: string } | null
        if (!patient || !patient.whatsapp_number) continue

        // Check if reminder campaign send already exists
        const { data: existingSend } = await supabase
            .from("campaign_sends")
            .select("id")
            .eq("organization_id", orgId)
            .eq("patient_id", patient.id)
            .eq("status", "sent")
            .gte("created_at", new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString())
            .limit(1)

        if (existingSend?.length) continue // Already sent

        // Get or create reminder campaign
        let { data: campaign } = await supabase
            .from("drip_campaigns")
            .select("id, message_template")
            .eq("organization_id", orgId)
            .eq("type", "reminder")
            .eq("is_active", true)
            .limit(1)
            .single()

        if (!campaign) {
            const { data: newCampaign } = await supabase
                .from("drip_campaigns")
                .insert({
                    organization_id: orgId,
                    name: "Recordatorio 24h",
                    type: "reminder",
                    trigger_condition: { hours_before: 24 },
                    message_template:
                        "Hola {{name}}, te recordamos que tienes cita mañana a las {{time}}. ¡Te esperamos! 🦷",
                    is_active: true,
                })
                .select("id, message_template")
                .single()

            campaign = newCampaign
        }

        if (!campaign) continue

        // Format the appointment time
        const appointmentTime = toZonedTime(new Date(apt.start_time), TIMEZONE)
        const timeStr = format(appointmentTime, "h:mm a")

        // Build the message from template
        const message = (campaign.message_template || "Hola {{name}}, te recordamos tu cita mañana a las {{time}}. ¡Te esperamos!")
            .replace(/\{\{name\}\}/g, patient.full_name.split(" ")[0])
            .replace(/\{\{time\}\}/g, timeStr)

        // Send WhatsApp message
        const result = await sendWhatsAppMessage(patient.whatsapp_number, message)

        // Create campaign send record
        const sendRecord = await supabase.from("campaign_sends").insert({
            organization_id: orgId,
            campaign_id: campaign.id,
            patient_id: patient.id,
            status: result.success ? "sent" : "failed",
            sent_at: result.success ? new Date().toISOString() : null,
            error_message: result.error || null,
        })

        if (result.success) {
            messagesSent++
            console.log(`[smart-monitor] 24h reminder sent to ${patient.full_name} at ${patient.whatsapp_number}`)
        } else {
            messageErrors++
            console.error(`[smart-monitor] Failed to send 24h reminder to ${patient.full_name}: ${result.error}`)
        }

        // Avoid insert error logging noise
        if (sendRecord.error) {
            console.error("[smart-monitor] Failed to record campaign send:", sendRecord.error)
        }
    }

    return { sent: appointments.length, messagesSent, messageErrors }
}

async function send1hReminders(
    supabase: ReturnType<typeof getServiceClient>,
    orgId: string
): Promise<{ sent: number; messagesSent: number; messageErrors: number }> {
    const now = new Date()
    const windowStart = new Date(now.getTime() + 0.5 * 60 * 60 * 1000).toISOString()
    const windowEnd = new Date(now.getTime() + 1.5 * 60 * 60 * 1000).toISOString()

    const { data: appointments, error } = await supabase
        .from("appointments")
        .select(
            `
            id,
            start_time,
            patient:patients!appointments_patient_id_fkey(id, full_name, whatsapp_number)
        `
        )
        .eq("organization_id", orgId)
        .in("status", ["scheduled", "confirmed"])
        .gte("start_time", windowStart)
        .lte("start_time", windowEnd)

    if (error) {
        console.error("[smart-monitor] Error fetching 1h reminders:", error)
        return { sent: 0, messagesSent: 0, messageErrors: 0 }
    }

    if (!appointments?.length) return { sent: 0, messagesSent: 0, messageErrors: 0 }

    let messagesSent = 0
    let messageErrors = 0

    for (const apt of appointments) {
        const patient = apt.patient as { id: string; full_name: string; whatsapp_number: string } | null
        if (!patient || !patient.whatsapp_number) continue

        // Check if we already sent a 1h reminder for this specific appointment
        const { data: existingSend } = await supabase
            .from("campaign_sends")
            .select("id")
            .eq("organization_id", orgId)
            .eq("patient_id", patient.id)
            .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
            .limit(1)

        // Skip if we sent any reminder in last 2 hours (24h reminder would have been sent)
        // This prevents duplicate reminders
        if (existingSend?.length) continue

        // Format the appointment time
        const appointmentTime = toZonedTime(new Date(apt.start_time), TIMEZONE)
        const timeStr = format(appointmentTime, "h:mm a")

        const message = `¡Hola ${patient.full_name.split(" ")[0]}! Tu cita es en 1 hora (${timeStr}). ¡Te esperamos! 🦷`

        // Send WhatsApp message
        const result = await sendWhatsAppMessage(patient.whatsapp_number, message)

        if (result.success) {
            messagesSent++
            console.log(`[smart-monitor] 1h reminder sent to ${patient.full_name} at ${patient.whatsapp_number}`)
        } else {
            messageErrors++
            console.error(`[smart-monitor] Failed to send 1h reminder to ${patient.full_name}: ${result.error}`)
        }
    }

    return { sent: appointments.length, messagesSent, messageErrors }
}

// For Vercel Cron
export const dynamic = "force-dynamic"
