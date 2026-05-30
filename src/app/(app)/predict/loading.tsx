import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-44" />
      <div className="space-y-8">
        {[1, 2].map((group) => (
          <div key={group}>
            <Skeleton className="mb-3 h-6 w-52" />
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
