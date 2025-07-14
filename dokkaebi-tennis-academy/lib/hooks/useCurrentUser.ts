'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role?: string;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);
  const pathname = usePathname();

  const refresh = () => setRefreshToken((prev) => prev + 1);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        if (!res.ok) {
          setUser(null);
        } else {
          const data = await res.json();
          setUser(data);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [refreshToken, pathname]); // 로그인 후 router.push에 따른 경로 변경에도 재실행

  return { user, loading, refresh };
}
