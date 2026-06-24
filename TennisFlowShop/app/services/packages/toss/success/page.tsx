"use client";

import SiteContainer from "@/components/layout/SiteContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function PackageTossSuccessPage() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const paymentKey = sp.get("paymentKey") || "";
    const orderId = sp.get("orderId") || "";
    const amount = Number(sp.get("amount") || 0);

    if (!paymentKey || !orderId || !Number.isFinite(amount)) {
      router.replace(
        "/services/packages/toss/fail?code=INVALID_QUERY&message=잘못된 결제 결과입니다.",
      );
      return;
    }

    fetch("/api/payments/toss/package/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json?.packageOrderId) {
          const nextCode = String(json?.code || "CONFIRM_FAILED");
          const nextMessage = encodeURIComponent(
            json?.error || "카드/간편결제 승인에 실패했습니다.",
          );
          router.replace(
            `/services/packages/toss/fail?code=${encodeURIComponent(nextCode)}&message=${nextMessage}`,
          );
          return;
        }
        router.replace(
          `/services/packages/success?packageOrderId=${encodeURIComponent(json.packageOrderId)}`,
        );
      })
      .catch((error: any) => {
        router.replace(
          `/services/packages/toss/fail?code=CONFIRM_FAILED&message=${encodeURIComponent(error?.message || "카드/간편결제 승인에 실패했습니다.")}`,
        );
      });
  }, [router, sp]);

  return (
    <SiteContainer className="flex min-h-[50vh] items-center justify-center py-10">
      <Card className="w-full max-w-xl border border-border bg-card shadow-sm">
        <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="font-medium text-foreground">
            결제 승인 처리 중입니다.
          </p>
          <p className="text-sm text-muted-foreground">
            잠시만 기다려주세요. 승인 결과 확인 후 완료 페이지로 이동합니다.
          </p>
        </CardContent>
      </Card>
    </SiteContainer>
  );
}
