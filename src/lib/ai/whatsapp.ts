/**
 * WhatsApp Cloud API Client
 * 
 * Handles sending messages via Meta's WhatsApp Business API.
 * Messages are sent to patients/leads in response to their inquiries.
 */

const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0"

export interface WhatsAppMessage {
    to: string
    type: "text" | "template" | "interactive"
    text?: { body: string }
    template?: {
        name: string
        language: { code: string }
        components?: unknown[]
    }
}

export interface WhatsAppWebhookMessage {
    from: string           // Phone number of sender
    id: string             // Message ID
    timestamp: string      // Unix timestamp
    type: "text" | "audio" | "image" | "document" | "interactive" | "button"
    text?: { body: string }
    audio?: { id: string; mime_type: string }
    image?: { id: string; mime_type: string; caption?: string }
    interactive?: {
        type: string
        button_reply?: { id: string; title: string }
        list_reply?: { id: string; title: string }
    }
}

export interface WhatsAppWebhookPayload {
    object: string
    entry: Array<{
        id: string
        changes: Array<{
            value: {
                messaging_product: string
                metadata: {
                    display_phone_number: string
                    phone_number_id: string
                }
                contacts?: Array<{
                    profile: { name: string }
                    wa_id: string
                }>
                messages?: WhatsAppWebhookMessage[]
                statuses?: Array<{
                    id: string
                    status: "sent" | "delivered" | "read" | "failed"
                    timestamp: string
                    recipient_id: string
                }>
            }
            field: string
        }>
    }>
}

/**
 * Send a text message via WhatsApp
 */
export async function sendWhatsAppMessage(
    to: string,
    message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

    if (!phoneNumberId || !accessToken) {
        console.error("[WhatsApp] Missing credentials")
        return { success: false, error: "WhatsApp not configured" }
    }

    // Clean phone number (remove non-digits except leading +)
    const cleanPhone = to.replace(/[^\d+]/g, "").replace(/^\+/, "")

    try {
        const response = await fetch(
            `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: cleanPhone,
                    type: "text",
                    text: { body: message },
                }),
            }
        )

        if (!response.ok) {
            const errorData = await response.json()
            console.error("[WhatsApp] Send error:", errorData)
            return {
                success: false,
                error: errorData.error?.message || "Failed to send message"
            }
        }

        const data = await response.json()
        return {
            success: true,
            messageId: data.messages?.[0]?.id
        }
    } catch (error) {
        console.error("[WhatsApp] Network error:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Network error"
        }
    }
}

/**
 * Download media from WhatsApp (for audio transcription)
 */
export async function downloadWhatsAppMedia(
    mediaId: string
): Promise<{ success: boolean; data?: ArrayBuffer; mimeType?: string; error?: string }> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

    if (!accessToken) {
        return { success: false, error: "WhatsApp not configured" }
    }

    try {
        // First, get the media URL
        const urlResponse = await fetch(
            `${WHATSAPP_API_URL}/${mediaId}`,
            {
                headers: { "Authorization": `Bearer ${accessToken}` },
            }
        )

        if (!urlResponse.ok) {
            return { success: false, error: "Failed to get media URL" }
        }

        const urlData = await urlResponse.json()
        const mediaUrl = urlData.url
        const mimeType = urlData.mime_type

        // Download the actual media
        const mediaResponse = await fetch(mediaUrl, {
            headers: { "Authorization": `Bearer ${accessToken}` },
        })

        if (!mediaResponse.ok) {
            return { success: false, error: "Failed to download media" }
        }

        const data = await mediaResponse.arrayBuffer()
        return { success: true, data, mimeType }
    } catch (error) {
        console.error("[WhatsApp] Media download error:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Download failed"
        }
    }
}

/**
 * Mark message as read (shows blue checkmarks)
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

    if (!phoneNumberId || !accessToken) return

    try {
        await fetch(
            `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    status: "read",
                    message_id: messageId,
                }),
            }
        )
    } catch (error) {
        // Non-critical, just log
        console.error("[WhatsApp] Failed to mark as read:", error)
    }
}

/**
 * Verify webhook signature for security
 */
export function verifyWebhookPayload(
    requestBody: string,
    signature: string | null
): boolean {
    // For now, we rely on the verify token during subscription
    // In production, implement HMAC signature verification
    if (!signature) return true

    // TODO: Implement proper HMAC verification
    // const expectedSignature = crypto
    //     .createHmac("sha256", process.env.WHATSAPP_APP_SECRET!)
    //     .update(requestBody)
    //     .digest("hex")

    return true
}
