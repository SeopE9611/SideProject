// lib/hooks/useCurrentUser.ts
'use client';

import { useAuthStore } from '@/app/store/authStore';
import { useCallback, useEffect, useRef } from 'react';

export function useCurrentUser() {
  const { user, setUser } = useAuthStore();
  const inFlight = useRef<Promise<void> | null>(null);
  const bootstrapped = useRef(false); //  탭에서 한 번만 복구

  const fetchMe = useCallback(async () => {
    if (inFlight.current) return inFlight.current;

    inFlight.current = (async () => {
      try {
        const res = await fetch('/api/users/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.ok) {
          const me = await res.json();
          setUser(me ?? null);
          bootstrapped.current = true; //  복구 완료 표시
        } else if (res.status === 401 || res.status === 403) {
          setUser(null);
          bootstrapped.current = true; //  실패해도 한 번만
        } else {
          // 503 등은 조용히 무시 → 다음 사용자 액션 시 재시도 가능
        }
      } catch {
        // 네트워크 오류 무시
      } finally {
        inFlight.current = null;
      }
    })();

    return inFlight.current;
  }, [setUser]);

  useEffect(() => {
    //  user가 비어 있고 아직 부트스트랩 안 했을 때만 1회 시도
    if (!user && !bootstrapped.current) void fetchMe();
  }, [user, fetchMe]);

  return { user, loading: false, refresh: fetchMe };
}
