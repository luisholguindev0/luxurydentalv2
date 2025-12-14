"use client"

import { useState } from "react"
import { Calendar, Clock, User, MoreHorizontal, Check, X, Phone } from "lucide-react"

import { updateAppointmentStatus, cancelAppointment } from "@/lib/actions/appointments"
import type { AppointmentWithRelations } from "@/lib/actions/appointments"
import type { Enums } from "@/types/database"
import { cn } from "@/lib/utils"

type AppointmentStatus = Enums<"appointment_status">

interface AppointmentListProps {
    appointments: AppointmentWithRelations[]
    onAppointmentClick?: (appointment: AppointmentWithRelations) => void
    onRefresh?: () => void
}

const STATUS_CONFIG = {
    scheduled: { label: "Agendada", color: "bg-blue-500/20 text-blue-300 border-blue-500/50" },
    confirmed: { label: "Confirmada", color: "bg-luxury-gold/20 text-luxury-gold border-luxury-gold/50" },
    completed: { label: "Completada", color: "bg-luxury-success/20 text-luxury-success border-luxury-success/50" },
    cancelled: { label: "Cancelada", color: "bg-luxury-danger/20 text-luxury-danger border-luxury-danger/50" },
    no_show: { label: "No asistió", color: "bg-orange-500/20 text-orange-400 border-orange-500/50" },
} as const

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("es-CO", {
        weekday: "short",
        day: "numeric",
        month: "short"
    })
}

function formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    })
}

export function AppointmentList({
    appointments,
    onAppointmentClick,
    onRefresh
}: AppointmentListProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [loading, setLoading] = useState<string | null>(null)

    const handleStatusChange = async (id: string, status: AppointmentStatus) => {
        setLoading(id)
        try {
            await updateAppointmentStatus(id, status)
            onRefresh?.()
        } finally {
            setLoading(null)
            setExpandedId(null)
        }
    }

    const handleCancel = async (id: string) => {
        const reason = prompt("Razón de cancelación:")
        if (!reason) return

        setLoading(id)
        try {
            await cancelAppointment(id, reason)
            onRefresh?.()
        } finally {
            setLoading(null)
        }
    }

    if (appointments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-text-muted mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-1">
                    No hay citas
                </h3>
                <p className="text-sm text-text-muted">
                    Las citas programadas aparecerán aquí
                </p>
            </div>
        )
    }

    // Group appointments by date
    const grouped = appointments.reduce((acc, apt) => {
        const date = new Date(apt.start_time).toDateString()
        if (!acc[date]) acc[date] = []
        acc[date].push(apt)
        return acc
    }, {} as Record<string, AppointmentWithRelations[]>)

    return (
        <div className="space-y-6">
            {Object.entries(grouped).map(([dateKey, dayAppointments]) => (
                <div key={dateKey}>
                    {/* Date Header */}
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4 text-luxury-gold" />
                        <h3 className="text-sm font-medium text-text-primary">
                            {formatDate(dayAppointments[0].start_time)}
                        </h3>
                        <span className="text-xs text-text-muted">
                            ({dayAppointments.length} cita{dayAppointments.length > 1 ? "s" : ""})
                        </span>
                    </div>

                    {/* Appointments */}
                    <div className="space-y-2">
                        {dayAppointments.map(apt => {
                            const status = apt.status || "scheduled"
                            const config = STATUS_CONFIG[status]
                            const isExpanded = expandedId === apt.id
                            const isLoading = loading === apt.id

                            return (
                                <div
                                    key={apt.id}
                                    className={cn(
                                        "p-4 rounded-xl bg-luxury-card border border-white/10 transition-all",
                                        "hover:border-luxury-gold/30",
                                        isLoading && "opacity-50 pointer-events-none"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Main Info */}
                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => onAppointmentClick?.(apt)}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="flex items-center gap-1.5 text-text-muted">
                                                    <Clock className="h-4 w-4" />
                                                    <span className="text-sm font-mono">
                                                        {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                                                    </span>
                                                </div>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-xs font-medium border",
                                                    config.color
                                                )}>
                                                    {config.label}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 mb-1">
                                                <User className="h-4 w-4 text-text-muted" />
                                                <span className="font-medium text-text-primary truncate">
                                                    {apt.patient?.full_name || "Sin paciente"}
                                                </span>
                                            </div>

                                            {apt.service && (
                                                <p className="text-sm text-text-muted ml-6">
                                                    {apt.service.title} • ${apt.service.price.toLocaleString()}
                                                </p>
                                            )}

                                            {apt.notes && (
                                                <p className="text-sm text-text-muted mt-2 italic">
                                                    &ldquo;{apt.notes}&rdquo;
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {apt.patient?.whatsapp_number && (
                                                <a
                                                    href={`https://wa.me/${apt.patient.whatsapp_number.replace(/\D/g, "")}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-luxury-success transition-colors"
                                                    title="Enviar WhatsApp"
                                                >
                                                    <Phone className="h-4 w-4" />
                                                </a>
                                            )}

                                            <div className="relative">
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : apt.id)}
                                                    className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </button>

                                                {isExpanded && (
                                                    <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-luxury-dark border border-white/10 rounded-lg shadow-xl z-10">
                                                        {status === "scheduled" && (
                                                            <button
                                                                onClick={() => handleStatusChange(apt.id, "confirmed")}
                                                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-white/5"
                                                            >
                                                                <Check className="h-4 w-4 text-luxury-gold" />
                                                                Confirmar
                                                            </button>
                                                        )}
                                                        {(status === "scheduled" || status === "confirmed") && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleStatusChange(apt.id, "completed")}
                                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-white/5"
                                                                >
                                                                    <Check className="h-4 w-4 text-luxury-success" />
                                                                    Marcar completada
                                                                </button>
                                                                <button
                                                                    onClick={() => handleStatusChange(apt.id, "no_show")}
                                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-white/5"
                                                                >
                                                                    <X className="h-4 w-4 text-orange-400" />
                                                                    No asistió
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCancel(apt.id)}
                                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-white/5 text-luxury-danger"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                    Cancelar
                                                                </button>
                                                            </>
                                                        )}
                                                        {status === "cancelled" && apt.cancellation_reason && (
                                                            <div className="px-3 py-2 text-xs text-text-muted">
                                                                Razón: {apt.cancellation_reason}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
