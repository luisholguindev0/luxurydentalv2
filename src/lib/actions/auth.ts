"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { z } from "zod"

// Validation schemas
const loginSchema = z.object({
    email: z.email("Email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

const registerSchema = z.object({
    email: z.email("Email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
})

const forgotPasswordSchema = z.object({
    email: z.email("Email inválido"),
})

const resetPasswordSchema = z.object({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

export type AuthState = {
    error?: string
    success?: string
}

/**
 * Sign in with email and password
 */
export async function signIn(
    prevState: AuthState,
    formData: FormData
): Promise<AuthState> {
    const supabase = await createClient()

    const rawData = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    }

    const parsed = loginSchema.safeParse(rawData)
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
    })

    if (error) {
        console.error("[Auth] Sign in error:", error.message)
        if (error.message.includes("Invalid login credentials")) {
            return { error: "Email o contraseña incorrectos" }
        }
        return { error: error.message }
    }

    // Redirect is handled by revalidation
    redirect("/admin")
}

/**
 * Sign up with email and password
 */
export async function signUp(
    prevState: AuthState,
    formData: FormData
): Promise<AuthState> {
    const supabase = await createClient()

    const rawData = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        fullName: formData.get("fullName") as string,
    }

    const parsed = registerSchema.safeParse(rawData)
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
            data: {
                full_name: parsed.data.fullName,
            },
        },
    })

    if (error) {
        console.error("[Auth] Sign up error:", error.message)
        if (error.message.includes("already registered")) {
            return { error: "Este email ya está registrado" }
        }
        return { error: error.message }
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
        return { success: "Revisa tu email para confirmar tu cuenta" }
    }

    redirect("/admin")
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/login")
}

/**
 * Request password reset
 */
export async function forgotPassword(
    prevState: AuthState,
    formData: FormData
): Promise<AuthState> {
    const supabase = await createClient()

    const rawData = {
        email: formData.get("email") as string,
    }

    const parsed = forgotPasswordSchema.safeParse(rawData)
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    })

    if (error) {
        console.error("[Auth] Forgot password error:", error.message)
        return { error: error.message }
    }

    return { success: "Si el email existe, recibirás un enlace para restablecer tu contraseña" }
}

/**
 * Reset password with token
 */
export async function resetPassword(
    prevState: AuthState,
    formData: FormData
): Promise<AuthState> {
    const supabase = await createClient()

    const rawData = {
        password: formData.get("password") as string,
    }

    const parsed = resetPasswordSchema.safeParse(rawData)
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const { error } = await supabase.auth.updateUser({
        password: parsed.data.password,
    })

    if (error) {
        console.error("[Auth] Reset password error:", error.message)
        return { error: error.message }
    }

    return { success: "Contraseña actualizada correctamente" }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
}
