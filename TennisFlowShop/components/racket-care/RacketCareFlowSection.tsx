"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

const flowSteps = [
  {
    title: "라켓 등록",
    copy: "프로필·완료 교체 이력을 가져오거나 직접 입력해 최대 5개 라켓을 관리합니다.",
    bullets: ["프로필·완료 교체 이력 가져오기", "직접 입력 지원", "최대 5개 관리"],
  },
  {
    title: "상태 진단",
    copy: "마지막 교체일과 플레이 빈도로 예상 교체일, D-day, 판단 근거를 확인합니다.",
    bullets: ["마지막 교체일", "플레이 빈도", "예상 교체일과 판단 근거"],
  },
  {
    title: "맞춤 추천",
    copy: "등록한 라켓과 플레이 빈도를 바탕으로 조건에 맞는 스트링을 추천받습니다.",
    bullets: ["라켓 정보 반영", "플레이 빈도 반영", "추천 조건 직접 조정"],
  },
  {
    title: "교체 신청",
    copy: "추천 결과에서 상품을 확인하고 교체서비스 신청까지 자연스럽게 이어집니다.",
    bullets: ["추천 상품 확인", "교체서비스 신청", "완료 후 관리 화면 복귀"],
  },
] as const;

function CheckMark() {
  return (
    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-highlight text-brand-highlight-foreground text-ui-micro">
      ✓
    </span>
  );
}

export default function RacketCareFlowSection() {
  const [active, setActive] = useState(0);
  const step = flowSteps[active];
  return (
    <section id="racket-care-flow" className="space-y-6 scroll-mt-24">
      <div className="grid gap-4 bp-lg:grid-cols-[0.35fr_0.75fr_0.55fr] bp-lg:items-end">
        <div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-highlight text-brand-highlight-foreground text-ui-label font-semibold">
            01
          </span>
          <p className="mt-3 text-ui-kicker text-muted-foreground">SMART CARE FLOW</p>
        </div>
        <h2 className="break-keep font-brand-heading text-ui-section-title bp-lg:text-[3rem] bp-lg:leading-[1.05]">
          등록부터 교체 신청까지,
          <br />
          끊기지 않는 하나의 흐름
        </h2>
        <p className="break-keep text-ui-body-sm text-muted-foreground">
          단계를 눌러 실제 화면 흐름과 연결되는 정보를 확인해 보세요.
        </p>
      </div>
      <div className="grid overflow-hidden rounded-control border border-border bg-card bp-md:grid-cols-4">
        {flowSteps.map((item, index) => {
          const isActive = active === index;
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => setActive(index)}
              className="flex min-h-14 items-center justify-between gap-3 border-b border-border p-4 text-left text-ui-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring last:border-b-0 bp-md:border-b-0 bp-md:border-r bp-md:last:border-r-0 data-[active=true]:bg-surface-inverse data-[active=true]:text-surface-inverse-foreground"
              data-active={isActive}
              aria-pressed={isActive}
            >
              <span>
                <span
                  className={
                    isActive
                      ? "mr-2 text-ui-label text-brand-highlight"
                      : "mr-2 text-ui-label text-foreground"
                  }
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-semibold">{item.title}</span>
              </span>
              <span
                aria-hidden="true"
                className={isActive ? "text-brand-highlight" : "text-muted-foreground"}
              >
                →
              </span>
            </button>
          );
        })}
      </div>
      <Card variant="feature" className="overflow-hidden rounded-panel">
        <CardContent className="grid gap-0 p-0 bp-md:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-brand-highlight-muted p-6 bp-sm:p-8 bp-lg:p-10">
            <p className="text-ui-kicker text-brand-highlight-ink">
              USER FLOW · {String(active + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-5 break-keep text-ui-section-title font-bold tracking-[-0.01em]">
              {step.title}
            </h3>
            <p className="mt-4 max-w-md break-keep text-ui-body-sm text-muted-foreground">
              {step.copy}
            </p>
            <div className="mt-8 h-px bg-border" />
          </div>
          <div className="grid content-center gap-3 p-5 bp-sm:p-7 bp-lg:p-10">
            {step.bullets.map((bullet) => (
              <div
                key={bullet}
                className="flex gap-3 rounded-control border border-border bg-card p-4 text-ui-body-sm shadow-sm"
              >
                <CheckMark /> <span className="break-keep">{bullet}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
