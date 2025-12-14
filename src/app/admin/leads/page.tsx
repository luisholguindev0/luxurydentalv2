import { getLeads, getLeadStats } from "@/lib/actions/leads"
import { LeadsListClient } from "@/app/admin/leads/leads-list-client"

export default async function LeadsPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string; query?: string }>
}) {
    const { page, query } = await searchParams
    const pageNum = Number(page) || 1
    const queryStr = query || ""

    const [leadsResult, statsResult] = await Promise.all([
        getLeads({ page: pageNum, limit: 10, query: queryStr }),
        getLeadStats()
    ])

    // Fallback if error, map data structure
    const leadsData = leadsResult.success ? leadsResult.data : { data: [], totalCount: 0, pageCount: 0 }
    const stats = statsResult.success ? statsResult.data : null

    return (
        <LeadsListClient
            initialLeads={leadsData.data}
            stats={stats}
            totalCount={leadsData.totalCount}
            totalPages={leadsData.pageCount}
        />
    )
}
