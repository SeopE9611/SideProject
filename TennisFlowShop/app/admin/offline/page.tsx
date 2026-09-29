import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { Button } from "@/components/ui/button";
import OfflineAdminClient from "./_components/OfflineAdminClient";

export const metadata: Metadata = { title: "오프라인 관리" };

export default function OfflinePage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="오프라인 관리"
        description="매장 방문 고객의 작업, 결제, 보정 내역을 한 곳에서 관리합니다."
        icon={Store}
        scope="범위: 오프라인 고객/작업/매출"
        helperText="미결제 작업과 보정 필요 내역을 먼저 확인하고, 완료된 내역은 매출 리포트와 함께 점검하세요."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/reports/revenue">매출 리포트</Link>
          </Button>
        }
      />

      <OfflineAdminClient />
    </AdminPageShell>
  );
}
