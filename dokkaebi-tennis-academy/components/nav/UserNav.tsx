'use client';

import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, LayoutDashboard, Settings, UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { useAuthStore, User } from '@/lib/stores/auth-store';
import { getMyInfo } from '@/lib/auth.client';
// 토큰과 유저 정보를 저장한 상태
// accessToken으로 유저 정보 불러오는 함수

export function UserNav() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  console.log('현재 accessToken:', accessToken);
  const logout = useAuthStore((state) => state.logout);
  const token = useAuthStore.getState().accessToken;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      if (!accessToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const data = await getMyInfo();
        setUser(data.user);
      } catch (err) {
        console.error('유저 정보 가져오기 실패:', err);
        logout(); // 토큰 유효하지 않으면 자동 로그아웃
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [accessToken, logout]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
    );
  }

  if (!user) {
    return (
      <Button variant="ghost" size="icon" onClick={() => router.push('/login')}>
        <UserIcon className="h-5 w-5" />
        <span className="sr-only">로그인</span>
      </Button>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 px-2 py-1.5 rounded-md transition">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.image || '/placeholder.svg'} />
            <AvatarFallback>{user.name?.charAt(0) ?? 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm">
              {user.name} 님 {isAdmin && <span className="ml-1 text-xs text-muted-foreground">(관리자)</span>}
            </span>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onClick={() => router.push('/mypage')}>
          <Settings className="mr-2 h-4 w-4" />
          마이페이지
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => router.push('/admin/dashboard')}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            관리자 페이지
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={async () => {
            // 서버에 로그아웃 요청 (쿠키 삭제)
            await fetch('/api/logout', {
              method: 'POST',
              // credentials: 'include', // 쿠키 삭제
              headers: { Authorization: `Bearer ${token}` },
            });

            // 클라이언트 상태 초기화
            logout();

            router.push('/');
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
