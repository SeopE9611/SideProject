"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type AdminNavigationPermissions = {
  canRestore?: boolean;
  canManageSiteContent?: boolean;
  canManageInquiries?: boolean;
  canManageDonations?: boolean;
  canManageAdminUsers?: boolean;
};
export function AdminNavigation({
  canRestore = false,
  canManageSiteContent = false,
  canManageInquiries = false,
  canManageDonations = false,
  canManageAdminUsers = false,
  preview = false,
}: AdminNavigationPermissions & { preview?: boolean }) {
  const rawPath = usePathname();
  const pathname = preview ? rawPath.replace("/design-preview", "") : rawPath;
  const groups = [
    { id: "home", label: "업무 홈", mark: "⌂", items: [{ label: "대시보드", href: "/admin" }] },
    {
      id: "content",
      label: "콘텐츠",
      mark: "≡",
      items: [
        { label: "소식", href: "/admin/news" },
        { label: "프로그램", href: "/admin/programs" },
        { label: "활동사진", href: "/admin/gallery" },
        { label: "자료공개", href: "/admin/transparency" },
        ...(canManageSiteContent ? [{ label: "시설 공식 정보", href: "/admin/site-content" }] : []),
      ],
    },
    {
      id: "operations",
      label: "운영",
      mark: "↗",
      items: [
        ...(canManageInquiries ? [{ label: "문의", href: "/admin/inquiries" }] : []),
        ...(canManageDonations
          ? [
              { label: "후원금", href: "/admin/donations" },
              { label: "후원자", href: "/admin/donors" },
            ]
          : []),
      ],
    },
    {
      id: "settings",
      label: "관리",
      mark: "⋯",
      items: [
        ...(canManageAdminUsers ? [{ label: "관리자 계정", href: "/admin/admin-users" }] : []),
        ...(canRestore ? [{ label: "휴지통", href: "/admin/trash" }] : []),
      ],
    },
  ].filter((group) => group.items.length);
  const matches = (href: string) =>
    href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  const activeGroup = groups.find((group) => group.items.some((item) => matches(item.href)))?.id ?? "home";
  const [selection, setSelection] = useState<{ path: string; id: string } | null>(null);
  const selected = selection?.path === pathname ? selection.id : activeGroup;
  const group = groups.find((item) => item.id === selected) ?? groups[0];
  return (
    <>
      <nav className="workbench-rail" aria-label="업무 영역">
        <Link
          className="workbench-monogram"
          href={preview ? "/design-preview/admin" : "/admin"}
          aria-label="샬롬의 집 관리 홈"
        >
          샬롬
        </Link>
        {groups.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={group.id === item.id}
            aria-controls="workspace-navigation"
            onClick={() => setSelection({ path: pathname, id: item.id })}
          >
            <span aria-hidden="true">{item.mark}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <nav id="workspace-navigation" className="workbench-context" aria-label="관리자 메뉴">
        <strong>{group.label}</strong>
        <ul>
          {group.items.map((item) => (
            <li key={item.href}>
              <Link
                href={preview ? "/design-preview" + item.href : item.href}
                aria-current={matches(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
