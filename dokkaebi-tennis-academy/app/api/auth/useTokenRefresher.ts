'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useTokenRefresher() {
  const router = useRouter();

  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/refresh', {
          method: 'POST',
          credentials: 'include', // 쿠키 기반 요청
        });

        if (!res.ok) {
          console.warn('토큰 재발급 실패');
          throw new Error();
        }
      } catch (err) {
        console.error('세션 만료됨. 로그인 페이지로 이동합니다.');
        router.replace('/login');
      }
    }, 5 * 60 * 1000); // 5분마다 실행

    return () => clearInterval(refreshInterval);
  }, [router]);
}
