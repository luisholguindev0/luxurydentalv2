import { getPatients } from "@/lib/actions/patients"
import { PatientsListClient } from "./patients-list-client"

export default async function PatientsPage() {
    const result = await getPatients()
    const patients = result.success ? result.data : []

    return <PatientsListClient initialPatients={patients} />
}
