import { getLeads, getLeadStats } from "@/lib/actions/leads"
import { LeadsListClient } from "./leads-list-client"

export default async function LeadsPage() {
    const [leadsResult, statsResult] = await Promise.all([
        getLeads(),
        getLeadStats()
    ])

    const leads = leadsResult.success ? leadsResult.data : []
    const stats = statsResult.success ? statsResult.data : null

    return <LeadsListClient initialLeads={leads} stats={stats} />
}
