"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createTransaction } from "@/lib/actions/transactions"
import type { TransactionCreateInput } from "@/lib/validations/schemas"
import { cn } from "@/lib/utils"
import { X, Loader2 } from "lucide-react"

type TransactionFormProps = {
    onSuccess?: () => void
    onCancel?: () => void
    patientId?: string
    appointmentId?: string
}

const transactionTypes = [
    { value: "income", label: "Ingreso", description: "Ingreso general del negocio" },
    { value: "expense", label: "Gasto", description: "Gasto operacional" },
    { value: "payment", label: "Pago", description: "Pago recibido de paciente" },
    { value: "charge", label: "Cargo", description: "Cobro a cuenta de paciente" },
] as const

export function TransactionForm({
    onSuccess,
    onCancel,
    patientId,
    appointmentId,
}: TransactionFormProps) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [selectedType, setSelectedType] = useState<TransactionCreateInput["type"]>("payment")
    const [amount, setAmount] = useState("")
    const [description, setDescription] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        const amountNum = parseFloat(amount.replace(/[^0-9.-]/g, ""))

        if (isNaN(amountNum) || amountNum <= 0) {
            setError("Por favor ingrese un monto válido")
            return
        }

        if (!description.trim()) {
            setError("La descripción es requerida")
            return
        }

        const input: TransactionCreateInput = {
            type: selectedType,
            amount: amountNum,
            description: description.trim(),
            patient_id: patientId || null,
            appointment_id: appointmentId || null,
        }

        startTransition(async () => {
            const result = await createTransaction(input)
            if (result.success) {
                setAmount("")
                setDescription("")
                onSuccess?.()
            } else {
                setError(result.error)
            }
        })
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Nueva Transacción</CardTitle>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="rounded-lg p-1 text-text-muted hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Transaction Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-3">
                            Tipo de Transacción
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {transactionTypes.map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setSelectedType(type.value)}
                                    className={cn(
                                        "rounded-lg border p-3 text-left transition-all",
                                        selectedType === type.value
                                            ? "border-luxury-gold bg-luxury-gold/10"
                                            : "border-white/10 hover:border-white/20"
                                    )}
                                >
                                    <p className={cn(
                                        "font-medium",
                                        selectedType === type.value ? "text-luxury-gold" : "text-white"
                                    )}>
                                        {type.label}
                                    </p>
                                    <p className="text-xs text-text-muted mt-0.5">
                                        {type.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Monto (COP)
                        </label>
                        <Input
                            type="text"
                            value={amount}
                            onChange={(e) => {
                                // Allow only numbers and format with thousands separator
                                const value = e.target.value.replace(/[^0-9]/g, "")
                                setAmount(value ? parseInt(value).toLocaleString("es-CO") : "")
                            }}
                            placeholder="0"
                            className="font-mono text-xl"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Descripción
                        </label>
                        <Input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej: Pago por limpieza dental"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="rounded-lg bg-luxury-danger/10 border border-luxury-danger/30 p-3 text-sm text-luxury-danger">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isPending}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            "Registrar Transacción"
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
