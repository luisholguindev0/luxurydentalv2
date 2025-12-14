/**
 * DeepSeek AI Client
 * 
 * Direct API calls to DeepSeek. No abstractions, no magic.
 * DeepSeek uses an OpenAI-compatible API format.
 */

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

export interface ChatMessage {
    role: "system" | "user" | "assistant" | "tool"
    content: string
    tool_call_id?: string
    tool_calls?: ToolCall[]
}

export interface ToolCall {
    id: string
    type: "function"
    function: {
        name: string
        arguments: string // JSON string
    }
}

export interface ToolDefinition {
    type: "function"
    function: {
        name: string
        description: string
        parameters: Record<string, unknown>
    }
}

export interface ChatCompletionRequest {
    model: string
    messages: ChatMessage[]
    tools?: ToolDefinition[]
    tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } }
    temperature?: number
    max_tokens?: number
}

export interface ChatCompletionResponse {
    id: string
    object: string
    created: number
    model: string
    choices: Array<{
        index: number
        message: ChatMessage
        finish_reason: "stop" | "tool_calls" | "length"
    }>
    usage: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}

/**
 * Call DeepSeek chat completion API
 */
export async function chatCompletion(
    request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
    const apiKey = process.env.DEEPSEEK_API_KEY

    if (!apiKey) {
        throw new Error("DEEPSEEK_API_KEY not configured")
    }

    const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: request.model || "deepseek-chat",
            messages: request.messages,
            tools: request.tools,
            tool_choice: request.tool_choice || "auto",
            temperature: request.temperature ?? 0.7,
            max_tokens: request.max_tokens ?? 2048,
        }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error("[DeepSeek] API error:", response.status, errorText)
        throw new Error(`DeepSeek API error: ${response.status}`)
    }

    return response.json()
}

/**
 * Simple chat (no tools)
 */
export async function chat(
    systemPrompt: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
    const response = await chatCompletion({
        model: "deepseek-chat",
        messages: [
            { role: "system", content: systemPrompt },
            ...messages,
        ],
    })

    return response.choices[0]?.message?.content || ""
}
