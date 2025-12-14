import { Package, AlertTriangle } from "lucide-react"

export default function InventoryPage() {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-shrink-0 p-6 border-b border-white/10">
                <h1 className="text-2xl font-serif text-text-primary flex items-center gap-3">
                    <Package className="h-7 w-7 text-luxury-gold" />
                    Inventario
                </h1>
                <p className="text-text-muted text-sm mt-1">
                    Gestión de inventario y materiales
                </p>
            </header>

            {/* Content - Coming Soon */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-luxury-warning/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="h-8 w-8 text-luxury-warning" />
                    </div>
                    <h2 className="text-xl font-serif text-text-primary mb-2">
                        Módulo en Desarrollo
                    </h2>
                    <p className="text-text-muted mb-6">
                        El sistema de gestión de inventario está siendo desarrollado.
                        Próximamente podrás gestionar materiales, stock y alertas de reabastecimiento.
                    </p>
                    <div className="bg-luxury-card border border-white/10 rounded-xl p-4 text-left">
                        <h3 className="text-sm font-medium text-text-primary mb-2">Próximas funcionalidades:</h3>
                        <ul className="text-sm text-text-muted space-y-1">
                            <li>• Catálogo de materiales</li>
                            <li>• Control de stock</li>
                            <li>• Alertas de bajo inventario</li>
                            <li>• Historial de movimientos</li>
                            <li>• Reportes de consumo</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
