import { z } from "zod"

// Patient Schemas
export const patientCreateSchema = z.object({
    full_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    whatsapp_number: z.string().min(10, "Número de WhatsApp inválido"),
    address: z.string().optional(),
    notes: z.string().optional(),
})

export const patientUpdateSchema = patientCreateSchema.partial()

export type PatientCreateInput = z.infer<typeof patientCreateSchema>
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>

// Service Schemas
export const serviceCreateSchema = z.object({
    title: z.string().min(2, "El título debe tener al menos 2 caracteres"),
    description: z.string().optional(),
    price: z.number().positive("El precio debe ser mayor a 0"),
    duration_minutes: z.number().int().min(15, "La duración mínima es 15 minutos"),
    is_active: z.boolean().default(true),
})

export const serviceUpdateSchema = serviceCreateSchema.partial()

export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>

// Appointment Schemas
export const appointmentCreateSchema = z.object({
    patient_id: z.string().uuid("ID de paciente inválido"),
    service_id: z.string().uuid("ID de servicio inválido").optional(),
    start_time: z.string().datetime("Fecha de inicio inválida"),
    end_time: z.string().datetime("Fecha de fin inválida"),
    notes: z.string().optional(),
})

export const appointmentUpdateSchema = appointmentCreateSchema.partial().extend({
    status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]).optional(),
    cancellation_reason: z.string().optional(),
})

export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>

// Lead Schemas
export const leadCreateSchema = z.object({
    phone: z.string().min(10, "Número de teléfono inválido"),
    name: z.string().optional(),
    source: z.enum(["whatsapp", "website", "referral", "walk_in", "other"]).default("whatsapp"),
})

export const leadUpdateSchema = leadCreateSchema.partial().extend({
    status: z.enum(["new", "contacted", "converted", "lost"]).optional(),
})

export type LeadCreateInput = z.infer<typeof leadCreateSchema>
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>

// Transaction Schemas
export const transactionCreateSchema = z.object({
    type: z.enum(["income", "expense", "payment", "charge"], {
        error: "Tipo de transacción inválido",
    }),
    amount: z.number().positive("El monto debe ser mayor a 0"),
    description: z.string().min(1, "La descripción es requerida"),
    patient_id: z.string().uuid("ID de paciente inválido").optional().nullable(),
    appointment_id: z.string().uuid("ID de cita inválido").optional().nullable(),
})

export const transactionUpdateSchema = transactionCreateSchema.partial()

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>
