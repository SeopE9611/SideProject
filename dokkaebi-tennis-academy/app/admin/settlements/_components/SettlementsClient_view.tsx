'use client';

/** Responsibility: 정산 화면 표현 + 상호작용 오케스트레이션 뷰. */

import useSWR from 'swr';
import { useEffect, useMemo, useState } from 'react';
import { showErrorToast, showSuccessToast, showInfoToast } from '@/lib/toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileDown, RefreshCw, CheckCircle2, AlertTriangle, Loader2, Calendar, TrendingUp, Package, DollarSign, TrendingDown, Activity, Trash2, ArrowUpDown, ArrowUp, ArrowDown, BarChartBig as ChartBar, MoreHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatKRWCard, formatKRWFull } from '@/lib/money';
import KpiCard from '@/app/admin/settlements/_components/KpiCard';
import type { SettlementDiff, SettlementLiveResponse, SettlementSnapshot } from '@/types/admin/settlements';
import { adminFetcher, adminMutator, ensureAdminMutationSucceeded } from '@/lib/admin/adminFetcher';
import { runAdminActionWithToast } from '@/lib/admin/adminActionHelpers';
import { useInitialYyyymmFromQuery } from './hooks/useInitialYyyymmFromQuery';
import { firstDayOfMonth_KST, fmtYMD_KST, monthEdges, prevMonthRange_KST, TZ } from './filters/settlementDateFilters';
import { sortSettlementRows, type SortDirection, type SortField } from './table/settlementSort';
import { makeCsvFilename } from '@/app/admin/settlements/_lib/settlementExport';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import { buildAllSettlementSelection, getSettlementCacheKey, isSettlementMatched, toggleYyyymmSelection, validateYyyymmClient } from './utils/settlementClientTransforms';

export default function SettlementsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ──────────────────────────────────────────────────────────
  // 상태
  // ──────────────────────────────────────────────────────────
  const [yyyymm, setYyyymm] = useState<string>(() => fmtYMD_KST().slice(0, 7).replace('-', '')); // KST 기준 초기 yyyymm
  const { data, mutate, isLoading } = useSWR<SettlementSnapshot[]>('/api/admin/settlements', adminFetcher);

  // URL 쿼리로 월을 지정하면(예: /admin/settlements?yyyymm=202601) 초기 선택 월을 그 값으로 맞춘다.
  // - 운영함 → 정산 "바로가기"에서 추천 월을 함께 전달할 때 월 착오를 줄이기 위함
  useInitialYyyymmFromQuery(searchParams, setYyyymm);
  const [tab, setTab] = useState<'snapshot' | 'live'>('snapshot');

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
  const [doing, setDoing] = useState<{ create?: boolean; rebuild?: string; live?: boolean }>({});

  // 검증 결과: yyyymm → { live, snap }
  const [diffMap, setDiffMap] = useState<Record<string, SettlementDiff>>({});

  // 팝오버 열림 상태: yyyymm → boolean
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  // 상태 배지
  const [staleMap, setStaleMap] = useState<Record<string, boolean>>({});
  const [statusMap, setStatusMap] = useState<Record<string, 'ok' | 'stale' | 'checking'>>({});

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
  const [pendingDeleteAction, setPendingDeleteAction] = useState<null | { type: 'single' | 'bulk'; yyyymm?: string; count?: number }>(null);

  // 액션 드롭다운 열림 상태
  // const [actionMenuOpen, setActionMenuOpen] = useState<Record<string, boolean>>({}) // CHANGE: Remove actionMenuOpen state as it's not needed
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // 축약(기본) ↔ 원단위 토글 상태
  const [compact, setCompact] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem('settlements.kpi.compact');
    return saved === null ? true : saved === '1';
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('settlements.kpi.compact', compact ? '1' : '0');
    }
  }, [compact]);

  // 공용 표시 함수
  const displayKRW = (n: number) => (compact ? formatKRWCard(n) : formatKRWFull(n));

  // ──────────────────────────────────────────────────────────
  // 서버 액션
  // ──────────────────────────────────────────────────────────
  const createSnapshot = async () => {
    const result = await runAdminActionWithToast({
      action: () => adminMutator(`/api/admin/settlements/${yyyymm}`, { method: 'POST' }),
      successMessage: `${yyyymm} 스냅샷 생성 완료`,
      fallbackErrorMessage: '스냅샷 생성 실패',
    });
    if (result) await mutate();
  };

  async function rebuildSnapshot(yyyymm: string) {
    const result = await runAdminActionWithToast({
      action: () => adminMutator(`/api/admin/settlements/${yyyymm}`, { method: 'POST' }),
      fallbackErrorMessage: '스냅샷 재생성 실패',
    });
    return result;
  }

  async function fetchLive() {
    if (invalidRange) {
      showErrorToast('시작일이 종료일보다 늦습니다. 날짜를 다시 선택해 주세요.');
      return;
    }
    const q = new URLSearchParams({ from, to }).toString();
    const liveJson = await adminFetcher<SettlementLiveResponse>(`/api/admin/settlements/live?${q}`, { cache: 'no-store' });
    setLive(liveJson);
  }

  // 스냅샷 vs 실시간 비교(한 행)
  async function checkStalenessOfRow(row: SettlementSnapshot) {
    const key = String(row.yyyymm);
    const { from, to } = monthEdges(key);

    // 같은 달의 실시간 집계 호출
    const liveJson = await adminFetcher<SettlementLiveResponse>(`/api/admin/settlements/live?from=${from}&to=${to}`, { cache: 'no-store' });

    return { ok: isSettlementMatched(row, liveJson as SettlementLiveResponse), live: liveJson };
  }

  // 전체 검증
  async function validateAll(rows: SettlementSnapshot[]) {
    setBulkChecking(true);
    try {
      for (const row of rows) {
        const key = String(row.yyyymm);
        setStatusMap((prev) => ({ ...prev, [key]: 'checking' }));
        const { ok } = await checkStalenessOfRow(row);
        setStatusMap((prev) => ({ ...prev, [key]: ok ? 'ok' : 'stale' }));
        setStaleMap((prev) => ({ ...prev, [key]: !ok }));
        sessionStorage.setItem(getSettlementCacheKey(row), ok ? 'ok' : 'stale');
      }
      showSuccessToast('전체 검증 완료');
    } catch (e) {
      console.error(e);
      showErrorToast('전체 검증 중 오류가 발생했습니다.');
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
      showInfoToast('삭제할 항목을 선택하세요.');
      return;
    }

    try {
      setDeleting(true);
      const json = await runAdminActionWithToast<{ success?: boolean; message?: string }>({
        action: async () => {
          const payload = await adminMutator<{ success?: boolean; message?: string }>('/api/admin/settlements/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ yyyymms: Array.from(selectedSnapshots) }),
          });
          ensureAdminMutationSucceeded(payload, '삭제 실패');
          return payload;
        },
        successMessage: '삭제가 완료되었습니다.',
        fallbackErrorMessage: '삭제 중 오류가 발생했습니다.',
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
      const json = await runAdminActionWithToast<{ success?: boolean; message?: string }>({
        action: async () => {
          const payload = await adminMutator<{ success?: boolean; message?: string }>(`/api/admin/settlements/${yyyymm}`, { method: 'DELETE' });
          ensureAdminMutationSucceeded(payload, '삭제 실패');
          return payload;
        },
        successMessage: '삭제가 완료되었습니다.',
        fallbackErrorMessage: '삭제 중 오류가 발생했습니다.',
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
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      // 다른 필드 클릭: asc로 시작
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 정렬된 데이터
  const sortedData = () => sortSettlementRows(data, sortField, sortDirection);

  // 정렬 아이콘 렌더링
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-3.5 h-3.5 text-primary" />;
    }
    return <ArrowDown className="w-3.5 h-3.5 text-primary" />;
  };

  // 세션 캐시 → 초기 상태 프리필(재방문 최적화)
  useEffect(() => {
    if (!data?.length) return;
    const nextStatus: Record<string, 'ok' | 'stale'> = {};
    const nextStale: Record<string, boolean> = {};
    for (const row of data) {
      const key = String(row.yyyymm);
      const cached = sessionStorage.getItem(getSettlementCacheKey(row));
      if (cached === 'ok' || cached === 'stale') {
        nextStatus[key] = cached as 'ok' | 'stale';
        nextStale[key] = cached === 'stale';
      }
    }
    if (Object.keys(nextStatus).length) setStatusMap((prev) => ({ ...nextStatus, ...prev }));
    if (Object.keys(nextStale).length) setStaleMap((prev) => ({ ...nextStale, ...prev }));
  }, [data]);

  // 스냅샷 CSV 다운로드
  const downloadCSV = () => {
    const rows = sortedData() ?? [];
    const header = ['월(YYYYMM)', '매출', '환불', '순익', '주문수', '신청수', '패키지수'];
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
    const minYm = yyyymms.length ? yyyymms[yyyymms.length - 1] : 'YYYYMM';
    const maxYm = yyyymms.length ? yyyymms[0] : 'YYYYMM';

    // CRLF + UTF-8 BOM
    const lines = [header, ...csvRows].map((a) => a.join(',')).join('\r\n');
    const csv = '\ufeff' + lines;

    const fileName = makeCsvFilename(`도깨비테니스_정산스냅샷_${minYm}-${maxYm}`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRevenue = (data ?? []).reduce((sum: number, row) => sum + (row.totals?.paid || 0), 0);
  const totalRefunds = (data ?? []).reduce((sum: number, row) => sum + (row.totals?.refund || 0), 0);
  const totalNet = (data ?? []).reduce((sum: number, row) => sum + (row.totals?.net || 0), 0);
  const totalRentalDeposit = (data ?? []).reduce((sum: number, row) => sum + (row.totals?.rentalDeposit || 0), 0);
  const totalSettlements = (data ?? []).length;

  // ──────────────────────────────────────────────────────────
  // UI
  // ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-lg dark:bg-primary/20">
              <ChartBar className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">정산 관리</h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-lg text-muted-foreground">월별 정산 스냅샷 및 실시간 집계를 관리하고 분석하세요</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* 전체 정산 월 (기존 카드 유지) */}
          <Card className="border-0 bg-card/80 shadow-xl backdrop-blur-sm transition-all duration-200 hover:shadow-2xl hover:scale-105 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">전체 정산 월</p>
                  <p className="text-3xl font-bold text-foreground">{isLoading ? <span className="inline-block h-9 w-16 rounded bg-muted/70 animate-pulse" /> : totalSettlements}</p>
                </div>
                <div className="bg-muted rounded-xl p-3 border border-border">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 총 매출 */}
          <KpiCard
            label="총 매출"
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
            label="총 환불"
            value={totalRefunds ?? 0}
            storageKey="settlements.kpi.compact.refund"
            formatCompact={formatKRWCard}
            icon={<TrendingDown className="h-6 w-6 text-destructive" />}
            isLoading={isLoading}
            hint={true}
            skeletonWidthClass="w-24"
          />

          {/* 순익 */}
          <KpiCard
            label="순익"
            value={totalNet ?? 0}
            storageKey="settlements.kpi.compact.net"
            formatCompact={formatKRWCard}
            icon={<Activity className="h-6 w-6 text-primary" />}
            isLoading={isLoading}
            hint={true}
            skeletonWidthClass="w-28"
          />
        </div>

        <div className="border-b bg-card/80 backdrop-blur-sm rounded-t-2xl shadow-lg overflow-x-auto">
          <div className="px-4 sm:px-6 flex gap-1 min-w-max">
            <button
              onClick={() => setTab('snapshot')}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold transition-all relative whitespace-nowrap ${ tab === 'snapshot' ? 'text-primary' : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground' }`}
            >
              스냅샷 관리
              {tab === 'snapshot' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
            </button>
            <button
              onClick={async () => {
                setTab('live');
                try {
                  setDoing((d) => ({ ...d, live: true }));
                  await fetchLive();
                } finally {
                  setDoing((d) => ({ ...d, live: false }));
                }
              }}
              disabled={doing.live}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold transition-all relative whitespace-nowrap ${ tab === 'live' ? 'text-primary' : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground' }`}
            >
              실시간 조회
              {tab === 'live' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
            </button>
          </div>
        </div>

        {/* 스냅샷 탭 */}
        {tab === 'snapshot' && (
          <div className="space-y-6">
            <Card className="border-0 bg-card/80 shadow-xl backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4">
                  <div className="w-full">
                    <label className="block text-sm font-semibold mb-2 text-foreground">대상 월 (YYYYMM)</label>
                    <input
                      value={yyyymm}
                      onChange={(e) => setYyyymm(e.target.value.replace(/[^0-9]/g, ''))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createSnapshot();
                      }}
                      maxLength={6}
                      inputMode="numeric"
                      placeholder="202510"
                      className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-card transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
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
                      className="px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

                    <button onClick={downloadCSV} className="px-4 py-3 rounded-xl border-2 border-border bg-card hover:bg-muted dark:hover:bg-card transition-all text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow">
                      <FileDown className="w-4 h-4" />
                      CSV 다운로드
                    </button>

                    <button
                      onClick={async () => {
                        const fresh = await mutate();
                        await validateAll(fresh ?? []);
                      }}
                      disabled={bulkChecking || !data?.length}
                      className="px-4 py-3 rounded-xl border-2 border-border bg-card hover:bg-muted dark:hover:bg-card transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow"
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
                      onClick={() => setPendingDeleteAction({ type: 'bulk', count: selectedSnapshots.size })}
                      disabled={deleting || selectedSnapshots.size === 0}
                      className="px-4 py-3 rounded-xl border-2 border-destructive/40 bg-card hover:bg-destructive/10 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow text-destructive"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          삭제 중...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">선택 삭제</span> ({selectedSnapshots.size})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/80 shadow-xl backdrop-blur-sm overflow-visible max-w-6xl mx-auto">
              {/* 데스크탑 */}
              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-[980px]">
                  <div className="sticky top-0 z-10 backdrop-blur-sm bg-muted border-b border-border">
                    <div
                      className="grid gap-3 p-5 text-sm font-semibold text-foreground"
                      style={{
                        gridTemplateColumns: '40px 90px 110px 110px 110px 90px 90px 90px 110px 40px',
                      }}
                    >
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedSnapshots.size === (data ?? []).length && (data ?? []).length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                          aria-label="전체 선택"
                        />
                      </div>
                      <div className="text-center">월</div>
                      <button onClick={() => toggleSort('paid')} className="text-center tabular-nums flex items-center justify-center gap-1 hover:text-primary transition-colors">
                        매출
                        {renderSortIcon('paid')}
                      </button>
                      <button onClick={() => toggleSort('refund')} className="text-center tabular-nums flex items-center justify-center gap-1 hover:text-primary transition-colors">
                        환불
                        {renderSortIcon('refund')}
                      </button>
                      <button onClick={() => toggleSort('net')} className="text-center tabular-nums flex items-center justify-center gap-1 hover:text-primary transition-colors">
                        순익
                        {renderSortIcon('net')}
                      </button>
                      <button onClick={() => toggleSort('orders')} className="text-center tabular-nums flex items-center justify-center gap-1 hover:text-primary transition-colors">
                        주문수
                        {renderSortIcon('orders')}
                      </button>
                      <button onClick={() => toggleSort('applications')} className="text-center tabular-nums flex items-center justify-center gap-1 hover:text-primary transition-colors">
                        신청수
                        {renderSortIcon('applications')}
                      </button>
                      <button onClick={() => toggleSort('packages')} className="text-center tabular-nums flex items-center justify-center gap-1 hover:text-primary transition-colors">
                        패키지수
                        {renderSortIcon('packages')}
                      </button>

                      <div className="text-center">상태</div>
                      <div className="text-center">액션</div>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="divide-y divide-border">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="grid gap-3 p-5 animate-pulse" style={{ gridTemplateColumns: '56px 90px 110px 110px 110px 90px 90px 90px 90px 56px' }}>
                          <div className="h-5 bg-muted rounded" />
                          <div className="h-5 bg-muted rounded" />
                          <div className="h-5 bg-muted rounded" />
                          <div className="h-5 bg-muted rounded" />
                          <div className="h-5 bg-muted rounded" />
                          <div className="h-5 bg-muted rounded" />
                          <div className="h-5 bg-muted rounded" />
                          <div className="h-5 bg-muted rounded" />
                          <div className="h-5 bg-muted rounded" />
                          <div className="h-5 bg-muted rounded" />
                        </div>
                      ))}
                    </div>
                  ) : !data || data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                      <div className="bg-muted rounded-full p-4 mb-4">
                        <Package className="w-12 h-12 text-primary" />
                      </div>
                      <p className="text-lg font-semibold text-foreground mb-2">데이터가 없습니다</p>
                      <p className="text-sm text-muted-foreground">위에서 월을 선택하여 스냅샷을 생성하세요</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {(sortedData() ?? []).map((row, idx: number) => (
                        <div key={row.yyyymm}>
                          <div
                            className="grid gap-3 p-5 text-sm font-semibold text-foreground"
                            style={{
                              gridTemplateColumns: '40px 90px 110px 110px 110px 90px 90px 90px 110px 40px',
                            }}
                          >
                            <div className="flex items-center justify-center">
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
                                className="font-semibold text-primary hover:text-foreground hover:underline underline-offset-4 transition-all"
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

                            <div className="text-center tabular-nums text-sm text-foreground flex items-center justify-center">{(row.totals?.paid || 0).toLocaleString()}</div>
                            <div className="text-center tabular-nums text-sm text-foreground flex items-center justify-center">{(row.totals?.refund || 0).toLocaleString()}</div>
                            <div className="text-center tabular-nums text-sm font-bold text-primary flex items-center justify-center">{(row.totals?.net || 0).toLocaleString()}</div>
                            <div className="text-center tabular-nums text-sm text-foreground flex items-center justify-center">{row.breakdown?.orders || 0}</div>
                            <div className="text-center tabular-nums text-sm text-foreground flex items-center justify-center">{row.breakdown?.applications || 0}</div>
                            <div className="text-center tabular-nums text-sm text-foreground flex items-center justify-center">{row.breakdown?.packages || 0}</div>

                            <div className="flex items-center justify-center">
                              {statusMap[String(row.yyyymm)] === 'checking' && (
                                <span className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 bg-muted text-foreground dark:bg-card font-medium border border-border">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  검증 중
                                </span>
                              )}
                              {statusMap[String(row.yyyymm)] === 'ok' && (
                                <span className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 bg-primary/15 text-primary font-medium border border-border">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  최신
                                </span>
                              )}
                              {statusMap[String(row.yyyymm)] === 'stale' && (
                                <span className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 bg-destructive/15 text-destructive font-medium border border-destructive/40">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  갱신 필요
                                </span>
                              )}
                              {!statusMap[String(row.yyyymm)] && <span className="text-xs text-muted-foreground">-</span>}
                            </div>

                            <div className="relative flex items-center justify-center">
                              <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                  <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted dark:hover:bg-card focus:outline-none focus:ring-2 focus:ring-ring" aria-label="작업 메뉴 열기">
                                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                  </button>
                                </DropdownMenuTrigger>

                                <DropdownMenuPortal>
                                  <DropdownMenuContent align="end" sideOffset={8} collisionPadding={8} className="z-[9999] w-44" onCloseAutoFocus={(e) => e.preventDefault()}>
                                    {' '}
                                    <DropdownMenuLabel>작업</DropdownMenuLabel>
                                    <DropdownMenuItem
                                      disabled={doing.rebuild === row.yyyymm}
                                      onSelect={async () => {
                                        try {
                                          setOpenMenuId(null);
                                          setDoing((d) => ({ ...d, rebuild: row.yyyymm }));
                                          await rebuildSnapshot(String(row.yyyymm));
                                          await mutate();
                                          setStatusMap((prev) => ({ ...prev, [String(row.yyyymm)]: 'ok' }));
                                          setStaleMap((prev) => ({ ...prev, [String(row.yyyymm)]: false }));
                                          showSuccessToast(`${row.yyyymm} 스냅샷을 갱신했습니다.`);
                                        } catch (e) {
                                          console.error(e);
                                          showErrorToast('스냅샷 갱신 중 오류가 발생했습니다.');
                                        } finally {
                                          setDoing((d) => ({ ...d, rebuild: undefined }));
                                        }
                                      }}
                                    >
                                      {doing.rebuild === row.yyyymm ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                      갱신
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={async () => {
                                        setOpenMenuId(null);
                                        const key = String(row.yyyymm);
                                        try {
                                          setStatusMap((prev) => ({ ...prev, [key]: 'checking' }));
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
                                          setStatusMap((prev) => ({ ...prev, [key]: ok ? 'ok' : 'stale' }));
                                          setStaleMap((prev) => ({ ...prev, [key]: !ok }));

                                          if (ok) {
                                            showSuccessToast('스냅샷이 현재 집계와 일치합니다.');
                                            setOpenMap((prev) => ({ ...prev, [key]: false }));
                                          } else {
                                            showInfoToast(`변경 감지됨: ${key} 스냅샷과 현재 집계가 다릅니다.`);
                                            setOpenMap((prev) => ({ ...prev, [key]: true }));
                                          }
                                        } catch (e) {
                                          console.error(e);
                                          setStatusMap((prev) => ({ ...prev, [key]: 'stale' }));
                                          showErrorToast('검증 중 오류가 발생했습니다.');
                                        }
                                      }}
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      검증
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onSelect={async () => {
                                        setOpenMenuId(null);
                                        setPendingDeleteAction({ type: 'single', yyyymm: String(row.yyyymm) });
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      삭제
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenuPortal>
                              </DropdownMenu>
                            </div>
                          </div>

                          {openMap[String(row.yyyymm)] && statusMap[String(row.yyyymm)] === 'stale' && diffMap[String(row.yyyymm)] && (
                            <div className="mx-5 mb-5 rounded-2xl border-2 border-destructive/40 bg-destructive/10 shadow-xl max-h-[60vh] overflow-auto overscroll-auto">
                              <div className="p-4 border-b border-destructive/40 bg-card/50 backdrop-blur-sm flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-5 h-5 text-destructive" />
                                  <span className="font-semibold text-sm text-destructive">검증 결과 비교</span>
                                </div>
                                <button
                                  className="text-xs text-muted-foreground hover:text-foreground dark:hover:text-foreground transition-colors font-medium"
                                  onClick={() =>
                                    setOpenMap((prev) => ({
                                      ...prev,
                                      [String(row.yyyymm)]: false,
                                    }))
                                  }
                                >
                                  닫기
                                </button>
                              </div>

                              <div className="p-5">
                                <div className="rounded-xl border-2 border-destructive/40 overflow-hidden bg-card shadow-sm">
                                  <div className="grid grid-cols-7 gap-4 p-4 bg-destructive/10 text-xs font-semibold border-b border-destructive/40 text-destructive">
                                    <div></div>
                                    <div className="text-right">매출</div>
                                    <div className="text-right">환불</div>
                                    <div className="text-right">순익</div>
                                    <div className="text-right">주문수</div>
                                    <div className="text-right">신청수</div>
                                    <div className="text-right">패키지수</div>
                                  </div>
                                  <div className="grid grid-cols-7 gap-4 p-4 border-b border-border hover:bg-muted/50 dark:hover:bg-card/50 transition-colors">
                                    <div className="text-xs text-muted-foreground font-semibold">스냅샷</div>
                                    <div className="text-right tabular-nums text-sm text-foreground">{diffMap[String(row.yyyymm)]!.snap.paid.toLocaleString()}</div>
                                    <div className="text-right tabular-nums text-sm text-foreground">{diffMap[String(row.yyyymm)]!.snap.refund.toLocaleString()}</div>
                                    <div className="text-right tabular-nums text-sm font-bold text-foreground">{diffMap[String(row.yyyymm)]!.snap.net.toLocaleString()}</div>
                                    <div className="text-right tabular-nums text-sm text-foreground">{diffMap[String(row.yyyymm)]!.snap.orders}</div>
                                    <div className="text-right tabular-nums text-sm text-foreground">{diffMap[String(row.yyyymm)]!.snap.applications}</div>
                                    <div className="text-right tabular-nums text-sm text-foreground">{diffMap[String(row.yyyymm)]!.snap.packages}</div>
                                  </div>
                                  <div className="grid grid-cols-7 gap-4 p-4 hover:bg-muted/50 dark:hover:bg-card/50 transition-colors">
                                    <div className="text-xs text-muted-foreground font-semibold">실시간</div>
                                    <div className="text-right tabular-nums text-sm text-foreground">{diffMap[String(row.yyyymm)]!.live.paid.toLocaleString()}</div>
                                    <div className="text-right tabular-nums text-sm text-foreground">{diffMap[String(row.yyyymm)]!.live.refund.toLocaleString()}</div>
                                    <div className="text-right tabular-nums text-sm font-bold text-foreground">{diffMap[String(row.yyyymm)]!.live.net.toLocaleString()}</div>
                                    <div className="text-right tabular-nums text-sm text-foreground">{diffMap[String(row.yyyymm)]!.live.orders}</div>
                                    <div className="text-right tabular-nums text-sm text-foreground">{diffMap[String(row.yyyymm)]!.live.applications}</div>
                                    <div className="text-right tabular-nums text-sm text-foreground">{diffMap[String(row.yyyymm)]!.live.packages}</div>
                                  </div>
                                </div>

                                <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-destructive/15 border-2 border-destructive/40">
                                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                                  <span className="text-sm text-destructive flex-1 font-medium">값이 다릅니다. '지금 갱신'을 눌러 스냅샷을 업데이트 하세요.</span>
                                  <button
                                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
                                    disabled={doing.rebuild === row.yyyymm}
                                    onClick={async () => {
                                      try {
                                        setDoing((d) => ({ ...d, rebuild: row.yyyymm }));
                                        await rebuildSnapshot(String(row.yyyymm));
                                        await mutate();
                                        setStatusMap((prev) => ({
                                          ...prev,
                                          [String(row.yyyymm)]: 'ok',
                                        }));
                                        setStaleMap((prev) => ({
                                          ...prev,
                                          [String(row.yyyymm)]: false,
                                        }));
                                        setOpenMap((prev) => ({ ...prev, [String(row.yyyymm)]: false }));
                                        showSuccessToast(`${row.yyyymm} 스냅샷을 갱신했습니다.`);
                                      } catch (e) {
                                        console.error(e);
                                        showErrorToast('스냅샷 갱신 중 오류가 발생했습니다.');
                                      } finally {
                                        setDoing((d) => ({ ...d, rebuild: undefined }));
                                      }
                                    }}
                                  >
                                    {doing.rebuild === row.yyyymm ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        갱신 중...
                                      </>
                                    ) : (
                                      <>
                                        <RefreshCw className="w-4 h-4" />
                                        지금 갱신
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* 모바일 */}
              <div className="md:hidden px-3 py-3 space-y-3">
                {!isLoading && data && data.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                    <input type="checkbox" checked={selectedSnapshots.size === data.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-border text-primary focus:ring-ring cursor-pointer" aria-label="전체 선택" />
                    <span className="text-sm font-medium text-foreground">전체 선택</span>
                  </div>
                )}

                {isLoading ? (
                  [...Array(3)].map((_, i) => <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm animate-pulse h-32" />)
                ) : !data || data.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-6 text-center">
                    <div className="bg-muted rounded-full p-4 mb-4 inline-flex">
                      <Package className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">데이터가 없습니다</p>
                    <p className="text-xs text-muted-foreground">위에서 월을 선택하여 스냅샷을 생성하세요</p>
                  </div>
                ) : (
                  (sortedData() ?? []).map((row) => (
                    <div key={row.yyyymm} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedSnapshots.has(String(row.yyyymm))}
                            onChange={() => toggleSelect(String(row.yyyymm))}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                            aria-label={`${row.yyyymm} 선택`}
                          />
                          <button
                            className="font-semibold text-primary hover:underline underline-offset-4"
                            onClick={() => {
                              const { from, to } = monthEdges(String(row.yyyymm));
                              router.push(`/admin/orders?from=${from}&to=${to}`);
                            }}
                            aria-label={`${row.yyyymm} 월 상세로 이동`}
                          >
                            {row.yyyymm}
                          </button>
                        </div>

                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted dark:hover:bg-card focus:outline-none focus:ring-2 focus:ring-ring" aria-label="작업 메뉴 열기">
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end" sideOffset={8} className="z-[1000] w-44" onCloseAutoFocus={(e) => e.preventDefault()}>
                            {' '}
                            <DropdownMenuLabel>작업</DropdownMenuLabel>
                            <DropdownMenuItem
                              disabled={doing.rebuild === row.yyyymm}
                              onSelect={async () => {
                                setOpenMenuId(null);
                                try {
                                  setDoing((d) => ({ ...d, rebuild: row.yyyymm }));
                                  await rebuildSnapshot(String(row.yyyymm));
                                  await mutate();
                                  setStatusMap((prev) => ({ ...prev, [String(row.yyyymm)]: 'ok' }));
                                  setStaleMap((prev) => ({ ...prev, [String(row.yyyymm)]: false }));
                                  showSuccessToast(`${row.yyyymm} 스냅샷을 갱신했습니다.`);
                                } finally {
                                  setDoing((d) => ({ ...d, rebuild: undefined }));
                                }
                              }}
                            >
                              {doing.rebuild === row.yyyymm ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                              갱신
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={async () => {
                                setOpenMenuId(null);
                                const key = String(row.yyyymm);
                                try {
                                  setStatusMap((prev) => ({ ...prev, [key]: 'checking' }));
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
                                  setStatusMap((prev) => ({ ...prev, [key]: ok ? 'ok' : 'stale' }));
                                  setStaleMap((prev) => ({ ...prev, [key]: !ok }));
                                  if (ok) {
                                    showSuccessToast('스냅샷이 현재 집계와 일치합니다.');
                                  } else {
                                    showInfoToast(`변경 감지됨: ${key} 스냅샷과 현재 집계가 다릅니다.`);
                                  }
                                  setOpenMap((prev) => ({ ...prev, [key]: !ok }));
                                } catch {
                                  setStatusMap((prev) => ({ ...prev, [key]: 'stale' }));
                                  showErrorToast('검증 중 오류가 발생했습니다.');
                                }
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              검증
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={async () => {
                                setOpenMenuId(null);
                                setPendingDeleteAction({ type: 'single', yyyymm: String(row.yyyymm) });
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">매출</div>
                        <div className="text-right tabular-nums text-foreground">{(row.totals?.paid || 0).toLocaleString()}</div>

                        <div className="text-muted-foreground">환불</div>
                        <div className="text-right tabular-nums text-foreground">{(row.totals?.refund || 0).toLocaleString()}</div>

                        <div className="text-muted-foreground">순익</div>
                        <div className="text-right tabular-nums font-semibold text-primary">{(row.totals?.net || 0).toLocaleString()}</div>

                        <div className="text-muted-foreground">주문수</div>
                        <div className="text-right tabular-nums text-foreground">{row.breakdown?.orders || 0}</div>

                        <div className="text-muted-foreground">신청수</div>
                        <div className="text-right tabular-nums text-foreground">{row.breakdown?.applications || 0}</div>

                        <div className="text-muted-foreground">패키지수</div>
                        <div className="text-right tabular-nums text-foreground">{row.breakdown?.packages || 0}</div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-border">
                        {statusMap[String(row.yyyymm)] === 'checking' && (
                          <span className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 bg-muted text-foreground dark:bg-card font-medium border border-border">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            검증 중
                          </span>
                        )}
                        {statusMap[String(row.yyyymm)] === 'ok' && (
                          <span className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 bg-primary/15 text-primary font-medium border border-border">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            최신
                          </span>
                        )}
                        {statusMap[String(row.yyyymm)] === 'stale' && (
                          <span className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 bg-destructive/15 text-destructive font-medium border border-destructive/40">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            갱신 필요
                          </span>
                        )}
                        {!statusMap[String(row.yyyymm)] && <span className="text-xs text-muted-foreground">-</span>}
                      </div>

                      {openMap[String(row.yyyymm)] && statusMap[String(row.yyyymm)] === 'stale' && diffMap[String(row.yyyymm)] && (
                        <div className="mt-4 rounded-xl border-2 border-destructive/40 bg-destructive/10 overflow-hidden">
                          <div className="p-3 border-b border-destructive/40 bg-card/50 backdrop-blur-sm flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                              <span className="font-semibold text-xs text-destructive">검증 결과 비교</span>
                            </div>
                            <button className="text-xs text-muted-foreground hover:text-foreground dark:hover:text-foreground transition-colors font-medium" onClick={() => setOpenMap((prev) => ({ ...prev, [String(row.yyyymm)]: false }))}>
                              닫기
                            </button>
                          </div>

                          <div className="p-3 space-y-2">
                            <div className="text-xs font-semibold text-destructive mb-2">스냅샷</div>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                              <div className="text-muted-foreground">매출</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.snap.paid.toLocaleString()}</div>
                              <div className="text-muted-foreground">환불</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.snap.refund.toLocaleString()}</div>
                              <div className="text-muted-foreground">순익</div>
                              <div className="text-right tabular-nums font-semibold">{diffMap[String(row.yyyymm)]!.snap.net.toLocaleString()}</div>
                              <div className="text-muted-foreground">주문수</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.snap.orders}</div>
                              <div className="text-muted-foreground">신청수</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.snap.applications}</div>
                              <div className="text-muted-foreground">패키지수</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.snap.packages}</div>
                            </div>

                            <div className="text-xs font-semibold text-destructive mb-2">실시간</div>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                              <div className="text-muted-foreground">매출</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.live.paid.toLocaleString()}</div>
                              <div className="text-muted-foreground">환불</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.live.refund.toLocaleString()}</div>
                              <div className="text-muted-foreground">순익</div>
                              <div className="text-right tabular-nums font-semibold">{diffMap[String(row.yyyymm)]!.live.net.toLocaleString()}</div>
                              <div className="text-muted-foreground">주문수</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.live.orders}</div>
                              <div className="text-muted-foreground">신청수</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.live.applications}</div>
                              <div className="text-muted-foreground">패키지수</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.live.packages}</div>
                            </div>

                            <button
                              className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              disabled={doing.rebuild === row.yyyymm}
                              onClick={async () => {
                                try {
                                  setDoing((d) => ({ ...d, rebuild: row.yyyymm }));
                                  await rebuildSnapshot(String(row.yyyymm));
                                  await mutate();
                                  setStatusMap((prev) => ({ ...prev, [String(row.yyyymm)]: 'ok' }));
                                  setStaleMap((prev) => ({ ...prev, [String(row.yyyymm)]: false }));
                                  setOpenMap((prev) => ({ ...prev, [String(row.yyyymm)]: false }));
                                  showSuccessToast(`${row.yyyymm} 스냅샷을 갱신했습니다.`);
                                } finally {
                                  setDoing((d) => ({ ...d, rebuild: undefined }));
                                }
                              }}
                            >
                              {doing.rebuild === row.yyyymm ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  갱신 중...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4" />
                                  지금 갱신
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* 실시간 탭 */}
        {tab === 'live' && (
          <div className="space-y-6">
            <Card className="border-0 bg-card/80 shadow-xl backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-foreground">시작일</label>
                      <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-card transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-foreground">종료일</label>
                      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ring focus:border-transparent bg-card transition-all" />
                    </div>
                    {invalidRange && <p className="text-sm text-destructive mt-1">시작일이 종료일보다 늦습니다. 날짜를 다시 선택해 주세요.</p>}{' '}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    <button
                      className="px-3 sm:px-4 py-2.5 border-2 border-border rounded-xl text-sm font-semibold hover:bg-muted dark:hover:bg-card transition-all shadow-sm hover:shadow"
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
                      className="px-3 sm:px-4 py-2.5 border-2 border-border rounded-xl text-sm font-semibold hover:bg-muted dark:hover:bg-card transition-all shadow-sm hover:shadow"
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
                      className="px-3 sm:px-4 py-2.5 border-2 border-border rounded-xl text-sm font-semibold hover:bg-muted dark:hover:bg-card transition-all shadow-sm hover:shadow"
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
                      className="px-3 sm:px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 col-span-2 sm:col-span-1"
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
                        const header = ['기간', '매출', '환불', '순익', '주문수', '신청수', '패키지수'];
                        const rows = [[`${live.range.from} ~ ${live.range.to}`, live.totals?.paid || 0, live.totals?.refund || 0, live.totals?.net || 0, live.breakdown?.orders || 0, live.breakdown?.applications || 0, live.breakdown?.packages || 0]];
                        const lines = [header, ...rows].map((r) => r.join(',')).join('\r\n');
                        const csv = '\ufeff' + lines;
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        const fileName = makeCsvFilename(`도깨비테니스_정산실시간_${live.range.from}~${live.range.to}`);
                        a.download = fileName;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      disabled={!live || invalidRange}
                      className="px-3 sm:px-4 py-2.5 rounded-xl border-2 border-border bg-card hover:bg-muted dark:hover:bg-card transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow col-span-2 sm:col-span-1"
                    >
                      <FileDown className="w-4 h-4" />
                      CSV
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 w-fit">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="font-medium">KST 기준 합산</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {live && (
              <Card className="border-0 bg-card/80 shadow-xl backdrop-blur-sm overflow-visible">
                <div className="hidden md:block overflow-x-auto">
                  <div className="min-w-[640px]">
                    <div className="bg-muted border-b border-border">
                      <div className="grid gap-4 p-5 text-sm font-semibold text-foreground" style={{ gridTemplateColumns: '1fr 120px 120px 120px 100px 100px 100px' }}>
                        <div className="text-center">기간</div>
                        <div className="text-center tabular-nums">매출</div>
                        <div className="text-center tabular-nums">환불</div>
                        <div className="text-center tabular-nums">순익</div>
                        <div className="text-center tabular-nums">주문수</div>
                        <div className="text-center tabular-nums">신청수</div>
                        <div className="text-center tabular-nums">패키지수</div>
                      </div>
                    </div>
                    <div className="grid gap-4 p-5 border-b border-border hover:bg-muted/70 transition-colors" style={{ gridTemplateColumns: '1fr 120px 120px 120px 100px 100px 100px ' }}>
                      <div className="text-sm font-medium text-foreground text-center flex items-center justify-center">
                        {live.range.from} ~ {live.range.to}
                      </div>
                      <div className="text-center tabular-nums text-sm text-foreground flex items-center justify-center">{(live.totals?.paid || 0).toLocaleString()}</div>
                      <div className="text-center tabular-nums text-sm text-foreground flex items-center justify-center">{(live.totals?.refund || 0).toLocaleString()}</div>
                      <div className="text-center tabular-nums text-sm font-bold text-primary flex items-center justify-center">{(live.totals?.net || 0).toLocaleString()}</div>
                      <div className="text-center tabular-nums text-sm text-foreground flex items-center justify-center">{live.breakdown?.orders || 0}</div>
                      <div className="text-center tabular-nums text-sm text-foreground flex items-center justify-center">{live.breakdown?.applications || 0}</div>
                      <div className="text-center tabular-nums text-sm text-foreground flex items-center justify-center">{live.breakdown?.packages || 0}</div>
                    </div>
                    <div className="grid gap-4 p-5 bg-muted" style={{ gridTemplateColumns: '1fr 120px 120px 120px 100px 100px 100px' }}>
                      <div className="text-sm font-bold text-foreground text-center flex items-center justify-center">총계</div>
                      <div className="text-center tabular-nums text-sm font-bold text-foreground flex items-center justify-center">{(live.totals?.paid || 0).toLocaleString()}</div>
                      <div className="text-center tabular-nums text-sm font-bold text-foreground flex items-center justify-center">{(live.totals?.refund || 0).toLocaleString()}</div>
                      <div className="text-center tabular-nums text-sm font-bold text-foreground flex items-center justify-center">{(live.totals?.net || 0).toLocaleString()}</div>
                      <div className="text-center tabular-nums text-sm font-bold text-foreground flex items-center justify-center">{live.breakdown?.orders || 0}</div>
                      <div className="text-center tabular-nums text-sm font-bold text-foreground flex items-center justify-center">{live.breakdown?.applications || 0}</div>
                      <div className="text-center tabular-nums text-sm text-foreground flex items-center justify-center">{live.breakdown?.packages || 0}</div>
                    </div>
                  </div>
                </div>

                <div className="md:hidden p-4">
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="text-sm font-semibold text-primary mb-3 text-center">
                      {live.range.from} ~ {live.range.to}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">매출</div>
                      <div className="text-right tabular-nums text-foreground">{(live.totals?.paid || 0).toLocaleString()}</div>

                      <div className="text-muted-foreground">환불</div>
                      <div className="text-right tabular-nums text-foreground">{(live.totals?.refund || 0).toLocaleString()}</div>

                      <div className="text-muted-foreground">순익</div>
                      <div className="text-right tabular-nums font-bold text-primary">{(live.totals?.net || 0).toLocaleString()}</div>

                      <div className="text-muted-foreground">주문수</div>
                      <div className="text-right tabular-nums text-foreground">{live.breakdown?.orders || 0}</div>

                      <div className="text-muted-foreground">신청수</div>
                      <div className="text-right tabular-nums text-foreground">{live.breakdown?.applications || 0}</div>

                      <div className="text-muted-foreground">패키지수</div>
                      <div className="text-right tabular-nums text-foreground">{live.breakdown?.packages || 0}</div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
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
          if (action.type === 'bulk') {
            await deleteSelected();
            return;
          }
          if (action.yyyymm) {
            await deleteSingle(action.yyyymm);
          }
        }}
        severity="danger"
        title={pendingDeleteAction?.type === 'bulk' ? '선택한 스냅샷을 삭제할까요?' : '스냅샷을 삭제할까요?'}
        description={
          pendingDeleteAction?.type === 'bulk' ? `선택한 ${pendingDeleteAction?.count ?? 0}개의 스냅샷을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.` : `${pendingDeleteAction?.yyyymm ?? '-'} 스냅샷을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.`
        }
        confirmText="삭제"
        cancelText="취소"
        eventKey={pendingDeleteAction?.type === 'bulk' ? 'admin-settlements-bulk-delete-confirm' : 'admin-settlements-delete-confirm'}
        eventMeta={pendingDeleteAction?.type === 'bulk' ? { count: pendingDeleteAction?.count, yyyymms: Array.from(selectedSnapshots) } : { yyyymm: pendingDeleteAction?.yyyymm }}
      />
    </div>
  );
}
