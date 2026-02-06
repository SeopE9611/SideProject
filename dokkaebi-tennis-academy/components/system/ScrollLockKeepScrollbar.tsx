'use client';

import { useEffect } from 'react';

/**
 * ✅ 목적
 * - Radix(shadcn) Dialog/Select 등은 열릴 때 react-remove-scroll이 overflow:hidden을 걸어
 *   스크롤바가 사라지고(Windows) viewport width가 변하면서 "움찔(레이아웃 시프트)"이 생깁니다.
 * - globals.css에서 overflow:hidden을 무력화해 스크롤바는 유지하고,
 *   여기서는 배경 스크롤(휠/터치/키보드)을 차단해 UX를 유지합니다.
 */
export default function ScrollLockKeepScrollbar() {
  useEffect(() => {
    const LOCK_ATTR = 'data-scroll-locked';

    const hasLock = () => document.documentElement.hasAttribute(LOCK_ATTR) || document.body.hasAttribute(LOCK_ATTR);
    // “진짜 스크롤 가능한” 조상을 찾아서, 그 안에서의 휠/터치만 허용하기 위한 함수
    const isScrollable = (el: Element) => {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      const canOverflow = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
      return canOverflow && el.scrollHeight > el.clientHeight + 1;
    };

    const findScrollableAncestor = (target: EventTarget | null) => {
      let el = target instanceof Element ? target : null;
      while (el && el !== document.body && el !== document.documentElement) {
        if (isScrollable(el)) return el;
        el = el.parentElement;
      }
      return null;
    };

    let locked = hasLock();

    const refreshLocked = () => {
      locked = hasLock();
    };

    const onWheel = (e: WheelEvent) => {
      if (!locked) return;
      // 모달/드롭다운 내부에서 스크롤 가능한 영역이 없으면 배경 스크롤 체이닝 방지
      const scrollable = findScrollableAncestor(e.target);
      if (!scrollable) e.preventDefault();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!locked) return;
      const scrollable = findScrollableAncestor(e.target);
      if (!scrollable) e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!locked) return;
      // 스크롤을 유발하는 키들만 차단
      const scrollKeys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
      if (!scrollKeys.has(e.key)) return;

      const active = document.activeElement as HTMLElement | null;
      // 입력 중(space) 방해하지 않기
      const isTyping = !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
      if (isTyping) return;

      const scrollable = findScrollableAncestor(active);
      if (!scrollable) e.preventDefault();
    };

    // Radix가 data-scroll-locked를 붙였다/뗐다 감지
    const obs = new MutationObserver(refreshLocked);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: [LOCK_ATTR] });
    obs.observe(document.body, { attributes: true, attributeFilter: [LOCK_ATTR] });

    // passive:false로 preventDefault 가능하게
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKeyDown);

    refreshLocked();

    return () => {
      obs.disconnect();
      window.removeEventListener('wheel', onWheel as any);
      window.removeEventListener('touchmove', onTouchMove as any);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return null;
}
