'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useAuthStore } from '@/app/store/authStore';

interface UserNavMobileProps {
  setOpen: (open: boolean) => void;
}

export function UserNavMobile({ setOpen }: UserNavMobileProps) {
  const router = useRouter();
  const { user, loading, refresh } = useCurrentUser();
  const { logout } = useAuthStore();

  if (loading) return null;

  if (!user) {
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

  return (
    <>
      <p className="text-sm text-center">
        {user.name} {user.role === 'admin' && <span className="text-muted-foreground">(관리자)</span>} 님
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
        onClick={() => {
          setOpen(false);
          router.push('/messages');
        }}
      >
        쪽지함
      </Button>
      <Button
        variant="outline"
        className="w-full justify-center"
        onClick={async () => {
          setOpen(false);
          logout();
          await fetch('/api/logout', { method: 'POST', credentials: 'include' });
          router.replace('/');
          router.refresh();
        }}
      >
        로그아웃
      </Button>
    </>
  );
}
