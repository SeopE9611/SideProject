import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { Button } from "@/components/ui/button";
import AppsInTossReconciliationClient from "./_components/AppsInTossReconciliationClient";

export const metadata: Metadata = { title: "Apps in Toss 결제 점검" };

export default function AppsInTossReconciliationPage() {
  return (
    <AdminPageShell variant="wide" className="space-y-6">
      <AdminPageHeader
        className="flex-col sm:flex-row"
        title="Apps in Toss 결제 점검"
        description="토스 앱 결제 중 자동 처리가 완료되지 않았거나 수동 상태 대사가 필요한 결제를 확인합니다."
        icon={ShieldAlert}
        scope="범위: 조회/진단 전용"
        helperText="이 화면에서는 결제 승인·환불·주문 상태를 변경하지 않습니다. Toss 상태 확인은 외부 거래 상태를 조회만 하며 내부 결제 상태를 변경하지 않습니다."
        actions={<Button asChild variant="outline" size="sm"><Link href="/admin/operations"><ArrowLeft className="h-4 w-4" />운영 업무로 돌아가기</Link></Button>}
      />
      <AppsInTossReconciliationClient />
    </AdminPageShell>
  );
}
