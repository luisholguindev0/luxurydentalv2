import { getPatients } from "@/lib/actions/patients"
import { PatientsListClient } from "@/app/admin/patients/patients-list-client"

export default async function PatientsPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string; query?: string }>
}) {
    const { page, query } = await searchParams
    const pageNum = Number(page) || 1
    const queryStr = query || ""

    const result = await getPatients({ page: pageNum, limit: 10, query: queryStr })

    // Default empty state if fetch fails
    const data = result.success ? result.data : { data: [], totalCount: 0, pageCount: 0 }

    return (
        <PatientsListClient
            initialPatients={data.data}
            totalPages={data.pageCount}
            totalCount={data.totalCount}
        />
    )
}
