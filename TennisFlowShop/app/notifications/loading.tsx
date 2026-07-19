import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero, SummaryCard } from "@/components/public";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-full bg-background" aria-busy="true" aria-live="polite">
      <PublicPageHero
        variant="feature"
        eyebrow="알림 센터"
        title="알림"
        description="알림 센터를 준비하고 있습니다."
      />
      <SiteContainer className="py-6 md:py-8">
        <SummaryCard
          variant="feature"
          className="mx-auto max-w-5xl rounded-panel"
          contentClassName="p-3 md:p-5"
        >
          <p className="sr-only">알림 목록을 불러오는 중입니다.</p>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="space-y-3 rounded-control border border-border bg-card p-4 sm:px-5"
              >
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </SummaryCard>
      </SiteContainer>
    </div>
  );
}
