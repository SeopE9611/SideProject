"use client";

import SiteContainer from "@/components/layout/SiteContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { mypageDetailLayout } from "../../_components/mypage-detail-style";

const srLoadingLabel = "주문 상세 정보를 불러오는 중입니다.";

export default function OrderDetailSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="w-full">
      <span className="sr-only">{srLoadingLabel}</span>

      <section className="rounded-xl border border-brand-highlight-ink/25 bg-brand-highlight-muted/40 p-4 shadow-none bp-sm:p-5">
        <div className="flex flex-col gap-4 bp-lg:flex-row bp-lg:items-start bp-lg:justify-between">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-9 w-48 rounded-lg bp-sm:w-64" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <div className="flex w-full flex-col gap-2 bp-sm:w-auto bp-sm:flex-row bp-sm:flex-wrap bp-lg:justify-end">
            <Skeleton className="h-9 w-full rounded-md bp-sm:w-36" />
            <Skeleton className="h-9 w-full rounded-md bp-sm:w-28" />
            <Skeleton className="h-9 w-full rounded-md bp-sm:w-24" />
          </div>
        </div>

        <div className="mt-5 flex w-full flex-col gap-4 rounded-xl border border-brand-highlight-ink/20 bg-background/75 p-4 ring-1 ring-brand-highlight-ink/15 bp-sm:p-5">
          <div className="grid gap-4 bp-lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] bp-lg:items-stretch">
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

            <div className="flex flex-col gap-3 rounded-xl border border-brand-highlight-ink/25 bg-brand-highlight-muted/55 p-3 bp-sm:p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-border/60 pt-4 bp-sm:grid-cols-2 bp-lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-28" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteContainer variant="wide" className={mypageDetailLayout.contentContainer}>
        <div className="w-full space-y-5">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-brand-highlight-ink/20 bg-card shadow-none">
              <div className="border-b border-border/60 bg-brand-highlight-muted/45 p-4 bp-sm:p-5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-6 w-28" />
                </div>
                <Skeleton className="mt-2 h-4 w-56" />
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
          </div>

          <aside className="grid gap-5 bp-lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <section key={index} className="overflow-hidden rounded-2xl border border-brand-highlight-ink/20 bg-card shadow-none">
                <div className="border-b border-border/60 bg-brand-highlight-muted/45 p-4 bp-sm:p-5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-6 w-28" />
                  </div>
                  <Skeleton className="mt-2 h-4 w-44" />
                </div>
                <div className="space-y-4 p-4 bp-sm:p-5">
                  {Array.from({ length: 4 }).map((__, fieldIndex) => (
                    <div key={fieldIndex} className="space-y-2 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-5 w-2/3" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </aside>
        </div>
      </SiteContainer>
    </div>
  );
}
