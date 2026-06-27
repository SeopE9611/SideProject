import AdminNavigationShell from "@/components/admin/AdminNavigationShell";
import AccessDenied from "@/components/system/AccessDenied";
import { getCurrentUser } from "@/lib/hooks/get-current-user";
import { logInfo } from "@/lib/logger";
import { headers } from "next/headers";
import Link from "next/link";
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
        reason: !isTestRuntime
          ? "non_test_runtime"
          : isProductionEnvironment
            ? "production_environment"
            : "feature_disabled",
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
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="border-b border-border/70 bg-card/80 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/70 bp-md:px-4 xl:px-6">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-3">
          <Link href="/" className="rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
            <p className="text-ui-label font-semibold uppercase tracking-widest text-muted-foreground">
              Admin Console
            </p>
            <h1 className="text-ui-body-sm font-semibold text-foreground hover:text-primary">
              도깨비테니스 운영 관리
            </h1>
          </Link>
          <div className="flex items-center gap-3 text-ui-label text-muted-foreground">
            <span className="hidden sm:inline">관리자 콘솔</span>
            <Link href="/" target="_blank" rel="noreferrer" className="font-semibold text-foreground hover:text-primary">
              쇼핑몰 홈
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-4 px-3 pb-10 pt-4 bp-md:px-4 lg:px-5 xl:flex-row xl:gap-5 xl:px-6">
        <AdminNavigationShell />

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
