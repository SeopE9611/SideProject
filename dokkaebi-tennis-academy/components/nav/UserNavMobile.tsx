'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingCart, LogOut, Settings, UserIcon } from 'lucide-react';

export function UserNavMobile() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') return null;

  if (!session) {
    return (
      <Button variant="outline" className="w-full justify-center" onClick={() => router.push('/login')}>
        <UserIcon className="mr-2 h-4 w-4" />
        로그인
      </Button>
    );
  }

  const isAdmin = session.user?.role === 'admin';

  return (
    <div className="flex flex-col gap-3 px-2">
      {/* 이름 표시 */}
      <div className="text-sm font-medium px-1">
        {session.user?.name} 님{isAdmin && <span className="ml-1 text-xs text-muted-foreground">(관리자)</span>}
      </div>

      {/* 마이페이지 */}
      <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/mypage')}>
        <Settings className="mr-2 h-4 w-4" />
        마이페이지
      </Button>

      {/* 로그아웃 */}
      <Button variant="outline" className="w-full justify-start" onClick={() => signOut({ callbackUrl: '/' })}>
        <LogOut className="mr-2 h-4 w-4" />
        로그아웃
      </Button>
    </div>
  );
}
