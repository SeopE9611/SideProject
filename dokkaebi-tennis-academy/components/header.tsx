'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchPreview from '@/components/SearchPreview';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/nav/UserNav';
import { useCartStore } from '@/app/store/cartStore';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

/**
 * 헤더 구성
 * - 좌측: 로고(텍스트 유지) + 상위 탭(스트링 / 중고라켓)
 * - 중앙: 얇고 넓은 검색창
 * - 우측: 카트 / 마이(아바타) / 다크토글
 * - TW 레이아웃 느낌, 오렌지 컬러 미사용(현 프로젝트 글로벌 컬러 유지)
 */

const TOP_TABS = [
  { label: '스트링', href: '/products' },
  { label: '중고라켓', href: '/used' }, // 새 탭
] as const;

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const headerRef = useRef<HTMLDivElement>(null);

  const { items } = useCartStore();
  const cartCount = items.reduce((n, it) => n + it.quantity, 0);
  const cartBadge = cartCount > 99 ? '99+' : String(cartCount);
  useCurrentUser(); // UserNav 내부에서 사용

  // 헤더 높이를 CSS 변수로 노출(좌측 고정 사이드 상단 여백 맞춤)
  useEffect(() => {
    const sync = () => {
      const h = headerRef.current?.offsetHeight ?? 60;
      document.documentElement.style.setProperty('--header-h', `${h}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    if (headerRef.current) ro.observe(headerRef.current);
    window.addEventListener('resize', sync);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, []);

  const tabClass = (href: string) =>
    `relative inline-flex items-center rounded-md px-3 py-2 text-[15px] font-semibold
     transition-colors ${pathname?.startsWith(href) ? 'text-slate-900 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`;

  const TabIndicator = ({ active }: { active: boolean }) => (
    <span
      className={`absolute left-2 right-2 -bottom-[6px] h-[2px] rounded-full transition-all
        ${active ? 'bg-blue-600 dark:bg-blue-500' : 'bg-transparent'}
      `}
    />
  );

  return (
    <>
      {/* 접근성 스킵 링크 */}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md">
        메인 콘텐츠로 건너뛰기
      </a>

      {/* 상단 단일 스트립(오렌지 없음, 프로젝트 기본 컬러 유지) */}
      <header
        ref={headerRef}
        className="
          sticky top-0 z-[50] w-full border-b border-slate-200/80 dark:border-slate-800/80
          bg-white/90 dark:bg-slate-900/80 backdrop-blur-md
        "
        role="banner"
        aria-label="상단 헤더"
      >
        <div className="max-w-7xl mx-auto h-[60px] px-3 md:px-6 flex items-center justify-between gap-3">
          {/* 좌측: 로고 + 탭 */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* 로고(텍스트 유지) */}
            <Link href="/" className="flex flex-col group" aria-label="도깨비 테니스 홈">
              <div className="font-black text-base md:text-lg tracking-[-0.01em] whitespace-nowrap text-slate-900 dark:text-white">도깨비 테니스</div>
              <div className="text-[10px] md:text-xs tracking-wider text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">DOKKAEBI TENNIS SHOP</div>
            </Link>

            {/* 탭: 데스크톱에서 표시 */}
            <nav className="hidden md:flex items-center gap-1 md:gap-2" aria-label="상위 섹션">
              {TOP_TABS.map((t) => {
                const active = pathname?.startsWith(t.href) ?? false;
                return (
                  <Link key={t.href} href={t.href} className={tabClass(t.href)}>
                    {t.label}
                    <TabIndicator active={active} />
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 가운데: 얇은 검색창 */}
          <div className="flex-1 flex justify-center">
            <SearchPreview
              placeholder="스트링 검색…"
              className="
                w-full max-w-[720px]
                h-9 rounded-md
                bg-white/90 dark:bg-slate-800/80
                border border-slate-300 dark:border-slate-700
                focus-within:ring-2 ring-blue-500
              "
            />
          </div>

          {/* 우측: 카트 / 마이 / 다크토글 */}
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/cart" aria-label="장바구니">
              <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span
                    className="
                      absolute -top-1 -right-1
                      text-[10px] min-w-[18px] h-[18px] px-[5px]
                      rounded-full bg-rose-600 text-white
                      flex items-center justify-center font-bold
                    "
                    aria-label={`장바구니에 ${cartBadge}개`}
                  >
                    {cartBadge}
                  </span>
                )}
              </Button>
            </Link>

            <div className="max-w-[140px] overflow-hidden">
              <UserNav />
            </div>

            <ThemeToggle />
          </div>
        </div>
      </header>
    </>
  );
}
