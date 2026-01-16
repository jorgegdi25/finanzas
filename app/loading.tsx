import { SkeletonDashboard } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div className="min-h-screen bg-[#07090D] p-6">
            <SkeletonDashboard />
        </div>
    );
}
