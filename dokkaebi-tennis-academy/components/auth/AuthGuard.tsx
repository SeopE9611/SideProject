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
    getMyInfo()
      .then(({ user }) => {
        if (user) {
          setIsLoggedIn(true);
        } else {
          router.replace('/login');
        }
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setChecked(true);
      });
  }, [router]);

  if (!checked) return null;
  if (!isLoggedIn) return null;

  return <>{children}</>;
}
