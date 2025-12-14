/**
 * AI Module Exports
 */

// DeepSeek client
export { chatCompletion, chat } from "./deepseek"
export type { ChatMessage, ToolCall, ToolDefinition, ChatCompletionRequest, ChatCompletionResponse } from "./deepseek"

// AI Brain
export { processMessage, buildSystemPrompt } from "./brain"

// Tools
export { TOOL_DEFINITIONS, executeTool } from "./tools"
export type { ToolResult } from "./tools"

// Summary
export { generateSummary, shouldSummarize, summarizeConversation, getConversationWithSummary } from "./summary"
export type { ConversationSummary } from "./summary"

// Types
export type {
    Contact,
    ContactType,
    AIMessage,
    ConversationContext,
    AppointmentContext,
    ServiceInfo,
} from "./types"

export { DEFAULT_BUSINESS_HOURS, DEFAULT_CLINIC_CONFIG, HUMAN_HANDOFF_KEYWORDS } from "./types"
