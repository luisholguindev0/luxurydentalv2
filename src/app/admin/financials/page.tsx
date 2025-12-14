import { Suspense } from "react"
import { DollarSign, TrendingUp, Receipt, CreditCard } from "lucide-react"
import { getTransactions, getFinancialSummary, getMonthlyBreakdown, getRevenueForecast } from "@/lib/actions/transactions"
import { StatCard } from "@/components/features/financials/StatCard"
import { RevenueChart } from "@/components/features/financials/RevenueChart"
import { TransactionList } from "@/components/features/financials/TransactionList"
import { FinancialsDashboardClient } from "./FinancialsDashboardClient"

// Loading skeleton
function StatCardSkeleton() {
    return (
        <div className="rounded-xl border border-white/5 bg-luxury-card p-6 animate-pulse">
            <div className="h-4 w-24 bg-white/10 rounded mb-3" />
            <div className="h-8 w-32 bg-white/10 rounded" />
        </div>
    )
}

function ChartSkeleton() {
    return (
        <div className="rounded-xl border border-white/5 bg-luxury-card p-6 animate-pulse">
            <div className="h-6 w-40 bg-white/10 rounded mb-6" />
            <div className="h-[300px] w-full bg-white/5 rounded" />
        </div>
    )
}

// Server components for data fetching
async function FinancialStats() {
    // Get current month date range
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    // Get last month for comparison
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

    const [currentResult, lastMonthResult, forecastResult] = await Promise.all([
        getFinancialSummary({ startDate: startOfMonth, endDate: endOfMonth }),
        getFinancialSummary({ startDate: startOfLastMonth, endDate: endOfLastMonth }),
        getRevenueForecast(),
    ])

    const current = currentResult.success ? currentResult.data : null
    const lastMonth = lastMonthResult.success ? lastMonthResult.data : null
    const forecast = forecastResult.success ? forecastResult.data : null

    // Calculate trends
    const incomeTrend = current && lastMonth && lastMonth.totalIncome > 0
        ? ((current.totalIncome - lastMonth.totalIncome) / lastMonth.totalIncome * 100).toFixed(1)
        : null

    const netTrend = current && lastMonth && lastMonth.netRevenue !== 0
        ? ((current.netRevenue - lastMonth.netRevenue) / Math.abs(lastMonth.netRevenue) * 100).toFixed(1)
        : null

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
                title="Ingresos del Mes"
                value={current?.totalIncome ?? 0}
                icon={<DollarSign className="h-5 w-5" />}
                trend={incomeTrend ? (parseFloat(incomeTrend) > 0 ? "up" : parseFloat(incomeTrend) < 0 ? "down" : "stable") : undefined}
                trendValue={incomeTrend ? `${incomeTrend}% vs mes anterior` : undefined}
            />
            <StatCard
                title="Pagos Recibidos"
                value={current?.totalPayments ?? 0}
                icon={<CreditCard className="h-5 w-5" />}
                variant="success"
            />
            <StatCard
                title="Gastos del Mes"
                value={current?.totalExpenses ?? 0}
                icon={<Receipt className="h-5 w-5" />}
                variant="warning"
            />
            <StatCard
                title="Ingreso Neto"
                value={current?.netRevenue ?? 0}
                icon={<TrendingUp className="h-5 w-5" />}
                trend={forecast?.trend}
                trendValue={netTrend ? `${netTrend}% vs mes anterior` : undefined}
            />
        </div>
    )
}

async function RevenueChartSection() {
    const result = await getMonthlyBreakdown({ months: 6 })
    const data = result.success ? result.data : []

    return <RevenueChart data={data} />
}

async function RecentTransactions() {
    const result = await getTransactions({ limit: 10 })
    const transactions = result.success ? result.data : []

    return <TransactionList transactions={transactions} />
}

export default function FinancialsPage() {
    return (
        <div className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-semibold text-text-primary">
                            Finanzas
                        </h1>
                        <p className="text-text-muted">
                            Gestión de ingresos, gastos y pagos
                        </p>
                    </div>
                    <FinancialsDashboardClient />
                </div>

                {/* Stats */}
                <Suspense fallback={
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </div>
                }>
                    <FinancialStats />
                </Suspense>

                {/* Chart and Transactions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    <Suspense fallback={<ChartSkeleton />}>
                        <RevenueChartSection />
                    </Suspense>

                    <Suspense fallback={
                        <div className="rounded-xl border border-white/5 bg-luxury-card p-6 animate-pulse">
                            <div className="h-6 w-40 bg-white/10 rounded mb-6" />
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-16 w-full bg-white/5 rounded" />
                                ))}
                            </div>
                        </div>
                    }>
                        <RecentTransactions />
                    </Suspense>
                </div>
            </div>
        </div>
    )
}
