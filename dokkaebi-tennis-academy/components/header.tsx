'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Menu, ChevronDown, ChevronRight, Wrench, Gift, MessageSquareText, Grid2X2 } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/nav/UserNav';
import { useRouter, usePathname } from 'next/navigation';
import SearchPreview from '@/components/SearchPreview';
import { useCartStore } from '@/app/store/cartStore';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
          <Button key={b.name} variant="outline" className="h-9 justify-center rounded-lg border-slate-200 dark:border-slate-700 text-sm" onClick={() => onPick(b.href)}>
            {b.name}
          </Button>
        ))}
      </div>
      {brands.length > VISIBLE && (
        <Button variant="ghost" size="sm" className="w-full justify-center rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white" onClick={() => setExpanded((v) => !v)}>
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

  const itemIcon = (item: any) => {
    if (item.isServiceMenu) return <Wrench className="h-4 w-4" />;
    if (item.isPackageMenu) return <Gift className="h-4 w-4" />;
    if (item.isBoardMenu) return <MessageSquareText className="h-4 w-4" />;
    return <Grid2X2 className="h-4 w-4" />; // 스트링 기본
  };

  /** 메가메뉴 표시 상태 */
  const [showStringMenu, setShowStringMenu] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showPackageMenu, setShowPackageMenu] = useState(false);
  const [showServiceMenu, setShowServiceMenu] = useState(false);

  /** 오픈/클로즈 지연 타이머 */
  const [stringOpenTimer, setStringOpenTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [stringCloseTimer, setStringCloseTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [boardOpenTimer, setBoardOpenTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [boardCloseTimer, setBoardCloseTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [packageOpenTimer, setPackageOpenTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [packageCloseTimer, setPackageCloseTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [serviceOpenTimer, setServiceOpenTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [serviceCloseTimer, setServiceCloseTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { items } = useCartStore();
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartBadge = cartCount > 99 ? '99+' : String(cartCount);
  const { user } = useCurrentUser();
  const isAdmin = user?.role === 'admin';

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
    { name: '장착 서비스', href: '/services', hasMegaMenu: true, isServiceMenu: true },
    { name: '패키지', href: '/services/packages', hasMegaMenu: true, isPackageMenu: true },
    { name: '게시판', href: '/board', hasMegaMenu: true, isBoardMenu: true },
  ];

  /** 링크 데이터 */
  const brandLinks = [
    { name: '윌슨', href: '/products?brand=wilson' },
    { name: '바볼랏', href: '/products?brand=babolat' },
    { name: '럭실론', href: '/products?brand=luxilon' },
    { name: '요넥스', href: '/products?brand=yonex' },
    { name: '헤드', href: '/products?brand=head' },
    { name: '테크니파이버', href: '/products?brand=tecnifibre' },
    { name: '솔린코', href: '/products?brand=solinco' },
    { name: '프린스', href: '/products?brand=prince' },
  ];

  const stringTypes = [
    { name: '폴리에스터', href: '/products?material=polyester' },
    { name: '하이브리드', href: '/products?material=hybrid' },
    { name: '멀티필라멘트', href: '/products?material=multifilament' },
    { name: '천연 거트', href: '/products?material=natural_gut' },
    { name: '합성 거트', href: '/products?material=synthetic_gut' },
  ];

  const recommendedLinks = [
    { name: '초보자 추천', href: '/products/strings/beginner' },
    { name: '베스트셀러', href: '/products/strings/bestseller' },
    { name: '세일 상품', href: '/products/strings/sale' },
  ];

  const serviceLinks = [
    { name: '장착 서비스 예약', href: '/services', isHighlight: true },
    { name: '텐션 가이드', href: '/services/tension-guide' },
    { name: '장착 비용 안내', href: '/services/pricing' },
    { name: '매장/예약 안내', href: '/services/locations' },
  ];

  const boardLinks = [
    { name: '공지사항', href: '/board/notice' },
    { name: 'QnA', href: '/board/qna' },
    { name: '리뷰 게시판', href: '/reviews' },
  ];

  const packageLinks = [
    {
      name: '스타터 패키지 (10회)',
      href: '/services/packages?package=10-sessions&target=packages',
      description: '테니스 입문자를 위한 기본 패키지',
    },
    {
      name: '레귤러 패키지 (30회)',
      href: '/services/packages?package=30-sessions&target=packages',
      description: '정기적으로 테니스를 즐기는 분들을 위한 인기 패키지',
      isPopular: true,
    },
    {
      name: '프로 패키지 (50회)',
      href: '/services/packages?package=50-sessions&target=packages',
      description: '진지한 테니스 플레이어를 위한 프리미엄 패키지',
    },
    {
      name: '챔피언 패키지 (100회)',
      href: '/services/packages?package=100-sessions&target=packages',
      description: '프로 선수와 열정적인 플레이어를 위한 최고급 패키지',
    },
  ];

  const packageBenefits = [
    { name: '최대 17% 할인', href: '/services/packages#benefits' },
    { name: '우선 예약 혜택', href: '/services/packages#benefits' },
    { name: '전문가 상담', href: '/services/packages#benefits' },
    { name: '품질 보장', href: '/services/packages#benefits' },
  ];

  /** 스트링 메뉴 핸들러 */
  const openStringWithDelay = () => {
    if (stringCloseTimer) {
      clearTimeout(stringCloseTimer);
      setStringCloseTimer(null);
    }
    if (!stringOpenTimer) {
      const timer = setTimeout(() => {
        setShowStringMenu(true);
        setStringOpenTimer(null);
      }, 150);
      setStringOpenTimer(timer);
    }
  };
  const closeStringWithDelay = () => {
    if (stringOpenTimer) {
      clearTimeout(stringOpenTimer);
      setStringOpenTimer(null);
    }
    if (!stringCloseTimer) {
      const timer = setTimeout(() => {
        setShowStringMenu(false);
        setStringCloseTimer(null);
      }, 220);
      setStringCloseTimer(timer);
    }
  };
  const keepStringOpen = () => {
    if (stringOpenTimer) {
      clearTimeout(stringOpenTimer);
      setStringOpenTimer(null);
    }
    if (stringCloseTimer) {
      clearTimeout(stringCloseTimer);
      setStringCloseTimer(null);
    }
  };

  /** 게시판 메뉴 */
  const openBoardWithDelay = () => {
    if (boardCloseTimer) {
      clearTimeout(boardCloseTimer);
      setBoardCloseTimer(null);
    }
    if (!boardOpenTimer) {
      const timer = setTimeout(() => {
        setShowBoardMenu(true);
        setBoardOpenTimer(null);
      }, 150);
      setBoardOpenTimer(timer);
    }
  };
  const closeBoardWithDelay = () => {
    if (boardOpenTimer) {
      clearTimeout(boardOpenTimer);
      setBoardOpenTimer(null);
    }
    if (!boardCloseTimer) {
      const timer = setTimeout(() => {
        setShowBoardMenu(false);
        setBoardCloseTimer(null);
      }, 220);
      setBoardCloseTimer(timer);
    }
  };
  const keepBoardOpen = () => {
    if (boardOpenTimer) {
      clearTimeout(boardOpenTimer);
      setBoardOpenTimer(null);
    }
    if (boardCloseTimer) {
      clearTimeout(boardCloseTimer);
      setBoardCloseTimer(null);
    }
  };

  /** 패키지 메뉴 */
  const openPackageWithDelay = () => {
    if (packageCloseTimer) {
      clearTimeout(packageCloseTimer);
      setPackageCloseTimer(null);
    }
    if (!packageOpenTimer) {
      const timer = setTimeout(() => {
        setShowPackageMenu(true);
        setPackageOpenTimer(null);
      }, 150);
      setPackageOpenTimer(timer);
    }
  };
  const closePackageWithDelay = () => {
    if (packageOpenTimer) {
      clearTimeout(packageOpenTimer);
      setPackageOpenTimer(null);
    }
    if (!packageCloseTimer) {
      const timer = setTimeout(() => {
        setShowPackageMenu(false);
        setPackageCloseTimer(null);
      }, 220);
      setPackageCloseTimer(timer);
    }
  };
  const keepPackageOpen = () => {
    if (packageOpenTimer) {
      clearTimeout(packageOpenTimer);
      setPackageOpenTimer(null);
    }
    if (packageCloseTimer) {
      clearTimeout(packageCloseTimer);
      setPackageCloseTimer(null);
    }
  };

  /** 장착 서비스 메뉴 */
  const openServiceWithDelay = () => {
    if (serviceCloseTimer) {
      clearTimeout(serviceCloseTimer);
      setServiceCloseTimer(null);
    }
    if (!serviceOpenTimer) {
      const timer = setTimeout(() => {
        setShowServiceMenu(true);
        setServiceOpenTimer(null);
      }, 150);
      setServiceOpenTimer(timer);
    }
  };
  const closeServiceWithDelay = () => {
    if (serviceOpenTimer) {
      clearTimeout(serviceOpenTimer);
      setServiceOpenTimer(null);
    }
    if (!serviceCloseTimer) {
      const timer = setTimeout(() => {
        setShowServiceMenu(false);
        setServiceCloseTimer(null);
      }, 220);
      setServiceCloseTimer(timer);
    }
  };
  const keepServiceOpen = () => {
    if (serviceOpenTimer) {
      clearTimeout(serviceOpenTimer);
      setServiceOpenTimer(null);
    }
    if (serviceCloseTimer) {
      clearTimeout(serviceCloseTimer);
      setServiceCloseTimer(null);
    }
  };

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
          className="max-w-7xl mx-auto px-4 md:px-6 h-full flex items-center justify-between overflow-visible transition-transform duration-300"
          style={{
            transform: isScrolled ? 'translateY(-8px) scale(0.96)' : 'translateY(0) scale(1)',
            transformOrigin: 'center',
            willChange: 'transform',
          }}
        >
          {/* 하나의 수평 그리드로: 로고(좌) / 검색(가운데) / 아이콘(우) */}
          <div className="flex items-center justify-between w-full gap-3 lg:gap-6">
            {/* 1) 로고 (좌) */}
            <Link href="/" className="flex flex-col group" aria-label="도깨비 테니스 홈">
              <div className="font-black text-lg lg:text-xl tracking-[-0.01em] whitespace-nowrap text-slate-900 dark:text-white">도깨비 테니스</div>
              <div className="text-xs tracking-wider text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">DOKKAEBI TENNIS SHOP</div>
            </Link>

            {/* 2) 검색 (가운데, PC 전용 & flex-1로 가변폭) */}
            <div className="hidden lg:flex flex-1 px-6">
              <SearchPreview
                placeholder="스트링 검색..."
                className="
        w-full
        rounded-full bg-white/80 dark:bg-slate-800/70
        border border-slate-200 dark:border-slate-700
        focus-within:ring-2 ring-blue-500
        transition-all duration-200
      "
              />
            </div>

            {/* 3) 아이콘/유저 (우) */}
            <div className="hidden lg:flex items-center gap-3 xl:gap-4">
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
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100/70 dark:hover:bg-slate-800 p-2 focus-visible:ring-2 ring-blue-500" aria-label="메뉴 열기">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[300px] sm:w-[320px] bg-white dark:bg-slate-900 p-0 flex flex-col"
                onOpenAutoFocus={(e) => {
                  if (typeof window !== 'undefined' && window.innerWidth < 768) e.preventDefault();
                }}
              >
                {/* 상단 로고/검색 */}
                <div className="shrink-0 p-6 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <Link href="/" className="flex flex-col" aria-label="도깨비 테니스 홈">
                    <div className="font-bold whitespace-nowrap text-slate-900 dark:text-white">도깨비 테니스</div>
                    <div className="text-xs tracking-wider text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">DOKKAEBI TENNIS SHOP</div>
                  </Link>
                  <div className="mt-4">
                    <SearchPreview placeholder="스트링 검색..." className="w-full" />
                  </div>
                </div>

                {/* 본문 메뉴 */}
                <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
                  <nav className="grid gap-2">
                    {menuItems.map((item) => (
                      <div key={item.name}>
                        <Button
                          variant="ghost"
                          className="relative flex items-center gap-3 text-sm font-semibold w-full text-left rounded-xl py-3
             hover:bg-slate-100/70 dark:hover:bg-slate-800
             hover:text-blue-600 dark:hover:text-white focus-visible:ring-2 ring-blue-500"
                          onClick={() => {
                            setOpen(false);
                            router.push(item.href);
                          }}
                          aria-label={`${item.name} 페이지로 이동`}
                        >
                          {/* 왼쪽 아이콘 */}
                          <span
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full
                   bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            {itemIcon(item)}
                          </span>

                          {/* 이동 화살표 */}
                          <ChevronRight className="h-4 w-4 opacity-60" />
                        </Button>

                        {/* 패키지 섹션(모바일) */}
                        {item.hasMegaMenu && item.isPackageMenu && (
                          <div className="ml-4 mt-2 space-y-1">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">스트링 교체 패키지</div>
                            {packageLinks.map((link) => (
                              <Button
                                key={link.name}
                                variant="ghost"
                                size="sm"
                                className={`justify-start text-xs w-full text-left rounded-lg py-2 focus-visible:ring-2 ring-blue-500 ${
                                  link.isPopular ? 'text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white'
                                }`}
                                onClick={() => {
                                  setOpen(false);
                                  router.push(link.href);
                                }}
                              >
                                {link.name} {link.isPopular && '⭐'}
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* 스트링 섹션(모바일): 브랜드/추천만 남김 */}
                        {item.hasMegaMenu && !item.isBoardMenu && !item.isPackageMenu && !item.isServiceMenu && (
                          <div className="ml-2 mt-2">
                            <div
                              className="rounded-xl border border-slate-200 dark:border-slate-800
                    bg-slate-50/60 dark:bg-slate-800/40 p-3"
                            >
                              <Accordion type="multiple" defaultValue={['brand']} className="w-full">
                                <AccordionItem value="brand">
                                  <AccordionTrigger value="brand" className="text-sm font-semibold">
                                    브랜드
                                  </AccordionTrigger>
                                  <AccordionContent value="brand">
                                    <MobileBrandGrid
                                      brands={brandLinks}
                                      onPick={(href) => {
                                        setOpen(false);
                                        router.push(href);
                                      }}
                                    />
                                  </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="discover">
                                  <AccordionTrigger value="discover" className="text-sm font-semibold">
                                    추천/탐색
                                  </AccordionTrigger>
                                  <AccordionContent value="discover">
                                    <ul className="grid grid-cols-1 gap-1">
                                      {recommendedLinks.map((link) => (
                                        <li key={link.name}>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-between rounded-lg py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white"
                                            onClick={() => {
                                              setOpen(false);
                                              router.push(link.href);
                                            }}
                                          >
                                            {link.name}
                                            <ChevronRight className="h-4 w-4 opacity-60" />
                                          </Button>
                                        </li>
                                      ))}
                                    </ul>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            </div>
                          </div>
                        )}

                        {/* 장착 서비스 섹션(모바일) */}
                        {item.hasMegaMenu && item.isServiceMenu && (
                          <div className="ml-4 mt-2">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">장착 서비스</div>
                            <div
                              className="rounded-xl border border-slate-200 dark:border-slate-800
                    bg-slate-50/60 dark:bg-slate-800/40 p-2 space-y-1"
                            >
                              {serviceLinks.map((svc) => (
                                <Button
                                  key={svc.name}
                                  variant="ghost"
                                  size="sm"
                                  className={`w-full justify-between rounded-lg py-2 text-sm
                      focus-visible:ring-2 ring-blue-500
                      ${svc.isHighlight ? 'text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white'}`}
                                  onClick={() => {
                                    setOpen(false);
                                    router.push(svc.href);
                                  }}
                                >
                                  {svc.name}
                                  <ChevronRight className="h-4 w-4 opacity-60" />
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 게시판 섹션(모바일) */}
                        {item.hasMegaMenu && item.isBoardMenu && (
                          <div className="ml-4 mt-2">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">게시판 메뉴</div>
                            <div
                              className="rounded-xl border border-slate-200 dark:border-slate-800
                    bg-slate-50/60 dark:bg-slate-800/40 p-2 space-y-1"
                            >
                              {boardLinks.map((link) => (
                                <Button
                                  key={link.name}
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start text-xs w-full text-left rounded-lg py-2
                     text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white
                     focus-visible:ring-2 ring-blue-500"
                                  onClick={() => {
                                    setOpen(false);
                                    router.push(link.href);
                                  }}
                                >
                                  {link.name}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>

                {/* 하단 고정 영역(모바일) */}
                <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 p-6">
                  {user ? (
                    <>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.image || '/placeholder.svg'} />
                          <AvatarFallback>{user.name?.charAt(0) ?? 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {user.name} 님{isAdmin && <span className="mt-1 ml-2 inline-block text-[11px] font-semibold px-1.5 py-[2px] rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">관리자</span>}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="w-full justify-center rounded-xl border-slate-200 dark:border-slate-700 bg-transparent"
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
                          className="w-full justify-center rounded-xl"
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
                          variant="ghost"
                          className="w-full justify-center rounded-xl mt-2"
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
                        className="w-full justify-center rounded-xl mt-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
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
                      className="w-full justify-center rounded-xl"
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
