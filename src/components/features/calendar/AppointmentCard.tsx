"use client"

import type { AppointmentWithRelations } from "@/lib/actions/appointments"
import { cn } from "@/lib/utils"

interface AppointmentCardProps {
    appointment: AppointmentWithRelations
    onClick?: () => void
    compact?: boolean
}

const STATUS_COLORS = {
    scheduled: "bg-blue-500/20 border-blue-500/50 text-blue-300",
    confirmed: "bg-luxury-gold/20 border-luxury-gold/50 text-luxury-gold",
    completed: "bg-luxury-success/20 border-luxury-success/50 text-luxury-success",
    cancelled: "bg-luxury-danger/20 border-luxury-danger/50 text-luxury-danger line-through",
    no_show: "bg-orange-500/20 border-orange-500/50 text-orange-400",
} as const

const STATUS_LABELS = {
    scheduled: "Agendada",
    confirmed: "Confirmada",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No asistió",
} as const

export function AppointmentCard({ appointment, onClick, compact = false }: AppointmentCardProps) {
    const statusClass = STATUS_COLORS[appointment.status || "scheduled"]
    const statusLabel = STATUS_LABELS[appointment.status || "scheduled"]

    const startTime = new Date(appointment.start_time)
    const timeString = startTime.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    })

    if (compact) {
        return (
            <div
                className={cn(
                    "px-2 py-1 rounded text-xs font-medium cursor-pointer border transition-all hover:scale-[1.02]",
                    statusClass
                )}
                onClick={onClick}
            >
                {timeString} - {appointment.patient?.full_name || "Sin paciente"}
            </div>
        )
    }

    return (
        <div
            className={cn(
                "p-2 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg",
                statusClass
            )}
            onClick={onClick}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                        {appointment.patient?.full_name || "Sin paciente"}
                    </p>
                    {appointment.service && (
                        <p className="text-xs opacity-80 truncate">
                            {appointment.service.title}
                        </p>
                    )}
                </div>
                <span className="text-xs font-mono shrink-0">
                    {timeString}
                </span>
            </div>

            {!compact && (
                <div className="mt-1 flex items-center gap-1">
                    <span className="text-[10px] uppercase tracking-wider opacity-70">
                        {statusLabel}
                    </span>
                </div>
            )}
        </div>
    )
}
