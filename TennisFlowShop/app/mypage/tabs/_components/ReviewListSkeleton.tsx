import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">후기 내역을 불러오는 중입니다.</span>
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={`review-list-loading-${index}`}
          variant="interactive"
          className="overflow-hidden rounded-panel border-border/80 bg-card shadow-soft"
        >
          <CardContent className="space-y-4 p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <Skeleton className="h-14 w-14 shrink-0 rounded-control" />
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-5 w-48 max-w-full" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 xs:grid-cols-3 sm:flex sm:justify-end">
                <Skeleton className="h-9 w-full rounded-lg sm:w-20" />
                <Skeleton className="h-9 w-full rounded-lg sm:w-16" />
                <Skeleton className="h-9 w-full rounded-lg sm:w-16" />
              </div>
            </div>

            <div className="rounded-control border border-border/70 bg-muted/20 p-3 md:p-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-11/12" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: 3 }).map((__, photoIndex) => (
                  <Skeleton key={`review-photo-loading-${index}-${photoIndex}`} className="aspect-square rounded-md" />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-4 w-28" />
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-9 w-28 rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
