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

    /**
     * 링크 클릭(Next <Link> 포함) 이탈도 가드
     * - Ctrl/Meta/Shift/Alt 클릭(새탭/특수동작), target=_blank, download, 해시 이동(#)은 제외
     * - 예외가 필요하면 <a data-no-unsaved-guard ...> 로 opt-out 가능
     */
    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return; // 좌클릭만
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // 새탭/특수동작은 제외

      if (!(e.target instanceof Element)) return;
      const a = e.target.closest('a');
      if (!a) return;
      if (a.hasAttribute('data-no-unsaved-guard')) return;
      if ((a as HTMLAnchorElement).target === '_blank') return;
      if (a.hasAttribute('download')) return;

      const hrefAttr = a.getAttribute('href');
      if (!hrefAttr) return;
      if (hrefAttr.startsWith('#')) return; // 같은 페이지 해시 이동은 경고 X

      // 현재 URL과 “경로+쿼리”가 같으면(해시만 바뀌는 경우 포함) 경고 X
      try {
        const nextUrl = new URL((a as HTMLAnchorElement).href, window.location.href);
        const curUrl = new URL(window.location.href);
        if (nextUrl.origin === curUrl.origin && nextUrl.pathname === curUrl.pathname && nextUrl.search === curUrl.search) return;
      } catch {
        // URL 파싱 실패는 무시
        return;
      }

      const ok = window.confirm(message);
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 브라우저 뒤로가기를 한번 “가로채기” 위한 더미 state
    window.history.pushState({ ...(window.history.state ?? {}), __unsaved_changes_guard: true }, '', window.location.href);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);
     document.addEventListener('click', onClickCapture, true);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onClickCapture, true);

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
