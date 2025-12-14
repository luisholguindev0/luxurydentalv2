"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppointmentCard } from "./AppointmentCard"
import type { AppointmentWithRelations } from "@/lib/actions/appointments"
import { cn } from "@/lib/utils"

interface WeekCalendarProps {
    appointments: AppointmentWithRelations[]
    onSlotClick?: (date: Date, hour: number) => void
    onAppointmentClick?: (appointment: AppointmentWithRelations) => void
    onWeekChange?: (startDate: Date) => void
}

// Business hours
const START_HOUR = 8
const END_HOUR = 18

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + 1 // Monday
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
}

function getWeekDays(weekStart: Date): Date[] {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart)
        d.setDate(weekStart.getDate() + i)
        return d
    })
}

function formatDate(date: Date): string {
    return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" })
}

export function WeekCalendar({
    appointments,
    onSlotClick,
    onAppointmentClick,
    onWeekChange
}: WeekCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate])
    const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])

    const hours = useMemo(() =>
        Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i),
        []
    )

    // Group appointments by day and hour
    const appointmentsBySlot = useMemo(() => {
        const map = new Map<string, AppointmentWithRelations[]>()

        appointments.forEach(apt => {
            const start = new Date(apt.start_time)
            const dayIndex = start.getDay()
            const hour = start.getHours()
            const key = `${dayIndex}-${hour}`

            if (!map.has(key)) {
                map.set(key, [])
            }
            map.get(key)!.push(apt)
        })

        return map
    }, [appointments])

    const goToPrevWeek = () => {
        const newDate = new Date(currentDate)
        newDate.setDate(newDate.getDate() - 7)
        setCurrentDate(newDate)
        onWeekChange?.(getWeekStart(newDate))
    }

    const goToNextWeek = () => {
        const newDate = new Date(currentDate)
        newDate.setDate(newDate.getDate() + 7)
        setCurrentDate(newDate)
        onWeekChange?.(getWeekStart(newDate))
    }

    const goToToday = () => {
        const today = new Date()
        setCurrentDate(today)
        onWeekChange?.(getWeekStart(today))
    }

    const isToday = (date: Date): boolean => {
        const today = new Date()
        return date.toDateString() === today.toDateString()
    }

    const isSunday = (dayIndex: number): boolean => dayIndex === 0

    return (
        <div className="flex flex-col h-full bg-luxury-darker rounded-xl overflow-hidden border border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={goToPrevWeek}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={goToNextWeek}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={goToToday}>
                        Hoy
                    </Button>
                </div>

                <h2 className="text-lg font-semibold text-text-primary">
                    {weekStart.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
                </h2>

                <div className="w-[140px]" /> {/* Spacer for balance */}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[800px]">
                    {/* Header Row */}
                    <div className="sticky top-0 z-10 bg-luxury-dark border-b border-white/10" />
                    {weekDays.map((day, i) => (
                        <div
                            key={i}
                            className={cn(
                                "sticky top-0 z-10 bg-luxury-dark p-3 text-center border-b border-l border-white/10",
                                isToday(day) && "bg-luxury-gold/10",
                                isSunday(i) && "opacity-50"
                            )}
                        >
                            <div className="text-xs text-text-muted uppercase">
                                {DAYS[(i + 1) % 7]}
                            </div>
                            <div className={cn(
                                "text-lg font-medium",
                                isToday(day) ? "text-luxury-gold" : "text-text-primary"
                            )}>
                                {day.getDate()}
                            </div>
                            <div className="text-xs text-text-muted">
                                {formatDate(day)}
                            </div>
                        </div>
                    ))}

                    {/* Time Slots */}
                    {hours.map(hour => (
                        <>
                            {/* Hour Label */}
                            <div
                                key={`hour-${hour}`}
                                className="p-2 text-right text-xs text-text-muted border-b border-white/5"
                            >
                                {hour.toString().padStart(2, "0")}:00
                            </div>

                            {/* Day Slots */}
                            {weekDays.map((day, dayIndex) => {
                                const actualDayIndex = (dayIndex + 1) % 7
                                const slotKey = `${actualDayIndex}-${hour}`
                                const slotAppointments = appointmentsBySlot.get(slotKey) || []
                                const closed = isSunday(actualDayIndex) || (actualDayIndex === 6 && hour >= 14)

                                return (
                                    <div
                                        key={`${dayIndex}-${hour}`}
                                        className={cn(
                                            "min-h-[60px] p-1 border-b border-l border-white/5 transition-colors",
                                            closed
                                                ? "bg-luxury-darker/50 cursor-not-allowed"
                                                : "hover:bg-luxury-card/30 cursor-pointer"
                                        )}
                                        onClick={() => {
                                            if (!closed && onSlotClick) {
                                                const slotDate = new Date(day)
                                                slotDate.setHours(hour, 0, 0, 0)
                                                onSlotClick(slotDate, hour)
                                            }
                                        }}
                                    >
                                        {slotAppointments.map(apt => (
                                            <AppointmentCard
                                                key={apt.id}
                                                appointment={apt}
                                                onClick={() => onAppointmentClick?.(apt)}
                                            />
                                        ))}

                                        {!closed && slotAppointments.length === 0 && (
                                            <div className="h-full flex items-center justify-center opacity-0 hover:opacity-50 transition-opacity">
                                                <Plus className="h-4 w-4 text-text-muted" />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </>
                    ))}
                </div>
            </div>
        </div>
    )
}
