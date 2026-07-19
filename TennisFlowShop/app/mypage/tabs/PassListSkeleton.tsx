import { Skeleton } from "@/components/ui/skeleton";

export default function PassListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      {Array.from({ length: 3 }).map((_, index) => (
        <section
          key={index}
          className="rounded-panel border border-border/80 bg-card p-5 shadow-soft"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <Skeleton className="h-11 w-11 rounded-control" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="mt-5 rounded-control bg-brand-muted/40 p-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-3 h-2.5 w-full" />
            <Skeleton className="mt-3 h-4 w-36" />
          </div>
        </section>
      ))}
      <span className="sr-only">이용권 정보를 불러오는 중입니다.</span>
    </div>
  );
}
