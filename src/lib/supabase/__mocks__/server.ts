/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient: createSupabaseClient } = require("@supabase/supabase-js")
const dotenv = require("dotenv")
const path = require("path")

// Define global property
declare global {
    var TEST_USER_ID: string | undefined
}

export const createClient = () => {
    // Load .env.local manually since Next.js loadEnvConfig might not run in Jest environment same way
    dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Supabase credentials missing in test environment")
    }

    // Return a REAL Supabase client (Service Role)
    const admin = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    // Mock getUser to look at global.TEST_USER_ID
    admin.auth.getUser = jest.fn().mockImplementation(async () => {
        if (global.TEST_USER_ID) {
            return { data: { user: { id: global.TEST_USER_ID } }, error: null }
        }
        return { data: { user: null }, error: { message: "No user" } }
    })

    return admin
}
