"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    User,
    Phone,
    AlertCircle,
    ArrowLeft,
    Save,
    Globe
} from "lucide-react"
import { createLead, updateLead } from "@/lib/actions/leads"
import type { Tables } from "@/types/database"
import Link from "next/link"

type Lead = Tables<"leads">

interface LeadFormProps {
    lead?: Lead
    mode: "create" | "edit"
}

const SOURCES = [
    { value: "whatsapp", label: "WhatsApp" },
    { value: "website", label: "Sitio Web" },
    { value: "referral", label: "Referido" },
    { value: "walk_in", label: "Visita Directa" },
    { value: "other", label: "Otro" },
] as const

export function LeadForm({ lead, mode }: LeadFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)

        const formData = new FormData(e.currentTarget)

        const data = {
            name: formData.get("name") as string || undefined,
            phone: formData.get("phone") as string,
            source: (formData.get("source") || "other") as "whatsapp" | "website" | "referral" | "walk_in" | "other",
        }

        const result = mode === "create"
            ? await createLead(data)
            : await updateLead(lead!.id, data)

        if (result.success) {
            router.push("/admin/leads")
            router.refresh()
        } else {
            setError(result.error || "Error al guardar lead")
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
                    Información del Lead
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                            <Input
                                id="name"
                                name="name"
                                defaultValue={lead?.name || ""}
                                placeholder="Juan Pérez"
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <Label htmlFor="phone">
                            Teléfono <span className="text-luxury-danger">*</span>
                        </Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                            <Input
                                id="phone"
                                name="phone"
                                defaultValue={lead?.phone || ""}
                                placeholder="+573001234567"
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>

                    {/* Source */}
                    <div className="space-y-2">
                        <Label htmlFor="source">Fuente</Label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                            <select
                                id="source"
                                name="source"
                                defaultValue={lead?.source || "other"}
                                className="w-full h-10 pl-10 pr-4 rounded-lg bg-luxury-card border border-white/10 text-text-primary focus:border-luxury-gold/50 focus:ring-1 focus:ring-luxury-gold/50 outline-none"
                            >
                                {SOURCES.map((source) => (
                                    <option key={source.value} value={source.value}>
                                        {source.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
                <Link href="/admin/leads">
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
                            {mode === "create" ? "Crear Lead" : "Guardar Cambios"}
                        </span>
                    )}
                </Button>
            </div>
        </form>
    )
}
