'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore, type User } from '@/app/store/authStore';

// 셀렉터 인자 없이 훅을 '호출'해서 state/액션을 직접 구조분해
export function AuthHydrator({ initialUser }: { initialUser: User | null }) {
  const { setUser } = useAuthStore();
  const did = useRef(false);

  useEffect(() => {
    // SSR로 넘어온 initialUser를 탭 최초 1회만 주입
    if (did.current) return;
    setUser(initialUser);
    did.current = true;
  }, [initialUser, setUser]);

  return null;
}
