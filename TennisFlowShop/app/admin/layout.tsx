import AdminDesktopViewportPolicy from "@/components/admin/AdminDesktopViewportPolicy";
import AdminNavigationShell from "@/components/admin/AdminNavigationShell";
import AccessDenied from "@/components/system/AccessDenied";
import { isAdminRole } from "@/lib/admin/roles";
import { getCurrentUser } from "@/lib/hooks/get-current-user";
import { logInfo } from "@/lib/logger";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
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
    if (!user || !isAdminRole(user.role)) {
      return <AccessDenied />;
    }
  }

  return (
    <div className="flex min-h-screen min-w-[1280px] flex-col bg-muted/30">
      <AdminDesktopViewportPolicy />
      <div
        className="admin-narrow-viewport-notice border-b border-border bg-foreground px-6 py-3 text-sm text-background shadow-sm"
        role="status"
      >
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <strong className="font-bold">관리자 콘솔은 데스크톱 전용입니다.</strong>
          <span className="font-medium">
            정확한 업무 처리를 위해 1280px 이상의 PC 환경을 사용해 주세요.
          </span>
        </p>
      </div>
      <div className="border-b border-border/70 bg-card/80 px-3 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-card/70 2xl:px-6 2xl:py-2">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-3">
          <Link
            href="/admin/dashboard"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <p className="text-ui-label font-semibold uppercase tracking-widest text-muted-foreground">
              Admin Console
            </p>
            <div className="text-ui-body-sm font-semibold text-foreground hover:text-primary">
              도깨비테니스 운영 관리
            </div>
          </Link>
          <div className="flex items-center gap-3 text-ui-label text-muted-foreground">
            <span>관리자 콘솔</span>
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className="rounded-md font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              쇼핑몰 홈
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-row gap-3 px-3 pb-8 pt-3 2xl:gap-5 2xl:px-6 2xl:pb-10 2xl:pt-4">
        <AdminNavigationShell />

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
