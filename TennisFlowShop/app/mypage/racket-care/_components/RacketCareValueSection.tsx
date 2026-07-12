"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function RacketCareValueSection() {
  const values = [
    ["01", "교체 타이밍 관리", "플레이 빈도 기반 예상일 안내"],
    ["02", "이전 이력 활용", "프로필과 완료된 교체 기록 재사용"],
    ["03", "선택 부담 감소", "기존 추천 엔진으로 스트링 선택 연결"],
    ["04", "신청 흐름 단축", "상품 상세에서 교체서비스로 바로 이동"],
  ] as const;
  return <section className="rounded-hero bg-surface-inverse p-5 text-surface-inverse-foreground bp-sm:p-7 bp-lg:p-10"><div className="grid gap-8 bp-lg:grid-cols-[0.9fr_1.1fr]"><div><Badge variant="signal_solid">WHY · RACKET CARE</Badge><h2 className="mt-5 break-keep font-brand-display text-ui-section-title bp-lg:text-ui-display">교체일을 기억하는 기능을 넘어,<br />라켓 관리 흐름을 연결합니다.</h2><p className="mt-4 break-keep text-ui-body-sm text-surface-inverse-muted">라켓 케어는 사용자의 실제 이력과 추천, 신청 흐름을 끊기지 않게 이어 줍니다.</p></div><div className="grid gap-3 bp-sm:grid-cols-2">{values.map(([no, title, copy]) => <Card key={no} variant="inverse" className="rounded-control"><CardContent className="p-5"><p className="text-ui-label text-brand-highlight">{no}</p><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 break-keep text-ui-body-sm text-surface-inverse-muted">{copy}</p></CardContent></Card>)}</div></div></section>;
}
