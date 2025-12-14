import Link from 'next/link'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-luxury-darker">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="space-y-2">
                    <h1 className="text-6xl font-serif text-luxury-gold">404</h1>
                    <h2 className="text-2xl font-serif text-text-primary">
                        Página no encontrada
                    </h2>
                    <p className="text-text-secondary">
                        Lo sentimos, la página que buscas no existe o ha sido movida.
                    </p>
                </div>

                <div className="flex gap-3 justify-center">
                    <Link href="/">
                        <Button className="gap-2">
                            <Home className="w-4 h-4" />
                            Ir al inicio
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
