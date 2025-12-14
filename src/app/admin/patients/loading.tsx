import { TableSkeleton } from "@/components/ui/skeleton"

export default function PatientsLoading() {
    return (
        <div className="flex flex-col h-full">
            {/* Header Skeleton */}
            <header className="flex-shrink-0 p-6 border-b border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                    </div>
                    <div className="h-10 w-40 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="mt-4 h-10 w-80 bg-white/10 rounded animate-pulse" />
            </header>

            {/* Table Skeleton */}
            <div className="flex-1 p-6">
                <TableSkeleton rows={8} />
            </div>
        </div>
    )
}
