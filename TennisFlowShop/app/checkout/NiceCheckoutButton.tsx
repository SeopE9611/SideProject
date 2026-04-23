"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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

type StickyAncestorSnapshot = {
  tag: string;
  className: string;
  overflow: string;
  overflowX: string;
  overflowY: string;
  transform: string;
  position: string;
};

type NicePopupDocumentSnapshot = {
  scrollX: number;
  scrollY: number;
  scrollingElementScrollTop: number | null;
  htmlStyleCssText: string;
  bodyStyleCssText: string;
  htmlClassName: string;
  bodyClassName: string;
  stickyAncestors: StickyAncestorSnapshot[];
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
  const popupLifecycleCleanupRef = useRef<(() => void) | null>(null);
  const popupSnapshotRef = useRef<NicePopupDocumentSnapshot | null>(null);
  const popupRestoreTimeoutsRef = useRef<number[]>([]);
  const popupSessionStateRef = useRef({
    didNavigateAway: false,
    didRestore: false,
  });

  const isDev = process.env.NODE_ENV !== "production";

  const clearRestoreTimeouts = useCallback(() => {
    popupRestoreTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    popupRestoreTimeoutsRef.current = [];
  }, []);

  const logDev = useCallback(
    (message: string, detail?: unknown) => {
      if (!isDev) return;
      if (detail === undefined) {
        console.info(`[NiceCheckoutButton] ${message}`);
        return;
      }
      console.info(`[NiceCheckoutButton] ${message}`, detail);
    },
    [isDev],
  );

  const readStickyAncestorSnapshot = useCallback((): StickyAncestorSnapshot[] => {
    if (typeof window === "undefined") return [];
    const stickyRoot = document.querySelector(".bp-lg\\:sticky");
    if (!(stickyRoot instanceof HTMLElement)) return [];

    const rows: StickyAncestorSnapshot[] = [];
    let current: HTMLElement | null = stickyRoot;
    while (current) {
      const computed = window.getComputedStyle(current);
      rows.push({
        tag: current.tagName.toLowerCase(),
        className: current.className,
        overflow: computed.overflow,
        overflowX: computed.overflowX,
        overflowY: computed.overflowY,
        transform: computed.transform,
        position: computed.position,
      });
      current = current.parentElement;
    }
    return rows;
  }, []);

  const capturePopupSnapshot = useCallback((): NicePopupDocumentSnapshot | null => {
    if (typeof window === "undefined") return null;
    const snapshot: NicePopupDocumentSnapshot = {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      scrollingElementScrollTop: document.scrollingElement?.scrollTop ?? null,
      htmlStyleCssText: document.documentElement.style.cssText,
      bodyStyleCssText: document.body.style.cssText,
      htmlClassName: document.documentElement.className,
      bodyClassName: document.body.className,
      stickyAncestors: readStickyAncestorSnapshot(),
    };
    logDev("snapshot captured before AUTHNICE.requestPay", snapshot);
    return snapshot;
  }, [logDev, readStickyAncestorSnapshot]);

  const restorePageAfterNicePopup = useCallback(() => {
    if (typeof window === "undefined") return;
    const snapshot = popupSnapshotRef.current;
    if (!snapshot) return;
    if (popupSessionStateRef.current.didRestore) return;
    if (popupSessionStateRef.current.didNavigateAway) return;

    popupSessionStateRef.current.didRestore = true;
    clearRestoreTimeouts();

    const applyRestore = () => {
      document.documentElement.style.cssText = snapshot.htmlStyleCssText;
      document.body.style.cssText = snapshot.bodyStyleCssText;
      document.documentElement.className = snapshot.htmlClassName;
      document.body.className = snapshot.bodyClassName;
      if (snapshot.scrollingElementScrollTop !== null && document.scrollingElement) {
        document.scrollingElement.scrollTop = snapshot.scrollingElementScrollTop;
      }
      window.scrollTo(snapshot.scrollX, snapshot.scrollY);
      window.dispatchEvent(new Event("resize"));
    };

    applyRestore();
    requestAnimationFrame(() => {
      applyRestore();
      requestAnimationFrame(() => applyRestore());
    });
    const timeoutId = window.setTimeout(() => {
      applyRestore();
      logDev("snapshot restored after popup close", {
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        scrollingElementScrollTop: document.scrollingElement?.scrollTop ?? null,
        htmlStyleCssText: document.documentElement.style.cssText,
        bodyStyleCssText: document.body.style.cssText,
        htmlClassName: document.documentElement.className,
        bodyClassName: document.body.className,
        stickyAncestors: readStickyAncestorSnapshot(),
      });
    }, 120);
    popupRestoreTimeoutsRef.current.push(timeoutId);
  }, [clearRestoreTimeouts, logDev, readStickyAncestorSnapshot]);

  const cleanupPopupLifecycleListeners = useCallback(() => {
    popupLifecycleCleanupRef.current?.();
    popupLifecycleCleanupRef.current = null;
  }, []);

  const setupPopupLifecycleListeners = useCallback(() => {
    if (typeof window === "undefined") return;

    cleanupPopupLifecycleListeners();
    popupSessionStateRef.current.didNavigateAway = false;
    popupSessionStateRef.current.didRestore = false;

    const observer =
      isDev
        ? new MutationObserver((mutationList) => {
            const interesting = mutationList
              .filter((mutation) => mutation.type === "attributes")
              .map((mutation) => `${(mutation.target as Element).tagName.toLowerCase()}.${mutation.attributeName}`);
            if (interesting.length > 0) logDev("html/body attribute mutated during popup session", interesting);
          })
        : null;
    observer?.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    observer?.observe(document.body, { attributes: true, attributeFilter: ["style", "class"] });

    const restoreIfNeeded = () => {
      restorePageAfterNicePopup();
      cleanupPopupLifecycleListeners();
    };

    const onFocus = () => restoreIfNeeded();
    const onVisibilityChange = () => {
      if (!document.hidden) restoreIfNeeded();
    };
    const onPageShow = () => restoreIfNeeded();
    const onPageHide = () => {
      popupSessionStateRef.current.didNavigateAway = true;
    };
    const onBeforeUnload = () => {
      popupSessionStateRef.current.didNavigateAway = true;
    };

    window.addEventListener("focus", onFocus, { once: true });
    window.addEventListener("pageshow", onPageShow, { once: true });
    window.addEventListener("pagehide", onPageHide, { once: true });
    window.addEventListener("beforeunload", onBeforeUnload, { once: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    popupLifecycleCleanupRef.current = () => {
      observer?.disconnect();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [cleanupPopupLifecycleListeners, isDev, logDev, restorePageAfterNicePopup]);

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

  useEffect(() => {
    return () => {
      cleanupPopupLifecycleListeners();
      clearRestoreTimeouts();
    };
  }, [cleanupPopupLifecycleListeners, clearRestoreTimeouts]);

  const isDisabled = useMemo(() => disabled || loading || !scriptReady || !!scriptError, [disabled, loading, scriptReady, scriptError]);

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
        onSuccessNavigationAbort?.();
        throw new Error(prepJson?.error || "Nice 결제 준비에 실패했습니다.");
      }

      if (typeof window.AUTHNICE?.requestPay !== "function") {
        onSuccessNavigationAbort?.();
        throw new Error("Nice 결제창이 준비되지 않았습니다.");
      }

      onBeforeSuccessNavigation?.();
      popupSnapshotRef.current = capturePopupSnapshot();
      setupPopupLifecycleListeners();
      try {
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
            cleanupPopupLifecycleListeners();
            restorePageAfterNicePopup();
            onSuccessNavigationAbort?.();
            const msg = String(result?.errorMsg || result?.message || "결제가 취소되었거나 실패했습니다.");
            setInlineError(msg);
            setLoading(false);
          },
        });
      } catch (error) {
        cleanupPopupLifecycleListeners();
        restorePageAfterNicePopup();
        onSuccessNavigationAbort?.();
        throw error;
      }
    } catch (error: any) {
      cleanupPopupLifecycleListeners();
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
