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

type NicePopupDocumentSnapshot = {
  scrollX: number;
  scrollY: number;
  scrollingElementScrollTop: number | null;
  htmlStyleCssText: string;
  bodyStyleCssText: string;
  htmlClassName: string;
  bodyClassName: string;
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
  const popupSessionStateRef = useRef({
    didNavigateAway: false,
    active: false,
    watchdogAnimationFrameId: null as number | null,
  });

  const isDev = process.env.NODE_ENV !== "production";

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
    };
    logDev("snapshot captured before AUTHNICE.requestPay", snapshot);
    return snapshot;
  }, [logDev]);

  const stopPopupWatchdog = useCallback(() => {
    if (popupSessionStateRef.current.watchdogAnimationFrameId !== null) {
      cancelAnimationFrame(popupSessionStateRef.current.watchdogAnimationFrameId);
      popupSessionStateRef.current.watchdogAnimationFrameId = null;
    }
  }, []);

  const startPopupWatchdog = useCallback(() => {
    if (typeof window === "undefined") return;
    stopPopupWatchdog();

    const tick = () => {
      const snapshot = popupSnapshotRef.current;
      const { active, didNavigateAway } = popupSessionStateRef.current;
      if (!snapshot || !active || didNavigateAway) {
        popupSessionStateRef.current.watchdogAnimationFrameId = null;
        return;
      }

      const currentScrollY = window.scrollY;
      const currentScrollX = window.scrollX;
      if (currentScrollY !== snapshot.scrollY || currentScrollX !== snapshot.scrollX) {
        window.scrollTo(snapshot.scrollX, snapshot.scrollY);
        if (document.scrollingElement) {
          document.scrollingElement.scrollTop = snapshot.scrollY;
          document.scrollingElement.scrollLeft = snapshot.scrollX;
        }
        logDev("watchdog detected scroll drift and restored", {
          from: { x: currentScrollX, y: currentScrollY },
          to: { x: snapshot.scrollX, y: snapshot.scrollY },
        });
      }

      popupSessionStateRef.current.watchdogAnimationFrameId = requestAnimationFrame(tick);
    };

    popupSessionStateRef.current.watchdogAnimationFrameId = requestAnimationFrame(tick);
  }, [logDev, stopPopupWatchdog]);

  const applyBackgroundScrollLock = useCallback(() => {
    const snapshot = popupSnapshotRef.current;
    if (!snapshot) return;

    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${snapshot.scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    window.scrollTo(snapshot.scrollX, snapshot.scrollY);
    logDev("background scroll lock applied", {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      bodyTop: document.body.style.top,
      scrollbarWidth,
    });
  }, [logDev]);

  const unlockBackgroundScroll = useCallback(() => {
    if (typeof window === "undefined") return;
    const snapshot = popupSnapshotRef.current;
    if (!snapshot) return;
    if (popupSessionStateRef.current.didNavigateAway) return;

    document.documentElement.style.cssText = snapshot.htmlStyleCssText;
    document.body.style.cssText = snapshot.bodyStyleCssText;
    document.documentElement.className = snapshot.htmlClassName;
    document.body.className = snapshot.bodyClassName;
    if (snapshot.scrollingElementScrollTop !== null && document.scrollingElement) {
      document.scrollingElement.scrollTop = snapshot.scrollingElementScrollTop;
      document.scrollingElement.scrollLeft = snapshot.scrollX;
    }
    window.scrollTo(snapshot.scrollX, snapshot.scrollY);
    requestAnimationFrame(() => window.scrollTo(snapshot.scrollX, snapshot.scrollY));
    logDev("background scroll lock released", {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    });
  }, [logDev]);

  const cleanupPopupLifecycleListeners = useCallback(() => {
    popupLifecycleCleanupRef.current?.();
    popupLifecycleCleanupRef.current = null;
    stopPopupWatchdog();
    popupSessionStateRef.current.active = false;
  }, [stopPopupWatchdog]);

  const restoreAfterPopupAbort = useCallback(() => {
    cleanupPopupLifecycleListeners();
    unlockBackgroundScroll();
    onSuccessNavigationAbort?.();
    setLoading(false);
  }, [cleanupPopupLifecycleListeners, onSuccessNavigationAbort, unlockBackgroundScroll]);

  const setupPopupLifecycleListeners = useCallback(() => {
    if (typeof window === "undefined") return;

    cleanupPopupLifecycleListeners();
    popupSessionStateRef.current.didNavigateAway = false;
    popupSessionStateRef.current.active = true;
    startPopupWatchdog();

    const restoreIfNeeded = () => {
      if (popupSessionStateRef.current.didNavigateAway) return;
      if (!popupSessionStateRef.current.active) return;
      logDev("popup session fallback restore triggered");
      restoreAfterPopupAbort();
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
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [cleanupPopupLifecycleListeners, logDev, restoreAfterPopupAbort, startPopupWatchdog]);

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
      popupSnapshotRef.current = null;
    };
  }, [cleanupPopupLifecycleListeners]);

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
      applyBackgroundScrollLock();
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
            restoreAfterPopupAbort();
            const msg = String(result?.errorMsg || result?.message || "결제가 취소되었거나 실패했습니다.");
            setInlineError(msg);
          },
        });
      } catch (error) {
        restoreAfterPopupAbort();
        throw error;
      }
    } catch (error: any) {
      cleanupPopupLifecycleListeners();
      unlockBackgroundScroll();
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
