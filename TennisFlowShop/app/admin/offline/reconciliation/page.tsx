import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import OfflineReconciliationClient from "./_components/OfflineReconciliationClient";

export const metadata: Metadata = { title: "오프라인 보정 필요 항목" };

export default function OfflineReconciliationPage() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <AdminPageHeader
          title="오프라인 보정 필요 항목"
          description="오프라인 패키지 발급 실패, 패키지 사용 연결 누락 등 운영 확인이 필요한 항목을 관리합니다."
          icon={AlertTriangle}
          scope="범위: 조회/확인 상태/메모 관리"
          helperText="확인 완료 처리는 실제 데이터 복구를 의미하지 않습니다."
          actions={(
            <Button asChild variant="outline">
              <Link href="/admin/offline"><ArrowLeft className="h-4 w-4" />오프라인 관리로 돌아가기</Link>
            </Button>
          )}
        />
        <OfflineReconciliationClient />
      </div>
    </div>
  );
}
