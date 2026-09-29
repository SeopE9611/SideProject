"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  BarChartBig,
  DatabaseZap,
  Eye,
  FileDown,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Store,
  WalletCards,
} from "lucide-react";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { adminDataTable } from "@/components/admin/AdminDataTable";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { AdminSemanticBadge as Badge } from "@/components/admin/AdminSemanticBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { getKstMonthRange, getKstRecentDaysRange, getKstTodayRange } from "@/lib/date/kst";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  RevenueReportGroupBy,
  RevenueReportResponse,
  RevenueReportSnapshot,
  RevenueReportSnapshotResponse,
  RevenueReportSnapshotStatus,
} from "@/types/admin/reports";

function defaultReportRange() {
  return { ...getKstMonthRange(), groupBy: "day" as const };
}

function formatKRW(value: number | null | undefined): string {
  return `${Number(value ?? 0).toLocaleString("ko-KR")}원`;
}

function formatCount(value: number | null | undefined): string {
  return `${Number(value ?? 0).toLocaleString("ko-KR")}건`;
}

function diffNumber(current?: number | null, snapshot?: number | null): number {
  return Number(current ?? 0) - Number(snapshot ?? 0);
}

type SnapshotDiffUnit = "currency" | "count";

type SnapshotDiffRow = {
  label: string;
  unit: SnapshotDiffUnit;
  snapshotValue: number;
  currentValue: number;
  diff: number;
};

function formatSnapshotDiffValue(value: number, unit: SnapshotDiffUnit): string {
  return unit === "currency" ? formatKRW(value) : formatCount(value);
}

function formatSnapshotDiff(value: number, unit: SnapshotDiffUnit): string {
  if (value === 0) return "변동 없음";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatSnapshotDiffValue(value, unit)}`;
}

function snapshotDiffClassName(value: number): string {
  if (value > 0) return "text-foreground";
  if (value < 0) return "text-destructive";
  return "text-muted-foreground";
}

function buildSnapshotDiffRows(
  current: RevenueReportResponse,
  snapshot: RevenueReportResponse,
): SnapshotDiffRow[] {
  const rows: Array<{
    label: string;
    unit: SnapshotDiffUnit;
    current?: number | null;
    snapshot?: number | null;
  }> = [
    {
      label: "온라인 정산 기준 매출",
      unit: "currency",
      current: current.online.paidAmount,
      snapshot: snapshot.online.paidAmount,
    },
    {
      label: "개인결제 환불",
      unit: "currency",
      current: current.online.refundedAmount,
      snapshot: snapshot.online.refundedAmount,
    },
    {
      label: "온라인 순매출",
      unit: "currency",
      current: current.online.netAmount,
      snapshot: snapshot.online.netAmount,
    },
    {
      label: "오프라인 운영 매출",
      unit: "currency",
      current: current.offline.paidAmount,
      snapshot: snapshot.offline.paidAmount,
    },
    {
      label: "오프라인 환불",
      unit: "currency",
      current: current.offline.refundedAmount,
      snapshot: snapshot.offline.refundedAmount,
    },
    {
      label: "오프라인 순매출",
      unit: "currency",
      current: current.offline.netAmount,
      snapshot: snapshot.offline.netAmount,
    },
    {
      label: "오프라인 미결제",
      unit: "currency",
      current: current.offline.pendingAmount,
      snapshot: snapshot.offline.pendingAmount,
    },
    {
      label: "온라인 + 오프라인 참고 합계",
      unit: "currency",
      current: current.combinedPreview.paidAmount,
      snapshot: snapshot.combinedPreview.paidAmount,
    },
    {
      label: "참고 합계 순매출",
      unit: "currency",
      current: current.combinedPreview.netAmount,
      snapshot: snapshot.combinedPreview.netAmount,
    },
    {
      label: "오프라인 작업/매출 기록",
      unit: "currency",
      current: current.offline.recordsPaidAmount,
      snapshot: snapshot.offline.recordsPaidAmount,
    },
    {
      label: "오프라인 패키지 판매",
      unit: "currency",
      current: current.offline.packageSalesPaidAmount,
      snapshot: snapshot.offline.packageSalesPaidAmount,
    },
    {
      label: "패키지 발급 보정 필요 건수",
      unit: "count",
      current: current.offline.issueFailedCount,
      snapshot: snapshot.offline.issueFailedCount,
    },
    {
      label: "패키지 발급 보정 필요 금액",
      unit: "currency",
      current: current.offline.issueFailedAmount,
      snapshot: snapshot.offline.issueFailedAmount,
    },
  ];

  return rows.map((row) => {
    const currentValue = Number(row.current ?? 0);
    const snapshotValue = Number(row.snapshot ?? 0);
    return {
      label: row.label,
      unit: row.unit,
      currentValue,
      snapshotValue,
      diff: diffNumber(currentValue, snapshotValue),
    };
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function monthLastDay(yyyymm: string): string | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yyyymm)) return null;
  const [year, month] = yyyymm.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${yyyymm}-${String(last).padStart(2, "0")}`;
}

function getMonthlySnapshotTarget(
  from: string,
  to: string,
): { yyyymm: string; from: string; to: string } | null {
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

function SummaryCard({
  title,
  value,
  sub,
  tone = "default",
}: {
  title: string;
  value: string;
  sub?: string;
  tone?: "default" | "primary" | "warning" | "danger";
}) {
  return (
    <Card
      className={cn(
        adminSurface.kpiCard,
        tone === "warning" && "border-warning/40 bg-warning/10",
        tone === "danger" && "border-destructive/40 bg-destructive/10",
      )}
    >
      <CardContent className="p-5">
        <p className={adminTypography.metaMuted}>{title}</p>
        <p className={cn("mt-2 whitespace-nowrap", adminTypography.kpiValue)}>
          {value}
        </p>
        {sub ? <p className={cn("mt-1", adminTypography.caption)}>{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

function SnapshotSummaryCard({ snapshot }: { snapshot: RevenueReportSnapshot }) {
  return (
    <Card className="border-dashed border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2", adminTypography.panelTitle)}>
          <Eye className="h-4 w-4" /> 저장된 스냅샷 요약
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-1 gap-x-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1 border-b border-border/60 py-3">
            <dt className={adminTypography.caption}>온라인 매출</dt>
            <dd className={adminTypography.money}>
              {formatKRW(snapshot.report.online.paidAmount)}
            </dd>
            <dd className={adminTypography.caption}>저장 당시 값</dd>
          </div>
          <div className="space-y-1 border-b border-border/60 py-3">
            <dt className={adminTypography.caption}>오프라인 매출</dt>
            <dd className={adminTypography.money}>
              {formatKRW(snapshot.report.offline.paidAmount)}
            </dd>
            <dd className={adminTypography.caption}>저장 당시 값</dd>
          </div>
          <div className="space-y-1 border-b border-border/60 py-3">
            <dt className={adminTypography.caption}>참고 합계</dt>
            <dd className={adminTypography.money}>
              {formatKRW(snapshot.report.combinedPreview.paidAmount)}
            </dd>
            <dd className={adminTypography.caption}>정산 지급액 계산 미사용</dd>
          </div>
          <div className="space-y-1 border-b border-border/60 py-3">
            <dt className={adminTypography.caption}>개인결제 환불</dt>
            <dd className={adminTypography.money}>
              {formatKRW(snapshot.report.online.refundedAmount)}
            </dd>
            <dd className={adminTypography.caption}>저장 당시 온라인 환불 기준</dd>
          </div>
          <div className="space-y-1 border-b border-border/60 py-3">
            <dt className={adminTypography.caption}>오프라인 환불</dt>
            <dd className={adminTypography.money}>
              {formatKRW(snapshot.report.offline.refundedAmount)}
            </dd>
            <dd className={adminTypography.caption}>저장 당시 값</dd>
          </div>
          <div className="space-y-1 border-b border-border/60 py-3">
            <dt className={adminTypography.caption}>오프라인 미결제</dt>
            <dd className={adminTypography.money}>
              {formatKRW(snapshot.report.offline.pendingAmount)}
            </dd>
            <dd className={adminTypography.caption}>저장 당시 값</dd>
          </div>
        </dl>
        <dl
          className={cn(
            "grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border border-border bg-background/60 p-4 md:grid-cols-2",
            adminTypography.body,
          )}
        >
          <Row
            label="상태"
            value={
              snapshot.status === "finalized" ? "마감" : "임시 저장"
            }
          />
          <Row
            label="저장 범위"
            value={`${snapshot.range.from} ~ ${snapshot.range.to} · ${snapshot.range.groupBy === "day" ? "일별" : "월별"}`}
          />
          <Row label="최초 생성" value={formatDateTime(snapshot.createdAt)} />
          <Row label="마지막 저장" value={formatDateTime(snapshot.updatedAt)} />
          <div className="md:col-span-2">
            <Row label="메모" value={snapshot.memo?.trim() || "-"} />
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function SnapshotDiffCard({
  report,
  snapshot,
}: {
  report: RevenueReportResponse;
  snapshot: RevenueReportSnapshot;
}) {
  const rows = buildSnapshotDiffRows(report, snapshot.report);
  const changedCount = rows.filter((row) => row.diff !== 0).length;
  const combinedNetDiff = diffNumber(
    report.combinedPreview.netAmount,
    snapshot.report.combinedPreview.netAmount,
  );

  return (
    <details className="rounded-xl border border-dashed border-border bg-background">
      <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className={cn("flex items-center gap-2", adminTypography.panelTitle)}>
          <DatabaseZap className="h-4 w-4" /> 실시간 리포트와 저장된 스냅샷 차이
        </span>
        <span
          className={cn(
            "flex flex-wrap justify-end gap-x-3 gap-y-1",
            adminTypography.metaMuted,
          )}
        >
          <span>
            {changedCount === 0
              ? "변동 없음"
              : `주요 항목 변동 ${changedCount.toLocaleString("ko-KR")}건`}
          </span>
          <span>참고 순매출 차이 {formatSnapshotDiff(combinedNetDiff, "currency")}</span>
        </span>
      </summary>
      <div className="border-t border-border px-5 py-4">
        <p className={cn("text-muted-foreground", adminTypography.body)}>
          아래 차이는 현재 실시간 리포트 값에서 저장된 스냅샷 값을 뺀 값입니다.
        </p>
        <p className={cn("mt-1", adminTypography.caption)}>
          이 비교는 운영 확인용이며 정산 지급액 계산에는 사용되지 않습니다. 스냅샷과 실시간
          리포트는 별도 기준입니다.
        </p>
        <div className={cn(adminSurface.tableCard, "mt-4 overflow-x-auto")}>
          <table className="w-full min-w-[720px]">
            <thead className={adminSurface.tableHeader}>
              <tr>
                <th className={adminDataTable.head}>항목</th>
                <th className={adminDataTable.headRight}>스냅샷 값</th>
                <th className={adminDataTable.headRight}>현재 값</th>
                <th className={adminDataTable.headRight}>차이</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className={adminDataTable.row}>
                  <td className={adminDataTable.cellLeft}>
                    <span className={adminDataTable.primaryText}>{row.label}</span>
                  </td>
                  <td className={cn(adminDataTable.numericCell, adminDataTable.secondaryText)}>
                    {formatSnapshotDiffValue(row.snapshotValue, row.unit)}
                  </td>
                  <td className={adminDataTable.numericCell}>
                    {formatSnapshotDiffValue(row.currentValue, row.unit)}
                  </td>
                  <td
                    className={cn(
                      adminDataTable.numericCell,
                      snapshotDiffClassName(row.diff),
                    )}
                  >
                    {formatSnapshotDiff(row.diff, row.unit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={cn("mt-4", adminTypography.caption)}>
          차이 공식: 현재 실시간 값 - 저장된 스냅샷 값. 일별 series 차이 비교는 이번 화면에서
          제공하지 않습니다.
        </p>
      </div>
    </details>
  );
}

export default function RevenueReportClient() {
  const [filters, setFilters] = useState<{
    from: string;
    to: string;
    groupBy: RevenueReportGroupBy;
  }>(() => defaultReportRange());
  const [applied, setApplied] = useState(filters);
  const [snapshotStatus, setSnapshotStatus] = useState<RevenueReportSnapshotStatus>("draft");
  const [snapshotMemo, setSnapshotMemo] = useState("");
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [autoGeneratingSnapshot, setAutoGeneratingSnapshot] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(true);

  const reportQueryString = useMemo(() => {
    const params = new URLSearchParams({
      from: applied.from,
      to: applied.to,
      groupBy: applied.groupBy,
    });
    return params.toString();
  }, [applied]);

  const monthlySnapshotTarget = useMemo(
    () => getMonthlySnapshotTarget(applied.from, applied.to),
    [applied.from, applied.to],
  );
  const apiKey = useMemo(
    () => `/api/admin/reports/revenue?${reportQueryString}`,
    [reportQueryString],
  );
  const csvDownloadHref = useMemo(
    () => `/api/admin/reports/revenue/export?${reportQueryString}`,
    [reportQueryString],
  );
  const activeSnapshotMonth = monthlySnapshotTarget?.yyyymm ?? null;
  const snapshotCsvDownloadHref = activeSnapshotMonth
    ? `/api/admin/reports/revenue/snapshots/export?yyyymm=${encodeURIComponent(activeSnapshotMonth)}`
    : null;
  const snapshotKey = activeSnapshotMonth
    ? `/api/admin/reports/revenue/snapshots?yyyymm=${activeSnapshotMonth}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<RevenueReportResponse>(
    apiKey,
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
    },
  );
  const {
    data: snapshotData,
    isLoading: isSnapshotLoading,
    mutate: mutateSnapshot,
  } = useSWR<RevenueReportSnapshotResponse>(snapshotKey, authenticatedSWRFetcher, {
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
      const result = await adminMutator<RevenueReportSnapshotResponse>(
        "/api/admin/reports/revenue/snapshots",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            yyyymm: monthlySnapshotTarget.yyyymm,
            status: snapshotStatus,
            memo: snapshotMemo,
          }),
        },
      );
      showSuccessToast("월별 매출 리포트 스냅샷을 저장했습니다.");
      setShowSnapshot(true);
      await mutateSnapshot(result, { revalidate: true });
    } catch (saveError) {
      showErrorToast(
        saveError instanceof Error ? saveError.message : "스냅샷 저장에 실패했습니다.",
      );
    } finally {
      setSavingSnapshot(false);
    }
  };

  const autoGeneratePreviousMonthSnapshot = async () => {
    if (
      !window.confirm(
        "KST 기준 이전 달 매출 리포트 스냅샷을 마감 상태로 생성/덮어쓰시겠습니까?",
      )
    )
      return;

    setAutoGeneratingSnapshot(true);
    try {
      const result = await adminMutator<RevenueReportSnapshotResponse>(
        "/api/admin/reports/revenue/snapshots/auto-generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: "previous-month",
            status: "finalized",
          }),
        },
      );
      const generatedMonth = result.item?.yyyymm ?? "이전 달";
      showSuccessToast(`${generatedMonth} 마감 스냅샷을 생성했습니다.`);
      if (activeSnapshotMonth && result.item?.yyyymm === activeSnapshotMonth) {
        setShowSnapshot(true);
        await mutateSnapshot(result, { revalidate: true });
      }
    } catch (generateError) {
      showErrorToast(
        generateError instanceof Error
          ? generateError.message
          : "이전 달 스냅샷 생성에 실패했습니다.",
      );
    } finally {
      setAutoGeneratingSnapshot(false);
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
    <AdminPageShell variant="wide" className="space-y-6">
      <AdminPageHeader
        variant="compact"
        className="flex-wrap"
        title="온라인/오프라인 매출 리포트"
        description="온라인 정산 기준 매출과 오프라인 운영 매출을 분리해 비교합니다. 참고 합계는 정산 지급액 계산에 사용되지 않습니다."
        icon={BarChartBig}
        scope="범위: 온라인 정산 기준 매출 · 오프라인 운영 매출"
        helperText="오프라인 현금/계좌이체/매장 카드 매출은 별도 운영 정산 대상입니다."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/settlements">정산 화면으로 이동</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/offline">오프라인 관리로 이동</Link>
            </Button>
          </>
        }
      />

      <div className="space-y-2">
        <AdminFilterBar
          quickFilters={
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("today")}
              >
                오늘
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("month")}
              >
                이번 달
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("7d")}
              >
                최근 7일
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("30d")}
              >
                최근 30일
              </Button>
            </>
          }
          actions={
            <>
              <Button type="button" onClick={submit} className="w-auto">
                <Search className="mr-2 h-4 w-4" />
                검색
              </Button>
              <Button type="button" variant="outline" onClick={reset} className="w-auto">
                <RefreshCw className="mr-2 h-4 w-4" />
                초기화
              </Button>
              <Button asChild type="button" variant="secondary" className="w-auto">
                <a href={csvDownloadHref} download>
                  <FileDown className="mr-2 h-4 w-4" />
                  CSV 다운로드
                </a>
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="report-from">시작일</Label>
              <Input
                id="report-from"
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-to">종료일</Label>
              <Input
                id="report-to"
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>추이 단위</Label>
              <Select
                value={filters.groupBy}
                onValueChange={(value: RevenueReportGroupBy) =>
                  setFilters((prev) => ({ ...prev, groupBy: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">일별</SelectItem>
                  <SelectItem value="month">월별</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AdminFilterBar>
        <p className={adminTypography.caption}>
          CSV 다운로드는 현재 조회 중인 실시간 리포트 기준입니다. 스냅샷 CSV는 아래 월별 리포트
          스냅샷 카드에서 별도로 다운로드합니다.
        </p>
      </div>

      {report ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SummaryCard
              title="온라인 매출"
              value={formatKRW(report.online.paidAmount)}
              sub={`${report.online.count.toLocaleString("ko-KR")}건 · 현재 DB 기준 실시간 리포트`}
              tone="primary"
            />
            <SummaryCard
              title="오프라인 매출"
              value={formatKRW(report.offline.paidAmount)}
              sub="현재 DB 기준 실시간 리포트"
              tone="primary"
            />
          </div>

          <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <Badge tone="warning">참고값</Badge>
                <p className={adminTypography.caption}>{report.combinedPreview.note}</p>
              </div>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                <div>
                  <dt className={adminTypography.caption}>온라인 + 오프라인 참고 합계</dt>
                  <dd className={adminTypography.money}>
                    {formatKRW(report.combinedPreview.paidAmount)}
                  </dd>
                </div>
                <div>
                  <dt className={adminTypography.caption}>참고 순매출</dt>
                  <dd className={adminTypography.money}>
                    {formatKRW(report.combinedPreview.netAmount)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <Card className={cn(adminSurface.card, "border-warning/30 bg-warning/5")}>
            <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
              <div className="mr-auto">
                <p className={adminTypography.panelTitle}>확인할 금액·예외</p>
                <p className={adminTypography.caption}>
                  정상 매출 합계와 분리해 환불·미결제·발급 보정만 모았습니다.
                </p>
              </div>
              {[
                [
                  "발급 보정",
                  `${Number(report.offline.issueFailedCount ?? 0).toLocaleString("ko-KR")}건`,
                ],
                ["개인결제 환불", formatKRW(report.online.refundedAmount)],
                ["오프라인 환불", formatKRW(report.offline.refundedAmount)],
                ["오프라인 미결제", formatKRW(report.offline.pendingAmount)],
              ].map(([label, value]) => (
                <div key={label} className="min-w-[120px] text-right">
                  <p className={adminTypography.caption}>{label}</p>
                  <p className={adminTypography.money}>{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card className={cn(adminSurface.card, "border-primary/20")}>
        <CardHeader className="space-y-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className={cn("flex items-center gap-2", adminTypography.panelTitle)}>
                <DatabaseZap className="h-4 w-4" /> 월별 리포트 스냅샷
              </CardTitle>
              {monthlySnapshotTarget ? (
                <p className={cn("mt-1", adminTypography.metaMuted)}>
                  <strong className="text-foreground">
                    {monthlySnapshotTarget.yyyymm} 월별 스냅샷 저장 가능
                  </strong>{" "}
                  · 저장 시 서버에서 {monthlySnapshotTarget.from} ~ {monthlySnapshotTarget.to} 범위를
                  day 기준으로 다시 집계합니다.
                </p>
              ) : (
                <p className={cn("mt-1", adminTypography.metaMuted)}>
                  <strong className="text-foreground">
                    월별 스냅샷은 월 단위 조회에서 저장할 수 있습니다.
                  </strong>{" "}
                  시작일은 해당 월 1일, 종료일은 해당 월 말일로 선택해주세요.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <p className={cn("max-w-md", adminTypography.caption)}>
                <span className="font-medium text-foreground">이전 달 마감 스냅샷 생성</span> · KST
                기준 이전 달을 마감 상태로 생성하며, 이미 해당 월 스냅샷이 있으면 새로 생성한
                값으로 덮어씁니다.
              </p>
              <Button
                className="w-auto shrink-0"
                type="button"
                variant="secondary"
                onClick={autoGeneratePreviousMonthSnapshot}
                disabled={autoGeneratingSnapshot}
              >
                {autoGeneratingSnapshot ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <DatabaseZap className="mr-2 h-4 w-4" />
                )}
                이전 달 스냅샷 생성
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <details className="rounded-lg border border-border bg-background">
            <summary className={cn("cursor-pointer px-4 py-3", adminTypography.bodyStrong)}>
              스냅샷 기준과 주의사항
            </summary>
            <div className={cn("border-t border-border px-4 py-3", adminTypography.body)}>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>
                  스냅샷은 저장 시점의 매출 리포트이며, 이후 주문/환불/오프라인 기록 수정에 따라
                  실시간 리포트와 차이가 날 수 있습니다.
                </li>
                <li>스냅샷은 정산 지급액 계산에 사용되지 않습니다.</li>
                <li>
                  이미 저장된 월별 스냅샷을 새로 저장하면 저장 당시의 리포트 값으로
                  덮어써집니다.
                </li>
                <li>
                  자동 생성은 스냅샷 저장을 편하게 하기 위한 기능이며, 정산 지급액 계산에는
                  사용되지 않습니다.
                </li>
              </ul>
            </div>
          </details>

          {monthlySnapshotTarget ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
              <div className={cn(adminSurface.fieldPanel, "p-4")}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">저장 상태</p>
                    <p className={cn("mt-1", adminTypography.metaMuted)}>
                      {isSnapshotLoading
                        ? "저장된 스냅샷을 확인하는 중입니다…"
                        : snapshot
                          ? "저장된 스냅샷이 있습니다. 저장된 스냅샷의 상태와 메모가 아래 입력값에 반영되었습니다."
                          : "저장된 스냅샷이 없습니다. 현재 월 리포트를 새로 저장할 수 있습니다."}
                    </p>
                  </div>
                  {snapshot ? (
                    <Badge tone={snapshot.status === "finalized" ? "success" : "neutral"}>
                      {snapshot.status === "finalized" ? "마감" : "임시 저장"}
                    </Badge>
                  ) : (
                    <Badge tone="warning">미저장</Badge>
                  )}
                </div>
                {snapshot ? (
                  <>
                    <dl className={cn("mt-4 space-y-2", adminTypography.body)}>
                      <Row label="마지막 저장일" value={formatDateTime(snapshot.updatedAt)} />
                      <Row label="메모" value={snapshot.memo?.trim() || "-"} />
                    </dl>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowSnapshot((prev) => !prev)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {showSnapshot ? "스냅샷 접기" : "저장된 스냅샷 보기"}
                      </Button>
                      {snapshotCsvDownloadHref ? (
                        <Button asChild type="button" variant="secondary">
                          <a href={snapshotCsvDownloadHref} download>
                            <FileDown className="mr-2 h-4 w-4" />
                            스냅샷 CSV 다운로드
                          </a>
                        </Button>
                      ) : null}
                    </div>
                    <p className={cn("mt-3", adminTypography.caption)}>
                      스냅샷 CSV는 저장 당시 리포트 기준입니다. 현재 조회 중인 실시간 CSV와 파일명
                      및 기준값이 다릅니다.
                    </p>
                  </>
                ) : null}
                {!snapshot ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowSnapshot((prev) => !prev)}
                    disabled
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    저장된 스냅샷 보기
                  </Button>
                ) : null}
              </div>

              <div className={cn(adminSurface.fieldPanel, "space-y-3 p-4")}>
                <div className="space-y-1.5">
                  <Label>저장 상태</Label>
                  <Select
                    value={snapshotStatus}
                    onValueChange={(value: RevenueReportSnapshotStatus) => setSnapshotStatus(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">임시 저장</SelectItem>
                      <SelectItem value="finalized">마감</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="snapshot-memo">메모</Label>
                  <Textarea
                    id="snapshot-memo"
                    value={snapshotMemo}
                    onChange={(e) => setSnapshotMemo(e.target.value)}
                    placeholder="운영 메모를 입력하세요. 고객명/전화번호 등 개인정보는 입력하지 마세요."
                    rows={3}
                  />
                </div>
                <p className={adminTypography.caption}>
                  {snapshot
                    ? "이미 저장된 스냅샷이 있습니다. 다시 저장하면 현재 선택한 상태와 메모로 덮어씁니다."
                    : "저장된 스냅샷이 없습니다. 현재 선택한 상태와 메모로 새 스냅샷을 저장합니다."}
                </p>
                <Button
                  type="button"
                  className="w-full"
                  onClick={saveSnapshot}
                  disabled={savingSnapshot || !report}
                >
                  {savingSnapshot ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  스냅샷 저장
                </Button>
              </div>
            </div>
          ) : null}

          {snapshot && showSnapshot ? (
            <>
              <SnapshotSummaryCard snapshot={snapshot} />
              {report ? <SnapshotDiffCard report={report} snapshot={snapshot} /> : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="p-5">
            <p className="font-semibold text-destructive">매출 리포트를 불러오지 못했습니다.</p>
            <p className={cn("mt-1", adminTypography.metaMuted)}>
              필터를 확인한 뒤 다시 시도해주세요.
            </p>
            <Button type="button" className="mt-4" variant="outline" onClick={() => mutate()}>
              다시 불러오기
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className={cn("p-6 text-muted-foreground", adminTypography.body)}>
            리포트 데이터를 불러오는 중입니다…
          </CardContent>
        </Card>
      ) : null}

      {report ? (
        <>
          <Card className={adminSurface.card}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className={adminTypography.sectionTitle}>실시간 온라인/오프라인 비교</h2>
                  <p className={cn("mt-1", adminTypography.metaMuted)}>
                    현재 DB 기준 리포트입니다. 저장된 스냅샷과 다를 수 있으며, 참고 합계는 정산
                    지급액처럼 사용하지 않습니다.
                  </p>
                </div>
                <span className={adminTypography.caption}>
                  {report.range.from} ~ {report.range.to} ·{" "}
                  {report.range.groupBy === "day" ? "일별" : "월별"}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className={cn(adminSurface.fieldPanel, "p-4")}>
                  <h3 className="font-semibold">온라인 매출 세부</h3>
                  <dl className={cn("mt-3 space-y-2", adminTypography.body)}>
                    <Row
                      label="일반 온라인 주문"
                      value={formatKRW(report.online.bySource.orders)}
                    />
                    <Row
                      label="독립 스트링 신청"
                      value={formatKRW(report.online.bySource.stringingApplications)}
                    />
                    <Row
                      label="온라인 패키지"
                      value={formatKRW(report.online.bySource.packageOrders)}
                    />
                    <Row label="대여" value={formatKRW(report.online.bySource.rentals)} />
                    <Row
                      label="개인결제"
                      value={formatKRW(
                        report.online.bySource.privatePayments ??
                          report.online.privatePayments?.paidAmount ??
                          0,
                      )}
                    />
                    <Row
                      label="개인결제 환불"
                      value={formatKRW(
                        report.online.privatePayments?.refundAmount ??
                          report.online.refundedAmount ??
                          0,
                      )}
                    />
                  </dl>
                </div>
                <div className={cn(adminSurface.fieldPanel, "p-4")}>
                  <h3 className="font-semibold">오프라인 매출 세부</h3>
                  <dl className={cn("mt-3 space-y-2", adminTypography.body)}>
                    <Row
                      label="오프라인 작업/매출 기록"
                      value={formatKRW(report.offline.recordsPaidAmount)}
                    />
                    <Row
                      label="오프라인 패키지 판매"
                      value={formatKRW(report.offline.packageSalesPaidAmount)}
                    />
                    <Row label="미결제" value={formatKRW(report.offline.pendingAmount)} />
                    <Row label="환불" value={formatKRW(report.offline.refundedAmount)} />
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={adminSurface.card}>
            <CardHeader>
              <CardTitle className={cn("flex items-center gap-2", adminTypography.panelTitle)}>
                <WalletCards className="h-4 w-4" /> 결제수단별 오프라인 매출
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 xl:grid-cols-4">
                {Object.entries(METHOD_LABELS).map(([key, label]) => (
                  <div key={key} className="space-y-1 border-b border-border/60 py-3">
                    <dt className={adminTypography.caption}>{label}</dt>
                    <dd className={adminTypography.money}>
                      {formatKRW(report.offline.byMethod[key as keyof typeof METHOD_LABELS])}
                    </dd>
                    <dd className={adminTypography.caption}>오프라인 결제완료 매출</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className={adminSurface.card}>
            <CardHeader>
              <CardTitle className={cn("flex items-center gap-2", adminTypography.panelTitle)}>
                <Store className="h-4 w-4" /> 실시간 추이 표
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-[820px] divide-y divide-border">
                <thead className={adminSurface.tableHeader}>
                  <tr>
                    <th className={adminDataTable.head}>날짜</th>
                    <th className={adminDataTable.headRight}>
                      온라인 매출
                    </th>
                    <th className={adminDataTable.headRight}>
                      개인결제 환불
                    </th>
                    <th className={adminDataTable.headRight}>
                      온라인 순매출
                    </th>
                    <th className={adminDataTable.headRight}>
                      오프라인 매출
                    </th>
                    <th className={adminDataTable.headRight}>
                      참고 합계
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.series.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">
                        조회 기간의 매출 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    report.series.map((point) => (
                      <tr key={point.date} className={adminDataTable.row}>
                        <td className={adminDataTable.dateCell}>{point.date}</td>
                        <td className={adminDataTable.moneyCell}>
                          {formatKRW(point.onlinePaidAmount)}
                        </td>
                        <td className={cn(adminDataTable.moneyCell, "text-destructive")}>
                          {formatKRW(point.onlineRefundAmount)}
                        </td>
                        <td className={adminDataTable.moneyCell}>
                          {formatKRW(point.onlineNetAmount ?? point.onlinePaidAmount)}
                        </td>
                        <td className={adminDataTable.moneyCell}>
                          {formatKRW(point.offlinePaidAmount)}
                        </td>
                        <td className={adminDataTable.moneyCell}>
                          {formatKRW(point.combinedPaidAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <p className={cn("mt-4", adminTypography.caption)}>{report.combinedPreview.note}</p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </AdminPageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("whitespace-nowrap text-right", adminTypography.money)}>
        {value}
      </dd>
    </div>
  );
}
