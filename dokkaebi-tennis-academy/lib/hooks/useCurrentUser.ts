'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role?: string;
}

export function useCurrentUser() {
  // GlobalTokenGuard가 최초에 한 번 fetch해서 저장한 user를 구독만 함.
  const { user, setUser } = useAuthStore();
  // user가 undefined인 값으로 초기화되지 않는다면, loading 처리는 필요 없지만
  // 만약 undefined 구분이 필요하다면 아래처럼 쓸 수도 있음
  const loading = useMemo(() => user === undefined, [user]);

  const refresh = () => {};

  return { user, loading, refresh };
}
