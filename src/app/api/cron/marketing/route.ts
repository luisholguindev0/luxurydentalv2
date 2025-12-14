import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { sendWhatsAppMessage } from "@/lib/ai/whatsapp"

// Service role client for cron jobs (bypasses RLS)
const getServiceClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    return createAdminClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
    })
}

// ============================================
// MARKETING CRON
// Runs daily at 9 AM via Vercel Cron
// ============================================
// Tasks:
// 1. Reactivate dormant patients (6+ months inactive)
// 2. Lost lead follow-up (7+ days since last contact)
// 3. Post-appointment NPS request (24h after completion)
// ============================================

export async function POST(request: Request) {
    try {
        // Verify cron secret if set
        const cronSecret = process.env.CRON_SECRET
        const authHeader = request.headers.get("authorization")

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            console.warn("[marketing] Unauthorized cron request")
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = getServiceClient()

        // Get all active organizations
        const { data: orgs, error: orgError } = await supabase
            .from("organizations")
            .select("id, name")

        if (orgError) throw orgError

        const results = {
            processed_orgs: 0,
            reactivation_sent: 0,
            lead_followup_sent: 0,
            nps_requests_sent: 0,
            messages_sent: 0,
            message_errors: 0,
            errors: [] as string[],
        }

        for (const org of orgs ?? []) {
            try {
                // 1. DORMANT PATIENT REACTIVATION
                const reactivationResult = await sendReactivationCampaign(supabase, org.id)
                results.reactivation_sent += reactivationResult.processed
                results.messages_sent += reactivationResult.messagesSent
                results.message_errors += reactivationResult.messageErrors

                // 2. LOST LEAD FOLLOW-UP
                const leadFollowupResult = await sendLeadFollowup(supabase, org.id)
                results.lead_followup_sent += leadFollowupResult.processed
                results.messages_sent += leadFollowupResult.messagesSent
                results.message_errors += leadFollowupResult.messageErrors

                // 3. NPS REQUESTS
                const npsResult = await sendNpsRequests(supabase, org.id)
                results.nps_requests_sent += npsResult.processed
                results.messages_sent += npsResult.messagesSent
                results.message_errors += npsResult.messageErrors

                results.processed_orgs++
            } catch (err) {
                results.errors.push(`Org ${org.id}: ${String(err)}`)
            }
        }

        console.log("[marketing] Completed:", results)

        return NextResponse.json({
            success: true,
            ...results,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error("[marketing] Error:", error)
        return NextResponse.json(
            { error: "Internal server error", details: String(error) },
            { status: 500 }
        )
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

interface CampaignResult {
    processed: number
    messagesSent: number
    messageErrors: number
}

async function sendReactivationCampaign(
    supabase: ReturnType<typeof getServiceClient>,
    orgId: string
): Promise<CampaignResult> {
    // Get patients with no appointment in last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: patients, error: patientError } = await supabase
        .from("patients")
        .select(
            `
            id,
            full_name,
            whatsapp_number,
            appointments!appointments_patient_id_fkey(start_time, status)
        `
        )
        .eq("organization_id", orgId)

    if (patientError) {
        console.error("[marketing] Error fetching patients:", patientError)
        return { processed: 0, messagesSent: 0, messageErrors: 0 }
    }

    // Filter to dormant patients
    const dormantPatients = (patients ?? []).filter((patient) => {
        const appointments = (patient.appointments as Array<{ start_time: string; status: string }>) ?? []

        if (appointments.length === 0) return false // New patients, not dormant

        const lastAppointment = appointments
            .filter((a) => a.status === "completed")
            .sort(
                (a, b) =>
                    new Date(b.start_time).getTime() -
                    new Date(a.start_time).getTime()
            )[0]

        if (!lastAppointment) return false
        return new Date(lastAppointment.start_time) < sixMonthsAgo
    })

    if (!dormantPatients.length) return { processed: 0, messagesSent: 0, messageErrors: 0 }

    // Get or create reactivation campaign
    let { data: campaign } = await supabase
        .from("drip_campaigns")
        .select("id, message_template")
        .eq("organization_id", orgId)
        .eq("type", "reactivation")
        .eq("is_active", true)
        .limit(1)
        .single()

    if (!campaign) {
        const { data: newCampaign } = await supabase
            .from("drip_campaigns")
            .insert({
                organization_id: orgId,
                name: "Reactivación de Pacientes",
                type: "reactivation",
                trigger_condition: { months_inactive: 6 },
                message_template:
                    "Hola {{name}}, hace tiempo que no nos visitas. ¿Te gustaría agendar una cita para tu chequeo? Tenemos disponibilidad esta semana 🦷",
                is_active: true,
            })
            .select("id, message_template")
            .single()

        campaign = newCampaign
    }

    if (!campaign) return { processed: 0, messagesSent: 0, messageErrors: 0 }

    let processed = 0
    let messagesSent = 0
    let messageErrors = 0

    for (const patient of dormantPatients) {
        if (!patient.whatsapp_number) continue

        // Check if already sent in last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        const { data: existingSend } = await supabase
            .from("campaign_sends")
            .select("id")
            .eq("campaign_id", campaign.id)
            .eq("patient_id", patient.id)
            .gte("created_at", thirtyDaysAgo)
            .limit(1)

        if (existingSend?.length) continue // Already sent recently

        // Build message from template
        const message = (campaign.message_template || "Hola {{name}}, ¿te gustaría agendar una cita? 🦷")
            .replace(/\{\{name\}\}/g, patient.full_name.split(" ")[0])

        // Send WhatsApp message
        const result = await sendWhatsAppMessage(patient.whatsapp_number, message)

        // Create campaign send record
        await supabase.from("campaign_sends").insert({
            organization_id: orgId,
            campaign_id: campaign.id,
            patient_id: patient.id,
            status: result.success ? "sent" : "failed",
            sent_at: result.success ? new Date().toISOString() : null,
            error_message: result.error || null,
        })

        if (result.success) {
            messagesSent++
            console.log(`[marketing] Reactivation sent to ${patient.full_name} at ${patient.whatsapp_number}`)
        } else {
            messageErrors++
            console.error(`[marketing] Failed reactivation for ${patient.full_name}: ${result.error}`)
        }

        processed++
    }

    return { processed, messagesSent, messageErrors }
}

async function sendLeadFollowup(
    supabase: ReturnType<typeof getServiceClient>,
    orgId: string
): Promise<CampaignResult> {
    // Get leads with no contact in last 7 days that are still "new" or "contacted"
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: leads, error } = await supabase
        .from("leads")
        .select("id, phone, name, last_contact_at")
        .eq("organization_id", orgId)
        .in("status", ["new", "contacted"])
        .lt("last_contact_at", sevenDaysAgo)

    if (error) {
        console.error("[marketing] Error fetching leads:", error)
        return { processed: 0, messagesSent: 0, messageErrors: 0 }
    }

    if (!leads?.length) return { processed: 0, messagesSent: 0, messageErrors: 0 }

    // Get or create lead follow-up campaign
    let { data: campaign } = await supabase
        .from("drip_campaigns")
        .select("id, message_template")
        .eq("organization_id", orgId)
        .eq("type", "promotion")
        .eq("is_active", true)
        .limit(1)
        .single()

    if (!campaign) {
        const { data: newCampaign } = await supabase
            .from("drip_campaigns")
            .insert({
                organization_id: orgId,
                name: "Seguimiento de Leads",
                type: "promotion",
                trigger_condition: { days_inactive: 7 },
                message_template:
                    "Hola{{#name}} {{name}}{{/name}}, ¿sigues interesado en agendar una cita? Estamos aquí para ayudarte. 🦷",
                is_active: true,
            })
            .select("id, message_template")
            .single()

        campaign = newCampaign
    }

    let processed = 0
    let messagesSent = 0
    let messageErrors = 0

    for (const lead of leads) {
        if (!lead.phone) continue

        // Build message
        const greeting = lead.name ? `Hola ${lead.name.split(" ")[0]}` : "Hola"
        const message = `${greeting}, ¿sigues interesado en agendar una cita? Estamos aquí para ayudarte 🦷`

        // Send WhatsApp message
        const result = await sendWhatsAppMessage(lead.phone, message)

        // Update lead's last_contact_at
        await supabase
            .from("leads")
            .update({
                last_contact_at: new Date().toISOString(),
                status: "contacted"
            })
            .eq("id", lead.id)

        // Create campaign send record if we have a campaign
        if (campaign) {
            await supabase.from("campaign_sends").insert({
                organization_id: orgId,
                campaign_id: campaign.id,
                lead_id: lead.id,
                status: result.success ? "sent" : "failed",
                sent_at: result.success ? new Date().toISOString() : null,
                error_message: result.error || null,
            })
        }

        if (result.success) {
            messagesSent++
            console.log(`[marketing] Lead follow-up sent to ${lead.name ?? "Unknown"} at ${lead.phone}`)
        } else {
            messageErrors++
            console.error(`[marketing] Failed lead follow-up for ${lead.name ?? "Unknown"}: ${result.error}`)
        }

        processed++
    }

    return { processed, messagesSent, messageErrors }
}

async function sendNpsRequests(
    supabase: ReturnType<typeof getServiceClient>,
    orgId: string
): Promise<CampaignResult> {
    // Get appointments completed 24h ago that haven't received NPS request
    const windowStart = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    const windowEnd = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()

    const { data: appointments, error } = await supabase
        .from("appointments")
        .select(
            `
            id,
            patient_id,
            patient:patients!appointments_patient_id_fkey(id, full_name, whatsapp_number)
        `
        )
        .eq("organization_id", orgId)
        .eq("status", "completed")
        .gte("updated_at", windowStart)
        .lte("updated_at", windowEnd)

    if (error) {
        console.error("[marketing] Error fetching NPS appointments:", error)
        return { processed: 0, messagesSent: 0, messageErrors: 0 }
    }

    if (!appointments?.length) return { processed: 0, messagesSent: 0, messageErrors: 0 }

    // Get or create NPS campaign
    let { data: campaign } = await supabase
        .from("drip_campaigns")
        .select("id, message_template")
        .eq("organization_id", orgId)
        .eq("type", "nps")
        .eq("is_active", true)
        .limit(1)
        .single()

    if (!campaign) {
        const { data: newCampaign } = await supabase
            .from("drip_campaigns")
            .insert({
                organization_id: orgId,
                name: "Encuesta NPS",
                type: "nps",
                trigger_condition: { hours_after_completion: 24 },
                message_template:
                    "Hola {{name}}, gracias por tu visita. Del 0 al 10, ¿qué tan probable es que nos recomiendes? Responde con un número.",
                is_active: true,
            })
            .select("id, message_template")
            .single()

        campaign = newCampaign
    }

    if (!campaign) return { processed: 0, messagesSent: 0, messageErrors: 0 }

    let processed = 0
    let messagesSent = 0
    let messageErrors = 0

    for (const apt of appointments) {
        const patient = apt.patient as { id: string; full_name: string; whatsapp_number: string } | null
        if (!patient || !patient.whatsapp_number) continue

        // Check if already has feedback for this appointment
        const { data: existingFeedback } = await supabase
            .from("patient_feedback")
            .select("id")
            .eq("appointment_id", apt.id)
            .limit(1)

        if (existingFeedback?.length) continue // Already has feedback

        // Check if NPS already sent for this patient recently
        const { data: existingSend } = await supabase
            .from("campaign_sends")
            .select("id")
            .eq("campaign_id", campaign.id)
            .eq("patient_id", patient.id)
            .gte("created_at", windowStart)
            .limit(1)

        if (existingSend?.length) continue // Already sent

        // Build message from template
        const message = (campaign.message_template || "Hola {{name}}, ¿cómo fue tu visita? (0-10)")
            .replace(/\{\{name\}\}/g, patient.full_name.split(" ")[0])

        // Send WhatsApp message
        const result = await sendWhatsAppMessage(patient.whatsapp_number, message)

        // Create campaign send record
        await supabase.from("campaign_sends").insert({
            organization_id: orgId,
            campaign_id: campaign.id,
            patient_id: patient.id,
            status: result.success ? "sent" : "failed",
            sent_at: result.success ? new Date().toISOString() : null,
            error_message: result.error || null,
        })

        if (result.success) {
            messagesSent++
            console.log(`[marketing] NPS request sent to ${patient.full_name} at ${patient.whatsapp_number}`)
        } else {
            messageErrors++
            console.error(`[marketing] Failed NPS for ${patient.full_name}: ${result.error}`)
        }

        processed++
    }

    return { processed, messagesSent, messageErrors }
}

// For Vercel Cron
export const dynamic = "force-dynamic"
