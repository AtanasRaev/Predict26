import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-32 mb-6" />
      <div className="space-y-8">
        {[1, 2].map((g) => (
          <div key={g}>
            <Skeleton className="h-6 w-40 mb-3" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
