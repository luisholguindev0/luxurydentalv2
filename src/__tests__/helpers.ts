import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase credentials in .env.local")
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function createTestOrg() {
    // Generate a unique slug
    const suffix = Math.random().toString(36).substring(7)
    const slug = `test-org-${suffix}`

    const { data, error } = await supabaseAdmin
        .from("organizations")
        .insert({
            slug,
            name: `Test Org ${suffix}`,
            settings: {}
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function createTestService(orgId: string) {
    const { data, error } = await supabaseAdmin
        .from("services")
        .insert({
            organization_id: orgId,
            title: "Test Service",
            price: 100,
            duration_minutes: 30
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function createTestPatient(orgId: string) {
    const suffix = Math.random().toString(36).substring(7)
    const { data, error } = await supabaseAdmin
        .from("patients")
        .insert({
            organization_id: orgId,
            full_name: `Test Patient ${suffix}`,
            whatsapp_number: `+1555${Math.floor(Math.random() * 1000000)}`
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function cleanupTestOrg(orgId: string) {
    await supabaseAdmin.from("organizations").delete().eq("id", orgId)
}
