'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHasHydrated } from '@/lib/hooks/useHasHydrated';
import { useAuthStore } from '@/lib/stores/auth-store';

interface Props {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: Props) {
  const hasHydrated = useHasHydrated();
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (hasHydrated && !accessToken) {
      router.replace('/login'); // 로그인 안 됐으면 login으로 이동
    }
  }, [hasHydrated, accessToken, router]);

  if (!hasHydrated) return null; // SSR 시엔 렌더링 안 함
  if (!accessToken) return null; // 로그인 전엔 화면 비워두기

  return <>{children}</>;
}
