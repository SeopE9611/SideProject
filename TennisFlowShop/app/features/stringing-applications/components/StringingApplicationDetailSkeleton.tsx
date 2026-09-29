"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { mypageDetailLayout } from "@/app/mypage/_components/mypage-detail-style";

const transactionCardClass = cn(
  "overflow-hidden rounded-2xl border",
  mypageDetailLayout.transactionCard,
);
const transactionCardHeaderClass = cn(
  "p-4 bp-sm:p-5",
  mypageDetailLayout.transactionCardHeader,
);

function DetailCardSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <Card className={transactionCardClass}>
      <CardHeader className={transactionCardHeaderClass}>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-36 rounded-md" />
        </div>
        <Skeleton className="h-4 w-56 max-w-full rounded-md" />
      </CardHeader>
      <CardContent className="space-y-3 p-4 bp-sm:p-5">
        {Array.from({ length: fields }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-xl last:w-4/5" />
        ))}
      </CardContent>
    </Card>
  );
}

export default function StringingApplicationDetailSkeleton() {
  return (
    <main className="w-full" aria-busy="true" aria-live="polite">
      <span className="sr-only">교체서비스 신청 상세 정보를 불러오는 중입니다.</span>
      <MypageDetailSkeletonHero />
      <div className={mypageDetailLayout.contentContainer}>
        <div className="mx-auto w-full space-y-5">
          <DetailCardSkeleton fields={4} />
          <DetailCardSkeleton />
          <DetailCardSkeleton fields={2} />
          <DetailCardSkeleton />
          <DetailCardSkeleton fields={2} />
          <DetailCardSkeleton fields={1} />
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

function MypageDetailSkeletonHero() {
  return (
    <section className={cn(mypageDetailLayout.heroSection, mypageDetailLayout.transactionHero)}>
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-8 w-64 rounded-md" />
        <Skeleton className="h-4 w-full max-w-lg rounded-md" />
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
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-48 max-w-full rounded-md" />
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
            <Skeleton className="h-5 w-56 max-w-full rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-11 w-full rounded-md bp-sm:w-28" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex w-full flex-col gap-2 border-t border-border/60 pt-4 bp-sm:flex-row bp-sm:flex-wrap bp-lg:justify-end">
        <Skeleton className="h-11 w-full rounded-md bp-sm:w-36" />
        <Skeleton className="h-11 w-full rounded-md bp-sm:w-24" />
      </div>
    </section>
  );
}
