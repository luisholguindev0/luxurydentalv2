import { UserPlus } from "lucide-react"
import { LeadForm } from "@/components/features/lead-form"

export default function NewLeadPage() {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-shrink-0 p-6 border-b border-white/10">
                <h1 className="text-2xl font-serif text-text-primary flex items-center gap-3">
                    <UserPlus className="h-7 w-7 text-luxury-gold" />
                    Nuevo Lead
                </h1>
                <p className="text-text-muted text-sm mt-1">
                    Registra un nuevo lead manualmente
                </p>
            </header>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl">
                    <LeadForm mode="create" />
                </div>
            </div>
        </div>
    )
}
