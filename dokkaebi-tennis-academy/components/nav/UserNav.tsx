'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, LayoutDashboard, Settings, UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function UserNav() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
    );
  }
  if (!session) {
    return (
      <Button variant="ghost" size="icon" onClick={() => router.push('/login')}>
        <UserIcon className="h-5 w-5" />
        <span className="sr-only">로그인</span>
      </Button>
    );
  }

  const user = session.user;
  const isAdmin = user?.role === 'admin';

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
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
