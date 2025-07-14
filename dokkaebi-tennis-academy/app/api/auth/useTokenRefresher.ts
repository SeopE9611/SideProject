'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useTokenRefresher(user: any) {
  const router = useRouter();
  useEffect(() => {
    // console.log(' useTokenRefresher fired, user =', user);
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      // console.log('refresh interval tick');
      try {
        const res = await fetch('/api/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        // console.log('refresh status', res.status);
        if (!res.ok) throw new Error();
      } catch (err) {
        console.error('세션 만료, 로그인 페이지로 이동');
        router.replace('/login');
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [user]);
}
