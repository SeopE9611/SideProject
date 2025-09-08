'use client';

import { useAuthStore } from '@/app/store/authStore';
import { bootstrapOnce } from '@/lib/auth/bootstrap';
import { refreshOnce } from '@/lib/auth/refresh-mutex';
import { useCallback, useEffect, useRef } from 'react';

/**
 * 전역 user를 구독 + 탭당 1회 자동 복구(fetch /api/users/me -> 401/403이면 /api/refresh 후 재시도)
 * - loading은 간단히 false로 두고, 필요 시 refresh()로 강제 재시도 가능
 */
export function useCurrentUser(): {
  user: ReturnType<typeof useAuthStore>['user'];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const { user, setUser } = useAuthStore();
  const inFlight = useRef<Promise<void> | null>(null);
  const bootstrapped = useRef(false);
  const latestUser = useRef(user);
  useEffect(() => {
    latestUser.current = user;
  }, [user]);

  // 수동 갱신용: 인터셉터 등에서 401 맞았을 때 호출
  const refresh = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    inFlight.current = (async () => {
      try {
        const r = await refreshOnce();
        if (r.ok) {
          const res = await fetch('/api/users/me', { credentials: 'include', cache: 'no-store' });
          if (res.ok) {
            const me = await res.json();
            setUser(me ?? null);
            bootstrapped.current = true;
            return;
          }
        }
        if (!latestUser.current) setUser(null);
        bootstrapped.current = true;
      } finally {
        inFlight.current = null;
      }
    })();
    return inFlight.current;
  }, [setUser]);

  useEffect(() => {
    // 자동 부트스트랩은 병합 함수만 사용 (가드/훅/페이지 어디서든 중복 없이 1회)
    if (!bootstrapped.current) {
      bootstrapOnce(setUser, () => latestUser.current as any).finally(() => {
        bootstrapped.current = true;
      });
    }
  }, [refresh]);

  const loading = !bootstrapped.current || !!inFlight.current;
  return { user, loading, refresh };
}
