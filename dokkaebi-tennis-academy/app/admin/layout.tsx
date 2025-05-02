import type React from "react"
import Link from "next/link"
import { Home, Users, Calendar, Star, ShoppingBag, Settings, BarChart3, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // 관리자 메뉴 항목
  const menuItems = [
    { name: "대시보드", href: "/admin/dashboard", icon: <BarChart3 className="mr-2 h-4 w-4" /> },
    { name: "회원 관리", href: "/admin/users", icon: <Users className="mr-2 h-4 w-4" /> },
    { name: "클래스 관리", href: "/admin/classes", icon: <Calendar className="mr-2 h-4 w-4" /> },
    { name: "리뷰 관리", href: "/admin/reviews", icon: <Star className="mr-2 h-4 w-4" /> },
    { name: "주문 관리", href: "/admin/orders", icon: <ShoppingBag className="mr-2 h-4 w-4" /> },
    { name: "게시판 관리", href: "/admin/boards", icon: <FileText className="mr-2 h-4 w-4" /> },
    { name: "설정", href: "/admin/settings", icon: <Settings className="mr-2 h-4 w-4" /> },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      {/* 관리자 헤더 */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold">도깨비 테니스 아카데미</span>
              <span className="rounded-md bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                관리자
              </span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="flex items-center space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  사이트로 이동
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        {/* 사이드바 */}
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 overflow-y-auto border-r md:sticky md:block">
          <div className="py-6 pr-6">
            <nav className="flex flex-col space-y-1">
              {menuItems.map((item) => (
                <Button key={item.name} variant="ghost" className="justify-start" asChild>
                  <Link href={item.href}>
                    {item.icon}
                    {item.name}
                  </Link>
                </Button>
              ))}
            </nav>
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex w-full flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
