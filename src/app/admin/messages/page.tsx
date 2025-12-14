import { getConversationThreads } from "@/lib/actions/messages"
import { MessagesClient } from "./messages-client"

export default async function MessagesPage() {
    const result = await getConversationThreads()
    const threads = result.success ? result.data : []

    return <MessagesClient initialThreads={threads} />
}
