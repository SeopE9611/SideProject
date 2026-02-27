import type { ReactNode } from 'react';
import { UserCog2Icon } from 'lucide-react';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import { headers } from 'next/headers';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminMobileMenu from '@/components/admin/AdminMobileMenu';
import { logInfo } from '@/lib/logger';
import HeroCourtBackdrop from '@/components/system/HeroCourtBackdrop';

export const metadata = {
  title: '관리자 페이지 - 테니스 플로우',
};

function canBypassAdminGuard(requestHeaders: Headers): boolean {
  const providedToken = requestHeaders.get('x-e2e-admin-bypass-token');
  if (!providedToken) {
    return false;
  }

  const isTestRuntime = process.env.NODE_ENV === 'test';
  const isProductionEnvironment = process.env.VERCEL_ENV === 'production';
  const bypassEnabled = process.env.E2E_ADMIN_BYPASS_ENABLED === '1';

  if (!isTestRuntime || isProductionEnvironment || !bypassEnabled) {
    logInfo({
      msg: 'admin_guard_bypass_denied',
      path: '/admin',
      extra: {
        reason: !isTestRuntime ? 'non_test_runtime' : isProductionEnvironment ? 'production_environment' : 'feature_disabled',
        nodeEnv: process.env.NODE_ENV ?? null,
        vercelEnv: process.env.VERCEL_ENV ?? null,
      },
    });
    return false;
  }

  const expectedToken = process.env.E2E_ADMIN_BYPASS_TOKEN;
  if (!expectedToken) {
    logInfo({
      msg: 'admin_guard_bypass_denied',
      path: '/admin',
      extra: {
        reason: 'missing_expected_token',
      },
    });
    return false;
  }

  const bypassAccepted = providedToken === expectedToken;

  logInfo({
    msg: bypassAccepted ? 'admin_guard_bypass_approved' : 'admin_guard_bypass_denied',
    path: '/admin',
    extra: {
      reason: bypassAccepted ? 'token_matched' : 'token_mismatch',
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
    if (!user || user.role !== 'admin') {
      return <AccessDenied />;
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-muted/30">
      <div className="relative overflow-hidden bg-muted/30 text-foreground">
        <div className="absolute inset-0 bg-overlay/10"></div>
        <HeroCourtBackdrop className="h-full w-full text-primary opacity-[0.10] dark:opacity-[0.12]" />
        <div className="relative container py-12 lg:py-14">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-card backdrop-blur-sm rounded-2xl shadow-lg">
              <UserCog2Icon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black mb-2">관리자 페이지</h1>
              <p className="text-muted-foreground">
                관리자 전용 페이지 입니다.
                <span className="font-medium text-primary"> 상품 및 주문관리</span>를 진행해보세요.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-4 px-4 py-4 lg:gap-6 lg:px-6">
        <div className="hidden md:block">
          <AdminSidebar />
        </div>

        <main className="min-w-0 flex-1">
          <div className="mb-3 md:hidden">
            <AdminMobileMenu />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
