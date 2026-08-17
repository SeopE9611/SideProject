"use client";

/** Responsibility: 정산 화면 표현 + 상호작용 오케스트레이션 뷰. */

import KpiCard from "@/app/admin/settlements/_components/KpiCard";
import { makeCsvFilename } from "@/app/admin/settlements/_lib/settlementExport";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { adminDataTable } from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminReferencePopover from "@/components/admin/AdminReferencePopover";
import AdminRowActionMenu from "@/components/admin/AdminRowActionMenu";
import AdminRowDetailsSheet from "@/components/admin/AdminRowDetailsSheet";
import { AdminSemanticBadge as Badge } from "@/components/admin/AdminSemanticBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { runAdminActionWithToast } from "@/lib/admin/adminActionHelpers";
import { adminFetcher, adminMutator, ensureAdminMutationSucceeded } from "@/lib/admin/adminFetcher";
import { badgeToneVariant, type BadgeSemanticTone } from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { formatKRWCard, formatKRWFull } from "@/lib/money";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  OfflineSettlementReference,
  SettlementDiff,
  SettlementLiveResponse,
  SettlementSnapshot,
} from "@/types/admin/settlements";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  BarChartBig as ChartBar,
  CheckCircle2,
  DollarSign,
  FileDown,
  Loader2,
  Package,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  firstDayOfMonth_KST,
  fmtYMD_KST,
  monthEdges,
  prevMonthRange_KST,
} from "./filters/settlementDateFilters";
import { useInitialYyyymmFromQuery } from "./hooks/useInitialYyyymmFromQuery";
import { sortSettlementRows, type SortDirection, type SortField } from "./table/settlementSort";
import {
  buildAllSettlementSelection,
  getSettlementCacheKey,
  isSettlementMatched,
  toggleYyyymmSelection,
  validateYyyymmClient,
} from "./utils/settlementClientTransforms";

const settlementStatusToneMap: Record<"checking" | "ok" | "stale", BadgeSemanticTone> = {
  checking: "neutral",
  ok: "success",
  stale: "warning",
};

const AdminConfirmDialog = dynamic(() => import("@/components/admin/AdminConfirmDialog"), {
  loading: () => null,
});

export default function SettlementsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ──────────────────────────────────────────────────────────
  // 상태
  // ──────────────────────────────────────────────────────────
  const [yyyymm, setYyyymm] = useState<string>(() => fmtYMD_KST().slice(0, 7).replace("-", "")); // KST 기준 초기 yyyymm
  const { data, mutate, isLoading } = useSWR<SettlementSnapshot[]>(
    "/api/admin/settlements",
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  // URL 쿼리로 월을 지정하면(예: /admin/settlements?yyyymm=202601) 초기 선택 월을 그 값으로 맞춘다.
  // - 운영함 → 정산 "바로가기"에서 추천 월을 함께 전달할 때 월 착오를 줄이기 위함
  useInitialYyyymmFromQuery(searchParams, setYyyymm);
  const [tab, setTab] = useState<"snapshot" | "live">("snapshot");

  // 실시간 탭의 조회 기간 (KST)
  const [from, setFrom] = useState(() => firstDayOfMonth_KST());
  const [to, setTo] = useState(() => fmtYMD_KST());

  const invalidRange = useMemo(() => {
    if (!from || !to) return false;
    // 'YYYY-MM-DD' 형태 가정
    return new Date(from) > new Date(to);
  }, [from, to]);

  const [live, setLive] = useState<SettlementLiveResponse | null>(null);

  // 버튼 로딩/락
  const [doing, setDoing] = useState<{
    create?: boolean;
    rebuild?: string;
    live?: boolean;
  }>({});

  // 검증 결과: yyyymm → { live, snap }
  const [diffMap, setDiffMap] = useState<Record<string, SettlementDiff>>({});

  // 팝오버 열림 상태: yyyymm → boolean
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  // 상태 배지
  const [staleMap, setStaleMap] = useState<Record<string, boolean>>({});
  const [statusMap, setStatusMap] = useState<Record<string, "ok" | "stale" | "checking">>({});

  // 전체 검증 로딩
  const [bulkChecking, setBulkChecking] = useState(false);

  // 체크박스 선택 상태 (스냅샷 관리 탭만 사용)
  const [selectedSnapshots, setSelectedSnapshots] = useState<Set<string>>(new Set());
  const [selectedLive, setSelectedLive] = useState<boolean>(false);

  // 정렬 상태
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // 삭제 로딩 상태
  const [deleting, setDeleting] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<null | {
    type: "single" | "bulk";
    yyyymm?: string;
    count?: number;
  }>(null);

  // 축약(기본) ↔ 원단위 토글 상태
  const [compact, setCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem("settlements.kpi.compact");
    return saved === null ? true : saved === "1";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("settlements.kpi.compact", compact ? "1" : "0");
    }
  }, [compact]);

  // 공용 표시 함수
  const displayKRW = (n: number) => (compact ? formatKRWCard(n) : formatKRWFull(n));

  const renderOfflineAmountCard = (
    label: string,
    value: number,
    tone: "default" | "primary" | "warning" | "danger" = "default",
    sub?: string,
  ) => {
    const toneClass = {
      default: "text-foreground",
      primary: "text-primary",
      warning: "text-warning",
      danger: "text-destructive",
    }[tone];

    return (
      <div className={cn(adminSurface.fieldPanel, "p-4")}>
        <p className={adminTypography.caption}>{label}</p>
        <p className={cn("mt-2 whitespace-nowrap", adminTypography.kpiValueCompact, toneClass)}>
          {displayKRW(value)}
        </p>
        {sub ? <p className={cn("mt-1", adminTypography.caption)}>{sub}</p> : null}
      </div>
    );
  };

  const renderOfflineReference = (offline?: OfflineSettlementReference) => {
    if (!offline) return null;

    const methodLabels: Array<[keyof OfflineSettlementReference["byMethod"], string]> = [
      ["cash", "현금"],
      ["card", "매장 카드"],
      ["bank_transfer", "계좌이체"],
      ["etc", "기타"],
    ];

    return (
      <Card className={adminSurface.card}>
        <CardContent className="p-6 space-y-5">
          <div className="flex gap-3 flex-row items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className={adminTypography.sectionTitle}>오프라인 매출 참고</h3>
                <Badge variant="secondary">정산 지급액 미포함</Badge>
              </div>
              <p className={cn("mt-2 text-muted-foreground", adminTypography.body)}>
                오프라인 매출은 현금/매장 카드/계좌이체 등으로 처리된 별도 운영 매출이며, 현재
                온라인 PG 정산 지급액 계산에는 포함되지 않습니다.
              </p>
            </div>
            <div className={cn(adminSurface.fieldPanelMuted, adminTypography.caption)}>
              {offline.notice}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {renderOfflineAmountCard(
              "오프라인 총 결제완료 매출",
              offline.total.paidAmount,
              "primary",
              `${offline.total.paidCount.toLocaleString()}건`,
            )}
            {renderOfflineAmountCard(
              "오프라인 순매출",
              offline.total.netAmount,
              "primary",
              "결제완료 - 환불/차감",
            )}
            {renderOfflineAmountCard(
              "오프라인 작업 매출",
              offline.records.paidAmount,
              "default",
              `${offline.records.paidCount.toLocaleString()}건`,
            )}
            {renderOfflineAmountCard(
              "오프라인 패키지 판매",
              offline.packageSales.paidAmount,
              "default",
              `${offline.packageSales.paidCount.toLocaleString()}건`,
            )}
            {renderOfflineAmountCard(
              "미결제",
              offline.total.pendingAmount,
              "warning",
              `${offline.total.pendingCount.toLocaleString()}건 · 지급액 미포함`,
            )}
            {renderOfflineAmountCard(
              "환불/차감",
              offline.total.refundedAmount,
              "danger",
              `${offline.total.refundedCount.toLocaleString()}건`,
            )}
          </div>

          <div className="grid grid-cols-[1fr_320px] gap-4">
            <div className={cn(adminSurface.fieldPanelMuted, "p-4")}>
              <h4 className={cn("mb-3", adminTypography.panelTitle)}>
                결제수단별 오프라인 결제완료 매출
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {methodLabels.map(([key, label]) => (
                  <div key={key} className="rounded-lg bg-card border border-border p-3">
                    <p className={adminTypography.caption}>{label}</p>
                    <p className={cn("mt-1 whitespace-nowrap", adminTypography.money)}>
                      {displayKRW(offline.byMethod[key] || 0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className={cn(adminSurface.fieldPanelMuted, "p-4")}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-primary" />
                <h4 className={adminTypography.panelTitle}>발급 보정 필요</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className={adminTypography.caption}>건수</p>
                  <p className={cn("mt-1 whitespace-nowrap", adminTypography.numeric)}>
                    {(offline.packageSales.issueFailedCount || 0).toLocaleString()}건
                  </p>
                </div>
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className={adminTypography.caption}>금액</p>
                  <p className={cn("mt-1 whitespace-nowrap", adminTypography.money)}>
                    {displayKRW(offline.packageSales.issueFailedAmount || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ──────────────────────────────────────────────────────────
  // 서버 액션
  // ──────────────────────────────────────────────────────────
  const createSnapshot = async () => {
    const result = await runAdminActionWithToast({
      action: () => adminMutator(`/api/admin/settlements/${yyyymm}`, { method: "POST" }),
      successMessage: `${yyyymm} 스냅샷 생성 완료`,
      fallbackErrorMessage: "스냅샷 생성 실패",
    });
    if (result) await mutate();
  };

  async function rebuildSnapshot(yyyymm: string) {
    const result = await runAdminActionWithToast({
      action: () => adminMutator(`/api/admin/settlements/${yyyymm}`, { method: "POST" }),
      fallbackErrorMessage: "스냅샷 재생성 실패",
    });
    return result;
  }

  async function fetchLive() {
    if (invalidRange) {
      showErrorToast("시작일이 종료일보다 늦습니다. 날짜를 다시 선택해 주세요.");
      return;
    }
    const q = new URLSearchParams({ from, to }).toString();
    const liveJson = await adminFetcher<SettlementLiveResponse>(
      `/api/admin/settlements/live?${q}`,
      { cache: "no-store" },
    );
    setLive(liveJson);
  }

  // 스냅샷 vs 실시간 비교(한 행)
  async function checkStalenessOfRow(row: SettlementSnapshot) {
    const key = String(row.yyyymm);
    const { from, to } = monthEdges(key);

    // 같은 달의 실시간 집계 호출
    const liveJson = await adminFetcher<SettlementLiveResponse>(
      `/api/admin/settlements/live?from=${from}&to=${to}`,
      { cache: "no-store" },
    );

    return {
      ok: isSettlementMatched(row, liveJson as SettlementLiveResponse),
      live: liveJson,
    };
  }

  async function validateSnapshotRow(row: SettlementSnapshot) {
    const key = String(row.yyyymm);
    try {
      setStatusMap((prev) => ({ ...prev, [key]: "checking" }));
      const { ok, live } = await checkStalenessOfRow(row);
      const snap = {
        paid: row.totals?.paid || 0,
        refund: row.totals?.refund || 0,
        net: row.totals?.net || 0,
        orders: row.breakdown?.orders || 0,
        applications: row.breakdown?.applications || 0,
        packages: row.breakdown?.packages || 0,
      };
      const livePack = {
        paid: live.totals?.paid || 0,
        refund: live.totals?.refund || 0,
        net: live.totals?.net || 0,
        orders: live.breakdown?.orders || 0,
        applications: live.breakdown?.applications || 0,
        packages: live.breakdown?.packages || 0,
      };

      setDiffMap((prev) => ({ ...prev, [key]: { live: livePack, snap } }));
      setStatusMap((prev) => ({ ...prev, [key]: ok ? "ok" : "stale" }));
      setStaleMap((prev) => ({ ...prev, [key]: !ok }));
      setOpenMap((prev) => ({ ...prev, [key]: !ok }));
      sessionStorage.setItem(getSettlementCacheKey(row), ok ? "ok" : "stale");

      if (ok) showSuccessToast("스냅샷이 현재 집계와 일치합니다.");
      else showInfoToast(`변경 감지됨: ${key} 스냅샷과 현재 집계가 다릅니다.`);
    } catch (error) {
      console.error(error);
      setStatusMap((prev) => ({ ...prev, [key]: "stale" }));
      showErrorToast("검증 중 오류가 발생했습니다.");
    }
  }

  async function rebuildSnapshotRow(row: SettlementSnapshot) {
    const key = String(row.yyyymm);
    try {
      setDoing((current) => ({ ...current, rebuild: key }));
      await rebuildSnapshot(key);
      await mutate();
      setStatusMap((prev) => ({ ...prev, [key]: "ok" }));
      setStaleMap((prev) => ({ ...prev, [key]: false }));
      setOpenMap((prev) => ({ ...prev, [key]: false }));
      showSuccessToast(`${key} 스냅샷을 갱신했습니다.`);
    } catch (error) {
      console.error(error);
      showErrorToast("스냅샷 갱신 중 오류가 발생했습니다.");
    } finally {
      setDoing((current) => ({ ...current, rebuild: undefined }));
    }
  }

  // 전체 검증
  async function validateAll(rows: SettlementSnapshot[]) {
    setBulkChecking(true);
    try {
      for (const row of rows) {
        const key = String(row.yyyymm);
        setStatusMap((prev) => ({ ...prev, [key]: "checking" }));
        const { ok } = await checkStalenessOfRow(row);
        setStatusMap((prev) => ({ ...prev, [key]: ok ? "ok" : "stale" }));
        setStaleMap((prev) => ({ ...prev, [key]: !ok }));
        sessionStorage.setItem(getSettlementCacheKey(row), ok ? "ok" : "stale");
      }
      showSuccessToast("전체 검증 완료");
    } catch (e) {
      console.error(e);
      showErrorToast("전체 검증 중 오류가 발생했습니다.");
    } finally {
      setBulkChecking(false);
    }
  }

  // 전체 선택/해제 토글
  const toggleSelectAll = () => {
    if (selectedSnapshots.size === (data ?? []).length) {
      setSelectedSnapshots(new Set());
      return;
    }
    setSelectedSnapshots(buildAllSettlementSelection(data ?? []));
  };

  // 개별 선택/해제 토글
  const toggleSelect = (yyyymm: string) => {
    setSelectedSnapshots((prev) => toggleYyyymmSelection(prev, yyyymm));
  };

  // 선택된 항목 삭제
  const deleteSelected = async () => {
    if (selectedSnapshots.size === 0) {
      showInfoToast("삭제할 항목을 선택하세요.");
      return;
    }

    try {
      setDeleting(true);
      const json = await runAdminActionWithToast<{
        success?: boolean;
        message?: string;
      }>({
        action: async () => {
          const payload = await adminMutator<{
            success?: boolean;
            message?: string;
          }>("/api/admin/settlements/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ yyyymms: Array.from(selectedSnapshots) }),
          });
          ensureAdminMutationSucceeded(payload, "삭제 실패");
          return payload;
        },
        successMessage: "삭제가 완료되었습니다.",
        fallbackErrorMessage: "삭제 중 오류가 발생했습니다.",
      });

      if (!json) return;
      if (json.message) showSuccessToast(json.message);
      setSelectedSnapshots(new Set());
      await mutate();
    } finally {
      setDeleting(false);
    }
  };

  // 단일 항목 삭제
  const deleteSingle = async (yyyymm: string) => {
    try {
      setDeleting(true);
      const json = await runAdminActionWithToast<{
        success?: boolean;
        message?: string;
      }>({
        action: async () => {
          const payload = await adminMutator<{
            success?: boolean;
            message?: string;
          }>(`/api/admin/settlements/${yyyymm}`, { method: "DELETE" });
          ensureAdminMutationSucceeded(payload, "삭제 실패");
          return payload;
        },
        successMessage: "삭제가 완료되었습니다.",
        fallbackErrorMessage: "삭제 중 오류가 발생했습니다.",
      });

      if (!json) return;
      if (json.message) showSuccessToast(json.message);
      await mutate();
    } finally {
      setDeleting(false);
    }
  };

  // 정렬 토글
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      // 같은 필드 클릭: asc → desc → null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      // 다른 필드 클릭: asc로 시작
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // 정렬된 데이터
  const sortedData = () => sortSettlementRows(data, sortField, sortDirection);

  // 정렬 아이콘 렌더링
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="w-3.5 h-3.5 text-primary" />;
    }
    return <ArrowDown className="w-3.5 h-3.5 text-primary" />;
  };

  // 세션 캐시 → 초기 상태 프리필(재방문 최적화)
  useEffect(() => {
    if (!data?.length) return;
    const nextStatus: Record<string, "ok" | "stale"> = {};
    const nextStale: Record<string, boolean> = {};
    for (const row of data) {
      const key = String(row.yyyymm);
      const cached = sessionStorage.getItem(getSettlementCacheKey(row));
      if (cached === "ok" || cached === "stale") {
        nextStatus[key] = cached as "ok" | "stale";
        nextStale[key] = cached === "stale";
      }
    }
    if (Object.keys(nextStatus).length) setStatusMap((prev) => ({ ...nextStatus, ...prev }));
    if (Object.keys(nextStale).length) setStaleMap((prev) => ({ ...nextStale, ...prev }));
  }, [data]);

  // 스냅샷 CSV 다운로드
  const downloadCSV = () => {
    const rows = sortedData() ?? [];
    const header = ["월(YYYYMM)", "매출", "환불", "순익", "주문수", "신청수", "패키지수"];
    const csvRows = rows.map((r) => [
      `'${String(r.yyyymm)}`, // yyyymm 자동서식 방지
      r.totals?.paid || 0,
      r.totals?.refund || 0,
      r.totals?.net || 0,
      r.breakdown?.orders || 0,
      r.breakdown?.applications || 0,
      r.breakdown?.packages || 0,
    ]);

    // 파일명: 목록 최소~최대 yyyymm
    const yyyymms = rows.map((r) => String(r.yyyymm)).filter(Boolean);
    const minYm = yyyymms.length ? yyyymms[yyyymms.length - 1] : "YYYYMM";
    const maxYm = yyyymms.length ? yyyymms[0] : "YYYYMM";

    // CRLF + UTF-8 BOM
    const lines = [header, ...csvRows].map((a) => a.join(",")).join("\r\n");
    const csv = "\ufeff" + lines;

    const fileName = makeCsvFilename(`도깨비테니스_정산스냅샷_${minYm}-${maxYm}`);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRevenue = (data ?? []).reduce((sum: number, row) => sum + (row.totals?.paid || 0), 0);
  const totalRefunds = (data ?? []).reduce(
    (sum: number, row) => sum + (row.totals?.refund || 0),
    0,
  );
  const totalNet = (data ?? []).reduce((sum: number, row) => sum + (row.totals?.net || 0), 0);
  const totalRentalDeposit = (data ?? []).reduce(
    (sum: number, row) => sum + (row.totals?.rentalDeposit || 0),
    0,
  );
  const totalSettlements = (data ?? []).length;

  // ──────────────────────────────────────────────────────────
  // UI
  // ──────────────────────────────────────────────────────────
  return (
    <AdminPageShell variant="wide" className="space-y-8">
      <AdminPageHeader
        title="정산 관리"
        description="월별 매출, 환불, 순매출 스냅샷을 생성하고 관리합니다."
        icon={ChartBar}
        scope="범위: 주문·신청·대여·패키지 정산"
        helperText="스냅샷은 운영 마감 기준으로 사용되며 필요 시 재생성할 수 있습니다."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/reports/revenue">온라인/오프라인 매출 리포트</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-4 gap-6 mb-8">
        {/* 전체 정산 월 (기존 카드 유지) */}
        <Card className={cn(adminSurface.kpiCard, "overflow-hidden")}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={adminTypography.metaMuted}>전체 정산 월</p>
                <p className={adminTypography.kpiValue}>
                  {isLoading ? (
                    <span className="inline-block h-9 w-16 rounded bg-muted/70 animate-pulse" />
                  ) : (
                    totalSettlements
                  )}
                </p>
              </div>
              <div className={adminSurface.fieldPanelMuted}>
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 총 결제금액 */}
        <KpiCard
          label="온라인 결제금액"
          value={totalRevenue ?? 0}
          storageKey="settlements.kpi.compact.revenue"
          formatCompact={formatKRWCard}
          icon={<DollarSign className="h-6 w-6 text-primary" />}
          isLoading={isLoading}
          hint={true}
          skeletonWidthClass="w-28"
        />

        {/* 총 환불 */}
        <KpiCard
          label="온라인 환불금액"
          value={totalRefunds ?? 0}
          storageKey="settlements.kpi.compact.refund"
          formatCompact={formatKRWCard}
          icon={<TrendingDown className="h-6 w-6 text-destructive" />}
          isLoading={isLoading}
          hint={true}
          skeletonWidthClass="w-24"
        />

        {/* 순매출 */}
        <KpiCard
          label="온라인 순매출"
          value={totalNet ?? 0}
          storageKey="settlements.kpi.compact.net"
          formatCompact={formatKRWCard}
          icon={<Activity className="h-6 w-6 text-primary" />}
          isLoading={isLoading}
          hint={true}
          skeletonWidthClass="w-28"
        />
      </div>

      <div className="border-b rounded-t-2xl overflow-x-auto bg-card">
        <div className="px-6 flex gap-1 min-w-max">
          <button
            onClick={() => setTab("snapshot")}
            className={`px-6 py-4 text-sm font-semibold transition-colors relative whitespace-nowrap ${tab === "snapshot" ? "text-primary" : "text-muted-foreground hover:text-foreground dark:hover:text-foreground"}`}
          >
            스냅샷 관리
            {tab === "snapshot" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
            )}
          </button>
          <button
            onClick={async () => {
              setTab("live");
              try {
                setDoing((d) => ({ ...d, live: true }));
                await fetchLive();
              } finally {
                setDoing((d) => ({ ...d, live: false }));
              }
            }}
            disabled={doing.live}
            className={`px-6 py-4 text-sm font-semibold transition-colors relative whitespace-nowrap ${tab === "live" ? "text-primary" : "text-muted-foreground hover:text-foreground dark:hover:text-foreground"}`}
          >
            실시간 조회
            {tab === "live" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      {/* 스냅샷 탭 */}
      {tab === "snapshot" && (
        <div className="space-y-6">
          <Card className={adminSurface.card}>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="w-full">
                  <label className="block text-sm font-semibold mb-2 text-foreground">
                    대상 월 (YYYYMM)
                  </label>
                  <input
                    value={yyyymm}
                    onChange={(e) => setYyyymm(e.target.value.replace(/[^0-9]/g, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createSnapshot();
                    }}
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="202510"
                    className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-card transition-[border-color,box-shadow]"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      // 사전 검증
                      const v = validateYyyymmClient(yyyymm);
                      if (!v.ok) {
                        showErrorToast(v.reason);
                        return;
                      }
                      try {
                        setDoing((d) => ({ ...d, create: true }));
                        await createSnapshot();
                      } finally {
                        setDoing((d) => ({ ...d, create: false }));
                      }
                    }}
                    disabled={doing.create}
                    className="px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {doing.create ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4" />
                        스냅샷 생성
                      </>
                    )}
                  </button>

                  <button
                    onClick={downloadCSV}
                    className="px-4 py-3 rounded-xl border-2 border-border bg-card hover:bg-muted dark:hover:bg-card transition-[background-color,box-shadow] text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow"
                  >
                    <FileDown className="w-4 h-4" />
                    CSV 다운로드
                  </button>

                  <button
                    onClick={async () => {
                      const fresh = await mutate();
                      await validateAll(fresh ?? []);
                    }}
                    disabled={bulkChecking || !data?.length}
                    className="px-4 py-3 rounded-xl border-2 border-border bg-card hover:bg-muted dark:hover:bg-card transition-[background-color,box-shadow] text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow"
                  >
                    {bulkChecking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        검증 중...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        전체 검증
                      </>
                    )}
                  </button>

                  <button
                    onClick={() =>
                      setPendingDeleteAction({
                        type: "bulk",
                        count: selectedSnapshots.size,
                      })
                    }
                    disabled={deleting || selectedSnapshots.size === 0}
                    className="px-4 py-3 rounded-xl border-2 border-destructive/40 bg-card hover:bg-destructive/10 dark:hover:bg-destructive/15 transition-[background-color,box-shadow] text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow text-destructive"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        삭제 중...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span className="inline">선택 삭제</span> ({selectedSnapshots.size})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(adminSurface.tableCard, "overflow-visible max-w-6xl mx-auto")}>
            {/* 데스크탑 */}
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                <div className="sticky top-0 z-10 bg-muted border-b border-border">
                  <div
                    className="grid gap-3 p-4 text-sm font-semibold text-foreground"
                    style={{ gridTemplateColumns: "44px 100px 220px 190px 180px 130px 150px" }}
                  >
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedSnapshots.size === (data ?? []).length && (data ?? []).length > 0
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                        aria-label="전체 선택"
                      />
                    </div>
                    <div className="text-center">정산 월</div>
                    <button
                      type="button"
                      onClick={() => toggleSort("net")}
                      className="inline-flex min-h-8 items-center justify-end gap-1 rounded px-1 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      온라인 순매출
                      {renderSortIcon("net")}
                    </button>
                    <div className="text-right">처리 건수</div>
                    <div className="text-right">개인결제 순액</div>
                    <div className="text-center">검증 상태</div>
                    <div className="sticky right-0 bg-muted text-center">관리</div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="divide-y divide-border">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="grid gap-3 p-5 animate-pulse"
                        style={{
                          gridTemplateColumns: "44px 100px 220px 190px 180px 130px 150px",
                        }}
                      >
                        {Array.from({ length: 7 }).map((_, column) => (
                          <div key={column} className="h-5 rounded bg-muted" />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : !data || data.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="bg-muted rounded-full p-4 mb-4">
                      <Package className="w-12 h-12 text-primary" />
                    </div>
                    <p className={cn("mb-2", adminTypography.panelTitle)}>데이터가 없습니다</p>
                    <p className={adminTypography.metaMuted}>
                      위에서 월을 선택하여 스냅샷을 생성하세요
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {(sortedData() ?? []).map((row, idx: number) => (
                      <div key={row.yyyymm}>
                        <div
                          className="grid gap-3 p-4 text-sm font-semibold text-foreground"
                          style={{
                            gridTemplateColumns: "44px 100px 220px 190px 180px 130px 150px",
                          }}
                        >
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={selectedSnapshots.has(String(row.yyyymm))}
                              onChange={() => toggleSelect(String(row.yyyymm))}
                              className="w-4 h-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                              aria-label={`${row.yyyymm} 선택`}
                            />
                          </div>

                          <div className="flex items-center justify-center gap-2">
                            <button
                              className="font-semibold text-primary hover:text-foreground hover:underline underline-offset-4 transition-colors"
                              onClick={() => {
                                const { from, to } = monthEdges(String(row.yyyymm));
                                router.push(`/admin/orders?from=${from}&to=${to}`);
                              }}
                              title="이 월의 주문/신청 목록 보기"
                              aria-label={`${row.yyyymm} 월의 주문/신청 목록 보기`}
                            >
                              {row.yyyymm}
                            </button>
                          </div>

                          <div className="space-y-1 text-right tabular-nums">
                            <p className="text-sm font-bold text-foreground">
                              {(row.totals?.net || 0).toLocaleString()}원
                            </p>
                            <AdminReferencePopover
                              align="end"
                              title={`${row.yyyymm} 온라인 금액 구성`}
                              trigger={
                                <button type="button" className={adminDataTable.referenceTrigger}>
                                  결제·환불 보기
                                </button>
                              }
                              items={[
                                {
                                  label: "결제",
                                  value: `${(row.totals?.paid || 0).toLocaleString()}원`,
                                },
                                {
                                  label: "환불",
                                  value: `${(row.totals?.refund || 0).toLocaleString()}원`,
                                },
                                {
                                  label: "순매출",
                                  value: `${(row.totals?.net || 0).toLocaleString()}원`,
                                },
                              ]}
                            />
                          </div>
                          <div className="space-y-1 text-right tabular-nums">
                            <p className="text-sm font-semibold text-foreground">
                              {(row.breakdown?.orders || 0) +
                                (row.breakdown?.applications || 0) +
                                (row.breakdown?.rentals ?? 0) +
                                (row.breakdown?.packages || 0)}
                              건
                            </p>
                            <AdminReferencePopover
                              align="end"
                              title={`${row.yyyymm} 처리 건수`}
                              trigger={
                                <button type="button" className={adminDataTable.referenceTrigger}>
                                  구성 보기
                                </button>
                              }
                              items={[
                                { label: "주문", value: `${row.breakdown?.orders || 0}건` },
                                {
                                  label: "교체서비스",
                                  value: `${row.breakdown?.applications || 0}건`,
                                },
                                { label: "대여", value: `${row.breakdown?.rentals ?? 0}건` },
                                { label: "패키지", value: `${row.breakdown?.packages || 0}건` },
                              ]}
                            />
                          </div>
                          <div className="space-y-1 text-right tabular-nums">
                            <p className="text-sm font-semibold text-foreground">
                              {(
                                (row.breakdown?.privatePaymentsPaidAmount || 0) -
                                (row.breakdown?.privatePaymentsRefundAmount || 0)
                              ).toLocaleString()}
                              원
                            </p>
                            <AdminReferencePopover
                              align="end"
                              title={`${row.yyyymm} 개인결제 금액`}
                              trigger={
                                <button type="button" className={adminDataTable.referenceTrigger}>
                                  결제·환불 보기
                                </button>
                              }
                              items={[
                                {
                                  label: "결제",
                                  value: `${(row.breakdown?.privatePaymentsPaidAmount || 0).toLocaleString()}원`,
                                },
                                {
                                  label: "환불",
                                  value: `${(row.breakdown?.privatePaymentsRefundAmount || 0).toLocaleString()}원`,
                                },
                              ]}
                            />
                          </div>

                          <div className="flex items-center justify-center">
                            {statusMap[String(row.yyyymm)] === "checking" && (
                              <Badge
                                variant={badgeToneVariant(settlementStatusToneMap.checking)}
                                className="gap-1.5 px-3 py-1.5 font-medium"
                              >
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                검증 중
                              </Badge>
                            )}
                            {statusMap[String(row.yyyymm)] === "ok" && (
                              <Badge
                                variant={badgeToneVariant(settlementStatusToneMap.ok)}
                                className="gap-1.5 px-3 py-1.5 font-medium"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                최신
                              </Badge>
                            )}
                            {statusMap[String(row.yyyymm)] === "stale" && (
                              <Badge
                                variant={badgeToneVariant(settlementStatusToneMap.stale)}
                                className="gap-1.5 px-3 py-1.5 font-medium"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                갱신 필요
                              </Badge>
                            )}
                            {!statusMap[String(row.yyyymm)] && (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                            {openMap[String(row.yyyymm)] &&
                            statusMap[String(row.yyyymm)] === "stale" &&
                            diffMap[String(row.yyyymm)] ? (
                              <AdminRowDetailsSheet
                                title={`${row.yyyymm} 검증 결과`}
                                description="저장된 스냅샷과 현재 집계를 비교합니다."
                                trigger={
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    className="h-7 px-1"
                                  >
                                    차이 보기
                                  </Button>
                                }
                                footer={
                                  <Button
                                    type="button"
                                    disabled={doing.rebuild === row.yyyymm}
                                    onClick={() => void rebuildSnapshotRow(row)}
                                  >
                                    {doing.rebuild === row.yyyymm ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <RefreshCw className="mr-2 h-4 w-4" />
                                    )}
                                    지금 갱신
                                  </Button>
                                }
                              >
                                <div className="overflow-hidden rounded-lg border border-border">
                                  <div
                                    className={cn(
                                      "grid grid-cols-[120px_1fr_1fr] gap-3 bg-muted/50 px-4 py-3",
                                      adminTypography.tableHeader,
                                    )}
                                  >
                                    <span>항목</span>
                                    <span className="text-right">스냅샷</span>
                                    <span className="text-right">현재 집계</span>
                                  </div>
                                  {(
                                    [
                                      ["결제 금액", "paid"],
                                      ["환불 금액", "refund"],
                                      ["순매출", "net"],
                                      ["주문", "orders"],
                                      ["교체서비스", "applications"],
                                      ["패키지", "packages"],
                                    ] as const
                                  ).map(([label, field]) => (
                                    <div
                                      key={field}
                                      className="grid grid-cols-[120px_1fr_1fr] gap-3 border-t border-border px-4 py-3 text-sm"
                                    >
                                      <span className="text-muted-foreground">{label}</span>
                                      <span className="text-right tabular-nums">
                                        {diffMap[String(row.yyyymm)]!.snap[field].toLocaleString()}
                                      </span>
                                      <span
                                        className={cn(
                                          "text-right font-medium tabular-nums",
                                          diffMap[String(row.yyyymm)]!.snap[field] !==
                                            diffMap[String(row.yyyymm)]!.live[field] &&
                                            "text-destructive",
                                        )}
                                      >
                                        {diffMap[String(row.yyyymm)]!.live[field].toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <p className={cn("mt-4", adminTypography.metaMuted)}>
                                  값이 다른 경우 갱신하면 현재 집계로 스냅샷을 다시 생성합니다.
                                </p>
                              </AdminRowDetailsSheet>
                            ) : null}
                          </div>

                          <div className="sticky right-0 flex items-center justify-end gap-1 bg-card">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={statusMap[String(row.yyyymm)] === "checking"}
                              onClick={() => void validateSnapshotRow(row)}
                            >
                              {statusMap[String(row.yyyymm)] === "checking" ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              검증
                            </Button>
                            <AdminRowActionMenu
                              ariaLabel={`${row.yyyymm} 정산 스냅샷 작업 메뉴`}
                              dropdownProps={{ modal: false }}
                              contentProps={{
                                sideOffset: 8,
                                collisionPadding: 8,
                                className: "z-50 w-44",
                                onCloseAutoFocus: (event) => event.preventDefault(),
                              }}
                              destructiveActions={
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={async () => {
                                    setPendingDeleteAction({
                                      type: "single",
                                      yyyymm: String(row.yyyymm),
                                    });
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  삭제
                                </DropdownMenuItem>
                              }
                            >
                              <DropdownMenuItem
                                disabled={doing.rebuild === row.yyyymm}
                                onSelect={() => void rebuildSnapshotRow(row)}
                              >
                                {doing.rebuild === row.yyyymm ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                )}
                                갱신
                              </DropdownMenuItem>
                            </AdminRowActionMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 실시간 탭 */}
      {tab === "live" && (
        <div className="space-y-6">
          <Card className={adminSurface.card}>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground">
                      시작일
                    </label>
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-card transition-[border-color,box-shadow]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground">
                      종료일
                    </label>
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ring focus:border-transparent bg-card transition-[border-color,box-shadow]"
                    />
                  </div>
                  {invalidRange && (
                    <p className="text-sm text-destructive mt-1">
                      시작일이 종료일보다 늦습니다. 날짜를 다시 선택해 주세요.
                    </p>
                  )}{" "}
                </div>

                <div className="grid grid-cols-5 gap-2">
                  <button
                    className="px-4 py-2.5 border-2 border-border rounded-xl text-sm font-semibold hover:bg-muted dark:hover:bg-card transition-[background-color,box-shadow] shadow-sm hover:shadow"
                    onClick={() => {
                      const fromStr = firstDayOfMonth_KST();
                      const toStr = fmtYMD_KST();
                      setFrom(fromStr);
                      setTo(toStr);
                    }}
                    aria-label="이번 달 선택"
                  >
                    이번 달
                  </button>
                  <button
                    className="px-4 py-2.5 border-2 border-border rounded-xl text-sm font-semibold hover:bg-muted dark:hover:bg-card transition-[background-color,box-shadow] shadow-sm hover:shadow"
                    onClick={() => {
                      const r = prevMonthRange_KST();
                      setFrom(r.from);
                      setTo(r.to);
                    }}
                    aria-label="지난 달 선택"
                  >
                    지난 달
                  </button>
                  <button
                    className="px-4 py-2.5 border-2 border-border rounded-xl text-sm font-semibold hover:bg-muted dark:hover:bg-card transition-[background-color,box-shadow] shadow-sm hover:shadow"
                    onClick={() => {
                      const end = new Date();
                      const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
                      setFrom(fmtYMD_KST(start));
                      setTo(fmtYMD_KST(end));
                    }}
                    aria-label="지난 7일 선택"
                  >
                    지난 7일
                  </button>

                  <button
                    onClick={fetchLive}
                    className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 col-span-1"
                    disabled={doing.live || invalidRange}
                  >
                    {doing.live ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        조회 중...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4" />
                        조회
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (!live) return;
                      const header = [
                        "기간",
                        "매출",
                        "환불",
                        "순익",
                        "주문수",
                        "신청수",
                        "패키지수",
                      ];
                      const rows = [
                        [
                          `${live.range.from} ~ ${live.range.to}`,
                          live.totals?.paid || 0,
                          live.totals?.refund || 0,
                          live.totals?.net || 0,
                          live.breakdown?.orders || 0,
                          live.breakdown?.applications || 0,
                          live.breakdown?.packages || 0,
                        ],
                      ];
                      const lines = [header, ...rows].map((r) => r.join(",")).join("\r\n");
                      const csv = "\ufeff" + lines;
                      const blob = new Blob([csv], {
                        type: "text/csv;charset=utf-8;",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      const fileName = makeCsvFilename(
                        `도깨비테니스_정산실시간_${live.range.from}~${live.range.to}`,
                      );
                      a.download = fileName;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    disabled={!live || invalidRange}
                    className="px-4 py-2.5 rounded-xl border-2 border-border bg-card hover:bg-muted dark:hover:bg-card transition-[background-color,box-shadow] text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow col-span-1"
                  >
                    <FileDown className="w-4 h-4" />
                    CSV
                  </button>
                </div>

                <div
                  className={cn(
                    "flex items-center gap-2 bg-muted rounded-lg px-3 py-2 w-fit",
                    adminTypography.caption,
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="font-medium">KST 기준 합산</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {live && (
            <Card className={cn(adminSurface.tableCard, "overflow-visible")}>
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  <div className="bg-muted border-b border-border">
                    <div
                      className="grid gap-4 p-5 text-sm font-semibold text-foreground"
                      style={{
                        gridTemplateColumns: "1fr 120px 120px 120px 100px 100px 100px",
                      }}
                    >
                      <div className="text-center">기간</div>
                      <div className="text-center tabular-nums">온라인 결제금액</div>
                      <div className="text-center tabular-nums">환불금액</div>
                      <div className="text-center tabular-nums">순매출</div>
                      <div className="text-center tabular-nums">주문 건수</div>
                      <div className="text-center tabular-nums">스트링 신청 건수</div>
                      <div className="text-center tabular-nums">패키지 건수</div>
                    </div>
                  </div>
                  <div
                    className="grid gap-4 p-5 border-b border-border hover:bg-muted/70 transition-colors"
                    style={{
                      gridTemplateColumns: "1fr 120px 120px 120px 100px 100px 100px ",
                    }}
                  >
                    <div className="text-sm font-medium text-foreground text-center flex items-center justify-center">
                      {live.range.from} ~ {live.range.to}
                    </div>
                    <div className="flex items-center justify-end whitespace-nowrap text-right tabular-nums text-sm text-foreground">
                      {(live.totals?.paid || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center justify-end whitespace-nowrap text-right tabular-nums text-sm text-foreground">
                      {(live.totals?.refund || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center justify-end whitespace-nowrap text-right tabular-nums text-sm font-bold text-primary">
                      {(live.totals?.net || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center justify-end whitespace-nowrap text-right tabular-nums text-sm text-foreground">
                      {live.breakdown?.orders || 0}
                    </div>
                    <div className="flex items-center justify-end whitespace-nowrap text-right tabular-nums text-sm text-foreground">
                      {live.breakdown?.applications || 0}
                    </div>
                    <div className="flex items-center justify-end whitespace-nowrap text-right tabular-nums text-sm text-foreground">
                      {live.breakdown?.packages || 0}
                    </div>
                  </div>
                  <div
                    className="grid gap-4 p-5 bg-muted"
                    style={{
                      gridTemplateColumns: "1fr 120px 120px 120px 100px 100px 100px",
                    }}
                  >
                    <div className="text-sm font-bold text-foreground text-center flex items-center justify-center">
                      총계
                    </div>
                    <div className="flex items-center justify-end whitespace-nowrap text-right tabular-nums text-sm font-bold text-foreground">
                      {(live.totals?.paid || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center justify-end whitespace-nowrap text-right tabular-nums text-sm font-bold text-foreground">
                      {(live.totals?.refund || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center justify-end whitespace-nowrap text-right tabular-nums text-sm font-bold text-foreground">
                      {(live.totals?.net || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center justify-end whitespace-nowrap text-right tabular-nums text-sm font-bold text-foreground">
                      {live.breakdown?.orders || 0}
                    </div>
                    <div className="flex items-center justify-end whitespace-nowrap text-right tabular-nums text-sm font-bold text-foreground">
                      {live.breakdown?.applications || 0}
                    </div>
                    <div className="flex items-center justify-end whitespace-nowrap text-right tabular-nums text-sm text-foreground">
                      {live.breakdown?.packages || 0}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {renderOfflineReference(live?.offline)}
        </div>
      )}
      <AdminConfirmDialog
        open={pendingDeleteAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteAction(null);
        }}
        onCancel={() => setPendingDeleteAction(null)}
        onConfirm={async () => {
          const action = pendingDeleteAction;
          if (!action) return;
          setPendingDeleteAction(null);
          if (action.type === "bulk") {
            await deleteSelected();
            return;
          }
          if (action.yyyymm) {
            await deleteSingle(action.yyyymm);
          }
        }}
        severity="danger"
        title={
          pendingDeleteAction?.type === "bulk"
            ? "선택한 스냅샷을 삭제할까요?"
            : "스냅샷을 삭제할까요?"
        }
        description={
          pendingDeleteAction?.type === "bulk"
            ? `선택한 ${pendingDeleteAction?.count ?? 0}개의 스냅샷을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.`
            : `${pendingDeleteAction?.yyyymm ?? "-"} 스냅샷을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.`
        }
        confirmText="삭제"
        cancelText="취소"
        eventKey={
          pendingDeleteAction?.type === "bulk"
            ? "admin-settlements-bulk-delete-confirm"
            : "admin-settlements-delete-confirm"
        }
        eventMeta={
          pendingDeleteAction?.type === "bulk"
            ? {
                count: pendingDeleteAction?.count,
                yyyymms: Array.from(selectedSnapshots),
              }
            : { yyyymm: pendingDeleteAction?.yyyymm }
        }
      />
    </AdminPageShell>
  );
}
