import { notFound } from "next/navigation"
import { Edit } from "lucide-react"
import { getPatientById } from "@/lib/actions/patients"
import { PatientForm } from "@/components/features/patient-form"

interface EditPatientPageProps {
    params: Promise<{ id: string }>
}

export default async function EditPatientPage({ params }: EditPatientPageProps) {
    const { id } = await params
    const result = await getPatientById(id)

    if (!result.success || !result.data) {
        notFound()
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-shrink-0 p-6 border-b border-white/10">
                <h1 className="text-2xl font-serif text-text-primary flex items-center gap-3">
                    <Edit className="h-7 w-7 text-luxury-gold" />
                    Editar Paciente
                </h1>
                <p className="text-text-muted text-sm mt-1">
                    {result.data.full_name}
                </p>
            </header>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl">
                    <PatientForm patient={result.data} mode="edit" />
                </div>
            </div>
        </div>
    )
}
