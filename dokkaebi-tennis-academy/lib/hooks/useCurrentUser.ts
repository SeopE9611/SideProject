'use client';

import { useAuthStore } from '@/app/store/authStore';
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

  const refresh = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    inFlight.current = (async () => {
      try {
        // 1차 me
        let res = await fetch('/api/users/me', { credentials: 'include', cache: 'no-store' });
        if (res.ok) {
          const me = await res.json();
          setUser(me ?? null);
          bootstrapped.current = true;
          return;
        }
        // 401/403이면 refresh 후 재시도
        if (res.status === 401 || res.status === 403) {
          const r = await fetch('/api/refresh', { method: 'POST', credentials: 'include' });
          if (r.ok) {
            res = await fetch('/api/users/me', { credentials: 'include', cache: 'no-store' });
            if (res.ok) {
              const me = await res.json();
              setUser(me ?? null);
              bootstrapped.current = true;
              return;
            }
          }
        }
        // 실패 → 명시적 비로그인
        setUser(null);
        bootstrapped.current = true;
      } catch {
        // 네트워크 오류는 조용히
      } finally {
        inFlight.current = null;
      }
    })();
    return inFlight.current;
  }, [setUser]);

  useEffect(() => {
    if (!bootstrapped.current) void refresh();
  }, [refresh]);

  return { user, loading: false, refresh };
}
