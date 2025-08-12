'use client';

import { useEffect } from 'react';
import { useAuthStore, type User } from '@/app/store/authStore';

// 셀렉터 인자 없이 훅을 '호출'해서 state/액션을 직접 구조분해
export function AuthHydrator({ initialUser }: { initialUser: User | null }) {
  const { setUser, user } = useAuthStore();

  useEffect(() => {
    // 이미 같은 사용자면 불필요한 set 방지 (깜빡임/재렌더 최소화)
    if (user?.id === initialUser?.id) return;
    setUser(initialUser);
  }, [initialUser, setUser, user?.id]);

  return null;
}
