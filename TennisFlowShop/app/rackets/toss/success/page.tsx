"use client";

import SiteContainer from "@/components/layout/SiteContainer";
import { ResultState } from "@/components/public";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function RacketTossSuccessPage() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const paymentKey = sp.get("paymentKey") || "";
    const orderId = sp.get("orderId") || "";
    const amount = Number(sp.get("amount") || 0);
    const racketId = sp.get("racketId") || "";

    if (!paymentKey || !orderId || !Number.isFinite(amount)) {
      const fallbackPath = racketId
        ? `/rackets/${encodeURIComponent(racketId)}/select-string`
        : "/rackets";
      router.replace(
        `/rackets/toss/fail?code=INVALID_QUERY&message=잘못된 결제 결과입니다.&fallback=${encodeURIComponent(fallbackPath)}`,
      );
      return;
    }

    fetch("/api/payments/toss/racket/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json?.mongoOrderId) {
          const nextCode = String(json?.code || "CONFIRM_FAILED");
          const nextMessage = encodeURIComponent(
            json?.error || "카드/간편결제 승인에 실패했습니다.",
          );
          const fallbackPath = racketId
            ? `/rackets/${encodeURIComponent(racketId)}/select-string`
            : "/rackets";
          router.replace(
            `/rackets/toss/fail?code=${encodeURIComponent(nextCode)}&message=${nextMessage}&fallback=${encodeURIComponent(fallbackPath)}`,
          );
          return;
        }
        router.replace(
          `/racket-orders/${encodeURIComponent(json.mongoOrderId)}/select-string`,
        );
      })
      .catch((error: any) => {
        const fallbackPath = racketId
          ? `/rackets/${encodeURIComponent(racketId)}/select-string`
          : "/rackets";
        router.replace(
          `/rackets/toss/fail?code=CONFIRM_FAILED&message=${encodeURIComponent(error?.message || "카드/간편결제 승인에 실패했습니다.")}&fallback=${encodeURIComponent(fallbackPath)}`,
        );
      });
  }, [router, sp]);

  return (
    <SiteContainer className="flex min-h-[50vh] items-center py-10 md:py-16">
      <ResultState
        status="info"
        icon={<Loader2 className="h-5 w-5 animate-spin" />}
        title="결제 승인 처리 중입니다"
        description="카드/간편결제 승인 결과를 확인하고 있어요. 잠시만 기다려주세요."
      />
    </SiteContainer>
  );
}
