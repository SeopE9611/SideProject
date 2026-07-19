import { PublicPageHero } from "@/components/public";
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <main className="min-h-screen bg-background pb-10" aria-busy="true" aria-live="polite">
      <PublicPageHero
        variant="feature"
        eyebrow="대여 반납"
        title="반납 운송장을 불러오는 중입니다"
        description="잠시만 기다려 주세요."
      />
      <div className="mx-auto max-w-2xl space-y-5 px-4 pt-6">
        <section className="rounded-panel border border-border/80 bg-muted/40 p-5 shadow-soft">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-3 h-4 w-full" />
        </section>
        <section className="rounded-panel border border-border/80 bg-card p-5 shadow-soft">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="mb-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-2 h-12 w-full rounded-control" />
            </div>
          ))}
          <Skeleton className="h-12 w-full rounded-control" />
        </section>
      </div>
      <p className="sr-only">반납 운송장 화면을 불러오는 중입니다.</p>
    </main>
  );
}
