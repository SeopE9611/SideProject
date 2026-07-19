"use client";

import SiteContainer from "@/components/layout/SiteContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { mypageDetailLayout } from "../../_components/mypage-detail-style";

function RentalDetailCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-brand-highlight-ink/20 bg-card shadow-none">
      <CardHeader className="border-b border-brand-highlight-ink/15 bg-brand-highlight-muted/45 p-4 bp-sm:p-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-36 rounded-md" />
        </div>
        {!compact ? <Skeleton className="h-4 w-56 max-w-full rounded-md" /> : null}
      </CardHeader>
      <CardContent className="space-y-3 p-4 bp-sm:p-5">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        {!compact ? <Skeleton className="h-12 w-4/5 rounded-xl" /> : null}
      </CardContent>
    </Card>
  );
}

export default function RentalDetailSkeleton() {
  return (
    <main className="w-full" aria-busy="true" aria-live="polite">
      <span className="sr-only">대여 상세 정보를 불러오는 중입니다.</span>
      <section
        className={cn(
          mypageDetailLayout.heroSection,
          "border-brand-highlight-ink/25 bg-brand-highlight-muted/40 shadow-none",
        )}
      >
        <div className="flex flex-col gap-4 bp-lg:flex-row bp-lg:items-start bp-lg:justify-between">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-6 w-36 rounded-full" />
            <Skeleton className="h-8 w-40 rounded-md" />
            <Skeleton className="h-4 w-full max-w-xl rounded-md" />
          </div>
          <div className="flex w-full flex-col gap-2 bp-sm:w-auto bp-sm:flex-row bp-sm:flex-wrap bp-lg:justify-end">
            <Skeleton className="h-9 w-full rounded-md bp-sm:w-28" />
            <Skeleton className="h-9 w-full rounded-md bp-sm:w-32" />
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
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-5 w-36 rounded-md" />
                </div>
                <Skeleton className="h-4 w-52 max-w-full rounded-md" />
              </div>
            </div>
            <div
              className={cn(
                mypageDetailLayout.actionPanel,
                "border-brand-highlight-ink/25 bg-brand-highlight-muted/55",
              )}
            >
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-5 w-48 max-w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md bp-sm:w-32" />
            </div>
          </div>
          <div className={mypageDetailLayout.summaryGrid}>
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </div>
      </section>

      <SiteContainer variant="wide" className={mypageDetailLayout.contentContainer}>
        <div className={mypageDetailLayout.contentGrid}>
          <div className={mypageDetailLayout.mainColumn}>
            <RentalDetailCardSkeleton compact />
            <RentalDetailCardSkeleton />
            <RentalDetailCardSkeleton />
          </div>
          <div className={mypageDetailLayout.sideColumn}>
            <RentalDetailCardSkeleton />
          </div>
        </div>
      </SiteContainer>
    </main>
  );
}
