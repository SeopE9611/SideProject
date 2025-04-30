"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, ShoppingCart, User, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const menuItems = [
    { name: "홈", href: "/" },
    { name: "스트링", href: "/products" },
    { name: "장착 서비스", href: "/services" },
    { name: "아카데미", href: "/academy" },
    { name: "게시판", href: "/board" },
  ]

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
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium transition-colors hover:text-[#3b82f6]"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#64748b]" />
            <Input
              type="search"
              placeholder="검색..."
              className="w-[200px] pl-8 md:w-[300px] rounded-full bg-[#f1f5f9] dark:bg-[#1e293b]"
            />
          </div>
          <Link href="/cart">
            <Button variant="ghost" size="icon">
              <ShoppingCart className="h-5 w-5" />
              <span className="sr-only">장바구니</span>
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
              <span className="sr-only">로그인</span>
            </Button>
          </Link>
          <ThemeToggle />
        </div>

        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">메뉴</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <div className="grid gap-6 py-6">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/placeholder.svg?height=32&width=32"
                  alt="도깨비 테니스 아카데미 로고"
                  width={32}
                  height={32}
                />
                <span className="font-bold">도깨비 테니스 아카데미</span>
              </Link>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#64748b]" />
                <Input
                  type="search"
                  placeholder="검색..."
                  className="pl-8 rounded-full bg-[#f1f5f9] dark:bg-[#1e293b]"
                />
              </div>
              <nav className="grid gap-4">
                {menuItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-sm font-medium transition-colors hover:text-[#3b82f6]"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="flex gap-4">
                <Link href="/cart" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    장바구니
                  </Button>
                </Link>
                <Link href="/login" className="flex-1">
                  <Button className="w-full">
                    <User className="mr-2 h-4 w-4" />
                    로그인
                  </Button>
                </Link>
              </div>
              <div className="flex justify-center mt-4">
                <ThemeToggle />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

export default Header
