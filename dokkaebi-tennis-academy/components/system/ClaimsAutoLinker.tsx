'use client';

import { useEffect } from 'react';

export default function ClaimsAutoLinker() {
  useEffect(() => {
    const KEY = 'claims:autoLink:done';
    if (sessionStorage.getItem(KEY)) return;

    (async () => {
      try {
        const res = await fetch('/api/claims/auto-link', {
          method: 'POST',
          credentials: 'include',
        });
        // 성공/실패 여부와 무관하게 세션당 1회만
      } finally {
        sessionStorage.setItem('claims:autoLink:done', '1');
      }
    })();
  }, []);

  return null;
}
