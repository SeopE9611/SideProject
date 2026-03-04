import { useEffect, useRef } from 'react';

// 모든 폼에서 공통으로 쓰는 기본 경고 문구 (페이지별 변수 선언 없이 사용)
export const UNSAVED_CHANGES_MESSAGE = '이 페이지를 벗어날 경우 입력한 정보는 초기화됩니다.';

/**
 * 전역(singleton) 가드 관리자
 * - 여러 컴포넌트가 동시에 useUnsavedChangesGuard(true)를 호출해도
 *   beforeunload 리스너는 "한 번만" 설치되도록 ref-count로 관리
 * - 내부 라우팅/뒤로가기/popstate/intercept는 페이지 로컬 confirm에서 처리
 */
let __guardCount = 0;
let __message: string = UNSAVED_CHANGES_MESSAGE;
let __installed = false;

let __onBeforeUnload: ((e: BeforeUnloadEvent) => void) | null = null;

function __installGuard() {
  if (__installed) return;
  __installed = true;

  __onBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  };

  window.addEventListener('beforeunload', __onBeforeUnload);
}

function __uninstallGuard() {
  if (!__installed) return;
  __installed = false;

  if (__onBeforeUnload) window.removeEventListener('beforeunload', __onBeforeUnload);

  __onBeforeUnload = null;
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
