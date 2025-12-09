'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Menu, ChevronRight, Wrench, Gift, MessageSquareText, Grid2X2, Package, MessageSquare } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetOverlay, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/nav/UserNav';
import { useRouter, usePathname } from 'next/navigation';
import SearchPreview from '@/components/SearchPreview';
import { useCartStore } from '@/app/store/cartStore';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MdSportsTennis } from 'react-icons/md';
import { WeatherBadge } from '@/components/WeatherBadge';

/** 재질 카테고리(스트링 타입) 노출 온/오프 */
const SHOW_MATERIAL_MENU = false;

/** 모바일 브랜드 그리드 */
function MobileBrandGrid({ brands, onPick }: { brands: { name: string; href: string }[]; onPick: (href: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const VISIBLE = 6;
  const list = expanded ? brands : brands.slice(0, VISIBLE);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {list.map((b) => (
          <Button
            key={b.name}
            variant="outline"
            className="h-9 justify-center rounded-lg border-slate-200 dark:border-slate-700 text-sm
              hover:bg-gradient-to-r hover:from-blue-50 hover:to-emerald-50 
              dark:hover:from-blue-950/20 dark:hover:to-emerald-950/20
              transition-all duration-200 bg-transparent"
            onClick={() => onPick(b.href)}
          >
            {b.name}
          </Button>
        ))}
      </div>
      {brands.length > VISIBLE && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center rounded-lg text-slate-600 dark:text-slate-400 
            hover:text-blue-600 dark:hover:text-white transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '접기' : '더보기'}
        </Button>
      )}
    </div>
  );
}

const Header = () => {
  const router = useRouter();
  const headerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const { items } = useCartStore();
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartBadge = cartCount > 99 ? '99+' : String(cartCount);
  const { user } = useCurrentUser();
  const isAdmin = user?.role === 'admin';

  const NAV_LINKS = {
    strings: {
      root: '/products',
      brands: [
        { name: '윌슨', href: '/products?brand=wilson' },
        { name: '바볼랏', href: '/products?brand=babolat' },
        { name: '럭실론', href: '/products?brand=luxilon' },
        { name: '요넥스', href: '/products?brand=yonex' },
        { name: '헤드', href: '/products?brand=head' },
        { name: '테크니화이버', href: '/products?brand=tecnifibre' },
        { name: '솔린코', href: '/products?brand=solinco' },
        { name: '프린스', href: '/products?brand=prince' },
      ],
    },
    rackets: {
      root: '/rackets',
      brands: [
        { name: '헤드', href: '/rackets?brand=head' },
        { name: '윌슨', href: '/rackets?brand=wilson' },
        { name: '바볼랏', href: '/rackets?brand=babolat' },
        { name: '테크니화이버', href: '/rackets?brand=tecnifibre' },
      ],
    },
    services: [
      { name: '장착 서비스 예약', href: '/services' },
      { name: '텐션 가이드', href: '/services/tension-guide' },
      { name: '장착 비용 안내', href: '/services/pricing' },
      { name: '매장/예약 안내', href: '/services/locations' },
    ],
    packages: [{ name: '패키지 안내', href: '/services/packages' }],
    support: [
      { name: '고객센터 홈', href: '/support/notice' },
      { name: '공지사항', href: '/board/notice' },
      { name: 'QnA', href: '/board/qna' },
    ],

    boards: [
      { name: '게시판 홈', href: '/board' },
      { name: '자유 게시판', href: '/board/free' },
      { name: '리뷰 게시판', href: '/reviews' },
    ],
  };

  // 헤더 실제 높이를 CSS 변수로 노출 → 좌측 사이드 top 자동 반영
  useEffect(() => {
    const setVar = () => {
      const h = headerRef.current?.offsetHeight ?? 64;
      document.documentElement.style.setProperty('--header-h', `${h}px`);
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    if (headerRef.current) ro.observe(headerRef.current);
    window.addEventListener('resize', setVar);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', setVar);
    };
  }, []);

  /** 스크롤/리사이즈 핸들링 */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        setIsScrolled((prev) => {
          if (!prev && y > 32) return true;
          if (prev && y < 4) return false;
          return prev;
        });
        ticking = false;
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  /** 탑 메뉴 항목들 */
  const menuItems = [
    { name: '스트링', href: '/products', hasMegaMenu: true },
    { name: '라켓', href: '/rackets', hasMegaMenu: true, isRacketMenu: true },
    { name: '장착 서비스', href: '/services', hasMegaMenu: true, isServiceMenu: true },
    { name: '패키지', href: '/services/packages', hasMegaMenu: true, isPackageMenu: true },

    { name: '고객센터', href: '/support' },

    // 앞으로 커뮤니티(리뷰, 자유게시판 등) 허브가 될 /board
    { name: '게시판', href: '/board', hasMegaMenu: true, isBoardMenu: true },
  ];

  return (
    <>
      {/* 스킵 링크 */}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg">
        메인 콘텐츠로 건너뛰기
      </a>

      <header className="sticky top-0 z-[50] w-full isolate h-[72px]" data-scrolled={isScrolled}>
        <div
          aria-hidden="true"
          className={`absolute left-0 right-0 top-0 z-0 pointer-events-none transition-[height,background] duration-300
            ${isScrolled ? 'h-[56px]' : 'h-[72px]'}
            bg-white/70 dark:bg-slate-900/60 backdrop-blur-md
            border-b border-slate-200 dark:border-slate-700`}
        />
        <div
          className="max-w-9xl mx-auto px-4 md:px-6 lg:px-8 h-full flex items-center justify-between overflow-visible transition-transform duration-300"
          style={{
            transform: isScrolled ? 'translateY(-8px) scale(0.96)' : 'translateY(0) scale(1)',
            transformOrigin: 'center',
            willChange: 'transform',
          }}
        >
          {/* 하나의 수평 그리드로: 로고(좌) / 검색(가운데) / 아이콘(우) */}
          <div className="flex items-center justify-between w-full gap-3 lg:gap-6">
            <Link href="/" className="flex flex-col group" aria-label="도깨비 테니스 홈">
              <div className="font-black text-lg lg:text-xl tracking-[-0.01em] whitespace-nowrap text-slate-900 dark:text-white">도깨비 테니스</div>
              <div className="text-xs tracking-wider text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">DOKKAEBI TENNIS SHOP</div>
            </Link>

            {/* 데스크탑 메뉴 (임시용) */}
            <nav className="hidden lg:flex items-center gap-2 xl:gap-3 ml-2">
              {menuItems.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm transition
                     ${active ? 'text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/30 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/50'}`}
                    aria-current={active ? 'page' : undefined}
                    aria-label={`${item.name} 페이지로 이동`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* <div className="max-w-md w-full">
              <WeatherBadge />
            </div> */}

            {/* 검색 (PC 전용) */}
            <div className="hidden lg:flex flex-1 justify-end">
              <div className="w-full max-w-[560px] min-w-[360px] xl:max-w-[640px]">
                <SearchPreview
                  placeholder="스트링 / 라켓 검색..."
                  className="
        w-full
        rounded-full bg-white/80 dark:bg-slate-800/70
        border border-slate-200 dark:border-slate-700
        focus-within:ring-2 ring-blue-500
        transition-all duration-200
      "
                />
              </div>
            </div>

            {/* 아이콘/유저 */}
            <div className="hidden lg:flex items-center gap-3 xl:gap-4 pl-2 shrink-0">
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100/70 dark:hover:bg-slate-800 p-2 transition-all duration-300 focus-visible:ring-2 ring-blue-500" aria-label="장바구니">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && <span className="absolute -top-1 -right-1 text-[10px] min-w-[18px] h-[18px] px-[5px] rounded-full bg-rose-600 text-white flex items-center justify-center font-bold">{cartBadge}</span>}
                </Button>
              </Link>

              <div className="max-w-[140px] overflow-hidden">
                <UserNav />
              </div>
              <ThemeToggle />
            </div>
          </div>

          {/* 모바일 우측: 햄버거 + 카트 */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/cart" className="sm:hidden">
              <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100/70 dark:hover:bg-slate-800 p-2 focus-visible:ring-2 ring-blue-500" aria-label="장바구니">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && <span className="absolute -top-1 -right-1 text-[10px] h-4 min-w-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">{cartBadge}</span>}
              </Button>
            </Link>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetOverlay className="bg-black/60 backdrop-blur-0" />
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100/70 dark:hover:bg-slate-800 p-2 focus-visible:ring-2 ring-blue-500" aria-label="메뉴 열기">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[300px] sm:w-[320px] bg-white dark:bg-slate-900 p-0 flex flex-col border-r border-slate-200 dark:border-slate-800"
                onOpenAutoFocus={(e) => {
                  if (typeof window !== 'undefined' && window.innerWidth < 768) e.preventDefault();
                }}
              >
                {/* 상단 로고/검색 */}
                <div
                  className="shrink-0 p-6 pb-4 border-b border-slate-200 dark:border-slate-800 
                  bg-gradient-to-br from-white/50 to-slate-50/50 dark:from-slate-900/50 dark:to-slate-950/50"
                >
                  <Link href="/" className="flex flex-col group" aria-label="도깨비 테니스 홈" onClick={() => setOpen(false)}>
                    <div
                      className="font-bold text-lg bg-gradient-to-r from-blue-600 to-emerald-600 
                      bg-clip-text text-transparent"
                    >
                      도깨비 테니스
                    </div>
                    <div className="text-xs tracking-wider text-slate-500 dark:text-slate-400 font-medium">DOKKAEBI TENNIS SHOP</div>
                  </Link>
                  <div className="mt-4">
                    <SearchPreview
                      placeholder="스트링 / 라켓 검색..."
                      className="w-full rounded-lg border-slate-300 dark:border-slate-700 
                        focus-within:border-blue-400 dark:focus-within:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide p-4 bg-white dark:bg-slate-900">
                  <Accordion type="multiple" defaultValue={['strings', 'rackets', 'service', 'packages', 'support', 'boards']}>
                    {/* 스트링 */}
                    <AccordionItem value="strings" className="border-none">
                      <AccordionTrigger
                        value="strings"
                        className="py-3 px-3 rounded-lg hover:bg-slate-100 
                          dark:hover:bg-slate-800 hover:no-underline transition-all group"
                      >
                        <span className="inline-flex items-center gap-2.5 text-base font-bold">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br 
                            from-blue-500 to-blue-600 text-white shadow-md group-hover:shadow-lg transition-shadow"
                          >
                            <Grid2X2 className="h-4 w-4" />
                          </div>
                          <span
                            className="bg-gradient-to-r from-blue-700 to-blue-600 dark:from-blue-400 
                            dark:to-blue-300 bg-clip-text text-transparent"
                          >
                            스트링
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent value="strings" className="pb-2 pt-1 space-y-0.5">
                        <Button
                          variant="ghost"
                          className="w-full justify-between rounded-lg px-3 py-2 text-sm font-medium 
                            text-muted-foreground hover:text-foreground hover:bg-gradient-to-r 
                            hover:from-blue-50/50 hover:to-emerald-50/50 transition-all"
                          onClick={() => {
                            setOpen(false);
                            router.push(NAV_LINKS.strings.root);
                          }}
                        >
                          전체 보기
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>

                        {/* 브랜드 서브메뉴 */}
                        <div className="mt-2 pl-2 space-y-0.5">
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">브랜드</div>
                          {NAV_LINKS.strings.brands.map((b) => (
                            <Button
                              key={b.href}
                              variant="ghost"
                              className="w-full justify-between rounded-md px-3 py-1.5 text-[13px] 
                                text-muted-foreground hover:text-foreground hover:bg-gradient-to-r 
                                hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                              onClick={() => {
                                setOpen(false);
                                router.push(b.href);
                              }}
                            >
                              {b.name}
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* 중고 라켓 */}
                    <AccordionItem value="rackets" className="border-none">
                      <AccordionTrigger
                        value="rackets"
                        className="py-3 px-3 rounded-lg hover:bg-gradient-to-r hover:from-emerald-50 
                          hover:to-emerald-100/50 dark:hover:from-emerald-950/30 dark:hover:to-emerald-900/20 
                          hover:no-underline transition-all group"
                      >
                        <span className="inline-flex items-center gap-2.5 text-base font-bold">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br 
                            from-emerald-500 to-emerald-600 text-white shadow-md group-hover:shadow-lg transition-shadow"
                          >
                            <MdSportsTennis className="h-4 w-4" />
                          </div>
                          <span
                            className="bg-gradient-to-r from-emerald-700 to-emerald-600 dark:from-emerald-400 
                            dark:to-emerald-300 bg-clip-text text-transparent"
                          >
                            중고 라켓
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent value="rackets" className="pb-2 pt-1 space-y-0.5">
                        <Button
                          variant="ghost"
                          className="w-full justify-between rounded-lg px-3 py-2 text-sm font-medium 
                            text-muted-foreground hover:text-foreground hover:bg-gradient-to-r 
                            hover:from-blue-50/50 hover:to-emerald-50/50 transition-all"
                          onClick={() => {
                            setOpen(false);
                            router.push(NAV_LINKS.rackets.root);
                          }}
                        >
                          전체 보기
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>

                        {/* 브랜드 서브메뉴 */}
                        <div className="mt-2 pl-2 space-y-0.5">
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">브랜드</div>
                          {NAV_LINKS.rackets.brands.map((b) => (
                            <Button
                              key={b.href}
                              variant="ghost"
                              className="w-full justify-between rounded-md px-3 py-1.5 text-[13px] 
                                text-muted-foreground hover:text-foreground hover:bg-gradient-to-r 
                                hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                              onClick={() => {
                                setOpen(false);
                                router.push(b.href);
                              }}
                            >
                              {b.name}
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* 장착 서비스 */}
                    <AccordionItem value="service" className="border-none">
                      <AccordionTrigger
                        value="service"
                        className="py-3 px-3 rounded-lg hover:bg-gradient-to-r hover:from-amber-50 hover:to-amber-100/50 
                          dark:hover:from-amber-950/30 dark:hover:to-amber-900/20 hover:no-underline transition-all group"
                      >
                        <span className="inline-flex items-center gap-2.5 text-base font-bold">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br 
                            from-amber-500 to-amber-600 text-white shadow-md group-hover:shadow-lg transition-shadow"
                          >
                            <Wrench className="h-4 w-4" />
                          </div>
                          <span
                            className="bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 
                            dark:to-amber-300 bg-clip-text text-transparent"
                          >
                            장착 서비스
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent value="service" className="pb-2 pt-1 space-y-0.5">
                        {NAV_LINKS.services.map((it) => (
                          <Button
                            key={it.name}
                            variant="ghost"
                            className="w-full justify-between rounded-lg px-3 py-2 text-sm font-medium 
                              text-muted-foreground hover:text-foreground hover:bg-gradient-to-r 
                              hover:from-blue-50/50 hover:to-emerald-50/50 transition-all"
                            onClick={() => {
                              setOpen(false);
                              router.push(it.href);
                            }}
                          >
                            {it.name}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        ))}
                      </AccordionContent>
                    </AccordionItem>

                    {/* 패키지 */}
                    <AccordionItem value="packages" className="border-none">
                      <AccordionTrigger
                        value="packages"
                        className="py-3 px-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100/50 
                          dark:hover:from-purple-950/30 dark:hover:to-purple-900/20 hover:no-underline transition-all group"
                      >
                        <span className="inline-flex items-center gap-2.5 text-base font-bold">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br 
                            from-purple-500 to-purple-600 text-white shadow-md group-hover:shadow-lg transition-shadow"
                          >
                            <Gift className="h-4 w-4" />
                          </div>
                          <span
                            className="bg-gradient-to-r from-purple-700 to-purple-600 dark:from-purple-400 
                            dark:to-purple-300 bg-clip-text text-transparent"
                          >
                            패키지
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent value="packages" className="pb-2 pt-1 space-y-0.5">
                        {NAV_LINKS.packages.map((it) => (
                          <Button
                            key={it.name}
                            variant="ghost"
                            className="w-full justify-between rounded-lg px-3 py-2 text-sm font-medium 
                              text-muted-foreground hover:text-foreground hover:bg-gradient-to-r 
                              hover:from-blue-50/50 hover:to-emerald-50/50 transition-all"
                            onClick={() => {
                              setOpen(false);
                              router.push(it.href);
                            }}
                          >
                            {it.name}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        ))}
                      </AccordionContent>
                    </AccordionItem>

                    {/* 고객센터 */}
                    <AccordionItem value="support" className="border-none">
                      <AccordionTrigger
                        value="support"
                        className="py-3 px-3 rounded-lg hover:bg-slate-100 
        dark:hover:bg-slate-800 hover:no-underline transition-all group"
                      >
                        <span className="inline-flex items-center gap-2.5 text-base font-bold">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br 
          from-sky-500 to-sky-600 text-white shadow-md group-hover:shadow-lg transition-shadow"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </div>
                          <span
                            className="bg-gradient-to-r from-sky-700 to-sky-600 dark:from-sky-400 
          dark:to-sky-300 bg-clip-text text-transparent"
                          >
                            고객센터
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent value="support" className="pb-2 pt-1 space-y-0.5">
                        {NAV_LINKS.support.map((it) => (
                          <Button
                            key={it.name}
                            variant="ghost"
                            className="w-full justify-between rounded-lg px-3 py-2 text-sm font-medium 
            text-muted-foreground hover:text-foreground hover:bg-gradient-to-r 
            hover:from-blue-50/50 hover:to-emerald-50/50 transition-all"
                            onClick={() => {
                              setOpen(false);
                              router.push(it.href);
                            }}
                          >
                            {it.name}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        ))}
                      </AccordionContent>
                    </AccordionItem>

                    {/* 게시판 */}
                    <AccordionItem value="boards" className="border-none">
                      <AccordionTrigger
                        value="boards"
                        className="py-3 px-3 rounded-lg hover:bg-gradient-to-r hover:from-rose-50 hover:to-rose-100/50 
                          dark:hover:from-rose-950/30 dark:hover:to-rose-900/20 hover:no-underline transition-all group"
                      >
                        <span className="inline-flex items-center gap-2.5 text-base font-bold">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br 
                            from-rose-500 to-rose-600 text-white shadow-md group-hover:shadow-lg transition-shadow"
                          >
                            <MessageSquareText className="h-4 w-4" />
                          </div>
                          <span
                            className="bg-gradient-to-r from-rose-700 to-rose-600 dark:from-rose-400 
                            dark:to-rose-300 bg-clip-text text-transparent"
                          >
                            게시판
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent value="boards" className="pb-2 pt-1 space-y-0.5">
                        {NAV_LINKS.boards.map((it) => (
                          <Button
                            key={it.name}
                            variant="ghost"
                            className="w-full justify-between rounded-lg px-3 py-2 text-sm font-medium 
                              text-muted-foreground hover:text-foreground hover:bg-gradient-to-r 
                              hover:from-blue-50/50 hover:to-emerald-50/50 transition-all"
                            onClick={() => {
                              setOpen(false);
                              router.push(it.href);
                            }}
                          >
                            {it.name}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                {/* 하단 고정 영역(모바일) */}
                <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-900">
                  {user ? (
                    <>
                      <div
                        className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r 
                        from-blue-50/50 to-emerald-50/50 dark:from-blue-950/20 dark:to-emerald-950/20
                        border border-slate-200 dark:border-slate-800"
                      >
                        <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-700 shadow-sm">
                          <AvatarImage src={user.image || '/placeholder.svg'} />
                          <AvatarFallback
                            className="bg-gradient-to-br from-blue-500 to-emerald-500 
                            text-white font-semibold"
                          >
                            {user.name?.charAt(0) ?? 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name} 님</div>
                          {isAdmin && (
                            <span
                              className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full 
                              bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm mt-1"
                            >
                              관리자
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="w-full justify-center rounded-xl border-slate-300 dark:border-slate-700 
                            bg-white dark:bg-slate-800 hover:bg-gradient-to-r hover:from-blue-50 
                            hover:to-blue-100 dark:hover:from-blue-950 dark:hover:to-blue-900
                            transition-all duration-200 shadow-sm"
                          onClick={() => {
                            setOpen(false);
                            router.push('/cart');
                          }}
                          aria-label="장바구니 페이지로 이동"
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          장바구니{cartCount > 0 ? ` (${cartBadge})` : ''}
                        </Button>

                        <Button
                          className="w-full justify-center rounded-xl bg-gradient-to-r from-blue-600 
                            to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white 
                            shadow-md transition-all duration-200"
                          onClick={() => {
                            setOpen(false);
                            router.push('/mypage');
                          }}
                          aria-label="마이페이지로 이동"
                        >
                          마이페이지
                        </Button>
                      </div>

                      {isAdmin && (
                        <Button
                          variant="outline"
                          className="w-full justify-center rounded-xl mt-2 border-emerald-300 
                            dark:border-emerald-700 text-emerald-700 dark:text-emerald-300
                            hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-100
                            dark:hover:from-emerald-950 dark:hover:to-emerald-900
                            transition-all duration-200 shadow-sm bg-transparent"
                          onClick={() => {
                            setOpen(false);
                            router.push('/admin/dashboard');
                          }}
                        >
                          관리자 페이지
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        className="w-full justify-center rounded-xl mt-2 text-rose-600 
                          hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30
                          transition-all duration-200"
                        onClick={async () => {
                          await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                          window.location.href = '/';
                        }}
                      >
                        로그아웃
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="w-full justify-center rounded-xl bg-gradient-to-r from-blue-600 
                        to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white 
                        shadow-md transition-all duration-200"
                      onClick={() => {
                        setOpen(false);
                        router.push('/login');
                      }}
                    >
                      로그인
                    </Button>
                  )}

                  <div className="mt-4 flex justify-center">
                    <ThemeToggle />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
