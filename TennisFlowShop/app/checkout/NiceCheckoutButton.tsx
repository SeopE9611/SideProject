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

type TrackedElementSnapshot = {
  element: Element;
  tagName: string;
  id: string;
  className: string;
  styleCssText: string;
  rect: {
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
  computed: {
    overflow: string;
    overflowX: string;
    overflowY: string;
    transform: string;
    filter: string;
    contain: string;
    perspective: string;
    position: string;
    top: string;
    left: string;
    right: string;
    width: string;
    height: string;
  };
};

type MutationChangeRecord = {
  element: Element;
  attributeName: "class" | "style";
  beforeValue: string;
  afterValue: string;
};

type NicePopupDocumentSnapshot = {
  scrollX: number;
  scrollY: number;
  scrollingElementScrollTop: number | null;
  scrollingElementScrollLeft: number | null;
  stickyElement: Element | null;
  stickyParentChainPaths: string[];
  stickyChain: TrackedElementSnapshot[];
  trackedElements: TrackedElementSnapshot[];
};

type ElementRuntimeMetrics = {
  className: string;
  styleCssText: string;
  computed: TrackedElementSnapshot["computed"];
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  offsetParent: string | null;
  scrollTop: number | null;
  scrollLeft: number | null;
};

const STYLE_OR_CLASS_OBSERVER_CONFIG: MutationObserverInit = {
  attributes: true,
  attributeFilter: ["style", "class"],
  attributeOldValue: true,
  subtree: true,
  childList: true,
};

const DEBUG_PREFIX = "[checkout:nice-debug]";
const MUTATION_PREFIX = "[checkout:nice-mutation]";
const CHAIN_PREFIX = "[checkout:nice-chain]";
const CRITICAL_PREFIX = "[checkout:nice-critical]";
const STICKY_CRITICAL_PROPS = [
  "overflow",
  "overflowX",
  "overflowY",
  "transform",
  "filter",
  "contain",
  "perspective",
  "position",
  "top",
  "left",
  "right",
  "width",
  "height",
] as const;

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
  const popupMutationObserverRef = useRef<MutationObserver | null>(null);
  const popupMutationChangesRef = useRef<MutationChangeRecord[]>([]);
  const popupRootCauseSnapshotsRef = useRef<TrackedElementSnapshot[]>([]);
  const popupAuditTimerRef = useRef<number | null>(null);
  const popupSessionStateRef = useRef({
    didNavigateAway: false,
    active: false,
  });

  const isDev = process.env.NODE_ENV !== "production";

  const logDev = useCallback(
    (message: string, detail?: unknown, prefix: string = DEBUG_PREFIX) => {
      if (!isDev) return;
      if (detail === undefined) {
        console.info(`${prefix} ${message}`);
        return;
      }
      console.info(`${prefix} ${message}`, detail);
    },
    [isDev],
  );

  const describeElement = useCallback((element: Element) => {
    const classValue = element.getAttribute("class") || "";
    const classSuffix = classValue ? `.${classValue.trim().replace(/\s+/g, ".")}` : "";
    const idSuffix = element.id ? `#${element.id}` : "";
    return `${element.tagName.toLowerCase()}${idSuffix}${classSuffix}`;
  }, []);

  const createElementSnapshot = useCallback((element: Element): TrackedElementSnapshot => {
    const computedStyle = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      element,
      tagName: element.tagName,
      id: element.id,
      className: element.getAttribute("class") || "",
      styleCssText: element.getAttribute("style") || "",
      rect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
      computed: {
        overflow: computedStyle.overflow,
        overflowX: computedStyle.overflowX,
        overflowY: computedStyle.overflowY,
        transform: computedStyle.transform,
        filter: computedStyle.filter,
        contain: computedStyle.contain,
        perspective: computedStyle.perspective,
        position: computedStyle.position,
        top: computedStyle.top,
        left: computedStyle.left,
        right: computedStyle.right,
        width: computedStyle.width,
        height: computedStyle.height,
      },
    };
  }, []);

  const buildElementPath = useCallback((element: Element | null): string => {
    if (!element) return "(null)";
    const nodes: string[] = [];
    let current: Element | null = element;
    while (current) {
      nodes.unshift(describeElement(current));
      if (current === document.documentElement) break;
      current = current.parentElement;
    }
    return nodes.join(" > ");
  }, [describeElement]);

  const getParentChainElements = useCallback((element: Element | null): Element[] => {
    const chain: Element[] = [];
    let current = element;
    while (current) {
      chain.push(current);
      if (current === document.documentElement) break;
      current = current.parentElement;
    }
    return chain;
  }, []);

  const captureRuntimeMetrics = useCallback((element: Element): ElementRuntimeMetrics => {
    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const isHTMLElement = element instanceof HTMLElement;
    const offsetParent = isHTMLElement ? element.offsetParent : null;

    return {
      className: element.getAttribute("class") || "",
      styleCssText: element.getAttribute("style") || "",
      computed: {
        overflow: computed.overflow,
        overflowX: computed.overflowX,
        overflowY: computed.overflowY,
        transform: computed.transform,
        filter: computed.filter,
        contain: computed.contain,
        perspective: computed.perspective,
        position: computed.position,
        top: computed.top,
        left: computed.left,
        right: computed.right,
        width: computed.width,
        height: computed.height,
      },
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      offsetParent: offsetParent ? describeElement(offsetParent) : null,
      scrollTop: isHTMLElement ? element.scrollTop : null,
      scrollLeft: isHTMLElement ? element.scrollLeft : null,
    };
  }, [describeElement]);

  const collectStickyAndRootCandidates = useCallback(() => {
    const stickyElement = document.querySelector(".bp-lg\\:sticky");
    const stickyChainElements: Element[] = [];
    if (stickyElement) {
      let current: Element | null = stickyElement;
      while (current) {
        stickyChainElements.push(current);
        if (current === document.documentElement) break;
        current = current.parentElement;
      }
    }

    const appRootCandidates = new Set<Element>();
    appRootCandidates.add(document.documentElement);
    appRootCandidates.add(document.body);

    const firstBodyChild = document.body.firstElementChild;
    if (firstBodyChild) appRootCandidates.add(firstBodyChild);

    const main = document.querySelector("main");
    if (main) appRootCandidates.add(main);

    document.querySelectorAll("[data-nextjs-scroll-focus-boundary]").forEach((el) => {
      appRootCandidates.add(el);
    });

    const overlayCandidates = document.querySelectorAll(
      '[id*="nice" i], [class*="nice" i], [id*="overlay" i], [class*="overlay" i], [class*="popup" i], [class*="modal" i]'
    );
    overlayCandidates.forEach((el) => appRootCandidates.add(el));

    const trackedSet = new Set<Element>([...stickyChainElements, ...Array.from(appRootCandidates)]);

    return {
      stickyChainElements,
      trackedElements: Array.from(trackedSet),
    };
  }, []);

  const capturePopupSnapshot = useCallback((): NicePopupDocumentSnapshot | null => {
    if (typeof window === "undefined") return null;

    const { stickyChainElements, trackedElements } = collectStickyAndRootCandidates();
    const stickyElement = stickyChainElements[0] ?? null;
    const stickyChainSnapshots = stickyChainElements.map((el) => createElementSnapshot(el));
    const trackedSnapshots = trackedElements.map((el) => createElementSnapshot(el));
    const stickyParentChainPaths = stickyChainElements.map((el) => buildElementPath(el));

    const snapshot: NicePopupDocumentSnapshot = {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      scrollingElementScrollTop: document.scrollingElement?.scrollTop ?? null,
      scrollingElementScrollLeft: document.scrollingElement?.scrollLeft ?? null,
      stickyElement,
      stickyParentChainPaths,
      stickyChain: stickyChainSnapshots,
      trackedElements: trackedSnapshots,
    };

    logDev(
      "requestPay 직전 sticky ancestor chain",
      stickyChainSnapshots.map((item) => ({
        elementPath: buildElementPath(item.element),
        overflow: item.computed.overflow,
        overflowX: item.computed.overflowX,
        overflowY: item.computed.overflowY,
        transform: item.computed.transform,
        filter: item.computed.filter,
        contain: item.computed.contain,
        perspective: item.computed.perspective,
        position: item.computed.position,
        rect: item.rect,
      })),
      CHAIN_PREFIX,
    );
    logDev("requestPay 직전 tracked snapshot 수", {
      stickyChainCount: stickyChainSnapshots.length,
      trackedCount: trackedSnapshots.length,
    }, DEBUG_PREFIX);

    return snapshot;
  }, [buildElementPath, collectStickyAndRootCandidates, createElementSnapshot, logDev]);

  const stopMutationObserver = useCallback(() => {
    popupMutationObserverRef.current?.disconnect();
    popupMutationObserverRef.current = null;
  }, []);

  const isCandidateElementForTracking = useCallback((element: Element, snapshot: NicePopupDocumentSnapshot) => {
    if (element === document.documentElement || element === document.body) return true;

    const trackedSet = new Set(snapshot.trackedElements.map((item) => item.element));
    if (trackedSet.has(element)) return true;

    const classOrId = `${element.id} ${element.getAttribute("class") || ""}`.toLowerCase();
    return /(next|root|layout|wrap|overlay|popup|modal|nice)/.test(classOrId);
  }, []);

  const getElementCategories = useCallback((element: Element, snapshot: NicePopupDocumentSnapshot) => {
    const categories: string[] = [];
    if (element === document.documentElement) categories.push("html");
    if (element === document.body) categories.push("body");
    if (element === document.body.firstElementChild) categories.push("root");
    if (element === document.querySelector("main")) categories.push("main");
    if (snapshot.stickyElement && element === snapshot.stickyElement) categories.push("sticky");
    if (snapshot.stickyChain.some((item) => item.element === element)) categories.push("sticky-ancestor");
    if (!categories.length) categories.push("self");
    return categories;
  }, []);

  const getCriticalDiff = useCallback((before: TrackedElementSnapshot["computed"], after: TrackedElementSnapshot["computed"]) => {
    return STICKY_CRITICAL_PROPS.filter((key) => before[key] !== after[key]).map((key) => ({
      prop: key,
      before: before[key],
      after: after[key],
    }));
  }, []);

  const ensureTrackedSnapshot = useCallback((element: Element, snapshot: NicePopupDocumentSnapshot) => {
    if (snapshot.trackedElements.some((item) => item.element === element)) return;
    snapshot.trackedElements.push(createElementSnapshot(element));
    logDev("mutation 중 신규 tracked 요소 추가", {
      element: describeElement(element),
      trackedCount: snapshot.trackedElements.length,
    }, MUTATION_PREFIX);
  }, [createElementSnapshot, describeElement, logDev]);

  const startMutationObserver = useCallback(() => {
    const snapshot = popupSnapshotRef.current;
    if (!snapshot) return;

    stopMutationObserver();
    popupMutationChangesRef.current = [];
    popupRootCauseSnapshotsRef.current = [];

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (!popupSessionStateRef.current.active) continue;
        if (mutation.type === "attributes") {
          const attributeName = mutation.attributeName;
          if (!attributeName || (attributeName !== "class" && attributeName !== "style")) continue;
          const target = mutation.target;
          if (!(target instanceof Element)) continue;
          if (!isCandidateElementForTracking(target, snapshot)) continue;

          ensureTrackedSnapshot(target, snapshot);
          const beforeValue = mutation.oldValue || "";
          const afterValue = target.getAttribute(attributeName) || "";
          if (beforeValue === afterValue) continue;

          popupMutationChangesRef.current.push({
            element: target,
            attributeName,
            beforeValue,
            afterValue,
          });

          const beforeSnapshot = snapshot.trackedElements.find((item) => item.element === target) ?? createElementSnapshot(target);
          const afterMetrics = captureRuntimeMetrics(target);
          const criticalDiff = getCriticalDiff(beforeSnapshot.computed, afterMetrics.computed);
          const isStickyAncestor = snapshot.stickyChain.some((entry) => entry.element === target);
          const isHtml = target === document.documentElement;
          const hasStickyCriticalDiff = criticalDiff.length > 0;

          if (hasStickyCriticalDiff && (isHtml || isStickyAncestor) && !popupRootCauseSnapshotsRef.current.some((entry) => entry.element === target)) {
            popupRootCauseSnapshotsRef.current.push(beforeSnapshot);
          }

          logDev("runtime mutation 감지", {
            kind: "attr",
            timestamp: Date.now(),
            targetPath: buildElementPath(target),
            changedAttr: attributeName,
            baselineClass: beforeSnapshot.className,
            currentClass: afterMetrics.className,
            baselineStyle: beforeSnapshot.styleCssText,
            currentStyle: afterMetrics.styleCssText,
            baselineComputed: beforeSnapshot.computed,
            currentComputed: afterMetrics.computed,
            criticalDiff,
            baselineRect: beforeSnapshot.rect,
            currentRect: afterMetrics.rect,
            isStickyAncestorChainElement: isStickyAncestor,
            categories: getElementCategories(target, snapshot),
          }, MUTATION_PREFIX);
          if (criticalDiff.length > 0) {
            logDev("critical prop diff 감지", {
              timestamp: Date.now(),
              targetPath: buildElementPath(target),
              criticalDiff,
            }, CRITICAL_PREFIX);
          }
        }

        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            const currentStickyChain = getParentChainElements(snapshot.stickyElement);
            const addedNodeIsStickyAncestor = currentStickyChain.includes(node);
            const nearCoreLayout =
              node.parentElement === document.body ||
              node.parentElement === document.documentElement ||
              node.parentElement === document.body.firstElementChild ||
              node.parentElement === document.querySelector("main");
            const classOrId = `${node.id} ${node.getAttribute("class") || ""}`.toLowerCase();
            const overlayLike = /(overlay|popup|modal|nice)/.test(classOrId);
            logDev("childList added node", {
              kind: "child-added",
              timestamp: Date.now(),
              addedNodePath: buildElementPath(node),
              parentPath: buildElementPath(node.parentElement),
              addedNodeIsStickyAncestor,
              nearCoreLayout,
              overlayLike,
              categories: getElementCategories(node, snapshot),
            }, MUTATION_PREFIX);
          });
          mutation.removedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            logDev("childList removed node", {
              kind: "child-removed",
              timestamp: Date.now(),
              removedNodePath: describeElement(node),
              wasStickyAncestor: snapshot.stickyChain.some((entry) => entry.element === node),
            }, MUTATION_PREFIX);
          });
        }
      }
    });

    observer.observe(document.documentElement, STYLE_OR_CLASS_OBSERVER_CONFIG);
    observer.observe(document.body, STYLE_OR_CLASS_OBSERVER_CONFIG);
    popupMutationObserverRef.current = observer;
    logDev("popup session mutation observer started", {
      observedRoots: ["document.documentElement", "document.body"],
    }, DEBUG_PREFIX);
  }, [
    buildElementPath,
    captureRuntimeMetrics,
    createElementSnapshot,
    describeElement,
    ensureTrackedSnapshot,
    getCriticalDiff,
    getElementCategories,
    getParentChainElements,
    isCandidateElementForTracking,
    logDev,
    stopMutationObserver,
  ]);

  const restoreRootCauseElements = useCallback(() => {
    for (const item of popupRootCauseSnapshotsRef.current) {
      const { element, className, styleCssText } = item;
      if (!element.isConnected) continue;

      if (className) {
        element.setAttribute("class", className);
      } else {
        element.removeAttribute("class");
      }

      if (styleCssText) {
        element.setAttribute("style", styleCssText);
      } else {
        element.removeAttribute("style");
      }
    }
  }, []);

  const restoreDomAfterPopupAbort = useCallback(() => {
    if (typeof window === "undefined") return;
    const snapshot = popupSnapshotRef.current;
    if (!snapshot) return;
    if (popupSessionStateRef.current.didNavigateAway) return;

    stopMutationObserver();
    restoreRootCauseElements();

    if (snapshot.scrollingElementScrollTop !== null && document.scrollingElement) {
      document.scrollingElement.scrollTop = snapshot.scrollingElementScrollTop;
    }
    if (snapshot.scrollingElementScrollLeft !== null && document.scrollingElement) {
      document.scrollingElement.scrollLeft = snapshot.scrollingElementScrollLeft;
    }
    window.scrollTo(snapshot.scrollX, snapshot.scrollY);
    requestAnimationFrame(() => {
      window.scrollTo(snapshot.scrollX, snapshot.scrollY);
      if (snapshot.scrollingElementScrollTop !== null && document.scrollingElement) {
        document.scrollingElement.scrollTop = snapshot.scrollingElementScrollTop;
      }
      if (snapshot.scrollingElementScrollLeft !== null && document.scrollingElement) {
        document.scrollingElement.scrollLeft = snapshot.scrollingElementScrollLeft;
      }
    });

    logDev(
      "popup 종료 직후 변경된 class/style",
      popupMutationChangesRef.current.map((entry) => ({
        element: describeElement(entry.element),
        attribute: entry.attributeName,
        before: entry.beforeValue,
        after: entry.afterValue,
      })),
    );

    const restoredChain = snapshot.stickyChain
      .map((entry) => {
        if (!entry.element.isConnected) return null;
        const computed = window.getComputedStyle(entry.element);
        return {
          element: describeElement(entry.element),
          overflow: computed.overflow,
          overflowX: computed.overflowX,
          overflowY: computed.overflowY,
          transform: computed.transform,
          filter: computed.filter,
          contain: computed.contain,
          perspective: computed.perspective,
          position: computed.position,
          className: entry.element.getAttribute("class") || "",
          styleCssText: entry.element.getAttribute("style") || "",
        };
      })
      .filter(Boolean);

    logDev("restore 이후 sticky ancestor chain", restoredChain);
  }, [describeElement, logDev, restoreRootCauseElements, stopMutationObserver]);

  const cleanupPopupLifecycleListeners = useCallback(() => {
    popupLifecycleCleanupRef.current?.();
    popupLifecycleCleanupRef.current = null;
    if (popupAuditTimerRef.current !== null) {
      window.clearTimeout(popupAuditTimerRef.current);
      popupAuditTimerRef.current = null;
    }
    stopMutationObserver();
    popupSessionStateRef.current.active = false;
  }, [stopMutationObserver]);

  const logStickyChainDiff = useCallback((label: string) => {
    const snapshot = popupSnapshotRef.current;
    if (!snapshot) return;
    const stickyElement = snapshot.stickyElement ?? document.querySelector(".bp-lg\\:sticky");
    if (!stickyElement) {
      logDev(`${label} sticky element not found`, undefined, CHAIN_PREFIX);
      return;
    }
    const currentChainElements = getParentChainElements(stickyElement);
    const currentChainPaths = currentChainElements.map((el) => buildElementPath(el));
    const baselineChainPaths = snapshot.stickyParentChainPaths;
    const baselineChainElements = snapshot.stickyChain.map((item) => item.element);
    const insertedWrappers = currentChainElements
      .filter((el) => !baselineChainElements.includes(el))
      .map((el) => buildElementPath(el));
    const removedAncestors = baselineChainElements
      .filter((el) => !currentChainElements.includes(el))
      .map((el) => buildElementPath(el));
    const stickyRect = stickyElement.getBoundingClientRect();
    logDev(label, {
      timestamp: Date.now(),
      stickyRect: {
        top: stickyRect.top,
        left: stickyRect.left,
        right: stickyRect.right,
        bottom: stickyRect.bottom,
        width: stickyRect.width,
        height: stickyRect.height,
      },
      baselineParentChain: baselineChainPaths,
      currentParentChain: currentChainPaths,
      baselineLength: baselineChainPaths.length,
      currentLength: currentChainPaths.length,
      chainLengthDelta: currentChainPaths.length - baselineChainPaths.length,
      insertedWrappers,
      removedAncestors,
    }, CHAIN_PREFIX);
  }, [buildElementPath, getParentChainElements, logDev]);

  const restoreAfterPopupAbort = useCallback(() => {
    cleanupPopupLifecycleListeners();
    restoreDomAfterPopupAbort();
    onSuccessNavigationAbort?.();
    setLoading(false);
  }, [cleanupPopupLifecycleListeners, onSuccessNavigationAbort, restoreDomAfterPopupAbort]);

  const setupPopupLifecycleListeners = useCallback(() => {
    if (typeof window === "undefined") return;

    cleanupPopupLifecycleListeners();
    popupSessionStateRef.current.didNavigateAway = false;
    popupSessionStateRef.current.active = true;
    startMutationObserver();

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
  }, [cleanupPopupLifecycleListeners, logDev, restoreAfterPopupAbort, startMutationObserver]);

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

        [0, 50, 150, 300].forEach((delay) => {
          window.setTimeout(() => {
            logStickyChainDiff(`requestPay +${delay}ms chain diff`);
          }, delay);
        });
        setTimeout(() => {
          logDev("requestPay 호출 직후 누적 변경 수", popupMutationChangesRef.current.length, DEBUG_PREFIX);
        }, 0);
        popupAuditTimerRef.current = window.setTimeout(() => {
          const stickyElement = document.querySelector(".bp-lg\\:sticky");
          const stickyMetrics = stickyElement ? captureRuntimeMetrics(stickyElement) : null;
          logDev("requestPay 이후 500ms 분석", {
            changedCount: popupMutationChangesRef.current.length,
            rootCauseCount: popupRootCauseSnapshotsRef.current.length,
            rootCauseElements: popupRootCauseSnapshotsRef.current.map((entry) => ({
              element: describeElement(entry.element),
              beforeClass: entry.className,
              beforeStyle: entry.styleCssText,
              beforeComputed: entry.computed,
              beforeRect: entry.rect,
            })),
            stickyMetrics,
          }, DEBUG_PREFIX);
          popupAuditTimerRef.current = null;
        }, 500);
      } catch (error) {
        restoreAfterPopupAbort();
        throw error;
      }
    } catch (error: any) {
      cleanupPopupLifecycleListeners();
      restoreDomAfterPopupAbort();
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
