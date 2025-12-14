"use client"

import { useState } from "react"
import {
    Settings,
    Building2,
    Clock,
    Stethoscope,
    Save,
    AlertCircle,
    CheckCircle,
    Plus,
    Trash2,
    Edit
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { updateOrganization, updateBusinessHours } from "@/lib/actions/organization"
import { createService, deleteService } from "@/lib/actions/services"
import type { Tables } from "@/types/database"

type Organization = Tables<"organizations">
type Service = Tables<"services">

const DAYS = [
    { key: "monday", label: "Lunes" },
    { key: "tuesday", label: "Martes" },
    { key: "wednesday", label: "Miércoles" },
    { key: "thursday", label: "Jueves" },
    { key: "friday", label: "Viernes" },
    { key: "saturday", label: "Sábado" },
    { key: "sunday", label: "Domingo" },
] as const

interface SettingsClientProps {
    organization: Organization | null
    businessHours: Record<string, { open: string; close: string } | null> | null
    services: Service[]
}

export function SettingsClient({ organization, businessHours: initialHours, services: initialServices }: SettingsClientProps) {
    const [activeTab, setActiveTab] = useState<"general" | "hours" | "services">("general")
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Organization state
    const [orgName, setOrgName] = useState(organization?.name || "")
    const [orgSlug, setOrgSlug] = useState(organization?.slug || "")

    // Business hours state
    const [hours, setHours] = useState(initialHours || {})
    const [editingHours, setEditingHours] = useState(false)

    // Services state
    const [services, setServices] = useState(initialServices)
    const [newService, setNewService] = useState<{
        title: string
        price: string
        duration: string
        description: string
    } | null>(null)

    const showMessage = (type: "error" | "success", message: string) => {
        if (type === "error") {
            setError(message)
            setSuccess(null)
        } else {
            setSuccess(message)
            setError(null)
        }
        setTimeout(() => {
            setError(null)
            setSuccess(null)
        }, 5000)
    }

    const handleSaveOrganization = async () => {
        setIsSaving(true)
        const result = await updateOrganization({ name: orgName, slug: orgSlug })
        setIsSaving(false)

        if (result.success) {
            showMessage("success", "Configuración guardada")
        } else {
            showMessage("error", result.error || "Error al guardar")
        }
    }

    const handleSaveHours = async () => {
        setIsSaving(true)
        const result = await updateBusinessHours(hours)
        setIsSaving(false)
        setEditingHours(false)

        if (result.success) {
            showMessage("success", "Horarios guardados")
        } else {
            showMessage("error", result.error || "Error al guardar horarios")
        }
    }

    const handleToggleDay = (day: string) => {
        setHours((prev) => ({
            ...prev,
            [day]: prev[day] ? null : { open: "08:00", close: "18:00" },
        }))
    }

    const handleHourChange = (day: string, field: "open" | "close", value: string) => {
        setHours((prev) => ({
            ...prev,
            [day]: { ...(prev[day] || { open: "08:00", close: "18:00" }), [field]: value },
        }))
    }

    const handleCreateService = async () => {
        if (!newService) return

        setIsSaving(true)
        const result = await createService({
            title: newService.title,
            price: parseFloat(newService.price) || 0,
            duration_minutes: parseInt(newService.duration) || 30,
            is_active: true,
            description: newService.description || undefined,
        })
        setIsSaving(false)

        if (result.success && result.data) {
            setServices((prev) => [...prev, result.data])
            setNewService(null)
            showMessage("success", "Servicio creado")
        } else if (!result.success) {
            showMessage("error", result.error || "Error al crear servicio")
        }
    }

    const handleDeleteService = async (id: string) => {
        if (!confirm("¿Eliminar este servicio?")) return

        const result = await deleteService(id)
        if (result.success) {
            setServices((prev) => prev.filter((s) => s.id !== id))
            showMessage("success", "Servicio eliminado")
        } else {
            showMessage("error", result.error || "Error al eliminar")
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-shrink-0 p-6 border-b border-white/10">
                <h1 className="text-2xl font-serif text-text-primary flex items-center gap-3">
                    <Settings className="h-7 w-7 text-luxury-gold" />
                    Configuración
                </h1>
                <p className="text-text-muted text-sm mt-1">
                    Administra la configuración de tu clínica
                </p>

                {/* Tabs */}
                <div className="mt-4 flex gap-2">
                    {[
                        { key: "general", label: "General", icon: Building2 },
                        { key: "hours", label: "Horarios", icon: Clock },
                        { key: "services", label: "Servicios", icon: Stethoscope },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as typeof activeTab)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
                                activeTab === tab.key
                                    ? "bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/30"
                                    : "text-text-muted hover:bg-white/5 hover:text-text-secondary"
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Messages */}
            {error && (
                <div className="mx-6 mt-4 p-3 bg-luxury-danger/10 border border-luxury-danger/30 rounded-lg flex items-center gap-2 text-luxury-danger text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}
            {success && (
                <div className="mx-6 mt-4 p-3 bg-luxury-success/10 border border-luxury-success/30 rounded-lg flex items-center gap-2 text-luxury-success text-sm">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    {success}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl">
                    {/* General Tab */}
                    {activeTab === "general" && (
                        <div className="bg-luxury-card border border-white/10 rounded-xl p-6 space-y-6">
                            <h3 className="text-lg font-medium text-text-primary border-b border-white/10 pb-4">
                                Información de la Clínica
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="orgName">Nombre de la Clínica</Label>
                                    <Input
                                        id="orgName"
                                        value={orgName}
                                        onChange={(e) => setOrgName(e.target.value)}
                                        placeholder="LuxuryDental"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="orgSlug">Identificador (Slug)</Label>
                                    <Input
                                        id="orgSlug"
                                        value={orgSlug}
                                        onChange={(e) => setOrgSlug(e.target.value)}
                                        placeholder="luxury-dental"
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button onClick={handleSaveOrganization} disabled={isSaving}>
                                    {isSaving ? (
                                        <span className="flex items-center gap-2">
                                            <div className="h-4 w-4 border-2 border-luxury-darker/30 border-t-luxury-darker rounded-full animate-spin" />
                                            Guardando...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Save className="h-4 w-4" />
                                            Guardar Cambios
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Hours Tab */}
                    {activeTab === "hours" && (
                        <div className="bg-luxury-card border border-white/10 rounded-xl p-6 space-y-6">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <h3 className="text-lg font-medium text-text-primary">
                                    Horarios de Atención
                                </h3>
                                {!editingHours && (
                                    <Button variant="ghost" size="sm" onClick={() => setEditingHours(true)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Editar
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-4">
                                {DAYS.map((day) => {
                                    const dayHours = hours[day.key]
                                    return (
                                        <div
                                            key={day.key}
                                            className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0"
                                        >
                                            <div className="w-28 text-text-secondary">{day.label}</div>

                                            {editingHours ? (
                                                <>
                                                    <button
                                                        onClick={() => handleToggleDay(day.key)}
                                                        className={cn(
                                                            "px-3 py-1 rounded text-xs font-medium",
                                                            dayHours
                                                                ? "bg-luxury-success/20 text-luxury-success"
                                                                : "bg-white/10 text-text-muted"
                                                        )}
                                                    >
                                                        {dayHours ? "Abierto" : "Cerrado"}
                                                    </button>
                                                    {dayHours && (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="time"
                                                                value={dayHours.open}
                                                                onChange={(e) => handleHourChange(day.key, "open", e.target.value)}
                                                                className="bg-luxury-dark border border-white/10 rounded px-2 py-1 text-sm text-text-primary"
                                                            />
                                                            <span className="text-text-muted">-</span>
                                                            <input
                                                                type="time"
                                                                value={dayHours.close}
                                                                onChange={(e) => handleHourChange(day.key, "close", e.target.value)}
                                                                className="bg-luxury-dark border border-white/10 rounded px-2 py-1 text-sm text-text-primary"
                                                            />
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-text-primary">
                                                    {dayHours
                                                        ? `${dayHours.open} - ${dayHours.close}`
                                                        : <span className="text-text-muted">Cerrado</span>
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {editingHours && (
                                <div className="pt-4 flex gap-3">
                                    <Button onClick={handleSaveHours} disabled={isSaving}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Guardar Horarios
                                    </Button>
                                    <Button variant="ghost" onClick={() => setEditingHours(false)}>
                                        Cancelar
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Services Tab */}
                    {activeTab === "services" && (
                        <div className="space-y-4">
                            <div className="bg-luxury-card border border-white/10 rounded-xl p-6">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                                    <h3 className="text-lg font-medium text-text-primary">
                                        Servicios ({services.length})
                                    </h3>
                                    {!newService && (
                                        <Button
                                            size="sm"
                                            onClick={() => setNewService({ title: "", price: "", duration: "30", description: "" })}
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Agregar
                                        </Button>
                                    )}
                                </div>

                                {/* New Service Form */}
                                {newService && (
                                    <div className="p-4 bg-luxury-gold/5 border border-luxury-gold/20 rounded-lg mb-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                placeholder="Nombre del servicio"
                                                value={newService.title}
                                                onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                                            />
                                            <Input
                                                placeholder="Precio"
                                                type="number"
                                                value={newService.price}
                                                onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                placeholder="Duración (min)"
                                                type="number"
                                                value={newService.duration}
                                                onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                                            />
                                            <Input
                                                placeholder="Descripción (opcional)"
                                                value={newService.description}
                                                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={handleCreateService} disabled={isSaving || !newService.title}>
                                                <Save className="h-4 w-4 mr-2" />
                                                Guardar
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setNewService(null)}>
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Services List */}
                                <div className="space-y-2">
                                    {services.map((service) => (
                                        <div
                                            key={service.id}
                                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                                        >
                                            <div>
                                                <p className="text-text-primary font-medium">{service.title}</p>
                                                <p className="text-text-muted text-sm">
                                                    ${service.price.toLocaleString()} · {service.duration_minutes} min
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteService(service.id)}
                                                className="p-2 text-text-muted hover:text-luxury-danger hover:bg-luxury-danger/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {services.length === 0 && !newService && (
                                        <p className="text-text-muted text-center py-8">
                                            No hay servicios configurados
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
