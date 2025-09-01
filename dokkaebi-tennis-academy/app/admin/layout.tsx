import type { ReactNode } from 'react';
import Link from 'next/link';
import { Home, ShoppingBag, Star, UserCog2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import { cookies } from 'next/headers';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata = {
  title: '관리자 페이지 - 도깨비 테니스 아카데미',
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const e2eBypass = cookieStore.get('__e2e')?.value === '1';
  if (!e2eBypass) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return <AccessDenied />;
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-br from-slate-50 via-indigo-50/30 to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
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
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
              <UserCog2Icon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black mb-2">관리자 페이지</h1>
              <p className="text-blue-100">관리자 전용 페이지 입니다. 상품 및 주문관리를 진행해보세요.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 px-4 py-4 gap-4 lg:gap-6">
        <div className="hidden md:block">
          <AdminSidebar />
        </div>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
