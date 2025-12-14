import { UserPlus } from "lucide-react"
import { PatientForm } from "@/components/features/patient-form"

export default function NewPatientPage() {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-shrink-0 p-6 border-b border-white/10">
                <h1 className="text-2xl font-serif text-text-primary flex items-center gap-3">
                    <UserPlus className="h-7 w-7 text-luxury-gold" />
                    Nuevo Paciente
                </h1>
                <p className="text-text-muted text-sm mt-1">
                    Registra un nuevo paciente en el sistema
                </p>
            </header>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl">
                    <PatientForm mode="create" />
                </div>
            </div>
        </div>
    )
}
