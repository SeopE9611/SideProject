import { Skeleton } from "@/components/ui/skeleton";

export default function PassListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      {Array.from({ length: 3 }).map((_, index) => (
        <section
          key={index}
          className="rounded-control border border-border/80 bg-card p-3.5"
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
          <div className="mt-3 grid gap-2 border-t border-border/60 pt-3 bp-sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
              <Skeleton className="h-2 w-full max-w-sm" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        </section>
      ))}
      <span className="sr-only">이용권 정보를 불러오는 중입니다.</span>
    </div>
  );
}
