"use client";

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
            json?.error || "결제 승인에 실패했습니다.",
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
          `/services/packages/toss/fail?code=CONFIRM_FAILED&message=${encodeURIComponent(error?.message || "결제 승인에 실패했습니다.")}`,
        );
      });
  }, [router, sp]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-3 px-6 text-center">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm text-muted-foreground">
        결제 승인 처리 중입니다. 잠시만 기다려주세요.
      </p>
    </div>
  );
}
