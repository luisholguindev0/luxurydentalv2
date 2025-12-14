"use client"

import { useActionState } from "react"
import Link from "next/link"
import { resetPassword, type AuthState } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, CheckCircle, AlertCircle } from "lucide-react"

const initialState: AuthState = {}

export default function ResetPasswordPage() {
    const [state, formAction, pending] = useActionState(resetPassword, initialState)

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

                {/* Card */}
                <div className="bg-luxury-card border border-white/10 rounded-xl p-8 shadow-xl">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-semibold text-text-primary">
                            Nueva Contraseña
                        </h2>
                        <p className="text-sm text-text-muted mt-1">
                            Ingresa tu nueva contraseña
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
                    {state.success ? (
                        <div className="text-center space-y-4">
                            <div className="p-4 bg-luxury-success/10 border border-luxury-success/30 rounded-lg flex flex-col items-center gap-2 text-luxury-success">
                                <CheckCircle className="h-8 w-8" />
                                <p className="font-medium">{state.success}</p>
                            </div>
                            <Link
                                href="/login"
                                className="inline-block"
                            >
                                <Button className="w-full">
                                    Ir a Iniciar Sesión
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <form action={formAction} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Nueva Contraseña</Label>
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
                                disabled={pending}
                            >
                                {pending ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-4 w-4 border-2 border-luxury-darker/30 border-t-luxury-darker rounded-full animate-spin" />
                                        Actualizando...
                                    </span>
                                ) : (
                                    "Actualizar Contraseña"
                                )}
                            </Button>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-text-muted mt-8">
                    © {new Date().getFullYear()} LuxuryDental. Todos los derechos reservados.
                </p>
            </div>
        </div>
    )
}
