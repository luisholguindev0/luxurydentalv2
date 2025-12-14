import { notFound } from "next/navigation"
import { Phone, Mail, MapPin, FileText, Edit, ArrowLeft } from "lucide-react"
import { getPatientById } from "@/lib/actions/patients"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface PatientDetailPageProps {
    params: Promise<{ id: string }>
}

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
    const { id } = await params
    const result = await getPatientById(id)

    if (!result.success || !result.data) {
        notFound()
    }

    const patient = result.data

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-shrink-0 p-6 border-b border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link
                                href="/admin/patients"
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="h-5 w-5 text-text-muted" />
                            </Link>
                            <h1 className="text-2xl font-serif text-text-primary">
                                {patient.full_name}
                            </h1>
                        </div>
                        <p className="text-text-muted text-sm ml-10">
                            Paciente desde {patient.created_at && format(new Date(patient.created_at), "MMMM yyyy", { locale: es })}
                        </p>
                    </div>
                    <Link href={`/admin/patients/${id}/edit`}>
                        <Button>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl space-y-6">
                    {/* Contact Info */}
                    <div className="bg-luxury-card border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-medium text-text-primary border-b border-white/10 pb-4 mb-4">
                            Información de Contacto
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoItem
                                icon={Phone}
                                label="WhatsApp"
                                value={patient.whatsapp_number}
                            />
                            <InfoItem
                                icon={Mail}
                                label="Email"
                                value={patient.email}
                            />
                            <InfoItem
                                icon={MapPin}
                                label="Dirección"
                                value={patient.address}
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-luxury-card border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-medium text-text-primary border-b border-white/10 pb-4 mb-4">
                            Notas
                        </h3>
                        {patient.notes ? (
                            <div className="flex items-start gap-3">
                                <FileText className="h-5 w-5 text-text-muted mt-0.5" />
                                <p className="text-text-secondary whitespace-pre-wrap">
                                    {patient.notes}
                                </p>
                            </div>
                        ) : (
                            <p className="text-text-muted italic">
                                Sin notas registradas
                            </p>
                        )}
                    </div>

                    {/* AI Notes (if any) */}
                    {patient.ai_notes && (
                        <div className="bg-luxury-card border border-luxury-gold/20 rounded-xl p-6">
                            <h3 className="text-lg font-medium text-luxury-gold border-b border-luxury-gold/20 pb-4 mb-4">
                                Notas del Asistente AI
                            </h3>
                            <p className="text-text-secondary whitespace-pre-wrap">
                                {patient.ai_notes}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function InfoItem({
    icon: Icon,
    label,
    value
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value?: string | null
}) {
    return (
        <div className="flex items-start gap-3">
            <Icon className="h-5 w-5 text-text-muted mt-0.5" />
            <div>
                <p className="text-text-muted text-sm">{label}</p>
                <p className="text-text-primary">
                    {value || <span className="text-text-muted italic">No especificado</span>}
                </p>
            </div>
        </div>
    )
}
