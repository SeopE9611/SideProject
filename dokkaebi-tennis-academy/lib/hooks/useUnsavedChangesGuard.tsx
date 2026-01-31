import { useEffect, useRef } from 'react';

// 모든 폼에서 공통으로 쓰는 기본 경고 문구 (페이지별 변수 선언 없이 사용)
export const UNSAVED_CHANGES_MESSAGE = '이 페이지를 벗어날 경우 입력한 정보는 초기화됩니다.';

export function useUnsavedChangesGuard(enabled: boolean, message: string = UNSAVED_CHANGES_MESSAGE) {
  // guard가 켜졌을 때의 URL을 기억해두면, guard가 꺼질 때 “더미 히스토리”를 정리할 수 있음
  const armedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // guard 활성화 시점 URL 저장
    armedUrlRef.current = window.location.href;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    let allow = false;
    const onPopState = () => {
      if (allow) return;
      const ok = window.confirm(message);
      if (!ok) {
        // 뒤로가기를 취소했으니 현재 페이지에 “그대로” 머물도록 히스토리를 다시 쌓음
        window.history.pushState({ ...(window.history.state ?? {}), __unsaved_changes_guard: true }, '', window.location.href);
        return;
      }
      allow = true;
      window.history.back();
    };

    // 브라우저 뒤로가기를 한번 “가로채기” 위한 더미 state
    window.history.pushState({ ...(window.history.state ?? {}), __unsaved_changes_guard: true }, '', window.location.href);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);

      /**
       * 중요: 사용자가 입력을 되돌려서 isDirty=false가 되면 guard가 꺼지는데,
       * 이때 더미 state가 남아있으면 “뒤로가기 1번이 허공”처럼 느껴질 수 있음.
       * 현재 URL이 guard 켰던 URL과 같고, top state가 guard marker면 한 번 back() 해서 정리.
       * (URL이 이미 바뀐 상황(라우팅 진행중)에서는 건드리면 안 되므로 URL 체크를 꼭 함)
       */
      const sameUrl = armedUrlRef.current && window.location.href === armedUrlRef.current;
      const hasMarker = (window.history.state as any)?.__unsaved_changes_guard;
      if (sameUrl && hasMarker) {
        window.history.back();
      }
      armedUrlRef.current = null;
    };
  }, [enabled, message]);
}
