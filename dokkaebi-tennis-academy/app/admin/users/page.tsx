// app/admin/users/page.tsx
import UsersClient from './_components/UsersClient';
import { Users as UsersIcon } from 'lucide-react';

export default async function AdminUsersPage() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        {/* 타이틀 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 shadow-lg">
            <UsersIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">회원 관리</h1>
            <p className="mt-1 text-sm text-muted-foreground">가입한 모든 회원 정보를 확인하고 관리합니다.</p>
          </div>
        </div>

        {/* 목록 */}
        <UsersClient />
      </div>
    </div>
  );
}
