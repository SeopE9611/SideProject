import { PublicPageHero } from "@/components/public";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background pb-10" aria-busy="true" aria-live="polite">
      <PublicPageHero
        variant="feature"
        eyebrow="개인결제"
        title="결제 정보를 불러오고 있습니다"
        description="잠시만 기다려 주세요."
      />
      <div className="mx-auto max-w-2xl space-y-5 px-4 pt-6">
        <section className="rounded-panel border border-border/80 bg-card p-5 shadow-soft sm:p-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-3 h-7 w-2/3" />
          <Skeleton className="mt-6 h-24 w-full rounded-control" />
        </section>
        <section className="rounded-panel border border-border/80 bg-card p-5 shadow-soft sm:p-6">
          <Skeleton className="h-5 w-28" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="mt-2 h-12 w-full rounded-control" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-6 h-12 w-full rounded-control" />
        </section>
      </div>
      <p className="sr-only">개인결제 정보를 불러오는 중입니다.</p>
    </main>
  );
}
