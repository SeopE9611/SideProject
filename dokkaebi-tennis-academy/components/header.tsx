'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ShoppingCart, User, Menu } from 'lucide-react';
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
    { name: '게시판', href: '/board' },
  ];

  return (
    <header className=" sticky top-0 z-50 w-full border-b border-[#e2e8f0] bg-[#ffffff] bg-opacity-95 backdrop-blur supports-[backdrop-filter]:bg-opacity-60 dark:border-[#1e293b] dark:bg-[#0f172a] dark:bg-opacity-95 dark:supports-[backdrop-filter]:bg-opacity-60">
      <div className="container max-w-screen-xl px-4 flex items-center justify-between py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/placeholder.svg?height=32&width=32" alt="도깨비 테니스 아카데미 로고" width={32} height={32} />
            <span className="hidden font-bold sm:inline-block">도깨비 테니스 아카데미</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            {menuItems.map((item) => (
              <Link key={item.name} href={item.href} className="text-sm font-medium transition-colors hover:text-[#3b82f6]">
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* 데스크탑 */}
        <div className="hidden md:flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#64748b]" />
            <Input type="search" placeholder="검색..." className="w-[200px] pl-8 md:w-[300px] rounded-full bg-[#f1f5f9] dark:bg-[#1e293b]" />
          </div>
          <Link href="/cart">
            <Button variant="ghost" size="icon">
              <ShoppingCart className="h-5 w-5" />
              <span className="sr-only">장바구니</span>
            </Button>
          </Link>
          <UserNav />
          <ThemeToggle />
        </div>

        {/* 모바일 */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">메뉴</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <div className="grid gap-6 py-6">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/placeholder.svg?height=32&width=32" alt="도깨비 테니스 아카데미 로고" width={32} height={32} />
                <span className="font-bold">도깨비 테니스 아카데미</span>
              </Link>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#64748b]" />
                <Input type="search" placeholder="검색..." className="pl-8 rounded-full bg-[#f1f5f9] dark:bg-[#1e293b]" />
              </div>
              <nav className="grid gap-4">
                {menuItems.map((item) => (
                  <Button
                    key={item.name}
                    variant="ghost"
                    className="justify-start text-sm font-medium w-full text-left hover:text-[#3b82f6]"
                    onClick={() => {
                      setOpen(false);
                      router.push(item.href);
                    }}
                  >
                    {item.name}
                  </Button>
                ))}
              </nav>

              <div className="flex flex-col gap-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setOpen(false);
                    router.push('/cart');
                  }}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  장바구니
                </Button>
                <UserNavMobile setOpen={setOpen} />
              </div>
              <div className="flex justify-center mt-4">
                <ThemeToggle />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
