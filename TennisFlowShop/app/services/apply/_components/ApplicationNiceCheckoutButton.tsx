"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const NICEPAY_SCRIPT_SRC = "https://pay.nicepay.co.kr/v1/js/";

declare global {
  interface Window {
    AUTHNICE?: {
      requestPay?: (params: Record<string, unknown>) => void;
    };
  }
}

type NicePrepareResponse = {
  success: boolean;
  nice?: {
    clientId: string;
    orderId: string;
    amount: number;
    goodsName: string;
    returnUrl: string;
    buyerName?: string;
    buyerTel?: string;
    buyerEmail?: string;
  };
  error?: string;
};

type ApplicationNiceCheckoutButtonProps = {
  disabled: boolean;
  payableAmount: number;
  submitApplication: () => Promise<string | null>;
  onPaymentFlowStart?: () => void;
  onPaymentFlowEnd?: () => void;
};

export default function ApplicationNiceCheckoutButton({
  disabled,
  payableAmount,
  submitApplication,
  onPaymentFlowStart,
  onPaymentFlowEnd,
}: ApplicationNiceCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const existing = document.querySelector(
      `script[src="${NICEPAY_SCRIPT_SRC}"]`,
    ) as HTMLScriptElement | null;
    const markReady = () => {
      if (mounted && typeof window.AUTHNICE?.requestPay === "function") {
        setScriptReady(true);
      }
    };

    if (existing) {
      markReady();
      existing.addEventListener("load", markReady, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = NICEPAY_SCRIPT_SRC;
      script.async = true;
      script.addEventListener("load", markReady, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      mounted = false;
    };
  }, []);

  const isDisabled = useMemo(
    () => disabled || loading || !scriptReady || payableAmount <= 0,
    [disabled, loading, payableAmount, scriptReady],
  );

  const handleClick = async () => {
    if (isDisabled) return;
    setLoading(true);
    setInlineError(null);
    onPaymentFlowStart?.();

    try {
      const applicationId = await submitApplication();
      if (!applicationId) {
        onPaymentFlowEnd?.();
        setLoading(false);
        return;
      }

      const response = await fetch("/api/payments/nice/stringing/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ applicationId }),
      });
      const prepared = (await response.json().catch(() => null)) as NicePrepareResponse | null;
      if (!response.ok || !prepared?.success || !prepared.nice) {
        throw new Error(prepared?.error || "카드/간편결제 준비에 실패했습니다.");
      }
      if (Math.floor(prepared.nice.amount) !== Math.floor(payableAmount)) {
        throw new Error("신청 금액이 변경되었습니다. 다시 확인해주세요.");
      }
      if (typeof window.AUTHNICE?.requestPay !== "function") {
        throw new Error("카드/간편결제창이 준비되지 않았습니다.");
      }

      window.AUTHNICE.requestPay({
        clientId: prepared.nice.clientId,
        method: "card",
        orderId: prepared.nice.orderId,
        amount: prepared.nice.amount,
        goodsName: prepared.nice.goodsName,
        returnUrl: prepared.nice.returnUrl,
        buyerName: prepared.nice.buyerName,
        buyerTel: prepared.nice.buyerTel,
        buyerEmail: prepared.nice.buyerEmail,
        fnError: (result: any) => {
          onPaymentFlowEnd?.();
          setInlineError(String(result?.errorMsg || result?.message || "결제가 취소되었습니다."));
          setLoading(false);
        },
      });
    } catch (error: any) {
      onPaymentFlowEnd?.();
      setInlineError(error?.message || "카드/간편결제 요청에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        variant="highlight"
        className="min-h-11 w-full sm:w-auto"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        카드/간편결제로 신청 완료
      </Button>
      {!scriptReady && (
        <p className="text-ui-label text-muted-foreground">카드/간편결제창을 준비 중입니다.</p>
      )}
      {inlineError && <p className="text-ui-label text-destructive break-words">{inlineError}</p>}
    </div>
  );
}
