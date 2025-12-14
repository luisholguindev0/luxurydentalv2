/**
 * AI Brain - The Core Logic of "Luxe"
 * 
 * Direct API calls to DeepSeek with tool calling support.
 * No magic, no abstractions - just fetch and JSON.
 */

import { chatCompletion, type ChatMessage } from "./deepseek"
import { TOOL_DEFINITIONS, executeTool, type ToolResult } from "./tools"
import type { ConversationContext } from "./types"

// Human handoff keywords
const HANDOFF_KEYWORDS = [
    "emergencia", "dolor intenso", "hablar con humano",
    "agente humano", "persona real", "ayuda urgente",
    "sangrado", "accidente",
]

const MAX_TOOL_ITERATIONS = 5

/**
 * Build the system prompt for Luxe
 */
export function buildSystemPrompt(context: ConversationContext): string {
    const { contact, appointments, services, lastCancellation, clinicConfig } = context

    const appointmentsSection = appointments.length > 0
        ? `[MIS CITAS CONFIRMADAS]\n${appointments.map(apt =>
            `- ${apt.date} a las ${apt.time}: ${apt.serviceName} (${apt.status}) [ID: ${apt.id}]`
        ).join("\n")}`
        : "[MIS CITAS CONFIRMADAS]\nNo tienes citas programadas."

    const cancellationSection = lastCancellation
        ? `\n[ÚLTIMA CANCELACIÓN]\nFecha: ${lastCancellation.date}\nRazón: ${lastCancellation.reason || "No especificada"}`
        : ""

    const servicesSection = services.length > 0
        ? `[SERVICIOS]\n${services.map(s =>
            `- ${s.title}: $${s.price.toLocaleString("es-CO")} COP (${s.duration} min)`
        ).join("\n")}`
        : ""

    // Format business hours
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    const hoursSection = clinicConfig.businessHours.map(h => {
        const dayName = days[h.dayOfWeek]
        return `- ${dayName}: ${h.isClosed ? "CERRADO" : `${toAMPM(h.openTime)} - ${toAMPM(h.closeTime)}`}`
    }).join("\n")

    return `# Identidad
Eres **Luxe**, asistente virtual de **${clinicConfig.name}**, consultorio odontológico premium.

# Consultorio
- Dirección: ${clinicConfig.address}
- Teléfono: ${clinicConfig.phone}

# Horarios
${hoursSection}

${servicesSection}

# Paciente Actual
- Nombre: ${contact.name || "No proporcionado"}
- Teléfono: ${contact.phone}
- Tipo: ${contact.type === "patient" ? "Registrado" : "Nuevo"}

${appointmentsSection}
${cancellationSection}

# Reglas

## Identidad Primero
**NUNCA** agendas sin conocer el nombre. Si no lo tienes, pregúntalo primero.

## Herramientas
- get_available_slots: Ver horarios disponibles (automáticamente convierte fechas relativas como "mañana" a fechas reales)
- book_appointment: Agendar cita
- cancel_appointment: Cancelar cita
- reschedule_appointment: Reagendar
- update_name: Guardar nombre del paciente
- request_human: Pedir ayuda humana

## Seguridad
- NUNCA des consejos médicos.
- Si hay emergencia → request_human
- Si frustración → ofrece humano

## Estilo
- Español colombiano natural
- Conciso pero amable
- Emojis moderados (✨🦷📅)
- Confirma antes de ejecutar
`
}

function toAMPM(time: string): string {
    const [h, m] = time.split(":").map(Number)
    const ampm = h >= 12 ? "PM" : "AM"
    const hour = h % 12 || 12
    return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`
}

/**
 * Check if message needs human handoff
 */
function requiresHumanHandoff(message: string): boolean {
    const lower = message.toLowerCase()
    return HANDOFF_KEYWORDS.some(k => lower.includes(k))
}

/**
 * Process a message through the AI brain
 */
export async function processMessage(
    userMessage: string,
    context: ConversationContext
): Promise<{ text: string; toolCalls?: Array<{ name: string; result: ToolResult }> }> {
    // Check for emergency keywords first
    if (requiresHumanHandoff(userMessage)) {
        return {
            text: "Entiendo que esta situación requiere atención especial. Un miembro de nuestro equipo te contactará pronto. Si es emergencia médica, llama al consultorio o acude a urgencias. 🏥",
            toolCalls: [{ name: "request_human", result: { success: true, message: "Handoff triggered" } }],
        }
    }

    const systemPrompt = buildSystemPrompt(context)

    // Build message history
    const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...context.messages.slice(-10).map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        })),
        { role: "user", content: userMessage },
    ]

    const toolCalls: Array<{ name: string; result: ToolResult }> = []
    const toolContext = {
        contact: context.contact,
        organizationId: context.contact.organizationId,
        clinicConfig: context.clinicConfig
    }

    try {
        // Agentic loop - keep calling until no more tool calls
        for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
            const response = await chatCompletion({
                model: "deepseek-chat",
                messages,
                tools: TOOL_DEFINITIONS,
                tool_choice: "auto",
            })

            const choice = response.choices[0]
            const assistantMessage = choice.message

            // If there are tool calls, execute them
            if (assistantMessage.tool_calls?.length) {
                // Add assistant message with tool calls
                messages.push(assistantMessage)

                // Execute each tool call
                for (const toolCall of assistantMessage.tool_calls) {
                    const args = JSON.parse(toolCall.function.arguments)
                    console.log(`[AIBrain] Tool call: ${toolCall.function.name}`, args)

                    const result = await executeTool(toolCall.function.name, args, toolContext)
                    toolCalls.push({ name: toolCall.function.name, result })

                    // Add tool result to messages
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result),
                    })

                    // If name was updated, update context for next iteration
                    if (toolCall.function.name === "update_name" && result.success && result.data) {
                        context.contact.name = (result.data as { newName: string }).newName
                    }
                }

                // Continue loop to get next response
                continue
            }

            // No tool calls - return the text response
            return {
                text: assistantMessage.content || "¿En qué puedo ayudarte?",
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            }
        }

        // Max iterations reached
        return {
            text: "Disculpa, tuve un problema procesando tu solicitud. ¿Podrías intentar de nuevo?",
            toolCalls,
        }

    } catch (error) {
        console.error("[AIBrain] Error:", error)
        return {
            text: "Disculpa, estoy teniendo dificultades técnicas. ¿Podrías intentar de nuevo? Si el problema persiste, un humano te atenderá pronto.",
        }
    }
}
