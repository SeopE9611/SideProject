import AdminMobileMenu from "@/components/admin/AdminMobileMenu";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AccessDenied from "@/components/system/AccessDenied";
import { getCurrentUser } from "@/lib/hooks/get-current-user";
import { logInfo } from "@/lib/logger";
import { headers } from "next/headers";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "관리자 페이지",
};

function canBypassAdminGuard(requestHeaders: Headers): boolean {
  const providedToken = requestHeaders.get("x-e2e-admin-bypass-token");
  if (!providedToken) {
    return false;
  }

  const isTestRuntime = process.env.NODE_ENV === "test";
  const isProductionEnvironment = process.env.VERCEL_ENV === "production";
  const bypassEnabled = process.env.E2E_ADMIN_BYPASS_ENABLED === "1";

  if (!isTestRuntime || isProductionEnvironment || !bypassEnabled) {
    logInfo({
      msg: "admin_guard_bypass_denied",
      path: "/admin",
      extra: {
        reason: !isTestRuntime ? "non_test_runtime" : isProductionEnvironment ? "production_environment" : "feature_disabled",
        nodeEnv: process.env.NODE_ENV ?? null,
        vercelEnv: process.env.VERCEL_ENV ?? null,
      },
    });
    return false;
  }

  const expectedToken = process.env.E2E_ADMIN_BYPASS_TOKEN;
  if (!expectedToken) {
    logInfo({
      msg: "admin_guard_bypass_denied",
      path: "/admin",
      extra: {
        reason: "missing_expected_token",
      },
    });
    return false;
  }

  const bypassAccepted = providedToken === expectedToken;

  logInfo({
    msg: bypassAccepted ? "admin_guard_bypass_approved" : "admin_guard_bypass_denied",
    path: "/admin",
    extra: {
      reason: bypassAccepted ? "token_matched" : "token_mismatch",
    },
  });

  return bypassAccepted;
}

/** 관리자 UI 권한 검사의 단일 진입점. (app/admin/**) */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const e2eBypass = canBypassAdminGuard(requestHeaders);

  if (!e2eBypass) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return <AccessDenied />;
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-muted/30">
      <div className="mx-auto flex w-full max-w-[1800px] flex-1 gap-4 px-3 pb-10 pt-5 bp-md:px-4 lg:px-5 xl:gap-6 xl:px-6">
        <div className="hidden xl:block">
          <AdminSidebar defaultCollapsed />
        </div>

        <main className="min-w-0 flex-1">
          <div className="mb-4 xl:hidden">
            <AdminMobileMenu />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
