"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useEffect, useState } from "react";

type Handoff = { careItemId: string; productId?: string; createdAt?: string };
const HANDOFF_TTL_MS = 30 * 60 * 1000;
function isHandoff(value: unknown): value is Handoff {
  const handoff = value as { careItemId?: unknown; createdAt?: unknown } | null;
  if (
    !handoff ||
    typeof handoff !== "object" ||
    typeof handoff.careItemId !== "string" ||
    typeof handoff.createdAt !== "string"
  )
    return false;
  const createdAt = new Date(handoff.createdAt).getTime();
  return Number.isFinite(createdAt) && Date.now() - createdAt <= HANDOFF_TTL_MS;
}
export default function RacketCareSuccessFeedback({
  enabled = true,
  expectedProductIds,
}: {
  enabled?: boolean;
  expectedProductIds?: string[];
}) {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  useEffect(() => {
    if (!enabled) {
      sessionStorage.removeItem("racket-care-handoff");
      return;
    }
    const raw = sessionStorage.getItem("racket-care-handoff");
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        isHandoff(parsed) &&
        (!parsed.productId || !expectedProductIds || expectedProductIds.includes(parsed.productId))
      )
        setHandoff(parsed);
      else sessionStorage.removeItem("racket-care-handoff");
    } catch {
      sessionStorage.removeItem("racket-care-handoff");
    }
  }, [enabled, expectedProductIds]);
  useEffect(() => {
    if (handoff) sessionStorage.removeItem("racket-care-handoff");
  }, [handoff]);
  if (!handoff) return null;
  return (
    <Card className="rounded-2xl border-primary/30">
      <CardContent className="space-y-3 p-5">
        <p className="font-semibold">교체서비스 신청이 완료되었습니다.</p>
        <p className="break-keep text-ui-body-sm text-muted-foreground">
          라켓 케어에서 향후 교체 일정을 계속 관리할 수 있습니다.
        </p>
        <Button asChild className="min-h-10">
          <Link href={`/mypage/racket-care?selected=${handoff.careItemId}&submitted=1`}>
            내 라켓 케어로 돌아가기
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
