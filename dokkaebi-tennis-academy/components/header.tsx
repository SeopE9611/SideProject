'use client';

import { useEffect, useState } from 'react';
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
          {/* 좌측: 로고 + 내비 */}
          <div className="flex items-center gap-4 lg:gap-12">
            <Link href="/" className="flex flex-col group" aria-label="도깨비 테니스 홈">
              <div className="font-black text-lg lg:text-xl tracking-[-0.01em] whitespace-nowrap text-slate-900 dark:text-white">도깨비 테니스</div>
              <div className="text-xs tracking-wider text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">PROFESSIONAL STRING SHOP</div>
            </Link>

            {/* 메인 내비 (PC) */}
            <nav className="hidden lg:flex overflow-visible" role="navigation" aria-label="주요 메뉴">
              <ul className="flex items-center gap-5 2xl:gap-7 overflow-visible">
                {menuItems.map((item) => (
                  <li key={item.name} className="relative overflow-visible">
                    {item.hasMegaMenu ? (
                      <div
                        className="relative overflow-visible"
                        onMouseEnter={() => {
                          if (item.isBoardMenu) openBoardWithDelay();
                          else if (item.isPackageMenu) openPackageWithDelay();
                          else if (item.isServiceMenu) openServiceWithDelay();
                          else openStringWithDelay();
                        }}
                        onMouseLeave={() => {
                          if (item.isBoardMenu) closeBoardWithDelay();
                          else if (item.isPackageMenu) closePackageWithDelay();
                          else if (item.isServiceMenu) closeServiceWithDelay();
                          else closeStringWithDelay();
                        }}
                        onFocus={() => {
                          if (item.isBoardMenu) {
                            keepBoardOpen();
                            setShowBoardMenu(true);
                          } else if (item.isPackageMenu) {
                            keepPackageOpen();
                            setShowPackageMenu(true);
                          } else if (item.isServiceMenu) {
                            keepServiceOpen();
                            setShowServiceMenu(true);
                          } else {
                            keepStringOpen();
                            setShowStringMenu(true);
                          }
                        }}
                        onBlur={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget)) {
                            if (item.isBoardMenu) setShowBoardMenu(false);
                            else if (item.isPackageMenu) setShowPackageMenu(false);
                            else if (item.isServiceMenu) setShowServiceMenu(false);
                            else setShowStringMenu(false);
                          }
                        }}
                      >
                        <Link
                          href={item.href}
                          className="relative group px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 whitespace-nowrap flex items-center gap-1"
                          aria-haspopup="true"
                          aria-expanded={item.isBoardMenu ? showBoardMenu : item.isPackageMenu ? showPackageMenu : item.isServiceMenu ? showServiceMenu : showStringMenu}
                        >
                          {item.name}
                          <ChevronDown className="h-3 w-3" />
                        </Link>

                        {((item.isBoardMenu && showBoardMenu) || (item.isPackageMenu && showPackageMenu) || (item.isServiceMenu && showServiceMenu) || (!item.isBoardMenu && !item.isPackageMenu && !item.isServiceMenu && showStringMenu)) && (
                          <div
                            className="absolute left-0 top-full z-[40] mt-2 w-[880px] max-w-[90vw]
             rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
             ring-1 ring-slate-200/70 dark:ring-slate-700/70 shadow-2xl
             border-t-2 border-sky-400/70 p-5 lg:p-6 overflow-visible"
                            onMouseEnter={() => {
                              if (item.isBoardMenu) keepBoardOpen();
                              else if (item.isPackageMenu) keepPackageOpen();
                              else if (item.isServiceMenu) keepServiceOpen();
                              else keepStringOpen();
                            }}
                            onMouseLeave={() => {
                              if (item.isBoardMenu) closeBoardWithDelay();
                              else if (item.isPackageMenu) closePackageWithDelay();
                              else if (item.isServiceMenu) closeServiceWithDelay();
                              else closeStringWithDelay();
                            }}
                          >
                            {item.isPackageMenu ? (
                              /* 패키지 메가메뉴 */
                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">스트링 교체 패키지</h3>
                                  <nav>
                                    <ul className="space-y-3" role="menu">
                                      {packageLinks.map((link) => (
                                        <li key={link.name} role="none">
                                          <Link
                                            href={link.href}
                                            className={`block p-3 rounded-lg border transition-colors focus-visible:ring-2 ring-blue-500 ${
                                              link.isPopular
                                                ? 'border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                            }`}
                                            role="menuitem"
                                          >
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-sm font-semibold text-slate-900 dark:text-white">{link.name}</span>
                                              {link.isPopular && <span className="text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2 py-1 rounded-full font-semibold">인기</span>}
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">{link.description}</p>
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </nav>
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">패키지 혜택</h3>
                                  <nav>
                                    <ul className="space-y-2" role="menu">
                                      {packageBenefits.map((benefit) => (
                                        <li key={benefit.name} role="none">
                                          <Link
                                            href={benefit.href}
                                            className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-colors focus-visible:ring-2 ring-blue-500 rounded px-1 py-0.5 block"
                                            role="menuitem"
                                          >
                                            • {benefit.name}
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </nav>
                                  <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <p className="text-xs text-green-700 dark:text-green-400 font-semibold">💡 패키지 구매 시 회당 최대 2,000원 절약!</p>
                                  </div>
                                </div>
                              </div>
                            ) : item.isBoardMenu ? (
                              /* 게시판 메가메뉴 */
                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">게시판 메뉴</h3>
                                  <nav>
                                    <ul className="space-y-2" role="menu">
                                      {boardLinks.map((link) => (
                                        <li key={link.name} role="none">
                                          <Link
                                            href={link.href}
                                            className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-colors focus-visible:ring-2 ring-blue-500 rounded px-1 py-0.5 block"
                                            role="menuitem"
                                          >
                                            {link.name}
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </nav>
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">고객 지원</h3>
                                  <nav>
                                    <ul className="space-y-2" role="menu">
                                      <li role="none">
                                        <Link
                                          href="/contact"
                                          className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-colors focus-visible:ring-2 ring-blue-500 rounded px-1 py-0.5 block"
                                          role="menuitem"
                                        >
                                          문의하기
                                        </Link>
                                      </li>
                                      <li role="none">
                                        <Link href="/faq" className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-colors focus-visible:ring-2 ring-blue-500 rounded px-1 py-0.5 block" role="menuitem">
                                          자주 묻는 질문
                                        </Link>
                                      </li>
                                    </ul>
                                  </nav>
                                </div>
                              </div>
                            ) : item.isServiceMenu ? (
                              /* 장착 서비스 메가메뉴 */
                              <div className="grid grid-cols-2 gap-4">
                                <section className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                                  <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">장착 서비스</h3>
                                  <ul className="space-y-1" role="menu">
                                    {serviceLinks.map((svc) => (
                                      <li key={svc.name} role="none">
                                        <Link
                                          href={svc.href}
                                          role="menuitem"
                                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors
                        ${
                          svc.isHighlight
                            ? 'text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-white'
                        }`}
                                        >
                                          {svc.name}
                                          <ChevronRight className="h-4 w-4 opacity-60" />
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </section>

                                <section className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                                  <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">이용 가이드</h3>
                                  <div
                                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700
                    bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
                                  >
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                      💡 초보라면 <strong>텐션 가이드</strong>부터 확인하세요. 예약은 <strong>장착 서비스 예약</strong>에서 바로 가능합니다.
                                    </p>
                                  </div>
                                </section>
                              </div>
                            ) : (
                              /* 스트링 메가메뉴 (브랜드 / [재질] / 추천) */
                              <div className={`grid ${SHOW_MATERIAL_MENU ? 'grid-cols-3' : 'grid-cols-2'} gap-6`}>
                                <div>
                                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">브랜드</h3>

                                  {/* 상단 빠른칩(가로 스크롤) */}
                                  <div className="mb-3 overflow-x-auto scrollbar-hide -mx-1">
                                    <div className="flex gap-2 px-1">
                                      {brandLinks.slice(0, 6).map((b) => (
                                        <Link
                                          key={b.name}
                                          href={b.href}
                                          className="whitespace-nowrap rounded-full border border-slate-200 dark:border-slate-700
                       bg-slate-50/60 dark:bg-slate-800/40 px-3 py-1.5 text-xs
                       text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white
                       hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                                        >
                                          {b.name}
                                        </Link>
                                      ))}
                                    </div>
                                  </div>

                                  {/* 2열 링크 카드 */}
                                  <nav>
                                    <ul className="grid grid-cols-2 gap-2" role="menu">
                                      {brandLinks.map((brand) => (
                                        <li key={brand.name} role="none">
                                          <Link
                                            href={brand.href}
                                            role="menuitem"
                                            className="flex items-center justify-between rounded-lg px-3 py-2
                         text-sm text-slate-600 dark:text-slate-300
                         hover:bg-blue-50 dark:hover:bg-blue-900/20
                         hover:text-blue-700 dark:hover:text-white transition-colors"
                                          >
                                            {brand.name}
                                            <ChevronRight className="h-4 w-4 opacity-60" />
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </nav>
                                </div>

                                {/* 재질 카테고리 */}
                                {SHOW_MATERIAL_MENU && (
                                  <section className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                                    <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">스트링 재질 카테고리</h3>
                                    <ul className="space-y-1" role="menu">
                                      {stringTypes.map((type) => (
                                        <li key={type.name} role="none">
                                          <Link
                                            href={type.href}
                                            role="menuitem"
                                            className="block rounded-lg px-3 py-2 text-sm
                         text-slate-600 dark:text-slate-300
                         hover:bg-blue-50 dark:hover:bg-blue-900/20
                         hover:text-blue-700 dark:hover:text-white transition-colors"
                                          >
                                            {type.name}
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </section>
                                )}

                                {/* 추천/탐색 */}
                                <section className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                                  <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">추천/탐색</h3>
                                  <ul className="space-y-1" role="menu">
                                    {recommendedLinks.map((link) => (
                                      <li key={link.name} role="none">
                                        <Link
                                          href={link.href}
                                          role="menuitem"
                                          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm
                       text-slate-600 dark:text-slate-300
                       hover:bg-blue-50 dark:hover:bg-blue-900/20
                       hover:text-blue-700 dark:hover:text-white transition-colors"
                                        >
                                          {link.name}
                                          <ChevronRight className="h-4 w-4 opacity-60" />
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </section>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-white focus-visible:ring-2 ring-blue-500 rounded-md px-2 py-1 text-sm font-semibold transition-all duration-300 relative group whitespace-nowrap"
                        aria-current={pathname === item.href ? 'page' : undefined}
                      >
                        {item.name}
                        <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* 우측: 검색/아이콘/유저 (PC) */}
          <div className="hidden lg:flex items-center gap-3 xl:gap-4">
            <div className="relative z-[30]">
              <SearchPreview
                className="w-[260px] xl:w-[320px] focus-within:w-[360px] rounded-full bg-white/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 focus-within:ring-2 ring-blue-500 transition-all duration-200"
                placeholder="스트링 검색..."
                aria-label="스트링 검색"
              />
            </div>

            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100/70 dark:hover:bg-slate-800 p-2 transition-all duration-300 focus-visible:ring-2 ring-blue-500" aria-label="장바구니">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-[10px] min-w-[18px] h-[18px] px-[5px] rounded-full bg-rose-600 text-white flex items-center justify-center font-bold" aria-label={`장바구니에 ${cartBadge}개`}>
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
                    <div className="text-xs tracking-wider text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">PROFESSIONAL STRING SHOP</div>
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
