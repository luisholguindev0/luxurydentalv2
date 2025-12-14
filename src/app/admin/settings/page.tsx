import { getOrganization, getBusinessHours } from "@/lib/actions/organization"
import { getServices } from "@/lib/actions/services"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
    const [orgResult, hoursResult, servicesResult] = await Promise.all([
        getOrganization(),
        getBusinessHours(),
        getServices()
    ])

    const organization = orgResult.success ? orgResult.data : null
    const businessHours = hoursResult.success ? hoursResult.data : null
    const services = servicesResult.success ? servicesResult.data : []

    return (
        <SettingsClient
            organization={organization}
            businessHours={businessHours}
            services={services}
        />
    )
}
