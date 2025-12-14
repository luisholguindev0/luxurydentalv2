export const BUSINESS_HOURS = {
    0: null, // Sunday - Closed
    1: { open: 8, close: 18 }, // Monday
    2: { open: 8, close: 18 }, // Tuesday
    3: { open: 8, close: 18 }, // Wednesday
    4: { open: 8, close: 18 }, // Thursday
    5: { open: 8, close: 18 }, // Friday
    6: { open: 8, close: 14 }, // Saturday
} as const

/**
 * Validate that appointment time is within business hours
 */
export function validateBusinessHours(startTime: Date, endTime: Date): { valid: boolean; error?: string } {
    const dayOfWeek = startTime.getDay() as keyof typeof BUSINESS_HOURS
    const hours = BUSINESS_HOURS[dayOfWeek]

    if (!hours) {
        return { valid: false, error: "No se pueden agendar citas los domingos" }
    }

    const startHour = startTime.getHours() + startTime.getMinutes() / 60
    const endHour = endTime.getHours() + endTime.getMinutes() / 60

    if (startHour < hours.open) {
        return { valid: false, error: `La clínica abre a las ${hours.open}:00` }
    }

    if (endHour > hours.close) {
        return { valid: false, error: `La clínica cierra a las ${hours.close}:00` }
    }

    return { valid: true }
}
