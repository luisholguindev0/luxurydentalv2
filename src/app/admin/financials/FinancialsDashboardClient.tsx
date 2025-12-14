"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { TransactionForm } from "@/components/features/financials/TransactionForm"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export function FinancialsDashboardClient() {
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()

    const handleSuccess = () => {
        setIsOpen(false)
        router.refresh()
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Transacción
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Registrar Transacción</DialogTitle>
                </DialogHeader>
                <TransactionForm
                    onSuccess={handleSuccess}
                    onCancel={() => setIsOpen(false)}
                />
            </DialogContent>
        </Dialog>
    )
}
