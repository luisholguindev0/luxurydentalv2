"use client"

import Link from "next/link"
import { useSearchParams, usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function Pagination({ totalPages }: { totalPages: number }) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const currentPage = Number(searchParams.get("page")) || 1

    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams)
        params.set("page", pageNumber.toString())
        return `${pathname}?${params.toString()}`
    }

    if (totalPages <= 1) return null

    const buttonClass = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 border border-white/10 text-white hover:bg-white/5 h-9 w-9 p-0"
    const disabledClass = "pointer-events-none opacity-50"

    return (
        <div className="flex items-center justify-center gap-4 mt-6 bg-luxury-card/50 p-2 rounded-xl w-fit mx-auto border border-white/5">
            <Link
                href={createPageURL(currentPage - 1)}
                className={cn(buttonClass, currentPage <= 1 && disabledClass)}
                aria-disabled={currentPage <= 1}
                aria-label="Página anterior"
            >
                <ChevronLeft className="h-4 w-4" />
            </Link>

            <span className="text-sm text-text-muted font-mono min-w-[3rem] text-center">
                {currentPage} <span className="text-white/20">/</span> {totalPages}
            </span>

            <Link
                href={createPageURL(currentPage + 1)}
                className={cn(buttonClass, currentPage >= totalPages && disabledClass)}
                aria-disabled={currentPage >= totalPages}
                aria-label="Página siguiente"
            >
                <ChevronRight className="h-4 w-4" />
            </Link>
        </div>
    )
}
