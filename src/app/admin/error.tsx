'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Admin error:', error)
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="p-4 bg-luxury-danger/10 rounded-full border border-luxury-danger/20">
                        <AlertTriangle className="w-12 h-12 text-luxury-danger" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-serif text-text-primary">
                        Error en el panel administrativo
                    </h1>
                    <p className="text-text-secondary">
                        Ocurrió un error al cargar esta página. Por favor intenta nuevamente.
                    </p>

                    {process.env.NODE_ENV === 'development' && (
                        <details className="mt-4 text-left">
                            <summary className="cursor-pointer text-sm text-luxury-warning mb-2">
                                Detalles del error (desarrollo)
                            </summary>
                            <pre className="bg-luxury-card p-4 rounded-lg text-xs text-text-secondary overflow-auto max-h-40 border border-luxury-gold/10">
                                {error.message}
                                {'\n\n'}
                                {error.stack}
                            </pre>
                        </details>
                    )}
                </div>

                <div className="flex gap-3 justify-center">
                    <Link href="/admin">
                        <Button variant="secondary" className="gap-2">
                            <Home className="w-4 h-4" />
                            Ir al inicio
                        </Button>
                    </Link>
                    <Button onClick={reset} className="gap-2">
                        <RefreshCcw className="w-4 h-4" />
                        Intentar nuevamente
                    </Button>
                </div>
            </div>
        </div>
    )
}
