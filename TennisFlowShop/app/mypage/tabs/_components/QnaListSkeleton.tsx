import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function QnaListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">문의 내역을 불러오는 중입니다.</span>
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={`qna-list-loading-${index}`}
          variant="feature"
          className="overflow-hidden border-brand-highlight/25 shadow-soft"
        >
          <CardContent className="p-0">
            <div className="border-b border-brand-highlight/20 bg-brand-highlight-muted p-4 bp-sm:p-5">
              <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <Skeleton className="h-11 w-11 shrink-0 rounded-control" />
                  <div className="min-w-0 space-y-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-64 max-w-full" />
                  </div>
                </div>
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
            </div>
            <div className="space-y-4 p-4 bp-sm:p-5">
              <div className="grid gap-3 bp-sm:grid-cols-[1fr_auto] bp-sm:items-center">
                <div className="rounded-control border border-border/70 bg-card p-3">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="mt-2 h-4 w-32 max-w-full" />
                </div>
                <Skeleton className="h-9 w-full rounded-lg bp-sm:w-28" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
