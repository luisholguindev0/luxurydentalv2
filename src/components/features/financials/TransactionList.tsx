"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { TransactionWithPatient } from "@/lib/actions/transactions"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowUpRight, ArrowDownRight, CircleDollarSign, Receipt } from "lucide-react"

type TransactionListProps = {
    transactions: TransactionWithPatient[]
    title?: string
    showPatient?: boolean
    emptyMessage?: string
}

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
    }).format(value)
}

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

function TransactionRow({
    transaction,
    showPatient
}: {
    transaction: TransactionWithPatient
    showPatient: boolean
}) {
    const config = typeConfig[transaction.type]
    const Icon = config.icon

    return (
        <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-luxury-gold/20">
            {/* Icon */}
            <div className={cn("rounded-lg p-2", config.bg)}>
                <Icon className={cn("h-5 w-5", config.color)} />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                    {transaction.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>{config.label}</span>
                    {showPatient && transaction.patient && (
                        <>
                            <span>•</span>
                            <span>{transaction.patient.full_name}</span>
                        </>
                    )}
                    <span>•</span>
                    <span>
                        {transaction.created_at
                            ? format(new Date(transaction.created_at), "d MMM, HH:mm", { locale: es })
                            : "—"}
                    </span>
                </div>
            </div>

            {/* Amount */}
            <div className={cn("text-right font-mono font-medium", config.color)}>
                {transaction.type === "expense" ? "-" : "+"}{formatCurrency(transaction.amount)}
            </div>
        </div>
    )
}

export function TransactionList({
    transactions,
    title = "Transacciones Recientes",
    showPatient = true,
    emptyMessage = "No hay transacciones registradas",
}: TransactionListProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="rounded-full bg-white/5 p-4">
                            <CircleDollarSign className="h-8 w-8 text-text-muted" />
                        </div>
                        <p className="mt-4 text-text-muted">{emptyMessage}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((transaction) => (
                            <TransactionRow
                                key={transaction.id}
                                transaction={transaction}
                                showPatient={showPatient}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
