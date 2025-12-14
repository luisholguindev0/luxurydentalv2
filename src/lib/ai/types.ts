/**
 * AI Brain Type Definitions
 * 
 * Types used across the AI system for conversations, tools, and context.
 */


// Contact type - either a patient or a lead
export type ContactType = "patient" | "lead"

export interface Contact {
    type: ContactType
    id: string
    phone: string
    name: string | null
    organizationId: string
    // Patient-specific fields
    aiNotes?: string | null
    aiTags?: string[] | null
}

// Message format for AI context
export interface AIMessage {
    role: "user" | "assistant" | "system"
    content: string
    timestamp?: Date
}

// Conversation context passed to AI
export interface ConversationContext {
    contact: Contact
    messages: AIMessage[]
    appointments: AppointmentContext[]
    services: ServiceInfo[]
    clinicConfig: ClinicConfig
    lastCancellation?: {
        date: string
        reason: string | null
    }
}

// Appointment info for context injection
export interface AppointmentContext {
    id: string
    date: string           // ISO date
    time: string           // HH:MM
    serviceName: string
    status: string
    duration: number       // minutes
}

// Service catalog info
export interface ServiceInfo {
    id: string
    title: string
    price: number
    duration: number       // minutes
    description?: string | null
}

// Tool call result
export interface ToolResult {
    success: boolean
    message: string
    data?: unknown
}

// AI response after processing
export interface AIResponse {
    text: string
    toolCalls?: ToolCallInfo[]
    thought?: string       // Chain of Thought reasoning
}

export interface ToolCallInfo {
    name: string
    args: Record<string, unknown>
    result: ToolResult
}

// Parsed patient/lead from WhatsApp
export interface ParsedContact {
    phone: string
    profileName?: string
}

// Business hours configuration
export interface BusinessHours {
    dayOfWeek: number      // 0 = Sunday, 1 = Monday, etc.
    openTime: string       // HH:MM
    closeTime: string      // HH:MM
    isClosed: boolean
}

// Clinic configuration (from organization settings)
export interface ClinicConfig {
    name: string
    address: string
    phone: string
    businessHours: BusinessHours[]
    timezone: string       // e.g., "America/Bogota"
}

// Default business hours for Luxury Dental
export const DEFAULT_BUSINESS_HOURS: BusinessHours[] = [
    { dayOfWeek: 0, openTime: "00:00", closeTime: "00:00", isClosed: true },  // Sunday - CLOSED
    { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isClosed: false }, // Monday
    { dayOfWeek: 2, openTime: "08:00", closeTime: "18:00", isClosed: false }, // Tuesday
    { dayOfWeek: 3, openTime: "08:00", closeTime: "18:00", isClosed: false }, // Wednesday
    { dayOfWeek: 4, openTime: "08:00", closeTime: "18:00", isClosed: false }, // Thursday
    { dayOfWeek: 5, openTime: "08:00", closeTime: "18:00", isClosed: false }, // Friday
    { dayOfWeek: 6, openTime: "08:00", closeTime: "14:00", isClosed: false }, // Saturday
]

export const DEFAULT_CLINIC_CONFIG: ClinicConfig = {
    name: "Luxury Dental",
    address: "Carrera 7 #82-86, Bogotá, Colombia",
    phone: "+57 601 555 0123",
    businessHours: DEFAULT_BUSINESS_HOURS,
    timezone: "America/Bogota",
}

// Human handoff keywords (in Spanish)
export const HUMAN_HANDOFF_KEYWORDS = [
    "emergencia",
    "dolor intenso",
    "hablar con humano",
    "agente humano",
    "persona real",
    "ayuda urgente",
    "sangrado",
    "accidente",
] as const
