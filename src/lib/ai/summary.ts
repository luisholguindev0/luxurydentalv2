/**
 * Conversation Summary System
 * 
 * Compresses old conversation history into summaries to manage context window.
 * This is critical for long-running patient relationships.
 */

import { chatCompletion } from "./deepseek"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { Contact, AIMessage } from "./types"

function getAdminClient() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// When to trigger summarization
const SUMMARY_THRESHOLD = 20 // messages before summarizing
const KEEP_RECENT = 5        // messages to keep unsummarized

export interface ConversationSummary {
    id: string
    contactId: string
    contactType: "patient" | "lead"
    summary: string
    keyFacts: string[]          // Extracted key information
    messageCount: number        // How many messages were summarized
    createdAt: Date
}

/**
 * Generate a summary of conversation messages
 */
export async function generateSummary(messages: AIMessage[]): Promise<{
    summary: string
    keyFacts: string[]
}> {
    if (messages.length === 0) {
        return { summary: "", keyFacts: [] }
    }

    const conversationText = messages
        .map(m => `${m.role === "user" ? "Paciente" : "Luxe"}: ${m.content}`)
        .join("\n")

    try {
        const response = await chatCompletion({
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content: `Eres un asistente que resume conversaciones de un consultorio dental.
Tu tarea es crear un resumen conciso y extraer hechos clave.

Responde SOLO con JSON válido en este formato:
{
  "summary": "Resumen de 2-3 oraciones de la conversación",
  "keyFacts": ["Hecho 1", "Hecho 2", "..."]
}

Los hechos clave deben incluir:
- Nombre del paciente (si se menciona)
- Servicios de interés
- Preferencias de horario
- Problemas dentales mencionados
- Citas agendadas o canceladas
- Cualquier información relevante para futuras interacciones`
                },
                {
                    role: "user",
                    content: `Resume esta conversación:\n\n${conversationText}`
                }
            ],
            temperature: 0.3,
            max_tokens: 500,
        })

        const content = response.choices[0]?.message?.content || "{}"

        // Parse JSON response
        try {
            const parsed = JSON.parse(content)
            return {
                summary: parsed.summary || "",
                keyFacts: Array.isArray(parsed.keyFacts) ? parsed.keyFacts : [],
            }
        } catch {
            // If JSON parsing fails, use the raw text as summary
            return {
                summary: content.slice(0, 500),
                keyFacts: [],
            }
        }
    } catch (error) {
        console.error("[Summary] Failed to generate:", error)
        return { summary: "", keyFacts: [] }
    }
}

/**
 * Check if a contact's conversation needs summarization
 */
export async function shouldSummarize(contact: Contact): Promise<boolean> {
    const supabase = getAdminClient()

    const query = supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", contact.organizationId)

    if (contact.type === "patient") {
        query.eq("patient_id", contact.id)
    } else {
        query.eq("lead_id", contact.id)
    }

    const { count } = await query

    return (count || 0) > SUMMARY_THRESHOLD
}

/**
 * Summarize and archive old messages for a contact
 */
export async function summarizeConversation(contact: Contact): Promise<void> {
    const supabase = getAdminClient()

    // Get all messages for this contact
    const query = supabase
        .from("messages")
        .select("*")
        .eq("organization_id", contact.organizationId)
        .order("created_at", { ascending: true })

    if (contact.type === "patient") {
        query.eq("patient_id", contact.id)
    } else {
        query.eq("lead_id", contact.id)
    }

    const { data: messages } = await query

    if (!messages || messages.length <= SUMMARY_THRESHOLD) {
        return
    }

    // Split into messages to summarize (keep only recent ones)
    const toSummarize = messages.slice(0, -KEEP_RECENT)

    // Generate summary
    const aiMessages: AIMessage[] = toSummarize.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: m.created_at ? new Date(m.created_at) : undefined,
    }))

    const { summary, keyFacts } = await generateSummary(aiMessages)

    if (!summary) {
        console.log("[Summary] No summary generated, skipping")
        return
    }

    // Store summary in patient/lead AI notes
    if (contact.type === "patient") {
        const existingNotes = contact.aiNotes || ""
        const newNotes = `${existingNotes}\n\n[Resumen ${new Date().toISOString().split("T")[0]}]\n${summary}\n\nHechos clave: ${keyFacts.join(", ")}`

        await supabase
            .from("patients")
            .update({
                ai_notes: newNotes.trim(),
                ai_tags: keyFacts.slice(0, 10), // Store top facts as tags
            })
            .eq("id", contact.id)
    } else {
        // For leads, store in the name field with a prefix (or create a summary mechanism)
        const existingTags = contact.aiTags || []
        await supabase
            .from("leads")
            .update({
                ai_tags: [...existingTags, ...keyFacts].slice(0, 10),
            })
            .eq("id", contact.id)
    }

    // Delete the summarized messages (keep only recent ones)
    const idsToDelete = toSummarize.map(m => m.id)

    await supabase
        .from("messages")
        .delete()
        .in("id", idsToDelete)

    console.log(`[Summary] Summarized ${toSummarize.length} messages for ${contact.type} ${contact.id}`)
}

/**
 * Get conversation context including any stored summaries
 */
export async function getConversationWithSummary(
    contact: Contact
): Promise<{ summary: string | null; recentMessages: AIMessage[] }> {
    const supabase = getAdminClient()

    // Get recent messages
    const query = supabase
        .from("messages")
        .select("*")
        .eq("organization_id", contact.organizationId)
        .order("created_at", { ascending: false })
        .limit(KEEP_RECENT * 2)

    if (contact.type === "patient") {
        query.eq("patient_id", contact.id)
    } else {
        query.eq("lead_id", contact.id)
    }

    const { data: messages } = await query

    const recentMessages: AIMessage[] = (messages || []).reverse().map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: m.created_at ? new Date(m.created_at) : undefined,
    }))

    // Get stored summary from AI notes
    let summary: string | null = null

    if (contact.type === "patient" && contact.aiNotes) {
        // Extract the most recent summary from AI notes
        const summaryMatch = contact.aiNotes.match(/\[Resumen [^\]]+\]\n([^\[]+)/)
        if (summaryMatch) {
            summary = summaryMatch[1].trim()
        }
    }

    return { summary, recentMessages }
}
