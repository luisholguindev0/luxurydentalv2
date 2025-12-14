import { Skeleton, StatCardSkeleton } from '@/components/ui/skeleton'

export default function FinancialsLoading() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-48" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        </div>
    )
}
