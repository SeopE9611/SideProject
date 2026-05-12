"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { BarChartBig, Calendar, DatabaseZap, Eye, FileDown, Loader2, RefreshCw, Save, Search, Store, WalletCards } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { adminSurface } from "@/components/admin/admin-typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { getKstMonthRange, getKstRecentDaysRange, getKstTodayRange } from "@/lib/date/kst";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { RevenueReportGroupBy, RevenueReportResponse, RevenueReportSnapshot, RevenueReportSnapshotResponse, RevenueReportSnapshotStatus } from "@/types/admin/reports";

function defaultReportRange() {
  return { ...getKstMonthRange(), groupBy: "day" as const };
}

function formatKRW(value: number | null | undefined): string {
  return `${Number(value ?? 0).toLocaleString("ko-KR")}원`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(date);
}

function monthLastDay(yyyymm: string): string | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yyyymm)) return null;
  const [year, month] = yyyymm.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${yyyymm}-${String(last).padStart(2, "0")}`;
}

function getMonthlySnapshotTarget(from: string, to: string): { yyyymm: string; from: string; to: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
  const yyyymm = from.slice(0, 7);
  if (from !== `${yyyymm}-01`) return null;
  const expectedTo = monthLastDay(yyyymm);
  if (!expectedTo || to !== expectedTo) return null;
  return { yyyymm, from, to };
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

function SnapshotSummaryCard({ snapshot }: { snapshot: RevenueReportSnapshot }) {
  return (
    <Card className="border-dashed border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Eye className="h-4 w-4" /> 저장된 스냅샷 요약</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard title="온라인 정산 기준 매출" value={formatKRW(snapshot.report.online.paidAmount)} sub="저장 당시 값" />
          <SummaryCard title="오프라인 운영 매출" value={formatKRW(snapshot.report.offline.paidAmount)} sub="저장 당시 값" />
          <SummaryCard title="참고 합계" value={formatKRW(snapshot.report.combinedPreview.paidAmount)} sub="정산 지급액 계산 미사용" tone="warning" />
          <SummaryCard title="온라인 환불" value={formatKRW(snapshot.report.online.refundedAmount)} sub="저장 당시 값" tone="danger" />
          <SummaryCard title="오프라인 환불" value={formatKRW(snapshot.report.offline.refundedAmount)} sub="저장 당시 값" tone="danger" />
          <SummaryCard title="오프라인 미결제" value={formatKRW(snapshot.report.offline.pendingAmount)} sub="저장 당시 값" tone="warning" />
        </div>
        <dl className="grid gap-2 rounded-xl border border-border bg-background/60 p-4 text-sm md:grid-cols-2">
          <Row label="상태" value={snapshot.status === "finalized" ? "finalized · 마감 스냅샷" : "draft · 임시 저장"} />
          <Row label="저장 범위" value={`${snapshot.range.from} ~ ${snapshot.range.to} · ${snapshot.range.groupBy === "day" ? "일별" : "월별"}`} />
          <Row label="최초 생성" value={formatDateTime(snapshot.createdAt)} />
          <Row label="마지막 저장" value={formatDateTime(snapshot.updatedAt)} />
          <div className="md:col-span-2"><Row label="메모" value={snapshot.memo?.trim() || "-"} /></div>
        </dl>
      </CardContent>
    </Card>
  );
}

export default function RevenueReportClient() {
  const [filters, setFilters] = useState<{ from: string; to: string; groupBy: RevenueReportGroupBy }>(() => defaultReportRange());
  const [applied, setApplied] = useState(filters);
  const [snapshotStatus, setSnapshotStatus] = useState<RevenueReportSnapshotStatus>("draft");
  const [snapshotMemo, setSnapshotMemo] = useState("");
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(true);

  const reportQueryString = useMemo(() => {
    const params = new URLSearchParams({ from: applied.from, to: applied.to, groupBy: applied.groupBy });
    return params.toString();
  }, [applied]);

  const monthlySnapshotTarget = useMemo(() => getMonthlySnapshotTarget(applied.from, applied.to), [applied.from, applied.to]);
  const apiKey = useMemo(() => `/api/admin/reports/revenue?${reportQueryString}`, [reportQueryString]);
  const csvDownloadHref = useMemo(() => `/api/admin/reports/revenue/export?${reportQueryString}`, [reportQueryString]);
  const activeSnapshotMonth = monthlySnapshotTarget?.yyyymm ?? null;
  const snapshotCsvDownloadHref = activeSnapshotMonth ? `/api/admin/reports/revenue/snapshots/export?yyyymm=${encodeURIComponent(activeSnapshotMonth)}` : null;
  const snapshotKey = activeSnapshotMonth ? `/api/admin/reports/revenue/snapshots?yyyymm=${activeSnapshotMonth}` : null;

  const { data, error, isLoading, mutate } = useSWR<RevenueReportResponse>(apiKey, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
  });
  const { data: snapshotData, isLoading: isSnapshotLoading, mutate: mutateSnapshot } = useSWR<RevenueReportSnapshotResponse>(snapshotKey, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
  });

  const applyPreset = (preset: "today" | "month" | "7d" | "30d") => {
    const next = (() => {
      if (preset === "today") return getKstTodayRange();
      if (preset === "month") return getKstMonthRange();
      if (preset === "7d") return getKstRecentDaysRange(7);
      return getKstRecentDaysRange(30);
    })();
    setFilters((prev) => ({ ...prev, ...next }));
  };

  const submit = () => setApplied(filters);
  const reset = () => {
    const next = defaultReportRange();
    setFilters(next);
    setApplied(next);
  };

  const saveSnapshot = async () => {
    if (!monthlySnapshotTarget) return;
    const existing = snapshotData?.item;
    const confirmMessage = existing
      ? `${monthlySnapshotTarget.yyyymm} 월별 스냅샷이 이미 저장되어 있습니다.\n새로 저장하면 저장 당시의 실시간 리포트 값과 현재 선택한 상태/메모로 덮어써집니다. 계속할까요?`
      : `${monthlySnapshotTarget.yyyymm} 월별 매출 리포트를 day 기준 스냅샷으로 저장할까요?`;
    if (!window.confirm(confirmMessage)) return;

    setSavingSnapshot(true);
    try {
      const result = await adminMutator<RevenueReportSnapshotResponse>("/api/admin/reports/revenue/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yyyymm: monthlySnapshotTarget.yyyymm, status: snapshotStatus, memo: snapshotMemo }),
      });
      showSuccessToast("월별 매출 리포트 스냅샷을 저장했습니다.");
      setShowSnapshot(true);
      await mutateSnapshot(result, { revalidate: true });
    } catch (saveError) {
      showErrorToast(saveError instanceof Error ? saveError.message : "스냅샷 저장에 실패했습니다.");
    } finally {
      setSavingSnapshot(false);
    }
  };

  const report = data;
  const snapshot = snapshotData?.item ?? null;

  useEffect(() => {
    if (!activeSnapshotMonth) {
      setSnapshotStatus("draft");
      setSnapshotMemo("");
      return;
    }

    if (!snapshot) {
      setSnapshotStatus("draft");
      setSnapshotMemo("");
      return;
    }

    setSnapshotStatus(snapshot.status ?? "draft");
    setSnapshotMemo(snapshot.memo ?? "");
  }, [activeSnapshotMonth, snapshot?.id, snapshot?.updatedAt, snapshot?.status, snapshot?.memo]);

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
            <p className="text-xs text-muted-foreground">CSV 다운로드는 현재 조회 중인 실시간 리포트 기준입니다. 스냅샷 CSV는 아래 월별 리포트 스냅샷 카드에서 별도로 다운로드합니다.</p>
          </CardContent>
        </Card>

        <Card className={cn(adminSurface.card, "border-primary/20")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><DatabaseZap className="h-4 w-4" /> 월별 리포트 스냅샷</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              {monthlySnapshotTarget ? (
                <p><strong className="text-foreground">{monthlySnapshotTarget.yyyymm} 월별 스냅샷 저장 가능</strong> · 저장 시 서버에서 {monthlySnapshotTarget.from} ~ {monthlySnapshotTarget.to} 범위를 day 기준으로 다시 집계합니다.</p>
              ) : (
                <p><strong className="text-foreground">월별 스냅샷은 월 단위 조회에서 저장할 수 있습니다.</strong> 시작일은 해당 월 1일, 종료일은 해당 월 말일로 선택해주세요.</p>
              )}
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>스냅샷은 저장 시점의 매출 리포트이며, 이후 주문/환불/오프라인 기록 수정에 따라 실시간 리포트와 차이가 날 수 있습니다.</li>
                <li>스냅샷은 정산 지급액 계산에 사용되지 않습니다.</li>
                <li>이미 저장된 월별 스냅샷을 새로 저장하면 저장 당시의 리포트 값으로 덮어써집니다.</li>
              </ul>
            </div>

            {monthlySnapshotTarget ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
                <div className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">저장 상태</p>
                      <p className="mt-1 text-sm text-muted-foreground">{isSnapshotLoading ? "저장된 스냅샷을 확인하는 중입니다…" : snapshot ? "저장된 스냅샷이 있습니다. 저장된 스냅샷의 상태와 메모가 아래 입력값에 반영되었습니다." : "저장된 스냅샷이 없습니다. 현재 월 리포트를 새로 저장할 수 있습니다."}</p>
                    </div>
                    {snapshot ? <Badge variant={snapshot.status === "finalized" ? "default" : "secondary"}>{snapshot.status}</Badge> : <Badge variant="outline">not saved</Badge>}
                  </div>
                  {snapshot ? (
                    <>
                      <dl className="mt-4 space-y-2 text-sm">
                        <Row label="마지막 저장일" value={formatDateTime(snapshot.updatedAt)} />
                        <Row label="메모" value={snapshot.memo?.trim() || "-"} />
                      </dl>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowSnapshot((prev) => !prev)}>
                          <Eye className="mr-2 h-4 w-4" />{showSnapshot ? "스냅샷 접기" : "저장된 스냅샷 보기"}
                        </Button>
                        {snapshotCsvDownloadHref ? (
                          <Button asChild type="button" variant="secondary">
                            <a href={snapshotCsvDownloadHref} download><FileDown className="mr-2 h-4 w-4" />스냅샷 CSV 다운로드</a>
                          </Button>
                        ) : null}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">스냅샷 CSV는 저장 당시 리포트 기준입니다. 현재 조회 중인 실시간 CSV와 파일명 및 기준값이 다릅니다.</p>
                    </>
                  ) : null}
                  {!snapshot ? (
                    <Button type="button" variant="outline" className="mt-4" onClick={() => setShowSnapshot((prev) => !prev)} disabled>
                      <Eye className="mr-2 h-4 w-4" />저장된 스냅샷 보기
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-xl border border-border p-4">
                  <div className="space-y-1.5">
                    <Label>저장 상태</Label>
                    <Select value={snapshotStatus} onValueChange={(value: RevenueReportSnapshotStatus) => setSnapshotStatus(value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="draft">draft · 임시 저장</SelectItem><SelectItem value="finalized">finalized · 마감 스냅샷</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="snapshot-memo">메모</Label>
                    <Textarea id="snapshot-memo" value={snapshotMemo} onChange={(e) => setSnapshotMemo(e.target.value)} placeholder="운영 메모를 입력하세요. 고객명/전화번호 등 개인정보는 입력하지 마세요." rows={3} />
                  </div>
                  <p className="text-xs text-muted-foreground">{snapshot ? "이미 저장된 스냅샷이 있습니다. 다시 저장하면 현재 선택한 상태와 메모로 덮어씁니다." : "저장된 스냅샷이 없습니다. 현재 선택한 상태와 메모로 새 스냅샷을 저장합니다."}</p>
                  <Button type="button" className="w-full" onClick={saveSnapshot} disabled={savingSnapshot || !report}>
                    {savingSnapshot ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}스냅샷 저장
                  </Button>
                </div>
              </div>
            ) : null}

            {snapshot && showSnapshot ? <SnapshotSummaryCard snapshot={snapshot} /> : null}
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-destructive/40 bg-destructive/10"><CardContent className="p-5"><p className="font-semibold text-destructive">매출 리포트를 불러오지 못했습니다.</p><p className="mt-1 text-sm text-muted-foreground">필터를 확인한 뒤 다시 시도해주세요.</p><Button className="mt-4" variant="outline" onClick={() => mutate()}>다시 불러오기</Button></CardContent></Card>
        ) : null}

        {isLoading ? <Card><CardContent className="p-6 text-sm text-muted-foreground">리포트 데이터를 불러오는 중입니다…</CardContent></Card> : null}

        {report ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard title="온라인 정산 기준 매출" value={formatKRW(report.online.paidAmount)} sub={`${report.online.count.toLocaleString("ko-KR")}건 · 현재 DB 기준 실시간 리포트`} tone="primary" />
              <SummaryCard title="오프라인 운영 매출" value={formatKRW(report.offline.paidAmount)} sub="현재 DB 기준 실시간 리포트" tone="primary" />
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
                  <div><h2 className="text-lg font-bold">실시간 온라인/오프라인 비교</h2><p className="mt-1 text-sm text-muted-foreground">현재 DB 기준 리포트입니다. 저장된 스냅샷과 다를 수 있으며, 참고 합계는 정산 지급액처럼 사용하지 않습니다.</p></div>
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
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Store className="h-4 w-4" /> 실시간 추이 표</CardTitle></CardHeader>
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
