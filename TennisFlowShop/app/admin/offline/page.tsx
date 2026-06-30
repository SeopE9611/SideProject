import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { adminSurface } from "@/components/admin/admin-typography";
import { Button } from "@/components/ui/button";
import OfflineAdminClient from "./_components/OfflineAdminClient";

export const metadata: Metadata = { title: "오프라인 관리" };

const QUICK_GUIDES = [
  {
    title: "미결제 작업 확인",
    description: "오늘 접수된 작업 중 미결제 항목을 먼저 확인해 결제 누락을 줄이세요.",
  },
  {
    title: "작업·결제 내역 점검",
    description: "작업 상태와 결제 상태가 일치하는지 최근 기록을 기준으로 빠르게 점검하세요.",
  },
  {
    title: "보정 필요 항목 확인",
    description: "패키지 발급 실패 및 보정 필요 건을 확인해 당일 정산 오류를 예방하세요.",
  },
  {
    title: "매출 리포트 연계 확인",
    description: "완료 내역은 매출 리포트와 함께 검토해 월간 집계 흐름을 맞춰주세요.",
  },
] as const;

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

        <section
          aria-label="오늘 확인할 일"
          className={`mb-6 ${adminSurface.cardMuted} p-4`}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">오늘 확인할 일</h2>
            <Link
              href="/admin/reports/revenue"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              매출 리포트 보기
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_GUIDES.map((item) => (
              <div
                key={item.title}
                className={adminSurface.fieldPanel}
              >
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed break-keep text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <OfflineAdminClient />
    </AdminPageShell>
  );
}
