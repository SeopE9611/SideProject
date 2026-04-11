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

export default function TossPaymentWidget({ amount, customerKey }: { amount: number; customerKey: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!window.PaymentWidget) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null;
          if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error("failed")), { once: true });
            return;
          }
          const script = document.createElement("script");
          script.src = SCRIPT_SRC;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("failed"));
          document.head.appendChild(script);
        });
      }

      const clientKey = process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY;
      if (!clientKey || !window.PaymentWidget || !mounted) return;

      const paymentWidget = window.PaymentWidget(clientKey, customerKey);

      const paymentMethodWidget = await paymentWidget.renderPaymentMethods("#toss-payment-widget", { value: amount }, { variantKey: "DEFAULT" });

      await paymentWidget.renderAgreement("#toss-payment-agreement", {
        variantKey: "AGREEMENT",
      });

      window.__tossPaymentWidget = paymentWidget;
      window.__tossPaymentMethodWidget = paymentMethodWidget;
      setReady(true);
    };

    load().catch(() => setReady(false));
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
      {!ready && <p className="text-sm text-muted-foreground">결제위젯을 불러오는 중입니다…</p>}
      <div id="toss-payment-widget" className="min-h-20" />
      <div id="toss-payment-agreement" className="min-h-12" />
    </div>
  );
}
