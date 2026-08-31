import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

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

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SkipLink />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-site flex-col gap-5 px-page py-5 sm:px-page-wide lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-heading font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              샬롬의 집
            </Link>
            <p className="text-small font-semibold text-primary">콘텐츠 관리</p>
          </div>
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="min-w-0">
              <p className="font-semibold">{admin.displayName}</p>
              <p className="break-all text-small text-muted-foreground">{admin.email}</p>
              <p className="text-small text-muted-foreground">{adminRoleLabels[admin.role]}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                공개 홈페이지
              </Link>
              <form method="post" action="/api/admin/auth/logout">
                <button
                  type="submit"
                  className="min-h-11 rounded-control bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-site gap-6 px-page py-6 sm:px-page-wide lg:grid-cols-[14rem_minmax(0,1fr)] lg:py-8">
        <AdminNavigation canRestore={hasAdminPermission(admin, "content.restore")} />
        <main id="main-content" tabIndex={-1} className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
