import { Calendar } from "lucide-react"

export default function AdminDashboard() {
    return (
        <div className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl font-semibold text-text-primary mb-6">
                    Dashboard
                </h1>

                {/* Placeholder cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-6 rounded-xl bg-luxury-card border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-luxury-gold/10">
                                <Calendar className="h-6 w-6 text-luxury-gold" />
                            </div>
                            <div>
                                <p className="text-sm text-text-muted">Citas Hoy</p>
                                <p className="text-2xl font-semibold text-text-primary">0</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-xl bg-luxury-card border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-500/10">
                                <Calendar className="h-6 w-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-text-muted">Por Confirmar</p>
                                <p className="text-2xl font-semibold text-text-primary">0</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-xl bg-luxury-card border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-luxury-success/10">
                                <Calendar className="h-6 w-6 text-luxury-success" />
                            </div>
                            <div>
                                <p className="text-sm text-text-muted">Completadas</p>
                                <p className="text-2xl font-semibold text-text-primary">0</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-xl bg-luxury-card border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-orange-500/10">
                                <Calendar className="h-6 w-6 text-orange-400" />
                            </div>
                            <div>
                                <p className="text-sm text-text-muted">No Shows</p>
                                <p className="text-2xl font-semibold text-text-primary">0</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 p-8 rounded-xl bg-luxury-card border border-white/10 text-center">
                    <p className="text-text-muted">
                        Dashboard widgets se implementarán en Phase 4
                    </p>
                </div>
            </div>
        </div>
    )
}
