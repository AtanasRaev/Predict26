import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-40 mb-6" />
      <div className="border rounded-lg overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-3 border-b flex items-center gap-4">
            <Skeleton className="h-5 w-6" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-12 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
