'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ShoppingCart, Menu, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/nav/UserNav';
import { UserNavMobile } from '@/components/nav/UserNavMobile';
import { useRouter } from 'next/navigation';

const Header = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // 창 크기 변경될 때 메뉴 자동 닫기
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setOpen(false); // md 이상이면 메뉴 닫기
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
    { name: '게시판', href: '/board/notice' }, // ★ 추후 수정
  ];

  return (
    <>
      <div className="hidden lg:block bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2">
        <div className="container max-w-screen-xl px-4 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>010-5218-5248</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>싸좡님@돈좀줘폰요금내게.com</span>
            </div>
          </div>
          <div className="text-blue-100">⭐ 100년 전통의 전문 테니스 서비스 ⭐</div>
        </div>
      </div>

      <header className="sticky top-0 z-50 w-full border-b border-[#e2e8f0] bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 dark:border-[#1e293b] dark:bg-[#0f172a]/95 dark:supports-[backdrop-filter]:bg-[#0f172a]/80 shadow-sm">
        <div className="container max-w-screen-xl px-4 flex items-center justify-between py-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-sm opacity-75 group-hover:opacity-100 transition-opacity"></div>
                {/* <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-full">
                  <Image src="/placeholder.svg?height=32&width=32" alt="도깨비 테니스 아카데미 로고" width={32} height={32} className="filter brightness-0 invert" />
                </div> */}
              </div>
              <div>
                <div className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">도깨비 테니스</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 -mt-1">DOKKAEBI TENNIS ACADEMY</div>
              </div>
            </Link>

            <nav className="hidden md:flex gap-8">
              {menuItems.map((item) => (
                <Link key={item.name} href={item.href} className="text-sm font-medium transition-all duration-300 hover:text-blue-600 dark:hover:text-blue-400 relative group">
                  {item.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              ))}
            </nav>
          </div>

          {/* 데스크탑 */}
          <div className="hidden md:flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <Input
                type="search"
                placeholder="스트링 검색..."
                className="w-[250px] lg:w-[300px] pl-10 rounded-full bg-gray-50 dark:bg-gray-800 border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition-all duration-300"
              />
            </div>

            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
                <span className="sr-only">장바구니</span>
              </Button>
            </Link>

            <UserNav />
            <ThemeToggle />
          </div>

          {/* 모바일 */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full">
                <Menu className="h-5 w-5" />
                <span className="sr-only">메뉴</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] bg-white/95 backdrop-blur-md dark:bg-gray-900/95">
              <div className="grid gap-6 py-6">
                <Link href="/" className="flex items-center gap-3">
                  {/* <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-full">
                    <Image src="/placeholder.svg?height=32&width=32" alt="도깨비 테니스 아카데미 로고" width={32} height={32} className="filter brightness-0 invert" />
                  </div> */}
                  <div>
                    <div className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">도깨비 테니스</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">DOKKAEBI TENNIS</div>
                  </div>
                </Link>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input type="search" placeholder="스트링 검색..." className="pl-10 rounded-full bg-gray-50 dark:bg-gray-800 border-0" />
                </div>

                <nav className="grid gap-2">
                  {menuItems.map((item) => (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className="justify-start text-sm font-medium w-full text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg"
                      onClick={() => {
                        setOpen(false);
                        router.push(item.href);
                      }}
                    >
                      {item.name}
                    </Button>
                  ))}
                </nav>

                <div className="flex flex-col gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-lg border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20 bg-transparent"
                    onClick={() => {
                      setOpen(false);
                      router.push('/cart');
                    }}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    장바구니 (99)
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
      </header>
    </>
  );
};

export default Header;
