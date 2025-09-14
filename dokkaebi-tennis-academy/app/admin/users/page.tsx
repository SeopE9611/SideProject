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
            <h1 className="text-3xl font-bold tracking-tight">회원 관리</h1>
            <p className="mt-1 text-sm text-muted-foreground">가입한 모든 회원 정보를 확인하고 관리합니다.</p>
          </div>
        </div>

        {/* KPI 카드 4종 (값은 UsersClient가 주입) */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="border-0 bg-white/80 shadow-lg backdrop-blur-sm rounded-xl p-5">
            <p className="text-sm text-muted-foreground">전체 회원</p>
            <p className="mt-1 text-3xl font-bold" id="kpi-total">
              -
            </p>
          </div>
          <div className="border-0 bg-white/80 shadow-lg backdrop-blur-sm rounded-xl p-5">
            <p className="text-sm text-muted-foreground">활성 회원</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600" id="kpi-active">
              -
            </p>
          </div>
          <div className="border-0 bg-white/80 shadow-lg backdrop-blur-sm rounded-xl p-5">
            <p className="text-sm text-muted-foreground">삭제됨(탈퇴)</p>
            <p className="mt-1 text-3xl font-bold text-red-600" id="kpi-deleted">
              -
            </p>
          </div>
          <div className="border-0 bg-white/80 shadow-lg backdrop-blur-sm rounded-xl p-5">
            <p className="text-sm text-muted-foreground">관리자 수</p>
            <p className="mt-1 text-3xl font-bold text-purple-600" id="kpi-admins">
              -
            </p>
          </div>
        </div>

        {/* 목록 */}
        <UsersClient />
      </div>
    </div>
  );
}
