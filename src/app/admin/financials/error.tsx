'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCcw, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function FinancialsError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const router = useRouter()

    useEffect(() => {
        console.error('Financials error:', error)
    }, [error])

    return (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="p-4 bg-luxury-danger/10 rounded-full border border-luxury-danger/20">
                        <AlertTriangle className="w-12 h-12 text-luxury-danger" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-serif text-text-primary">
                        Error al cargar finanzas
                    </h2>
                    <p className="text-text-secondary">
                        No pudimos cargar los datos financieros. Por favor intenta nuevamente.
                    </p>
                </div>

                <div className="flex gap-3 justify-center">
                    <Button variant="secondary" onClick={() => router.back()} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </Button>
                    <Button onClick={reset} className="gap-2">
                        <RefreshCcw className="w-4 h-4" />
                        Reintentar
                    </Button>
                </div>
            </div>
        </div>
    )
}
