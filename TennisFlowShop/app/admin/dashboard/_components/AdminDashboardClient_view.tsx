"use client";

/** Responsibility: 관리자 대시보드 화면 표현 + 상호작용 오케스트레이션 뷰. */

import { Activity, AlertTriangle, Bell, Boxes, CircleHelp, ClipboardList, Package, ShoppingCart, Star, TrendingUp, Users, Wrench } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useMemo } from "react";
import { Area, AreaChart, Bar, CartesianGrid, Cell, Pie, PieChart, BarChart as RechartsBarChart, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis } from "recharts";
import useSWR from "swr";

import AsyncState from "@/components/system/AsyncState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatAdminKRW, formatAdminNumber, formatIsoToKstShort } from "@/lib/admin/formatters";
import { labelOrderStatus, labelPaymentStatus, labelStringingStatus } from "@/lib/admin/status-labels";
import {
  getApplicationStatusBadgeSpec,
  getOrderStatusBadgeSpec,
  getPaymentStatusBadgeSpec,
  getWorkflowMetaBadgeSpec,
} from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { getOrderStatusLabelForDisplay } from "@/lib/order-shipping";
import { adminRichTooltipClass } from "@/lib/tooltip-style";
import type { DashboardMetrics } from "@/types/admin/dashboard";

// ----------------------------- 타입 -----------------------------

// ----------------------------- 차트 색상 (CSS 변수를 JS로 변환) -----------------------------
const CHART_COLORS = {
  primary: "hsl(152.3, 30.7%, 44%)",
  primaryLight: "hsl(152.3, 30.7%, 60%)",
  warning: "hsl(38, 92%, 46%)",
  warningLight: "hsl(38, 92%, 60%)",
  muted: "hsl(120, 6%, 55%)",
  mutedLight: "hsl(120, 6%, 70%)",
  destructive: "hsl(0, 72%, 51%)",
};

// ----------------------------- 커스텀 툴팁 컴포넌트 -----------------------------
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
    color: string;
    payload: Record<string, unknown>;
  }>;
  label?: string;
  formatter?: (value: number) => string;
}

function RevenueChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload as {
    date: string;
    orders: number;
    applications: number;
    packages: number;
    total: number;
  };

  return (
    <div className="rounded-lg border border-border/60 bg-popover px-4 py-3 shadow-xl">
      <p className="mb-2 text-sm font-semibold text-foreground">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.primary }} />
            <span className="text-sm text-muted-foreground">주문</span>
          </div>
          <span className="text-sm font-medium tabular-nums">{formatAdminKRW(data.orders)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.warning }} />
            <span className="text-sm text-muted-foreground">교체 서비스</span>
          </div>
          <span className="text-sm font-medium tabular-nums">{formatAdminKRW(data.applications)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.muted }} />
            <span className="text-sm text-muted-foreground">패키지</span>
          </div>
          <span className="text-sm font-medium tabular-nums">{formatAdminKRW(data.packages)}</span>
        </div>
        <div className="mt-2 border-t border-border/40 pt-2">
          <div className="flex items-center justify-between gap-6">
            <span className="text-sm font-semibold text-foreground">합계</span>
            <span className="text-sm font-bold tabular-nums text-primary">{formatAdminKRW(data.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const value = payload[0]?.value ?? 0;

  return (
    <div className="rounded-lg border border-border/60 bg-popover px-4 py-3 shadow-xl">
      <p className="mb-1.5 text-sm font-semibold text-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.primary }} />
        <span className="text-sm text-muted-foreground">리뷰</span>
        <span className="ml-auto text-sm font-bold tabular-nums text-primary">{formatAdminNumber(value)}건</span>
      </div>
    </div>
  );
}

// ----------------------------- 인터랙티브 스파크라인 (미니 영역 차트) -----------------------------

function InteractiveSparkLine({ data, height = 56 }: { data: Array<{ date: string; value: number }>; height?: number }) {
  const safeData = useMemo(() => {
    if (data.length >= 2) return data;
    if (data.length === 1) return [data[0], data[0]];
    return [
      { date: "", value: 0 },
      { date: "", value: 0 },
    ];
  }, [data]);

  return (
    <div className="w-[200px]" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={safeData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Area type="monotone" dataKey="value" stroke={CHART_COLORS.primary} strokeWidth={2} fill={CHART_COLORS.primary} fillOpacity={0.12} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const p = payload[0]?.payload as { date: string; value: number };
              return (
                <div className="rounded-md border border-border/60 bg-popover px-2.5 py-1.5 text-xs shadow-lg">
                  <span className="text-muted-foreground">{p.date}</span>
                  <span className="ml-2 font-semibold text-primary">{formatAdminKRW(p.value)}</span>
                </div>
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ----------------------------- 인터랙티브 막대 차트 (리뷰 추이) -----------------------------

function InteractiveBarChart({ data, height = 220 }: { data: Array<{ date: string; value: number }>; height?: number }) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        displayDate: d.date.slice(5), // "MM-DD" 형식으로 표시
      })),
    [data],
  );

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">집계 데이터가 없습니다</div>;
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={chartData} margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(120, 6%, 85%)" vertical={false} />
          <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: "hsl(120, 6%, 45%)" }} tickLine={false} axisLine={{ stroke: "hsl(120, 6%, 85%)" }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "hsl(120, 6%, 45%)" }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
          <RechartsTooltip content={<ReviewChartTooltip />} cursor={{ fill: "hsl(120, 6%, 95%)", radius: 4 }} />
          <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={40}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} className="transition-opacity duration-150 hover:opacity-80" />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ----------------------------- 인터랙티브 스택 바 차트 (매출 분석) -----------------------------

function InteractiveStackedBarChart({
  data,
  height = 280,
}: {
  data: Array<{
    date: string;
    orders: number;
    applications: number;
    packages: number;
    total: number;
  }>;
  height?: number;
}) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        displayDate: d.date.slice(5), // "MM-DD" 형식으로 표시
      })),
    [data],
  );
  if (chartData.length === 0) {
    return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">집계 데이터가 없습니다</div>;
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={chartData} margin={{ top: 12, right: 12, bottom: 24, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(120, 6%, 85%)" vertical={false} />
          <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: "hsl(120, 6%, 45%)" }} tickLine={false} axisLine={{ stroke: "hsl(120, 6%, 85%)" }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "hsl(120, 6%, 45%)" }} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => (v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : `${v / 1000}K`)} />
          <RechartsTooltip content={<RevenueChartTooltip />} cursor={{ fill: "hsl(120, 6%, 95%)", radius: 4 }} />
          <Bar dataKey="orders" stackId="revenue" fill={CHART_COLORS.primary} radius={[0, 0, 0, 0]} name="주문" />
          <Bar dataKey="applications" stackId="revenue" fill={CHART_COLORS.warning} radius={[0, 0, 0, 0]} name="교체 서비스" />
          <Bar dataKey="packages" stackId="revenue" fill={CHART_COLORS.muted} radius={[4, 4, 0, 0]} name="패키지" />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ----------------------------- 인터랙티브 도넛 차트 (상태 분포) -----------------------------

function InteractiveDonutChart({ data, labelFormatter }: { data: Array<{ label: string; count: number }>; labelFormatter: (label: string) => string }) {
  const DONUT_COLORS = [CHART_COLORS.primary, CHART_COLORS.warning, CHART_COLORS.muted, CHART_COLORS.primaryLight, CHART_COLORS.warningLight, CHART_COLORS.mutedLight, "hsl(200, 60%, 50%)", "hsl(280, 50%, 55%)"];

  const chartData = useMemo(
    () =>
      data
        .filter((d) => d.count > 0)
        .slice(0, 6)
        .map((d) => ({
          name: labelFormatter(d.label),
          value: d.count,
          originalLabel: d.label,
        })),
    [data, labelFormatter],
  );

  const total = useMemo(() => chartData.reduce((sum, d) => sum + d.value, 0), [chartData]);

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">데이터가 없습니다</div>;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-[160px] w-[160px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" strokeWidth={2} stroke="hsl(0, 0%, 100%)">
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} className="transition-opacity duration-150 hover:opacity-80" />
              ))}
            </Pie>
            <RechartsTooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const p = payload[0]?.payload as {
                  name: string;
                  value: number;
                };
                const percent = ((p.value / total) * 100).toFixed(1);
                return (
                  <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 text-sm shadow-xl">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-muted-foreground">
                      {formatAdminNumber(p.value)}건 ({percent}%)
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 text-sm">
        {chartData.slice(0, 5).map((d, idx) => (
          <div key={d.originalLabel} className="flex items-center justify-between rounded px-2 py-1 transition-colors hover:bg-muted/30">
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-sm"
                style={{
                  backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length],
                }}
              />
              <span className="truncate text-muted-foreground">{d.name}</span>
            </div>
            <span className="font-medium tabular-nums">{formatAdminNumber(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------- UI 컴포넌트 -----------------------------

function KpiCard({ title, value, sub, icon, trend, spark }: { title: string; value: string; sub?: string; icon: ReactNode; trend?: string; spark?: ReactNode }) {
  return (
    <Card className="group relative overflow-hidden border-border/40 bg-card/50 backdrop-blur transition-all hover:border-border/60 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="rounded-lg bg-primary/10 p-2 text-primary transition-colors group-hover:bg-primary/15 dark:bg-primary/20 dark:group-hover:bg-primary/25">{icon}</div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
        <div className="flex items-end justify-between gap-3">
          {trend && (
            <Badge variant="secondary" className="text-xs font-normal">
              {trend}
            </Badge>
          )}
          {spark && <div className="ml-auto hidden lg:block">{spark}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-10/12" />
      <Skeleton className="h-4 w-9/12" />
    </div>
  );
}

function getCancelRequestStatusLabel(status?: string): "취소요청" | "취소승인" | "취소거절" | null {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  if (normalized === "requested" || normalized === "request" || normalized === "cancel_requested" || normalized === "cancelrequest" || normalized === "취소요청") return "취소요청";
  if (normalized === "approved" || normalized === "cancel_approved" || normalized === "취소승인") return "취소승인";
  if (normalized === "rejected" || normalized === "cancel_rejected" || normalized === "취소거절") return "취소거절";
  return null;
}

function getCancelQueueQuickSignal(
  status?: string,
  refundAccountReady?: boolean,
): null | {
  label: "계좌확인 필요" | "검토 가능";
  tone: "warning" | "success";
  tooltip: string;
} {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();
  const isRequested = normalized === "requested" || normalized === "request" || normalized === "취소요청" || normalized === "cancel_requested" || normalized === "cancelrequest";

  if (!isRequested) return null;

  if (refundAccountReady === true) {
    return {
      label: "검토 가능",
      tone: "success",
      tooltip: "환불 계좌 준비가 완료되어 검토 가능합니다.",
    };
  }

  return {
    label: "계좌확인 필요",
    tone: "warning",
    tooltip: "환불 계좌 확인이 필요합니다.",
  };
}

// ----------------------------- 메인 -----------------------------

export default function AdminDashboardClient() {
  const { data, error, isLoading, mutate } = useSWR<DashboardMetrics>("/api/admin/dashboard/metrics", authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-8 pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight">관리자 대시보드</h1>
            <p className="text-sm text-muted-foreground">최근 운영 지표를 불러오는 중입니다.</p>
          </div>
          <Button variant="outline" disabled className="shrink-0">
            <Activity className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">핵심 지표</h2>
            <p className="text-sm text-muted-foreground">주요 비즈니스 메트릭</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="mt-2 h-4 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">즉시 처리 필요</h2>
            <p className="text-sm text-muted-foreground">긴급 대응이 필요한 항목</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-44 w-full" />
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  if (error || !data) {
    return (
      <AsyncState
        kind="error"
        tone="admin"
        variant="card"
        resourceName="대시보드 데이터"
        onAction={() => {
          void mutate();
        }}
      />
    );
  }

  const last14RevenueBySource = data.series.dailyRevenueBySource.slice(-14);
  const last14Revenue = last14RevenueBySource.map((d) => ({
    date: d.date,
    value: d.total,
  }));
  const last14Reviews = data.series.dailyReviews.slice(-14);
  const last14Orders = data.series.dailyOrders.slice(-14);
  const last14Apps = data.series.dailyApplications.slice(-14);

  // series.days(기본 30일) 범위 합산값입니다. (엄밀한 '이번 달'과는 다를 수 있음)
  const periodRevenue = data.series.dailyRevenue.reduce((sum, d) => sum + Number(d.value || 0), 0);
  const weekRevenue = data.kpi.orders.revenue7d + data.kpi.applications.revenue7d + data.kpi.packages.revenue7d;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">관리자 대시보드</h1>
          <p className="text-sm text-muted-foreground">
            최근 {data.series.days}일 데이터 · {data.series.fromYmd} ~ {data.series.toYmd}
          </p>
        </div>
        <Button variant="outline" onClick={() => mutate()} className="shrink-0">
          <Activity className="mr-2 h-4 w-4" />
          새로고침
        </Button>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">핵심 지표</h2>
          <p className="text-sm text-muted-foreground">주요 비즈니스 메트릭</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="총 매출"
            value={formatAdminKRW(periodRevenue)}
            sub={`최근 7일: ${formatAdminKRW(weekRevenue)}`}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={`평균 ${formatAdminKRW(data.kpi.orders.aov7d)}`}
            spark={<InteractiveSparkLine data={data.series.dailyRevenue.slice(-30)} />}
          />
          <KpiCard
            title="주문"
            value={`${formatAdminNumber(data.kpi.orders.delta7d)}건`}
            sub={`결제완료 ${formatAdminNumber(data.kpi.orders.paid7d)}건`}
            icon={<ShoppingCart className="h-5 w-5" />}
            spark={<InteractiveSparkLine data={data.series.dailyOrders.slice(-30)} />}
          />
          <KpiCard
            title="교체 서비스"
            value={`${formatAdminNumber(data.kpi.applications.delta7d)}건`}
            sub={`결제완료 ${formatAdminNumber(data.kpi.applications.paid7d)}건`}
            icon={<Wrench className="h-5 w-5" />}
            spark={<InteractiveSparkLine data={data.series.dailyApplications.slice(-30)} />}
          />
          <KpiCard
            title="신규 회원"
            value={`${formatAdminNumber(data.kpi.users.delta7d)}명`}
            sub={`활성 ${formatAdminNumber(data.kpi.users.active7d)}명`}
            icon={<Users className="h-5 w-5" />}
            spark={<InteractiveSparkLine data={data.series.dailySignups.slice(-30)} />}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">즉시 처리 필요</h2>
          <p className="text-sm text-muted-foreground">긴급 대응이 필요한 항목</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-destructive/40 bg-destructive/10 dark:border-destructive/40 dark:bg-destructive/15">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="rounded-full bg-destructive/10 p-1.5 dark:bg-destructive/15">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                긴급 처리
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-background/60 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">취소 요청</span>
                  <Badge variant={data.kpi.queue.cancelRequests > 0 ? "destructive" : "secondary"}>{formatAdminNumber(data.kpi.queue.cancelRequests)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  계좌 확인 필요 {formatAdminNumber(data.kpi.queue.cancelRequestsNeedingRefundAccount)}건 / 검토 가능 {formatAdminNumber(data.kpi.queue.cancelRequestsReadyForReview)}건
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                <span className="text-sm">결제 대기 24h+</span>
                <Badge variant={data.kpi.queue.paymentPending24h > 0 ? "destructive" : "secondary"}>{formatAdminNumber(data.kpi.queue.paymentPending24h)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                <span className="text-sm">대여 연체</span>
                <Badge variant={data.kpi.queue.rentalOverdue > 0 ? "destructive" : "secondary"}>{formatAdminNumber(data.kpi.queue.rentalOverdue)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                <span className="text-sm">교체 3일+</span>
                <Badge variant={data.kpi.queue.stringingAging3d > 0 ? "destructive" : "secondary"}>{formatAdminNumber(data.kpi.queue.stringingAging3d)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                <span className="text-sm">지난달 정산 스냅샷</span>
                <Badge variant={!data.settlements.hasPrevSnapshot ? "destructive" : "secondary"}>{!data.settlements.hasPrevSnapshot ? "미생성" : "OK"}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur transition-all hover:border-border/60 hover:shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="rounded-full bg-primary/10 p-1.5 dark:bg-primary/20">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                배송 관리
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm">송장 등록 대기</span>
                <Badge variant={data.kpi.queue.shippingPending > 0 ? "default" : "outline"}>{formatAdminNumber(data.kpi.queue.shippingPending)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm">반납 임박 48h</span>
                <Badge variant={data.kpi.queue.rentalDueSoon > 0 ? "default" : "outline"}>{formatAdminNumber(data.kpi.queue.rentalDueSoon)}</Badge>
              </div>
              <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                <Link href="/admin/orders?preset=shippingPending">관리하기</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur transition-all hover:border-border/60 hover:shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="rounded-full bg-primary/10 p-1.5 dark:bg-primary/20">
                  <Boxes className="h-4 w-4 text-primary" />
                </div>
                재고 현황
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm">재고 부족</span>
                <Badge variant={data.kpi.inventory.lowStockProducts > 0 ? "destructive" : "outline"}>{formatAdminNumber(data.kpi.inventory.lowStockProducts)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm">품절</span>
                <Badge variant={data.kpi.inventory.outOfStockProducts > 0 ? "destructive" : "outline"}>{formatAdminNumber(data.kpi.inventory.outOfStockProducts)}</Badge>
              </div>
              <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                <Link href="/admin/products?status=low_stock">재고 관리</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur transition-all hover:border-border/60 hover:shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="rounded-full bg-primary/10 p-1.5 dark:bg-primary/20">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                시스템 알림
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm">알림 큐</span>
                <Badge variant={data.kpi.queue.outboxQueued > 0 ? "default" : "outline"}>{formatAdminNumber(data.kpi.queue.outboxQueued)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm">알림 실패</span>
                <Badge variant={data.kpi.queue.outboxFailed > 0 ? "destructive" : "outline"}>{formatAdminNumber(data.kpi.queue.outboxFailed)}</Badge>
              </div>
              <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                <Link href="/admin/notifications">알림 관리</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">매출 분석</h2>
          <p className="text-sm text-muted-foreground">수익 트렌드 및 인기 상품</p>
        </div>

        <Card className="border-border/40 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">최근 14일 매출 추이</CardTitle>
            <CardDescription>주문, 교체 서비스, 패키지 결제완료 금액</CardDescription>
          </CardHeader>
          <CardContent>
            <InteractiveStackedBarChart data={last14RevenueBySource} />
            <div className="mt-6 flex flex-wrap items-center gap-6 rounded-lg bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs font-medium text-primary">주문</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-warning" />
                <span className="text-xs font-medium text-warning">교체 서비스</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-muted-foreground/60" />
                <span className="text-xs font-medium text-muted-foreground">패키지</span>
              </div>
              <div className="ml-auto text-sm font-semibold">총 {formatAdminKRW(last14Revenue.reduce((s, d) => s + Number(d.value || 0), 0))}</div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">인기 상품 Top 5</CardTitle>
              <CardDescription>최근 7일 결제완료 기준</CardDescription>
            </CardHeader>
            <CardContent>
              {data.top.products7d.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">집계 데이터가 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.top.products7d.map((p, idx) => (
                    <div key={p.productId} className="group flex items-center gap-4 rounded-lg bg-muted/30 p-3 transition-all hover:bg-muted/50">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary dark:bg-primary/20">{idx + 1}</div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/products/${p.productId}/edit`} className="block truncate text-sm font-semibold group-hover:underline">
                          {p.name || "(이름 없음)"}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{p.brand || "-"}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {formatAdminNumber(p.qty)}개
                        </Badge>
                        <span className="text-xs font-semibold">{formatAdminKRW(p.revenue)}</span>
                      </div>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" asChild className="mt-4 w-full bg-transparent">
                    <Link href="/admin/orders">전체 주문 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">인기 브랜드 Top 5</CardTitle>
              <CardDescription>최근 7일 결제완료 기준</CardDescription>
            </CardHeader>
            <CardContent>
              {data.top.brands7d.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">집계 데이터가 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.top.brands7d.map((b, idx) => {
                    const hasBrand = Boolean(b.brand && b.brand !== "-");
                    const brandHref = hasBrand ? `/admin/products?brand=${encodeURIComponent(b.brand)}` : undefined;
                    return (
                      <div key={`${b.brand}-${b.qty}-${b.revenue}`} className="group flex items-center gap-4 rounded-lg bg-muted/30 p-3 transition-all hover:bg-muted/50">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary dark:bg-primary/20">{idx + 1}</div>
                        <div className="min-w-0 flex-1">
                          {brandHref ? (
                            <Link href={brandHref} className="block truncate text-sm font-semibold group-hover:underline">
                              {b.brand}
                            </Link>
                          ) : (
                            <div className="truncate text-sm font-semibold">{b.brand || "-"}</div>
                          )}
                          <p className="text-xs text-muted-foreground">판매량 및 매출</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {formatAdminNumber(b.qty)}개
                          </Badge>
                          <span className="text-xs font-semibold">{formatAdminKRW(b.revenue)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <Button size="sm" variant="outline" asChild className="mt-4 w-full bg-transparent">
                    <Link href="/admin/products">상품 관리</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">상세 처리 대기 목록</h2>
          <p className="text-sm text-muted-foreground">즉시 확인이 필요한 항목 상세</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">취소 요청</CardTitle>
              <CardDescription>주문/교체 서비스/대여 취소 요청</CardDescription>
            </CardHeader>
            <CardContent>
              {data.queueDetails.cancelRequests.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">취소 요청이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.queueDetails.cancelRequests.slice(0, 5).map((it) => {
                    const statusLabel = getCancelRequestStatusLabel(it.status);
                    const quickSignal = getCancelQueueQuickSignal(it.status, it.refundAccountReady);
                    const quickSignalTone =
                      quickSignal?.tone === "success"
                        ? getWorkflowMetaBadgeSpec("application_linked").variant
                        : getWorkflowMetaBadgeSpec("action_required").variant;

                    return (
                      <div key={`${it.kind}-${it.id}`} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                        <div className="min-w-0 flex-1 space-y-1">
                          <Link href={it.href} className="block truncate text-sm font-medium group-hover:underline">
                            {it.name}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {it.kind}
                            </Badge>
                            {statusLabel && (
                              <Badge
                                variant={
                                  statusLabel === "취소요청"
                                    ? getWorkflowMetaBadgeSpec(
                                        "cancel_requested",
                                      ).variant
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {statusLabel}
                              </Badge>
                            )}
                            {quickSignal && (
                              <TooltipProvider delayDuration={50}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant={quickSignalTone} className="inline-flex cursor-help items-center gap-1 text-xs">
                                      {quickSignal.label}
                                      <CircleHelp className="h-3 w-3" />
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" align="start" sideOffset={6} className={adminRichTooltipClass}>
                                    <p className="font-semibold">취소 요청이 접수된 항목입니다.</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{quickSignal.tooltip}</p>
                                    {it.refundBankLabel ? <p className="mt-1 text-xs text-muted-foreground">환불 은행: {it.refundBankLabel}</p> : null}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <span className="text-xs text-muted-foreground">{formatIsoToKstShort(it.createdAt)}</span>
                          </div>
                        </div>
                        <Badge variant="destructive" className="shrink-0">
                          {formatAdminKRW(it.amount)}
                        </Badge>
                      </div>
                    );
                  })}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/orders?preset=cancelRequests">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">송장 등록 대기</CardTitle>
              <CardDescription>결제완료 후 운송장 번호 미등록</CardDescription>
            </CardHeader>
            <CardContent>
              {data.queueDetails.shippingPending.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">대기 건이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.queueDetails.shippingPending.slice(0, 5).map((it) => (
                    <div key={`${it.kind}-${it.id}`} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={it.href} className="block truncate text-sm font-medium group-hover:underline">
                          {it.name}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {it.kind}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatIsoToKstShort(it.createdAt)}</span>
                        </div>
                      </div>
                      <Badge className="shrink-0">{formatAdminKRW(it.amount)}</Badge>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/orders?preset=shippingPending">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">결제 대기 24시간+</CardTitle>
              <CardDescription>장기 미결제 건</CardDescription>
            </CardHeader>
            <CardContent>
              {data.queueDetails.paymentPending24h.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">장기 미결제 건이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.queueDetails.paymentPending24h.slice(0, 5).map((it) => (
                    <div key={`${it.kind}:${it.id}`} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={it.href} className="block truncate text-sm font-medium group-hover:underline">
                          {it.name || "(이름 없음)"}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {it.kind}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatIsoToKstShort(it.createdAt)}</span>
                        </div>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        {it.hoursAgo}h
                      </Badge>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/orders?preset=paymentPending24h">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">교체 서비스 장기 미처리</CardTitle>
              <CardDescription>3일 이상 지연된 신청</CardDescription>
            </CardHeader>
            <CardContent>
              {data.queueDetails.stringingAging.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">장기 미처리 신청이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.queueDetails.stringingAging.slice(0, 5).map((it) => (
                    <div key={it.id} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={it.href} className="block truncate text-sm font-medium group-hover:underline">
                          {it.name}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {labelStringingStatus(it.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{it.ageDays}일 경과</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {formatAdminKRW(it.totalPrice)}
                      </Badge>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/orders?preset=stringingAging3d">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">대여 연체</CardTitle>
              <CardDescription>반납 기한 초과</CardDescription>
            </CardHeader>
            <CardContent>
              {data.queueDetails.rentalOverdue.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">연체 건이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.queueDetails.rentalOverdue.slice(0, 5).map((r) => (
                    <div key={r.id} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={r.href} className="block truncate text-sm font-medium group-hover:underline">
                          {r.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">반납 기한: {formatIsoToKstShort(r.dueAt)}</p>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        {r.overdueDays}일
                      </Badge>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/rentals?status=out&due=overdue">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">반납 임박</CardTitle>
              <CardDescription>48시간 이내 반납 예정</CardDescription>
            </CardHeader>
            <CardContent>
              {data.queueDetails.rentalDueSoon.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">임박 건이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.queueDetails.rentalDueSoon.slice(0, 5).map((r) => {
                    const badgeLabel = r.dueInHours >= 24 ? `${Math.ceil(r.dueInHours / 24)}일` : `${r.dueInHours}시간`;
                    return (
                      <div key={r.id} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                        <div className="min-w-0 flex-1 space-y-1">
                          <Link href={r.href} className="block truncate text-sm font-medium group-hover:underline">
                            {r.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">반납 기한: {formatIsoToKstShort(r.dueAt)}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {badgeLabel}
                        </Badge>
                      </div>
                    );
                  })}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/rentals?status=out&due=soon">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">추가 지표</h2>
          <p className="text-sm text-muted-foreground">리뷰, 포인트, 커뮤니티 활동</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">리뷰 현황</CardTitle>
                <div className="rounded-lg bg-muted p-2 dark:bg-muted">
                  <Star className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">평균 평점</span>
                <Badge variant="secondary" className="text-base font-bold">
                  {(Math.round((data.kpi.reviews.avg || 0) * 10) / 10).toFixed(1)}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">리뷰 7일</span>
                <Badge variant="outline">{formatAdminNumber(data.kpi.reviews.delta7d)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">5점 리뷰</span>
                <Badge variant="outline">{formatAdminNumber(data.kpi.reviews.five)}</Badge>
              </div>
              <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                <Link href="/admin/reviews">리뷰 관리</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">포인트 7일</CardTitle>
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary dark:bg-primary/20">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">지급</span>
                <Badge variant="secondary">{formatAdminNumber(data.kpi.points.issued7d)}P</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">사용</span>
                <Badge variant="outline">{formatAdminNumber(data.kpi.points.spent7d)}P</Badge>
              </div>
              <Button size="sm" variant="outline" asChild className="mt-4 w-full bg-transparent">
                <Link href="/admin/users">회원 관리</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">커뮤니티</CardTitle>
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary dark:bg-primary/20">
                  <ClipboardList className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">게시글 7일</span>
                <Badge variant="outline">{formatAdminNumber(data.kpi.community.posts7d)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">댓글 7일</span>
                <Badge variant="outline">{formatAdminNumber(data.kpi.community.comments7d)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">미처리 신고</span>
                <Badge variant={data.kpi.community.pendingReports > 0 ? "destructive" : "secondary"}>{formatAdminNumber(data.kpi.community.pendingReports)}</Badge>
              </div>
              <Button size="sm" variant="outline" asChild className="w-full bg-transparent">
                <Link href="/admin/boards?tab=reports">신고 관리</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">재고 관리</h2>
          <p className="text-sm text-muted-foreground">재고 부족 및 품절 상품</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">저재고 상품</CardTitle>
              <CardDescription>재고가 기준치 이하인 상품</CardDescription>
            </CardHeader>
            <CardContent>
              {data.inventoryList.lowStock.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">저재고 상품이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.inventoryList.lowStock.map((p) => (
                    <div key={p.id} className="group flex items-center gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/products/${p.id}/edit`} className="block truncate text-sm font-medium group-hover:underline">
                          {p.name || "(이름 없음)"}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{p.brand || "-"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge variant="destructive">{formatAdminNumber(p.stock)}개</Badge>
                        <p className="mt-1 text-xs text-muted-foreground">기준: {p.lowStock === null ? "-" : formatAdminNumber(p.lowStock)}</p>
                      </div>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/products?status=low_stock">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">품절 상품</CardTitle>
              <CardDescription>재고가 0 이하인 상품</CardDescription>
            </CardHeader>
            <CardContent>
              {data.inventoryList.outOfStock.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">품절 상품이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.inventoryList.outOfStock.map((p) => (
                    <div key={p.id} className="group flex items-center gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/products/${p.id}/edit`} className="block truncate text-sm font-medium group-hover:underline">
                          {p.name || "(이름 없음)"}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{p.brand || "-"}</p>
                      </div>
                      <Badge variant="destructive">{formatAdminNumber(p.stock)}개</Badge>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/products?status=out_of_stock">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">최근 활동</h2>
          <p className="text-sm text-muted-foreground">최신 주문 및 교체 서비스 내역</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">최근 주문</CardTitle>
              <CardDescription>최신 5건</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recent.orders.map((o) => (
                  (() => {
                    const rawStatusLabel = labelOrderStatus(o.status);
                    const displayStatusLabel = getOrderStatusLabelForDisplay(
                      rawStatusLabel,
                      { shippingMethod: o.shippingMethod },
                    );
                    const paymentSpec = getPaymentStatusBadgeSpec(
                      labelPaymentStatus(o.paymentStatus),
                    );
                    const statusSpec = getOrderStatusBadgeSpec(rawStatusLabel);
                    return (
                      <Link key={o.id} href={`/admin/orders/${o.id}`} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="truncate text-sm font-medium">{o.name}</p>
                          <p className="text-xs text-muted-foreground">{formatIsoToKstShort(o.createdAt)}</p>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={paymentSpec.variant} className="text-xs">
                              {labelPaymentStatus(o.paymentStatus)}
                            </Badge>
                            <Badge variant={statusSpec.variant} className="text-xs">
                              {displayStatusLabel}
                            </Badge>
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-semibold">{formatAdminKRW(o.totalPrice)}</div>
                      </Link>
                    );
                  })()
                ))}
                <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                  <Link href="/admin/orders">전체 주문 보기</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">최근 교체 서비스</CardTitle>
              <CardDescription>최신 5건</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recent.applications.map((a) => (
                  (() => {
                    const paymentSpec = getPaymentStatusBadgeSpec(
                      labelPaymentStatus(a.paymentStatus),
                    );
                    const statusSpec = getApplicationStatusBadgeSpec(
                      labelStringingStatus(a.status),
                    );
                    return (
                      <Link key={a.id} href={`/admin/applications/stringing/${a.id}`} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="truncate text-sm font-medium">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{formatIsoToKstShort(a.createdAt)}</p>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={paymentSpec.variant} className="text-xs">
                              {labelPaymentStatus(a.paymentStatus)}
                            </Badge>
                            <Badge variant={statusSpec.variant} className="text-xs">
                              {labelStringingStatus(a.status)}
                            </Badge>
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-semibold">{formatAdminKRW(a.totalPrice)}</div>
                      </Link>
                    );
                  })()
                ))}
                <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                  <Link href="/admin/applications/stringing">전체 신청 보기</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">리뷰 추이</h2>
          <p className="text-sm text-muted-foreground">최근 14일 리뷰 작성 현황</p>
        </div>
        <Card className="border-border/40 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">최근 14일 리뷰 작성 추이</CardTitle>
            <CardDescription>삭제 제외 기준</CardDescription>
          </CardHeader>
          <CardContent>
            <InteractiveBarChart data={last14Reviews} />
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-muted/30 px-4 py-3 text-sm">
              <span className="font-medium">
                최근 14일: <span className="text-primary">{formatAdminNumber(last14Reviews.reduce((s, d) => s + Number(d.value || 0), 0))}건</span>
              </span>
              <span className="font-medium">
                전체 평균: <span className="text-primary">{(Math.round((data.kpi.reviews.avg || 0) * 10) / 10).toFixed(1)}점</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">상태 분포</h2>
          <p className="text-sm text-muted-foreground">주문, 결제, 교체 서비스 상태별 분포</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">주문 상태</CardTitle>
              <CardDescription>최근 {data.series.days}일 기준</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.dist.orderStatus.slice(0, 8).map((d) => (
                  <div key={d.label} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <span className="truncate">{d.label}</span>
                    <Badge variant="outline">{formatAdminNumber(d.count)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">결제 상태</CardTitle>
              <CardDescription>최근 {data.series.days}일 기준</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.dist.orderPaymentStatus.slice(0, 8).map((d) => (
                  <div key={d.label} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <span className="truncate">{labelPaymentStatus(d.label)}</span>
                    <Badge variant="outline">{formatAdminNumber(d.count)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">교체 서비스 상태</CardTitle>
              <CardDescription>최근 {data.series.days}일 기준</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.dist.applicationStatus.slice(0, 8).map((d) => (
                  <div key={d.label} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <span className="truncate">{labelStringingStatus(d.label)}</span>
                    <Badge variant="outline">{formatAdminNumber(d.count)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
