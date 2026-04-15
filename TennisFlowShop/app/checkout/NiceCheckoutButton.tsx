"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    goPay?: (form: HTMLFormElement) => void;
    nicepaySubmit?: () => void;
  }
}

const NICEPAY_SCRIPT_SRC = "https://pg-web.nicepay.co.kr/v3/common/js/nicepay-pgweb.js";

type NicePrepareResponse = {
  success: boolean;
  amount: number;
  orderName: string;
  nice?: Record<string, string>;
  error?: string;
};

export default function NiceCheckoutButton({
  disabled,
  payload,
  onBeforeSuccessNavigation,
  onSuccessNavigationAbort,
}: {
  disabled: boolean;
  payload: Record<string, unknown>;
  onBeforeSuccessNavigation?: () => void;
  onSuccessNavigationAbort?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const pendingFormRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    let mounted = true;

    const attachScript = async () => {
      setScriptError(null);
      setScriptReady(false);

      if (typeof window === "undefined") return;
      if (typeof window.goPay === "function") {
        setScriptReady(true);
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[src="${NICEPAY_SCRIPT_SRC}"]`) as HTMLScriptElement | null;
        if (existing) {
          if (typeof window.goPay === "function") {
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
      if (typeof window.goPay !== "function") throw new Error("NICE_WIDGET_UNAVAILABLE");
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    // PC 인증 완료 후 NICE 결제창이 호출하는 전역 콜백.
    // 이 시점에 인증 응답 필드가 form에 세팅되므로 action(target)으로 submit한다.
    window.nicepaySubmit = () => {
      const form = pendingFormRef.current;
      if (!form) return;
      form.submit();
    };

    return () => {
      if (window.nicepaySubmit) delete window.nicepaySubmit;
    };
  }, []);

  const isDisabled = useMemo(() => {
    return disabled || loading || !scriptReady || !!scriptError;
  }, [disabled, loading, scriptReady, scriptError]);

  const handleClick = async () => {
    if (isDisabled) return;
    setInlineError(null);
    setLoading(true);

    try {
      const prepRes = await fetch("/api/payments/nice/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const prepJson = (await prepRes.json().catch(() => null)) as NicePrepareResponse | null;
      if (!prepRes.ok || !prepJson?.success || !prepJson?.nice) {
        throw new Error(prepJson?.error || "Nice 결제 준비에 실패했습니다.");
      }

      if (typeof window.goPay !== "function") {
        throw new Error("Nice 결제창이 준비되지 않았습니다.");
      }

      const form = document.createElement("form");
      form.method = "post";
      form.action = "/api/payments/nice/return";
      form.target = "_self";
      form.acceptCharset = "euc-kr";
      form.style.display = "none";

      const fields: Record<string, string> = {
        ...prepJson.nice,
        GoodsName: prepJson.orderName,
      };

      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value ?? "";
        form.appendChild(input);
      });

      document.body.appendChild(form);
      pendingFormRef.current = form;

      onBeforeSuccessNavigation?.();
      try {
        window.goPay(form);
      } catch (error) {
        onSuccessNavigationAbort?.();
        throw error;
      }

      // PC는 nicepaySubmit()에서 submit 후 정리되고,
      // 모바일은 ReturnURL 기반 redirect 흐름을 사용하므로 fallback 정리를 둔다.
      setTimeout(() => {
        if (pendingFormRef.current === form) pendingFormRef.current = null;
        form.remove();
      }, 60000);
    } catch (error: any) {
      if (pendingFormRef.current) {
        pendingFormRef.current.remove();
        pendingFormRef.current = null;
      }
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
          "NicePG로 결제하기"
        )}
      </Button>
      {!scriptError && !scriptReady && <p className="text-xs text-muted-foreground">Nice 결제창 준비 중입니다. 잠시 후 다시 시도해주세요.</p>}
      {scriptError && <p className="text-xs text-destructive">{scriptError}</p>}
      {inlineError && <p className="text-xs text-destructive">{inlineError}</p>}
    </div>
  );
}
