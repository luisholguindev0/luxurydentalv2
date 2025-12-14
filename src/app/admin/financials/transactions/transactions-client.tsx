"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Pagination } from "@/components/ui/pagination"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import {
    Filter,
    Search,
    Calendar,
    Receipt,
    ArrowUpRight,
    ArrowDownRight,
    CircleDollarSign
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { TransactionWithPatient } from "@/lib/actions/transactions"
import Link from "next/link"

const typeConfig = {
    income: {
        label: "Ingreso",
        icon: ArrowUpRight,
        color: "text-luxury-success",
        bg: "bg-luxury-success/10",
    },
    expense: {
        label: "Gasto",
        icon: ArrowDownRight,
        color: "text-luxury-danger",
        bg: "bg-luxury-danger/10",
    },
    payment: {
        label: "Pago",
        icon: CircleDollarSign,
        color: "text-luxury-gold",
        bg: "bg-luxury-gold/10",
    },
    charge: {
        label: "Cargo",
        icon: Receipt,
        color: "text-luxury-info",
        bg: "bg-luxury-info/10",
    },
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
    }).format(value)
}

interface TransactionsClientProps {
    initialTransactions: TransactionWithPatient[]
    totalCount: number
    totalPages: number
}

export function TransactionsClient({ initialTransactions, totalCount, totalPages }: TransactionsClientProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [transactions, setTransactions] = useState<TransactionWithPatient[]>(initialTransactions)
    const [searchQuery, setSearchQuery] = useState(searchParams.get("query") || "")
    const [typeFilter, setTypeFilter] = useState<string>(searchParams.get("type") || "")

    // Sync state with server
    useEffect(() => {
        setTransactions(initialTransactions)
    }, [initialTransactions])

    useEffect(() => {
        setSearchQuery(searchParams.get("query") || "")
        setTypeFilter(searchParams.get("type") || "")
    }, [searchParams])

    const updateFilters = (query: string, type: string) => {
        setSearchQuery(query)
        setTypeFilter(type)

        const params = new URLSearchParams(searchParams)
        if (query) params.set("query", query)
        else params.delete("query")

        if (type) params.set("type", type)
        else params.delete("type")

        params.set("page", "1")
        router.replace(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="flex flex-col h-full bg-luxury-darker min-h-screen">
            {/* Header */}
            <header className="flex-shrink-0 p-8 pb-4 border-b border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-serif text-text-primary flex items-center gap-3">
                            <Receipt className="h-7 w-7 text-luxury-gold" />
                            Transacciones
                        </h1>
                        <p className="text-text-muted text-sm mt-1">
                            {totalCount} movimientos registrados
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                        <Input
                            placeholder="Buscar descripción..."
                            value={searchQuery}
                            onChange={(e) => updateFilters(e.target.value, typeFilter)}
                            className="pl-10"
                        />
                    </div>

                    <div className="relative w-full sm:w-48">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                        <select
                            value={typeFilter}
                            onChange={(e) => updateFilters(searchQuery, e.target.value)}
                            className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3 py-2 text-sm text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luxury-gold appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                        >
                            <option value="" className="bg-luxury-card">Todos los tipos</option>
                            <option value="income" className="bg-luxury-card">Ingresos</option>
                            <option value="expense" className="bg-luxury-card">Gastos</option>
                            <option value="payment" className="bg-luxury-card">Pagos</option>
                            <option value="charge" className="bg-luxury-card">Cargos</option>
                        </select>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                {transactions.length === 0 ? (
                    <EmptyState
                        icon={Receipt}
                        title="Sin transacciones"
                        description={searchQuery || typeFilter ? "No se encontraron resultados con los filtros actuales." : "No hay transacciones registradas."}
                        action={searchQuery || typeFilter ? {
                            label: "Limpiar filtros",
                            onClick: () => updateFilters("", "")
                        } : undefined}
                    />
                ) : (
                    <div className="bg-luxury-card border border-white/10 rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="text-left px-6 py-4 text-text-muted text-xs uppercase tracking-wider font-medium">Descripción</th>
                                    <th className="text-left px-6 py-4 text-text-muted text-xs uppercase tracking-wider font-medium">Tipo</th>
                                    <th className="text-left px-6 py-4 text-text-muted text-xs uppercase tracking-wider font-medium">Paciente</th>
                                    <th className="text-left px-6 py-4 text-text-muted text-xs uppercase tracking-wider font-medium">Fecha</th>
                                    <th className="text-right px-6 py-4 text-text-muted text-xs uppercase tracking-wider font-medium">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {transactions.map((tx) => {
                                    const config = typeConfig[tx.type]
                                    const Icon = config.icon
                                    return (
                                        <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <p className="text-text-primary font-medium">{tx.description}</p>
                                                <p className="text-xs text-text-muted mt-0.5 md:hidden">{config.label}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", config.bg, config.color)}>
                                                    <Icon className="h-3.5 w-3.5" />
                                                    {config.label}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-text-secondary">
                                                {tx.patient ? (
                                                    <Link href={`/admin/patients/${tx.patient_id}`} className="hover:text-luxury-gold transition-colors">
                                                        {tx.patient.full_name}
                                                    </Link>
                                                ) : (
                                                    <span className="text-text-muted">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-text-muted">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {tx.created_at && format(new Date(tx.created_at), "d MMM yyyy", { locale: es })}
                                                </div>
                                            </td>
                                            <td className={cn("px-6 py-4 text-right font-mono font-medium", config.color)}>
                                                {tx.type === "expense" ? "-" : "+"}{formatCurrency(tx.amount)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {transactions.length > 0 && totalPages > 1 && (
                <div className="p-8 pt-0 border-t border-white/5 bg-luxury-darker">
                    <Pagination totalPages={totalPages} />
                </div>
            )}
        </div>
    )
}
