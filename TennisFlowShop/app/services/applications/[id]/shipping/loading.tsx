import { PublicPageHero } from "@/components/public";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background pb-10" aria-busy="true" aria-live="polite">
      <PublicPageHero
        variant="feature"
        eyebrow="자가발송 운송장"
        title="라켓 발송 정보를 불러오는 중입니다"
        description="잠시만 기다려 주세요."
      />
      <div className="mx-auto max-w-3xl space-y-5 px-4 pt-6">
        <section className="rounded-panel border border-border/80 bg-muted/40 p-5 shadow-soft">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="mt-3 h-4 w-full" />
        </section>
        <section className="rounded-panel border border-border/80 bg-card p-5 shadow-soft sm:p-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="mb-5 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-12 w-full rounded-control" />
            </div>
          ))}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-12 flex-1 rounded-control" />
            <Skeleton className="h-12 flex-1 rounded-control" />
            <Skeleton className="h-12 flex-1 rounded-control" />
          </div>
        </section>
      </div>
      <p className="sr-only">운송장 입력 화면을 불러오는 중입니다.</p>
    </main>
  );
}
