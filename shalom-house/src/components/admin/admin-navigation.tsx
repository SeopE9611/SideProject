"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";

type AdminNavigationItem = {
  label: string;
  href: string;
  activePrefixes?: string[];
};

export function AdminNavigation({
  canRestore = false,
  canManageSiteContent = false,
  canManageInquiries = false,
  canManageDonations = false,
  canManageAdminUsers = false,
}: {
  canRestore?: boolean;
  canManageSiteContent?: boolean;
  canManageInquiries?: boolean;
  canManageDonations?: boolean;
  canManageAdminUsers?: boolean;
}) {
  const pathname = usePathname();
  const navigationId = useId();
  const sections: { label: string; items: AdminNavigationItem[] }[] = [
    {
      label: "개요",
      items: [{ label: "대시보드", href: "/admin" }],
    },
    {
      label: "홈페이지 콘텐츠",
      items: [
        { label: "소식", href: "/admin/news" },
        { label: "프로그램", href: "/admin/programs" },
        { label: "활동사진", href: "/admin/gallery" },
        { label: "자료공개", href: "/admin/transparency" },
        ...(canManageSiteContent ? [{ label: "시설 공식 정보", href: "/admin/site-content" }] : []),
      ],
    },
    {
      label: "운영 업무",
      items: [
        ...(canManageInquiries ? [{ label: "문의", href: "/admin/inquiries" }] : []),
        ...(canManageDonations
          ? [{ label: "후원", href: "/admin/donations", activePrefixes: ["/admin/donations", "/admin/donors"] }]
          : []),
        ...(canManageAdminUsers ? [{ label: "관리자 계정", href: "/admin/admin-users" }] : []),
        ...(canRestore ? [{ label: "휴지통", href: "/admin/trash" }] : []),
      ],
    },
  ].filter((section) => section.items.length > 0);

  return (
    <nav aria-label="관리자 메뉴">
      <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
        {sections.map((section) => (
          <section key={section.label} aria-labelledby={`${navigationId}-${section.label}`}>
            <h2
              id={`${navigationId}-${section.label}`}
              className="mb-2 px-2 text-xs font-bold tracking-[0.08em] text-muted-foreground"
            >
              {section.label}
            </h2>
            <ul className="grid grid-cols-2 gap-1 sm:grid-cols-1">
              {section.items.map((item) => {
                const current =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : (item.activePrefixes ?? [item.href]).some(
                        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
                      );
                return (
                  <li key={item.href}>
                    <Link href={item.href} aria-current={current ? "page" : undefined} className="admin-nav-link">
                      {item.label}
                      {current ? <span aria-hidden="true">•</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}
