/**
 * WhatsApp Webhook Endpoint
 * 
 * Handles incoming messages from WhatsApp Cloud API.
 * This is the entry point for all patient/lead communications.
 * 
 * POST: Receive incoming messages
 * GET: Webhook verification (required by Meta)
 */

import { NextRequest, NextResponse } from "next/server"
import type { WhatsAppWebhookPayload, WhatsAppWebhookMessage } from "@/lib/ai/whatsapp"
import { sendWhatsAppMessage, markMessageAsRead, downloadWhatsAppMedia, verifyWebhookPayloadAsync } from "@/lib/ai/whatsapp"
import { handleIncomingMessage, resolveOrganization } from "@/lib/actions/ai-brain"
import { enforceRateLimit, RateLimits } from "@/lib/utils/rate-limit"

/**
 * GET - Webhook Verification
 * Meta calls this endpoint when you first configure the webhook.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams

    const mode = searchParams.get("hub.mode")
    const token = searchParams.get("hub.verify_token")
    const challenge = searchParams.get("hub.challenge")

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

    if (mode === "subscribe" && token === verifyToken) {
        console.log("[WhatsApp Webhook] Verification successful")
        return new NextResponse(challenge, { status: 200 })
    }

    console.warn("[WhatsApp Webhook] Verification failed - token mismatch")
    return new NextResponse("Forbidden", { status: 403 })
}

/**
 * POST - Handle Incoming Messages
 */
export async function POST(request: NextRequest) {
    // Rate limiting: 100 requests per 10 seconds per IP
    const rateLimitResult = await enforceRateLimit(RateLimits.WHATSAPP_WEBHOOK)
    if (rateLimitResult) {
        return rateLimitResult
    }

    try {
        const body = await request.text()

        // Verify webhook signature (security)
        const signature = request.headers.get("x-hub-signature-256")
        const isValid = await verifyWebhookPayloadAsync(body, signature)
        if (!isValid) {
            console.error("[WhatsApp Webhook] Invalid signature - rejecting")
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const payload: WhatsAppWebhookPayload = JSON.parse(body)

        // Log for debugging (remove in production)
        console.log("[WhatsApp Webhook] Received:", JSON.stringify(payload, null, 2))

        // Process each entry
        for (const entry of payload.entry || []) {
            for (const change of entry.changes || []) {
                if (change.field !== "messages") continue

                const value = change.value

                // Extract the phone number ID (used for org resolution)
                const phoneNumberId = value.metadata?.phone_number_id

                // Handle incoming messages
                if (value.messages?.length) {
                    for (const message of value.messages) {
                        await processIncomingMessage(
                            message,
                            value.contacts?.[0],
                            phoneNumberId
                        )
                    }
                }

                // Handle status updates (delivered, read, etc.)
                if (value.statuses?.length) {
                    for (const status of value.statuses) {
                        console.log(`[WhatsApp] Message ${status.id} status: ${status.status}`)
                    }
                }
            }
        }

        // Always return 200 to acknowledge receipt
        return new NextResponse("OK", { status: 200 })
    } catch (error) {
        console.error("[WhatsApp Webhook] Error processing request:", error)
        // Still return 200 to prevent Meta from retrying
        return new NextResponse("OK", { status: 200 })
    }
}

/**
 * Process a single incoming message
 */
async function processIncomingMessage(
    message: WhatsAppWebhookMessage,
    contact?: { profile: { name: string }; wa_id: string },
    phoneNumberId?: string
) {
    const phone = message.from
    const profileName = contact?.profile?.name

    console.log(`[WhatsApp] Message from ${phone} (${profileName || "unknown"}): ${message.type}`)

    // Resolve organization from WhatsApp Phone Number ID
    const organizationId = await resolveOrganization(phoneNumberId)
    if (!organizationId) {
        console.error("[WhatsApp] Could not resolve organization for phone number ID:", phoneNumberId)
        await sendWhatsAppMessage(
            phone,
            "Disculpa, estamos experimentando dificultades técnicas. Por favor intenta más tarde. 🙏"
        )
        return
    }

    // Mark message as read immediately
    await markMessageAsRead(message.id)

    let messageContent: string

    switch (message.type) {
        case "text":
            messageContent = message.text?.body || ""
            break

        case "audio":
            // Handle audio message (voice note)
            messageContent = await transcribeAudioMessage(message.audio?.id)
            if (!messageContent) {
                await sendWhatsAppMessage(
                    phone,
                    "Disculpa, no pude procesar tu mensaje de voz. ¿Podrías escribirme tu consulta? 📝"
                )
                return
            }
            break

        case "interactive":
            // Handle button/list replies
            const reply = message.interactive?.button_reply || message.interactive?.list_reply
            messageContent = reply?.title || reply?.id || ""
            break

        case "image":
            // For now, just acknowledge image messages
            await sendWhatsAppMessage(
                phone,
                "He recibido tu imagen. Por ahora solo puedo procesar mensajes de texto. ¿En qué puedo ayudarte? 📝"
            )
            return

        default:
            // Unsupported message type
            console.log(`[WhatsApp] Unsupported message type: ${message.type}`)
            await sendWhatsAppMessage(
                phone,
                "Disculpa, no pude entender ese tipo de mensaje. ¿Podrías escribirme tu consulta? 📝"
            )
            return
    }

    if (!messageContent.trim()) {
        return
    }

    try {
        // Process message through AI Brain with resolved organization
        const responseText = await handleIncomingMessage(
            phone,
            messageContent,
            organizationId,
            profileName
        )

        // Send response back to WhatsApp
        await sendWhatsAppMessage(phone, responseText)

    } catch (error) {
        console.error("[WhatsApp] Error processing message:", error)

        // Send fallback message
        await sendWhatsAppMessage(
            phone,
            "Disculpa, estamos experimentando dificultades técnicas. Un miembro de nuestro equipo te contactará pronto. 🙏"
        )
    }
}

/**
 * Transcribe an audio message using Whisper
 */
async function transcribeAudioMessage(mediaId?: string): Promise<string> {
    if (!mediaId) return ""

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
        console.warn("[WhatsApp] OpenAI key not configured for audio transcription")
        return ""
    }

    try {
        // Download the audio file from WhatsApp
        const mediaResult = await downloadWhatsAppMedia(mediaId)

        if (!mediaResult.success || !mediaResult.data) {
            console.error("[WhatsApp] Failed to download audio:", mediaResult.error)
            return ""
        }

        // Create form data for Whisper API
        const formData = new FormData()
        const audioBlob = new Blob([mediaResult.data], { type: mediaResult.mimeType || "audio/ogg" })
        formData.append("file", audioBlob, "audio.ogg")
        formData.append("model", "whisper-1")
        formData.append("language", "es")
        formData.append("response_format", "text")

        // Call Whisper API
        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openaiKey}`,
            },
            body: formData,
        })

        if (!response.ok) {
            const error = await response.text()
            console.error("[WhatsApp] Whisper API error:", error)
            return ""
        }

        const transcription = await response.text()
        console.log(`[WhatsApp] Transcribed audio: ${transcription}`)

        return transcription.trim()
    } catch (error) {
        console.error("[WhatsApp] Transcription error:", error)
        return ""
    }
}
