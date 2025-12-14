export default function MessagesLoading() {
    return (
        <div className="flex flex-col h-full">
            {/* Header Skeleton */}
            <header className="flex-shrink-0 p-6 border-b border-white/10">
                <div className="space-y-2">
                    <div className="h-8 w-36 bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Thread List Skeleton */}
                <div className="w-full md:w-80 lg:w-96 border-r border-white/10 flex flex-col">
                    <div className="p-4 border-b border-white/10">
                        <div className="h-10 bg-white/10 rounded animate-pulse" />
                    </div>
                    <div className="flex-1 p-4 space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="h-10 w-10 bg-white/10 rounded-full animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                                    <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                                    <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Message View Skeleton */}
                <div className="flex-1 hidden md:flex items-center justify-center bg-luxury-darker">
                    <div className="text-center space-y-2">
                        <div className="h-12 w-12 bg-white/10 rounded-full mx-auto animate-pulse" />
                        <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    )
}
