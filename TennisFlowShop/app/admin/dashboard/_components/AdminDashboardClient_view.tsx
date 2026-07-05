"use client";

/** Responsibility: 관리자 대시보드 요약 화면 표현. 실제 처리는 각 운영 페이지로 위임합니다. */

import {
  Activity,
  AlertTriangle,
  Boxes,
  ClipboardList,
  Package,
  ShoppingCart,
  Star,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import AsyncState from "@/components/system/AsyncState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAdminKRW, formatAdminNumber } from "@/lib/admin/formatters";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { cn } from "@/lib/utils";
import type { DashboardMetrics } from "@/types/admin/dashboard";

const DASHBOARD_ENDPOINT = "/api/admin/dashboard/metrics?days=30";
const DASHBOARD_SWR_OPTIONS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60_000,
  shouldRetryOnError: false,
};

function SummaryCard({
  title,
  value,
  description,
  tone = "default",
}: {
  title: string;
  value: string;
  description: string;
  tone?: "default" | "warning" | "danger" | "success" | "info";
}) {
  const toneClass = {
    default: adminSurface.card,
    warning: "rounded-2xl border border-warning/35 bg-warning/5 shadow-sm",
    danger: "rounded-2xl border border-destructive/35 bg-destructive/5 shadow-sm",
    success: "rounded-2xl border border-success/35 bg-success/5 shadow-sm",
    info: "rounded-2xl border border-primary/25 bg-primary/5 shadow-sm",
  }[tone];

  return (
    <Card className={toneClass}>
      <CardContent className="p-4">
        <p className={adminTypography.panelMeta}>{title}</p>
        <p className={cn(adminTypography.kpiValueCompact, "mt-2")}>{value}</p>
        <p className={cn(adminTypography.caption, "mt-1 break-keep")}>{description}</p>
      </CardContent>
    </Card>
  );
}

function LinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        adminSurface.card,
        "block p-4 transition-colors hover:border-primary/40 hover:bg-muted/20",
      )}
    >
      <p className={adminTypography.panelTitle}>{title}</p>
      <p className={cn(adminTypography.caption, "mt-1 break-keep")}>{description}</p>
    </Link>
  );
}

export default function AdminDashboardClientView() {
  const { data, error, isLoading, mutate } = useSWR<DashboardMetrics>(
    DASHBOARD_ENDPOINT,
    authenticatedSWRFetcher,
    DASHBOARD_SWR_OPTIONS,
  );

  if (isLoading) {
    return (
      <AdminPageShell variant="wide" className="space-y-5">
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      </AdminPageShell>
    );
  }

  if (error || !data) {
    return (
      <AdminPageShell variant="wide">
        <AsyncState
          tone="admin"
          variant="card"
          kind="error"
          resourceName="대시보드 데이터"
          onAction={() => void mutate()}
        />
      </AdminPageShell>
    );
  }

  const urgentTotal =
    data.kpi.queue.cancelRequests + data.kpi.queue.paymentPending24h + data.kpi.queue.rentalOverdue;
  const todayQueueTotal =
    data.kpi.queue.shippingPending +
    data.kpi.queue.stringingAging3d +
    data.kpi.queue.rentalDueSoon +
    data.kpi.queue.packagePaymentCheck;
  const weekRevenue =
    data.kpi.orders.revenue7d +
    data.kpi.applications.revenue7d +
    data.kpi.rentals.revenue7d +
    data.kpi.packages.revenue7d;
  const issueTotal =
    data.kpi.inventory.lowStockProducts +
    data.kpi.inventory.outOfStockProducts +
    data.kpi.community.pendingReports +
    data.kpi.queue.offlineReconciliationOpen;

  return (
    <AdminPageShell variant="wide" className="space-y-6 pb-8">
      <AdminPageHeader
        title="관리자 대시보드"
        description="실제 처리를 시작하기 전, 오늘 확인해야 할 운영 상태만 간결하게 요약합니다."
        icon={Activity}
        scope="범위: 전체 운영 요약"
        helperText={`최근 ${data.series.days}일 기준 · ${data.series.fromYmd} ~ ${data.series.toYmd}`}
        actions={
          <Button variant="outline" onClick={() => void mutate()}>
            <Activity className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        }
      />

      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        aria-label="오늘 처리 필요 요약"
      >
        <SummaryCard
          title="긴급 확인"
          value={`${formatAdminNumber(urgentTotal)}건`}
          description="취소 요청, 24시간 초과 결제대기, 대여 연체"
          tone={urgentTotal > 0 ? "danger" : "default"}
        />
        <SummaryCard
          title="오늘 처리 큐"
          value={`${formatAdminNumber(todayQueueTotal)}건`}
          description="송장 등록, 교체서비스 지연, 반납 예정, 패키지 결제 확인"
          tone={todayQueueTotal > 0 ? "warning" : "default"}
        />
        <SummaryCard
          title="최근 7일 매출"
          value={formatAdminKRW(weekRevenue)}
          description="주문, 교체서비스, 대여, 패키지 합산"
          tone="info"
        />
        <SummaryCard
          title="이상 신호"
          value={`${formatAdminNumber(issueTotal)}건`}
          description="재고 부족, 품절, 신고, 오프라인 정산 확인"
          tone={issueTotal > 0 ? "warning" : "default"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="운영 큐 요약">
        <Card className={adminSurface.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> 운영 큐
            </CardTitle>
            <CardDescription>처리는 운영 업무에서 진행합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["취소 요청", data.kpi.queue.cancelRequests],
              ["송장 등록 대기", data.kpi.queue.shippingPending],
              ["대여 반납 임박", data.kpi.queue.rentalDueSoon],
              ["패키지 결제 확인", data.kpi.queue.packagePaymentCheck],
            ].map(([label, count]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 px-3 py-2"
              >
                <span>{label}</span>
                <Badge variant={Number(count) > 0 ? "default" : "outline"}>
                  {formatAdminNumber(Number(count))}
                </Badge>
              </div>
            ))}
            <Button asChild className="mt-2 w-full">
              <Link href="/admin/operations">운영 업무로 이동</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className={adminSurface.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> 매출/주문
            </CardTitle>
            <CardDescription>최근 7일 핵심 지표입니다.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <SummaryCard
              title="상품 주문"
              value={`${formatAdminNumber(data.kpi.orders.delta7d)}건`}
              description={formatAdminKRW(data.kpi.orders.revenue7d)}
            />
            <SummaryCard
              title="교체서비스"
              value={`${formatAdminNumber(data.kpi.applications.delta7d)}건`}
              description={formatAdminKRW(data.kpi.applications.revenue7d)}
            />
            <SummaryCard
              title="대여"
              value={`${formatAdminNumber(data.kpi.rentals.delta7d)}건`}
              description={formatAdminKRW(data.kpi.rentals.revenue7d)}
            />
            <SummaryCard
              title="패키지"
              value={`${formatAdminNumber(data.kpi.packages.delta7d)}건`}
              description={formatAdminKRW(data.kpi.packages.revenue7d)}
            />
          </CardContent>
        </Card>

        <Card className={adminSurface.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" /> 이상 신호
            </CardTitle>
            <CardDescription>세부 확인은 해당 관리 페이지에서 진행합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["재고 부족", data.kpi.inventory.lowStockProducts, "/admin/products"],
              ["품절 상품", data.kpi.inventory.outOfStockProducts, "/admin/products"],
              [
                "리뷰 평균",
                `${(Math.round((data.kpi.reviews.avg || 0) * 10) / 10).toFixed(1)}점`,
                "/admin/reviews",
              ],
              ["오프라인 정산 확인", data.kpi.queue.offlineReconciliationOpen, "/admin/offline"],
            ].map(([label, value, href]) => (
              <Link
                key={label}
                href={String(href)}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 px-3 py-2 hover:bg-muted/30"
              >
                <span>{label}</span>
                <Badge variant="outline">
                  {typeof value === "number" ? formatAdminNumber(value) : value}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3" aria-label="주요 관리 페이지 바로가기">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          <h2 className={adminTypography.sectionTitle}>주요 관리 페이지 바로가기</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <LinkCard
            href="/admin/operations"
            title="운영 업무"
            description="오늘 처리할 통합 큐를 우선순위대로 확인"
          />
          <LinkCard
            href="/admin/orders"
            title="주문 관리"
            description="결제 확인, 배송 정보, 취소 요청 처리"
          />
          <LinkCard
            href="/admin/rentals"
            title="라켓 대여"
            description="인도, 반납, 보증금 관련 업무 처리"
          />
          <LinkCard
            href="/admin/packages"
            title="패키지권"
            description="결제대기, 활성, 만료, 취소 상태 관리"
          />
        </div>
      </section>

      <details className={cn(adminSurface.cardMuted, "p-4")}>
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          보조 지표 보기
        </summary>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
          <p className="flex items-center gap-2">
            <Boxes className="h-4 w-4" /> 전체 회원 {formatAdminNumber(data.kpi.users.total)}명
          </p>
          <p className="flex items-center gap-2">
            <Star className="h-4 w-4" /> 최근 7일 리뷰 {formatAdminNumber(data.kpi.reviews.delta7d)}
            건
          </p>
          <p className="flex items-center gap-2">
            <Package className="h-4 w-4" /> 오프라인 미정산{" "}
            {formatAdminKRW(data.kpi.offline.pendingOfflineAmount)}
          </p>
        </div>
      </details>
    </AdminPageShell>
  );
}
