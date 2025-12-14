import { TableSkeleton } from "@/components/ui/skeleton"

export default function LeadsLoading() {
    return (
        <div className="flex flex-col h-full">
            {/* Header Skeleton */}
            <header className="flex-shrink-0 p-6 border-b border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
                        <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                    </div>
                    <div className="h-10 w-36 bg-white/10 rounded animate-pulse" />
                </div>
                {/* Stats Skeleton */}
                <div className="mt-4 flex flex-wrap gap-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-8 w-24 bg-white/10 rounded-full animate-pulse" />
                    ))}
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
