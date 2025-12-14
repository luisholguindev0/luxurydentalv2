/**
 * AI QA Test Harness
 * 
 * Interactive CLI to test the AI brain without WhatsApp.
 * Run: npx tsx scripts/ai-qa-test.ts
 */

import * as readline from "readline"
import { processMessage, buildSystemPrompt } from "../src/lib/ai/brain"
import type { Contact, ConversationContext, AIMessage, ServiceInfo, AppointmentContext } from "../src/lib/ai/types"

// Mock contact for testing
const mockContact: Contact = {
    type: "lead",
    id: "test-lead-001",
    phone: "+573001234567",
    name: null, // Start without name to test identity flow
    organizationId: "00000000-0000-0000-0000-000000000001",
}

// Mock services
const mockServices: ServiceInfo[] = [
    { id: "svc-1", title: "Limpieza Dental", price: 80000, duration: 30, description: "Limpieza profesional" },
    { id: "svc-2", title: "Blanqueamiento", price: 350000, duration: 60, description: "Blanqueamiento con láser" },
    { id: "svc-3", title: "Consulta General", price: 50000, duration: 30, description: "Evaluación inicial" },
    { id: "svc-4", title: "Ortodoncia", price: 3500000, duration: 45, description: "Evaluación de brackets" },
]

// Mock appointments (empty initially)
const mockAppointments: AppointmentContext[] = []

// Conversation history
const messageHistory: AIMessage[] = []

async function runTest() {
    console.log("=".repeat(60))
    console.log("🦷 LuxuryDental AI QA Test Harness")
    console.log("=".repeat(60))
    console.log("")
    console.log("This simulates a WhatsApp conversation with the AI.")
    console.log("Type your messages as if you were the patient.")
    console.log("")
    console.log("Commands:")
    console.log("  /reset     - Reset conversation")
    console.log("  /name <n>  - Set contact name")
    console.log("  /patient   - Switch to patient mode")
    console.log("  /prompt    - Show system prompt")
    console.log("  /context   - Show current context")
    console.log("  /quit      - Exit")
    console.log("")
    console.log("-".repeat(60))
    console.log("")

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })

    const askQuestion = (prompt: string): Promise<string> => {
        return new Promise((resolve) => {
            rl.question(prompt, (answer) => {
                resolve(answer)
            })
        })
    }

    let contact = { ...mockContact }

    while (true) {
        const input = await askQuestion("\n👤 Tú: ")

        if (!input.trim()) continue

        // Handle commands
        if (input.startsWith("/")) {
            const [cmd, ...args] = input.slice(1).split(" ")

            switch (cmd) {
                case "quit":
                case "exit":
                    console.log("\n👋 ¡Hasta luego!")
                    rl.close()
                    process.exit(0)

                case "reset":
                    messageHistory.length = 0
                    contact = { ...mockContact, name: null }
                    console.log("\n🔄 Conversación reiniciada")
                    continue

                case "name":
                    if (args.length > 0) {
                        contact.name = args.join(" ")
                        console.log(`\n✅ Nombre establecido: ${contact.name}`)
                    }
                    continue

                case "patient":
                    contact.type = "patient"
                    console.log(`\n✅ Modo cambiado a: paciente`)
                    continue

                case "prompt":
                    const ctx = buildContext(contact)
                    console.log("\n📋 System Prompt:")
                    console.log("-".repeat(40))
                    console.log(buildSystemPrompt(ctx))
                    console.log("-".repeat(40))
                    continue

                case "context":
                    console.log("\n📋 Current Context:")
                    console.log(JSON.stringify({
                        contact,
                        messageCount: messageHistory.length,
                        appointments: mockAppointments,
                    }, null, 2))
                    continue

                default:
                    console.log(`\n❓ Comando desconocido: ${cmd}`)
                    continue
            }
        }

        // Process message through AI
        try {
            const context = buildContext(contact)

            console.log("\n⏳ Procesando...")
            const startTime = Date.now()

            const response = await processMessage(input, context)

            const elapsed = Date.now() - startTime

            // Add to history
            messageHistory.push({ role: "user", content: input })
            messageHistory.push({ role: "assistant", content: response.text })

            // Check if name was updated via tool
            if (response.toolCalls) {
                for (const tc of response.toolCalls) {
                    if (tc.name === "update_name" && tc.result.success && tc.result.data) {
                        contact.name = (tc.result.data as { newName: string }).newName
                    }
                    console.log(`   🔧 Tool: ${tc.name} → ${tc.result.success ? "✅" : "❌"} ${tc.result.message}`)
                }
            }

            console.log(`\n🤖 Luxe: ${response.text}`)
            console.log(`   ⏱️ ${elapsed}ms`)

        } catch (error) {
            console.error("\n❌ Error:", error)
        }
    }
}

import { DEFAULT_CLINIC_CONFIG } from "../src/lib/ai/types"

function buildContext(contact: Contact): ConversationContext {
    return {
        contact,
        messages: messageHistory,
        appointments: mockAppointments,
        services: mockServices,
        lastCancellation: undefined,
        clinicConfig: DEFAULT_CLINIC_CONFIG,
    }
}

// Run the test
runTest().catch(console.error)
