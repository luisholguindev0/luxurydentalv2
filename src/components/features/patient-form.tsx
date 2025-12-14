"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    User,
    Phone,
    Mail,
    MapPin,
    FileText,
    AlertCircle,
    ArrowLeft,
    Save
} from "lucide-react"
import { createPatient, updatePatient } from "@/lib/actions/patients"
import type { Tables } from "@/types/database"
import Link from "next/link"

type Patient = Tables<"patients">

interface PatientFormProps {
    patient?: Patient
    mode: "create" | "edit"
}

export function PatientForm({ patient, mode }: PatientFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)

        const formData = new FormData(e.currentTarget)

        const data = {
            full_name: formData.get("full_name") as string,
            whatsapp_number: (formData.get("whatsapp_number") as string) || "",
            email: formData.get("email") as string || undefined,
            address: formData.get("address") as string || undefined,
            notes: formData.get("notes") as string || undefined,
        }

        const result = mode === "create"
            ? await createPatient(data)
            : await updatePatient(patient!.id, data)

        if (result.success) {
            router.push("/admin/patients")
            router.refresh()
        } else {
            setError(result.error || "Error al guardar paciente")
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error */}
            {error && (
                <div className="p-3 bg-luxury-danger/10 border border-luxury-danger/30 rounded-lg flex items-center gap-2 text-luxury-danger text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            <div className="bg-luxury-card border border-white/10 rounded-xl p-6 space-y-6">
                <h3 className="text-lg font-medium text-text-primary border-b border-white/10 pb-4">
                    Información Personal
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="space-y-2">
                        <Label htmlFor="full_name">
                            Nombre Completo <span className="text-luxury-danger">*</span>
                        </Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                            <Input
                                id="full_name"
                                name="full_name"
                                defaultValue={patient?.full_name}
                                placeholder="Juan Pérez"
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>

                    {/* WhatsApp */}
                    <div className="space-y-2">
                        <Label htmlFor="whatsapp_number">
                            WhatsApp <span className="text-luxury-danger">*</span>
                        </Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                            <Input
                                id="whatsapp_number"
                                name="whatsapp_number"
                                defaultValue={patient?.whatsapp_number || ""}
                                placeholder="+573001234567"
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                defaultValue={patient?.email || ""}
                                placeholder="paciente@email.com"
                                className="pl-10"
                            />
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
                        <Input
                            id="address"
                            name="address"
                            defaultValue={patient?.address || ""}
                            placeholder="Calle 123 #45-67, Ciudad"
                            className="pl-10"
                        />
                    </div>
                </div>
            </div>

            {/* Medical Notes */}
            <div className="bg-luxury-card border border-white/10 rounded-xl p-6 space-y-6">
                <h3 className="text-lg font-medium text-text-primary border-b border-white/10 pb-4">
                    Información Médica
                </h3>

                <div className="space-y-2">
                    <Label htmlFor="notes">Notas Médicas / Generales</Label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
                        <Textarea
                            id="notes"
                            name="notes"
                            defaultValue={patient?.notes || ""}
                            placeholder="Alergias, condiciones preexistentes, medicamentos..."
                            className="pl-10 min-h-[120px]"
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
                <Link href="/admin/patients">
                    <Button type="button" variant="ghost">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Cancelar
                    </Button>
                </Link>

                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <span className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-luxury-darker/30 border-t-luxury-darker rounded-full animate-spin" />
                            Guardando...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Save className="h-4 w-4" />
                            {mode === "create" ? "Crear Paciente" : "Guardar Cambios"}
                        </span>
                    )}
                </Button>
            </div>
        </form>
    )
}
