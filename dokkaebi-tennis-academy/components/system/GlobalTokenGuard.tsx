'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/app/store/authStore';
import { useTokenRefresher } from '@/app/api/auth/useTokenRefresher';

export function GlobalTokenGuard() {
  const { user, setUser } = useAuthStore();

  // 클라이언트 마운트 시 한 번만 실행: 저장된 쿠키로부터 유저 정보 fetch
  useEffect(() => {
    async function hydrate() {
      const res = await fetch('/api/users/me', { credentials: 'include' });
      if (res.ok) {
        setUser(await res.json());
      }
    }
    hydrate();
  }, [setUser]);

  // user가 truthy가 되면 refresh-interval 시작
  useTokenRefresher(user);

  return null;
}
