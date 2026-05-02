import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원 관리",
};

// app/admin/users/page.tsx
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Users as UsersIcon } from "lucide-react";
import UsersClient from "./_components/UsersClient";

export default async function AdminUsersPage() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <AdminPageHeader
          title="회원 관리"
          description="회원의 계정 상태, 연락처, 포인트, 최근 활동을 확인하고 CS 대응에 필요한 정보를 관리합니다."
          icon={UsersIcon}
          scope="범위: 회원 계정 및 고객 정보"
          helperText="주문·신청·리뷰·세션 내역은 회원 상세에서 확인합니다."
        />

        {/* 목록 */}
        <UsersClient />
      </div>
    </div>
  );
}
