"use client"

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { TransactionForm } from "./TransactionForm"
import { getPatientTransactions, type TransactionWithPatient } from "@/lib/actions/transactions"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
    Plus,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
    CircleDollarSign,
    Receipt,
    AlertTriangle
} from "lucide-react"

type PatientFinancialTabProps = {
    patientId: string
    patientName: string
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

export function PatientFinancialTab({ patientId, patientName }: PatientFinancialTabProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [data, setData] = useState<{
        transactions: TransactionWithPatient[]
        balance: number
        totalCharges: number
        totalPayments: number
    } | null>(null)
    const [error, setError] = useState<string | null>(null)

    const loadData = () => {
        startTransition(async () => {
            const result = await getPatientTransactions(patientId)
            if (result.success) {
                setData(result.data)
                setError(null)
            } else {
                setError(result.error)
            }
        })
    }

    useEffect(() => {
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId])

    const handleTransactionSuccess = () => {
        setIsDialogOpen(false)
        loadData()
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <AlertTriangle className="h-8 w-8 text-luxury-danger mx-auto mb-4" />
                    <p className="text-text-muted">{error}</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className={cn(
                    "relative overflow-hidden",
                    data && data.balance > 0 ? "border-luxury-warning/30" : "border-white/10"
                )}>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "rounded-lg p-2",
                                data && data.balance > 0 ? "bg-luxury-warning/10" : "bg-luxury-success/10"
                            )}>
                                <CreditCard className={cn(
                                    "h-5 w-5",
                                    data && data.balance > 0 ? "text-luxury-warning" : "text-luxury-success"
                                )} />
                            </div>
                            <div>
                                <p className="text-sm text-text-muted">Saldo Pendiente</p>
                                <p className={cn(
                                    "text-xl font-bold font-mono",
                                    data && data.balance > 0 ? "text-luxury-warning" : "text-luxury-success"
                                )}>
                                    {isPending ? "..." : formatCurrency(data?.balance ?? 0)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg p-2 bg-luxury-info/10">
                                <Receipt className="h-5 w-5 text-luxury-info" />
                            </div>
                            <div>
                                <p className="text-sm text-text-muted">Total Cargos</p>
                                <p className="text-xl font-bold font-mono text-white">
                                    {isPending ? "..." : formatCurrency(data?.totalCharges ?? 0)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg p-2 bg-luxury-gold/10">
                                <CircleDollarSign className="h-5 w-5 text-luxury-gold" />
                            </div>
                            <div>
                                <p className="text-sm text-text-muted">Total Pagado</p>
                                <p className="text-xl font-bold font-mono text-white">
                                    {isPending ? "..." : formatCurrency(data?.totalPayments ?? 0)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions List */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Historial de Transacciones</CardTitle>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Nueva Transacción
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Transacción para {patientName}</DialogTitle>
                            </DialogHeader>
                            <TransactionForm
                                patientId={patientId}
                                onSuccess={handleTransactionSuccess}
                                onCancel={() => setIsDialogOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {isPending ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : data?.transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="rounded-full bg-white/5 p-4">
                                <CircleDollarSign className="h-8 w-8 text-text-muted" />
                            </div>
                            <p className="mt-4 text-text-muted">No hay transacciones registradas</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data?.transactions.map((transaction) => {
                                const config = typeConfig[transaction.type]
                                const Icon = config.icon

                                return (
                                    <div
                                        key={transaction.id}
                                        className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-luxury-gold/20"
                                    >
                                        <div className={cn("rounded-lg p-2", config.bg)}>
                                            <Icon className={cn("h-5 w-5", config.color)} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-white truncate">
                                                {transaction.description}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-text-muted">
                                                <span>{config.label}</span>
                                                <span>•</span>
                                                <span>
                                                    {transaction.created_at
                                                        ? format(new Date(transaction.created_at), "d MMM yyyy, HH:mm", { locale: es })
                                                        : "—"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className={cn("text-right font-mono font-medium", config.color)}>
                                            {transaction.type === "expense" ? "-" : "+"}{formatCurrency(transaction.amount)}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
