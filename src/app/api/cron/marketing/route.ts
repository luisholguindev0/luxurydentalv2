import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

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
            errors: [] as string[],
        }

        for (const org of orgs ?? []) {
            try {
                // 1. DORMANT PATIENT REACTIVATION
                const reactivationResult = await sendReactivationCampaign(
                    supabase,
                    org.id
                )
                results.reactivation_sent += reactivationResult

                // 2. LOST LEAD FOLLOW-UP
                const leadFollowupResult = await sendLeadFollowup(supabase, org.id)
                results.lead_followup_sent += leadFollowupResult

                // 3. NPS REQUESTS
                const npsResult = await sendNpsRequests(supabase, org.id)
                results.nps_requests_sent += npsResult

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

async function sendReactivationCampaign(
    supabase: ReturnType<typeof getServiceClient>,
    orgId: string
): Promise<number> {
    // Get patients with no appointment in last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // Get all patients
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
        return 0
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

    if (!dormantPatients.length) return 0

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

    if (!campaign) return 0

    let sentCount = 0

    for (const patient of dormantPatients) {
        // Check if already sent in last 30 days
        const thirtyDaysAgo = new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString()

        const { data: existingSend } = await supabase
            .from("campaign_sends")
            .select("id")
            .eq("campaign_id", campaign.id)
            .eq("patient_id", patient.id)
            .gte("created_at", thirtyDaysAgo)
            .limit(1)

        if (existingSend?.length) continue // Already sent recently

        // Create campaign send
        await supabase.from("campaign_sends").insert({
            organization_id: orgId,
            campaign_id: campaign.id,
            patient_id: patient.id,
            status: "pending",
        })

        // TODO: Actually send WhatsApp message
        console.log(
            `[marketing] Reactivation for ${patient.full_name} at ${patient.whatsapp_number}`
        )
        sentCount++
    }

    // Note: send_count should use SQL increment but for simplicity we skip it here
    // The campaign_sends table already tracks individual sends

    return sentCount
}

async function sendLeadFollowup(
    supabase: ReturnType<typeof getServiceClient>,
    orgId: string
): Promise<number> {
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
        return 0
    }

    if (!leads?.length) return 0

    for (const lead of leads) {
        // TODO: Actually send WhatsApp message
        console.log(
            `[marketing] Lead follow-up for ${lead.name ?? "Unknown"} at ${lead.phone}`
        )
    }

    return leads.length
}

async function sendNpsRequests(
    supabase: ReturnType<typeof getServiceClient>,
    orgId: string
): Promise<number> {
    // Get appointments completed 24h ago that haven't received NPS request
    const windowStart = new Date(
        Date.now() - 25 * 60 * 60 * 1000
    ).toISOString()
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
        return 0
    }

    if (!appointments?.length) return 0

    // Get or create NPS campaign
    let { data: campaign } = await supabase
        .from("drip_campaigns")
        .select("id")
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
            .select("id")
            .single()

        campaign = newCampaign
    }

    if (!campaign) return 0

    let sentCount = 0

    for (const apt of appointments) {
        const patient = apt.patient as { id: string; full_name: string; whatsapp_number: string } | null
        if (!patient) continue

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

        // Create campaign send
        await supabase.from("campaign_sends").insert({
            organization_id: orgId,
            campaign_id: campaign.id,
            patient_id: patient.id,
            status: "pending",
        })

        // TODO: Actually send WhatsApp message
        console.log(
            `[marketing] NPS request for ${patient.full_name} at ${patient.whatsapp_number}`
        )
        sentCount++
    }

    return sentCount
}

// For Vercel Cron
export const dynamic = "force-dynamic"
