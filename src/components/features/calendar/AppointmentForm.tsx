"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { X, Calendar, Clock, User, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TimeSlotPicker } from "./TimeSlotPicker"
import { createAppointment, updateAppointment, getAvailableSlots } from "@/lib/actions/appointments"
import type { AppointmentWithRelations } from "@/lib/actions/appointments"
import type { Tables } from "@/types/database"
import { cn } from "@/lib/utils"

type Patient = Tables<"patients">
type Service = Tables<"services">

interface AppointmentFormProps {
    patients: Patient[]
    services: Service[]
    appointment?: AppointmentWithRelations | null
    initialDate?: Date
    onClose: () => void
    onSuccess?: () => void
}

export function AppointmentForm({
    patients,
    services,
    appointment,
    initialDate,
    onClose,
    onSuccess
}: AppointmentFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [patientId, setPatientId] = useState(appointment?.patient_id || "")
    const [serviceId, setServiceId] = useState(appointment?.service_id || "")
    const [selectedDate, setSelectedDate] = useState<string>(
        initialDate
            ? initialDate.toISOString().split("T")[0]
            : appointment
                ? new Date(appointment.start_time).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0]
    )
    const [selectedTime, setSelectedTime] = useState<string>(
        appointment?.start_time || ""
    )
    const [notes, setNotes] = useState(appointment?.notes || "")
    const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([])
    const [loadingSlots, setLoadingSlots] = useState(false)

    // Get selected service duration
    const selectedService = services.find(s => s.id === serviceId)
    const duration = selectedService?.duration_minutes || 30

    // Fetch available slots when date changes
    useEffect(() => {
        async function fetchSlots() {
            if (!selectedDate) return

            setLoadingSlots(true)
            try {
                const result = await getAvailableSlots(selectedDate, duration)
                if (result.success) {
                    setAvailableSlots(result.data)
                }
            } catch (err) {
                console.error("Error fetching slots:", err)
            } finally {
                setLoadingSlots(false)
            }
        }

        fetchSlots()
    }, [selectedDate, duration])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!patientId) {
            setError("Selecciona un paciente")
            return
        }

        if (!selectedTime) {
            setError("Selecciona un horario")
            return
        }

        const startTime = new Date(selectedTime)
        const endTime = new Date(startTime.getTime() + duration * 60000)

        const data = {
            patient_id: patientId,
            service_id: serviceId || undefined,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            notes: notes || undefined
        }

        startTransition(async () => {
            try {
                const result = appointment
                    ? await updateAppointment(appointment.id, data)
                    : await createAppointment(data)

                if (!result.success) {
                    setError(result.error)
                    return
                }

                router.refresh()
                onSuccess?.()
                onClose()
            } catch {
                setError("Ocurrió un error inesperado")
            }
        })
    }

    const isEditing = !!appointment

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-luxury-dark rounded-xl border border-white/10 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-text-primary">
                        {isEditing ? "Editar Cita" : "Nueva Cita"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X className="h-5 w-5 text-text-muted" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 rounded-lg bg-luxury-danger/20 border border-luxury-danger/50 text-luxury-danger text-sm">
                            {error}
                        </div>
                    )}

                    {/* Patient Select */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                            <User className="h-4 w-4" />
                            Paciente
                        </label>
                        <select
                            value={patientId}
                            onChange={(e) => setPatientId(e.target.value)}
                            className={cn(
                                "w-full h-11 px-3 rounded-lg border border-white/10 bg-luxury-card/50",
                                "text-text-primary focus:outline-none focus:ring-1 focus:ring-luxury-gold",
                                "appearance-none cursor-pointer"
                            )}
                            required
                        >
                            <option value="">Seleccionar paciente...</option>
                            {patients.map(patient => (
                                <option key={patient.id} value={patient.id}>
                                    {patient.full_name} - {patient.whatsapp_number}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Service Select */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                            <FileText className="h-4 w-4" />
                            Servicio (opcional)
                        </label>
                        <select
                            value={serviceId}
                            onChange={(e) => setServiceId(e.target.value)}
                            className={cn(
                                "w-full h-11 px-3 rounded-lg border border-white/10 bg-luxury-card/50",
                                "text-text-primary focus:outline-none focus:ring-1 focus:ring-luxury-gold",
                                "appearance-none cursor-pointer"
                            )}
                        >
                            <option value="">Sin servicio específico</option>
                            {services.filter(s => s.is_active).map(service => (
                                <option key={service.id} value={service.id}>
                                    {service.title} - ${service.price.toLocaleString()} ({service.duration_minutes} min)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Picker */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                            <Calendar className="h-4 w-4" />
                            Fecha
                        </label>
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value)
                                setSelectedTime("") // Reset time when date changes
                            }}
                            min={new Date().toISOString().split("T")[0]}
                            required
                        />
                    </div>

                    {/* Time Slot Picker */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                            <Clock className="h-4 w-4" />
                            Horario
                        </label>
                        {loadingSlots ? (
                            <div className="h-32 flex items-center justify-center">
                                <div className="animate-pulse text-text-muted">
                                    Cargando horarios...
                                </div>
                            </div>
                        ) : (
                            <TimeSlotPicker
                                slots={availableSlots}
                                selectedTime={selectedTime}
                                onSelect={setSelectedTime}
                                disabled={isPending}
                            />
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">
                            Notas (opcional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Notas adicionales..."
                            className={cn(
                                "w-full px-3 py-2 rounded-lg border border-white/10 bg-luxury-card/50",
                                "text-text-primary placeholder:text-text-muted resize-none",
                                "focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                            )}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={onClose}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={isPending || !patientId || !selectedTime}
                        >
                            {isPending
                                ? "Guardando..."
                                : isEditing
                                    ? "Guardar Cambios"
                                    : "Crear Cita"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
