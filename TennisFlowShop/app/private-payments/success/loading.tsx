import { PublicPageHero } from "@/components/public";
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <main className="min-h-screen bg-background pb-10" aria-busy="true" aria-live="polite">
      <PublicPageHero
        variant="feature"
        eyebrow="개인결제"
        title="결제 결과를 확인하고 있습니다"
        description="잠시만 기다려 주세요."
      />
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <section className="rounded-panel border border-border/80 bg-card p-5 shadow-soft">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <Skeleton className="mx-auto mt-5 h-7 w-48" />
          <Skeleton className="mx-auto mt-3 h-4 w-64" />
          <div className="mt-6 space-y-3 rounded-control border border-border bg-muted/40 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-5 w-full" />
            ))}
          </div>
        </section>
      </div>
      <p className="sr-only">결제 결과를 불러오는 중입니다.</p>
    </main>
  );
}
