"use client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    AUTHNICE?: { requestPay?: (params: Record<string, unknown>) => void };
  }
}
const SRC = "https://pay.nicepay.co.kr/v1/js/";
export default function PrivatePaymentNiceButton({
  privatePaymentId,
  buyerInfo,
  disabled,
}: {
  privatePaymentId: string;
  buyerInfo: { name: string; phone: string; email?: string };
  disabled?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (window.AUTHNICE?.requestPay) {
      setReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => setReady(true);
    s.onerror = () => setError("카드/간편결제 모듈을 불러오지 못했습니다.");
    document.head.appendChild(s);
  }, []);
  const click = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/payments/nice/private-payment/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privatePaymentId, buyerInfo }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.nice)
        throw new Error(json.error || "결제 준비에 실패했습니다.");
      window.AUTHNICE?.requestPay?.({
        clientId: json.nice.clientId,
        method: "card",
        orderId: json.nice.orderId,
        amount: json.nice.amount,
        goodsName: json.nice.goodsName,
        returnUrl: json.nice.returnUrl,
        buyerName: json.nice.buyerName,
        buyerTel: json.nice.buyerTel,
        buyerEmail: json.nice.buyerEmail,
        fnError: (r: { errorMsg?: string; message?: string }) => {
          setError(r?.errorMsg || r?.message || "결제가 취소되었거나 실패했습니다.");
          setLoading(false);
        },
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "결제 요청에 실패했습니다.";
      setError(message);
      setLoading(false);
    }
  };
  return (
    <div className="space-y-2">
      <Button className="w-full h-12" disabled={disabled || !ready || loading} onClick={click}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            결제 요청 중...
          </>
        ) : (
          "카드/간편결제로 결제하기"
        )}
      </Button>
      {!ready && !error && <p className="text-sm text-muted-foreground">결제창을 준비 중입니다.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
