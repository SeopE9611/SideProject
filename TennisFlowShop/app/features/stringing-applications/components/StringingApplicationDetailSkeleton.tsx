"use client";

import SiteContainer from "@/components/layout/SiteContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { mypageDetailLayout } from "@/app/mypage/_components/mypage-detail-style";

const featureCardClass =
  "overflow-hidden rounded-2xl border border-brand-highlight-ink/20 bg-card shadow-soft";
const featureCardHeaderClass =
  "border-b border-brand-highlight-ink/15 bg-brand-highlight-muted/45 px-4 py-4 bp-sm:px-5";

function DetailCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn(featureCardClass, className)}>
      <CardHeader className={featureCardHeaderClass}>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-36 rounded-md" />
        </div>
        <Skeleton className="h-4 w-56 max-w-full rounded-md" />
      </CardHeader>
      <CardContent className="space-y-3 p-4 bp-sm:p-5">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-4/5 rounded-xl" />
      </CardContent>
    </Card>
  );
}

export default function StringingApplicationDetailSkeleton() {
  return (
    <main className="w-full" aria-busy="true" aria-live="polite">
      <span className="sr-only">교체서비스 신청 상세 정보를 불러오는 중입니다.</span>
      <MypageDetailSkeletonHero />
      <SiteContainer variant="wide" className={mypageDetailLayout.contentContainer}>
        <div className="mx-auto w-full space-y-5">
          <DetailCardSkeleton />
          <DetailCardSkeleton />
          <div className="grid gap-5 bp-lg:grid-cols-2">
            <DetailCardSkeleton />
            <DetailCardSkeleton />
          </div>
          <DetailCardSkeleton />
        </div>
      </SiteContainer>
    </main>
  );
}

function MypageDetailSkeletonHero() {
  return (
    <section
      className={cn(
        mypageDetailLayout.heroSection,
        "border-brand-highlight-ink/25 bg-brand-highlight-muted/40 shadow-none",
      )}
    >
      <div className="flex flex-col gap-4 bp-lg:flex-row bp-lg:items-start bp-lg:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-8 w-64 rounded-md" />
          <Skeleton className="h-4 w-full max-w-lg rounded-md" />
        </div>
        <div className="flex w-full flex-col gap-2 bp-sm:w-auto bp-sm:flex-row bp-sm:flex-wrap bp-lg:justify-end">
          <Skeleton className="h-9 w-full rounded-md bp-sm:w-36" />
          <Skeleton className="h-9 w-full rounded-md bp-sm:w-24" />
        </div>
      </div>

      <div
        className={cn(
          mypageDetailLayout.heroShell,
          "border border-brand-highlight-ink/20 bg-background/75 ring-brand-highlight-ink/15",
        )}
      >
        <div className={mypageDetailLayout.heroGrid}>
          <div className="flex min-w-0 items-start gap-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-5 w-44 rounded-md" />
              </div>
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>
          </div>
          <div className={cn(mypageDetailLayout.actionPanel, "border-brand-highlight-ink/25 bg-brand-highlight-muted/55")}>
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-5 w-56 max-w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md bp-sm:w-28" />
          </div>
        </div>
        <div className={mypageDetailLayout.summaryGrid}>
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>
    </section>
  );
}
