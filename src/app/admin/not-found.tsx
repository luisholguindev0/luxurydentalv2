import Link from 'next/link'
import { LayoutDashboard, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminNotFound() {
    return (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="p-4 bg-luxury-card rounded-full border border-luxury-gold/10">
                        <FileQuestion className="w-12 h-12 text-luxury-gold/60" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-4xl font-serif text-luxury-gold">404</h1>
                    <h2 className="text-xl font-serif text-text-primary">
                        Página no encontrada
                    </h2>
                    <p className="text-text-secondary">
                        Esta sección del panel administrativo no existe.
                    </p>
                </div>

                <Link href="/admin">
                    <Button className="gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        Ir al panel principal
                    </Button>
                </Link>
            </div>
        </div>
    )
}
