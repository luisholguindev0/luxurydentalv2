"use client"

import { useState } from "react"
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
    LogOut,
    Menu,
    X
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const isActive = (href: string) => {
        if (href === "/admin") {
            return pathname === "/admin"
        }
        return pathname.startsWith(href)
    }

    return (
        <div className="flex h-screen bg-luxury-darker">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-luxury-dark border border-luxury-gold/20 rounded-lg text-luxury-gold hover:bg-luxury-card transition-colors"
                aria-label="Toggle menu"
            >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "w-64 flex flex-col bg-luxury-dark border-r border-white/10 z-40",
                "fixed lg:relative h-full transition-transform duration-300",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
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
                                onClick={() => setMobileMenuOpen(false)}
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
            <main className="flex-1 flex flex-col overflow-hidden w-full lg:w-auto">
                {children}
            </main>
        </div>
    )
}
