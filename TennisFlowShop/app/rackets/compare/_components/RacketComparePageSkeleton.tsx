import { Skeleton } from "@/components/ui/skeleton";

export default function RacketComparePageSkeleton() {
  return (
    <div className="space-y-6">
      <p className="sr-only" role="status" aria-live="polite">라켓 비교 화면을 불러오는 중입니다.</p>
      <div aria-hidden="true" className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm bp-sm:p-6">
          <Skeleton className="h-4 w-36" /><Skeleton className="mt-3 h-8 w-40" /><Skeleton className="mt-3 h-4 w-full max-w-xl" />
          <div className="mt-4 grid grid-cols-2 gap-2 bp-sm:flex"><Skeleton className="h-10 w-full bp-sm:w-32" /><Skeleton className="h-10 w-full bp-sm:w-28" /></div>
        </section>
        <Skeleton className="h-16 rounded-xl" />
        <div className="space-y-4 bp-md:hidden">
          <div className="flex gap-3 overflow-hidden"><Skeleton className="h-56 min-w-[220px] rounded-xl" /><Skeleton className="h-56 min-w-[220px] rounded-xl" /></div>
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
        <div className="hidden rounded-xl border border-border bg-card p-4 bp-md:block">
          <div className="grid grid-cols-[150px_repeat(3,minmax(180px,1fr))] gap-3">
            {Array.from({ length: 32 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
