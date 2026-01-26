'use client';

import useSWR from 'swr';
import { useEffect, useMemo, useRef, useState } from 'react';
import { showErrorToast, showSuccessToast, showInfoToast } from '@/lib/toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileDown, RefreshCw, CheckCircle2, AlertTriangle, Loader2, Calendar, TrendingUp, Package, DollarSign, TrendingDown, Activity, Trash2, ArrowUpDown, ArrowUp, ArrowDown, BarChartBig as ChartBar, MoreHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatKRWCard, formatKRWFull } from '@/lib/money';
import KpiCard from '@/app/admin/settlements/_components/KpiCard';

// ──────────────────────────────────────────────────────────────
// 공통 유틸
// ──────────────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

// KST(Asia/Seoul) 기준 YYYY-MM-DD 문자열 포맷터
const TZ = 'Asia/Seoul';
function fmtYMD_KST(date = new Date()) {
  // 'en-CA'는 2025-10-12 형식을 보장
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// 이번 달 1일(KST) 문자열
function firstDayOfMonth_KST(base = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
  })
    .formatToParts(base)
    .reduce<Record<string, string>>((acc, p) => ((acc[p.type] = p.value), acc), {});
  return `${parts.year}-${parts.month}-01`;
}

// 지난 달 [from, to] (KST) 문자열 범위
function prevMonthRange_KST(base = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
  })
    .formatToParts(base)
    .reduce<Record<string, string>>((acc, p) => ((acc[p.type] = p.value), acc), {});
  let y = Number(parts.year);
  let m = Number(parts.month); // 1~12
  m -= 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  const mm = String(m).padStart(2, '0');
  // KST는 DST가 없어 월말 계산에 로컬 Date 사용해도 안전
  const lastDay = new Date(y, m, 0).getDate(); // m은 1~12
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(lastDay).padStart(2, '0')}` };
}

// yyyymm → 같은 달의 from/to(YYYY-MM-DD)
function monthEdges(yyyymm: string) {
  const y = Number(yyyymm.slice(0, 4));
  const m = Number(yyyymm.slice(4, 6)) - 1; // 0-based
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
  const to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  return { from, to };
}

// 파일명 유틸: 금지문자 치환 + KST 타임스탬프 (YYYYMMDD_HHMMSS)
function makeCsvFilename(base: string) {
  const safe = base.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
  const fmt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const ts = `${parts.year}${parts.month}${parts.day}_${parts.hour}${parts.minute}${parts.second}`;
  return `${safe}_${ts}.csv`;
}

// 정렬 타입 정의
type SortField = 'paid' | 'refund' | 'net' | 'orders' | 'applications' | 'packages';
type SortDirection = 'asc' | 'desc' | null;

export default function SettlementsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didInitFromQuery = useRef(false);

  // ──────────────────────────────────────────────────────────
  // 상태
  // ──────────────────────────────────────────────────────────
  const [yyyymm, setYyyymm] = useState<string>(() => fmtYMD_KST().slice(0, 7).replace('-', '')); // KST 기준 초기 yyyymm
  const { data, mutate, isLoading } = useSWR('/api/settlements', fetcher);

  // URL 쿼리로 월을 지정하면(예: /admin/settlements?yyyymm=202601) 초기 선택 월을 그 값으로 맞춘다.
  // - 운영함 → 정산 "바로가기"에서 추천 월을 함께 전달할 때 월 착오를 줄이기 위함
  useEffect(() => {
    if (didInitFromQuery.current) return;
    didInitFromQuery.current = true;

    const q = searchParams.get('yyyymm');
    if (q && /^\d{6}$/.test(q)) {
      setYyyymm(q);
    }
  }, [searchParams]);
  const [tab, setTab] = useState<'snapshot' | 'live'>('snapshot');

  // 실시간 탭의 조회 기간 (KST)
  const [from, setFrom] = useState(() => firstDayOfMonth_KST());
  const [to, setTo] = useState(() => fmtYMD_KST());

  const invalidRange = useMemo(() => {
    if (!from || !to) return false;
    // 'YYYY-MM-DD' 형태 가정
    return new Date(from) > new Date(to);
  }, [from, to]);

  const [live, setLive] = useState<any | null>(null);

  // 버튼 로딩/락
  const [doing, setDoing] = useState<{ create?: boolean; rebuild?: string; live?: boolean }>({});

  // 검증 결과: yyyymm → { live, snap }
  const [diffMap, setDiffMap] = useState<
    Record<
      string,
      {
        live: { paid: number; refund: number; net: number; orders: number; applications: number; packages: number };
        snap: { paid: number; refund: number; net: number; orders: number; applications: number; packages: number };
      }
    >
  >({});

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

  // 액션 드롭다운 열림 상태
  // const [actionMenuOpen, setActionMenuOpen] = useState<Record<string, boolean>>({}) // CHANGE: Remove actionMenuOpen state as it's not needed
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // 캐시 키(세션 캐시): yyyymm + 스냅샷 버전(최초/최종 생성시간)
  function getCacheKey(row: any) {
    const ver = row.lastGeneratedAt || row.createdAt || '';
    return `settle:${row.yyyymm}:${new Date(ver).getTime()}`;
  }

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
  function displayKRW(n: number) {
    return compact ? formatKRWCard(n) : formatKRWFull(n);
  }

  // ──────────────────────────────────────────────────────────
  // 서버 액션
  // ──────────────────────────────────────────────────────────
  const createSnapshot = async () => {
    try {
      await fetch(`/api/settlements/${yyyymm}`, { method: 'POST' });
      await mutate(); // 최신 데이터 보장
      showSuccessToast(`${yyyymm} 스냅샷 생성 완료`);
    } catch (e) {
      console.error(e);
      showErrorToast('스냅샷 생성 실패');
    }
  };

  async function rebuildSnapshot(yyyymm: string) {
    await fetch(`/api/settlements/${yyyymm}`, { method: 'POST' });
  }

  async function fetchLive() {
    if (invalidRange) {
      showErrorToast('시작일이 종료일보다 늦습니다. 날짜를 다시 선택해 주세요.');
      return;
    }
    const q = new URLSearchParams({ from, to }).toString();
    const res = await fetch(`/api/settlements/live?${q}`);
    setLive(await res.json());
  }

  // 스냅샷 vs 실시간 비교(한 행)
  async function checkStalenessOfRow(row: any) {
    const key = String(row.yyyymm);
    const { from, to } = monthEdges(key);

    // 같은 달의 실시간 집계 호출
    const res = await fetch(`/api/settlements/live?from=${from}&to=${to}`);
    const liveJson = await res.json();

    const paidOk = (row.totals?.paid || 0) === (liveJson.totals?.paid || 0);
    const refundOk = (row.totals?.refund || 0) === (liveJson.totals?.refund || 0);
    const netOk = (row.totals?.net || 0) === (liveJson.totals?.net || 0);
    const ordOk = (row.breakdown?.orders || 0) === (liveJson.breakdown?.orders || 0);
    const appOk = (row.breakdown?.applications || 0) === (liveJson.breakdown?.applications || 0);
    const pkgOk = (row.breakdown?.packages || 0) === (liveJson.breakdown?.packages || 0);

    return { ok: paidOk && refundOk && netOk && ordOk && appOk && pkgOk, live: liveJson };
  }

  // 전체 검증
  async function validateAll(rows: any[]) {
    setBulkChecking(true);
    try {
      for (const row of rows) {
        const key = String(row.yyyymm);
        setStatusMap((prev) => ({ ...prev, [key]: 'checking' }));
        const { ok } = await checkStalenessOfRow(row);
        setStatusMap((prev) => ({ ...prev, [key]: ok ? 'ok' : 'stale' }));
        setStaleMap((prev) => ({ ...prev, [key]: !ok }));
        sessionStorage.setItem(getCacheKey(row), ok ? 'ok' : 'stale');
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
    } else {
      setSelectedSnapshots(new Set((data ?? []).map((row: any) => String(row.yyyymm))));
    }
  };

  // 개별 선택/해제 토글
  const toggleSelect = (yyyymm: string) => {
    const newSet = new Set(selectedSnapshots);
    if (newSet.has(yyyymm)) {
      newSet.delete(yyyymm);
    } else {
      newSet.add(yyyymm);
    }
    setSelectedSnapshots(newSet);
  };

  // 선택된 항목 삭제
  const deleteSelected = async () => {
    if (selectedSnapshots.size === 0) {
      showInfoToast('삭제할 항목을 선택하세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedSnapshots.size}개의 스냅샷을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch('/api/settlements/bulk-delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yyyymms: Array.from(selectedSnapshots) }),
      });
      const json = await res.json().catch(() => ({}) as any);

      if (res.status === 401) {
        showErrorToast('로그인이 필요합니다. 관리자 계정으로 다시 로그인해 주세요.');
        return;
      }
      if (res.status === 403) {
        showErrorToast('권한이 없습니다. 관리자 계정인지 확인해 주세요.');
        return;
      }

      if (json.success) {
        showSuccessToast(json.message);
        setSelectedSnapshots(new Set());
        await mutate();
      } else {
        showErrorToast(json.message || '삭제 실패');
      }
    } catch (e) {
      console.error(e);
      showErrorToast('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  // 단일 항목 삭제
  const deleteSingle = async (yyyymm: string) => {
    if (!confirm(`${yyyymm} 스냅샷을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`/api/settlements/${yyyymm}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json().catch(() => ({}) as any);

      if (res.status === 401) {
        showErrorToast('로그인이 필요합니다. 관리자 계정으로 다시 로그인해 주세요.');
        return;
      }
      if (res.status === 403) {
        showErrorToast('권한이 없습니다. 관리자 계정인지 확인해 주세요.');
        return;
      }
      if (json.success) {
        showSuccessToast(json.message);
        await mutate();
      } else {
        showErrorToast(json.message || '삭제 실패');
      }
    } catch (e) {
      console.error(e);
      showErrorToast('삭제 중 오류가 발생했습니다.');
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
  const sortedData = () => {
    if (!data || !sortField || !sortDirection) return data;

    const sorted = [...data].sort((a: any, b: any) => {
      let aVal = 0;
      let bVal = 0;

      switch (sortField) {
        case 'paid':
          aVal = a.totals?.paid || 0;
          bVal = b.totals?.paid || 0;
          break;
        case 'refund':
          aVal = a.totals?.refund || 0;
          bVal = b.totals?.refund || 0;
          break;
        case 'net':
          aVal = a.totals?.net || 0;
          bVal = b.totals?.net || 0;
          break;
        case 'orders':
          aVal = a.breakdown?.orders || 0;
          bVal = b.breakdown?.orders || 0;
          break;
        case 'applications':
          aVal = a.breakdown?.applications || 0;
          bVal = b.breakdown?.applications || 0;
          break;
        case 'packages':
          aVal = a.breakdown?.packages || 0;
          bVal = b.breakdown?.packages || 0;
          break;
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  };

  // 정렬 아이콘 렌더링
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    }
    return <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
  };

  // 세션 캐시 → 초기 상태 프리필(재방문 최적화)
  useEffect(() => {
    if (!data?.length) return;
    const nextStatus: Record<string, 'ok' | 'stale'> = {};
    const nextStale: Record<string, boolean> = {};
    for (const row of data) {
      const key = String(row.yyyymm);
      const cached = sessionStorage.getItem(getCacheKey(row));
      if (cached === 'ok' || cached === 'stale') {
        nextStatus[key] = cached as any;
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
    const csvRows = rows.map((r: any) => [
      `'${String(r.yyyymm)}`, // yyyymm 자동서식 방지
      r.totals?.paid || 0,
      r.totals?.refund || 0,
      r.totals?.net || 0,
      r.breakdown?.orders || 0,
      r.breakdown?.applications || 0,
      r.breakdown?.packages || 0,
    ]);

    // 파일명: 목록 최소~최대 yyyymm
    const yyyymms = rows.map((r: any) => String(r.yyyymm)).filter(Boolean);
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

  // KST 현재 YYYYMM
  function nowYyyymm_KST() {
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' });
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    return `${parts.year}${parts.month}`;
  }

  // YYYYMM 클라이언트 검증: 6자리·월범위·미래금지
  function validateYyyymmClient(ym: string) {
    if (!/^\d{6}$/.test(ym)) return { ok: false, reason: 'YYYYMM 6자리로 입력하세요.' };
    const mm = Number(ym.slice(4, 6));
    if (mm < 1 || mm > 12) return { ok: false, reason: '월은 01~12만 가능합니다.' };
    if (Number(ym) > Number(nowYyyymm_KST())) return { ok: false, reason: '미래 월은 생성할 수 없습니다.' };
    return { ok: true as const };
  }

  const totalRevenue = (data ?? []).reduce((sum: number, row: any) => sum + (row.totals?.paid || 0), 0);
  const totalRefunds = (data ?? []).reduce((sum: number, row: any) => sum + (row.totals?.refund || 0), 0);
  const totalNet = (data ?? []).reduce((sum: number, row: any) => sum + (row.totals?.net || 0), 0);
  const totalRentalDeposit = (data ?? []).reduce((sum: number, row: any) => sum + (row.totals?.rentalDeposit || 0), 0);
  const totalSettlements = (data ?? []).length;

  // ──────────────────────────────────────────────────────────
  // UI
  // ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg">
              <ChartBar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">정산 관리</h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-lg text-gray-600 dark:text-gray-400">월별 정산 스냅샷 및 실시간 집계를 관리하고 분석하세요</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* 전체 정산 월 (기존 카드 유지) */}
          <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm transition-all duration-200 hover:shadow-2xl hover:scale-105 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">전체 정산 월</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{isLoading ? <span className="inline-block h-9 w-16 rounded  bg-gray-200/70 dark:bg-gray-700/60 animate-pulse" /> : totalSettlements}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800/30">
                  <Calendar className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
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
            icon={<DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
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
            icon={<TrendingDown className="h-6 w-6 text-rose-600 dark:text-rose-400" />}
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
            icon={<Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />}
            isLoading={isLoading}
            hint={true}
            skeletonWidthClass="w-28"
          />
        </div>

        <div className="border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-t-2xl shadow-lg overflow-x-auto">
          <div className="px-4 sm:px-6 flex gap-1 min-w-max">
            <button
              onClick={() => setTab('snapshot')}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold transition-all relative whitespace-nowrap ${
                tab === 'snapshot' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              스냅샷 관리
              {tab === 'snapshot' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-full" />}
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
              className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold transition-all relative whitespace-nowrap ${
                tab === 'live' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              실시간 조회
              {tab === 'live' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-full" />}
            </button>
          </div>
        </div>

        {/* 스냅샷 탭 */}
        {tab === 'snapshot' && (
          <div className="space-y-6">
            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4">
                  <div className="w-full">
                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">대상 월 (YYYYMM)</label>
                    <input
                      value={yyyymm}
                      onChange={(e) => setYyyymm(e.target.value.replace(/[^0-9]/g, ''))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createSnapshot();
                      }}
                      maxLength={6}
                      inputMode="numeric"
                      placeholder="202510"
                      className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-900 transition-all"
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
                      className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                      className="px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow"
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
                      className="px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow"
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
                      onClick={deleteSelected}
                      disabled={deleting || selectedSnapshots.size === 0}
                      className="px-4 py-3 rounded-xl border-2 border-rose-200 dark:border-rose-700 bg-white dark:bg-gray-900 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow text-rose-600 dark:text-rose-400"
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

            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm overflow-visible max-w-6xl mx-auto">
              {/* 데스크탑 */}
              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-[980px]">
                  <div className="sticky top-0 z-10 backdrop-blur-sm bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-b border-emerald-100 dark:border-emerald-800/30">
                    <div
                      className="grid gap-3 p-5 text-sm font-semibold text-emerald-800 dark:text-emerald-200"
                      style={{
                        gridTemplateColumns: '40px 90px 110px 110px 110px 90px 90px 90px 110px 40px',
                      }}
                    >
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedSnapshots.size === (data ?? []).length && (data ?? []).length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          aria-label="전체 선택"
                        />
                      </div>
                      <div className="text-center">월</div>
                      <button onClick={() => toggleSort('paid')} className="text-center tabular-nums flex items-center justify-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors">
                        매출
                        {renderSortIcon('paid')}
                      </button>
                      <button onClick={() => toggleSort('refund')} className="text-center tabular-nums flex items-center justify-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors">
                        환불
                        {renderSortIcon('refund')}
                      </button>
                      <button onClick={() => toggleSort('net')} className="text-center tabular-nums flex items-center justify-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors">
                        순익
                        {renderSortIcon('net')}
                      </button>
                      <button onClick={() => toggleSort('orders')} className="text-center tabular-nums flex items-center justify-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors">
                        주문수
                        {renderSortIcon('orders')}
                      </button>
                      <button onClick={() => toggleSort('applications')} className="text-center tabular-nums flex items-center justify-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors">
                        신청수
                        {renderSortIcon('applications')}
                      </button>
                      <button onClick={() => toggleSort('packages')} className="text-center tabular-nums flex items-center justify-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors">
                        패키지수
                        {renderSortIcon('packages')}
                      </button>

                      <div className="text-center">상태</div>
                      <div className="text-center">액션</div>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="grid gap-3 p-5 animate-pulse" style={{ gridTemplateColumns: '56px 90px 110px 110px 110px 90px 90px 90px 90px 56px' }}>
                          <div className="h-5 bg-emerald-100 dark:bg-emerald-900/30 rounded" />
                          <div className="h-5 bg-emerald-100 dark:bg-emerald-900/30 rounded" />
                          <div className="h-5 bg-emerald-100 dark:bg-emerald-900/30 rounded" />
                          <div className="h-5 bg-emerald-100 dark:bg-emerald-900/30 rounded" />
                          <div className="h-5 bg-emerald-100 dark:bg-emerald-900/30 rounded" />
                          <div className="h-5 bg-emerald-100 dark:bg-emerald-900/30 rounded" />
                          <div className="h-5 bg-emerald-100 dark:bg-emerald-900/30 rounded" />
                          <div className="h-5 bg-emerald-100 dark:bg-emerald-900/30 rounded" />
                          <div className="h-5 bg-emerald-100 dark:bg-emerald-900/30 rounded" />
                          <div className="h-5 bg-emerald-100 dark:bg-emerald-900/30 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : !data || data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                      <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-full p-4 mb-4">
                        <Package className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">데이터가 없습니다</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">위에서 월을 선택하여 스냅샷을 생성하세요</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(sortedData() ?? []).map((row: any, idx: number) => (
                        <div key={row.yyyymm}>
                          <div
                            className="grid gap-3 p-5 text-sm font-semibold text-emerald-800 dark:text-emerald-200"
                            style={{
                              gridTemplateColumns: '40px 90px 110px 110px 110px 90px 90px 90px 110px 40px',
                            }}
                          >
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={selectedSnapshots.has(String(row.yyyymm))}
                                onChange={() => toggleSelect(String(row.yyyymm))}
                                className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                aria-label={`${row.yyyymm} 선택`}
                              />
                            </div>

                            <div className="flex items-center justify-center gap-2">
                              <button
                                className="font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 hover:underline underline-offset-4 transition-all"
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

                            <div className="text-center tabular-nums text-sm text-gray-900 dark:text-gray-100 flex items-center justify-center">{(row.totals?.paid || 0).toLocaleString()}</div>
                            <div className="text-center tabular-nums text-sm text-gray-900 dark:text-gray-100 flex items-center justify-center">{(row.totals?.refund || 0).toLocaleString()}</div>
                            <div className="text-center tabular-nums text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-center">{(row.totals?.net || 0).toLocaleString()}</div>
                            <div className="text-center tabular-nums text-sm text-gray-900 dark:text-gray-100 flex items-center justify-center">{row.breakdown?.orders || 0}</div>
                            <div className="text-center tabular-nums text-sm text-gray-900 dark:text-gray-100 flex items-center justify-center">{row.breakdown?.applications || 0}</div>
                            <div className="text-center tabular-nums text-sm text-gray-900 dark:text-gray-100 flex items-center justify-center">{row.breakdown?.packages || 0}</div>

                            <div className="flex items-center justify-center">
                              {statusMap[String(row.yyyymm)] === 'checking' && (
                                <span className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  검증 중
                                </span>
                              )}
                              {statusMap[String(row.yyyymm)] === 'ok' && (
                                <span className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-medium border border-green-200 dark:border-green-800">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  최신
                                </span>
                              )}
                              {statusMap[String(row.yyyymm)] === 'stale' && (
                                <span className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 font-medium border border-rose-200 dark:border-rose-800">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  갱신 필요
                                </span>
                              )}
                              {!statusMap[String(row.yyyymm)] && <span className="text-xs text-gray-400 dark:text-gray-600">-</span>}
                            </div>

                            <div className="relative flex items-center justify-center">
                              <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    aria-label="작업 메뉴 열기"
                                  >
                                    <MoreHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
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
                                      className="text-rose-600 focus:text-rose-600"
                                      onSelect={async () => {
                                        setOpenMenuId(null);
                                        await deleteSingle(String(row.yyyymm));
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
                            <div className="mx-5 mb-5 rounded-2xl border-2 border-rose-200 dark:border-rose-800 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 shadow-xl max-h-[60vh] overflow-auto overscroll-auto">
                              <div className="p-4 border-b border-rose-200 dark:border-rose-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                  <span className="font-semibold text-sm text-rose-900 dark:text-rose-100">검증 결과 비교</span>
                                </div>
                                <button
                                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-medium"
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
                                <div className="rounded-xl border-2 border-rose-200 dark:border-rose-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
                                  <div className="grid grid-cols-7 gap-4 p-4 bg-rose-50/50 dark:bg-rose-950/20 text-xs font-semibold border-b border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100">
                                    <div></div>
                                    <div className="text-right">매출</div>
                                    <div className="text-right">환불</div>
                                    <div className="text-right">순익</div>
                                    <div className="text-right">주문수</div>
                                    <div className="text-right">신청수</div>
                                    <div className="text-right">패키지수</div>
                                  </div>
                                  <div className="grid grid-cols-7 gap-4 p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">스냅샷</div>
                                    <div className="text-right tabular-nums text-sm text-gray-900 dark:text-gray-100">{diffMap[String(row.yyyymm)]!.snap.paid.toLocaleString()}</div>
                                    <div className="text-right tabular-nums text-sm text-gray-900 dark:text-gray-100">{diffMap[String(row.yyyymm)]!.snap.refund.toLocaleString()}</div>
                                    <div className="text-right tabular-nums text-sm font-bold text-gray-900 dark:text-gray-100">{diffMap[String(row.yyyymm)]!.snap.net.toLocaleString()}</div>
                                    <div className="text-right tabular-nums text-sm text-gray-900 dark:text-gray-100">{diffMap[String(row.yyyymm)]!.snap.orders}</div>
                                    <div className="text-right tabular-nums text-sm text-gray-900 dark:text-gray-100">{diffMap[String(row.yyyymm)]!.snap.applications}</div>
                                    <div className="text-right tabular-nums text-sm text-gray-900 dark:text-gray-100">{diffMap[String(row.yyyymm)]!.snap.packages}</div>
                                  </div>
                                  <div className="grid grid-cols-7 gap-4 p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">실시간</div>
                                    <div className="text-right tabular-nums text-sm text-gray-900 dark:text-gray-100">{diffMap[String(row.yyyymm)]!.live.paid.toLocaleString()}</div>
                                    <div className="text-right tabular-nums text-sm text-gray-900 dark:text-gray-100">{diffMap[String(row.yyyymm)]!.live.refund.toLocaleString()}</div>
                                    <div className="text-right tabular-nums text-sm font-bold text-gray-900 dark:text-gray-100">{diffMap[String(row.yyyymm)]!.live.net.toLocaleString()}</div>
                                    <div className="text-right tabular-nums text-sm text-gray-900 dark:text-gray-100">{diffMap[String(row.yyyymm)]!.live.orders}</div>
                                    <div className="text-right tabular-nums text-sm text-gray-900 dark:text-gray-100">{diffMap[String(row.yyyymm)]!.live.applications}</div>
                                    <div className="text-right tabular-nums text-sm text-gray-900 dark:text-gray-100">{diffMap[String(row.yyyymm)]!.live.packages}</div>
                                  </div>
                                </div>

                                <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-rose-100 dark:bg-rose-900/30 border-2 border-rose-300 dark:border-rose-700">
                                  <AlertTriangle className="w-5 h-5 text-rose-700 dark:text-rose-300 flex-shrink-0" />
                                  <span className="text-sm text-rose-800 dark:text-rose-200 flex-1 font-medium">값이 다릅니다. '지금 갱신'을 눌러 스냅샷을 업데이트 하세요.</span>
                                  <button
                                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
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
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                    <input type="checkbox" checked={selectedSnapshots.size === data.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" aria-label="전체 선택" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">전체 선택</span>
                  </div>
                )}

                {isLoading ? (
                  [...Array(3)].map((_, i) => <div key={i} className="rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-white dark:bg-gray-900 p-4 shadow-sm animate-pulse h-32" />)
                ) : !data || data.length === 0 ? (
                  <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-white dark:bg-gray-900 p-6 text-center">
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-full p-4 mb-4 inline-flex">
                      <Package className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">데이터가 없습니다</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">위에서 월을 선택하여 스냅샷을 생성하세요</p>
                  </div>
                ) : (
                  (sortedData() ?? []).map((row: any) => (
                    <div key={row.yyyymm} className="rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-white dark:bg-gray-900 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedSnapshots.has(String(row.yyyymm))}
                            onChange={() => toggleSelect(String(row.yyyymm))}
                            className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            aria-label={`${row.yyyymm} 선택`}
                          />
                          <button
                            className="font-semibold text-emerald-700 dark:text-emerald-300 hover:underline underline-offset-4"
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
                            <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" aria-label="작업 메뉴 열기">
                              <MoreHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
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
                                  ok ? showSuccessToast('스냅샷이 현재 집계와 일치합니다.') : showInfoToast(`변경 감지됨: ${key} 스냅샷과 현재 집계가 다릅니다.`);
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
                              className="text-rose-600 focus:text-rose-600"
                              onSelect={async () => {
                                setOpenMenuId(null);
                                await deleteSingle(String(row.yyyymm));
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-500 dark:text-gray-400">매출</div>
                        <div className="text-right tabular-nums text-gray-900 dark:text-gray-100">{(row.totals?.paid || 0).toLocaleString()}</div>

                        <div className="text-gray-500 dark:text-gray-400">환불</div>
                        <div className="text-right tabular-nums text-gray-900 dark:text-gray-100">{(row.totals?.refund || 0).toLocaleString()}</div>

                        <div className="text-gray-500 dark:text-gray-400">순익</div>
                        <div className="text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-300">{(row.totals?.net || 0).toLocaleString()}</div>

                        <div className="text-gray-500 dark:text-gray-400">주문수</div>
                        <div className="text-right tabular-nums text-gray-900 dark:text-gray-100">{row.breakdown?.orders || 0}</div>

                        <div className="text-gray-500 dark:text-gray-400">신청수</div>
                        <div className="text-right tabular-nums text-gray-900 dark:text-gray-100">{row.breakdown?.applications || 0}</div>

                        <div className="text-gray-500 dark:text-gray-400">패키지수</div>
                        <div className="text-right tabular-nums text-gray-900 dark:text-gray-100">{row.breakdown?.packages || 0}</div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        {statusMap[String(row.yyyymm)] === 'checking' && (
                          <span className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            검증 중
                          </span>
                        )}
                        {statusMap[String(row.yyyymm)] === 'ok' && (
                          <span className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-medium border border-green-200 dark:border-green-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            최신
                          </span>
                        )}
                        {statusMap[String(row.yyyymm)] === 'stale' && (
                          <span className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 font-medium border border-rose-200 dark:border-rose-800">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            갱신 필요
                          </span>
                        )}
                        {!statusMap[String(row.yyyymm)] && <span className="text-xs text-gray-400 dark:text-gray-600">-</span>}
                      </div>

                      {openMap[String(row.yyyymm)] && statusMap[String(row.yyyymm)] === 'stale' && diffMap[String(row.yyyymm)] && (
                        <div className="mt-4 rounded-xl border-2 border-rose-200 dark:border-rose-800 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 overflow-hidden">
                          <div className="p-3 border-b border-rose-200 dark:border-rose-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                              <span className="font-semibold text-xs text-rose-900 dark:text-rose-100">검증 결과 비교</span>
                            </div>
                            <button className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-medium" onClick={() => setOpenMap((prev) => ({ ...prev, [String(row.yyyymm)]: false }))}>
                              닫기
                            </button>
                          </div>

                          <div className="p-3 space-y-2">
                            <div className="text-xs font-semibold text-rose-900 dark:text-rose-100 mb-2">스냅샷</div>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                              <div className="text-gray-600 dark:text-gray-400">매출</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.snap.paid.toLocaleString()}</div>
                              <div className="text-gray-600 dark:text-gray-400">환불</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.snap.refund.toLocaleString()}</div>
                              <div className="text-gray-600 dark:text-gray-400">순익</div>
                              <div className="text-right tabular-nums font-semibold">{diffMap[String(row.yyyymm)]!.snap.net.toLocaleString()}</div>
                              <div className="text-gray-600 dark:text-gray-400">주문수</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.snap.orders}</div>
                              <div className="text-gray-600 dark:text-gray-400">신청수</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.snap.applications}</div>
                              <div className="text-gray-600 dark:text-gray-400">패키지수</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.snap.packages}</div>
                            </div>

                            <div className="text-xs font-semibold text-rose-900 dark:text-rose-100 mb-2">실시간</div>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                              <div className="text-gray-600 dark:text-gray-400">매출</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.live.paid.toLocaleString()}</div>
                              <div className="text-gray-600 dark:text-gray-400">환불</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.live.refund.toLocaleString()}</div>
                              <div className="text-gray-600 dark:text-gray-400">순익</div>
                              <div className="text-right tabular-nums font-semibold">{diffMap[String(row.yyyymm)]!.live.net.toLocaleString()}</div>
                              <div className="text-gray-600 dark:text-gray-400">주문수</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.live.orders}</div>
                              <div className="text-gray-600 dark:text-gray-400">신청수</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.live.applications}</div>
                              <div className="text-gray-600 dark:text-gray-400">패키지수</div>
                              <div className="text-right tabular-nums">{diffMap[String(row.yyyymm)]!.live.packages}</div>
                            </div>

                            <button
                              className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">시작일</label>
                      <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-900 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">종료일</label>
                      <input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-900 transition-all"
                      />
                    </div>
                    {invalidRange && <p className="text-sm text-rose-600 mt-1">시작일이 종료일보다 늦습니다. 날짜를 다시 선택해 주세요.</p>}{' '}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    <button
                      className="px-3 sm:px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm hover:shadow"
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
                      className="px-3 sm:px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm hover:shadow"
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
                      className="px-3 sm:px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm hover:shadow"
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
                      className="px-3 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 col-span-2 sm:col-span-1"
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
                      className="px-3 sm:px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow col-span-2 sm:col-span-1"
                    >
                      <FileDown className="w-4 h-4" />
                      CSV
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2 w-fit">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="font-medium">KST 기준 합산</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {live && (
              <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm overflow-visible">
                <div className="hidden md:block overflow-x-auto">
                  <div className="min-w-[640px]">
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-b border-emerald-100 dark:border-emerald-800/30">
                      <div className="grid gap-4 p-5 text-sm font-semibold text-emerald-800 dark:text-emerald-200" style={{ gridTemplateColumns: '1fr 120px 120px 120px 100px 100px 100px' }}>
                        <div className="text-center">기간</div>
                        <div className="text-center tabular-nums">매출</div>
                        <div className="text-center tabular-nums">환불</div>
                        <div className="text-center tabular-nums">순익</div>
                        <div className="text-center tabular-nums">주문수</div>
                        <div className="text-center tabular-nums">신청수</div>
                        <div className="text-center tabular-nums">패키지수</div>
                      </div>
                    </div>
                    <div className="grid gap-4 p-5 border-b border-gray-100 dark:border-gray-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors" style={{ gridTemplateColumns: '1fr 120px 120px 120px 100px 100px 100px ' }}>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center flex items-center justify-center">
                        {live.range.from} ~ {live.range.to}
                      </div>
                      <div className="text-center tabular-nums text-sm text-gray-900 dark:text-gray-100 flex items-center justify-center">{(live.totals?.paid || 0).toLocaleString()}</div>
                      <div className="text-center tabular-nums text-sm text-gray-900 dark:text-gray-100 flex items-center justify-center">{(live.totals?.refund || 0).toLocaleString()}</div>
                      <div className="text-center tabular-nums text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-center">{(live.totals?.net || 0).toLocaleString()}</div>
                      <div className="text-center tabular-nums text-sm text-gray-900 dark:text-gray-100 flex items-center justify-center">{live.breakdown?.orders || 0}</div>
                      <div className="text-center tabular-nums text-sm text-gray-900 dark:text-gray-100 flex items-center justify-center">{live.breakdown?.applications || 0}</div>
                      <div className="text-center tabular-nums text-sm text-gray-900 dark:text-gray-100 flex items-center justify-center">{live.breakdown?.packages || 0}</div>
                    </div>
                    <div className="grid gap-4 p-5 bg-emerald-50/50 dark:bg-emerald-950/20" style={{ gridTemplateColumns: '1fr 120px 120px 120px 100px 100px 100px' }}>
                      <div className="text-sm font-bold text-emerald-900 dark:text-emerald-100 text-center flex items-center justify-center">총계</div>
                      <div className="text-center tabular-nums text-sm font-bold text-emerald-900 dark:text-emerald-100 flex items-center justify-center">{(live.totals?.paid || 0).toLocaleString()}</div>
                      <div className="text-center tabular-nums text-sm font-bold text-emerald-900 dark:text-emerald-100 flex items-center justify-center">{(live.totals?.refund || 0).toLocaleString()}</div>
                      <div className="text-center tabular-nums text-sm font-bold text-emerald-900 dark:text-emerald-100 flex items-center justify-center">{(live.totals?.net || 0).toLocaleString()}</div>
                      <div className="text-center tabular-nums text-sm font-bold text-emerald-900 dark:text-emerald-100 flex items-center justify-center">{live.breakdown?.orders || 0}</div>
                      <div className="text-center tabular-nums text-sm font-bold text-emerald-900 dark:text-emerald-100 flex items-center justify-center">{live.breakdown?.applications || 0}</div>
                      <div className="text-center tabular-nums text-sm text-gray-900 dark:text-gray-100 flex items-center justify-center">{live.breakdown?.packages || 0}</div>
                    </div>
                  </div>
                </div>

                <div className="md:hidden p-4">
                  <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-white dark:bg-gray-900 p-4 shadow-sm">
                    <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-3 text-center">
                      {live.range.from} ~ {live.range.to}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-500 dark:text-gray-400">매출</div>
                      <div className="text-right tabular-nums text-gray-900 dark:text-gray-100">{(live.totals?.paid || 0).toLocaleString()}</div>

                      <div className="text-gray-500 dark:text-gray-400">환불</div>
                      <div className="text-right tabular-nums text-gray-900 dark:text-gray-100">{(live.totals?.refund || 0).toLocaleString()}</div>

                      <div className="text-gray-500 dark:text-gray-400">순익</div>
                      <div className="text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-300">{(live.totals?.net || 0).toLocaleString()}</div>

                      <div className="text-gray-500 dark:text-gray-400">주문수</div>
                      <div className="text-right tabular-nums text-gray-900 dark:text-gray-100">{live.breakdown?.orders || 0}</div>

                      <div className="text-gray-500 dark:text-gray-400">신청수</div>
                      <div className="text-right tabular-nums text-gray-900 dark:text-gray-100">{live.breakdown?.applications || 0}</div>

                      <div className="text-gray-500 dark:text-gray-400">패키지수</div>
                      <div className="text-right tabular-nums text-gray-900 dark:text-gray-100">{live.breakdown?.packages || 0}</div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
