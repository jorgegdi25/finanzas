// Componentes de Skeleton para estados de carga
export function SkeletonLine({ className = '' }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-white/10 rounded ${className}`} />
    );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-[#12161F] border border-white/5 rounded-xl p-5 ${className}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="space-y-2 flex-1">
                    <SkeletonLine className="h-5 w-3/4" />
                    <SkeletonLine className="h-3 w-1/2" />
                </div>
                <SkeletonLine className="h-6 w-16 rounded-full" />
            </div>
            <SkeletonLine className="h-8 w-1/3 mt-4" />
        </div>
    );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="bg-[#12161F] border border-white/10 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-black/20">
                <SkeletonLine className="h-4 w-32" />
            </div>
            <div className="divide-y divide-white/5">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="p-4 flex items-center gap-4">
                        <SkeletonLine className="h-4 w-24" />
                        <SkeletonLine className="h-4 w-32" />
                        <SkeletonLine className="h-4 w-20" />
                        <div className="flex-1" />
                        <SkeletonLine className="h-4 w-24" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SkeletonDashboard() {
    return (
        <div className="space-y-4 animate-pulse">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <SkeletonLine className="h-3 w-24" />
                    <SkeletonLine className="h-7 w-48" />
                </div>
                <SkeletonLine className="h-10 w-40 rounded-lg" />
            </div>

            {/* Total Card */}
            <div className="bg-[#12161F] border border-white/10 rounded-xl p-5">
                <SkeletonLine className="h-3 w-28 mb-2" />
                <SkeletonLine className="h-10 w-48" />
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-[#12161F] border border-white/10 rounded-xl p-4">
                        <SkeletonLine className="h-3 w-24 mb-2" />
                        <SkeletonLine className="h-8 w-32" />
                    </div>
                ))}
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SkeletonCard />
                <SkeletonCard />
            </div>
        </div>
    );
}

export function SkeletonList({ items = 3 }: { items?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: items }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}
