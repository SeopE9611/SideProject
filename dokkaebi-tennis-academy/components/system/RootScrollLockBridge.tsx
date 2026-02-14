'use client';

import { useEffect } from 'react';

/**
 * 목적
 * - Radix(react-remove-scroll)가 body에 거는 data-scroll-locked/overflow 변경이 sticky를 깨뜨림
 * - body의 잠금을 html로 "이관"해서 sticky 기준(overflow)을 흔들지 않게 함
 */
export default function RootScrollLockBridge() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const sync = () => {
      const locked = body.hasAttribute('data-scroll-locked');
      html.toggleAttribute('data-scroll-locked', locked);
    };

    // 최초 1회 + 이후 body attribute 변화를 감시
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(body, { attributes: true, attributeFilter: ['data-scroll-locked'] });

    return () => mo.disconnect();
  }, []);

  return null;
}
