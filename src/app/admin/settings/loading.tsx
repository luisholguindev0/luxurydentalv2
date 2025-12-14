import { FormSkeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
    return (
        <div className="flex flex-col h-full">
            {/* Header Skeleton */}
            <header className="flex-shrink-0 p-6 border-b border-white/10">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
                </div>
                {/* Tabs Skeleton */}
                <div className="mt-4 flex gap-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-10 w-28 bg-white/10 rounded-lg animate-pulse" />
                    ))}
                </div>
            </header>

            {/* Content Skeleton */}
            <div className="flex-1 p-6">
                <div className="max-w-3xl">
                    <div className="bg-luxury-card border border-white/10 rounded-xl p-6">
                        <FormSkeleton />
                    </div>
                </div>
            </div>
        </div>
    )
}
