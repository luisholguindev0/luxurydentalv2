import { getTransactions } from "@/lib/actions/transactions"
import { TransactionsClient } from "./transactions-client"

export default async function TransactionsPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string; query?: string; type?: string; startDate?: string; endDate?: string }>
}) {
    const { page, query, type, startDate, endDate } = await searchParams

    // Validate filters
    const validTypes = ["income", "expense", "payment", "charge"]
    // Cast to unknown first to avoid TS issues if validTypes inference is too narrow
    const filterType = type && validTypes.includes(type) ? (type as "income" | "expense" | "payment" | "charge") : undefined

    const result = await getTransactions({
        page: Number(page) || 1,
        limit: 15,
        query: query || "",
        type: filterType,
        startDate,
        endDate
    })

    const data = result.success ? result.data : { data: [], totalCount: 0, pageCount: 0 }

    return (
        <TransactionsClient
            initialTransactions={data.data}
            totalCount={data.totalCount}
            totalPages={data.pageCount}
        />
    )
}
