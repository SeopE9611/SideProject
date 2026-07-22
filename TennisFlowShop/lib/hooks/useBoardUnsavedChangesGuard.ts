"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { useBackNavigationGuard } from "@/lib/hooks/useBackNavigationGuard";
import { UNSAVED_CHANGES_MESSAGE } from "@/lib/hooks/useUnsavedChangesGuard";

type ActiveGuard = { message: string };

// 게시판 작성/수정에만 전역 링크 보호를 한정한다. 기존 일반 폼의 beforeunload 정책까지
// 넓히면 관리자·체크아웃 등 검증되지 않은 화면의 이탈 UX가 바뀔 수 있기 때문이다.
const activeGuards = new Map<symbol, ActiveGuard>();
let listenersInstalled = false;
let navigationApprovedForCurrentTurn = false;

const approvedThisTurn = () => {
  navigationApprovedForCurrentTurn = true;
  queueMicrotask(() => {
    navigationApprovedForCurrentTurn = false;
  });
};

const activeMessage = (message?: string) => message ?? activeGuards.values().next().value?.message ?? UNSAVED_CHANGES_MESSAGE;

export function confirmBoardUnsavedChangesNavigation(message?: string): boolean {
  if (typeof window === "undefined" || activeGuards.size === 0 || navigationApprovedForCurrentTurn) return true;
  const approved = window.confirm(activeMessage(message));
  if (approved) approvedThisTurn();
  return approved;
}

export function runBoardUnsavedChangesNavigation(navigate: () => void, message?: string): boolean {
  if (!confirmBoardUnsavedChangesNavigation(message)) return false;
  navigate();
  return true;
}

// document listener는 네이티브 MouseEvent, React onClick은 SyntheticEvent를 받는다.
// 즉시 전파 중단 API 위치가 다르므로 취소 함수를 분리해야 한다.
const cancelNativeLink = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

const cancelReactLink = (event: React.MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault();
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation();
};

const onBeforeUnload = (event: BeforeUnloadEvent) => {
  if (activeGuards.size === 0 || navigationApprovedForCurrentTurn) return;
  event.preventDefault();
  event.returnValue = "";
};

const onDocumentClick = (event: MouseEvent) => {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest<HTMLAnchorElement>("a[href]");
  if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
  const rawHref = anchor.getAttribute("href");
  if (!rawHref || /^(mailto:|tel:|javascript:)/i.test(rawHref)) return;
  const destination = new URL(anchor.href, window.location.href);
  if (!/^https?:$/.test(destination.protocol) || destination.origin !== window.location.origin) return;
  // Header·SideMenu·Footer의 Link를 한 곳에서 보호하되 같은 문서의 hash 이동은 이탈이 아니다.
  if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
  if (!confirmBoardUnsavedChangesNavigation()) cancelNativeLink(event);
};

const installListeners = () => {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;
  window.addEventListener("beforeunload", onBeforeUnload);
  document.addEventListener("click", onDocumentClick, true);
};
const uninstallListeners = () => {
  if (!listenersInstalled || activeGuards.size > 0) return;
  listenersInstalled = false;
  window.removeEventListener("beforeunload", onBeforeUnload);
  document.removeEventListener("click", onDocumentClick, true);
};

export function useBoardUnsavedChangesGuard(isDirty: boolean, message = UNSAVED_CHANGES_MESSAGE) {
  const idRef = useRef(Symbol("board-unsaved-changes"));
  const [isIntentionalNavigation, setIsIntentionalNavigation] = useState(false);
  const guardEnabled = isDirty && !isIntentionalNavigation;

  const unregister = useCallback(() => {
    activeGuards.delete(idRef.current);
    uninstallListeners();
  }, []);
  const register = useCallback(() => {
    activeGuards.set(idRef.current, { message });
    installListeners();
  }, [message]);

  useEffect(() => {
    if (guardEnabled) register();
    else unregister();
    return unregister;
  }, [guardEnabled, register, unregister]);

  // busy는 저장 완료가 아니다. 요청/업로드 실패와 finally 경합 전까지 dirty 보호를 유지한다.
  useBackNavigationGuard(guardEnabled, message, {
    confirm: confirmBoardUnsavedChangesNavigation,
    // contenteditable 포커스가 첫 back을 소비하면 게시판 작성 화면에서 경고가 누락된다.
    editableFocusPolicy: "confirm-immediately",
  });

  const guardLinkClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!confirmBoardUnsavedChangesNavigation(message)) cancelReactLink(event);
  }, [message]);
  const confirmAndNavigate = useCallback((navigate: () => void) => runBoardUnsavedChangesNavigation(navigate, message), [message]);
  const navigateAfterSave = useCallback((navigate: () => void) => {
    // 성공 이동 전에 동기 해제해야 finally가 실행돼도 가드가 다시 켜지는 경합을 막는다.
    unregister();
    setIsIntentionalNavigation(true);
    try {
      navigate();
    } catch (error) {
      setIsIntentionalNavigation(false);
      if (isDirty) register();
      throw error;
    }
  }, [isDirty, register, unregister]);

  return { guardEnabled, guardLinkClick, confirmAndNavigate, navigateAfterSave };
}
