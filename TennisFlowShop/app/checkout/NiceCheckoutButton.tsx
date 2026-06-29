"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  hasStringingServiceInCheckout,
  STRINGING_APPLICATION_REQUIRED_CLIENT_MESSAGE,
  validateStringingApplicationInputForOrder,
} from "@/lib/checkout-stringing-guard";
import { useEffect, useMemo, useState } from "react";

declare global {
  interface Window {
    AUTHNICE?: {
      requestPay?: (params: Record<string, unknown>) => void;
    };
  }
}

const NICEPAY_SCRIPT_SRC = "https://pay.nicepay.co.kr/v1/js/";
const PAYMENT_AMOUNT_CHANGED_MESSAGE =
  "상품 가격, 배송비, 포인트 또는 패키지 사용 정보가 변경되어 결제 금액이 달라졌습니다. 주문 정보를 다시 확인한 뒤 다시 시도해주세요.";

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

export default function NiceCheckoutButton({
  disabled,
  payload,
  payableAmount,
  onBeforeSuccessNavigation,
  onSuccessNavigationAbort,
  buttonId,
}: {
  disabled: boolean;
  payload: Record<string, unknown>;
  payableAmount: number;
  onBeforeSuccessNavigation?: () => void;
  onSuccessNavigationAbort?: () => void;
  buttonId?: string;
}) {
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
        const existing = document.querySelector(
          `script[src="${NICEPAY_SCRIPT_SRC}"]`,
        ) as HTMLScriptElement | null;
        if (existing) {
          if (typeof window.AUTHNICE?.requestPay === "function") {
            resolve();
            return;
          }
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error("NICE_SCRIPT_LOAD_FAILED")), {
            once: true,
          });
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
      if (typeof window.AUTHNICE?.requestPay !== "function")
        throw new Error("NICE_WIDGET_UNAVAILABLE");
      setScriptReady(true);
    };

    attachScript().catch((error: any) => {
      if (!mounted) return;
      setScriptReady(false);
      const code = String(error?.message || "");
      if (code === "NICE_SCRIPT_LOAD_FAILED") {
        setScriptError("카드/간편결제 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.");
        return;
      }
      setScriptError("카드/간편결제창 준비 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    });

    return () => {
      mounted = false;
    };
  }, []);

  const isDisabled = useMemo(
    () => disabled || loading || !scriptReady || !!scriptError,
    [disabled, loading, scriptReady, scriptError],
  );

  const handleClick = async () => {
    if (isDisabled) return;

    setInlineError(null);

    const stringingInputValidation = validateStringingApplicationInputForOrder(
      hasStringingServiceInCheckout({ shippingInfo: payload?.shippingInfo as any }),
      payload?.stringingApplicationInput,
    );
    if (!stringingInputValidation.ok) {
      setInlineError(STRINGING_APPLICATION_REQUIRED_CLIENT_MESSAGE);
      onSuccessNavigationAbort?.();
      return;
    }

    setLoading(true);

    try {
      const prepRes = await fetch("/api/payments/nice/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const prepJson = (await prepRes.json().catch(() => null)) as NicePrepareResponse | null;
      if (!prepRes.ok || !prepJson?.success || !prepJson?.nice) {
        onSuccessNavigationAbort?.();
        throw new Error(prepJson?.error || "카드/간편결제 준비에 실패했습니다.");
      }

      if (typeof window.AUTHNICE?.requestPay !== "function") {
        onSuccessNavigationAbort?.();
        throw new Error("카드/간편결제창이 준비되지 않았습니다.");
      }

      const prepareAmount = Number(prepJson.nice.amount ?? NaN);
      const expectedAmount = Math.floor(Number(payableAmount ?? NaN));
      if (
        !Number.isFinite(prepareAmount) ||
        !Number.isFinite(expectedAmount) ||
        prepareAmount !== expectedAmount
      ) {
        onSuccessNavigationAbort?.();
        console.warn("[nicepay] payment amount mismatch", {
          clientAmount: Number.isFinite(expectedAmount) ? expectedAmount : null,
          serverAmount: Number.isFinite(prepareAmount) ? prepareAmount : null,
        });
        throw new Error(PAYMENT_AMOUNT_CHANGED_MESSAGE);
      }

      onBeforeSuccessNavigation?.();

      window.AUTHNICE.requestPay({
        clientId: prepJson.nice.clientId,
        method: "card",
        orderId: prepJson.nice.orderId,
        amount: prepJson.nice.amount,
        goodsName: prepJson.nice.goodsName,
        returnUrl: prepJson.nice.returnUrl,
        buyerName: prepJson.nice.buyerName,
        buyerTel: prepJson.nice.buyerTel,
        buyerEmail: prepJson.nice.buyerEmail,
        fnError: (result: any) => {
          const msg = String(
            result?.errorMsg || result?.message || "결제가 취소되었거나 실패했습니다.",
          );
          setInlineError(msg);
          setLoading(false);
          onSuccessNavigationAbort?.();
        },
      });
    } catch (error: any) {
      setInlineError(error?.message || "카드/간편결제 요청에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 w-full">
      <Button id={buttonId} onClick={handleClick} className="w-full h-14 text-ui-card-title-lg" disabled={isDisabled}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            결제 요청 중...
          </>
        ) : (
          "결제하기"
        )}
      </Button>
      {!scriptError && !scriptReady && (
        <p className="text-ui-label text-muted-foreground">
          카드/간편결제창을 준비 중입니다. 잠시 후 다시 시도해주세요.
        </p>
      )}
      {scriptError && <p className="text-ui-label text-destructive">{scriptError}</p>}
      {inlineError && <p className="text-ui-label text-destructive">{inlineError}</p>}
    </div>
  );
}
