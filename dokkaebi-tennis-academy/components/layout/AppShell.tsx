'use client';

import type React from 'react';
import { usePathname } from 'next/navigation';

import SideMenu from '@/components/nav/SideMenu';
import { cn } from '@/lib/utils';

/**
 * /mypage, /admin 같은 "내부 사이드바가 있는 화면"에서는
 * 글로벌 SideMenu를 숨기고, 좌측 padding(pl)도 제거
 */
const HIDE_SIDEMENU_PREFIXES = ['/mypage', '/admin'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hideSideMenu = HIDE_SIDEMENU_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  const showSideMenu = !hideSideMenu;

  return (
    <>
      {showSideMenu && <SideMenu />}

      <main id="main" className="flex-1">
        <div className={cn('w-full px-0 bp-lg:pr-4 2xl:pr-8', showSideMenu ? 'bp-lg:pl-60 2xl:pl-64' : 'bp-lg:pl-0 2xl:pl-0')}>{children}</div>
      </main>
    </>
  );
}
