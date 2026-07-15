import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target } from "lucide-react";
import Link from "next/link";

type Props = {
  primaryHref: string;
  primaryLabel: string;
};


export default function RacketCareLandingHero({ primaryHref, primaryLabel }: Props) {
  return (
    <section className="relative overflow-hidden rounded-hero border border-border bg-card p-5 shadow-soft bp-sm:p-8 bp-lg:p-12">
      <div className="pointer-events-none absolute right-8 top-8 hidden h-56 w-56 rounded-full bg-brand-highlight-muted bp-lg:block" />
      <div className="relative grid gap-9 bp-lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)] bp-lg:items-center">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="signal">RACKET CARE PASS</Badge>
            <span className="text-ui-label text-muted-foreground">라켓 관리의 새로운 시작</span>
          </div>
          <h1 className="break-keep font-brand-display text-[2.75rem] leading-none text-foreground bp-sm:text-[4.4rem] bp-lg:text-[5.2rem]">
            내 라켓의<br />다음 교체일,<br />
            <span className="text-brand-outline">먼저 알려드려요.</span>
          </h1>
          <p className="max-w-xl break-keep text-ui-body text-muted-foreground">
            마지막 교체일과 플레이 빈도를 연결하면 상태 점수, 예상 교체일, 맞춤 추천까지 하나의 흐름으로 관리할 수 있습니다.
          </p>
          <div className="grid gap-2 bp-sm:flex bp-sm:flex-wrap">
            <Button asChild variant="highlight" wrap="responsive">
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
            <Button asChild variant="outline" wrap="responsive">
              <Link href="#racket-care-flow">사용 흐름 살펴보기</Link>
            </Button>
          </div>
          <div className="grid max-w-lg grid-cols-3 divide-x divide-border border-y border-border py-3">
            <div className="pr-3"><p className="text-ui-card-title font-bold tracking-[-0.01em]">30초</p><p className="text-ui-label text-muted-foreground">간편 등록</p></div>
            <div className="px-3"><p className="text-ui-card-title font-bold tracking-[-0.01em]">1-TAP</p><p className="text-ui-label text-muted-foreground">이력 활용</p></div>
            <div className="pl-3"><p className="text-ui-card-title font-bold tracking-[-0.01em]">무료</p><p className="text-ui-label text-muted-foreground">교체 알림</p></div>
          </div>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-6 rounded-full bg-brand-highlight-muted" />
          <Card variant="feature" className="relative mx-auto max-w-md rounded-panel shadow-float">
            <CardContent className="p-5 bp-sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-ui-kicker text-muted-foreground">DEMO · SAMPLE DASHBOARD</p>
                  <h2 className="mt-2 break-keep text-ui-card-title-lg font-bold tracking-[-0.01em]">예시 라켓 관리 화면</h2>
                  <p className="text-ui-label text-muted-foreground">실제 사용자 데이터가 아닌 고정 샘플입니다.</p>
                </div>
                <Badge variant="warning" wrap="nowrap" className="shrink-0">교체 준비</Badge>
              </div>
              <div className="mx-auto mt-6 grid w-full max-w-[230px] place-items-center">
                <div
                  role="progressbar"
                  aria-label="예시 스트링 상태 점수 78점"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={78}
                  className="relative grid aspect-square w-full place-items-center rounded-full border border-border shadow-soft"
                >
                  <svg className="absolute inset-0 h-full w-full -rotate-90 text-brand-highlight" viewBox="0 0 120 120" aria-hidden="true">
                    <circle className="text-muted" cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="10" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="10" strokeDasharray="78 100" pathLength="100" strokeLinecap="round" />
                  </svg>
                  <div className="relative grid h-[72%] w-[72%] place-items-center rounded-full bg-card text-center">
                    <span className="font-brand-display text-ui-display">78</span>
                    <span className="text-ui-label text-muted-foreground">SAMPLE LIFE</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2">
                <div className="rounded-control border border-border bg-card p-3"><p className="text-ui-micro text-muted-foreground">예상 교체</p><p className="mt-1 break-keep text-ui-label font-semibold">D-12</p></div>
                <div className="rounded-control border border-border bg-card p-3"><p className="text-ui-micro text-muted-foreground">플레이 빈도</p><p className="mt-1 break-keep text-ui-label font-semibold">주 2~3회</p></div>
                <div className="rounded-control border border-border bg-card p-3"><p className="text-ui-micro text-muted-foreground">최근 스트링</p><p className="mt-1 break-keep text-ui-label font-semibold">예시 스트링</p></div>
              </div>
              <div className="mt-5 flex gap-3 rounded-control bg-brand-highlight-muted p-4 text-left">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-brand-highlight-ink" />
                <p className="break-keep text-ui-body-sm text-muted-foreground">
                  예시 화면입니다. 상태 점수와 예상 교체일은 마지막 교체일과 플레이 빈도에 따른 관리 지표이며, 실제 스트링 마모 상태와 다를 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
