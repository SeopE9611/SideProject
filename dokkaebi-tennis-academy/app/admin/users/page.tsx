import UsersClient from './_components/UsersClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import { Users, UserPlus, Shield, Crown } from 'lucide-react';

export default async function AdminUsersPage() {
  return (
    <div className="p-6 space-y-8">
      {/* 페이지 제목 */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">회원 관리</h1>
            <p className="mt-2 text-lg text-gray-600">테니스 아카데미 회원들을 효율적으로 관리하세요</p>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border-0 transition-all duration-200 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">전체 회원</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border-0 transition-all duration-200 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">신규 회원</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <UserPlus className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border-0 transition-all duration-200 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">일반 회원</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3">
              <Users className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border-0 transition-all duration-200 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">관리자</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 회원 목록 컴포넌트 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border-0">
        <UsersClient />
      </div>
    </div>
  );
}
