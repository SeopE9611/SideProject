import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero } from "@/components/public/PublicPageHero";
import { PublicSurface } from "@/components/public/PublicSurface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Plus, Search } from "lucide-react";
import Link from "next/link";

export function QnaRowSkeleton() {
  return (
    <div className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-14 rounded-full" />
          <Skeleton className="h-5 min-w-0 flex-1" />
        </div>
        <Skeleton className="h-6 w-16 rounded-md" />
      </div>
      <div className="flex flex-wrap items-center gap-3.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  );
}

export default function QnaListLoadingShell() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicPageHero
        variant="feature"
        eyebrow={<Badge variant="signal">Q&amp;A</Badge>}
        title="고객센터 · Q&A"
        description="도깨비테니스 고객센터에서 궁금한 점을 문의하고, 답변을 받아보실 수 있습니다."
        actions={
          <>
            <Button asChild variant="highlight" className="w-full bp-sm:w-auto">
              <Link href="/board/qna/write">
                <Plus className="mr-2 h-4 w-4 shrink-0" />
                문의하기
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full bp-sm:w-auto">
              <Link href="/support">고객센터 홈</Link>
            </Button>
          </>
        }
      />

      <SiteContainer className="space-y-5 py-6 sm:space-y-6 sm:py-8 md:py-10">
        <PublicSurface variant="muted" padding="md" className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-highlight-muted text-brand-highlight-ink">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
            <Skeleton className="mt-1 h-4 w-4/5 max-w-xl" />
          </div>
        </PublicSurface>

        <PublicSurface variant="feature" padding="none" className="overflow-hidden" aria-busy>
          <div className="h-1 bg-brand-highlight" aria-hidden="true" />
          <div className="border-b border-border bg-brand-highlight-muted/30 p-4 sm:p-5 md:p-6">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <MessageSquare className="h-5 w-5 shrink-0 text-brand-highlight-ink sm:h-6 sm:w-6" />
                <h2 className="font-ui-medium text-ui-card-title-lg sm:text-ui-section-title md:text-ui-page-title">
                  Q&amp;A 목록
                </h2>
                <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-foreground" />
              </div>
              <Skeleton className="h-9 w-full sm:w-28 md:h-10" />
            </div>
          </div>

          <div className="border-b border-border bg-muted/30 px-4 py-4 sm:px-5 md:px-6">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 md:w-auto">
                <Skeleton className="h-9 w-full md:h-10 md:w-[150px]" />
                <Skeleton className="h-9 w-full md:h-10 md:w-[140px]" />
              </div>
              <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row lg:w-auto">
                <Skeleton className="h-9 w-full sm:w-[130px] md:h-10" />
                <div className="relative min-w-0 flex-1 lg:w-[240px] lg:flex-none">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Skeleton className="h-9 w-full md:h-10" />
                </div>
                <Skeleton className="h-9 w-full sm:w-16 md:h-10" />
              </div>
            </div>
          </div>

          <div className="divide-y divide-border/70">
            {Array.from({ length: 5 }).map((_, index) => (
              <QnaRowSkeleton key={index} />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-5">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-20" />
          </div>
        </PublicSurface>
      </SiteContainer>
    </main>
  );
}
