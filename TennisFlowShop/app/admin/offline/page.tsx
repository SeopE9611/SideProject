import type { Metadata } from "next";
import { Store } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import OfflineAdminClient from "./_components/OfflineAdminClient";

export const metadata: Metadata = { title: "오프라인 관리" };

export default function OfflinePage() {
  return <div className="p-6"><div className="mx-auto max-w-7xl"><AdminPageHeader title="오프라인 관리" description="고객 검색부터 작업/결제 등록, 최근 기록 확인까지 오프라인 접수 업무를 한 화면에서 관리합니다." icon={Store} scope="범위: 오프라인 고객/작업/매출" /><OfflineAdminClient /></div></div>;
}
