"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    PaymentWidget?: any;
    __tossPaymentWidget?: any;
    __tossPaymentMethodWidget?: any;
  }
}

const SCRIPT_SRC = "https://js.tosspayments.com/v1/payment-widget";

type TossWidgetStatus = {
  ready: boolean;
  loadError: string | null;
};

export default function TossPaymentWidget({
  amount,
  customerKey,
  onStatusChange,
}: {
  amount: number;
  customerKey: string;
  onStatusChange?: (status: TossWidgetStatus) => void;
}) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    onStatusChange?.({ ready, loadError });
  }, [ready, loadError, onStatusChange]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setReady(false);
      setLoadError(null);

      if (!window.PaymentWidget) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null;
          if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error("WIDGET_SCRIPT_LOAD_FAILED")), { once: true });
            return;
          }
          const script = document.createElement("script");
          script.src = SCRIPT_SRC;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("WIDGET_SCRIPT_LOAD_FAILED"));
          document.head.appendChild(script);
        });
      }

      const clientKey = process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY;
      if (!clientKey) throw new Error("WIDGET_CLIENT_KEY_MISSING");
      if (!window.PaymentWidget || !mounted) throw new Error("WIDGET_RENDER_FAILED");

      const paymentWidget = window.PaymentWidget(clientKey, customerKey);

      const paymentMethodWidget = await paymentWidget.renderPaymentMethods("#toss-payment-widget", { value: amount }, { variantKey: "DEFAULT" });

      await paymentWidget.renderAgreement("#toss-payment-agreement", {
        variantKey: "AGREEMENT",
      });

      window.__tossPaymentWidget = paymentWidget;
      window.__tossPaymentMethodWidget = paymentMethodWidget;
      setReady(true);
    };

    load().catch((error: any) => {
      if (!mounted) return;
      setReady(false);
      window.__tossPaymentWidget = undefined;
      window.__tossPaymentMethodWidget = undefined;
      const code = String(error?.message ?? "");
      if (code === "WIDGET_CLIENT_KEY_MISSING") {
        setLoadError("결제 설정이 올바르지 않습니다. 관리자에게 문의해주세요.");
        return;
      }
      if (code === "WIDGET_SCRIPT_LOAD_FAILED") {
        setLoadError("결제위젯을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.");
        return;
      }
      setLoadError("결제위젯 초기화 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    });
    return () => {
      mounted = false;
    };
  }, [customerKey]);

  useEffect(() => {
    const paymentMethodWidget = window.__tossPaymentMethodWidget;
    if (!paymentMethodWidget) return;

    try {
      const result = paymentMethodWidget.updateAmount(amount);

      if (result && typeof result.then === "function") {
        result.catch(() => undefined);
      }
    } catch {
      // 필요하면 개발용 로그만 남기고 무시
    }
  }, [amount]);

  return (
    <div className="space-y-3">
      {!ready && !loadError && <p className="text-sm text-muted-foreground">결제위젯을 불러오는 중입니다…</p>}
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      <div id="toss-payment-widget" className="min-h-20" />
      <div id="toss-payment-agreement" className="min-h-12" />
    </div>
  );
}
