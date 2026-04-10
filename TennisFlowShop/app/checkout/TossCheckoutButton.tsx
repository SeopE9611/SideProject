"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function TossCheckoutButton({ disabled, payload }: { disabled: boolean; payload: Record<string, unknown> }) {
  const [loading, setLoading] = useState(false);
  const amount = Number(payload?.totalPrice ?? 0) - Number(payload?.pointsToUse ?? 0);

  const handleClick = async () => {
    if (disabled || loading) return;
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("최종 결제금액이 0원인 경우 카드/간편결제를 사용할 수 없습니다.");
      return;
    }
    setLoading(true);
    try {
      const prepRes = await fetch("/api/payments/toss/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const prepJson = await prepRes.json();
      if (!prepRes.ok || !prepJson?.success) throw new Error(prepJson?.error || "결제 준비에 실패했습니다.");

      const widget = (window as any).__tossPaymentWidget;
      if (!widget) throw new Error("결제위젯이 아직 준비되지 않았습니다.");

      await widget.requestPayment({
        orderId: prepJson.orderId,
        orderName: prepJson.orderName,
        successUrl: prepJson.successUrl,
        failUrl: prepJson.failUrl,
        customerName: prepJson.customerName,
        customerEmail: prepJson.customerEmail,
        customerMobilePhone: prepJson.customerMobilePhone,
      });
    } catch (error: any) {
      alert(error?.message || "결제 요청에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} className="w-full h-14 text-lg" disabled={disabled || loading || amount <= 0}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          결제 요청 중...
        </>
      ) : (
        "토스로 결제하기"
      )}
    </Button>
  );
}
