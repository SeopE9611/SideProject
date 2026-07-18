import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero, PublicSurface, SectionHeader } from "@/components/public";

function FieldSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-28" />
      <Skeleton className={tall ? "h-56 w-full rounded-xl" : "h-12 w-full rounded-xl"} />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function QnaWriteLoadingShell() {
  return (
    <main className="min-h-screen bg-background text-foreground" aria-busy>
      <PublicPageHero
        variant="feature"
        eyebrow={<Badge variant="signal">Q&amp;A WRITE</Badge>}
        title="문의하기"
        description="상품, 주문, 서비스 이용 중 궁금한 점을 남겨주시면 확인 후 답변드릴게요."
        actions={
          <div className="flex w-full flex-col gap-2 bp-sm:w-auto bp-sm:flex-row">
            <Skeleton className="h-9 w-full rounded-lg bp-sm:w-24" />
            <Skeleton className="h-9 w-full rounded-lg bp-sm:w-28" />
          </div>
        }
      />

      <SiteContainer className="pb-12 bp-sm:pb-16">
        <div className="mx-auto max-w-4xl space-y-5 bp-sm:space-y-6">
          <PublicSurface variant="muted" padding="md" className="grid gap-4 bp-md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-control border border-border bg-card/70 p-4">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="mt-3 h-6 w-28" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
              </div>
            ))}
          </PublicSurface>

          <PublicSurface variant="feature" padding="none" className="overflow-hidden">
            <div className="border-b border-border bg-brand-highlight-muted/40 p-5 bp-sm:p-6 bp-md:p-8">
              <SectionHeader
                variant="brand"
                eyebrow="NEW QUESTION"
                title="새 문의 작성"
                description="작성 화면을 준비하고 있습니다."
              />
            </div>
            <div className="space-y-8 p-5 bp-sm:p-6 bp-md:p-8">
              <section className="space-y-5">
                <Skeleton className="h-7 w-56" />
                <FieldSkeleton />
                <div className="grid gap-4 bp-md:grid-cols-2">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="rounded-control border border-border bg-muted/30 p-4">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="mt-4 h-11 w-full" />
                      <div className="mt-4 space-y-2">
                        <Skeleton className="h-14 w-full rounded-xl" />
                        <Skeleton className="h-14 w-full rounded-xl" />
                        <Skeleton className="h-14 w-full rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section className="space-y-5 border-t border-border pt-8">
                <Skeleton className="h-7 w-48" />
                <FieldSkeleton />
                <FieldSkeleton tall />
              </section>
              <section className="space-y-5 border-t border-border pt-8">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-36 w-full rounded-control" />
                <div className="grid grid-cols-2 gap-3 bp-sm:grid-cols-3 bp-md:grid-cols-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 w-full rounded-control" />
                  ))}
                </div>
              </section>
              <section className="space-y-4 border-t border-border pt-8">
                <Skeleton className="h-7 w-36" />
                <Skeleton className="h-20 w-full rounded-control" />
              </section>
            </div>
            <div className="flex flex-col gap-3 border-t border-border bg-muted/30 p-5 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between bp-sm:p-6 bp-md:p-8">
              <Skeleton className="h-11 w-full rounded-xl bp-sm:w-28" />
              <Skeleton className="h-11 w-full rounded-xl bp-sm:w-36" />
            </div>
          </PublicSurface>
        </div>
      </SiteContainer>
    </main>
  );
}
