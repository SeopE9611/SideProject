'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyInfo } from '@/lib/auth.client';

interface Props {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: Props) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        if (res.status === 403) {
          router.replace('/suspended');
          return;
        }
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (!res.ok) {
          router.replace('/login');
          return;
        }
        setIsLoggedIn(true);
      } catch {
        router.replace('/login');
      } finally {
        setChecked(true);
      }
    })();
  }, [router]);

  if (!checked) return null;
  if (!isLoggedIn) return null;

  return <>{children}</>;
}
