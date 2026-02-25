'use client';

import { useAuthStore } from '@/app/store/authStore';
import { bootstrapOnce } from '@/lib/auth/bootstrap';
import { refreshOnce } from '@/lib/auth/refresh-mutex';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useCurrentUser(): {
  user: ReturnType<typeof useAuthStore>['user'];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const { user, setUser } = useAuthStore();

  // 최신 user 스냅샷 (네트워크 응답 레이스 컨디션 방지)
  const latestUser = useRef(user);
  useEffect(() => {
    latestUser.current = user;
  }, [user]);

  // 수동 새로고침(재시도)용 in-flight 병합
  const inFlight = useRef<Promise<void> | null>(null);
  const refresh = useCallback(async () => {
    if (inFlight.current) return inFlight.current;

    inFlight.current = (async () => {
      try {
        // 1) /api/users/me
        let res = await fetch('/api/users/me', { credentials: 'include', cache: 'no-store' });
        if (res.ok) {
          const me = await res.json().catch(() => null);
          setUser(me);
          return;
        }

        // 2) 401/403이면 refresh → me 재시도
        if (res.status === 401 || res.status === 403) {
          const rr = await refreshOnce();
          if (rr.ok) {
            res = await fetch('/api/users/me', {
              credentials: 'include',
              cache: 'no-store',
              headers: { 'x-suppress-auth-expired': '1' },
            });
            if (res.ok) {
              const me2 = await res.json().catch(() => null);
              setUser(me2);
              return;
            }
          }
        }

        // 3) 모두 실패 → null 확정
        setUser(null);
      } finally {
        inFlight.current = null;
      }
    })();

    return inFlight.current;
  }, [setUser]);

  // 부트스트랩 완료 여부를 state로 관리하여 리렌더 유발
  const [bootDone, setBootDone] = useState(false);
  const bootStarted = useRef(false);
  useEffect(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;

    // 탭당 1회 자동 부트스트랩 (이미 user가 있으면 내부적으로 바로 종료)
    bootstrapOnce(setUser, () => latestUser.current as any).finally(() => {
      setBootDone(true); // ← 이 state 변경이 리렌더를 일으킴
    });
  }, [setUser]);

  // user가 이미 있으면 bootDone 이전이라도 로딩 아님.
  const loading = !!inFlight.current || (!bootDone && !user);

  return { user, loading, refresh };
}
