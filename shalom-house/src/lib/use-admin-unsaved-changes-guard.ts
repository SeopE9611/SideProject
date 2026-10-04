"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

export const ADMIN_UNSAVED_CHANGES_MESSAGE =
  "저장하지 않은 변경사항이 있습니다. 페이지를 벗어나면 입력한 내용이 사라집니다.";

type Guard = { message: string };

const guards = new Map<symbol, Guard>();
const HISTORY_MARKER = "__adminUnsavedChangesGuard";
let listenersInstalled = false;
let hasHistoryMarker = false;
let approvedNavigation = false;

function activeMessage() {
  return guards.values().next().value?.message ?? ADMIN_UNSAVED_CHANGES_MESSAGE;
}

function confirmNavigation() {
  if (guards.size === 0 || approvedNavigation) return true;
  return window.confirm(activeMessage());
}

function pushHistoryMarker() {
  const state = window.history.state;
  if (state && typeof state === "object" && state[HISTORY_MARKER]) {
    hasHistoryMarker = true;
    return;
  }
  window.history.pushState(
    { ...(state && typeof state === "object" ? state : {}), [HISTORY_MARKER]: true },
    "",
    window.location.href,
  );
  hasHistoryMarker = true;
}

function removeHistoryMarker() {
  const state = window.history.state;
  if (!hasHistoryMarker || !state || typeof state !== "object" || !state[HISTORY_MARKER]) return;
  const { [HISTORY_MARKER]: _marker, ...rest } = state as Record<string, unknown>;
  window.history.replaceState(Object.keys(rest).length ? rest : null, "", window.location.href);
  hasHistoryMarker = false;
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (guards.size === 0 || approvedNavigation) return;
  event.preventDefault();
  event.returnValue = "";
}

function onDocumentClick(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  ) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest<HTMLAnchorElement>("a[href]");
  if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
  const href = anchor.getAttribute("href");
  if (!href || /^(mailto:|tel:|javascript:)/i.test(href)) return;
  const destination = new URL(anchor.href, window.location.href);
  if (destination.origin !== window.location.origin || !/^https?:$/.test(destination.protocol)) return;
  if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
  if (confirmNavigation()) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function onPopState() {
  if (guards.size === 0 || approvedNavigation) return;
  if (!confirmNavigation()) {
    pushHistoryMarker();
    return;
  }
  approvedNavigation = true;
  uninstallListeners(true);
  window.history.back();
}

function installListeners() {
  if (listenersInstalled) return;
  listenersInstalled = true;
  window.addEventListener("beforeunload", onBeforeUnload);
  window.addEventListener("popstate", onPopState);
  document.addEventListener("click", onDocumentClick, true);
  pushHistoryMarker();
}

function uninstallListeners(leaving = false) {
  if (!listenersInstalled || (!leaving && guards.size > 0)) return;
  listenersInstalled = false;
  window.removeEventListener("beforeunload", onBeforeUnload);
  window.removeEventListener("popstate", onPopState);
  document.removeEventListener("click", onDocumentClick, true);
  if (!leaving) removeHistoryMarker();
}

export function useAdminUnsavedChangesGuard(isDirty: boolean, message = ADMIN_UNSAVED_CHANGES_MESSAGE) {
  const id = useRef(Symbol("admin-unsaved-changes"));
  const [intentionalNavigation, setIntentionalNavigation] = useState(false);

  const unregister = useCallback(() => {
    guards.delete(id.current);
    uninstallListeners();
  }, []);

  useEffect(() => {
    if (!isDirty || intentionalNavigation) {
      unregister();
      return;
    }
    guards.set(id.current, { message });
    installListeners();
    return unregister;
  }, [intentionalNavigation, isDirty, message, unregister]);

  const navigateAfterSave = useCallback((navigate: () => void) => {
    unregister();
    setIntentionalNavigation(true);
    try {
      navigate();
    } catch (error) {
      setIntentionalNavigation(false);
      throw error;
    }
  }, [unregister]);

  return { navigateAfterSave };
}

export function useAdminFormDirtyGuard() {
  const [isDirty, setIsDirty] = useState(false);
  const { navigateAfterSave } = useAdminUnsavedChangesGuard(isDirty);
  const markDirty = useCallback((event?: FormEvent<HTMLElement>) => {
    const target = event?.target;
    if (target instanceof Element && target.closest("[data-unsaved-ignore]")) return;
    setIsDirty(true);
  }, []);
  return { isDirty, markDirty, navigateAfterSave };
}
