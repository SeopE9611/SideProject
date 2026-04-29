import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import AdminAuditClient from "@/app/admin/audit/_components/AdminAuditClient";

export const metadata: Metadata = {
  title: "관리자 감사 로그 | 관리자",
  description: "관리자 변경 작업의 실행자, 대상, 변경 내용을 확인합니다.",
};

export default function AdminAuditPage() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-foreground">관리자 감사 로그</h1>
            <p className="mt-1 text-sm text-muted-foreground">관리자 변경 작업의 실행자, 대상, 변경 내용을 확인합니다.</p>
          </div>
        </div>

        <AdminAuditClient />
      </div>
    </div>
  );
}
