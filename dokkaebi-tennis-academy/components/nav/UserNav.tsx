'use client';

import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, LayoutDashboard, Settings, UserIcon, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useAuthStore } from '@/app/store/authStore';
import { useUnreadMessageCount } from '@/lib/hooks/useUnreadMessageCount';
import { Badge } from '@/components/ui/badge';

type UserNavProps = {
  /** Header에서 unreadCount를 전달하는 경우(중복 폴링 방지) */
  unreadCount?: number;
};

export function UserNav({ unreadCount }: UserNavProps) {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const { logout } = useAuthStore();
  const shouldPollUnread = unreadCount == null;
  const { count } = useUnreadMessageCount(shouldPollUnread && !loading && !!user);
  const resolvedUnread = unreadCount ?? count;

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
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          const redirectTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
          router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
        }}
      >
        <UserIcon className="h-5 w-5" />
        <span className="sr-only">로그인</span>
      </Button>
    );
  }

  const isAdmin = user.role === 'admin';
  const socialProviders = user.socialProviders ?? [];
  const hasKakao = socialProviders.includes('kakao');
  const hasNaver = socialProviders.includes('naver');

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 px-2 py-1.5 rounded-md transition min-w-0">
          {/* <Avatar className="h-6 w-6">
            <AvatarImage src={user.image || '/placeholder.svg'} />
            <AvatarFallback>{user.name?.charAt(0) ?? 'U'}</AvatarFallback>
          </Avatar> */}

          <div className="flex items-center gap-1 min-w-0">
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

            {isAdmin && (
              <span
                className="
            shrink-0 whitespace-nowrap
            text-[11px] font-semibold
            px-1.5 py-[2px] rounded
            bg-accent/15 text-accent
          "
              >
                관리자
              </span>
            )}
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {(hasKakao || hasNaver) && (
          <>
            <div className="px-2 py-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">소셜 로그인</span>
                <div className="flex gap-1">
                  {hasKakao && <Badge className="pointer-events-none h-5 px-2 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90">카카오</Badge>}
                  {hasNaver && <Badge className="pointer-events-none h-5 px-2 text-[11px] bg-accent text-accent-foreground hover:bg-accent/90">네이버</Badge>}
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => router.push('/mypage')}>
          <Settings className="mr-2 h-4 w-4" />
          마이페이지
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/messages')}>
          <Mail className="mr-2 h-4 w-4" />
          쪽지함 {resolvedUnread > 0 && <span className="shrink-0 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-none px-1.5 py-[2px]">{resolvedUnread > 99 ? '99+' : resolvedUnread}</span>}
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
