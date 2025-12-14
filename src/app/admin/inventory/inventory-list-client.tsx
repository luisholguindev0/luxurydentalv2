"use client"

import { useState } from "react"
import {
    Package,
    Plus,
    Search,
    AlertTriangle,
    Trash2,
    Edit,
    AlertCircle,
    Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { createInventoryItem, updateInventoryItem, deleteInventoryItem } from "@/lib/actions/inventory"
import type { Tables } from "@/types/database"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { inventoryItemCreateSchema } from "@/lib/validations/schemas"
import { z } from "zod"

type InventoryItem = Tables<"inventory_items">

interface InventoryListClientProps {
    initialItems: InventoryItem[]
}

export function InventoryListClient({ initialItems }: InventoryListClientProps) {
    const [items, setItems] = useState<InventoryItem[]>(initialItems)
    const [searchQuery, setSearchQuery] = useState("")
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const filteredItems = items.filter(
        (item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleDelete = async (id: string) => {
        if (!confirm("¿Está seguro que desea eliminar este ítem? Esta acción no se puede deshacer.")) {
            return
        }

        setIsDeleting(id)
        setError(null)

        const result = await deleteInventoryItem(id)

        if (result.success) {
            setItems((prev) => prev.filter((i) => i.id !== id))
        } else {
            setError(result.error || "Error al eliminar ítem")
        }

        setIsDeleting(null)
    }

    const handleSave = async (formData: FormData) => {
        setError(null)

        const rawData = {
            name: formData.get("name") as string,
            sku: formData.get("sku") as string,
            quantity: parseInt(formData.get("quantity") as string),
            min_stock_level: formData.get("min_stock_level") ? parseInt(formData.get("min_stock_level") as string) : undefined,
            unit: formData.get("unit") as string,
        }

        // Validate client-side first for immediate feedback (optional but good)
        const validation = inventoryItemCreateSchema.safeParse(rawData)
        if (!validation.success) {
            const firstError = validation.error.issues[0]?.message
            setError(firstError || "Error de validación")
            return
        }

        let result
        if (editingItem) {
            result = await updateInventoryItem(editingItem.id, rawData)
        } else {
            result = await createInventoryItem(rawData)
        }

        if (result.success) {
            if (editingItem) {
                setItems(prev => prev.map(i => i.id === result.data!.id ? result.data! : i))
            } else {
                setItems(prev => [result.data!, ...prev])
            }
            setIsDialogOpen(false)
            setEditingItem(null)
        } else {
            // Fix: Handle the error properly regardless of its structure
            let errorMessage = "Error al eliminar"
            if (!result.success && result.error) {
                errorMessage = result.error
            }
            setError(errorMessage)
        }
    }

    const openCreateDialog = () => {
        setEditingItem(null)
        setError(null)
        setIsDialogOpen(true)
    }

    const openEditDialog = (item: InventoryItem) => {
        setEditingItem(item)
        setError(null)
        setIsDialogOpen(true)
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-shrink-0 p-6 border-b border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-serif text-text-primary flex items-center gap-3">
                            <Package className="h-7 w-7 text-luxury-gold" />
                            Inventario
                        </h1>
                        <p className="text-text-muted text-sm mt-1">
                            {items.length} ítems en inventario
                        </p>
                    </div>

                    <Button onClick={openCreateDialog}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Ítem
                    </Button>
                </div>

                {/* Search */}
                <div className="mt-4 relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <Input
                        placeholder="Buscar por nombre o SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </header>

            {/* Error */}
            {error && (
                <div className="mx-6 mt-4 p-3 bg-luxury-danger/10 border border-luxury-danger/30 rounded-lg flex items-center gap-2 text-luxury-danger text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {filteredItems.length === 0 ? (
                    searchQuery ? (
                        <EmptyState
                            icon={Search}
                            title="Sin resultados"
                            description={`No se encontraron ítems con "${searchQuery}"`}
                            action={{
                                label: "Limpiar búsqueda",
                                onClick: () => setSearchQuery("")
                            }}
                        />
                    ) : (
                        <EmptyState
                            icon={Package}
                            title="Sin inventario"
                            description="Aún no hay materiales o productos registrados."
                            action={{
                                label: "Crear primer ítem",
                                onClick: openCreateDialog
                            }}
                        />
                    )
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredItems.map((item) => {
                            const isLowStock = item.min_stock_level !== null && item.quantity <= item.min_stock_level

                            return (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "bg-luxury-card border rounded-xl p-4 transition-all hover:border-luxury-gold/50 group",
                                        isLowStock ? "border-luxury-warning/50" : "border-white/10"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-medium text-text-primary text-lg">{item.name}</h3>
                                            {item.sku && (
                                                <p className="text-xs text-text-muted font-mono mt-1">SKU: {item.sku}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditDialog(item)}
                                                className="p-1.5 hover:bg-white/10 rounded-md text-text-muted hover:text-white"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                disabled={isDeleting === item.id}
                                                className="p-1.5 hover:bg-luxury-danger/10 rounded-md text-text-muted hover:text-luxury-danger"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between mt-4">
                                        <div>
                                            <p className="text-xs text-text-muted mb-1">Stock Actual</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className={cn(
                                                    "text-2xl font-mono font-bold",
                                                    isLowStock ? "text-luxury-warning" : "text-text-primary"
                                                )}>
                                                    {item.quantity}
                                                </span>
                                                {item.unit && (
                                                    <span className="text-sm text-text-muted">{item.unit}</span>
                                                )}
                                            </div>
                                        </div>

                                        {isLowStock && (
                                            <div className="flex items-center gap-1.5 text-luxury-warning text-xs bg-luxury-warning/10 px-2 py-1 rounded-full border border-luxury-warning/20">
                                                <AlertTriangle className="h-3 w-3" />
                                                <span>Bajo Stock (Min: {item.min_stock_level})</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Dialog Form */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? "Editar Ítem" : "Nuevo Ítem"}</DialogTitle>
                        <DialogDescription>
                            {editingItem ? "Modifica los detalles del producto o material." : "Agrega un nuevo producto o material al inventario."}
                        </DialogDescription>
                    </DialogHeader>

                    <form action={handleSave} className="space-y-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre del producto *</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={editingItem?.name}
                                placeholder="Ej: Anestesia Local"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="sku">SKU / Código</Label>
                                <Input
                                    id="sku"
                                    name="sku"
                                    defaultValue={editingItem?.sku || ""}
                                    placeholder="Ej: AN-001"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="unit">Unidad</Label>
                                <Input
                                    id="unit"
                                    name="unit"
                                    defaultValue={editingItem?.unit || ""}
                                    placeholder="Ej: Ampollas, Cajas"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="quantity">Cantidad Actual *</Label>
                                <Input
                                    id="quantity"
                                    name="quantity"
                                    type="number"
                                    min="0"
                                    defaultValue={editingItem?.quantity ?? 0}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="min_stock_level">Alerta Stock Mínimo</Label>
                                <Input
                                    id="min_stock_level"
                                    name="min_stock_level"
                                    type="number"
                                    min="0"
                                    defaultValue={editingItem?.min_stock_level ?? 5}
                                    placeholder="Opcional"
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="primary" className="bg-gradient-to-r from-luxury-gold to-yellow-600 text-black border-none hover:opacity-90">
                                {editingItem ? "Guardar Cambios" : "Crear Ítem"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
