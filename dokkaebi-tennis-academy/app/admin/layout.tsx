import type { ReactNode } from 'react';
import { UserCog2Icon } from 'lucide-react';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import { headers } from 'next/headers';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminMobileMenu from '@/components/admin/AdminMobileMenu';
import { logInfo } from '@/lib/logger';

export const metadata = {
  title: '관리자 페이지 - 도깨비 테니스 아카데미',
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
    <div className="flex min-h-full flex-col bg-gradient-to-br from-slate-50 via-muted to-card dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div className="relative overflow-hidden bg-gradient-to-r from-background via-muted to-card text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
            <defs>
              <pattern id="court-lines" x="0" y="0" width="400" height="200" patternUnits="userSpaceOnUse">
                <rect width="400" height="200" fill="none" stroke="white" strokeWidth="2" />
                <line x1="200" y1="0" x2="200" y2="200" stroke="white" strokeWidth="2" />
                <rect x="50" y="50" width="300" height="100" fill="none" stroke="white" strokeWidth="1" />
                <line x1="50" y1="100" x2="350" y2="100" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#court-lines)" />
          </svg>
        </div>
        <div className="relative container py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-card backdrop-blur-sm rounded-2xl shadow-lg">
              <UserCog2Icon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black mb-2">관리자 페이지</h1>
              <p className="text-primary">관리자 전용 페이지 입니다. 상품 및 주문관리를 진행해보세요.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-4 px-4 py-4 lg:gap-6">
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
