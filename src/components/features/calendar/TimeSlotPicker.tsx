"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface TimeSlot {
    time: string
    available: boolean
}

interface TimeSlotPickerProps {
    slots: TimeSlot[]
    selectedTime?: string
    onSelect: (time: string) => void
    disabled?: boolean
}

export function TimeSlotPicker({
    slots,
    selectedTime,
    onSelect,
    disabled = false
}: TimeSlotPickerProps) {
    const groupedSlots = useMemo(() => {
        const morning: TimeSlot[] = []
        const afternoon: TimeSlot[] = []

        slots.forEach(slot => {
            const hour = new Date(slot.time).getHours()
            if (hour < 12) {
                morning.push(slot)
            } else {
                afternoon.push(slot)
            }
        })

        return { morning, afternoon }
    }, [slots])

    const formatTime = (isoTime: string): string => {
        return new Date(isoTime).toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        })
    }

    if (slots.length === 0) {
        return (
            <div className="p-4 text-center text-text-muted">
                No hay horarios disponibles para este día
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {groupedSlots.morning.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-2">
                        Mañana
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                        {groupedSlots.morning.map(slot => (
                            <button
                                key={slot.time}
                                type="button"
                                disabled={!slot.available || disabled}
                                onClick={() => slot.available && onSelect(slot.time)}
                                className={cn(
                                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                    "border focus:outline-none focus:ring-2 focus:ring-luxury-gold/50",
                                    selectedTime === slot.time
                                        ? "bg-luxury-gold text-luxury-dark border-luxury-gold"
                                        : slot.available
                                            ? "bg-luxury-card/50 border-white/10 text-text-primary hover:border-luxury-gold/50 hover:bg-luxury-card"
                                            : "bg-luxury-darker/50 border-white/5 text-text-muted cursor-not-allowed opacity-50"
                                )}
                            >
                                {formatTime(slot.time)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {groupedSlots.afternoon.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-2">
                        Tarde
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                        {groupedSlots.afternoon.map(slot => (
                            <button
                                key={slot.time}
                                type="button"
                                disabled={!slot.available || disabled}
                                onClick={() => slot.available && onSelect(slot.time)}
                                className={cn(
                                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                    "border focus:outline-none focus:ring-2 focus:ring-luxury-gold/50",
                                    selectedTime === slot.time
                                        ? "bg-luxury-gold text-luxury-dark border-luxury-gold"
                                        : slot.available
                                            ? "bg-luxury-card/50 border-white/10 text-text-primary hover:border-luxury-gold/50 hover:bg-luxury-card"
                                            : "bg-luxury-darker/50 border-white/5 text-text-muted cursor-not-allowed opacity-50"
                                )}
                            >
                                {formatTime(slot.time)}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
