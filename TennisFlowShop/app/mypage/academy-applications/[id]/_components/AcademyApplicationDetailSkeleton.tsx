import MypageDetailCard from "@/app/mypage/_components/MypageDetailCard";
import { mypageDetailLayout } from "@/app/mypage/_components/mypage-detail-style";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { GraduationCap, MessageSquareText, UserRound } from "lucide-react";

function SummarySkeleton() {
  return <Skeleton className="h-16 w-full rounded-xl" />;
}

export default function AcademyApplicationDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 bp-sm:space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">아카데미 신청 상세 정보를 불러오는 중입니다.</span>

      <section className={cn(mypageDetailLayout.heroSection, "border-brand-highlight-ink/25 bg-brand-highlight-muted/40 shadow-none")}>
        <div className="flex flex-col gap-4 bp-lg:flex-row bp-lg:items-start bp-lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-5 w-64 max-w-full" />
          </div>
          <div className="flex flex-col gap-2 bp-sm:flex-row">
            <Skeleton className="h-9 w-full bp-sm:w-32" />
            <Skeleton className="h-9 w-full bp-sm:w-28" />
          </div>
        </div>

        <div className={cn(mypageDetailLayout.heroShell, "border border-brand-highlight-ink/20 bg-background/75 ring-brand-highlight-ink/15")}>
          <div className={mypageDetailLayout.heroGrid}>
            <div className="flex items-start gap-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-5 w-56 max-w-full" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
            <div className={cn(mypageDetailLayout.actionPanel, "border-brand-highlight-ink/25 bg-brand-highlight-muted/55")}>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="h-4 w-60 max-w-full" />
            </div>
          </div>
          <div className={mypageDetailLayout.summaryGrid}>
            <SummarySkeleton />
            <SummarySkeleton />
            <SummarySkeleton />
          </div>
        </div>
      </section>

      <div className={mypageDetailLayout.contentGrid}>
        <div className={mypageDetailLayout.mainColumn}>
          <MypageDetailCard variant="feature" title="클래스 정보" description="신청 당시 선택한 클래스 정보입니다." icon={<GraduationCap className="h-5 w-5" aria-hidden="true" />}>
            <div className="grid gap-3 bp-sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 w-full rounded-xl" />)}
            </div>
          </MypageDetailCard>
          <MypageDetailCard variant="feature" title="레슨 목표 및 요청사항" icon={<MessageSquareText className="h-5 w-5" aria-hidden="true" />}>
            <Skeleton className="h-28 w-full rounded-xl" />
          </MypageDetailCard>
        </div>
        <div className={mypageDetailLayout.sideColumn}>
          <MypageDetailCard variant="feature" title="신청 내용" icon={<UserRound className="h-5 w-5" aria-hidden="true" />}>
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-14 w-full rounded-xl" />)}
            </div>
          </MypageDetailCard>
          <MypageDetailCard variant="feature" title="신청 정보 수정">
            <Skeleton className="h-24 w-full rounded-xl" />
          </MypageDetailCard>
        </div>
      </div>
    </div>
  );
}
