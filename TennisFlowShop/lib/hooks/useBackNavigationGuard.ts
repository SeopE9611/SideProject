import { useEffect } from 'react';
import { UNSAVED_CHANGES_MESSAGE } from '@/lib/hooks/useUnsavedChangesGuard';

/**
 * 브라우저/시스템 back(popstate) 전용 opt-in 가드.
 * - enabled=true인 페이지에서만 동작
 * - dirty일 때만 히스토리 1칸을 추가해 back 이벤트를 로컬 confirm으로 확인
 * - 전역 click interception 없이 back 동작만 보호
 */
export function useBackNavigationGuard(enabled: boolean, message: string = UNSAVED_CHANGES_MESSAGE) {
  useEffect(() => {
    if (!enabled) return;

    let active = true;

    window.history.pushState({ __unsavedBackGuard: true }, '', window.location.href);

    const onPopState = () => {
      if (!active) return;

      const shouldLeave = window.confirm(message);
      if (!shouldLeave) {
        window.history.pushState({ __unsavedBackGuard: true }, '', window.location.href);
        return;
      }

      active = false;
      window.removeEventListener('popstate', onPopState);
      window.history.back();
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      active = false;
      window.removeEventListener('popstate', onPopState);
    };
  }, [enabled, message]);
}

