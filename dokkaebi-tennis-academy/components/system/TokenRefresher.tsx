'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/app/store/authStore';

// 로그인 상태(useAuthStore().user)일 때 10분마다 /api/refresh 실행.
// 탭에 복귀(visibilitychange)했을 때도 일정 시간 이상 지났으면 즉시 갱신.
// 중복 실행 방지.
export default function TokenRefresher() {
  const { user } = useAuthStore();
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const doRefresh = async () => {
      try {
        const res = await fetch('/api/refresh', { method: 'POST', credentials: 'include' });
        if (!res.ok) throw new Error('refresh failed');
        last.current = Date.now();
      } catch {
        // 실패해도 여기선 조용히: 401일 땐 axios 인터셉터가 한 번 더 시도하고, 최종 실패 시만 유저 흐름에서 처리
      }
    };

    // 최초 실행 + 10분 주기
    doRefresh();
    timer.current = setInterval(doRefresh, 10 * 60 * 1000);

    // 탭 복귀 시 최근 갱신이 오래됐다면 한 번 더
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - last.current > 9.5 * 60 * 1000) {
          void doRefresh();
        }
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user]);

  return null;
}
