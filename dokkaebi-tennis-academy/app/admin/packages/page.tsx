'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Copy, Eye, Filter, MoreHorizontal, Search, X, Package, Calendar, CreditCard, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AuthGuard from '@/components/auth/AuthGuard';
import useSWR from 'swr';

// 패키지 주문 타입 정의
interface PackageOrder {
  id: string;
  userId?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  packageType: '10회권' | '30회권' | '50회권' | '100회권';
  totalSessions: number;
  remainingSessions: number;
  usedSessions: number;
  price: number;
  purchaseDate: string;
  expiryDate: string;
  status: '활성' | '만료' | '일시정지' | '취소';
  paymentStatus: '결제완료' | '결제대기' | '결제취소';
  serviceType: '방문' | '출장';
}

// 타입 선언
type PackageType = '10회권' | '30회권' | '50회권' | '100회권';
type ServiceType = '방문' | '출장';

// 패스(또는 주문) 상태 라벨
type PassStatus = '비활성' | '활성' | '만료' | '취소';
type PaymentStatus = '결제완료' | '결제대기' | '결제취소';

// 2) 라벨 맵
const PASS_STATUS_LABELS: Record<PassStatus, string> = {
  비활성: '비활성',
  활성: '활성',
  만료: '만료',
  취소: '취소',
};

// 3) 상태 뱃지 색 (원하는 톤으로)
const packageStatusColors: Record<PassStatus | '대기', string> = {
  비활성: 'bg-amber-100 text-amber-800 border-amber-200',
  활성: 'bg-green-100 text-green-800 border-green-200',
  만료: 'bg-gray-100 text-gray-800 border-gray-200',
  취소: 'bg-red-100 text-red-800 border-red-200',
  대기: 'bg-slate-100 text-slate-700 border-slate-200',
};
interface PackageListItem {
  id: string;
  userId: string;
  customer: { name?: string; email?: string; phone?: string };
  packageType: PackageType;
  totalSessions: number;
  remainingSessions: number;
  usedSessions: number;
  price: number;
  purchaseDate: string | null;
  expiryDate: string | null;
  passStatus: PassStatus | '대기';
  paymentStatus: PaymentStatus | string;
  serviceType: ServiceType;
}

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

//  KPI
interface PackageMetrics {
  total: number;
  active: number;
  revenue: number;
  expirySoon: number;
}

// 이 페이지에서만 쓸 응답 타입: 기존 Paginated에 metrics만
type PackagesResponse = Paginated<PackageListItem> & {
  metrics?: PackageMetrics;
};

//  모든 뱃지(패키지/상태/결제) 공통 사이즈
const badgeSizeCls = 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md';

// 결제 상태별 색상
const paymentStatusColors: Record<PaymentStatus, string> = {
  결제완료: 'bg-blue-100 text-blue-800 border-blue-200',
  결제대기: 'bg-orange-100 text-orange-800 border-orange-200',
  결제취소: 'bg-red-100 text-red-800 border-red-200',
};

// 패키지 타입별 색상
const packageTypeColors: Record<PackageType, string> = {
  '10회권': 'bg-purple-100 text-purple-800 border-purple-200',
  '30회권': 'bg-blue-100 text-blue-800 border-blue-200',
  '50회권': 'bg-green-100 text-green-800 border-green-200',
  '100회권': 'bg-orange-100 text-orange-800 border-orange-200',
};

/** 데이터를 받아오는 fetcher 함수 */
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

export default function PackageOrdersClient() {
  // 현재 페이지 번호 상태
  const [page, setPage] = useState(1);

  // 검색어 상태
  const [searchTerm, setSearchTerm] = useState('');

  // 필터 상태들
  const [packageTypeFilter, setPackageTypeFilter] = useState<'all' | PackageType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PassStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentStatus>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<'all' | ServiceType>('all');

  // 정렬 상태
  type SortKey = 'customer' | 'purchaseDate' | 'expiryDate' | 'remainingSessions' | 'price' | 'status' | 'payment' | 'package' | 'progress';
  const [sortBy, setSortBy] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const SortIcon = (k: SortKey) => (
    <ChevronDown
      className={cn(
        // 아이콘 크기/정렬
        'inline-block h-3 w-3 shrink-0 align-middle transition-transform',
        // 현재 정렬키 여부에 따라 투명도 조절
        sortBy === k ? 'opacity-80' : 'opacity-50',
        // 내림차순이면 화살표 뒤집기
        sortBy === k && sortDirection === 'desc' && 'rotate-180'
      )}
      aria-hidden="true" // 스크린리더는 th의 aria-sort를 이용
    />
  );

  // 한 페이지에 보여줄 항목 수
  const limit = 10;

  const qs = new URLSearchParams();
  if (searchTerm) qs.set('q', searchTerm);
  if (statusFilter !== 'all') qs.set('status', statusFilter);
  if (packageTypeFilter !== 'all') qs.set('package', packageTypeFilter.replace('회권', ''));
  if (paymentFilter !== 'all') qs.set('payment', paymentFilter);
  if (serviceTypeFilter !== 'all') qs.set('service', serviceTypeFilter);
  if (sortBy) qs.set('sort', `${sortBy}:${sortDirection}`);
  qs.set('page', String(page));
  qs.set('limit', String(limit));

  const { data, error, isValidating, mutate } = useSWR<PackagesResponse>(`/api/package-orders?${qs.toString()}`, fetcher, {
    dedupingInterval: 1000,
    revalidateOnFocus: false,
  });

  if (error) return <div className="p-6 text-red-600">목록을 불러오지 못했습니다.</div>;

  // 데이터 준비
  const packages: PackageListItem[] = data?.items ?? [];
  const totalPages = useMemo(() => Math.max(1, Math.ceil((data?.total ?? 0) / limit)), [data?.total, limit]);
  const goToPage = (p: number) => setPage(Math.min(totalPages, Math.max(1, p)));

  const metrics = data?.metrics;

  const totalCount = data?.total ?? 0; // 상단 "총 N개의 패키지"에도 이미 사용

  // 총 개수 (현재 필터/검색/정렬 조건 기준 전체)
  const kpiTotal = metrics?.total ?? totalCount;

  // 활성 패키지 수 (서버가 주면 사용, 아니면 기존 필터)
  const kpiActive = metrics?.active ?? packages.filter((p) => p.passStatus === '활성').length;

  // 총 매출 (서버는 '결제완료' 합계. 폴백은 기존처럼 페이지 아이템 합)
  const kpiRevenue = metrics?.revenue ?? packages.reduce((sum, p) => sum + p.price, 0);

  // 만료 예정 (0 < 남은일수 ≤ 30, '취소' 제외)
  const kpiExpSoon =
    metrics?.expirySoon ??
    packages.filter((p) => {
      const exp = p.expiryDate ?? null;
      const days = getDaysUntilExpiry(exp);
      const s = computeListStatus(p.paymentStatus, exp);
      return s.label !== '취소' && days <= 30 && days > 0;
    }).length;

  // 페이지 번호 목록(앞·뒤 ... 처리)
  const pageItems = useMemo<(number | string)[]>(() => {
    const t = totalPages,
      c = page;
    if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
    const items: (number | string)[] = [1];
    const start = Math.max(2, c - 1);
    const end = Math.min(t - 1, c + 1);
    if (start > 2) items.push('…');
    for (let i = start; i <= end; i++) items.push(i);
    if (end < t - 1) items.push('…');
    items.push(t);
    return items;
  }, [page, totalPages]);

  // 날짜 포맷터
  const formatDate = (v?: string | number | Date | null) => {
    const d = toDateSafe(v);
    if (!d) return '-';
    return new Intl.DateTimeFormat('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  };

  // 표용 짧은 날짜 포맷 (한 줄 고정)
  const formatDateCompact = (v?: string | number | Date | null) => {
    const d = toDateSafe(v);
    if (!d) return '-';
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yy}.${mm}.${dd} ${hh}:${mi}`;
  };

  // 날짜를 "YY.MM.DD" / "HH:MM" 두 줄로 나눠 쓰기
  const formatDateSplit = (v?: string | number | Date | null) => {
    const d = toDateSafe(v);
    if (!d) return { date: '-', time: '' };
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return { date: `${yy}.${mm}.${dd}`, time: `${hh}:${mi}` };
  };

  // 날짜 헬퍼
  // ✅ 안전한 Date 변환 유틸 — 함수 선언(호이스팅됨)
  function toDateSafe(v?: string | number | Date | null) {
    if (v == null) return null;

    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;

    if (typeof v === 'number') {
      const ms = v < 1e12 ? v * 1000 : v;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    let s = String(v).trim();

    const direct = new Date(s);
    if (!Number.isNaN(direct.getTime())) return direct;

    const mDot = s.match(/^(\d{2,4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?$/);
    if (mDot) {
      const y = Number(mDot[1].length === 2 ? '20' + mDot[1] : mDot[1]);
      const mo = Number(mDot[2]);
      const d = Number(mDot[3]);
      const dd = new Date(y, mo - 1, d);
      return Number.isNaN(dd.getTime()) ? null : dd;
    }

    const mSep = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (mSep) {
      const y = Number(mSep[1]);
      const mo = Number(mSep[2]);
      const d = Number(mSep[3]);
      const dd = new Date(y, mo - 1, d);
      return Number.isNaN(dd.getTime()) ? null : dd;
    }

    const mCompact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (mCompact) {
      const y = Number(mCompact[1]);
      const mo = Number(mCompact[2]);
      const d = Number(mCompact[3]);
      const dd = new Date(y, mo - 1, d);
      return Number.isNaN(dd.getTime()) ? null : dd;
    }

    return null;
  }

  // 만료일까지 남은 일수 — 함수 선언(호이스팅됨)
  function getDaysUntilExpiry(v?: string | number | Date | null) {
    const d = toDateSafe(v);
    if (!d) return 0;

    const endOfDay = new Date(d);
    endOfDay.setHours(23, 59, 59, 999);

    const diffMs = endOfDay.getTime() - Date.now();
    return Math.ceil(diffMs / 86400000);
  }

  // 금액 포맷터
  const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

  // 현재 화면이 "필터/검색 적용 중"인지 여부 → 메시지 분기용
  const hasAnyFilter = !!searchTerm || statusFilter !== 'all' || packageTypeFilter !== 'all' || paymentFilter !== 'all' || serviceTypeFilter !== 'all';

  // 필터 리셋
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPackageTypeFilter('all');
    setPaymentFilter('all');
    setServiceTypeFilter('all');
    setPage(1);
  };

  useEffect(() => {
    // totalPages가 줄어든 경우 현재 페이지를 자동 보정
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages]);

  // 정렬 헤더 클릭 핸들러
  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
    setPage(1);
  };
  // 공통 스타일 상수
  const thClasses =
    'sticky top-0 z-10 whitespace-nowrap px-1.5 py-1.5 text-center align-middle ' +
    'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 ' +
    'border-b border-slate-200 text-slate-600 dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-300 ' +
    'font-semibold text-[11px] leading-[1.05] box-border';

  const tdClasses = 'px-3 py-2 align-middle text-center text-[11px] leading-tight tabular-nums';

  // 열별 정렬 (헤더/바디 공통 적용)
  const col = {
    id: 'text-center',
    customer: 'text-center',
    type: 'text-center',
    remain: 'text-center',
    progress: 'text-center',
    buy: 'text-center',
    expire: 'text-center',
    status: 'text-center',
    payment: 'text-center',
    price: 'text-center',
    actions: 'text-center',
  } as const;

  // 현재 정렬 상태를 ARIA 규격 문자열로 변환하는 헬퍼
  // - 인자 k는 정렬 키(이미 존재하는 SortKey 유니온 타입 가정: 'customer' | 'package' | ...)
  // - 반환값은 스크린리더가 이해하는 정확한 값: 'ascending' | 'descending' | 'none'
  const ariaSort = (k: SortKey) => {
    // 현재 사용자가 선택한 정렬 키(sortBy)가 이 헤더의 키(k)와 같다면
    if (sortBy === k) {
      // 정렬 방향이 'asc'면 'ascending', 'desc'면 'descending'을 반환
      return sortDirection === 'asc' ? 'ascending' : 'descending';
    }
    // 현재 정렬 컬럼이 아니라면 'none'으로 표시
    return 'none';
  };

  // 진행률을 상세 화면과 동일하게 계산: used / (used + remaining)
  // - 분모가 0인 경우 0%
  // - 값은 0~100 사이로 클램프
  function calcProgressPercent(usedRaw: unknown, remainingRaw: unknown) {
    const used = Math.max(0, Number(usedRaw) || 0); // 사용횟수(음수 방지)
    const remaining = Math.max(0, Number(remainingRaw) || 0); // 남은횟수(음수 방지)
    const total = used + remaining; // 현재 총량(연장/횟수조절 반영)
    if (total <= 0) return { percent: 0, used, remaining, total };
    const percent = Math.min(100, Math.max(0, Math.round((used / total) * 100)));
    return { percent, used, remaining, total };
  }

  // 상태 계산 함수
  function computeListStatus(paymentStatus?: string | null, passExpiresAt?: string | number | Date | null) {
    if (paymentStatus === '결제취소') return { label: '취소', tone: 'destructive' as const };

    const d = toDateSafe(passExpiresAt);
    let expired = false;
    if (d) {
      const eod = new Date(d);
      eod.setHours(23, 59, 59, 999);
      expired = eod.getTime() < Date.now();
    }

    if (expired) return { label: '만료', tone: 'muted' as const };
    if (paymentStatus && paymentStatus !== '결제완료') return { label: '비활성', tone: 'warning' as const };
    return { label: '활성', tone: 'success' as const };
  }

  // 상태 뱃지 스타일(필요시 프로젝트 공통 Badge에 맞춰 색상만 바꿔도 됨)
  function statusBadgeClass(tone: 'destructive' | 'muted' | 'warning' | 'success') {
    switch (tone) {
      case 'destructive':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'muted':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'warning':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'success':
      default:
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    }
  }

  // 연장 반영된 만료일
  function getExpirySource(pkg: any): string | null {
    return pkg?.expiryDate ?? null;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50">
        <div className="container py-6">
          {/* 제목 및 설명 */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">패키지 관리</h1>
              <p className="mt-2 text-lg text-gray-600">스트링 교체 서비스 패키지 주문을 관리하고 처리하세요.</p>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">총 패키지</p>
                    <p className="text-3xl font-bold text-gray-900">{kpiTotal}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">활성 패키지</p>
                    <p className="text-3xl font-bold text-green-600">{kpiActive}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">총 매출</p>
                    <p className="text-3xl font-bold text-purple-600">{formatCurrency(kpiRevenue)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3">
                    <CreditCard className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">만료 예정</p>
                    <p className="text-3xl font-bold text-orange-600">{kpiExpSoon}</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3">
                    <Calendar className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 필터 및 검색 카드 */}
          <Card className="mb-6 border-0 bg-white/80 shadow-lg backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                필터 및 검색
              </CardTitle>
              <CardDescription>패키지 상태, 유형, 결제 상태로 필터링하거나 패키지 ID, 고객명, 이메일로 검색하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {/* 검색 input */}
                <div className="w-full max-w-md">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="패키지 ID, 고객명, 이메일 검색..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                      }}
                    />
                    {searchTerm && (
                      <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3" onClick={() => setSearchTerm('')}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* 필터 컴포넌트들 */}
                <div className="grid w-full gap-2 border-t pt-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                      setStatusFilter(v as 'all' | PassStatus);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="패키지 상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 상태</SelectItem>
                      <SelectItem value="비활성">비활성</SelectItem>
                      <SelectItem value="활성">활성</SelectItem>
                      <SelectItem value="만료">만료</SelectItem>
                      <SelectItem value="취소">취소</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={packageTypeFilter}
                    onValueChange={(v) => {
                      setPackageTypeFilter(v as 'all' | PackageType);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="패키지 유형" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 유형</SelectItem>
                      <SelectItem value="10회권">10회권</SelectItem>
                      <SelectItem value="30회권">30회권</SelectItem>
                      <SelectItem value="50회권">50회권</SelectItem>
                      <SelectItem value="100회권">100회권</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={paymentFilter}
                    onValueChange={(v) => {
                      setPaymentFilter(v as 'all' | PaymentStatus);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="결제 상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 결제</SelectItem>
                      <SelectItem value="결제완료">결제완료</SelectItem>
                      <SelectItem value="결제대기">결제대기</SelectItem>
                      <SelectItem value="결제취소">결제취소</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={serviceTypeFilter}
                    onValueChange={(v) => {
                      setServiceTypeFilter(v as 'all' | ServiceType);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="서비스 유형" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 서비스</SelectItem>
                      <SelectItem value="방문">방문</SelectItem>
                      <SelectItem value="출장">출장</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={resetFilters} className="w-full bg-transparent">
                    필터 초기화
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 패키지 목록 테이블 */}
          <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>패키지 목록</CardTitle>
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  총 {totalCount}개의 패키지
                </p>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto md:overflow-x-visible relative px-3 sm:px-4">
              <div className="relative overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 shadow-sm max-h-[60vh] min-w-0">
                <Table className="w-full table-auto border-separate [border-spacing-block:0.5rem] [border-spacing-inline:0] text-xs ">
                  <TableHeader className="sticky top-0 bg-gray-50 dark:bg-gray-900 shadow-sm">
                    <TableRow>
                      <TableHead className={cn(thClasses, 'w-[120px]')}>패키지 ID</TableHead>

                      <TableHead onClick={() => handleSort('customer')} className={cn(thClasses, 'cursor-pointer select-none hover:text-primary', sortBy === 'customer' && 'text-primary')} role="columnheader" aria-sort={ariaSort('customer')}>
                        <span className="inline-flex items-center justify-center gap-1">고객 {SortIcon('customer')}</span>
                      </TableHead>

                      <TableHead onClick={() => handleSort('package')} className={cn(thClasses, 'w-[96px] cursor-pointer select-none hover:text-primary', sortBy === 'package' && 'text-primary')} role="columnheader" aria-sort={ariaSort('package')}>
                        <span className="inline-flex items-center justify-center gap-1">패키지 {SortIcon('package')}</span>
                      </TableHead>

                      <TableHead
                        onClick={() => handleSort('remainingSessions')}
                        className={cn(thClasses, 'w-[92px] hidden lg:table-cell cursor-pointer select-none hover:text-primary', sortBy === 'remainingSessions' && 'text-primary')}
                        role="columnheader"
                        aria-sort={ariaSort('remainingSessions')}
                      >
                        <span className="inline-flex items-center justify-center gap-1">남은 횟수 {SortIcon('remainingSessions')}</span>
                      </TableHead>

                      <TableHead onClick={() => handleSort('progress')} className={cn(thClasses, 'w-[96px] cursor-pointer select-none hover:text-primary', sortBy === 'progress' && 'text-primary')} role="columnheader" aria-sort={ariaSort('progress')}>
                        <span className="inline-flex items-center justify-center gap-1">진행률 {SortIcon('progress')}</span>
                      </TableHead>

                      <TableHead
                        onClick={() => handleSort('purchaseDate')}
                        className={cn(thClasses, 'w-36 cursor-pointer select-none hover:text-primary', sortBy === 'purchaseDate' && 'text-primary')}
                        role="columnheader"
                        aria-sort={ariaSort('purchaseDate')}
                      >
                        <span className="inline-flex items-center justify-center gap-1">구매일 {SortIcon('purchaseDate')}</span>
                      </TableHead>

                      <TableHead
                        onClick={() => handleSort('expiryDate')}
                        className={cn(thClasses, 'w-36 cursor-pointer select-none hover:text-primary', sortBy === 'expiryDate' && 'text-primary')}
                        role="columnheader"
                        aria-sort={ariaSort('expiryDate')}
                      >
                        <span className="inline-flex items-center justify-center gap-1">만료일 {SortIcon('expiryDate')}</span>
                      </TableHead>

                      <TableHead onClick={() => handleSort('status')} className={cn(thClasses, 'w-[72px] cursor-pointer select-none hover:text-primary', sortBy === 'status' && 'text-primary')} role="columnheader" aria-sort={ariaSort('status')}>
                        <span className="inline-flex items-center justify-center gap-1">상태 {SortIcon('status')}</span>
                      </TableHead>

                      <TableHead
                        onClick={() => handleSort('payment')}
                        className={cn(thClasses, 'w-[84px] hidden xl:table-cell cursor-pointer select-none hover:text-primary', sortBy === 'payment' && 'text-primary')}
                        role="columnheader"
                        aria-sort={ariaSort('payment')}
                      >
                        <span className="inline-flex items-center justify-center gap-1">결제 {SortIcon('payment')}</span>
                      </TableHead>

                      <TableHead onClick={() => handleSort('price')} className={cn(thClasses, 'w-[96px] cursor-pointer select-none hover:text-primary', sortBy === 'price' && 'text-primary')} role="columnheader" aria-sort={ariaSort('price')}>
                        <span className="inline-flex items-center justify-center gap-1">금액 {SortIcon('price')}</span>
                      </TableHead>

                      <TableHead className={cn(thClasses, 'w-[44px] text-center')}>작업</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {packages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          {hasAnyFilter ? '검색 결과가 없습니다.' : '등록된 패키지가 없습니다.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      packages.map((pkg) => {
                        const { percent: progressPercentage, total: currentTotal } = calcProgressPercent(pkg.usedSessions, pkg.remainingSessions);

                        // 만료일 소스
                        const expirySource = pkg.expiryDate ?? null;

                        const listState = computeListStatus(pkg.paymentStatus, expirySource);
                        const daysUntilExpiry = getDaysUntilExpiry(expirySource);

                        return (
                          <TableRow key={pkg.id} className="hover:bg-primary/5 transition-colors even:bg-slate-50/60 border-b last:border-0">
                            {/* 패키지 ID (좌정렬 + 말줄임) */}
                            <TableCell className={cn(tdClasses)}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="font-mono text-sm cursor-pointer block truncate" title={pkg.id}>
                                      {pkg.id.slice(0, 6)}…{pkg.id.slice(-4)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="flex items-center gap-2">
                                      <span className="whitespace-nowrap">{pkg.id}</span>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-4 w-4"
                                        onClick={() => {
                                          navigator.clipboard.writeText(pkg.id);
                                          toast.success('패키지 ID가 클립보드에 복사되었습니다.');
                                        }}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>

                            {/* 고객 (좌정렬 + 2줄 구성, 둘 다 말줄임) */}
                            <TableCell className={cn(tdClasses, 'text-center')}>
                              {(() => {
                                const cName = pkg.customer?.name ?? '이름없음';
                                const cEmail = pkg.customer?.email ?? '';
                                const baseName = cName.replace(/\(비회원\)\s*$/, '');
                                const isGuest = cName.includes('(비회원)');
                                return (
                                  <div className="flex flex-col items-center text-center">
                                    <span className="font-medium max-w-[200px] truncate">
                                      {baseName}
                                      {isGuest && <span className="ml-1 text-xs text-gray-500">(비회원)</span>}
                                    </span>
                                    <span className="text-xs text-muted-foreground max-w-[200px] truncate">{cEmail}</span>
                                  </div>
                                );
                              })()}
                            </TableCell>

                            {/* 패키지 유형 (한 줄 고정) */}
                            <TableCell className={cn(tdClasses, col.type, 'whitespace-nowrap')}>
                              <Badge className={cn('border', packageTypeColors[pkg.packageType], 'font-medium', badgeSizeCls)}>{pkg.packageType}</Badge>
                            </TableCell>

                            {/* 남은 횟수 (한 줄 + 균일 정렬) */}
                            <TableCell className={cn(tdClasses, col.remain, 'whitespace-nowrap hidden lg:table-cell')}>
                              <div className="flex flex-col items-center leading-tight">
                                <span className="font-bold text-lg">{pkg.remainingSessions}</span>
                                <span className="text-xs text-muted-foreground">/ {currentTotal}회</span>
                              </div>
                            </TableCell>

                            {/* 진행률 (고정폭 바 + 한 줄 %) */}
                            <TableCell className={cn(tdClasses, col.progress, 'whitespace-nowrap')}>
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-[56px] bg-gray-200 rounded-full h-1.5 xl:w-[72px]">
                                  <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
                                </div>
                                <span className="text-xs font-medium">{progressPercentage}%</span>
                              </div>
                            </TableCell>

                            {/* 구매일 / 만료일 (한 줄 고정) */}
                            {/* 구매일: 날짜 / 시간 두 줄 */}
                            {(() => {
                              const { date, time } = formatDateSplit(pkg.purchaseDate);
                              return (
                                <TableCell className={cn(tdClasses, col.buy)}>
                                  <div className="flex flex-col items-center leading-tight">
                                    <span className="text-sm">{date}</span>
                                    <span className="text-xs text-muted-foreground">{time}</span>
                                  </div>
                                </TableCell>
                              );
                            })()}

                            {/* 만료일: 날짜 / 시간 두 줄 + 보조 라벨 */}
                            {(() => {
                              const { date, time } = formatDateSplit(expirySource);
                              return (
                                <TableCell className={cn(tdClasses, col.expire)}>
                                  <div className="flex flex-col items-center leading-tight">
                                    <span className="text-sm">{date}</span>
                                    <span className="text-xs text-muted-foreground">{time}</span>
                                    {listState.label !== '취소' && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && <span className="text-xs text-orange-600 font-medium">{daysUntilExpiry}일 남음</span>}
                                    {listState.label === '만료' && <span className="text-xs text-red-600 font-medium">만료됨</span>}
                                  </div>
                                </TableCell>
                              );
                            })()}

                            {/* 상태 = 항상 노출 */}
                            <TableCell className={cn(tdClasses, col.status, 'whitespace-nowrap')}>
                              {(() => {
                                const badgeCls = statusBadgeClass(listState.tone);
                                return (
                                  <Badge className={cn(badgeCls, 'font-medium', badgeSizeCls)} title={`만료기준: ${formatDate(expirySource)}`} aria-label={`표시상태 ${listState.label}`}>
                                    {listState.label}
                                  </Badge>
                                );
                              })()}
                            </TableCell>

                            {/* 결제 = xl 이상에서만 노출 (헤더 규칙과 동일) */}
                            <TableCell className={cn(tdClasses, col.payment, 'whitespace-nowrap hidden xl:table-cell')}>
                              <Badge
                                className={cn(
                                  'border', // ← 결제 배지도 실제 테두리 두께 적용
                                  paymentStatusColors[pkg.paymentStatus as PaymentStatus] ?? paymentStatusColors['결제대기'],
                                  'font-medium',
                                  badgeSizeCls
                                )}
                                aria-label={`결제상태 ${String(pkg.paymentStatus)}`}
                              >
                                {pkg.paymentStatus}
                              </Badge>
                            </TableCell>

                            {/* 금액 (우정렬 + 한 줄) */}
                            <TableCell className={cn(tdClasses, col.price, 'whitespace-nowrap')}>
                              <span className="font-medium">{formatCurrency(pkg.price)}</span>
                            </TableCell>

                            {/* 작업 */}
                            <TableCell className={cn(tdClasses, col.actions, 'p-0')}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>작업</DropdownMenuLabel>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/packages/${pkg.id}`}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      상세 보기
                                    </Link>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                {/* pagination */}
                <div className="relative mt-4 h-12">
                  <div className="absolute inset-x-0 top-[55%] -translate-y-1/2 flex items-center justify-center gap-1">
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => goToPage(1)} disabled={page <= 1} aria-label="첫 페이지">
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label="이전">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {pageItems.map((it, idx) =>
                      typeof it === 'number' ? (
                        <Button key={idx} variant={it === page ? 'default' : 'outline'} className="h-9 min-w-9 px-3" aria-current={it === page ? 'page' : undefined} onClick={() => goToPage(it)}>
                          {it}
                        </Button>
                      ) : (
                        <span key={idx} className="px-2 text-muted-foreground select-none">
                          …
                        </span>
                      )
                    )}
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} aria-label="다음">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => goToPage(totalPages)} disabled={page >= totalPages} aria-label="끝 페이지">
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
