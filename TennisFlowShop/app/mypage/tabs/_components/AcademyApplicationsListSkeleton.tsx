import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AcademyApplicationsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">클래스 신청 목록을 불러오는 중입니다.</span>
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={`academy-applications-loading-${index}`}
          variant="feature"
          className="overflow-hidden border-brand-highlight/25 shadow-soft"
        >
          <CardContent className="p-0">
            <div className="border-b border-brand-highlight/20 bg-brand-highlight-muted p-4 bp-sm:p-5">
              <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <Skeleton className="h-11 w-11 shrink-0 rounded-control" />
                  <div className="min-w-0 space-y-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-6 w-56 max-w-full" />
                  </div>
                </div>
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
            </div>
            <div className="space-y-4 p-4 bp-sm:p-5">
              <div className="grid grid-cols-1 gap-3 bp-sm:grid-cols-2">
                {Array.from({ length: 4 }).map((__, infoIndex) => (
                  <div
                    key={`academy-applications-loading-${index}-info-${infoIndex}`}
                    className="rounded-control border border-border/70 bg-card p-3"
                  >
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="mt-2 h-4 w-32 max-w-full" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 border-t border-border/60 pt-4 bp-sm:flex-row bp-sm:justify-end">
                <Skeleton className="h-9 w-full rounded-lg bp-sm:w-24" />
                <Skeleton className="h-9 w-full rounded-lg bp-sm:w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
