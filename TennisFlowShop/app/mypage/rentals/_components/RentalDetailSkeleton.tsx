"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { mypageDetailLayout } from "../../_components/mypage-detail-style";

function RentalDetailCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card
      className={`overflow-hidden rounded-2xl border ${mypageDetailLayout.transactionCard}`}
    >
      <CardHeader className={`p-4 bp-sm:p-5 ${mypageDetailLayout.transactionCardHeader}`}>
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
          mypageDetailLayout.transactionHero,
        )}
      >
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-6 w-36 rounded-full" />
          <Skeleton className="h-8 w-40 rounded-md" />
          <Skeleton className="h-4 w-full max-w-xl rounded-md" />
        </div>

        <div
          className={cn(
            mypageDetailLayout.heroShell,
            mypageDetailLayout.transactionHeroShell,
          )}
        >
          <div className={mypageDetailLayout.heroGrid}>
            <div className="min-w-0">
              <div className="flex min-w-0 items-start gap-3">
                <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-52 max-w-full rounded-md" />
                </div>
              </div>
              <div className={mypageDetailLayout.summaryGrid}>
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            </div>
            <div
              className={cn(
                mypageDetailLayout.actionPanel,
                mypageDetailLayout.transactionActionPanel,
              )}
            >
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-5 w-48 max-w-full rounded-md" />
              <Skeleton className="h-11 w-full rounded-md bp-sm:w-32" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex w-full flex-col gap-2 border-t border-border/60 pt-4 bp-sm:flex-row bp-sm:flex-wrap bp-lg:justify-end">
          <Skeleton className="h-11 w-full rounded-md bp-sm:w-32" />
        </div>
      </section>

      <div className={mypageDetailLayout.contentContainer}>
        <div className="w-full space-y-5">
          <RentalDetailCardSkeleton compact />
          <RentalDetailCardSkeleton />
          <RentalDetailCardSkeleton />
          <RentalDetailCardSkeleton />
          <section className={mypageDetailLayout.managementSection}>
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-4 w-80 max-w-full rounded-md" />
            </div>
            <Skeleton className="mt-4 h-11 w-full rounded-md bp-sm:mt-0 bp-sm:w-24" />
          </section>
        </div>
      </div>
    </main>
  );
}
