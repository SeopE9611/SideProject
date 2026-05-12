"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { BarChartBig, Calendar, FileDown, RefreshCw, Search, Store, WalletCards } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { adminSurface } from "@/components/admin/admin-typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { cn } from "@/lib/utils";
import type { RevenueReportGroupBy, RevenueReportResponse } from "@/types/admin/reports";

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysYmd(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthStartYmd(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function formatKRW(value: number | null | undefined): string {
  return `${Number(value ?? 0).toLocaleString("ko-KR")}원`;
}

const METHOD_LABELS = {
  cash: "현금",
  card: "매장 카드",
  bank_transfer: "계좌이체",
  etc: "기타",
} as const;

function SummaryCard({ title, value, sub, tone = "default" }: { title: string; value: string; sub?: string; tone?: "default" | "primary" | "warning" | "danger" }) {
  return (
    <Card className={cn(adminSurface.kpiCard, tone === "warning" && "border-warning/40 bg-warning/10", tone === "danger" && "border-destructive/40 bg-destructive/10")}>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value}</p>
        {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function RevenueReportClient() {
  const [filters, setFilters] = useState<{ from: string; to: string; groupBy: RevenueReportGroupBy }>({
    from: monthStartYmd(),
    to: todayYmd(),
    groupBy: "day",
  });
  const [applied, setApplied] = useState(filters);

  const reportQueryString = useMemo(() => {
    const params = new URLSearchParams({ from: applied.from, to: applied.to, groupBy: applied.groupBy });
    return params.toString();
  }, [applied]);

  const apiKey = useMemo(() => `/api/admin/reports/revenue?${reportQueryString}`, [reportQueryString]);
  const csvDownloadHref = useMemo(() => `/api/admin/reports/revenue/export?${reportQueryString}`, [reportQueryString]);

  const { data, error, isLoading, mutate } = useSWR<RevenueReportResponse>(apiKey, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
  });

  const applyPreset = (preset: "today" | "month" | "7d" | "30d") => {
    const next = (() => {
      if (preset === "today") return { from: todayYmd(), to: todayYmd() };
      if (preset === "month") return { from: monthStartYmd(), to: todayYmd() };
      if (preset === "7d") return { from: addDaysYmd(-6), to: todayYmd() };
      return { from: addDaysYmd(-29), to: todayYmd() };
    })();
    setFilters((prev) => ({ ...prev, ...next }));
  };

  const submit = () => setApplied(filters);
  const reset = () => {
    const next = { from: monthStartYmd(), to: todayYmd(), groupBy: "day" as const };
    setFilters(next);
    setApplied(next);
  };

  const report = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <AdminPageHeader
          title="온라인/오프라인 매출 리포트"
          description="온라인 정산 기준 매출과 오프라인 운영 매출을 분리해 비교합니다. 참고 합계는 정산 지급액 계산에 사용되지 않습니다."
          icon={BarChartBig}
          scope="범위: 온라인 정산 기준 매출 · 오프라인 운영 매출"
          helperText="오프라인 현금/계좌이체/매장 카드 매출은 별도 운영 정산 대상입니다."
          actions={(
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm"><Link href="/admin/settlements">정산 화면으로 이동</Link></Button>
              <Button asChild variant="outline" size="sm"><Link href="/admin/offline">오프라인 관리로 이동</Link></Button>
            </div>
          )}
        />

        <Card className={adminSurface.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4" /> 기간 필터</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("today")}>오늘</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("month")}>이번 달</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("7d")}>최근 7일</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("30d")}>최근 30일</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto_auto_auto] md:items-end">
              <div className="space-y-1.5"><Label htmlFor="report-from">시작일</Label><Input id="report-from" type="date" value={filters.from} onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label htmlFor="report-to">종료일</Label><Input id="report-to" type="date" value={filters.to} onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>추이 단위</Label><Select value={filters.groupBy} onValueChange={(value: RevenueReportGroupBy) => setFilters((prev) => ({ ...prev, groupBy: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="day">일별</SelectItem><SelectItem value="month">월별</SelectItem></SelectContent></Select></div>
              <Button type="button" onClick={submit}><Search className="mr-2 h-4 w-4" />검색</Button>
              <Button type="button" variant="outline" onClick={reset}><RefreshCw className="mr-2 h-4 w-4" />초기화</Button>
              <Button asChild type="button" variant="secondary">
                <a href={csvDownloadHref} download><FileDown className="mr-2 h-4 w-4" />CSV 다운로드</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-destructive/40 bg-destructive/10"><CardContent className="p-5"><p className="font-semibold text-destructive">매출 리포트를 불러오지 못했습니다.</p><p className="mt-1 text-sm text-muted-foreground">필터를 확인한 뒤 다시 시도해주세요.</p><Button className="mt-4" variant="outline" onClick={() => mutate()}>다시 불러오기</Button></CardContent></Card>
        ) : null}

        {isLoading ? <Card><CardContent className="p-6 text-sm text-muted-foreground">리포트 데이터를 불러오는 중입니다…</CardContent></Card> : null}

        {report ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard title="온라인 정산 기준 매출" value={formatKRW(report.online.paidAmount)} sub={`${report.online.count.toLocaleString("ko-KR")}건 · 기존 정산 정책`} tone="primary" />
              <SummaryCard title="오프라인 운영 매출" value={formatKRW(report.offline.paidAmount)} sub="별도 운영 매출" tone="primary" />
              <SummaryCard title="온라인 + 오프라인 참고 합계" value={formatKRW(report.combinedPreview.paidAmount)} sub="정산 지급액 계산에 사용되지 않습니다." tone="warning" />
              <SummaryCard title="오프라인 패키지 발급 보정 필요" value={`${Number(report.offline.issueFailedCount ?? 0).toLocaleString("ko-KR")}건`} sub="오프라인 패키지 발급 확인" />
              <SummaryCard title="온라인 환불" value={formatKRW(report.online.refundedAmount)} sub="기존 정산 환불 기준" tone="danger" />
              <SummaryCard title="오프라인 환불" value={formatKRW(report.offline.refundedAmount)} sub="오프라인 summary 기준" tone="danger" />
              <SummaryCard title="오프라인 미결제" value={formatKRW(report.offline.pendingAmount)} sub="참고 합계 결제완료 매출 제외" tone="warning" />
              <SummaryCard title="참고 순매출" value={formatKRW(report.combinedPreview.netAmount)} sub="온라인 net + 오프라인 net 단순 합계" />
            </div>

            <Card className={adminSurface.card}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div><h2 className="text-lg font-bold">온라인/오프라인 비교</h2><p className="mt-1 text-sm text-muted-foreground">온라인 매출과 오프라인 운영 매출은 분리 표시하며, 참고 합계는 정산 지급액처럼 사용하지 않습니다.</p></div>
                  <Badge variant="secondary">{report.range.from} ~ {report.range.to} · {report.range.groupBy === "day" ? "일별" : "월별"}</Badge>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border p-4"><h3 className="font-semibold">온라인 매출 세부</h3><dl className="mt-3 space-y-2 text-sm"><Row label="상품/일반 주문" value={formatKRW(report.online.bySource.orders)} /><Row label="독립 스트링 신청" value={formatKRW(report.online.bySource.stringingApplications)} /><Row label="온라인 패키지" value={formatKRW(report.online.bySource.packageOrders)} /><Row label="대여" value={formatKRW(report.online.bySource.rentals)} /></dl></div>
                  <div className="rounded-xl border border-border p-4"><h3 className="font-semibold">오프라인 매출 세부</h3><dl className="mt-3 space-y-2 text-sm"><Row label="오프라인 작업/매출 기록" value={formatKRW(report.offline.recordsPaidAmount)} /><Row label="오프라인 패키지 판매" value={formatKRW(report.offline.packageSalesPaidAmount)} /><Row label="미결제" value={formatKRW(report.offline.pendingAmount)} /><Row label="환불" value={formatKRW(report.offline.refundedAmount)} /></dl></div>
                </div>
              </CardContent>
            </Card>

            <Card className={adminSurface.card}>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><WalletCards className="h-4 w-4" /> 결제수단별 오프라인 매출</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(METHOD_LABELS).map(([key, label]) => <SummaryCard key={key} title={label} value={formatKRW(report.offline.byMethod[key as keyof typeof METHOD_LABELS])} sub="오프라인 결제완료 매출" />)}
              </CardContent>
            </Card>

            <Card className={adminSurface.card}>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Store className="h-4 w-4" /> 추이 표</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-4 font-medium">날짜</th><th className="py-2 pr-4 font-medium">온라인 매출</th><th className="py-2 pr-4 font-medium">오프라인 매출</th><th className="py-2 pr-4 font-medium">참고 합계</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {report.series.length === 0 ? <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">조회 기간의 매출 데이터가 없습니다.</td></tr> : report.series.map((point) => (
                      <tr key={point.date}><td className="py-2 pr-4 font-medium">{point.date}</td><td className="py-2 pr-4 tabular-nums">{formatKRW(point.onlinePaidAmount)}</td><td className="py-2 pr-4 tabular-nums">{formatKRW(point.offlinePaidAmount)}</td><td className="py-2 pr-4 tabular-nums">{formatKRW(point.combinedPaidAmount)}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-4 text-xs text-muted-foreground">{report.combinedPreview.note}</p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums text-foreground">{value}</dd></div>;
}
