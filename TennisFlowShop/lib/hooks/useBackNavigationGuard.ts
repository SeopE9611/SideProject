import { useEffect } from 'react';
import { UNSAVED_CHANGES_MESSAGE } from '@/lib/hooks/useUnsavedChangesGuard';

const BACK_GUARD_MARKER_KEY = '__unsavedBackGuard';

const isGuardState = (state: unknown, markerId: string) => {
  if (!state || typeof state !== 'object') return false;
  return (state as Record<string, unknown>)[BACK_GUARD_MARKER_KEY] === markerId;
};

const isEditableElementFocused = () => {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) return false;

  const tagName = activeElement.tagName;
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return true;

  if (activeElement.isContentEditable) return true;

  return Boolean(activeElement.closest('[contenteditable]:not([contenteditable="false"])'));
};

/**
 * 브라우저/시스템 back(popstate) 전용 opt-in 가드.
 * - enabled=true인 페이지에서만 동작
 * - dirty일 때만 히스토리 1칸을 추가해 back 이벤트를 로컬 confirm으로 확인
 * - 전역 click interception 없이 back 동작만 보호
 */
export function useBackNavigationGuard(enabled: boolean, message: string = UNSAVED_CHANGES_MESSAGE) {
  useEffect(() => {
    if (!enabled) return;

    const markerId = `back-guard-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let active = true;
    let isNavigatingAway = false;
    let hasGuardEntry = false;

    const pushGuardEntry = () => {
      const currentState = window.history.state;
      if (isGuardState(currentState, markerId)) {
        hasGuardEntry = true;
        return;
      }

      const nextState = {
        ...(currentState && typeof currentState === 'object' ? currentState : {}),
        [BACK_GUARD_MARKER_KEY]: markerId,
      };

      window.history.pushState(nextState, '', window.location.href);
      hasGuardEntry = true;
    };

    pushGuardEntry();

    const onPopState = () => {
      if (!active) return;

      if (isEditableElementFocused()) {
        // 모바일 브라우저에서는 입력 포커스/키보드 상태 변화 중 popstate가 섞이는 경우가 있어,
        // 이때는 즉시 확인창을 띄우지 않고 포커스만 해제한 뒤 현재 페이지를 유지한다.
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement) {
          activeElement.blur();
        }
        pushGuardEntry();
        return;
      }

      const shouldLeave = window.confirm(message);
      if (!shouldLeave) {
        pushGuardEntry();
        return;
      }

      isNavigatingAway = true;
      active = false;
      window.removeEventListener('popstate', onPopState);
      window.history.back();
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      active = false;
      window.removeEventListener('popstate', onPopState);

      const currentState = window.history.state;
      if (!isNavigatingAway && hasGuardEntry && isGuardState(currentState, markerId)) {
        // 언마운트 정리 시 실제 히스토리 이동을 만들지 않도록 marker만 제거한다.
        const { [BACK_GUARD_MARKER_KEY]: _marker, ...rest } = currentState as Record<string, unknown>;
        window.history.replaceState(Object.keys(rest).length > 0 ? rest : null, '', window.location.href);
      }
    };
  }, [enabled, message]);
}
