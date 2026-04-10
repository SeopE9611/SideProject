"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function TossCheckoutSuccessPage() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const paymentKey = sp.get("paymentKey") || "";
    const orderId = sp.get("orderId") || "";
    const amount = Number(sp.get("amount") || 0);

    if (!paymentKey || !orderId || !Number.isFinite(amount)) {
      router.replace("/checkout/toss/fail?code=INVALID_QUERY&message=잘못된 결제 결과입니다.");
      return;
    }

    fetch("/api/payments/toss/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json?.mongoOrderId) {
          throw new Error(json?.error || "결제 승인에 실패했습니다.");
        }
        router.replace(`/checkout/success?orderId=${encodeURIComponent(json.mongoOrderId)}`);
      })
      .catch((error: any) => {
        router.replace(`/checkout/toss/fail?code=CONFIRM_FAILED&message=${encodeURIComponent(error?.message || "결제 승인에 실패했습니다.")}`);
      });
  }, [router, sp]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-3 px-6 text-center">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm text-muted-foreground">결제 승인 처리 중입니다. 잠시만 기다려주세요.</p>
    </div>
  );
}
