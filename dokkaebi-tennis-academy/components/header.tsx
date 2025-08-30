'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Menu, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/nav/UserNav';
import { UserNavMobile } from '@/components/nav/UserNavMobile';
import { useRouter, usePathname } from 'next/navigation';
import SearchPreview from '@/components/SearchPreview';

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showStringMenu, setShowStringMenu] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [stringOpenTimer, setStringOpenTimer] = useState<NodeJS.Timeout | null>(null);
  const [stringCloseTimer, setStringCloseTimer] = useState<NodeJS.Timeout | null>(null);
  const [boardOpenTimer, setBoardOpenTimer] = useState<NodeJS.Timeout | null>(null);
  const [boardCloseTimer, setBoardCloseTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setOpen(false);
      }
    };

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const menuItems = [
    { name: '스트링', href: '/products', hasMegaMenu: true },
    { name: '장착 서비스', href: '/services' },
    { name: '게시판', href: '/board', hasMegaMenu: true, isBoardMenu: true },
  ];

  const stringTypes = [
    { name: '폴리에스터', href: '/products/strings/polyester' },
    { name: '하이브리드', href: '/products/strings/hybrid' },
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
  ];

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

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg">
        메인 콘텐츠로 건너뛰기
      </a>

      <div className="hidden lg:block bg-slate-900 text-white h-9" role="status">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between h-full">
          <div className="flex items-center space-x-8">
            <span className="text-xs font-medium">02-123-4567</span>
            <span className="text-xs font-medium">info@dokkaebi-tennis.com</span>
          </div>
          <div className="flex items-center">
            <span className="text-xs font-medium">스트링 할인 이벤트 진행중! 최대 30% 할인</span>
          </div>
        </div>
      </div>

      <header
        className={`sticky top-0 z-[50] w-full isolate bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 transition-[height,background] duration-300 ${isScrolled ? 'h-[56px]' : 'h-[72px]'}`}
        data-scrolled={isScrolled}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-full flex items-center justify-between overflow-visible">
          <div className="flex items-center gap-4 lg:gap-12">
            <Link href="/" className="flex flex-col group" aria-label="도깨비 테니스 홈">
              <div className="font-black text-lg lg:text-xl tracking-[-0.01em] whitespace-nowrap text-slate-900 dark:text-white">도깨비 테니스</div>
              <div className="text-xs tracking-wider text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">PROFESSIONAL STRING SHOP</div>
            </Link>

            <nav className="hidden xl:flex overflow-visible" role="navigation" aria-label="주요 메뉴">
              <ul className="flex items-center gap-5 2xl:gap-7 overflow-visible">
                {menuItems.map((item) => (
                  <li key={item.name} className="relative overflow-visible">
                    {item.hasMegaMenu ? (
                      <div
                        className="relative overflow-visible"
                        onMouseEnter={() => {
                          if (item.isBoardMenu) {
                            openBoardWithDelay();
                          } else {
                            openStringWithDelay();
                          }
                        }}
                        onMouseLeave={() => {
                          if (item.isBoardMenu) {
                            closeBoardWithDelay();
                          } else {
                            closeStringWithDelay();
                          }
                        }}
                        onFocus={() => {
                          if (item.isBoardMenu) {
                            keepBoardOpen();
                            setShowBoardMenu(true);
                          } else {
                            keepStringOpen();
                            setShowStringMenu(true);
                          }
                        }}
                        onBlur={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget)) {
                            if (item.isBoardMenu) {
                              setShowBoardMenu(false);
                            } else {
                              setShowStringMenu(false);
                            }
                          }
                        }}
                      >
                        <Link
                          href={item.href}
                          className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-white focus-visible:ring-2 ring-blue-500 rounded-md px-2 py-1 text-sm font-semibold transition-all duration-300 relative group whitespace-nowrap flex items-center gap-1"
                          aria-haspopup="true"
                          aria-expanded={item.isBoardMenu ? showBoardMenu : showStringMenu}
                        >
                          {item.name}
                          <ChevronDown className="h-3 w-3" />
                          <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span>
                        </Link>

                        {((item.isBoardMenu && showBoardMenu) || (!item.isBoardMenu && showStringMenu)) && (
                          <div
                            className="absolute left-0 top-full z-[40] mt-0 w-[640px] rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border border-slate-200 dark:border-slate-700 p-6 shadow-xl overflow-visible"
                            onMouseEnter={() => {
                              if (item.isBoardMenu) {
                                keepBoardOpen();
                              } else {
                                keepStringOpen();
                              }
                            }}
                            onMouseLeave={() => {
                              if (item.isBoardMenu) {
                                closeBoardWithDelay();
                              } else {
                                closeStringWithDelay();
                              }
                            }}
                          >
                            {item.isBoardMenu ? (
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
                            ) : (
                              <div className="grid grid-cols-3 gap-6">
                                <div>
                                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">스트링 카테고리</h3>
                                  <nav>
                                    <ul className="space-y-2" role="menu">
                                      {stringTypes.map((type) => (
                                        <li key={type.name} role="none">
                                          <Link
                                            href={type.href}
                                            className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-colors focus-visible:ring-2 ring-blue-500 rounded px-1 py-0.5 block"
                                            role="menuitem"
                                          >
                                            {type.name}
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </nav>
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">추천/탐색</h3>
                                  <nav>
                                    <ul className="space-y-2" role="menu">
                                      {recommendedLinks.map((link) => (
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
                                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">장착 연동</h3>
                                  <nav>
                                    <ul className="space-y-2" role="menu">
                                      {serviceLinks.map((service) => (
                                        <li key={service.name} role="none">
                                          <Link
                                            href={service.href}
                                            className={`text-sm transition-colors focus-visible:ring-2 ring-blue-500 rounded px-1 py-0.5 block ${
                                              service.isHighlight ? 'text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white'
                                            }`}
                                            role="menuitem"
                                          >
                                            {service.name}
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </nav>
                                </div>
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
                        <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="hidden lg:flex items-center gap-3 xl:gap-4">
            <div className="relative z-[30]">
              <SearchPreview
                className="w-[260px] xl:w-[320px] focus-within:w-[360px] rounded-full bg-white/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 focus-within:ring-2 ring-blue-500 transition-all duration-200"
                placeholder="스트링 검색..."
                aria-label="스트링 검색"
              />
            </div>

            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100/70 dark:hover:bg-slate-800 p-2 transition-all duration-300 focus-visible:ring-2 ring-blue-500" data-count="3" aria-label="장바구니">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 text-[10px] h-4 min-w-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</span>
              </Button>
            </Link>

            <div className="max-w-[140px] overflow-hidden">
              <UserNav />
            </div>
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/cart" className="sm:hidden">
              <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100/70 dark:hover:bg-slate-800 p-2 focus-visible:ring-2 ring-blue-500" aria-label="장바구니">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 text-[10px] h-4 min-w-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</span>
              </Button>
            </Link>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100/70 dark:hover:bg-slate-800 p-2 focus-visible:ring-2 ring-blue-500" aria-label="메뉴 열기">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[320px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg">
                <div className="grid gap-6 py-6">
                  <Link href="/" className="flex flex-col" aria-label="도깨비 테니스 홈">
                    <div className="font-bold whitespace-nowrap text-slate-900 dark:text-white">도깨비 테니스</div>
                    <div className="text-xs tracking-wider text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">PROFESSIONAL STRING SHOP</div>
                  </Link>

                  <nav className="grid gap-2">
                    {menuItems.map((item) => (
                      <div key={item.name}>
                        <Button
                          variant="ghost"
                          className="justify-start text-sm font-semibold w-full text-left hover:bg-slate-100/70 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-white rounded-xl py-3 focus-visible:ring-2 ring-blue-500"
                          onClick={() => {
                            setOpen(false);
                            router.push(item.href);
                          }}
                          aria-label={`${item.name} 페이지로 이동`}
                        >
                          {item.name}
                        </Button>
                        {item.hasMegaMenu && !item.isBoardMenu && (
                          <div className="ml-4 mt-2 space-y-1">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">스트링 카테고리</div>
                            {stringTypes.map((type) => (
                              <Button
                                key={type.name}
                                variant="ghost"
                                size="sm"
                                className="justify-start text-xs w-full text-left text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white rounded-lg py-2 focus-visible:ring-2 ring-blue-500"
                                onClick={() => {
                                  setOpen(false);
                                  router.push(type.href);
                                }}
                              >
                                {type.name}
                              </Button>
                            ))}
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 mt-3">추천/탐색</div>
                            {recommendedLinks.map((link) => (
                              <Button
                                key={link.name}
                                variant="ghost"
                                size="sm"
                                className="justify-start text-xs w-full text-left text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white rounded-lg py-2 focus-visible:ring-2 ring-blue-500"
                                onClick={() => {
                                  setOpen(false);
                                  router.push(link.href);
                                }}
                              >
                                {link.name}
                              </Button>
                            ))}
                            <div className="border-t border-slate-200 dark:border-slate-700 my-2 pt-2">
                              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">장착 연동</div>
                              {serviceLinks.map((service) => (
                                <Button
                                  key={service.name}
                                  variant="ghost"
                                  size="sm"
                                  className={`justify-start text-xs w-full text-left rounded-lg py-2 focus-visible:ring-2 ring-blue-500 ${
                                    service.isHighlight ? 'text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white'
                                  }`}
                                  onClick={() => {
                                    setOpen(false);
                                    router.push(service.href);
                                  }}
                                >
                                  {service.name}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                        {item.hasMegaMenu && item.isBoardMenu && (
                          <div className="ml-4 mt-2 space-y-1">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">게시판 메뉴</div>
                            {boardLinks.map((link) => (
                              <Button
                                key={link.name}
                                variant="ghost"
                                size="sm"
                                className="justify-start text-xs w-full text-left text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white rounded-lg py-2 focus-visible:ring-2 ring-blue-500"
                                onClick={() => {
                                  setOpen(false);
                                  router.push(link.href);
                                }}
                              >
                                {link.name}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </nav>

                  <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      variant="outline"
                      className="w-full justify-start rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800 bg-transparent sm:hidden focus-visible:ring-2 ring-blue-500"
                      onClick={() => {
                        setOpen(false);
                        router.push('/cart');
                      }}
                      aria-label="장바구니 페이지로 이동"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      장바구니 (3)
                    </Button>
                    <UserNavMobile setOpen={setOpen} />
                  </div>

                  <div className="flex justify-center pt-4">
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
