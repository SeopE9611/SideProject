"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "대시보드", href: "/admin" },
  { label: "뉴스 관리", href: "/admin/news" },
  { label: "프로그램 관리", href: "/admin/programs" },
  { label: "활동사진 관리", href: "/admin/gallery" },
  { label: "자료공개 관리", href: "/admin/transparency" },
] as const;

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="관리자 메뉴">
      <ul className="flex flex-wrap gap-2 lg:flex-col">
        {items.map((item) => {
          const current =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="min-w-32 flex-1 lg:min-w-0">
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-control border-l-4 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                  current
                    ? "border-primary bg-primary-soft font-semibold text-primary"
                    : "border-transparent text-foreground hover:bg-surface-subtle"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
