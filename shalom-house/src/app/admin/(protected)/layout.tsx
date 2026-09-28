import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminFormFeedback } from "@/components/admin/admin-form-feedback";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { SkipLink } from "@/components/layout/skip-link";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { adminRoleLabels } from "@/features/admin-auth/admin-auth.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "콘텐츠 관리",
  robots: { index: false, follow: false },
};

export default async function ProtectedAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="admin-shell min-h-screen bg-surface-subtle text-foreground">
      <SkipLink />
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <Link href="/admin" className="admin-brand">
            샬롬의 집 <small>운영 관리</small>
          </Link>
          <div className="admin-utility">
            <span className="min-w-0 break-words">
              {admin.displayName} · {adminRoleLabels[admin.role]}
            </span>
            <Link href="/">홈페이지 보기 ↗</Link>
            <form method="post" action="/api/admin/auth/logout">
              <button type="submit">로그아웃</button>
            </form>
          </div>
        </div>
      </header>
      <div className="admin-workspace">
        <aside className="admin-sidebar">
          <div className="admin-menu-desktop">
            <AdminNavigation
              canRestore={hasAdminPermission(admin, "content.restore")}
              canManageSiteContent={hasAdminPermission(admin, "site_content.manage")}
              canManageInquiries={hasAdminPermission(admin, "inquiries.manage")}
              canManageDonations={hasAdminPermission(admin, "donations.manage")}
              canManageAdminUsers={hasAdminPermission(admin, "admin_users.manage")}
            />
          </div>
          <details className="admin-menu-mobile">
            <summary>관리 메뉴</summary>
            <AdminNavigation
              canRestore={hasAdminPermission(admin, "content.restore")}
              canManageSiteContent={hasAdminPermission(admin, "site_content.manage")}
              canManageInquiries={hasAdminPermission(admin, "inquiries.manage")}
              canManageDonations={hasAdminPermission(admin, "donations.manage")}
              canManageAdminUsers={hasAdminPermission(admin, "admin_users.manage")}
            />
          </details>
        </aside>
        <main id="main-content" tabIndex={-1} className="admin-main">
          {children}
        </main>
      </div>
      <AdminFormFeedback />
    </div>
  );
}
