"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useEffect, useState } from "react";

type Handoff = { careItemId: string; productId?: string; createdAt?: string };
function isHandoff(value: unknown): value is Handoff {
  return Boolean(value && typeof value === "object" && typeof (value as { careItemId?: unknown }).careItemId === "string");
}
export default function RacketCareSuccessFeedback() {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  useEffect(() => {
    const raw = sessionStorage.getItem("racket-care-handoff");
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isHandoff(parsed)) setHandoff(parsed);
    } catch {}
  }, []);
  useEffect(() => {
    if (handoff) sessionStorage.removeItem("racket-care-handoff");
  }, [handoff]);
  if (!handoff) return null;
  return <Card className="rounded-2xl border-primary/30"><CardContent className="space-y-3 p-5"><p className="font-semibold">교체서비스 신청이 완료되었습니다.</p><p className="break-keep text-ui-body-sm text-muted-foreground">라켓 케어에서 향후 교체 일정을 계속 관리할 수 있습니다.</p><Button asChild className="min-h-10"><Link href={`/mypage/racket-care?selected=${handoff.careItemId}&submitted=1`}>내 라켓 케어로 돌아가기</Link></Button></CardContent></Card>;
}
