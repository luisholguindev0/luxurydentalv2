export type DaySchedule = { open: number; close: number } | null
export type BusinessHoursConfig = Record<number, DaySchedule>

export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
    0: null, // Sunday - Closed
    1: { open: 8, close: 18 }, // Monday
    2: { open: 8, close: 18 }, // Tuesday
    3: { open: 8, close: 18 }, // Wednesday
    4: { open: 8, close: 18 }, // Thursday
    5: { open: 8, close: 18 }, // Friday
    6: { open: 8, close: 14 }, // Saturday
}

/**
 * Validate that appointment time is within business hours
 */
export function validateBusinessHours(
    startTime: Date,
    endTime: Date,
    config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS
): { valid: boolean; error?: string } {
    const dayOfWeek = startTime.getDay()
    const hours = config[dayOfWeek]

    if (!hours) {
        return { valid: false, error: "La clínica está cerrada este día" }
    }

    const startHour = startTime.getHours() + startTime.getMinutes() / 60
    const endHour = endTime.getHours() + endTime.getMinutes() / 60

    if (startHour < hours.open) {
        return { valid: false, error: `La clínica abre a las ${formatHour(hours.open)}` }
    }

    if (endHour > hours.close) {
        return { valid: false, error: `La clínica cierra a las ${formatHour(hours.close)}` }
    }

    return { valid: true }
}

function formatHour(decimalHour: number): string {
    const h = Math.floor(decimalHour)
    const m = Math.round((decimalHour - h) * 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}
