'use client';

import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface UserNavMobileProps {
  setOpen: (open: boolean) => void;
}

export function UserNavMobile({ setOpen }: UserNavMobileProps) {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session?.user) {
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
        {session.user.name} {session.user.role === 'admin' && <span className="text-muted-foreground">(관리자)</span>} 님
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
          signOut();
        }}
      >
        로그아웃
      </Button>
    </>
  );
}
