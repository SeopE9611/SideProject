import { useEffect } from 'react';
import { UNSAVED_CHANGES_MESSAGE } from '@/lib/hooks/useUnsavedChangesGuard';

const BACK_GUARD_MARKER_KEY = '__unsavedBackGuard';

const isGuardState = (state: unknown, markerId: string) => {
  if (!state || typeof state !== 'object') return false;
  return (state as Record<string, unknown>)[BACK_GUARD_MARKER_KEY] === markerId;
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
        window.history.back();
      }
    };
  }, [enabled, message]);
}
