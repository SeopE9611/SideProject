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
        <div
          className={cn(
            // 우측 패딩도 헤더/사이드메뉴 체계에 맞춰 조금 넉넉히(선택)
            'w-full px-0 bp-lg:pr-8 xl:pr-12 2xl:pr-16',
            showSideMenu ? 'bp-lg:pl-64 xl:pl-72' : 'bp-lg:pl-0 xl:pl-0',
          )}
        >
          {children}
        </div>
      </main>
    </>
  );
}
