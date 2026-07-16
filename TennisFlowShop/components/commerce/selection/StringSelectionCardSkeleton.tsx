import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StringSelectionCardSkeletonProps = {
  viewMode: "grid" | "list";
  count?: number;
};

export function StringSelectionCardSkeleton({ viewMode, count = 8 }: StringSelectionCardSkeletonProps) {
  return (
    <div aria-hidden="true" className={cn("grid gap-4", viewMode === "grid" ? "grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 bp-2xl:grid-cols-4" : "grid-cols-1")}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-sm", viewMode === "list" && "bp-md:grid bp-md:grid-cols-[210px_minmax(0,1fr)_200px]")}>
          <Skeleton className={cn("w-full rounded-none", viewMode === "list" ? "aspect-[5/4] bp-md:h-full bp-md:min-h-[220px]" : "aspect-[5/4]")} />
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-28" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
            </div>
            <Skeleton className="h-11 w-full rounded-control" />
          </div>
          <div className="space-y-2 p-4 bp-md:self-end">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
