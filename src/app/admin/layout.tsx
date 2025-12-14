"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Calendar,
    Users,
    UserPlus,
    DollarSign,
    Package,
    Settings,
    MessageSquare,
    LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAVIGATION = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Citas", href: "/admin/appointments", icon: Calendar },
    { name: "Pacientes", href: "/admin/patients", icon: Users },
    { name: "Leads", href: "/admin/leads", icon: UserPlus },
    { name: "Finanzas", href: "/admin/financials", icon: DollarSign },
    { name: "Inventario", href: "/admin/inventory", icon: Package },
    { name: "Mensajes", href: "/admin/messages", icon: MessageSquare },
    { name: "Configuración", href: "/admin/settings", icon: Settings },
] as const

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    const isActive = (href: string) => {
        if (href === "/admin") {
            return pathname === "/admin"
        }
        return pathname.startsWith(href)
    }

    return (
        <div className="flex h-screen bg-luxury-darker">
            {/* Sidebar */}
            <aside className="w-64 flex flex-col bg-luxury-dark border-r border-white/10">
                {/* Logo */}
                <div className="p-6 border-b border-white/10">
                    <h1 className="text-xl font-serif tracking-wide">
                        <span className="text-luxury-gold">Luxury</span>
                        <span className="text-text-primary">Dental</span>
                    </h1>
                    <p className="text-xs text-text-muted mt-1">Panel de Administración</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {NAVIGATION.map((item) => {
                        const Icon = item.icon
                        const active = isActive(item.href)

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                    active
                                        ? "bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/30"
                                        : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                                )}
                            >
                                <Icon className="h-5 w-5 shrink-0" />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/10">
                    <button
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-text-muted hover:bg-white/5 hover:text-luxury-danger transition-colors"
                        onClick={() => {
                            // TODO: Implement logout
                        }}
                    >
                        <LogOut className="h-5 w-5" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {children}
            </main>
        </div>
    )
}
