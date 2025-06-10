'use client';

import { useAuthStore, User } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getMyInfo } from '@/lib/auth.client';

interface UserNavMobileProps {
  setOpen: (open: boolean) => void;
}

export function UserNavMobile({ setOpen }: UserNavMobileProps) {
  const token = useAuthStore((state) => state.accessToken);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  // 유저 상태 로드 로직 추가
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getMyInfo()
      .then(({ user }) => setUser(user))
      .catch(() => {
        logout();
        router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [token, logout, router]);

  if (!token) {
    return (
      <Button
        variant="outline"
        className="w-full justify-center"
        onClick={() => {
          setOpen(false);
          router.push('/login');
        }}
      >
        로그인
      </Button>
    );
  }

  if (loading) return null;

  return (
    <>
      <p className="text-sm text-center">
        {user?.name} {user?.role === 'admin' && <span className="text-muted-foreground">(관리자)</span>} 님
      </p>
      <Button
        variant="outline"
        className="w-full justify-center"
        onClick={() => {
          setOpen(false);
          router.push('/mypage');
        }}
      >
        마이페이지
      </Button>
      <Button
        variant="outline"
        className="w-full justify-center"
        onClick={async () => {
          setOpen(false);
          //  서버 쿠키 제거
          await fetch('/api/logout', { method: 'POST' });
          //  클라이언트 스토어 클리어
          logout();
          //  홈으로 이동
          router.push('/');
        }}
      >
        로그아웃
      </Button>
    </>
  );
}
