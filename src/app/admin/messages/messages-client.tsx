"use client"

import { useState, useEffect } from "react"
import {
    MessageSquare,
    Search,
    Phone,
    User,
    UserPlus,
    Clock,
    Bot,
    ArrowLeft
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { getMessages } from "@/lib/actions/messages"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface Thread {
    id: string
    type: "patient" | "lead"
    name: string
    phone: string
    lastMessage: string
    lastMessageAt: string
    messageCount: number
}

interface Message {
    id: string
    role: string
    content: string
    created_at: string | null
}

interface MessagesClientProps {
    initialThreads: Thread[]
}

export function MessagesClient({ initialThreads }: MessagesClientProps) {
    const [threads] = useState<Thread[]>(initialThreads)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [loadingMessages, setLoadingMessages] = useState(false)

    const filteredThreads = threads.filter(
        (thread) =>
            thread.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            thread.phone.includes(searchQuery)
    )

    useEffect(() => {
        async function loadMessages() {
            if (!selectedThread) return

            setLoadingMessages(true)
            const result = await getMessages(
                selectedThread.type === "patient"
                    ? { patientId: selectedThread.id, limit: 50 }
                    : { leadId: selectedThread.id, limit: 50 }
            )

            if (result.success) {
                setMessages(result.data.reverse())
            }
            setLoadingMessages(false)
        }

        loadMessages()
    }, [selectedThread])

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-shrink-0 p-6 border-b border-white/10">
                <h1 className="text-2xl font-serif text-text-primary flex items-center gap-3">
                    <MessageSquare className="h-7 w-7 text-luxury-gold" />
                    Mensajes
                </h1>
                <p className="text-text-muted text-sm mt-1">
                    Historial de conversaciones con pacientes y leads
                </p>
            </header>

            {/* Content - Split view */}
            <div className="flex-1 flex overflow-hidden">
                {/* Thread List */}
                <div className={cn(
                    "w-full md:w-80 lg:w-96 border-r border-white/10 flex flex-col",
                    selectedThread && "hidden md:flex"
                )}>
                    {/* Search */}
                    <div className="p-4 border-b border-white/10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                            <Input
                                placeholder="Buscar conversaciones..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Thread List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredThreads.length === 0 ? (
                            <EmptyState
                                icon={MessageSquare}
                                title="Sin conversaciones"
                                description="Las conversaciones aparecerán aquí cuando los contactos te escriban por WhatsApp."
                            />
                        ) : (
                            <div className="divide-y divide-white/5">
                                {filteredThreads.map((thread) => (
                                    <button
                                        key={`${thread.type}-${thread.id}`}
                                        onClick={() => setSelectedThread(thread)}
                                        className={cn(
                                            "w-full p-4 text-left hover:bg-white/5 transition-colors",
                                            selectedThread?.id === thread.id && selectedThread?.type === thread.type && "bg-luxury-gold/10"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "p-2 rounded-full",
                                                thread.type === "patient" ? "bg-luxury-success/20" : "bg-blue-500/20"
                                            )}>
                                                {thread.type === "patient" ? (
                                                    <User className="h-4 w-4 text-luxury-success" />
                                                ) : (
                                                    <UserPlus className="h-4 w-4 text-blue-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-text-primary font-medium truncate">
                                                        {thread.name}
                                                    </p>
                                                    <span className="text-text-muted text-xs shrink-0">
                                                        {formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true, locale: es })}
                                                    </span>
                                                </div>
                                                <p className="text-text-muted text-sm truncate mt-0.5">
                                                    {thread.lastMessage}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Phone className="h-3 w-3 text-text-muted" />
                                                    <span className="text-text-muted text-xs">{thread.phone}</span>
                                                    <span className="text-text-muted text-xs">· {thread.messageCount} mensajes</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Message View */}
                <div className={cn(
                    "flex-1 flex flex-col bg-luxury-darker",
                    !selectedThread && "hidden md:flex"
                )}>
                    {selectedThread ? (
                        <>
                            {/* Thread Header */}
                            <div className="p-4 border-b border-white/10 bg-luxury-dark flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedThread(null)}
                                    className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <ArrowLeft className="h-5 w-5 text-text-muted" />
                                </button>
                                <div className={cn(
                                    "p-2 rounded-full",
                                    selectedThread.type === "patient" ? "bg-luxury-success/20" : "bg-blue-500/20"
                                )}>
                                    {selectedThread.type === "patient" ? (
                                        <User className="h-4 w-4 text-luxury-success" />
                                    ) : (
                                        <UserPlus className="h-4 w-4 text-blue-400" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-text-primary font-medium">{selectedThread.name}</p>
                                    <p className="text-text-muted text-sm">{selectedThread.phone}</p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {loadingMessages ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="h-8 w-8 border-2 border-luxury-gold/30 border-t-luxury-gold rounded-full animate-spin" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <p className="text-center text-text-muted py-8">Sin mensajes</p>
                                ) : (
                                    messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={cn(
                                                "flex",
                                                message.role === "assistant" ? "justify-start" : "justify-end"
                                            )}
                                        >
                                            <div className={cn(
                                                "max-w-[80%] p-3 rounded-2xl",
                                                message.role === "assistant"
                                                    ? "bg-luxury-card border border-white/10 rounded-tl-sm"
                                                    : "bg-luxury-gold/20 rounded-tr-sm"
                                            )}>
                                                {message.role === "assistant" && (
                                                    <div className="flex items-center gap-1 text-luxury-gold text-xs mb-1">
                                                        <Bot className="h-3 w-3" />
                                                        Luxe
                                                    </div>
                                                )}
                                                <p className="text-text-primary text-sm whitespace-pre-wrap">
                                                    {message.content}
                                                </p>
                                                <div className={cn(
                                                    "flex items-center gap-1 mt-1",
                                                    message.role === "assistant" ? "justify-start" : "justify-end"
                                                )}>
                                                    <Clock className="h-3 w-3 text-text-muted" />
                                                    <span className="text-text-muted text-xs">
                                                        {message.created_at && format(new Date(message.created_at), "HH:mm", { locale: es })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-text-muted">
                                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>Selecciona una conversación</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
