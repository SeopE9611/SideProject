"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { mypageDetailLayout } from "../../_components/mypage-detail-style";

const srLoadingLabel = "주문 상세 정보를 불러오는 중입니다.";

function DetailCardSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <section className={`overflow-hidden rounded-2xl border ${mypageDetailLayout.transactionCard}`}>
      <div className={`p-4 bp-sm:p-5 ${mypageDetailLayout.transactionCardHeader}`}>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-28" />
        </div>
        <Skeleton className="mt-2 h-4 w-56 max-w-full" />
      </div>
      <div className="space-y-4 p-4 bp-sm:p-5">
        {Array.from({ length: fields }).map((_, index) => (
          <div
            key={index}
            className="space-y-2 border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function OrderDetailSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="w-full">
      <span className="sr-only">{srLoadingLabel}</span>

      <section className={`${mypageDetailLayout.heroSection} ${mypageDetailLayout.transactionHero}`}>
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-48 rounded-lg bp-sm:w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>

        <div className={`${mypageDetailLayout.heroShell} ${mypageDetailLayout.transactionHeroShell}`}>
          <div className={mypageDetailLayout.heroGrid}>
            <div className="min-w-0">
              <div className="flex min-w-0 items-start gap-3">
                <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
              <div className={mypageDetailLayout.summaryGrid}>
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 rounded-xl" />
                ))}
              </div>
            </div>

            <div className={`${mypageDetailLayout.actionPanel} ${mypageDetailLayout.transactionActionPanel}`}>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-11 w-full rounded-md" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex w-full flex-col gap-2 border-t border-border/60 pt-4 bp-sm:flex-row bp-sm:flex-wrap bp-lg:justify-end">
          <Skeleton className="h-11 w-full rounded-md bp-sm:w-36" />
          <Skeleton className="h-11 w-full rounded-md bp-sm:w-28" />
        </div>
      </section>

      <div className={mypageDetailLayout.contentContainer}>
        <div className="w-full space-y-5">
          <section className={`overflow-hidden rounded-2xl border ${mypageDetailLayout.transactionCard}`}>
            <div className={`p-4 bp-sm:p-5 ${mypageDetailLayout.transactionCardHeader}`}>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-6 w-28" />
              </div>
              <Skeleton className="mt-2 h-4 w-56 max-w-full" />
            </div>
            <div className="divide-y divide-border/60 p-4 bp-sm:p-5">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex gap-3 py-4 first:pt-0 last:pb-0 bp-sm:gap-4">
                  <Skeleton className="h-16 w-16 shrink-0 rounded-xl bp-sm:h-20 bp-sm:w-20" />
                  <div className="min-w-0 flex-1 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <DetailCardSkeleton />
          <DetailCardSkeleton fields={3} />

          <section className={mypageDetailLayout.managementSection}>
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <Skeleton className="mt-4 h-11 w-full rounded-md bp-sm:mt-0 bp-sm:w-24" />
          </section>
        </div>
      </div>
    </div>
  );
}
