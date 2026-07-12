"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function RacketCareValueSection() {
  const values = [
    ["01", "교체 타이밍 관리", "플레이 빈도 기반 예상일 안내", "RETENTION"],
    ["02", "이전 이력 활용", "프로필과 완료된 교체 기록 재사용", "DATA"],
    ["03", "선택 부담 감소", "기존 추천 엔진으로 스트링 선택 연결", "FLOW"],
    ["04", "신청 흐름 단축", "상품 상세에서 교체서비스로 바로 이동", "SERVICE"],
  ] as const;
  return <section className="rounded-hero bg-surface-inverse p-5 text-surface-inverse-foreground bp-sm:p-8 bp-lg:p-12"><div className="grid gap-10 bp-lg:grid-cols-[0.9fr_1.1fr] bp-lg:items-center"><div><Badge variant="signal_solid">WHY · RACKET CARE</Badge><h2 className="mt-6 break-keep font-brand-display text-ui-section-title bp-lg:text-ui-display">새 기능 하나로,<br /><span className="text-brand-highlight">라켓 관리 흐름</span>을 연결합니다.</h2><p className="mt-5 max-w-lg break-keep text-ui-body-sm text-surface-inverse-muted">상품 탐색에서 끝나는 경험이 아니라, 실제 교체 이력과 다음 신청까지 이어지는 전용 관리 경험을 만듭니다.</p></div><div className="grid border border-surface-inverse-border bp-sm:grid-cols-2">{values.map(([no, title, copy, keyword]) => <Card key={no} variant="inverse" className="rounded-none border-0 border-surface-inverse-border bp-sm:border-r bp-sm:border-b bp-sm:even:border-r-0 bp-sm:[&:nth-last-child(-n+2)]:border-b-0"><CardContent className="flex min-h-48 flex-col p-5 bp-sm:p-6"><p className="text-ui-label text-brand-highlight">{no}</p><h3 className="mt-6 font-semibold">{title}</h3><p className="mt-2 break-keep text-ui-body-sm text-surface-inverse-muted">{copy}</p><p className="mt-auto pt-8 text-right font-brand-display text-ui-card-title-lg text-surface-inverse-muted/40">{keyword}</p></CardContent></Card>)}</div></div></section>;
}
