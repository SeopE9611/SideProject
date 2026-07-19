import { Skeleton } from "@/components/ui/skeleton";

type FinderRacketCardSkeletonProps = { count?: number };

export default function FinderRacketCardSkeleton({ count = 1 }: FinderRacketCardSkeletonProps) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <article
          key={index}
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          <div className="p-4 bp-sm:p-5">
            <div className="flex flex-col gap-4 bp-md:flex-row">
              <Skeleton className="aspect-[4/3] w-full shrink-0 rounded-xl bp-md:h-44 bp-md:w-44 bp-md:aspect-auto" />
              <div className="min-w-0 flex-1 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
                <Skeleton className="h-8 w-32" />
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-secondary/40 p-3 bp-sm:grid-cols-3 bp-xl:grid-cols-4">
                  {Array.from({ length: 7 }).map((__, specIndex) => (
                    <div key={specIndex} className="space-y-1.5">
                      <Skeleton className="h-3 w-10" />
                      <Skeleton className="h-4 w-14" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                </div>
                <div className="grid grid-cols-1 gap-2 bp-sm:grid-cols-2">
                  <Skeleton className="h-11 rounded-lg" />
                  <Skeleton className="h-11 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
