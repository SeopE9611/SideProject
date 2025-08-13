'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/store/authStore';
import { onAuthExpired, onAuthForbidden } from '@/lib/authEvents';
import { showErrorToast, showInfoToast } from '@/lib/toast';

export default function SessionWatcher() {
  const { setUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const lockExpired = useRef(false);
  const lockForbidden = useRef(false);

  useEffect(() => {
    // 401: 자동 갱신 실패 → 로그인 페이지로 유도(한 번만)
    const offExpired = onAuthExpired(() => {
      if (lockExpired.current) return;
      lockExpired.current = true;

      setUser(null);
      showErrorToast('세션이 만료되었습니다. 다시 로그인해 주세요.');

      const from = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
      router.push(`/login?from=${encodeURIComponent(from)}`);

      setTimeout(() => {
        lockExpired.current = false;
      }, 4000);
    });

    // 403: 권한 없음 → 토스트 + (관리자 경로면 홈으로)
    const offForbidden = onAuthForbidden(() => {
      if (lockForbidden.current) return;
      lockForbidden.current = true;

      showInfoToast('권한이 없습니다. 접근 권한이 필요한 기능입니다.');

      // 관리 영역에 머무르면 UX가 꼬이니 홈으로 안전 이동
      if (pathname.startsWith('/admin')) {
        router.replace('/');
      }

      setTimeout(() => {
        lockForbidden.current = false;
      }, 3000);
    });

    return () => {
      offExpired();
      offForbidden();
    };
  }, [router, pathname, setUser]);

  return null;
}
