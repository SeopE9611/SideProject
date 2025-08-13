// components/system/AuthRescue.tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/store/authStore';

export default function AuthRescue() {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    // SSR 다시 그리기
    router.refresh();

    // 하드 리로드 백업
    const t = window.setTimeout(() => {
      if (cancelled) return;
      const marker = document.getElementById('__access_denied_marker__');
      if (marker) {
        // 쿠키는 이미 갱신된 상태이므로 같은 경로로 하드 리로드
        window.location.replace(pathname);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [user, router, pathname]);

  return null;
}
