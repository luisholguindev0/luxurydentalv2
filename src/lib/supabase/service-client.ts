import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Service Role Client
 * 
 * This client uses the SERVICE_ROLE_KEY which bypasses Row Level Security (RLS).
 * ⚠️ CAUTION: Only use this for:
 * - Cron jobs that need cross-org operations
 * - Admin operations that explicitly need to bypass RLS
 * - System-level operations
 * 
 * DO NOT use this for regular user-facing operations.
 */
export function createServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase environment variables for service client')
    }

    return createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}
