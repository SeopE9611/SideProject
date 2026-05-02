import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import AdminAuditClient from "@/app/admin/audit/_components/AdminAuditClient";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const metadata: Metadata = {
  title: "관리자 감사 로그 | 관리자",
  description: "관리자 변경 작업의 실행자, 대상, 변경 내용을 확인합니다.",
};

export default function AdminAuditPage() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader
          title="관리자 감사 로그"
          description="관리자 변경 작업의 실행자, 대상, 변경 내용을 확인합니다."
          icon={ShieldCheck}
          scope="범위: 관리자 작업 이력"
          helperText="위험 작업과 상태 변경 이력을 추적하는 용도로 사용합니다."
        />

        <AdminAuditClient />
      </div>
    </div>
  );
}
