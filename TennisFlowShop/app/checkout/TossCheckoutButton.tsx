"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const PAYMENT_AMOUNT_CHANGED_MESSAGE =
  "상품 가격, 배송비, 포인트 또는 패키지 사용 정보가 변경되어 결제 금액이 달라졌습니다. 주문 정보를 다시 확인한 뒤 다시 시도해주세요.";

export default function TossCheckoutButton({
  disabled,
  widgetReady,
  widgetLoadError,
  payableAmount,
  onPreparedAmountChange,
  onBeforeSuccessNavigation,
  onSuccessNavigationAbort,
  payload,
  buttonId,
}: {
  disabled: boolean;
  widgetReady: boolean;
  widgetLoadError: string | null;
  payableAmount: number;
  onPreparedAmountChange?: (amount: number) => void;
  onBeforeSuccessNavigation?: () => void;
  onSuccessNavigationAbort?: () => void;
  payload: Record<string, unknown>;
  buttonId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const blockedByZeroAmount = !Number.isFinite(payableAmount) || payableAmount <= 0;
  const blockedByWidget = !widgetReady || !!widgetLoadError;
  const isDisabled = disabled || loading || blockedByZeroAmount || blockedByWidget;

  const handleClick = async () => {
    if (isDisabled) return;
    if (blockedByZeroAmount) {
      setInlineError("최종 결제금액이 0원인 경우 카드/간편결제를 사용할 수 없습니다.");
      return;
    }
    if (widgetLoadError) {
      setInlineError(widgetLoadError);
      return;
    }
    if (!widgetReady) {
      setInlineError("결제위젯 준비가 아직 완료되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setInlineError(null);
    setLoading(true);
    try {
      const prepRes = await fetch("/api/payments/toss/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const prepJson = await prepRes.json();
      if (!prepRes.ok || !prepJson?.success)
        throw new Error(prepJson?.error || "결제 준비에 실패했습니다.");
      const prepareAmount = Number(prepJson?.amount ?? NaN);
      if (!Number.isFinite(prepareAmount) || prepareAmount <= 0) {
        throw new Error(
          "최종 결제금액이 0원이거나 올바르지 않아 카드/간편결제를 진행할 수 없습니다.",
        );
      }

      const expectedAmount = Math.floor(Number(payableAmount ?? NaN));
      if (!Number.isFinite(expectedAmount) || prepareAmount !== expectedAmount) {
        console.warn("[toss] payment amount mismatch", {
          clientAmount: Number.isFinite(expectedAmount) ? expectedAmount : null,
          serverAmount: Number.isFinite(prepareAmount) ? prepareAmount : null,
        });
        throw new Error(PAYMENT_AMOUNT_CHANGED_MESSAGE);
      }

      const widget = (window as any).__tossPaymentWidget;
      const paymentMethodWidget = (window as any).__tossPaymentMethodWidget;
      if (!widget || !paymentMethodWidget) throw new Error("결제위젯이 아직 준비되지 않았습니다.");

      const updateResult = paymentMethodWidget.updateAmount(prepareAmount);
      if (updateResult && typeof updateResult.then === "function") {
        await updateResult;
      }
      onPreparedAmountChange?.(prepareAmount);

      onBeforeSuccessNavigation?.();
      try {
        await widget.requestPayment({
          orderId: prepJson.orderId,
          orderName: prepJson.orderName,
          successUrl: prepJson.successUrl,
          failUrl: prepJson.failUrl,
          customerName: prepJson.customerName,
          customerEmail: prepJson.customerEmail,
          customerMobilePhone: prepJson.customerMobilePhone,
        });
      } catch (error) {
        onSuccessNavigationAbort?.();
        throw error;
      }
    } catch (error: any) {
      setInlineError(error?.message || "카드/간편결제 요청에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 w-full">
      <Button
        id={buttonId}
        onClick={handleClick}
        className="w-full h-14 text-ui-card-title-lg"
        disabled={isDisabled}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            결제 요청 중...
          </>
        ) : (
          "토스로 결제하기"
        )}
      </Button>
      {blockedByZeroAmount && (
        <p className="text-ui-label text-muted-foreground">
          최종 결제금액이 0원이라 토스 카드/간편결제를 사용할 수 없습니다.
        </p>
      )}
      {widgetLoadError && <p className="text-ui-label text-destructive">{widgetLoadError}</p>}
      {!widgetLoadError && !widgetReady && (
        <p className="text-ui-label text-muted-foreground">
          결제위젯 준비 중입니다. 잠시 후 다시 시도해주세요.
        </p>
      )}
      {inlineError && <p className="text-ui-label text-destructive">{inlineError}</p>}
    </div>
  );
}
