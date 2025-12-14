
import { getInventoryItems } from "@/lib/actions/inventory"
import { InventoryListClient } from "./inventory-list-client"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Inventario | LuxuryDental",
    description: "Gestión de stock e insumos",
}

export default async function InventoryPage() {
    const result = await getInventoryItems()
    const items = result.success && result.data ? result.data : []

    return <InventoryListClient initialItems={items} />
}
