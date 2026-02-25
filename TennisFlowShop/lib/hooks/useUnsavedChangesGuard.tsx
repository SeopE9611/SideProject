import { useEffect, useRef } from 'react';

// 모든 폼에서 공통으로 쓰는 기본 경고 문구 (페이지별 변수 선언 없이 사용)
export const UNSAVED_CHANGES_MESSAGE = '이 페이지를 벗어날 경우 입력한 정보는 초기화됩니다.';

/**
 * 전역(singleton) 가드 관리자
 * - 여러 컴포넌트가 동시에 useUnsavedChangesGuard(true)를 호출해도
 *   이벤트 리스너/더미 history는 "한 번만" 설치되도록 ref-count로 관리
 */
let __guardCount = 0;
let __armedUrl: string | null = null;
let __message: string = UNSAVED_CHANGES_MESSAGE;
let __installed = false;

let __onBeforeUnload: ((e: BeforeUnloadEvent) => void) | null = null;
let __onPopState: (() => void) | null = null;
let __onClickCapture: ((e: MouseEvent) => void) | null = null;

function __installGuard() {
  if (__installed) return;
  __installed = true;

  // guard 활성화 시점 URL 저장
  __armedUrl = window.location.href;

  __onBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  };

  let allow = false;
  __onPopState = () => {
    if (allow) return;
    const ok = window.confirm(__message);
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
  __onClickCapture = (e: MouseEvent) => {
    if (e.defaultPrevented) return;
    if (e.button !== 0) return; // 좌클릭만
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // 새탭/특수동작은 제외

    if (!(e.target instanceof Element)) return;

    // <a>가 아니어도(버튼/래퍼 등) 상위에 data-no-unsaved-guard가 있으면 opt-out
    if (e.target.closest('[data-no-unsaved-guard]')) return;

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
      if (nextUrl.protocol !== 'http:' && nextUrl.protocol !== 'https:') return;
      if (nextUrl.origin !== curUrl.origin) return;
      if (nextUrl.origin === curUrl.origin && nextUrl.pathname === curUrl.pathname && nextUrl.search === curUrl.search) return;
    } catch {
      // URL 파싱 실패는 무시
      return;
    }

    const ok = window.confirm(__message);
    if (!ok) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // 브라우저 뒤로가기를 한번 “가로채기” 위한 더미 state
  const alreadyMarked = (window.history.state as any)?.__unsaved_changes_guard;
  if (!alreadyMarked) {
    window.history.pushState({ ...(window.history.state ?? {}), __unsaved_changes_guard: true }, '', window.location.href);
  }
  window.addEventListener('beforeunload', __onBeforeUnload);
  window.addEventListener('popstate', __onPopState);
  document.addEventListener('click', __onClickCapture, true);
}

function __uninstallGuard() {
  if (!__installed) return;
  __installed = false;

  if (__onBeforeUnload) window.removeEventListener('beforeunload', __onBeforeUnload);
  if (__onPopState) window.removeEventListener('popstate', __onPopState);
  if (__onClickCapture) document.removeEventListener('click', __onClickCapture, true);

  __onBeforeUnload = null;
  __onPopState = null;
  __onClickCapture = null;

  /**
   * guard가 꺼질 때 더미 state 정리
   * - URL이 바뀐 상황(라우팅 진행중)에서는 건드리면 안 되므로 URL 체크를 꼭 함
   */
  const sameUrl = __armedUrl && window.location.href === __armedUrl;
  const hasMarker = (window.history.state as any)?.__unsaved_changes_guard;
  if (sameUrl && hasMarker) {
    window.history.back();
  }
  __armedUrl = null;
}

export function useUnsavedChangesGuard(enabled: boolean, message: string = UNSAVED_CHANGES_MESSAGE) {
  // guard가 켜졌을 때의 URL을 기억해두면, guard가 꺼질 때 “더미 히스토리”를 정리할 수 있음
  const armedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    // hook 단위로 “활성화 시점 URL”은 기록만 해둠(디버깅/호환용)
    armedUrlRef.current = window.location.href;
  }, [enabled]);

  // message는 enabled일 때만 전역 메시지로 반영(동일 페이지에서 마지막으로 켠 메시지가 사용됨)
  useEffect(() => {
    if (!enabled) return;
    __message = message;
  }, [enabled, message]);

  // 실제 가드 설치/해제는 ref-count로 1회만
  useEffect(() => {
    if (!enabled) return;

    __guardCount += 1;
    if (__guardCount === 1) {
      __installGuard();
    }

    return () => {
      __guardCount = Math.max(0, __guardCount - 1);
      if (__guardCount === 0) {
        __uninstallGuard();
      }
      armedUrlRef.current = null;
    };
  }, [enabled]);
}
