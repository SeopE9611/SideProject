'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useAuthStore } from '@/app/store/authStore';
import { useUnreadMessageCount } from '@/lib/hooks/useUnreadMessageCount';

interface UserNavMobileProps {
  setOpen: (open: boolean) => void;
}

export function UserNavMobile({ setOpen }: UserNavMobileProps) {
  const router = useRouter();
  const { user, loading, refresh } = useCurrentUser();
  const { logout } = useAuthStore();
  const { count: unreadCount } = useUnreadMessageCount(!loading && !!user);

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
        쪽지함{unreadCount > 0 && <span className="shrink-0 rounded-full bg-red-500 text-white text-[10px] leading-none px-1.5 py-[2px]">{unreadCount > 99 ? '99+' : unreadCount}</span>}
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
