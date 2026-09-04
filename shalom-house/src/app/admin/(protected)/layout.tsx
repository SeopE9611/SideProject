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
      <header className="sticky top-0 z-40 border-b border-primary-foreground/10 bg-primary text-primary-foreground shadow-nav">
        <div className="mx-auto flex max-w-[100rem] flex-col gap-4 px-page py-4 sm:px-page-wide lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center border border-primary-foreground/25 text-sm font-extrabold text-sun-soft">
              SH
            </span>
            <div>
              <p className="text-xs font-bold tracking-[0.12em] text-primary-foreground/65">SHALOM HOUSE</p>
              <Link
                href="/admin"
                className="mt-1 block text-xl font-extrabold tracking-[-0.02em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface"
              >
                운영 관리
              </Link>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="min-w-0 border-primary-foreground/20 sm:border-r sm:pr-5 sm:text-right">
              <p className="font-bold">{admin.displayName}</p>
              <p className="break-all text-sm text-primary-foreground/72">
                {admin.email} · {adminRoleLabels[admin.role]}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center border border-primary-foreground/35 px-4 py-2 text-sm font-bold transition-colors hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface"
              >
                공개 홈페이지
              </Link>
              <form method="post" action="/api/admin/auth/logout">
                <button
                  type="submit"
                  className="min-h-11 bg-surface px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[100rem] gap-5 px-page py-5 sm:px-page-wide lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-7 lg:py-8">
        <aside className="border border-border bg-surface p-4 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:p-5">
          <p className="mb-4 border-b border-border pb-3 text-xs font-extrabold tracking-[0.1em] text-muted-foreground">
            관리 메뉴
          </p>
          <AdminNavigation
            canRestore={hasAdminPermission(admin, "content.restore")}
            canManageSiteContent={hasAdminPermission(admin, "site_content.manage")}
            canManageInquiries={hasAdminPermission(admin, "inquiries.manage")}
            canManageDonations={hasAdminPermission(admin, "donations.manage")}
            canManageAdminUsers={hasAdminPermission(admin, "admin_users.manage")}
          />
        </aside>
        <main
          id="main-content"
          tabIndex={-1}
          className="admin-main min-w-0 border border-border bg-surface px-5 py-6 shadow-card sm:px-8 sm:py-8 xl:px-10 xl:py-10"
        >
          {children}
        </main>
      </div>
      <AdminFormFeedback />
    </div>
  );
}
