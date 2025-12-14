'use client'

export default function RootError() {
    return (
        <html lang="es">
            <body>
                <div className="min-h-screen flex items-center justify-center p-4 bg-luxury-darker">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-2xl font-serif text-text-primary">
                                Algo salió mal
                            </h1>
                            <p className="text-text-secondary">
                                Lo sentimos, ocurrió un error inesperado. Por favor recarga la página.
                            </p>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-luxury-gold text-luxury-dark rounded-lg font-medium hover:bg-luxury-gold-light transition-colors"
                        >
                            Recargar página
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}
