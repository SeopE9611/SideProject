import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero, PublicSurface } from "@/components/public";

export function QnaDetailContentSkeleton() {
  return (
    <div
      className="space-y-6 md:space-y-8"
      aria-busy="true"
      aria-label="Q&A 상세 내용을 불러오는 중"
    >
      <PublicSurface variant="feature" padding="none" className="overflow-hidden">
        <div className="h-1 bg-brand-highlight" aria-hidden="true" />
        <div className="space-y-4 border-b border-border bg-brand-highlight-muted/30 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-9 w-4/5 max-w-3xl" />
          <div className="flex flex-wrap gap-3 md:gap-5">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="space-y-6 p-4 md:p-6">
          <div className="max-w-3xl space-y-3 rounded-panel bg-card p-4 md:p-6">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-2/3" />
          </div>
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-40 rounded-panel" />
              ))}
            </div>
          </section>
        </div>
      </PublicSurface>

      <PublicSurface variant="feature" padding="none" className="overflow-hidden">
        <div className="h-1 bg-brand-highlight" aria-hidden="true" />
        <div className="space-y-3 border-b border-border bg-brand-highlight-muted/30 p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-3 md:gap-5">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-7 w-44" />
          </div>
        </div>
        <div className="p-4 md:p-6">
          <div className="max-w-3xl space-y-3 rounded-panel bg-card p-4 md:p-6">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-10/12" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        </div>
      </PublicSurface>

      <PublicSurface variant="muted" padding="md" className="space-y-4">
        <Skeleton className="h-5 w-full max-w-2xl" />
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Skeleton className="h-10 w-full sm:w-36" />
          <Skeleton className="h-10 w-full sm:w-32" />
        </div>
      </PublicSurface>
    </div>
  );
}

export default function QnaDetailLoadingShell() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicPageHero
        variant="feature"
        eyebrow={<Badge variant="signal">Q&amp;A</Badge>}
        title="고객센터 · Q&A"
        description="Q&A 목록에서 선택한 상세 문의와 답변을 확인하실 수 있습니다."
        actions={
          <>
            <Button variant="highlight" size="sm" className="w-full sm:w-auto" disabled>
              Q&amp;A 목록
            </Button>
            <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled>
              고객센터 홈
            </Button>
          </>
        }
      />
      <SiteContainer className="py-6 md:py-8">
        <QnaDetailContentSkeleton />
      </SiteContainer>
    </main>
  );
}
