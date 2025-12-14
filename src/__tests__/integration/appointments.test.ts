import { jest, describe, beforeAll, afterAll, it, expect } from "@jest/globals"
import { SupabaseClient } from "@supabase/supabase-js"

// Define global property
declare global {
    var TEST_USER_ID: string | undefined
}

import { createTestOrg, cleanupTestOrg, createTestService, createTestPatient, supabaseAdmin } from "../helpers"

import { createAppointmentInternal, getAvailableSlotsInternal } from "../../lib/actions/appointments"

// --- MOCKS ---

// 1. Mock Next.js Cache
jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
}))

// --- TESTS ---

describe("Appointments Integration (E2E Logic)", () => {
    let orgId: string
    let serviceId: string
    let patientId: string

    beforeAll(async () => {
        // Setup Test Data in Real DB
        const org = await createTestOrg()
        orgId = org.id

        const service = await createTestService(orgId)
        serviceId = service.id

        const patient = await createTestPatient(orgId)
        patientId = patient.id

        // Create a real user in Auth system for this test run
        const email = `test-user-${Date.now()}@test.com`
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: "password123",
            email_confirm: true
        })
        if (userError) throw userError

        const userId = userData.user.id
        global.TEST_USER_ID = userId

        // Link user to Org in admin_users
        const { error: linkError } = await supabaseAdmin
            .from("admin_users")
            .insert({
                id: userId,
                organization_id: orgId,
                full_name: "Test User",
                role: "dentist"
            })
        if (linkError) throw linkError


    })

    afterAll(async () => {
        // Cleanup user
        if (global.TEST_USER_ID) {
            await supabaseAdmin.auth.admin.deleteUser(global.TEST_USER_ID)
        }
        await cleanupTestOrg(orgId)
    })

    describe("Business Hours & Conflicts", () => {
        it("should prevent appointments outside business hours (Sunday)", async () => {
            // Next Sunday
            const sunday = new Date()
            sunday.setDate(sunday.getDate() + (7 - sunday.getDay()))
            sunday.setHours(10, 0, 0, 0)

            const startStr = sunday.toISOString()
            const endStr = new Date(sunday.getTime() + 30 * 60000).toISOString()

            const result = await createAppointmentInternal(
                supabaseAdmin as unknown as SupabaseClient,
                orgId,
                {
                    patient_id: patientId,
                    service_id: serviceId,
                    start_time: startStr,
                    end_time: endStr,
                }
            )

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error).toContain("domingos")
            }
        })

        it("should create a valid appointment", async () => {
            // Monday at 10 AM
            const monday = new Date()
            monday.setDate(monday.getDate() + (1 + 7 - monday.getDay()) % 7)
            if (monday.getDay() !== 1) monday.setDate(monday.getDate() + 7)
            monday.setHours(10, 0, 0, 0)

            const startStr = monday.toISOString()
            const endStr = new Date(monday.getTime() + 30 * 60000).toISOString()

            const result = await createAppointmentInternal(
                supabaseAdmin as unknown as SupabaseClient,
                orgId,
                {
                    patient_id: patientId,
                    service_id: serviceId,
                    start_time: startStr,
                    end_time: endStr,
                    notes: "E2E Test Appointment"
                },
                () => { } // No-op revalidate
            )

            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.status).toBe("scheduled")
            }
        })

        it("should detect conflicts with existing appointment", async () => {
            // Re-use the Monday 10 AM slot from above
            const monday = new Date()
            monday.setDate(monday.getDate() + (1 + 7 - monday.getDay()) % 7)
            if (monday.getDay() !== 1) monday.setDate(monday.getDate() + 7)
            monday.setHours(10, 0, 0, 0)

            const startStr = monday.toISOString()
            const endStr = new Date(monday.getTime() + 30 * 60000).toISOString()

            const result = await createAppointmentInternal(
                supabaseAdmin as unknown as SupabaseClient,
                orgId,
                {
                    patient_id: patientId,
                    service_id: serviceId,
                    start_time: startStr,
                    end_time: endStr,
                }
            )

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error).toMatch(/t exists|cita en este horario/i)
            }
        })

        it("should allow adjacent appointments", async () => {
            // Monday 10:30 AM
            const monday = new Date()
            monday.setDate(monday.getDate() + (1 + 7 - monday.getDay()) % 7)
            if (monday.getDay() !== 1) monday.setDate(monday.getDate() + 7)
            monday.setHours(10, 30, 0, 0)

            const startStr = monday.toISOString()
            const endStr = new Date(monday.getTime() + 30 * 60000).toISOString()

            const result = await createAppointmentInternal(
                supabaseAdmin as unknown as SupabaseClient,
                orgId,
                {
                    patient_id: patientId,
                    service_id: serviceId,
                    start_time: startStr,
                    end_time: endStr,
                }
            )

            expect(result.success).toBe(true)
        })
    })

    describe("Availability Calculation", () => {
        it("should correctly identify taken slots", async () => {
            // Monday
            const monday = new Date()
            monday.setDate(monday.getDate() + (1 + 7 - monday.getDay()) % 7)
            if (monday.getDay() !== 1) monday.setDate(monday.getDate() + 7)
            monday.setHours(12, 0, 0, 0) // Safe midday time

            const result = await getAvailableSlotsInternal(
                supabaseAdmin as unknown as SupabaseClient,
                orgId,
                monday.toISOString()
            )

            expect(result.success).toBe(true)
            if (result.success) {
                const slots = result.data

                // console.log("Generated Slots:", JSON.stringify(slots, null, 2))

                // 10:00 should be UNAVAILABLE (conflict)
                const slot10 = slots.find(s => {
                    const d = new Date(s.time)
                    return d.getHours() === 10 && d.getMinutes() === 0
                })
                expect(slot10).toBeDefined()
                expect(slot10?.available).toBe(false)

                // 10:30 should be UNAVAILABLE (adjacent booked)
                const slot1030 = slots.find(s => {
                    const d = new Date(s.time)
                    return d.getHours() === 10 && d.getMinutes() === 30
                })
                expect(slot1030).toBeDefined()
                expect(slot1030?.available).toBe(false)

                // 11:00 should be AVAILABLE
                const slot11 = slots.find(s => {
                    const d = new Date(s.time)
                    return d.getHours() === 11 && d.getMinutes() === 0
                })
                expect(slot11).toBeDefined()
                expect(slot11?.available).toBe(true)
            }
        })
    })
})
