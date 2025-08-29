'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingCart, Menu, Phone, Mail, Bell, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/nav/UserNav';
import { UserNavMobile } from '@/components/nav/UserNavMobile';
import { useRouter } from 'next/navigation';
import SearchPreview from '@/components/SearchPreview';

const Header = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { name: '홈', href: '/' },
    { name: '스트링', href: '/products' },
    { name: '장착 서비스', href: '/services' },
    { name: '아카데미', href: '/academy' },
    { name: '게시판', href: '/board/notice' },
  ];

  return (
    <>
      <div className="hidden lg:block bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 text-white py-2 lg:py-3">
        <div className="container max-w-screen-xl px-4 flex items-center justify-between text-xs lg:text-sm">
          <div className="flex items-center space-x-4 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <Phone className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="font-medium">02-123-4567</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="font-medium">info@dokkaebi-tennis.com</span>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <Bell className="h-3 w-3 lg:h-4 lg:w-4 animate-pulse" />
            <span className="font-semibold">스트링 할인 이벤트 진행중! 최대 30% 할인</span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-700/50 shadow-lg">
        <div className="container max-w-screen-xl px-4 flex items-center justify-between py-3 lg:py-4">
          <div className="flex items-center gap-4 lg:gap-12">
            <Link href="/" className="flex items-center gap-2 lg:gap-4 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div className="hidden sm:block">
                <div className="font-black text-lg lg:text-2xl bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">도깨비 테니스</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 -mt-1 font-semibold tracking-wider">PROFESSIONAL STRING SHOP</div>
              </div>
            </Link>

            <nav className="hidden xl:flex gap-6 2xl:gap-8">
              {menuItems.map((item) => (
                <Link key={item.name} href={item.href} className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 relative group py-2 px-1 whitespace-nowrap">
                  {item.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-600 to-green-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="hidden lg:flex items-center gap-3 xl:gap-4">
            <SearchPreview className="w-[200px] xl:w-[280px] 2xl:w-[320px]" placeholder="스트링 검색..." />

            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all duration-300">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg">3</span>
                <span className="sr-only">장바구니</span>
              </Button>
            </Link>

            <UserNav />
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/cart" className="sm:hidden">
              <Button variant="ghost" size="icon" className="relative hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all duration-300">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold shadow-lg text-[10px]">3</span>
              </Button>
            </Link>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">메뉴</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[320px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg">
                <div className="grid gap-6 py-6">
                  <Link href="/" className="flex items-center gap-3">
                    <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-2 rounded-lg shadow-lg"></div>
                    <div>
                      <div className="font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">도깨비 테니스</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">PROFESSIONAL STRING SHOP</div>
                    </div>
                  </Link>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <SearchPreview className="mt-1" placeholder="스트링 검색..." />
                  </div>

                  <nav className="grid gap-2">
                    {menuItems.map((item) => (
                      <Button
                        key={item.name}
                        variant="ghost"
                        className="justify-start text-sm font-semibold w-full text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl py-3"
                        onClick={() => {
                          setOpen(false);
                          router.push(item.href);
                        }}
                      >
                        {item.name}
                      </Button>
                    ))}
                  </nav>

                  <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      variant="outline"
                      className="w-full justify-start rounded-xl border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20 bg-transparent sm:hidden"
                      onClick={() => {
                        setOpen(false);
                        router.push('/cart');
                      }}
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
