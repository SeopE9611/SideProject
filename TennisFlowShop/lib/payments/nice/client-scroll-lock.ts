const NICEPAY_SCROLL_GUARD_ATTRIBUTE = "data-nicepay-scroll-guard-active";
const SCROLL_LOCK_ATTRIBUTE = "data-scroll-locked";

const ROOT_STYLE_PROPERTIES = [
  "overflow",
  "overflow-x",
  "overflow-y",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "width",
  "height",
  "max-width",
  "margin-right",
  "padding-right",
  "touch-action",
  "overscroll-behavior",
  "overscroll-behavior-x",
  "overscroll-behavior-y",
] as const;

type InlineStyleSnapshot = {
  property: (typeof ROOT_STYLE_PROPERTIES)[number];
  value: string;
  priority: string;
};

type RootElementSnapshot = {
  scrollLockValue: string | null;
  styles: InlineStyleSnapshot[];
};

type RootScrollSnapshot = {
  html: RootElementSnapshot;
  body: RootElementSnapshot;
  scrollX: number;
  scrollY: number;
};

type ActiveNicePayScrollGuard = {
  snapshot: RootScrollSnapshot;
  recoveryStarted: boolean;
  restoreScrollPosition: boolean;
  animationFrameIds: number[];
  timeoutIds: number[];
};

type NicePayRequestParams = Record<string, unknown> & {
  fnError?: (result: any) => void;
};

type NicePayWindow = Window & {
  AUTHNICE?: {
    requestPay?: (params: Record<string, unknown>) => void;
  };
};

let activeGuard: ActiveNicePayScrollGuard | null = null;

function captureRootElement(element: HTMLElement): RootElementSnapshot {
  return {
    scrollLockValue: element.getAttribute(SCROLL_LOCK_ATTRIBUTE),
    styles: ROOT_STYLE_PROPERTIES.map((property) => ({
      property,
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property),
    })),
  };
}

function restoreRootElement(element: HTMLElement, snapshot: RootElementSnapshot) {
  if (snapshot.scrollLockValue === null) {
    element.removeAttribute(SCROLL_LOCK_ATTRIBUTE);
  } else {
    element.setAttribute(SCROLL_LOCK_ATTRIBUTE, snapshot.scrollLockValue);
  }

  for (const { property, value, priority } of snapshot.styles) {
    if (value) {
      element.style.setProperty(property, value, priority);
    } else {
      element.style.removeProperty(property);
    }
  }
}

function forceStickyRecalculation() {
  void document.documentElement.offsetHeight;
  window.dispatchEvent(new Event("resize"));
  window.dispatchEvent(new Event("scroll"));
}

function restoreRootScrollState(guard: ActiveNicePayScrollGuard) {
  restoreRootElement(document.documentElement, guard.snapshot.html);
  restoreRootElement(document.body, guard.snapshot.body);

  if (guard.restoreScrollPosition) {
    window.scrollTo(guard.snapshot.scrollX, guard.snapshot.scrollY);
  }

  forceStickyRecalculation();
}

function clearScheduledRecovery(guard: ActiveNicePayScrollGuard) {
  for (const animationFrameId of guard.animationFrameIds) {
    window.cancelAnimationFrame(animationFrameId);
  }

  for (const timeoutId of guard.timeoutIds) {
    window.clearTimeout(timeoutId);
  }

  guard.animationFrameIds = [];
  guard.timeoutIds = [];
}

function finishRecovery(guard: ActiveNicePayScrollGuard) {
  restoreRootScrollState(guard);
  document.documentElement.removeAttribute(NICEPAY_SCROLL_GUARD_ATTRIBUTE);
  clearScheduledRecovery(guard);

  if (activeGuard === guard) {
    activeGuard = null;
  }
}

function startRecovery(guard: ActiveNicePayScrollGuard, restoreScrollPosition: boolean) {
  if (!restoreScrollPosition) {
    guard.restoreScrollPosition = false;
  }

  restoreRootScrollState(guard);

  if (guard.recoveryStarted) return;
  guard.recoveryStarted = true;

  const firstFrameId = window.requestAnimationFrame(() => {
    restoreRootScrollState(guard);

    const secondFrameId = window.requestAnimationFrame(() => restoreRootScrollState(guard));

    guard.animationFrameIds.push(secondFrameId);
  });

  guard.animationFrameIds.push(firstFrameId);

  for (const delay of [0, 50, 150, 300, 600]) {
    const timeoutId = window.setTimeout(() => restoreRootScrollState(guard), delay);

    guard.timeoutIds.push(timeoutId);
  }

  const finishTimeoutId = window.setTimeout(() => finishRecovery(guard), 700);
  guard.timeoutIds.push(finishTimeoutId);
}

function forceClearStaleNicePayScrollState() {
  const html = document.documentElement;
  const body = document.body;

  html.removeAttribute(SCROLL_LOCK_ATTRIBUTE);
  body.removeAttribute(SCROLL_LOCK_ATTRIBUTE);
  html.removeAttribute(NICEPAY_SCROLL_GUARD_ATTRIBUTE);

  for (const property of ROOT_STYLE_PROPERTIES) {
    html.style.removeProperty(property);
    body.style.removeProperty(property);
  }

  forceStickyRecalculation();
}

function beginNicePayRootScrollGuard(): () => void {
  if (typeof window === "undefined") return () => undefined;

  if (activeGuard) {
    clearScheduledRecovery(activeGuard);
    restoreRootScrollState(activeGuard);
    activeGuard = null;
  }

  const guard: ActiveNicePayScrollGuard = {
    snapshot: {
      html: captureRootElement(document.documentElement),
      body: captureRootElement(document.body),
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    },
    recoveryStarted: false,
    restoreScrollPosition: true,
    animationFrameIds: [],
    timeoutIds: [],
  };

  activeGuard = guard;

  document.documentElement.setAttribute(NICEPAY_SCROLL_GUARD_ATTRIBUTE, "true");

  return () => {
    if (activeGuard !== guard) return;
    startRecovery(guard, true);
  };
}

export function requestNicePayWithRootScrollGuard(params: NicePayRequestParams) {
  if (typeof window === "undefined") {
    throw new Error("카드/간편결제는 브라우저에서만 사용할 수 있습니다.");
  }

  const authNice = (window as NicePayWindow).AUTHNICE;

  if (typeof authNice?.requestPay !== "function") {
    throw new Error("카드/간편결제창이 준비되지 않았습니다.");
  }

  const releaseRootScrollGuard = beginNicePayRootScrollGuard();
  const originalFnError = params.fnError;

  try {
    authNice.requestPay({
      ...params,
      fnError: (result: any) => {
        releaseRootScrollGuard();
        originalFnError?.(result);
      },
    });
  } catch (error) {
    releaseRootScrollGuard();
    throw error;
  }
}

export function recoverStaleNicePayRootScrollGuard({
  restoreScrollPosition = false,
}: {
  restoreScrollPosition?: boolean;
} = {}) {
  if (typeof window === "undefined") return;

  if (activeGuard) {
    startRecovery(activeGuard, restoreScrollPosition);
    return;
  }

  if (document.documentElement.hasAttribute(NICEPAY_SCROLL_GUARD_ATTRIBUTE)) {
    forceClearStaleNicePayScrollState();
  }
}
