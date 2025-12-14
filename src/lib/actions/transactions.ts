"use server"

import { createClient } from "@/lib/supabase/server"
import { getOrgId, handleActionError, revalidatePaths, type ActionResult } from "./base"
import { transactionCreateSchema, transactionUpdateSchema, type TransactionCreateInput, type TransactionUpdateInput } from "@/lib/validations/schemas"
import type { Tables, Enums } from "@/types/database"

type Transaction = Tables<"transactions">
type TransactionType = Enums<"transaction_type">

// Extended transaction type with patient info for display
export type TransactionWithPatient = Transaction & {
    patient: { full_name: string } | null
}

// Financial summary type
export type FinancialSummary = {
    totalIncome: number
    totalExpenses: number
    totalPayments: number
    netRevenue: number
    transactionCount: number
}

// Monthly breakdown type
export type MonthlyBreakdown = {
    month: string
    year: number
    income: number
    expenses: number
    payments: number
    net: number
}

/**
 * Get all transactions for the current organization
 */
export async function getTransactions(options?: {
    limit?: number
    startDate?: string
    endDate?: string
    type?: TransactionType
    patientId?: string
}): Promise<ActionResult<TransactionWithPatient[]>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        let query = supabase
            .from("transactions")
            .select(`
                *,
                patient:patients(full_name)
            `)
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false })

        // Apply filters
        if (options?.limit) {
            query = query.limit(options.limit)
        }
        if (options?.startDate) {
            query = query.gte("created_at", options.startDate)
        }
        if (options?.endDate) {
            query = query.lte("created_at", options.endDate)
        }
        if (options?.type) {
            query = query.eq("type", options.type)
        }
        if (options?.patientId) {
            query = query.eq("patient_id", options.patientId)
        }

        const { data, error } = await query

        if (error) throw error

        return { success: true, data: (data ?? []) as TransactionWithPatient[] }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get a single transaction by ID
 */
export async function getTransactionById(id: string): Promise<ActionResult<TransactionWithPatient>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const { data, error } = await supabase
            .from("transactions")
            .select(`
                *,
                patient:patients(full_name)
            `)
            .eq("id", id)
            .eq("organization_id", orgId)
            .single()

        if (error) throw error
        if (!data) return { success: false, error: "Transacción no encontrada" }

        return { success: true, data: data as TransactionWithPatient }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Create a new transaction
 */
export async function createTransaction(input: TransactionCreateInput): Promise<ActionResult<Transaction>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        // Validate input
        const validated = transactionCreateSchema.safeParse(input)
        if (!validated.success) {
            return { success: false, error: validated.error.issues[0].message }
        }

        const { data, error } = await supabase
            .from("transactions")
            .insert({
                ...validated.data,
                organization_id: orgId,
            })
            .select()
            .single()

        if (error) throw error

        revalidatePaths(["/admin/financials"])
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Update an existing transaction
 */
export async function updateTransaction(id: string, input: TransactionUpdateInput): Promise<ActionResult<Transaction>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        // Validate input
        const validated = transactionUpdateSchema.safeParse(input)
        if (!validated.success) {
            return { success: false, error: validated.error.issues[0].message }
        }

        const { data, error } = await supabase
            .from("transactions")
            .update(validated.data)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single()

        if (error) throw error
        if (!data) return { success: false, error: "Transacción no encontrada" }

        revalidatePaths(["/admin/financials"])
        return { success: true, data }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(id: string): Promise<ActionResult<null>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("id", id)
            .eq("organization_id", orgId)

        if (error) throw error

        revalidatePaths(["/admin/financials"])
        return { success: true, data: null }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get financial summary for a date range
 */
export async function getFinancialSummary(options?: {
    startDate?: string
    endDate?: string
}): Promise<ActionResult<FinancialSummary>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        let query = supabase
            .from("transactions")
            .select("type, amount")
            .eq("organization_id", orgId)

        if (options?.startDate) {
            query = query.gte("created_at", options.startDate)
        }
        if (options?.endDate) {
            query = query.lte("created_at", options.endDate)
        }

        const { data, error } = await query

        if (error) throw error

        const transactions = data ?? []

        const summary: FinancialSummary = {
            totalIncome: 0,
            totalExpenses: 0,
            totalPayments: 0,
            netRevenue: 0,
            transactionCount: transactions.length,
        }

        for (const tx of transactions) {
            switch (tx.type) {
                case "income":
                    summary.totalIncome += tx.amount
                    break
                case "expense":
                    summary.totalExpenses += tx.amount
                    break
                case "payment":
                    summary.totalPayments += tx.amount
                    break
                // 'charge' is just a record, doesn't affect revenue
            }
        }

        summary.netRevenue = summary.totalIncome + summary.totalPayments - summary.totalExpenses

        return { success: true, data: summary }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get monthly breakdown for revenue chart
 */
export async function getMonthlyBreakdown(options?: {
    months?: number // How many months back to include (default 6)
}): Promise<ActionResult<MonthlyBreakdown[]>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const monthsBack = options?.months ?? 6
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - monthsBack + 1)
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)

        const { data, error } = await supabase
            .from("transactions")
            .select("type, amount, created_at")
            .eq("organization_id", orgId)
            .gte("created_at", startDate.toISOString())
            .order("created_at", { ascending: true })

        if (error) throw error

        const transactions = data ?? []

        // Group by month
        const monthlyMap = new Map<string, MonthlyBreakdown>()

        // Initialize all months
        for (let i = 0; i < monthsBack; i++) {
            const date = new Date()
            date.setMonth(date.getMonth() - monthsBack + 1 + i)
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
            monthlyMap.set(key, {
                month: monthNames[date.getMonth()],
                year: date.getFullYear(),
                income: 0,
                expenses: 0,
                payments: 0,
                net: 0,
            })
        }

        // Aggregate transactions
        for (const tx of transactions) {
            if (!tx.created_at) continue
            const date = new Date(tx.created_at)
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

            const entry = monthlyMap.get(key)
            if (!entry) continue

            switch (tx.type) {
                case "income":
                    entry.income += tx.amount
                    break
                case "expense":
                    entry.expenses += tx.amount
                    break
                case "payment":
                    entry.payments += tx.amount
                    break
            }
        }

        // Calculate net for each month
        for (const entry of monthlyMap.values()) {
            entry.net = entry.income + entry.payments - entry.expenses
        }

        return { success: true, data: Array.from(monthlyMap.values()) }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Get patient transaction history
 */
export async function getPatientTransactions(patientId: string): Promise<ActionResult<{
    transactions: TransactionWithPatient[]
    balance: number
    totalCharges: number
    totalPayments: number
}>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        const { data, error } = await supabase
            .from("transactions")
            .select(`
                *,
                patient:patients(full_name)
            `)
            .eq("organization_id", orgId)
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false })

        if (error) throw error

        const transactions = (data ?? []) as TransactionWithPatient[]

        let totalCharges = 0
        let totalPayments = 0

        for (const tx of transactions) {
            if (tx.type === "charge") {
                totalCharges += tx.amount
            } else if (tx.type === "payment") {
                totalPayments += tx.amount
            }
        }

        return {
            success: true,
            data: {
                transactions,
                balance: totalCharges - totalPayments,
                totalCharges,
                totalPayments,
            },
        }
    } catch (error) {
        return handleActionError(error)
    }
}

/**
 * Revenue forecast RPC (simple linear projection based on last 3 months)
 */
export async function getRevenueForecast(): Promise<ActionResult<{
    projectedMonthlyRevenue: number
    projectedQuarterlyRevenue: number
    averageMonthlyRevenue: number
    trend: "up" | "down" | "stable"
}>> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId()

        if (!orgId) {
            return { success: false, error: "No autorizado" }
        }

        // Get last 3 months of data
        const threeMonthsAgo = new Date()
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

        const { data, error } = await supabase
            .from("transactions")
            .select("type, amount, created_at")
            .eq("organization_id", orgId)
            .in("type", ["income", "payment"])
            .gte("created_at", threeMonthsAgo.toISOString())

        if (error) throw error

        const transactions = data ?? []

        // Group by month
        const monthlyRevenue: number[] = [0, 0, 0] // [2 months ago, 1 month ago, this month]

        for (const tx of transactions) {
            if (!tx.created_at) continue
            const date = new Date(tx.created_at)
            const monthsAgo = (new Date().getMonth() - date.getMonth() + 12) % 12

            if (monthsAgo < 3) {
                monthlyRevenue[2 - monthsAgo] += tx.amount
            }
        }

        const averageMonthlyRevenue = monthlyRevenue.reduce((a, b) => a + b, 0) / 3

        // Simple trend calculation
        let trend: "up" | "down" | "stable" = "stable"
        if (monthlyRevenue[2] > monthlyRevenue[0] * 1.1) {
            trend = "up"
        } else if (monthlyRevenue[2] < monthlyRevenue[0] * 0.9) {
            trend = "down"
        }

        // Simple projection (average with slight weight towards recent)
        const projectedMonthlyRevenue = (monthlyRevenue[2] * 0.5 + monthlyRevenue[1] * 0.3 + monthlyRevenue[0] * 0.2)

        return {
            success: true,
            data: {
                projectedMonthlyRevenue: Math.round(projectedMonthlyRevenue),
                projectedQuarterlyRevenue: Math.round(projectedMonthlyRevenue * 3),
                averageMonthlyRevenue: Math.round(averageMonthlyRevenue),
                trend,
            },
        }
    } catch (error) {
        return handleActionError(error)
    }
}
