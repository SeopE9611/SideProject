'use client';

import type React from 'react';

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
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useDebouncedValue } from '@/app/admin/packages/_hooks/useDebouncedValue';
import { getAdminErrorMessage } from '@/lib/admin/adminFetcher';
import { buildQueryString } from '@/lib/admin/urlQuerySync';
import { useAdminListQueryState } from '@/lib/admin/useAdminListQueryState';
import { DEFAULT_PACKAGE_LIST_FILTERS, PASS_STATUS_LABELS, badgeSizeCls, fetcher, packageStatusColors, packageTypeColors, paymentStatusColors, type PackageListItem, type PackageMetrics, type PackageOrder, type PackageType, type PackagesResponse, type PassStatus, type PaymentStatus, type ServiceType, type SortKey } from '@/app/admin/packages/_lib/packagesPageConfig';

function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted dark:bg-card', className)} />;
}

function SortableTH({
  k,
  className = '',
  label,
  thClasses,
  ariaSort,
  onSort,
  active,
  icon,
}: {
  k: SortKey;
  className?: string;
  label: React.ReactNode;
  thClasses: string;
  ariaSort: 'none' | 'ascending' | 'descending';
  onSort: (key: SortKey) => void;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <TableHead className={cn(thClasses, className)} role="columnheader" aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          'inline-flex w-full items-center justify-center gap-1 cursor-pointer select-none',
          'hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded',
          active && 'text-primary',
        )}
      >
        {label} {icon}
        <span className="sr-only">정렬</span>
      </button>
    </TableHead>
  );
}

export default function PackageOrdersClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const DEFAULTS = DEFAULT_PACKAGE_LIST_FILTERS;

  const PASS_STATUS_VALUES: ReadonlyArray<'all' | PassStatus> = ['all', '비활성', '활성', '만료', '취소'];
  const PACKAGE_TYPE_VALUES: ReadonlyArray<'all' | PackageType> = ['all', '10회권', '30회권', '50회권', '100회권'];
  const PAYMENT_STATUS_VALUES: ReadonlyArray<'all' | PaymentStatus> = ['all', '결제완료', '결제대기', '결제취소'];
  const SERVICE_TYPE_VALUES: ReadonlyArray<'all' | ServiceType> = ['all', '방문', '출장'];

  const isPassStatusFilter = (value: string | null): value is 'all' | PassStatus => !!value && PASS_STATUS_VALUES.includes(value as 'all' | PassStatus);
  const isPaymentStatusFilter = (value: string | null): value is 'all' | PaymentStatus => !!value && PAYMENT_STATUS_VALUES.includes(value as 'all' | PaymentStatus);
  const isServiceTypeFilter = (value: string | null): value is 'all' | ServiceType => !!value && SERVICE_TYPE_VALUES.includes(value as 'all' | ServiceType);
  const isPackageTypeFilter = (value: string | null): value is 'all' | PackageType => !!value && PACKAGE_TYPE_VALUES.includes(value as 'all' | PackageType);

  const { state, patchState, setPage } = useAdminListQueryState<{
    page: number;
    searchTerm: string;
    statusFilter: 'all' | PassStatus;
    packageTypeFilter: 'all' | PackageType;
    paymentFilter: 'all' | PaymentStatus;
    serviceTypeFilter: 'all' | ServiceType;
    sortBy: SortKey | null;
    sortDirection: 'asc' | 'desc';
  }>({
    pathname: pathname || '/admin/packages',
    searchParams,
    replace: router.replace,
    defaults: {
      page: DEFAULTS.page,
      searchTerm: DEFAULTS.q,
      statusFilter: DEFAULTS.status,
      packageTypeFilter: DEFAULTS.package,
      paymentFilter: DEFAULTS.payment,
      serviceTypeFilter: DEFAULTS.service,
      sortBy: DEFAULTS.sortBy,
      sortDirection: DEFAULTS.sortDirection,
    },
    parse: (sp, defaults) => {
      const pkgRaw = sp.get('package');
      const normalizedPkg = pkgRaw && ['10', '30', '50', '100'].includes(pkgRaw) ? `${pkgRaw}회권` : pkgRaw;
      const sortParam = sp.get('sort');
      let sortBy: SortKey | null = defaults.sortBy;
      let sortDirection: 'asc' | 'desc' = defaults.sortDirection;
      if (sortParam) {
        const [rk, rd] = sortParam.split(':');
        if (rk && ['customer', 'purchaseDate', 'expiryDate', 'remainingSessions', 'price', 'status', 'payment', 'package', 'progress'].includes(rk)) sortBy = rk as SortKey;
        if (rd === 'asc' || rd === 'desc') sortDirection = rd;
      }

      return {
        page: Math.max(1, Number.parseInt(sp.get('page') || String(defaults.page), 10) || defaults.page),
        searchTerm: (sp.get('q') || defaults.searchTerm).trim(),
        statusFilter: isPassStatusFilter(sp.get('status')) ? (sp.get('status') as 'all' | PassStatus) : defaults.statusFilter,
        paymentFilter: isPaymentStatusFilter(sp.get('payment')) ? (sp.get('payment') as 'all' | PaymentStatus) : defaults.paymentFilter,
        serviceTypeFilter: isServiceTypeFilter(sp.get('service')) ? (sp.get('service') as 'all' | ServiceType) : defaults.serviceTypeFilter,
        packageTypeFilter: isPackageTypeFilter(normalizedPkg) ? normalizedPkg : defaults.packageTypeFilter,
        sortBy,
        sortDirection,
      };
    },
    toQueryParams: (queryState) => ({
      q: queryState.searchTerm.trim(),
      status: queryState.statusFilter,
      package: queryState.packageTypeFilter !== 'all' ? queryState.packageTypeFilter.replace('회권', '') : 'all',
      payment: queryState.paymentFilter,
      service: queryState.serviceTypeFilter,
      sort: queryState.sortBy ? `${queryState.sortBy}:${queryState.sortDirection}` : undefined,
      page: queryState.page === DEFAULTS.page ? undefined : queryState.page,
      limit: DEFAULTS.limit,
    }),
    pageResetKeys: ['searchTerm', 'statusFilter', 'packageTypeFilter', 'paymentFilter', 'serviceTypeFilter', 'sortBy', 'sortDirection'],
  });

  const { page, searchTerm, statusFilter, packageTypeFilter, paymentFilter, serviceTypeFilter, sortBy, sortDirection } = state;
  const [nowTs] = useState(() => new Date().getTime());
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  // 한 페이지에 보여줄 항목 수
  const limit = 10;

  const queryString = useMemo(
    () =>
      buildQueryString({
        q: debouncedSearch.trim(),
        status: statusFilter,
        package: packageTypeFilter !== 'all' ? packageTypeFilter.replace('회권', '') : 'all',
        payment: paymentFilter,
        service: serviceTypeFilter,
        sort: sortBy ? `${sortBy}:${sortDirection}` : undefined,
        page,
        limit,
      }),
    [debouncedSearch, statusFilter, packageTypeFilter, paymentFilter, serviceTypeFilter, sortBy, sortDirection, page, limit]
  );

  // SWR은 디바운스된 키를 사용
  const { data, error, isValidating, mutate } = useSWR<PackagesResponse>(`/api/admin/package-orders?${queryString}`, fetcher, {
    dedupingInterval: 1000,
    revalidateOnFocus: false,
  });

  const commonErrorMessage = error ? getAdminErrorMessage(error) : null;

  useEffect(() => {
    if (commonErrorMessage) showErrorToast(commonErrorMessage);
  }, [commonErrorMessage]);

  // 데이터 준비
  const packages: PackageListItem[] = data?.items ?? [];
  const totalPages = useMemo(() => Math.max(1, Math.ceil((data?.total ?? 0) / limit)), [data?.total, limit]);

  const metrics = data?.metrics;
  const totalCount = data?.total ?? 0;

  // 총 개수 (현재 필터/검색/정렬 조건 기준 전체)
  const kpiTotal = metrics?.total ?? totalCount;

  // 활성 패키지 수
  const kpiActive = metrics?.active ?? packages.filter((p) => p.passStatus === '활성').length;

  // 총 매출
  const kpiRevenue = metrics?.revenue ?? packages.reduce((sum, p) => sum + p.price, 0);

  // 만료 예정
  const kpiExpSoon = useMemo(() => {
    if (metrics?.expirySoon !== undefined) return metrics.expirySoon;

    return packages.filter((p) => {
      const exp = p.expiryDate ?? null;
      const days = getDaysUntilExpiry(exp);
      const s = computeListStatus(p.paymentStatus, exp);
      return s.label !== '취소' && days <= 30 && days > 0;
    }).length;
  }, [metrics?.expirySoon, packages]);

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

  // totalPages가 줄어든 경우 현재 페이지를 자동 보정
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  if (error) {
    return (
      <div className="container py-6">
          <Card className="border-destructive bg-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">목록을 불러오지 못했습니다.</CardTitle>
              <CardDescription>{commonErrorMessage}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => mutate()} variant="destructive">
                다시 불러오기
              </Button>
            </CardContent>
          </Card>
        </div>
    );
  }

  const goToPage = (p: number) => setPage(Math.min(totalPages, Math.max(1, p)));

  const SortIcon = (k: SortKey) => (
    <ChevronDown className={cn('inline-block h-3 w-3 shrink-0 align-middle transition-transform', sortBy === k ? 'opacity-80' : 'opacity-50', sortBy === k && sortDirection === 'desc' && 'rotate-180')} aria-hidden="true" />
  );


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

  // 표용 짧은 날짜 포맷
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

  // 날짜를 두 줄로 나눠 쓰기
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

  // 안전한 Date 변환 유틸
  function toDateSafe(v?: string | number | Date | null) {
    if (v == null) return null;

    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;

    if (typeof v === 'number') {
      const ms = v < 1e12 ? v * 1000 : v;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    const s = String(v).trim();

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

    const mSep = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
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

  // 만료일까지 남은 일수
  function getDaysUntilExpiry(v?: string | number | Date | null) {
    const d = toDateSafe(v);
    if (!d) return 0;

    const endOfDay = new Date(d);
    endOfDay.setHours(23, 59, 59, 999);

    const diffMs = endOfDay.getTime() - nowTs;
    return Math.ceil(diffMs / 86400000);
  }

  // 금액 포맷터
  const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

  // 현재 화면이 "필터/검색 적용 중"인지 여부
  const hasAnyFilter = !!searchTerm || statusFilter !== 'all' || packageTypeFilter !== 'all' || paymentFilter !== 'all' || serviceTypeFilter !== 'all';

  // 필터 리셋
  const resetFilters = () => {
    patchState({
      searchTerm: '',
      statusFilter: 'all',
      packageTypeFilter: 'all',
      paymentFilter: 'all',
      serviceTypeFilter: 'all',
      page: 1,
    });
  };

  // 정렬 헤더 클릭 핸들러
  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      patchState({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' });
      return;
    }
    patchState({ sortBy: key, sortDirection: 'asc' });
  };

  // 공통 스타일 상수
  const thClasses =
    'sticky top-0 z-10 whitespace-nowrap px-1.5 py-1.5 text-center align-middle ' +
    'bg-card backdrop-blur supports-[backdrop-filter]:bg-card dark:supports-[backdrop-filter]:bg-card ' +
    'border-b border-border text-foreground ' +
    'font-semibold text-[11px] leading-[1.05] box-border';

  const tdClasses = 'px-3 py-2 align-middle text-center text-[11px] leading-tight tabular-nums';

  // 열별 정렬
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

  // ARIA 정렬 상태
  const ariaSort = (k: SortKey) => {
    if (sortBy === k) {
      return sortDirection === 'asc' ? 'ascending' : 'descending';
    }
    return 'none';
  };

  // 진행률 계산
  function calcProgressPercent(usedRaw: unknown, remainingRaw: unknown) {
    const used = Math.max(0, Number(usedRaw) || 0);
    const remaining = Math.max(0, Number(remainingRaw) || 0);
    const total = used + remaining;
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
      expired = eod.getTime() < nowTs;
    }

    if (expired) return { label: '만료', tone: 'muted' as const };
    if (paymentStatus && paymentStatus !== '결제완료') return { label: '비활성', tone: 'warning' as const };
    return { label: '활성', tone: 'success' as const };
  }

  // 상태 뱃지 스타일
  function statusBadgeClass(tone: 'destructive' | 'muted' | 'warning' | 'success') {
    switch (tone) {
      case 'destructive':
        return 'bg-destructive text-destructive border border-destructive';
      case 'muted':
        return 'bg-background text-foreground border border-border';
      case 'warning':
        return 'bg-muted text-primary border border-border';
      case 'success':
      default:
        return 'bg-primary/10 text-primary border border-border';
    }
  }

  // 연장 반영된 만료일
  function getExpirySource(pkg: PackageListItem): string | null {
    return pkg?.expiryDate ?? null;
  }


  // 공통 로딩 플래그
  const isInitialLoading = isValidating && !data;

  return (
    <div
        className="
          min-h-screen
          bg-gradient-to-br from-background via-muted to-card
          dark:bg-gradient-to-br dark:from-background dark:via-muted dark:to-card
        "
      >
        <div className="container py-6">
          {/* 제목 및 설명 */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-background to-card shadow-lg">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              {/* 토큰화 */}
              <h1 className="text-4xl font-bold tracking-tight text-foreground">패키지 관리</h1>
              <p className="mt-2 text-lg text-muted-foreground">스트링 교체 서비스 패키지 주문을 관리하고 처리하세요.</p>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="border-0 bg-card/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">총 패키지</p>
                    <div className="text-3xl font-bold text-foreground">{isInitialLoading ? <SkeletonBox className="h-7 w-20" /> : kpiTotal}</div>
                  </div>
                  <div className="bg-primary rounded-xl p-3">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">활성 패키지</p>
                    <div className="text-3xl font-bold text-success">{isInitialLoading ? <SkeletonBox className="h-7 w-16" /> : kpiActive}</div>
                  </div>
                  <div className="bg-success/10 dark:bg-success/10 rounded-xl p-3">
                    <Calendar className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">총 매출</p>
                    <div className="text-3xl font-bold text-foreground">{isInitialLoading ? <SkeletonBox className="h-7 w-28" /> : formatCurrency(kpiRevenue)}</div>
                  </div>
                  <div className="bg-muted rounded-xl p-3">
                    <CreditCard className="h-6 w-6 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">만료 예정</p>
                    <div className="text-3xl font-bold text-warning">{isInitialLoading ? <SkeletonBox className="h-7 w-14" /> : kpiExpSoon}</div>
                  </div>
                  <div className="bg-warning/10 dark:bg-warning/10 rounded-xl p-3">
                    <Calendar className="h-6 w-6 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 필터 및 검색 카드 */}
          <Card className="mb-6 border-0 bg-card/80 shadow-lg backdrop-blur-sm">
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
                      onChange={(e) => patchState({ searchTerm: e.target.value })}
                    />
                    {searchTerm && (
                      <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3" onClick={() => patchState({ searchTerm: '' })}>
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
                      if (isPassStatusFilter(v)) patchState({ statusFilter: v });
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
                      if (isPackageTypeFilter(v)) patchState({ packageTypeFilter: v });
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
                      if (isPaymentStatusFilter(v)) patchState({ paymentFilter: v });
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
                      if (isServiceTypeFilter(v)) patchState({ serviceTypeFilter: v });
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
          <Card className="border-0 bg-card/80 shadow-lg backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>패키지 목록</CardTitle>
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  총 {totalCount}개의 패키지
                </p>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto md:overflow-x-visible relative px-3 sm:px-4">
              <div className="relative overflow-x-hidden overflow-y-auto rounded-2xl border border-border shadow-sm max-h-[60vh] min-w-0">
                <Table className="w-full table-auto border-separate [border-spacing-block:0.5rem] [border-spacing-inline:0] text-xs " aria-busy={isValidating && packages.length === 0}>
                  <TableHeader className="sticky top-0 bg-background dark:bg-card shadow-sm">
                    <TableRow>
                      <TableHead className={cn(thClasses, 'w-[120px]')}>패키지 ID</TableHead>

                      <SortableTH k="customer" label="고객" className="" thClasses={thClasses} ariaSort={ariaSort('customer')} onSort={handleSort} active={sortBy === 'customer'} icon={SortIcon('customer')} />

                      <SortableTH k="package" label="패키지" className="w-[96px]" thClasses={thClasses} ariaSort={ariaSort('package')} onSort={handleSort} active={sortBy === 'package'} icon={SortIcon('package')} />

                      <SortableTH k="remainingSessions" label="남은 횟수" className="w-[92px] hidden lg:table-cell" thClasses={thClasses} ariaSort={ariaSort('remainingSessions')} onSort={handleSort} active={sortBy === 'remainingSessions'} icon={SortIcon('remainingSessions')} />

                      <SortableTH k="progress" label="진행률" className="w-[96px]" thClasses={thClasses} ariaSort={ariaSort('progress')} onSort={handleSort} active={sortBy === 'progress'} icon={SortIcon('progress')} />

                      <SortableTH k="purchaseDate" label="구매일" className="w-36" thClasses={thClasses} ariaSort={ariaSort('purchaseDate')} onSort={handleSort} active={sortBy === 'purchaseDate'} icon={SortIcon('purchaseDate')} />

                      <SortableTH k="expiryDate" label="만료일" className="w-36" thClasses={thClasses} ariaSort={ariaSort('expiryDate')} onSort={handleSort} active={sortBy === 'expiryDate'} icon={SortIcon('expiryDate')} />

                      <SortableTH k="status" label="상태" className="w-[72px]" thClasses={thClasses} ariaSort={ariaSort('status')} onSort={handleSort} active={sortBy === 'status'} icon={SortIcon('status')} />

                      <SortableTH k="payment" label="결제" className="w-[84px] hidden xl:table-cell" thClasses={thClasses} ariaSort={ariaSort('payment')} onSort={handleSort} active={sortBy === 'payment'} icon={SortIcon('payment')} />

                      <SortableTH k="price" label="금액" className="w-[96px]" thClasses={thClasses} ariaSort={ariaSort('price')} onSort={handleSort} active={sortBy === 'price'} icon={SortIcon('price')} />

                      <TableHead className={cn(thClasses, 'w-[44px] text-center')}>작업</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {/** 로딩 스켈레톤 */}
                    {isValidating && packages.length === 0 && (
                      <>
                        {Array.from({ length: 8 }).map((_, i) => (
                          <TableRow key={`sk-${i}`} className="border-b last:border-0">
                            {/* 패키지 ID */}
                            <TableCell className={cn(tdClasses)}>
                              <SkeletonBox className="h-4 w-24 mx-auto" />
                            </TableCell>

                            {/* 고객 */}
                            <TableCell className={cn(tdClasses)}>
                              <SkeletonBox className="h-4 w-28 mx-auto" />
                            </TableCell>

                            {/* 패키지 */}
                            <TableCell className={cn(tdClasses)}>
                              <SkeletonBox className="h-4 w-16 mx-auto rounded-md" />
                            </TableCell>

                            {/* 남은 횟수 (lg 이상) */}
                            <TableCell className={cn(tdClasses, 'hidden lg:table-cell')}>
                              <SkeletonBox className="h-4 w-12 mx-auto" />
                            </TableCell>

                            {/* 진행률 */}
                            <TableCell className={cn(tdClasses)}>
                              <SkeletonBox className="h-4 w-20 mx-auto" />
                            </TableCell>

                            {/* 구매일 */}
                            <TableCell className={cn(tdClasses)}>
                              <SkeletonBox className="h-4 w-24 mx-auto" />
                            </TableCell>

                            {/* 만료일 */}
                            <TableCell className={cn(tdClasses)}>
                              <SkeletonBox className="h-4 w-24 mx-auto" />
                            </TableCell>

                            {/* 상태 배지 */}
                            <TableCell className={cn(tdClasses)}>
                              <SkeletonBox className="h-5 w-14 mx-auto rounded-full" />
                            </TableCell>

                            {/* 결제 (xl 이상) */}
                            <TableCell className={cn(tdClasses, 'hidden xl:table-cell')}>
                              <SkeletonBox className="h-5 w-16 mx-auto rounded-full" />
                            </TableCell>

                            {/* 금액 */}
                            <TableCell className={cn(tdClasses)}>
                              <SkeletonBox className="h-4 w-16 mx-auto" />
                            </TableCell>

                            {/* 작업 */}
                            <TableCell className={cn(tdClasses)}>
                              <SkeletonBox className="h-6 w-6 mx-auto rounded" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}

                    {/** 빈 상태 */}
                    {!isValidating && packages.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="py-12">
                          <div className="flex flex-col items-center gap-3 text-center">
                            <div className="text-base font-medium text-foreground">{hasAnyFilter ? '검색 결과가 없습니다.' : '등록된 패키지가 없습니다.'}</div>
                            <div className="text-sm text-muted-foreground">{hasAnyFilter ? '검색어나 필터를 조정해 보세요.' : '첫 패키지를 생성해 보세요.'}</div>

                            <div className="mt-2 flex items-center gap-2">
                              {/* 필터 초기화 (URL 쿼리도 정리) */}
                              {hasAnyFilter && (
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    resetFilters(); // state 초기화
                                    router.replace(pathname); // URL 쿼리 제거
                                  }}
                                >
                                  필터 초기화
                                </Button>
                              )}

                              {/* 재시도 */}
                              <Button variant="secondary" onClick={() => mutate()}>
                                다시 불러오기
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {/** 정상 렌더 */}
                    {!isValidating && packages.length > 0 && (
                      <>
                        {packages.map((pkg) => {
                          // 진행률 계산(used / (used + remaining))
                          const { percent: progressPercentage, total: currentTotal } = calcProgressPercent(pkg.usedSessions, pkg.remainingSessions);

                          // 만료일 소스(연장 반영)
                          const expirySource = pkg.expiryDate ?? null;

                          // 상태/남은일수 계산
                          const listState = computeListStatus(pkg.paymentStatus, expirySource);
                          const daysUntilExpiry = getDaysUntilExpiry(expirySource);

                          return (
                            // 라이트/다크 줄 배경 토큰 통일
                            <TableRow key={pkg.id} className="hover:bg-primary/5 transition-colors even:bg-muted/40 border-b last:border-0">
                              {/* 패키지 ID (복사 토스트 포함) */}
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
                                            showSuccessToast('패키지 ID가 클립보드에 복사되었습니다.');
                                          }}
                                        >
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>

                              {/* 고객 (이름/이메일 두 줄) */}
                              <TableCell className={cn(tdClasses, 'text-center')}>
                                {(() => {
                                  const cName = pkg.customer?.name ?? '이름없음';
                                  const cEmail = pkg.customer?.email ?? '';
                                  const baseName = cName.replace(/$$비회원$$\s*$/, '');
                                  const isGuest = cName.includes('(비회원)');
                                  return (
                                    <div className="flex flex-col items-center text-center">
                                      <span className="font-medium max-w-[200px] truncate">
                                        {baseName}
                                        {isGuest && <span className="ml-1 text-xs text-muted-foreground">(비회원)</span>}
                                      </span>
                                      <span className="text-xs text-muted-foreground max-w-[200px] truncate">{cEmail}</span>
                                    </div>
                                  );
                                })()}
                              </TableCell>

                              {/* 패키지 유형 배지 */}
                              <TableCell className={cn(tdClasses, col.type, 'whitespace-nowrap')}>
                                <Badge className={cn('border', packageTypeColors[pkg.packageType], 'font-medium', badgeSizeCls)}>{pkg.packageType}</Badge>
                              </TableCell>

                              {/* 남은 횟수 (lg 이상 노출) */}
                              <TableCell className={cn(tdClasses, col.remain, 'whitespace-nowrap hidden lg:table-cell')}>
                                <div className="flex flex-col items-center leading-tight">
                                  <span className="font-bold text-lg">{pkg.remainingSessions}</span>
                                  <span className="text-xs text-muted-foreground">{pkg.totalSessions ?? currentTotal}회</span>
                                </div>
                              </TableCell>

                              {/* 진행률 (바 + %) */}
                              <TableCell className={cn(tdClasses, col.progress, 'whitespace-nowrap')}>
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-[56px] bg-muted rounded-full h-1.5 xl:w-[72px] dark:bg-card" role="progressbar" aria-label="진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercentage}>
                                    <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
                                  </div>
                                  <span className="text-xs font-medium">{progressPercentage}%</span>
                                </div>
                              </TableCell>

                              {/* 구매일(날짜/시간 두 줄) */}
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

                              {/* 만료일(날짜/시간 + 보조 라벨) */}
                              {(() => {
                                const { date, time } = formatDateSplit(expirySource);
                                return (
                                  <TableCell className={cn(tdClasses, col.expire)}>
                                    <div className="flex flex-col items-center leading-tight">
                                      <span className="text-sm">{date}</span>
                                      <span className="text-xs text-muted-foreground">{time}</span>
                                      {listState.label !== '취소' && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && <span className="text-xs text-warning font-medium">{daysUntilExpiry}일 남음</span>}
                                      {listState.label === '만료' && <span className="text-xs text-destructive font-medium">만료됨</span>}
                                    </div>
                                  </TableCell>
                                );
                              })()}

                              {/* 상태 배지 */}
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

                              {/* 결제 배지 (xl 이상) */}
                              <TableCell className={cn(tdClasses, col.payment, 'whitespace-nowrap hidden xl:table-cell')}>
                                <Badge className={cn('border', paymentStatusColors[pkg.paymentStatus === '결제완료' || pkg.paymentStatus === '결제대기' || pkg.paymentStatus === '결제취소' ? pkg.paymentStatus : '결제대기'], 'font-medium', badgeSizeCls)} aria-label={`결제상태 ${String(pkg.paymentStatus)}`}>
                                  {pkg.paymentStatus}
                                </Badge>
                              </TableCell>

                              {/* 금액 */}
                              <TableCell className={cn(tdClasses, col.price, 'whitespace-nowrap')}>
                                <span className="font-medium">{formatCurrency(pkg.price)}</span>
                              </TableCell>

                              {/* 작업 드롭다운 */}
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
                        })}
                      </>
                    )}
                  </TableBody>
                </Table>
                {/* pagination */}
                <div className="relative mt-4 h-12">
                  <div className="absolute inset-x-0 top-[55%] -translate-y-1/2 flex items-center justify-center gap-1">
                    <Button variant="outline" size="icon" className="h-9 w-9 bg-transparent" onClick={() => goToPage(1)} disabled={page <= 1} aria-label="첫 페이지">
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9 bg-transparent" onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label="이전">
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
                    <Button variant="outline" size="icon" className="h-9 w-9 bg-transparent" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} aria-label="다음">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9 bg-transparent" onClick={() => goToPage(totalPages)} disabled={page >= totalPages} aria-label="끝 페이지">
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
