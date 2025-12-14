"use client"

import { useActionState } from "react"
import Link from "next/link"
import { signUp, type AuthState } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle } from "lucide-react"

const initialState: AuthState = {}

export default function RegisterPage() {
    const [state, formAction, pending] = useActionState(signUp, initialState)

    return (
        <div className="min-h-screen bg-luxury-darker flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-serif tracking-wide">
                        <span className="text-luxury-gold">Luxury</span>
                        <span className="text-text-primary">Dental</span>
                    </h1>
                    <p className="text-text-muted mt-2">Panel de Administración</p>
                </div>

                {/* Register Card */}
                <div className="bg-luxury-card border border-white/10 rounded-xl p-8 shadow-xl">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-semibold text-text-primary">
                            Crear Cuenta
                        </h2>
                        <p className="text-sm text-text-muted mt-1">
                            Completa tus datos para registrarte
                        </p>
                    </div>

                    {/* Error Message */}
                    {state.error && (
                        <div className="mb-4 p-3 bg-luxury-danger/10 border border-luxury-danger/30 rounded-lg flex items-center gap-2 text-luxury-danger text-sm">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {state.error}
                        </div>
                    )}

                    {/* Success Message */}
                    {state.success && (
                        <div className="mb-4 p-3 bg-luxury-success/10 border border-luxury-success/30 rounded-lg flex items-center gap-2 text-luxury-success text-sm">
                            <CheckCircle className="h-4 w-4 shrink-0" />
                            {state.success}
                        </div>
                    )}

                    <form action={formAction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Nombre Completo</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    placeholder="Dr. Juan Pérez"
                                    className="pl-10"
                                    required
                                    autoComplete="name"
                                    minLength={2}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="tu@email.com"
                                    className="pl-10"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10"
                                    required
                                    autoComplete="new-password"
                                    minLength={6}
                                />
                            </div>
                            <p className="text-xs text-text-muted">
                                Mínimo 6 caracteres
                            </p>
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={pending || !!state.success}
                        >
                            {pending ? (
                                <span className="flex items-center gap-2">
                                    <div className="h-4 w-4 border-2 border-luxury-darker/30 border-t-luxury-darker rounded-full animate-spin" />
                                    Creando cuenta...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <UserPlus className="h-4 w-4" />
                                    Crear Cuenta
                                </span>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-text-muted">
                            ¿Ya tienes cuenta?{" "}
                            <Link
                                href="/login"
                                className="text-luxury-gold hover:text-luxury-gold-light transition-colors font-medium"
                            >
                                Inicia sesión
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-text-muted mt-8">
                    © {new Date().getFullYear()} LuxuryDental. Todos los derechos reservados.
                </p>
            </div>
        </div>
    )
}
