"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

const flowSteps = [
  { title: "라켓 등록", copy: "프로필·완료 교체 이력을 가져오거나 직접 입력해 최대 5개 라켓을 관리합니다.", bullets: ["프로필·완료 교체 이력 가져오기", "직접 입력 지원", "최대 5개 관리"] },
  { title: "상태 진단", copy: "마지막 교체일과 플레이 빈도로 예상 교체일, D-day, 판단 근거를 확인합니다.", bullets: ["마지막 교체일", "플레이 빈도", "예상 교체일과 판단 근거"] },
  { title: "맞춤 추천", copy: "기존 스트링 추천 엔진으로 이동하되 선택한 라켓 문맥과 빈도를 유지합니다.", bullets: ["추천 엔진 재사용", "추천 조건 변경 가능", "선택 라켓 문맥 유지"] },
  { title: "교체 신청", copy: "상품 상세에서 기존 교체서비스 신청 흐름으로 연결하고 완료 후 라켓 케어로 돌아옵니다.", bullets: ["상품 상세", "기존 교체서비스 신청", "신청 완료 후 복귀"] },
] as const;

function CheckMark() { return <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-highlight text-brand-highlight-foreground text-ui-micro">✓</span>; }

export default function RacketCareFlowSection() {
  const [active, setActive] = useState(0);
  const step = flowSteps[active];
  return <section id="racket-care-flow" className="space-y-5 scroll-mt-24"><div className="grid gap-3 bp-lg:grid-cols-[0.8fr_1.2fr]"><div><p className="text-ui-kicker text-brand-highlight-foreground dark:text-brand-highlight">SMART CARE FLOW</p><h2 className="mt-2 break-keep font-brand-display text-ui-section-title">등록부터 교체 신청까지 한 흐름으로</h2></div><p className="self-end break-keep text-ui-body-sm text-muted-foreground">아래 단계를 눌러 라켓 케어가 실제 데이터를 어떻게 연결하는지 확인해 보세요.</p></div><div className="grid gap-2 bp-md:grid-cols-4">{flowSteps.map((item, index) => <button key={item.title} type="button" onClick={() => setActive(index)} className="min-h-11 rounded-control border border-border bg-card p-3 text-left text-ui-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:border-brand-highlight data-[active=true]:bg-brand-highlight-muted" data-active={active === index} aria-pressed={active === index}><span className="mr-2 text-ui-label text-brand-highlight-foreground dark:text-brand-highlight">{String(index + 1).padStart(2, "0")}</span><span className="font-semibold">{item.title}</span></button>)}</div><Card variant="feature" className="rounded-panel"><CardContent className="grid gap-5 p-5 bp-md:grid-cols-[0.9fr_1.1fr] bp-sm:p-6"><div className="rounded-panel bg-brand-highlight-muted p-5"><p className="text-ui-kicker text-brand-highlight-foreground dark:text-brand-highlight">USER FLOW · {String(active + 1).padStart(2, "0")}</p><h3 className="mt-4 break-keep font-brand-display text-ui-section-title">{step.title}</h3><p className="mt-3 break-keep text-ui-body-sm text-muted-foreground">{step.copy}</p></div><ul className="grid content-center gap-3">{step.bullets.map((bullet) => <li key={bullet} className="flex gap-3 rounded-control border border-border bg-card p-4 text-ui-body-sm"><CheckMark /> <span>{bullet}</span></li>)}</ul></CardContent></Card></section>;
}
