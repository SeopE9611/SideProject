'use client';

import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, LayoutDashboard, Settings, UserIcon, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { mutate } from 'swr';
import { useAuthStore } from '@/app/store/authStore';

export function UserNav() {
  const router = useRouter();
  const { user, loading, refresh } = useCurrentUser();
  const { logout } = useAuthStore();

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
        <div className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 px-2 py-1.5 rounded-md transition min-w-0">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.image || '/placeholder.svg'} />
            <AvatarFallback>{user.name?.charAt(0) ?? 'U'}</AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-1 min-w-0">
            {/* 이름만 말줄임 */}
            <span
              className="
          text-sm min-w-0 grow
          max-w-[140px] sm:max-w-[180px] md:max-w-[220px]
          whitespace-nowrap overflow-hidden text-ellipsis
        "
              title={`${user.name} 님`}
            >
              {user.name} 님
            </span>

            {/* 관리자 배지: 항상 보이게 shrink-0 */}
            {isAdmin && (
              <span
                className="
            shrink-0 whitespace-nowrap
            text-[11px] font-semibold
            px-1.5 py-[2px] rounded
            bg-blue-100 text-blue-700
            dark:bg-blue-900/30 dark:text-blue-300
          "
              >
                관리자
              </span>
            )}
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onClick={() => router.push('/mypage')}>
          <Settings className="mr-2 h-4 w-4" />
          마이페이지
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/messages')}>
          <Mail className="mr-2 h-4 w-4" />
          쪽지함
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => router.push('/admin/dashboard')}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            관리자 페이지
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={async () => {
            logout();
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            router.replace('/');
            router.refresh();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
