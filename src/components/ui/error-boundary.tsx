'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { Button } from './button'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-luxury-darker">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="p-4 bg-luxury-danger/10 rounded-full border border-luxury-danger/20">
                                <AlertTriangle className="w-12 h-12 text-luxury-danger" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-serif text-text-primary">
                                Algo salió mal
                            </h1>
                            <p className="text-text-secondary">
                                Lo sentimos, ocurrió un error inesperado. Por favor intenta nuevamente.
                            </p>

                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <details className="mt-4 text-left">
                                    <summary className="cursor-pointer text-sm text-luxury-warning mb-2">
                                        Detalles del error (desarrollo)
                                    </summary>
                                    <pre className="bg-luxury-card p-4 rounded-lg text-xs text-text-secondary overflow-auto max-h-40 border border-luxury-gold/10">
                                        {this.state.error.message}
                                        {'\n\n'}
                                        {this.state.error.stack}
                                    </pre>
                                </details>
                            )}
                        </div>

                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="secondary"
                                onClick={() => window.location.href = '/admin'}
                            >
                                Ir al inicio
                            </Button>
                            <Button
                                onClick={() => window.location.reload()}
                                className="gap-2"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                Recargar página
                            </Button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
