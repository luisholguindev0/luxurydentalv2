"use client"

import { useState, useEffect } from "react"
import {
    Users,
    Plus,
    Search,
    Phone,
    Calendar,
    MoreHorizontal,
    Trash2,
    Edit,
    Eye,
    AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { deletePatient } from "@/lib/actions/patients"
import type { Tables } from "@/types/database"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Pagination } from "@/components/ui/pagination"

type Patient = Tables<"patients">

interface PatientsListClientProps {
    initialPatients: Patient[]
    totalPages: number
    totalCount: number
}

export function PatientsListClient({ initialPatients, totalPages, totalCount }: PatientsListClientProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Sync state with server/URL
    const [patients, setPatients] = useState<Patient[]>(initialPatients)
    const [searchQuery, setSearchQuery] = useState(searchParams.get("query") || "")
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [openMenu, setOpenMenu] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Update patients when server data changes
    useEffect(() => {
        setPatients(initialPatients)
    }, [initialPatients])

    // Update search query when URL changes (e.g. back button)
    useEffect(() => {
        setSearchQuery(searchParams.get("query") || "")
    }, [searchParams])

    // Debounced Search Effect
    const handleSearch = (term: string) => {
        setSearchQuery(term)
        const params = new URLSearchParams(searchParams)
        if (term) {
            params.set("query", term)
        } else {
            params.delete("query")
        }
        params.set("page", "1") // Reset to page 1
        router.replace(`${pathname}?${params.toString()}`)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Está seguro que desea eliminar este paciente? Esta acción no se puede deshacer.")) {
            return
        }

        setIsDeleting(id)
        setError(null)

        const result = await deletePatient(id)

        if (result.success) {
            setPatients((prev) => prev.filter((p) => p.id !== id))
        } else {
            setError(result.error || "Error al eliminar paciente")
        }

        setIsDeleting(null)
        setOpenMenu(null)
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-shrink-0 p-6 border-b border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-serif text-text-primary flex items-center gap-3">
                            <Users className="h-7 w-7 text-luxury-gold" />
                            Pacientes
                        </h1>
                        <p className="text-text-muted text-sm mt-1">
                            {totalCount} pacientes registrados
                        </p>
                    </div>
                    <Link href="/admin/patients/new">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Paciente
                        </Button>
                    </Link>
                </div>

                {/* Search */}
                <div className="mt-4 relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <Input
                        placeholder="Buscar por nombre, teléfono o email..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </header>

            {/* Error */}
            {error && (
                <div className="mx-6 mt-4 p-3 bg-luxury-danger/10 border border-luxury-danger/30 rounded-lg flex items-center gap-2 text-luxury-danger text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {patients.length === 0 ? (
                    searchQuery ? (
                        <EmptyState
                            icon={Search}
                            title="Sin resultados"
                            description={`No se encontraron pacientes con "${searchQuery}"`}
                            action={{
                                label: "Limpiar búsqueda",
                                onClick: () => handleSearch("")
                            }}
                        />
                    ) : (
                        <EmptyState
                            icon={Users}
                            title="Sin pacientes"
                            description="Aún no hay pacientes registrados. Crea el primero."
                        >
                            <Link href="/admin/patients/new">
                                <Button className="mt-4">
                                    Crear Paciente
                                </Button>
                            </Link>
                        </EmptyState>
                    )
                ) : (
                    <div className="bg-luxury-card border border-white/10 rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left px-4 py-3 text-text-muted text-xs uppercase tracking-wider font-medium">
                                        Paciente
                                    </th>
                                    <th className="text-left px-4 py-3 text-text-muted text-xs uppercase tracking-wider font-medium hidden md:table-cell">
                                        Contacto
                                    </th>
                                    <th className="text-left px-4 py-3 text-text-muted text-xs uppercase tracking-wider font-medium hidden lg:table-cell">
                                        Registrado
                                    </th>
                                    <th className="text-right px-4 py-3 text-text-muted text-xs uppercase tracking-wider font-medium">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {patients.map((patient) => (
                                    <tr
                                        key={patient.id}
                                        className="hover:bg-white/5 transition-colors"
                                    >
                                        <td className="px-4 py-4">
                                            <div>
                                                <p className="text-text-primary font-medium">
                                                    {patient.full_name}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell">
                                            <div className="space-y-1">
                                                {patient.whatsapp_number && (
                                                    <div className="flex items-center gap-2 text-text-secondary text-sm">
                                                        <Phone className="h-3.5 w-3.5" />
                                                        {patient.whatsapp_number}
                                                    </div>
                                                )}
                                                {patient.email && (
                                                    <p className="text-text-muted text-sm truncate max-w-[200px]">
                                                        {patient.email}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 hidden lg:table-cell">
                                            <div className="flex items-center gap-2 text-text-muted text-sm">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {patient.created_at && format(new Date(patient.created_at), "d MMM yyyy", { locale: es })}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-end gap-1 relative">
                                                <button
                                                    onClick={() => setOpenMenu(openMenu === patient.id ? null : patient.id)}
                                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                >
                                                    <MoreHorizontal className="h-4 w-4 text-text-muted" />
                                                </button>

                                                {openMenu === patient.id && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setOpenMenu(null)}
                                                        />
                                                        <div className="absolute right-0 top-full mt-1 z-20 bg-luxury-dark border border-white/10 rounded-lg shadow-xl py-1 min-w-[140px]">
                                                            <Link
                                                                href={`/admin/patients/${patient.id}`}
                                                                className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-white/5 transition-colors"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                Ver detalle
                                                            </Link>
                                                            <Link
                                                                href={`/admin/patients/${patient.id}/edit`}
                                                                className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-white/5 transition-colors"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                                Editar
                                                            </Link>
                                                            <button
                                                                onClick={() => handleDelete(patient.id)}
                                                                disabled={isDeleting === patient.id}
                                                                className={cn(
                                                                    "flex items-center gap-2 px-3 py-2 text-sm w-full text-left transition-colors",
                                                                    isDeleting === patient.id
                                                                        ? "text-text-muted"
                                                                        : "text-luxury-danger hover:bg-luxury-danger/10"
                                                                )}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                {isDeleting === patient.id ? "Eliminando..." : "Eliminar"}
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {patients.length > 0 && totalPages > 1 && (
                    <div className="mt-4 pb-6">
                        <Pagination totalPages={totalPages} />
                    </div>
                )}
            </div>
        </div>
    )
}
