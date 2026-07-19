import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero, SummaryCard } from "@/components/public";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-full bg-background" aria-busy="true" aria-live="polite">
      <PublicPageHero
        variant="feature"
        eyebrow="쪽지"
        title="쪽지함"
        description="알림보다 자세한 1:1 안내와 답장을 확인하세요"
      />
      <SiteContainer className="py-6 md:py-8" variant="wide">
        <SummaryCard
          variant="feature"
          className="mx-auto max-w-7xl rounded-panel"
          contentClassName="p-3 sm:p-4 md:p-6"
        >
          <p className="sr-only">쪽지함을 불러오는 중입니다.</p>
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-control border border-border bg-brand-highlight-muted/45 p-1 md:mb-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-9 rounded-control" />
            ))}
          </div>
          <div className="grid gap-4 md:gap-6 lg:grid-cols-12">
            <section className="overflow-hidden rounded-panel border border-border bg-card shadow-soft lg:col-span-5">
              <div className="flex justify-between border-b border-border bg-muted/30 p-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-20 rounded-control" />
              </div>
              <div className="space-y-2 p-3 sm:p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="space-y-3 rounded-control border border-border p-4">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-2/5" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            </section>
            <section className="min-h-[400px] rounded-panel border border-border bg-card p-5 shadow-soft lg:col-span-7 md:p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-px w-full" />
                <Skeleton className="h-32 w-full rounded-control" />
              </div>
            </section>
          </div>
        </SummaryCard>
      </SiteContainer>
    </div>
  );
}
