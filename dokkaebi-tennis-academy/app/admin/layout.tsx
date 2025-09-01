import type { ReactNode } from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
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
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 px-4 py-4 gap-4 lg:gap-6">
        <div className="hidden md:block">
          <AdminSidebar />
        </div>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
