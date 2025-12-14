import { createServiceClient } from '@/lib/supabase/service-client'
import { headers } from 'next/headers'

/**
 * Rate limiter for API routes
 * Uses the rate_limits table to track requests
 */

interface RateLimitConfig {
    /**
     * Unique identifier for this rate limit (e.g., 'whatsapp-webhook')
     */
    key: string

    /**
     * Maximum number of requests allowed in the window
     */
    maxRequests: number

    /**
     * Time window in seconds
     */
    windowSeconds: number

    /**
     * Use IP address as part of the key (for per-IP limiting)
     */
    useIp?: boolean
}

interface RateLimitResult {
    allowed: boolean
    remaining: number
    resetAt: Date
}

export async function checkRateLimit(
    config: RateLimitConfig
): Promise<RateLimitResult> {
    const supabase = createServiceClient()
    const headersList = await headers()

    // Construct the rate limit key
    let rateLimitKey = config.key
    if (config.useIp) {
        const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
            headersList.get('x-real-ip') ||
            'unknown'
        rateLimitKey = `${config.key}:${ip}`
    }

    const now = new Date()

    try {
        // Get or create rate limit record
        const { data: existing } = await supabase
            .from('rate_limits')
            .select('*')
            .eq('key', rateLimitKey)
            .single()

        if (!existing) {
            // First request - create record
            await supabase.from('rate_limits').insert({
                key: rateLimitKey,
                count: 1,
                last_request_at: now.toISOString()
            })

            const resetAt = new Date(now.getTime() + config.windowSeconds * 1000)
            return {
                allowed: true,
                remaining: config.maxRequests - 1,
                resetAt
            }
        }

        // Check if the window has expired
        const lastRequest = new Date(existing.last_request_at || now)
        const windowExpired = (now.getTime() - lastRequest.getTime()) > (config.windowSeconds * 1000)

        if (windowExpired) {
            // Reset the counter
            await supabase
                .from('rate_limits')
                .update({
                    count: 1,
                    last_request_at: now.toISOString()
                })
                .eq('key', rateLimitKey)

            const resetAt = new Date(now.getTime() + config.windowSeconds * 1000)
            return {
                allowed: true,
                remaining: config.maxRequests - 1,
                resetAt
            }
        }

        // Check if under limit
        if ((existing.count || 0) < config.maxRequests) {
            // Increment counter
            await supabase
                .from('rate_limits')
                .update({
                    count: (existing.count || 0) + 1,
                    last_request_at: now.toISOString()
                })
                .eq('key', rateLimitKey)

            const resetAt = new Date(lastRequest.getTime() + config.windowSeconds * 1000)
            return {
                allowed: true,
                remaining: config.maxRequests - (existing.count || 0) - 1,
                resetAt
            }
        }

        // Rate limit exceeded
        const resetAt = new Date(lastRequest.getTime() + config.windowSeconds * 1000)
        return {
            allowed: false,
            remaining: 0,
            resetAt
        }

    } catch (error) {
        console.error('Rate limit check error:', error)
        // On error, allow the request (fail open)
        return {
            allowed: true,
            remaining: config.maxRequests,
            resetAt: new Date(now.getTime() + config.windowSeconds * 1000)
        }
    }
}

/**
 * Middleware helper for rate limiting
 * Returns a Response with 429 if rate limit exceeded
 */
export async function enforceRateLimit(
    config: RateLimitConfig
): Promise<Response | null> {
    const result = await checkRateLimit(config)

    if (!result.allowed) {
        return new Response(
            JSON.stringify({
                error: 'Demasiadas solicitudes',
                message: `Por favor intenta nuevamente después de ${Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)} segundos`,
                resetAt: result.resetAt.toISOString()
            }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': Math.ceil((result.resetAt.getTime() - Date.now()) / 1000).toString(),
                    'X-RateLimit-Limit': config.maxRequests.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': result.resetAt.toISOString()
                }
            }
        )
    }

    return null
}

/**
 * Preset rate limit configurations
 */
export const RateLimits = {
    /**
     * WhatsApp webhook: 100 requests per 10 seconds per IP
     */
    WHATSAPP_WEBHOOK: {
        key: 'whatsapp-webhook',
        maxRequests: 100,
        windowSeconds: 10,
        useIp: true
    },

    /**
     * User registration: 3 attempts per hour per IP
     */
    USER_REGISTRATION: {
        key: 'user-registration',
        maxRequests: 3,
        windowSeconds: 3600,
        useIp: true
    },

    /**
     * Password reset: 5 attempts per hour per IP
     */
    PASSWORD_RESET: {
        key: 'password-reset',
        maxRequests: 5,
        windowSeconds: 3600,
        useIp: true
    },

    /**
     * AI message processing: 30 per minute per organization
     */
    AI_PROCESSING: {
        key: 'ai-processing',
        maxRequests: 30,
        windowSeconds: 60,
        useIp: false
    }
} as const
