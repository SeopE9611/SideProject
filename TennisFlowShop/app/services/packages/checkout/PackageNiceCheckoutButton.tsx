"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

declare global {
  interface Window {
    AUTHNICE?: {
      requestPay?: (params: Record<string, unknown>) => void;
    };
  }
}

const NICEPAY_SCRIPT_SRC = "https://pay.nicepay.co.kr/v1/js/";

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

type Props = {
  disabled: boolean;
  payableAmount: number;
  packageId: string;
  packageName: string;
  name: string;
  phone: string;
  email: string;
  serviceRequest: string;
  onBeforeSuccessNavigation?: () => void;
  onSuccessNavigationAbort?: () => void;
};

export default function PackageNiceCheckoutButton({
  disabled,
  payableAmount,
  packageId,
  packageName,
  name,
  phone,
  email,
  serviceRequest,
  onBeforeSuccessNavigation,
  onSuccessNavigationAbort,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const attachScript = async () => {
      setScriptError(null);
      setScriptReady(false);

      if (typeof window === "undefined") return;
      if (typeof window.AUTHNICE?.requestPay === "function") {
        setScriptReady(true);
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[src="${NICEPAY_SCRIPT_SRC}"]`) as HTMLScriptElement | null;
        if (existing) {
          if (typeof window.AUTHNICE?.requestPay === "function") {
            resolve();
            return;
          }
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error("NICE_SCRIPT_LOAD_FAILED")), { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = NICEPAY_SCRIPT_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("NICE_SCRIPT_LOAD_FAILED"));
        document.head.appendChild(script);
      });

      if (!mounted) return;
      if (typeof window.AUTHNICE?.requestPay !== "function") throw new Error("NICE_WIDGET_UNAVAILABLE");
      setScriptReady(true);
    };

    attachScript().catch((error: any) => {
      if (!mounted) return;
      setScriptReady(false);
      const code = String(error?.message || "");
      if (code === "NICE_SCRIPT_LOAD_FAILED") {
        setScriptError("Nice 결제 스크립트를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.");
        return;
      }
      setScriptError("Nice 결제창 준비 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    });

    return () => {
      mounted = false;
    };
  }, []);

  const blockedByZeroAmount = !Number.isFinite(payableAmount) || payableAmount <= 0;
  const isDisabled = useMemo(
    () => disabled || loading || blockedByZeroAmount || !scriptReady || !!scriptError,
    [disabled, loading, blockedByZeroAmount, scriptReady, scriptError],
  );

  const handleClick = async () => {
    if (isDisabled) return;

    if (blockedByZeroAmount) {
      setInlineError("최종 결제금액이 0원인 경우 Nice 결제를 사용할 수 없습니다.");
      return;
    }

    setInlineError(null);
    setLoading(true);

    try {
      const prepRes = await fetch("/api/payments/nice/package/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          serviceInfo: {
            name: name.trim(),
            email: email.trim(),
            phone: String(phone).replace(/\D/g, ""),
            serviceRequest,
          },
        }),
      });

      const prepJson = (await prepRes.json().catch(() => null)) as NicePrepareResponse | null;
      if (!prepRes.ok || !prepJson?.success || !prepJson?.nice) {
        onSuccessNavigationAbort?.();
        throw new Error(prepJson?.error || "Nice 결제 준비에 실패했습니다.");
      }

      if (typeof window.AUTHNICE?.requestPay !== "function") {
        onSuccessNavigationAbort?.();
        throw new Error("Nice 결제창이 준비되지 않았습니다.");
      }

      onBeforeSuccessNavigation?.();
      try {
        window.AUTHNICE.requestPay({
          clientId: prepJson.nice.clientId,
          method: "card",
          orderId: prepJson.nice.orderId,
          amount: prepJson.nice.amount,
          goodsName: prepJson.nice.goodsName || packageName,
          returnUrl: prepJson.nice.returnUrl,
          buyerName: prepJson.nice.buyerName,
          buyerTel: prepJson.nice.buyerTel,
          buyerEmail: prepJson.nice.buyerEmail,
          fnError: (result: any) => {
            onSuccessNavigationAbort?.();
            const msg = String(result?.errorMsg || result?.message || "결제가 취소되었거나 실패했습니다.");
            setInlineError(msg);
            setLoading(false);
          },
        });
      } catch (error) {
        onSuccessNavigationAbort?.();
        throw error;
      }
    } catch (error: any) {
      setInlineError(error?.message || "결제 요청에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 w-full">
      <Button onClick={handleClick} className="w-full h-14 text-lg" disabled={isDisabled}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            결제 요청 중...
          </>
        ) : (
          "결제하기"
        )}
      </Button>
      {blockedByZeroAmount && <p className="text-xs text-muted-foreground">최종 결제금액이 0원이라 Nice 결제를 사용할 수 없습니다.</p>}
      {!scriptError && !scriptReady && <p className="text-xs text-muted-foreground">Nice 결제창 준비 중입니다. 잠시 후 다시 시도해주세요.</p>}
      {scriptError && <p className="text-xs text-destructive">{scriptError}</p>}
      {inlineError && <p className="text-xs text-destructive">{inlineError}</p>}
    </div>
  );
}
