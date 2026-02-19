'use client';

import useSWR from 'swr';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Copy, Eye, MoreHorizontal, Package, Search, Truck, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { badgeBase, badgeSizeSm } from '@/lib/badge-style';
import { shortenId } from '@/lib/shorten';
// import CleanupCreatedButton from '@/app/admin/rentals/_components/CleanupCreatedButton';
import { derivePaymentStatus, deriveShippingStatus } from '@/app/features/rentals/utils/status';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { racketBrandLabel } from '@/lib/constants';
import { AdminBadgeRow, BadgeItem } from '@/components/admin/AdminBadgeRow';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import type { AdminRentalListItemDto, AdminRentalPaymentFilter, AdminRentalsListResponseDto, AdminRentalShippingFilter } from '@/types/admin/rentals';
import { adminFetcher, adminMutator, ensureAdminMutationSucceeded, getAdminErrorMessage } from '@/lib/admin/adminFetcher';
import { runAdminActionWithToast } from '@/lib/admin/adminActionHelpers';

type RentalRow = AdminRentalListItemDto & { id: string; createdAt: string; dueAt: string | null; depositRefundedAt: string | null };

const PAY_FILTERS: AdminRentalPaymentFilter[] = ['all', 'unpaid', 'paid'];
const SHIP_FILTERS: AdminRentalShippingFilter[] = ['all', 'none', 'outbound-set', 'return-set', 'both-set'];

function toIsoOrNull(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapApiToViewModel(response?: AdminRentalsListResponseDto): { items: RentalRow[]; total: number } {
  if (!response) return { items: [], total: 0 };
  return {
    total: response.total,
    items: response.items.map((item) => ({
      ...item,
      id: item.id ?? '',
      createdAt: toIsoOrNull(item.createdAt) ?? new Date(0).toISOString(),
      dueAt: toIsoOrNull(item.dueAt),
      depositRefundedAt: toIsoOrNull(item.depositRefundedAt),
    })),
  };
}

const won = (n: number) => (n || 0).toLocaleString('ko-KR') + '원';

const rentalStatusColors: Record<string, string> = {
  pending: 'bg-card text-muted-foreground dark:bg-card',
  paid: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20',
  out: 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20',
  returned: 'bg-green-500/10 text-green-500 dark:bg-green-500/20',
};

const rentalStatusLabels: Record<string, string> = {
  pending: '대기중',
  paid: '결제완료',
  out: '대여중',
  returned: '반납완료',
  canceled: '취소됨',
};

export default function AdminRentalsClient() {
  /**
   *  관리자 UX용 뱃지(대여 페이지)
   *  - Orders 페이지와 동일하게 “시나리오(F#)” + “정산 앵커”를 표준화해
   *    운영자가 페이지를 옮겨 다녀도 같은 언어로 인지할 수 있게 만든다.
   * - 운영자가 “이 대여가 단독인지 / 교체서비스 포함인지 / 신청서 연결인지”를 한눈에 확인.
   */
  function getKindBadge() {
    return { label: '대여', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200' };
  }
  function getServiceBadge(r: RentalRow) {
    if (r.withStringService) {
      return { label: '교체서비스 포함', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' };
    }
    return { label: '단독', className: 'bg-background text-foreground' };
  }
  function getLinkBadge(r: RentalRow) {
    if (r.stringingApplicationId) {
      return { label: '신청서 연결', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200' };
    }
    return null;
  }

  type Flow = 6 | 7;
  const FLOW_LABEL: Record<Flow, string> = {
    6: '라켓 단품 대여',
    7: '라켓 대여 + 스트링 선택 + 교체서비스 신청(통합)',
  };
  const FLOW_SHORT: Record<Flow, string> = {
    6: 'F6 대여',
    7: 'F7 대여+신청',
  };
  const FLOW_BADGE_CLASS: Record<Flow, string> = {
    6: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200',
    7: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200',
  };

  function getFlowBadge(r: RentalRow) {
    // 대여 페이지에서는 “신청서 연결(또는 교체서비스 포함)”이면 통합(F7), 아니면 단독 대여(F6)로 취급
    const isIntegrated = !!r.stringingApplicationId || !!r.withStringService;
    const flow: Flow = isIntegrated ? 7 : 6;
    return { flow, shortLabel: FLOW_SHORT[flow], label: FLOW_LABEL[flow], className: FLOW_BADGE_CLASS[flow] };
  }

  function getSettlementBadge() {
    // 대여 화면의 정산 앵커는 항상 “대여”
    return { label: '정산: 대여', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' };
  }

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<null | { type: 'return' | 'refundMark' | 'refundClear'; rentalId: string }>(null);
  const [status, setStatus] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const initialPay = searchParams.get('pay');
  const [payFilter, setPayFilter] = useState<AdminRentalPaymentFilter>(initialPay && PAY_FILTERS.includes(initialPay as AdminRentalPaymentFilter) ? (initialPay as AdminRentalPaymentFilter) : 'all');
  const initialShip = searchParams.get('ship');
  const [shipFilter, setShipFilter] = useState<AdminRentalShippingFilter>(initialShip && SHIP_FILTERS.includes(initialShip as AdminRentalShippingFilter) ? (initialShip as AdminRentalShippingFilter) : 'all');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'customer' | 'date' | 'total' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const pageSize = 20;
  // 쿼리 → 상태 1회 동기화(직접 새로고침 대비)
  /** URL 쿼리스트링을 읽어 현재 화면의 필터 상태로 반영 */
  function applyURLParamsToFilterState() {
    const get = (k: string) => searchParams.get(k) ?? '';

    // 검색/상태/결제/배송
    const queryText = get('q');
    const statusParam = get('status');
    const payParam = get('pay');
    const shipParam = get('ship');

    // 기간/페이지/정렬
    const fromParam = get('from');
    const toParam = get('to');
    const pageParam = Number(searchParams.get('page') ?? 1);
    const sortByParam = (searchParams.get('sortBy') as 'customer' | 'date' | 'total' | null) ?? null;
    const orderParam = (searchParams.get('order') as 'asc' | 'desc' | null) ?? null;

    if (queryText) setSearchTerm(queryText);
    if (statusParam) setStatus(statusParam);
    if (payParam && PAY_FILTERS.includes(payParam as AdminRentalPaymentFilter)) setPayFilter(payParam as AdminRentalPaymentFilter);
    if (shipParam && SHIP_FILTERS.includes(shipParam as AdminRentalShippingFilter)) setShipFilter(shipParam as AdminRentalShippingFilter);
    if (fromParam) setFrom(fromParam);
    if (toParam) setTo(toParam);
    if (!Number.isNaN(pageParam) && pageParam > 0) setPage(pageParam);
    if (sortByParam) setSortBy(sortByParam);
    if (orderParam) setSortDirection(orderParam);
  }

  useEffect(() => {
    applyURLParamsToFilterState();
  }, []);

  const qs = new URLSearchParams();
  if (payFilter !== 'all') qs.set('pay', payFilter);
  if (shipFilter !== 'all') qs.set('ship', shipFilter);
  if (status) qs.set('status', status);

  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  function formatYMD(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function setPreset(range: 'today' | '7d' | '30d' | 'thisMonth') {
    const now = new Date();
    let f = new Date();
    let t = new Date();
    if (range === 'today') {
      // f=t=오늘
    } else if (range === '7d') {
      f.setDate(now.getDate() - 6); // 오늘 포함 7일
    } else if (range === '30d') {
      f.setDate(now.getDate() - 29);
    } else if (range === 'thisMonth') {
      f = new Date(now.getFullYear(), now.getMonth(), 1);
      t = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    setFrom(formatYMD(f));
    setTo(formatYMD(t));
  }

  qs.set('page', String(page));
  qs.set('pageSize', String(pageSize));
  const key = `/api/admin/rentals?${qs.toString()}`;

  /** 현재 필터 상태를 URL 쿼리스트링에 기록(히스토리 오염 방지를 위해 replace 사용) */
  function updateURLFromFilterState() {
    const url = new URL(window.location.href);

    const setParam = (key: string, value?: string | number | null) => {
      if (value === undefined || value === null || value === '' || value === 'all') {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, String(value));
      }
    };

    setParam('q', searchTerm);
    setParam('status', status);
    setParam('pay', payFilter);
    setParam('ship', shipFilter);
    setParam('from', from);
    setParam('to', to);
    setParam('page', page === 1 ? undefined : page);
    setParam('sortBy', sortBy ?? undefined);
    setParam('order', sortDirection ?? undefined);

    router.replace(url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
  }

  /** 화면의 필터 상태를 기본값으로 되돌리고, URL 쿼리도 함께 제거 */
  function resetAllFiltersAndURL() {
    setSearchTerm('');
    setStatus('');
    setBrand(''); // 사용 중이면 유지, 아니면 제거해도 무방
    setFrom('');
    setTo('');
    setPayFilter('all');
    setShipFilter('all');
    setPage(1);
    setSortBy(null);
    setSortDirection('asc');
    router.replace(pathname); // 쿼리 전부 제거
  }

  // 상태 변경 시 URL 동기화 (200ms 디바운스)
  useEffect(() => {
    const timer = setTimeout(updateURLFromFilterState, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, status, payFilter, shipFilter, from, to, page, sortBy, sortDirection]);

  const { data: apiData, isLoading, mutate, error } = useSWR<AdminRentalsListResponseDto>(key, adminFetcher);
  const data = useMemo(() => mapApiToViewModel(apiData), [apiData]);
  const commonErrorMessage = error ? getAdminErrorMessage(error) : null;

  useEffect(() => {
    if (commonErrorMessage) showErrorToast(commonErrorMessage);
  }, [commonErrorMessage]);

  const filteredRentals = data.items.filter((rental) => {
    const searchMatch =
      rental.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.customer?.email.toLowerCase().includes(searchTerm.toLowerCase());
    return searchMatch;
  });

  const viewItems = data.items.filter((r) => {
    const pay = derivePaymentStatus(r);
    const ship = deriveShippingStatus(r);
    const okPay = payFilter === 'all' ? true : payFilter === pay;
    const okShip = shipFilter === 'all' ? true : shipFilter === ship;
    // 기존 검색어 필터와 결합
    const q = searchTerm.toLowerCase();
    const searchMatch =
      (r.id || '').toLowerCase().includes(q) ||
      (r.stringingApplicationId || '').toLowerCase().includes(q) ||
      (r.brand || '').toLowerCase().includes(q) ||
      (r.model || '').toLowerCase().includes(q) ||
      (r.customer?.name || '').toLowerCase().includes(q) ||
      (r.customer?.email || '').toLowerCase().includes(q);

    return okPay && okShip && searchMatch;
  });

  const sortedRentals = [...viewItems].sort((a, b) => {
    if (!sortBy) return 0;
    let aValue: string | number = '';
    let bValue: string | number = '';

    switch (sortBy) {
      case 'customer':
        aValue = (a.customer?.name || '').toLowerCase();
        bValue = (b.customer?.name || '').toLowerCase();
        break;
      case 'date':
        aValue = new Date(a.createdAt || 0).getTime();
        bValue = new Date(b.createdAt || 0).getTime();
        break;
      case 'total':
        aValue = a.amount.total;
        bValue = b.amount.total;
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const markRefund = async (id: string, mark: boolean) => {
    if (busyId) return;
    setBusyId(id);

    const result = await runAdminActionWithToast<{ ok?: boolean; message?: string }>({
      action: async () => {
        const json = await adminMutator<{ ok?: boolean; message?: string }>(`/api/admin/rentals/${encodeURIComponent(id)}/deposit/refund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: mark ? 'mark' : 'clear' }),
        });
        ensureAdminMutationSucceeded(json, '처리 실패');
        return json;
      },
      successMessage: mark ? '환불 처리 완료' : '환불 해제 완료',
      fallbackErrorMessage: '처리 실패',
    });

    if (result) await mutate();
    setBusyId(null);
  };

  const onReturn = async (id?: string) => {
    const safe = (id ?? '').trim();
    if (!safe) {
      showErrorToast('유효하지 않은 대여 ID입니다.');
      return;
    }

    const result = await runAdminActionWithToast({
      action: () => adminMutator(`/api/admin/rentals/${encodeURIComponent(safe)}/return`, { method: 'POST' }),
      successMessage: '반납 처리 완료',
      fallbackErrorMessage: '반납 처리 실패',
    });

    if (result) mutate();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatus('');
    setBrand('');
    setFrom('');
    setTo('');
    setPayFilter('all');
    setShipFilter('all');
    const u = new URL(window.location.href);
    u.searchParams.delete('pay');
    u.searchParams.delete('ship');
    router.replace(u.pathname + (u.searchParams.toString() ? '?' + u.searchParams.toString() : ''));
  };

  const handleSort = (key: 'customer' | 'date' | 'total') => {
    if (sortBy === key) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(dateString));

  function getPaginationItems(page: number, totalPages: number, delta = 2): (number | string)[] {
    if (totalPages <= 1) return [1];
    const items: (number | string)[] = [1];
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);
    if (left > 2) items.push('dots-left');
    for (let i = left; i <= right; i++) items.push(i);
    if (right < totalPages - 1) items.push('dots-right');
    items.push(totalPages);
    return items;
  }

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const thClasses = 'px-4 py-2 text-center align-middle border-b border-border dark:border-border font-semibold text-foreground';
  const tdClasses = 'px-3 py-4 align-middle text-center';

  function PaymentBadge({ item }: { item: RentalRow }) {
    const s = derivePaymentStatus(item);
    return s === 'paid' ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[11px]">결제확정</span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[11px]">입금대기</span>
    );
  }

  function ShippingBadge({ item }: { item: RentalRow }) {
    const s = deriveShippingStatus(item);

    if (s === 'both-set') {
      return (
        <div className="inline-flex gap-1">
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[11px]">출고</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-violet-100 text-violet-700 text-[11px]">반납</span>
        </div>
      );
    }

    const map = {
      none: ['운송장 없음', 'bg-background text-foreground'],
      'outbound-set': ['출고 운송장', 'bg-indigo-100 text-indigo-700'],
      'return-set': ['반납 운송장', 'bg-violet-100 text-violet-700'],
    } as const;

    const [label, cls] = map[s];
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] ${cls}`}>{label}</span>;
  }

  return (
    <div className="container py-6">
      <div className="mx-auto max-w-7xl mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">대여(라켓) 관리</h1>
            <p className="mt-1 text-xs text-muted-foreground">라켓 대여를 관리합니다. 교체서비스 포함 대여는 “신청서 연결”로 표시됩니다.</p>
          </div>
          {/* 유지보수: created 청소 버튼 */}
          {/* <CleanupCreatedButton hours={2} /> */}
        </div>
      </div>

      <Card className="mb-5 rounded-xl border-border dark:border-border bg-card dark:bg-card shadow-md px-6 py-5">
        <CardHeader className="pb-3">
          <CardTitle>필터 및 검색</CardTitle>
          <CardDescription className="text-xs">대여 상태와 날짜로 필터링하거나 대여 ID, 고객명, 이메일, 브랜드, 모델로 검색하세요.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                value={searchTerm}
                onChange={(e) => {
                  setPage(1);
                  setSearchTerm(e.target.value);
                }}
                placeholder="대여 ID, 고객명, 이메일, 브랜드, 모델 검색..."
                className="pl-8 w-full"
                aria-label="통합 검색"
              />
            </div>

            <Button variant="outline" className="shrink-0" onClick={resetAllFiltersAndURL}>
              필터 초기화
            </Button>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div className="flex items-center">
              <Select
                value={status || 'all'}
                onValueChange={(v) => {
                  setPage(1);
                  setStatus(v === 'all' ? '' : (v as string));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="상태(전체)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">상태(전체)</SelectItem>
                  <SelectItem value="pending">대기중</SelectItem>
                  <SelectItem value="paid">결제완료</SelectItem>
                  <SelectItem value="out">대여중</SelectItem>
                  <SelectItem value="returned">반납완료</SelectItem>
                  <SelectItem value="canceled">취소</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center">
              <Select
                value={payFilter}
                onValueChange={(v) => {
                  setPage(1);
                  if (PAY_FILTERS.includes(v as AdminRentalPaymentFilter)) setPayFilter(v as AdminRentalPaymentFilter);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="결제(전체)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">결제(전체)</SelectItem>
                  <SelectItem value="pending">결제대기</SelectItem>
                  <SelectItem value="paid">결제확정</SelectItem>
                  <SelectItem value="refunded">환불</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center">
              <Select
                value={shipFilter}
                onValueChange={(v) => {
                  setPage(1);
                  if (SHIP_FILTERS.includes(v as AdminRentalShippingFilter)) setShipFilter(v as AdminRentalShippingFilter);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="배송(전체)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">배송(전체)</SelectItem>
                  <SelectItem value="none">운송장 없음</SelectItem>
                  <SelectItem value="outbound-set">출고 운송장</SelectItem>
                  <SelectItem value="return-set">반납 운송장</SelectItem>
                  <SelectItem value="both-set">출고+반납</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden lg:block" />
            <div className="hidden lg:block" />
            <div className="hidden lg:block" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setPage(1);
                setFrom(e.target.value);
              }}
              placeholder="시작일"
              aria-label="시작일(From)"
              className="h-9 w-[150px]"
            />
            <span className="text-xs text-muted-foreground">~</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setPage(1);
                setTo(e.target.value);
              }}
              placeholder="종료일"
              aria-label="종료일(To)"
              className="h-9 w-[150px]"
            />

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreset('today')}>
                오늘
              </Button>
              <Button variant="outline" onClick={() => setPreset('7d')}>
                7일
              </Button>
              <Button variant="outline" onClick={() => setPreset('30d')}>
                30일
              </Button>
              <Button variant="outline" onClick={() => setPreset('thisMonth')}>
                이번 달
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border dark:border-border bg-card dark:bg-card shadow-md px-4 py-5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            {data ? (
              <>
                <CardTitle className="text-base font-medium">대여 목록</CardTitle>
                <p className="text-xs text-muted-foreground">총 {data.total}개의 대여</p>
              </>
            ) : (
              <>
                <Skeleton className="h-5 w-24 rounded bg-muted dark:bg-card" />
                <Skeleton className="h-4 w-36 rounded bg-background dark:bg-card" />
              </>
            )}
          </div>
          {/* “이 화면에서 무엇이 다른지”를 즉시 이해시키는 장치 */}
          <div className="px-6 -mt-2 mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', getKindBadge().className)}>{getKindBadge().label}</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', 'bg-background text-foreground')}>단독</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200')}>교체서비스 포함</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200')}>신청서 연결</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', FLOW_BADGE_CLASS[6])}>{FLOW_SHORT[6]}</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', FLOW_BADGE_CLASS[7])}>{FLOW_SHORT[7]}</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', getSettlementBadge().className)}>{getSettlementBadge().label}</Badge>
            <span className="ml-1">• 신청서 연결이 있으면 신청서 상세로 바로 이동할 수 있습니다</span>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto md:overflow-x-visible scrollbar-hidden relative pr-2 md:pr-0">
          <Table className="w-full table-auto border-separate [border-spacing-block:0.5rem] [border-spacing-inline:0] text-xs">
            <TableHeader className="sticky top-0 bg-background shadow-sm">
              <TableRow>
                <TableHead className={cn(thClasses, 'w-[140px]')}>대여 ID</TableHead>
                <TableHead onClick={() => handleSort('customer')} className={cn(thClasses, 'text-center cursor-pointer select-none transition-colors hover:text-primary', sortBy === 'customer' && 'text-primary')}>
                  고객
                  <ChevronDown className={cn('inline ml-1 w-3 h-3 text-muted-foreground transition-transform', sortBy === 'customer' && sortDirection === 'desc' && 'rotate-180')} />
                </TableHead>
                <TableHead className={cn(thClasses, 'text-center')}>라켓</TableHead>
                <TableHead onClick={() => handleSort('date')} className={cn(thClasses, 'w-36 cursor-pointer select-none transition-colors hover:text-primary', sortBy === 'date' && 'text-primary')}>
                  대여일
                  <ChevronDown className={cn('inline ml-1 w-3 h-3 text-muted-foreground transition-transform', sortBy === 'date' && sortDirection === 'desc' && 'rotate-180')} />
                </TableHead>
                <TableHead className={cn(thClasses, 'text-center')}>기간</TableHead>
                <TableHead className={cn(thClasses, 'text-center')}>상태</TableHead>
                <TableHead className={cn(thClasses, 'text-center')}>결제/배송</TableHead>
                <TableHead onClick={() => handleSort('total')} className={cn(thClasses, 'text-center cursor-pointer select-none', sortBy === 'total' && 'text-primary')}>
                  금액
                  <ChevronDown className={cn('inline ml-1 w-3 h-3 text-muted-foreground transition-transform', sortBy === 'total' && sortDirection === 'desc' && 'rotate-180')} />
                </TableHead>
                <TableHead className={cn(thClasses, 'text-center')}>…</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {Array.from({ length: 9 }).map((_, cellIdx) => (
                      <TableCell key={cellIdx}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !data || data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className={tdClasses}>
                    불러올 대여가 없습니다.
                  </TableCell>
                </TableRow>
              ) : sortedRentals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className={tdClasses}>
                    검색 결과가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                sortedRentals.map((r, idx) => {
                  const rid = r.id;
                  const kind = getKindBadge();
                  const svc = getServiceBadge(r);
                  const link = getLinkBadge(r);
                  const flow = getFlowBadge(r);
                  const settlement = getSettlementBadge();
                  const warnMissingApp = !!r.withStringService && !r.stringingApplicationId;
                  return (
                    <TableRow key={rid || `row-${idx}`} className="hover:bg-muted/50 transition-colors">
                      <TableCell className={cn(tdClasses, 'pl-6')}>
                        <TooltipProvider delayDuration={10}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex flex-col items-start gap-1 max-w-[140px] cursor-pointer"
                                onClick={() => {
                                  navigator.clipboard.writeText(rid);
                                  showSuccessToast('대여 ID가 클립보드에 복사되었습니다.');
                                }}
                              >
                                <div className="inline-flex items-center gap-1 w-full truncate">
                                  {/* 취소요청 들어온 대여만 경고 아이콘 표시 */}
                                  {r.cancelRequest?.status === 'requested' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-label="취소 요청된 대여" />}
                                  <span className="inline-block truncate">{shortenId(rid)}</span>
                                </div>

                                {/* 단독/교체서비스 포함/신청서 연결 여부 */}
                     {(() => {
                                  // 테이블 난잡도 개선: badge 목록을 구성하고 AdminBadgeRow로 “접기” 처리
                                  const items: BadgeItem[] = [
                                    { label: kind.label, className: kind.className, title: '문서 종류' },
                                    { label: svc.label, className: svc.className, title: '교체서비스 포함 여부' },
                                    ...(link ? [{ label: link.label, className: link.className, title: '신청서 연결 여부' }] : []),
                                    { label: flow.shortLabel, className: flow.className, title: `시나리오: ${flow.label}` },
                                    { label: settlement.label, className: settlement.className, title: '정산 앵커' },
                                  ];
                                  return <AdminBadgeRow maxVisible={3} items={items} />;
                                })()}
                              </button>
                            </TooltipTrigger>

                            <TooltipContent
                              side="top"
                              align="center"
                              sideOffset={6}
                              style={{
                                backgroundColor: 'rgb(var(--popover))',
                                color: 'rgb(var(--popover-foreground))',
                              }}
                              className="px-5 py-2.5 rounded-lg shadow-lg border text-base min-w-[240px]"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">{rid}</span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      navigator.clipboard.writeText(rid);
                                      showSuccessToast('대여 ID가 클립보드에 복사되었습니다.');
                                    }}
                                  >
                                    <Copy className="w-4 h-4" />
                                    <span className="sr-only">복사</span>
                                  </Button>
                                </div>

                                {r.cancelRequest?.status === 'requested' && <p className="mt-2 text-sm text-amber-500">취소 요청이 접수된 대여입니다.</p>}

                                {/* 교체서비스 포함 안내 */}
                                {r.withStringService && <p className="mt-2 text-[11px] text-muted-foreground">교체서비스 포함 대여입니다. (신청서 연결 시 신청서에서 상태/배송을 관리합니다)</p>}
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                  시나리오: <span className="font-medium text-foreground">{flow.label}</span>
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground">{settlement.label}</p>
                                {warnMissingApp && <p className="mt-2 text-[11px] text-amber-500">주의: 교체서비스 포함인데 신청서 연결이 없습니다.</p>}

                                {/* 신청서 연결이 있으면 툴팁에서 바로 이동 링크 제공 */}
                                {r.stringingApplicationId && (
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    연결 신청서: <span className="font-mono">{shortenId(String(r.stringingApplicationId))}</span>{' '}
                                    <Link href={`/admin/applications/stringing/${encodeURIComponent(String(r.stringingApplicationId))}`} className="ml-1 underline underline-offset-2 text-primary">
                                      신청서 보기
                                    </Link>
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      <TableCell className={tdClasses}>
                        <div className="flex flex-col items-center">
                          <span>{r.customer?.name || '-'}</span>
                          <span className="text-[11px] text-muted-foreground">{r.customer?.email || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className={tdClasses}>
                        {rid ? (
                          <Link href={`/admin/rentals/${rid}`} className="underline-offset-2 hover:underline font-medium">
                            {racketBrandLabel(r.brand)} {r.model}
                          </Link>
                        ) : (
                          <span>
                            {racketBrandLabel(r.brand)} {r.model}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="w-36 truncate whitespace-nowrap">{r.createdAt ? formatDate(r.createdAt) : '-'}</TableCell>
                      <TableCell className={tdClasses}>{r.days}일</TableCell>
                      <TableCell className={tdClasses}>
                        <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', rentalStatusColors[r.status])}>{rentalStatusLabels[r.status] || r.status}</Badge>
                      </TableCell>
                      <TableCell className={tdClasses}>
                        <div className="flex gap-1 justify-center">
                          <PaymentBadge item={r} />
                          <ShippingBadge item={r} />
                        </div>
                      </TableCell>
                      <TableCell className={tdClasses}>
                        <div className="flex flex-col items-center">
                          <span className="font-semibold">{won(r.amount.total)}</span>
                          <span className="text-[10px] text-muted-foreground">
                            수수료: {won(r.amount.fee)} / 보증금: {won(r.amount.deposit)}
                          </span>
                          {/* 스트링/교체비: 있을 때만 추가 노출 (대여만 한 케이스 UI 과밀 방지) */}
                          {((r.amount.stringPrice ?? 0) > 0 || (r.amount.stringingFee ?? 0) > 0) && (
                            <span className="text-[10px] text-muted-foreground">
                              {(r.amount.stringPrice ?? 0) > 0 ? `스트링: ${won(r.amount.stringPrice ?? 0)}` : ''}
                              {(r.amount.stringPrice ?? 0) > 0 && (r.amount.stringingFee ?? 0) > 0 ? ' / ' : ''}
                              {(r.amount.stringingFee ?? 0) > 0 ? `교체비: ${won(r.amount.stringingFee ?? 0)}` : ''}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={tdClasses}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>작업</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/rentals/${rid}`}>
                                <Eye className="mr-2 h-4 w-4" /> 상세 보기
                              </Link>
                            </DropdownMenuItem>
                            {r.stringingApplicationId && (
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/applications/stringing/${encodeURIComponent(String(r.stringingApplicationId))}`}>
                                  <Eye className="mr-2 h-4 w-4" /> 연결 신청서 보기
                                </Link>
                              </DropdownMenuItem>
                            )}
                          <DropdownMenuSeparator />
                          {(r.status === 'paid' || r.status === 'out') && (
                              <DropdownMenuItem onClick={() => setPendingAction({ type: 'return', rentalId: rid })} disabled={busyId === rid}>
                                <Package className="mr-2 h-4 w-4" /> 반납 처리
                              </DropdownMenuItem>
                            )}
                            {r.status === 'returned' && (
                              <>
                                {r.depositRefundedAt ? (
                                  <DropdownMenuItem onClick={() => setPendingAction({ type: 'refundClear', rentalId: rid })} disabled={busyId === rid}>
                                    <Truck className="mr-2 h-4 w-4" /> 환불 해제
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => setPendingAction({ type: 'refundMark', rentalId: rid })} disabled={busyId === rid}>
                                    <Truck className="mr-2 h-4 w-4" /> 환불 처리
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center gap-1 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                이전
              </Button>
              {getPaginationItems(page, totalPages).map((it, idx) =>
                typeof it === 'number' ? (
                  <Button key={`page-${it}`} size="sm" variant={it === page ? 'default' : 'outline'} onClick={() => setPage(it)}>
                    {it}
                  </Button>
                ) : (
                  <span key={`dots-${idx}`} className="px-2 text-muted-foreground">
                    …
                  </span>
                ),
              )}
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <AdminConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        onCancel={() => setPendingAction(null)}
        onConfirm={async () => {
          const action = pendingAction;
          if (!action) return;
          setPendingAction(null);
          if (action.type === 'return') {
            await onReturn(action.rentalId);
            return;
          }
          await markRefund(action.rentalId, action.type === 'refundMark');
        }}
        severity="danger"
        title={pendingAction?.type === 'return' ? '반납 처리할까요?' : pendingAction?.type === 'refundMark' ? '보증금 환불 처리할까요?' : '보증금 환불 처리를 해제할까요?'}
        description={
          pendingAction?.type === 'return'
            ? '선택한 대여 건의 상태가 반납완료(returned)로 변경됩니다.'
            : pendingAction?.type === 'refundMark'
              ? '선택한 대여 건을 보증금 환불 완료 상태로 기록합니다.'
              : '선택한 대여 건의 보증금 환불 완료 기록을 해제합니다.'
        }
        confirmText={pendingAction?.type === 'return' ? '반납 처리' : pendingAction?.type === 'refundMark' ? '환불 처리' : '환불 해제'}
        cancelText="취소"
        eventKey={
          pendingAction?.type === 'return'
            ? 'admin-rentals-return-confirm'
            : pendingAction?.type === 'refundMark'
              ? 'admin-rentals-refund-mark-confirm'
              : 'admin-rentals-refund-clear-confirm'
        }
        eventMeta={{ rentalId: pendingAction?.rentalId }}
      />
    </div>
  );
}
