"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const sections = [
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
        ...(canManageDonations ? [{ label: "후원", href: "/admin/donations" }] : []),
        ...(canManageAdminUsers ? [{ label: "관리자 계정", href: "/admin/admin-users" }] : []),
        ...(canRestore ? [{ label: "휴지통", href: "/admin/trash" }] : []),
      ],
    },
  ].filter((section) => section.items.length > 0);

  return (
    <nav aria-label="관리자 메뉴">
      <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
        {sections.map((section) => (
          <section key={section.label} aria-labelledby={`admin-nav-${section.label}`}>
            <h2
              id={`admin-nav-${section.label}`}
              className="mb-2 px-2 text-xs font-bold tracking-[0.08em] text-muted-foreground"
            >
              {section.label}
            </h2>
            <ul className="grid grid-cols-2 gap-1 sm:grid-cols-1">
              {section.items.map((item) => {
                const current =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                      className={`group flex min-h-11 items-center justify-between gap-3 border-l-3 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                        current
                          ? "border-accent bg-accent-soft font-bold text-primary"
                          : "border-transparent font-semibold text-foreground hover:border-border-strong hover:bg-surface-subtle"
                      }`}
                    >
                      {item.label}
                      <span
                        aria-hidden="true"
                        className={`text-base ${current ? "text-accent" : "text-muted-foreground/45 group-hover:text-primary"}`}
                      >
                        →
                      </span>
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
