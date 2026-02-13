'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 *  목표
 * - Radix/shadcn 오버레이(Dialog/Select 등)가 열릴 때 html/body에:
 *   overflow:hidden, padding-right(스크롤바 보정), --removed-body-scroll-bar-size 등이 들어오면서
 *   viewport/컨테이너 폭이 바뀌어 "좌우 움찔(레이아웃 시프트)"이 발생합니다.
 *
 * 해결
 * - html/body에 들어오는 "보정 스타일"을 런타임에서 즉시 0으로 강제 고정합니다.
 * - 스크롤 잠금은 overflow:hidden에 의존하지 않고, wheel/touch/key 이벤트 차단으로만 처리합니다.
 *   → 폭 변화(움찔) 원인이 원천 제거됩니다.
 */

const IMPORTANT = 'important' as const;
const LOCK_ATTR = 'data-scroll-locked';

function setImportant(el: HTMLElement, prop: string, value: string) {
  el.style.setProperty(prop, value, IMPORTANT);
}

function stabilizeRootLayout() {
  const html = document.documentElement;
  const body = document.body;

  const htmlCS = getComputedStyle(html);
  const bodyCS = getComputedStyle(body);

  // 0) Radix(react-remove-scroll)이 body를 position:fixed + top:-scrollY 로 잠가두면
  //    window.scrollY가 0처럼 취급되어 position:sticky가 풀리며 위로 튀는 현상이 생깁니다.
  //    → fixed 잠금을 무력화하고, body.top에 저장된 스크롤 위치로 window 스크롤을 복구합니다.
  const isOverlayLocked = html.hasAttribute(LOCK_ATTR) || body.hasAttribute(LOCK_ATTR) || bodyCS.pointerEvents === 'none' || htmlCS.overflowY === 'hidden' || bodyCS.overflowY === 'hidden';

  if (isOverlayLocked && bodyCS.position === 'fixed') {
    const top = body.style.top || bodyCS.top; // inline이 비면 computed 사용
    const savedY = top && top !== 'auto' ? Math.abs(parseInt(top, 10) || 0) : 0;

    // body를 fixed로 두지 않으면 sticky 계산이 정상으로 돌아옵니다.
    setImportant(body, 'position', 'static');
    setImportant(body, 'top', '0px');
    setImportant(body, 'left', '0px');
    setImportant(body, 'right', '0px');
    setImportant(body, 'width', 'auto');

    // fixed 해제 후 실제 스크롤을 원래 위치로 복구
    if (savedY > 0 && Math.abs(window.scrollY - savedY) > 1) {
      window.scrollTo(0, savedY);
    }
  }

  // 1) 스크롤바 공간을 "항상" 안정적으로 유지 (Chrome/Edge 최신에서 안정적)
  //    - gutter stable: 스크롤바 유무와 무관하게 공간을 예약
  //    - overflow-y scroll: 어떤 라이브러리가 hidden을 걸어도 다시 scroll로 강제
  setImportant(html, 'scrollbar-gutter', 'stable');
  setImportant(html, 'overflow-y', 'scroll');

  // 2) Radix/remove-scroll-bar가 넣는 "오른쪽 보정"을 0으로 강제 고정 (움찔 원인 제거)
  setImportant(html, 'padding-right', '0px');
  setImportant(body, 'padding-right', '0px');
  setImportant(html, 'margin-right', '0px');
  setImportant(body, 'margin-right', '0px');

  // 3) 일부 컴포넌트가 참조하는 보정 변수도 0으로 고정
  setImportant(html, '--removed-body-scroll-bar-size', '0px');
  setImportant(body, '--removed-body-scroll-bar-size', '0px');
}

function getIsLockedByOverlay() {
  const html = document.documentElement;
  const body = document.body;

  // Radix Dialog 계열(react-remove-scroll)이 주로 쓰는 락 표식
  if (html.hasAttribute(LOCK_ATTR) || body.hasAttribute(LOCK_ATTR)) return true;

  // Select/Popover 등에서 outside pointer 차단 시 body inline style에 들어오는 케이스 대응
  if (getComputedStyle(body).pointerEvents === 'none') return true;

  // 혹시 overflow hidden만 걸리는 변종 케이스(라이브러리/브라우저 조합)까지 커버
  const htmlOy = getComputedStyle(html).overflowY;
  const bodyOy = getComputedStyle(body).overflowY;
  if (htmlOy === 'hidden' || bodyOy === 'hidden') return true;

  return false;
}

function findScrollableAncestor(target: EventTarget | null) {
  let node = target as HTMLElement | null;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    const canScrollY = (style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight;

    if (canScrollY) return node;
    node = node.parentElement;
  }
  return null;
}

export default function ScrollLockKeepScrollbar() {
  const lockedRef = useRef(false);

  useLayoutEffect(() => {
    // 최초 1회 + 이후 변화마다 안정화 강제
    stabilizeRootLayout();
    lockedRef.current = getIsLockedByOverlay();

    let rafId = 0;
    const schedule = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        stabilizeRootLayout();
        lockedRef.current = getIsLockedByOverlay();
      });
    };

    const mo = new MutationObserver(schedule);

    // html/body에 style/락 속성이 들어오는 순간마다 즉시 안정화
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class', LOCK_ATTR],
    });
    mo.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class', LOCK_ATTR],
    });

    // 스크롤 잠금은 이벤트 차단으로만 처리 (폭 변화 유발 X)
    const onWheel = (e: WheelEvent) => {
      if (!lockedRef.current) return;

      const scrollable = findScrollableAncestor(e.target);
      if (!scrollable) {
        e.preventDefault();
        return;
      }

      // 내부 스크롤 컨테이너는 스크롤 허용
      const atTop = scrollable.scrollTop <= 0;
      const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;
      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) e.preventDefault();
    };

    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (!lockedRef.current) return;
      touchStartY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!lockedRef.current) return;

      const scrollable = findScrollableAncestor(e.target);
      if (!scrollable) {
        e.preventDefault();
        return;
      }

      const currentY = e.touches[0]?.clientY ?? 0;
      const deltaY = touchStartY - currentY;

      const atTop = scrollable.scrollTop <= 0;
      const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;
      if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!lockedRef.current) return;
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      mo.disconnect();
      window.removeEventListener('wheel', onWheel as any);
      window.removeEventListener('touchstart', onTouchStart as any);
      window.removeEventListener('touchmove', onTouchMove as any);
      window.removeEventListener('keydown', onKeyDown as any);
    };
  }, []);

  return null;
}
