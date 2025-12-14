/**
 * AI Tools Definitions
 * 
 * These are the functions "Luxe" can call to interact with the clinic's systems.
 * Each tool has a schema (for the AI) and an execute function (for the backend).
 */

import { createClient } from "@supabase/supabase-js"
import { addMinutes, format, parse, isAfter, isBefore, startOfDay, endOfDay } from "date-fns"
import { toZonedTime, fromZonedTime } from "date-fns-tz"
import type { Database } from "@/types/database"
import type { Contact, ClinicConfig } from "./types"
import type { ToolDefinition } from "./deepseek"

// Supabase admin client for AI operations
function getAdminClient() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

const TIMEZONE = "America/Bogota"



// ============================================================================
// Tool Schemas (for DeepSeek)
// ============================================================================

export const TOOL_DEFINITIONS: ToolDefinition[] = [
    {
        type: "function",
        function: {
            name: "get_available_slots",
            description: "Get available appointment slots for a specific date. Returns available 30-minute time slots.",
            parameters: {
                type: "object",
                properties: {
                    date: {
                        type: "string",
                        description: "Date to check in YYYY-MM-DD format"
                    }
                },
                required: ["date"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "book_appointment",
            description: "Book a new appointment. IMPORTANT: You must know the patient's name before calling this.",
            parameters: {
                type: "object",
                properties: {
                    date: {
                        type: "string",
                        description: "Appointment date in YYYY-MM-DD format"
                    },
                    time: {
                        type: "string",
                        description: "Appointment time in HH:MM format (24-hour)"
                    },
                    service_name: {
                        type: "string",
                        description: "Name of the service (e.g., 'Limpieza dental', 'Blanqueamiento')"
                    },
                    notes: {
                        type: "string",
                        description: "Optional notes about the appointment"
                    }
                },
                required: ["date", "time", "service_name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "cancel_appointment",
            description: "Cancel an existing appointment.",
            parameters: {
                type: "object",
                properties: {
                    appointment_id: {
                        type: "string",
                        description: "The ID of the appointment to cancel"
                    },
                    reason: {
                        type: "string",
                        description: "Reason for cancellation"
                    }
                },
                required: ["appointment_id", "reason"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "reschedule_appointment",
            description: "Reschedule an existing appointment to a new date/time.",
            parameters: {
                type: "object",
                properties: {
                    appointment_id: {
                        type: "string",
                        description: "The ID of the appointment to reschedule"
                    },
                    new_date: {
                        type: "string",
                        description: "New date in YYYY-MM-DD format"
                    },
                    new_time: {
                        type: "string",
                        description: "New time in HH:MM format (24-hour)"
                    }
                },
                required: ["appointment_id", "new_date", "new_time"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_name",
            description: "Save or update the patient's name. Use this when they provide their name.",
            parameters: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        description: "The patient's full name"
                    }
                },
                required: ["name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "request_human",
            description: "Request handoff to a human agent for emergencies or complex situations.",
            parameters: {
                type: "object",
                properties: {
                    reason: {
                        type: "string",
                        description: "Why human assistance is needed"
                    }
                },
                required: ["reason"]
            }
        }
    }
]

// ============================================================================
// Tool Execution Functions
// ============================================================================

export interface ToolResult {
    success: boolean
    message: string
    data?: unknown
}

type ToolContext = {
    contact: Contact
    organizationId: string
    clinicConfig: ClinicConfig
}

/**
 * Execute a tool by name with given arguments
 */
export async function executeTool(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolContext
): Promise<ToolResult> {
    switch (toolName) {
        case "get_available_slots":
            return getAvailableSlots(args.date as string, context)
        case "book_appointment":
            return bookAppointment(args as { date: string; time: string; service_name: string; notes?: string }, context)
        case "cancel_appointment":
            return cancelAppointment(args as { appointment_id: string; reason: string }, context)
        case "reschedule_appointment":
            return rescheduleAppointment(args as { appointment_id: string; new_date: string; new_time: string }, context)
        case "update_name":
            return updateName(args.name as string, context)
        case "request_human":
            return requestHuman(args.reason as string, context)
        default:
            return { success: false, message: `Unknown tool: ${toolName}` }
    }
}

// ============================================================================
// Individual Tool Implementations
// ============================================================================

async function getAvailableSlots(date: string, ctx: ToolContext): Promise<ToolResult> {
    const supabase = getAdminClient()
    const parsedDate = parseDate(date)

    if (!parsedDate) {
        return { success: false, message: "No pude entender la fecha. Usa formato AAAA-MM-DD." }
    }

    const now = toZonedTime(new Date(), TIMEZONE)
    if (isBefore(parsedDate, startOfDay(now))) {
        return { success: false, message: "No se pueden agendar citas en fechas pasadas." }
    }

    const dayOfWeek = parsedDate.getDay()
    const schedule = ctx.clinicConfig.businessHours.find(h => h.dayOfWeek === dayOfWeek)

    if (!schedule || schedule.isClosed) {
        return { success: false, message: "El consultorio está cerrado este día." }
    }

    // Get existing appointments
    const dayStart = fromZonedTime(startOfDay(parsedDate), TIMEZONE)
    const dayEnd = fromZonedTime(endOfDay(parsedDate), TIMEZONE)

    const { data: appointments } = await supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("organization_id", ctx.organizationId)
        .gte("start_time", dayStart.toISOString())
        .lte("start_time", dayEnd.toISOString())
        .neq("status", "cancelled")

    // Generate all 30-min slots
    const allSlots: string[] = []
    let currentTime = parse(schedule.openTime, "HH:mm", parsedDate)
    const closeTime = parse(schedule.closeTime, "HH:mm", parsedDate)

    while (isBefore(addMinutes(currentTime, 30), closeTime) ||
        format(addMinutes(currentTime, 30), "HH:mm") === schedule.closeTime) {
        allSlots.push(format(currentTime, "HH:mm"))
        currentTime = addMinutes(currentTime, 30)
    }

    // Filter out occupied slots
    const occupiedSlots = new Set<string>()
    for (const apt of appointments || []) {
        const aptStart = toZonedTime(new Date(apt.start_time), TIMEZONE)
        const aptEnd = toZonedTime(new Date(apt.end_time), TIMEZONE)

        for (const slot of allSlots) {
            const slotTime = parse(slot, "HH:mm", parsedDate)
            const slotEnd = addMinutes(slotTime, 30)

            if (!(isAfter(slotTime, aptEnd) || isBefore(slotEnd, aptStart))) {
                occupiedSlots.add(slot)
            }
        }
    }

    let availableSlots = allSlots.filter(slot => !occupiedSlots.has(slot))

    // Filter past slots if today
    if (format(parsedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")) {
        const nowTime = format(now, "HH:mm")
        availableSlots = availableSlots.filter(slot => slot > nowTime)
    }

    return {
        success: true,
        message: `Horarios disponibles para el ${date}: ${availableSlots.join(", ") || "No hay horarios disponibles"}`,
        data: { slots: availableSlots }
    }
}

async function bookAppointment(
    args: { date: string; time: string; service_name: string; notes?: string },
    ctx: ToolContext
): Promise<ToolResult> {
    if (!ctx.contact.name) {
        return { success: false, message: "Antes de agendar, necesito saber tu nombre. ¿Cómo te llamas?" }
    }

    const supabase = getAdminClient()
    const parsedDate = parseDate(args.date)
    const parsedTime = parseTime(args.time)

    if (!parsedDate || !parsedTime) {
        return { success: false, message: "No pude entender la fecha u hora." }
    }

    // Find service
    const { data: services } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", ctx.organizationId)
        .eq("is_active", true)

    if (!services?.length) {
        return { success: false, message: "No hay servicios disponibles." }
    }

    const serviceLower = args.service_name.toLowerCase()
    const service = services.find(s =>
        s.title.toLowerCase().includes(serviceLower) || serviceLower.includes(s.title.toLowerCase())
    ) || services[0]

    // Build datetime
    const [hours, minutes] = parsedTime.split(":").map(Number)
    const appointmentDate = new Date(parsedDate)
    appointmentDate.setHours(hours, minutes, 0, 0)

    const startTime = fromZonedTime(appointmentDate, TIMEZONE)
    const endTime = addMinutes(startTime, service.duration_minutes)

    // Validate business hours
    const dayOfWeek = parsedDate.getDay()
    const schedule = ctx.clinicConfig.businessHours.find(h => h.dayOfWeek === dayOfWeek)

    if (!schedule || schedule.isClosed) {
        return { success: false, message: "El consultorio está cerrado ese día." }
    }

    const timeStr = format(toZonedTime(startTime, TIMEZONE), "HH:mm")
    const endTimeStr = format(toZonedTime(endTime, TIMEZONE), "HH:mm")

    if (timeStr < schedule.openTime || endTimeStr > schedule.closeTime) {
        return { success: false, message: `El horario de atención es de ${toAMPM(schedule.openTime)} a ${toAMPM(schedule.closeTime)}.` }
    }

    // Check conflicts
    const { data: conflicts } = await supabase
        .from("appointments")
        .select("id")
        .eq("organization_id", ctx.organizationId)
        .neq("status", "cancelled")
        .lt("start_time", endTime.toISOString())
        .gt("end_time", startTime.toISOString())

    if (conflicts?.length) {
        return { success: false, message: "Ese horario ya está ocupado. ¿Te busco otro?" }
    }

    // Ensure patient exists
    let patientId = ctx.contact.type === "patient" ? ctx.contact.id : null

    if (ctx.contact.type === "lead") {
        const { data: newPatient, error } = await supabase
            .from("patients")
            .insert({
                organization_id: ctx.organizationId,
                full_name: ctx.contact.name,
                whatsapp_number: ctx.contact.phone,
            })
            .select()
            .single()

        if (error) {
            return { success: false, message: "Error al crear registro del paciente." }
        }

        patientId = newPatient.id
        await supabase.from("leads").delete().eq("id", ctx.contact.id)
    }

    // Create appointment
    const { data: appointment, error } = await supabase
        .from("appointments")
        .insert({
            organization_id: ctx.organizationId,
            patient_id: patientId,
            service_id: service.id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: "scheduled",
            notes: args.notes || null,
        })
        .select()
        .single()

    if (error) {
        return { success: false, message: "Error al crear la cita. Intenta de nuevo." }
    }

    const formattedDate = format(toZonedTime(startTime, TIMEZONE), "EEEE d 'de' MMMM")
    const formattedTime = format(toZonedTime(startTime, TIMEZONE), "h:mm a")

    return {
        success: true,
        message: `¡Listo! Tu cita para ${service.title} está agendada para el ${formattedDate} a las ${formattedTime}. Te enviaremos un recordatorio. ✨`,
        data: { appointmentId: appointment.id }
    }
}

async function cancelAppointment(
    args: { appointment_id: string; reason: string },
    ctx: ToolContext
): Promise<ToolResult> {
    const supabase = getAdminClient()

    const { data: apt } = await supabase
        .from("appointments")
        .select("*, patient:patients(whatsapp_number)")
        .eq("id", args.appointment_id)
        .eq("organization_id", ctx.organizationId)
        .single()

    if (!apt) {
        return { success: false, message: "No encontré esa cita." }
    }

    if (apt.patient?.whatsapp_number !== ctx.contact.phone) {
        return { success: false, message: "No tienes permiso para cancelar esta cita." }
    }

    if (apt.status === "cancelled") {
        return { success: false, message: "Esta cita ya fue cancelada." }
    }

    await supabase
        .from("appointments")
        .update({ status: "cancelled", cancellation_reason: args.reason })
        .eq("id", args.appointment_id)

    return {
        success: true,
        message: "Tu cita ha sido cancelada. ¿Te gustaría reagendar para otra fecha?"
    }
}

async function rescheduleAppointment(
    args: { appointment_id: string; new_date: string; new_time: string },
    ctx: ToolContext
): Promise<ToolResult> {
    const supabase = getAdminClient()

    const { data: apt } = await supabase
        .from("appointments")
        .select("*, patient:patients(whatsapp_number), service:services(duration_minutes, title)")
        .eq("id", args.appointment_id)
        .eq("organization_id", ctx.organizationId)
        .single()

    if (!apt) {
        return { success: false, message: "No encontré esa cita." }
    }

    if (apt.patient?.whatsapp_number !== ctx.contact.phone) {
        return { success: false, message: "No tienes permiso para modificar esta cita." }
    }

    if (apt.status === "cancelled" || apt.status === "completed") {
        return { success: false, message: "No se puede reagendar una cita cancelada o completada." }
    }

    const parsedDate = parseDate(args.new_date)
    const parsedTime = parseTime(args.new_time)

    if (!parsedDate || !parsedTime) {
        return { success: false, message: "No pude entender la nueva fecha u hora." }
    }

    const [hours, minutes] = parsedTime.split(":").map(Number)
    const newDateTime = new Date(parsedDate)
    newDateTime.setHours(hours, minutes, 0, 0)

    const duration = apt.service?.duration_minutes || 30
    const newStartTime = fromZonedTime(newDateTime, TIMEZONE)
    const newEndTime = addMinutes(newStartTime, duration)

    // Check conflicts
    const { data: conflicts } = await supabase
        .from("appointments")
        .select("id")
        .eq("organization_id", ctx.organizationId)
        .neq("id", args.appointment_id)
        .neq("status", "cancelled")
        .lt("start_time", newEndTime.toISOString())
        .gt("end_time", newStartTime.toISOString())

    if (conflicts?.length) {
        return { success: false, message: "El nuevo horario ya está ocupado." }
    }

    await supabase
        .from("appointments")
        .update({
            start_time: newStartTime.toISOString(),
            end_time: newEndTime.toISOString(),
        })
        .eq("id", args.appointment_id)

    const formattedDate = format(toZonedTime(newStartTime, TIMEZONE), "EEEE d 'de' MMMM")
    const formattedTime = format(toZonedTime(newStartTime, TIMEZONE), "h:mm a")

    return {
        success: true,
        message: `Tu cita ha sido reagendada para el ${formattedDate} a las ${formattedTime}. ✨`
    }
}

async function updateName(name: string, ctx: ToolContext): Promise<ToolResult> {
    const supabase = getAdminClient()

    // Normalize: capitalize each word
    const normalizedName = name.trim()
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")

    if (ctx.contact.type === "patient") {
        await supabase.from("patients").update({ full_name: normalizedName }).eq("id", ctx.contact.id)
    } else {
        await supabase.from("leads").update({ name: normalizedName }).eq("id", ctx.contact.id)
    }

    return {
        success: true,
        message: `¡Mucho gusto, ${normalizedName}! ¿En qué puedo ayudarte?`,
        data: { newName: normalizedName }
    }
}

async function requestHuman(reason: string, ctx: ToolContext): Promise<ToolResult> {
    console.log(`[HumanHandoff] Phone: ${ctx.contact.phone}, Reason: ${reason}`)

    return {
        success: true,
        message: "Un miembro de nuestro equipo se pondrá en contacto contigo pronto. Si es una emergencia médica, llama al consultorio o acude a urgencias."
    }
}

// ============================================================================
// Helpers
// ============================================================================

function parseDate(dateStr: string): Date | null {
    const formats = ["yyyy-MM-dd", "dd/MM/yyyy", "dd-MM-yyyy", "d/M/yyyy"]
    for (const fmt of formats) {
        try {
            const parsed = parse(dateStr, fmt, new Date())
            if (!isNaN(parsed.getTime())) return parsed
        } catch { continue }
    }
    return null
}


// ... existing helpers ...

function parseTime(timeStr: string): string | null {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null
    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

function toAMPM(time: string): string {
    const [h, m] = time.split(":").map(Number)
    const ampm = h >= 12 ? "PM" : "AM"
    const hour = h % 12 || 12
    return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`
}
