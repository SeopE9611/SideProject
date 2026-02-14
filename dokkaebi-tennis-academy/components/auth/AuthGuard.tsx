'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyInfo } from '@/lib/auth.client';

interface Props {
  children: React.ReactNode;
}

/**
 * 일반 사용자 영역(/mypage, /orders 등) 전용 로그인 가드 컴포넌트.
 * 관리자 영역(app/admin/**)은 app/admin/layout.tsx에서만 권한을 검사한다.
 */
export default function AuthGuard({ children }: Props) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const redirectTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        if (res.status === 403) {
          router.replace('/suspended');
          return;
        }
        if (res.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(redirectTo)}`);
          return;
        }
        if (!res.ok) {
          router.replace(`/login?next=${encodeURIComponent(redirectTo)}`);
          return;
        }
        setIsLoggedIn(true);
      } catch {
        router.replace(`/login?next=${encodeURIComponent(redirectTo)}`);
      } finally {
        setChecked(true);
      }
    })();
  }, [router]);

  if (!checked) return null;
  if (!isLoggedIn) return null;

  return <>{children}</>;
}
