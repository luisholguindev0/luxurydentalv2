import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { AppointmentsPageClient } from "./client"

async function getInitialData() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { patients: [], services: [], appointments: [] }
    }

    // Get org ID
    const { data: adminUser } = await supabase
        .from("admin_users")
        .select("organization_id")
        .eq("id", user.id)
        .single()

    if (!adminUser?.organization_id) {
        return { patients: [], services: [], appointments: [] }
    }

    const orgId = adminUser.organization_id

    // Fetch data in parallel
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const [patientsRes, servicesRes, appointmentsRes] = await Promise.all([
        supabase
            .from("patients")
            .select("*")
            .eq("organization_id", orgId)
            .order("full_name"),
        supabase
            .from("services")
            .select("*")
            .eq("organization_id", orgId)
            .eq("is_active", true)
            .order("title"),
        supabase
            .from("appointments")
            .select(`
                *,
                patient:patients(id, full_name, whatsapp_number),
                service:services(id, title, duration_minutes, price)
            `)
            .eq("organization_id", orgId)
            .gte("start_time", weekStart.toISOString())
            .lte("start_time", weekEnd.toISOString())
            .order("start_time")
    ])

    return {
        patients: patientsRes.data || [],
        services: servicesRes.data || [],
        appointments: appointmentsRes.data || []
    }
}

export default async function AppointmentsPage() {
    const { patients, services, appointments } = await getInitialData()

    return (
        <Suspense fallback={<AppointmentsLoading />}>
            <AppointmentsPageClient
                initialPatients={patients}
                initialServices={services}
                initialAppointments={appointments}
            />
        </Suspense>
    )
}

function AppointmentsLoading() {
    return (
        <div className="flex-1 p-6 flex items-center justify-center">
            <div className="animate-pulse text-text-muted">
                Cargando calendario...
            </div>
        </div>
    )
}
