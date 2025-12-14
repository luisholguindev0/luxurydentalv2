"use client"

import { useState, useCallback } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WeekCalendar, AppointmentForm } from "@/components/features/calendar"
import { getAppointments } from "@/lib/actions/appointments"
import type { AppointmentWithRelations } from "@/lib/actions/appointments"
import type { Tables } from "@/types/database"

type Patient = Tables<"patients">
type Service = Tables<"services">

interface AppointmentsPageClientProps {
    initialPatients: Patient[]
    initialServices: Service[]
    initialAppointments: AppointmentWithRelations[]
}

export function AppointmentsPageClient({
    initialPatients,
    initialServices,
    initialAppointments
}: AppointmentsPageClientProps) {
    const [appointments, setAppointments] = useState(initialAppointments)
    const [showForm, setShowForm] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null)

    const handleSlotClick = (date: Date) => {
        setSelectedDate(date)
        setSelectedAppointment(null)
        setShowForm(true)
    }

    const handleAppointmentClick = (appointment: AppointmentWithRelations) => {
        setSelectedAppointment(appointment)
        setSelectedDate(null)
        setShowForm(true)
    }

    const handleWeekChange = useCallback(async (weekStart: Date) => {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)

        const result = await getAppointments(
            weekStart.toISOString(),
            weekEnd.toISOString()
        )

        if (result.success) {
            setAppointments(result.data)
        }
    }, [])

    const handleFormClose = () => {
        setShowForm(false)
        setSelectedDate(null)
        setSelectedAppointment(null)
    }

    const handleFormSuccess = async () => {
        // Refresh current week
        const today = new Date()
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay() + 1)
        weekStart.setHours(0, 0, 0, 0)

        await handleWeekChange(weekStart)
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div>
                    <h1 className="text-xl font-semibold text-text-primary">
                        Calendario de Citas
                    </h1>
                    <p className="text-sm text-text-muted">
                        Gestiona las citas de tus pacientes
                    </p>
                </div>

                <Button onClick={() => {
                    setSelectedDate(new Date())
                    setSelectedAppointment(null)
                    setShowForm(true)
                }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Cita
                </Button>
            </header>

            {/* Calendar */}
            <div className="flex-1 p-6 overflow-hidden">
                <WeekCalendar
                    appointments={appointments}
                    onSlotClick={handleSlotClick}
                    onAppointmentClick={handleAppointmentClick}
                    onWeekChange={handleWeekChange}
                />
            </div>

            {/* Appointment Form Modal */}
            {showForm && (
                <AppointmentForm
                    patients={initialPatients}
                    services={initialServices}
                    appointment={selectedAppointment}
                    initialDate={selectedDate || undefined}
                    onClose={handleFormClose}
                    onSuccess={handleFormSuccess}
                />
            )}
        </div>
    )
}
