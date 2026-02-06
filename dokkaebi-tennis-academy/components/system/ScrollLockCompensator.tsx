'use client';

import { useEffect } from 'react';

export default function ScrollLockCompensator() {
  useEffect(() => {
    const html = document.documentElement;

    const calc = () => {
      // window.innerWidth: 스크롤바 포함, html.clientWidth: 스크롤바 제외
      const sbw = Math.max(0, window.innerWidth - html.clientWidth);
      html.style.setProperty('--scrollbar-compensation', `${sbw}px`);
    };

    calc();
    window.addEventListener('resize', calc);
    return () => {
      window.removeEventListener('resize', calc);
      html.style.removeProperty('--scrollbar-compensation');
    };
  }, []);

  return null;
}
