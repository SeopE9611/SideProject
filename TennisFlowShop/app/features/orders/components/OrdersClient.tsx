'use client';

import CustomerTypeFilter from '@/app/features/orders/components/order-filters/CustomerTypeFilter';
import { DateFilter } from '@/app/features/orders/components/order-filters/DateFilter';
import { OrderStatusFilter } from '@/app/features/orders/components/order-filters/OrderStatusFilter';
import { OrderTypeFilter } from '@/app/features/orders/components/order-filters/OrderTypeFilter';
import { PaymentStatusFilter } from '@/app/features/orders/components/order-filters/PaymentStatusFilter';
import { ShippingStatusFilter } from '@/app/features/orders/components/order-filters/ShippingStatusFilter';
import ApplicationStatusBadge from '@/app/features/stringing-applications/components/ApplicationStatusBadge';
import { useOrderStore } from '@/app/store/orderStore';
import { useStringingStore } from '@/app/store/stringingStore';
import { AdminBadgeRow } from '@/components/admin/AdminBadgeRow';
import AuthGuard from '@/components/auth/AuthGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { badgeBase, badgeSizeSm, badgeToneVariant, flowBadgeClass, getOrderStatusBadgeSpec, getPaymentStatusBadgeSpec, getShippingBadge, getShippingMethodBadge, getTrackingBadge, kindBadgeClass, linkBadgeClass } from '@/lib/badge-style';
import { getOrderStatusLabelForDisplay, isVisitPickupOrder } from '@/lib/order-shipping';
import { shortenId } from '@/lib/shorten';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { adminRichTooltipClass } from '@/lib/tooltip-style';
import type { ApiResponse, OrderWithType } from '@/lib/types/order';
import { cn } from '@/lib/utils';
import { AlertTriangle, ChevronDown, Copy, Eye, MoreHorizontal, Search, Truck, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

/** 데이터를 받아오는 fetcher 함수 */
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

export default function OrdersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 현재 페이지 번호 상태
  const [page, setPage] = useState(1);

  // 검색어 상태
  const [searchTerm, setSearchTerm] = useState('');

  // 필터 상태들
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [shippingFilter, setShippingFilter] = useState('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');
  const [cancelFilter, setCancelFilter] = useState<'all' | 'requested' | 'approved' | 'rejected'>('all');

  // 고급 검색 토글 상태
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 정렬 상태
  const [sortBy, setSortBy] = useState<'customer' | 'date' | 'total' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 날짜 필터 상태
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // 한 페이지에 보여줄 항목 수
  const limit = 10;

  /**
   * 서버로 "검색/필터/날짜"까지 같이 전달하기 위한 쿼리스트링
   * - 서버가 아직 이 파라미터를 무시하더라도(미구현) 안전함
   * - 다음 단계에서 /api/orders가 이 값을 받아 "필터 → 페이징"으로 처리하면
   *   '현재 페이지 10개만 필터링' 문제가 구조적으로 해결됨
   */
  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(page));
    sp.set('limit', String(limit));

    if (searchTerm.trim()) sp.set('q', searchTerm.trim());
    if (statusFilter !== 'all') sp.set('status', statusFilter);
    if (typeFilter !== 'all') sp.set('type', typeFilter);
    if (paymentFilter !== 'all') sp.set('payment', paymentFilter);
    if (shippingFilter !== 'all') sp.set('shipping', shippingFilter);
    if (customerTypeFilter !== 'all') sp.set('customerType', customerTypeFilter);
    if (cancelFilter !== 'all') sp.set('cancel', cancelFilter);

    // 날짜는 KST 기준 YYYY-MM-DD로 보내는 게 안전함(UTC toISOString 오차 방지)
    if (selectedDate) {
      const kstDay = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(selectedDate); // e.g. "2025-12-31"
      sp.set('date', kstDay);
    }

    return sp.toString();
  }, [page, limit, searchTerm, statusFilter, typeFilter, paymentFilter, shippingFilter, customerTypeFilter, cancelFilter, selectedDate]);

  /**
   * 필터/검색/날짜가 바뀌면 1페이지부터 다시 조회
   * - 안 하면, 기존에 page가 3~5 같은 상태에서 조건이 바뀌어
   *   "비어 보이는 페이지"가 나올 수 있음
   */
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, typeFilter, paymentFilter, shippingFilter, customerTypeFilter, cancelFilter, selectedDate]);

  useEffect(() => {
    const preset = searchParams.get('preset');
    if (preset === 'stringing') {
      setTypeFilter('서비스');
      return;
    }
    if (preset === 'cancelRequests') {
      setCancelFilter('requested');
    }
  }, [searchParams]);

  // SWR 훅: page/limit + 검색/필터/날짜까지 쿼리로 포함
  const { data, error } = useSWR<ApiResponse>(`/api/orders?${qs}`, fetcher);
  const isTableLoading = !data && !error;

  // 데이터 준비: data.items, data.total
  const orders = data?.items ?? []; // 현재 페이지 항목 배열
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / limit));

  // 검색 / 필터링 로직
  const filteredOrders = orders.filter((order) => {
    // 검색어 매치: ID, 고객명, 이메일
    const searchMatch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || order.customer.email.toLowerCase().includes(searchTerm.toLowerCase());

    // 상태 필터 매치
    const statusMatch = statusFilter === 'all' || order.status === statusFilter;
    const typeMatch = typeFilter === 'all' || order.type === typeFilter;
    const paymentMatch = paymentFilter === 'all' || order.paymentStatus === paymentFilter;
    const cancelMatch = cancelFilter === 'all' || order.cancelStatus === cancelFilter;

    // 고객 유형 필터: 회원/비회원
    const customerTypeMatch = customerTypeFilter === 'all' || (customerTypeFilter === 'member' && order.userId) || (customerTypeFilter === 'guest' && !order.userId);

    // 운송장 상태 필터
    const shippingMatch = shippingFilter === 'all' || getShippingBadge(order).label === shippingFilter;

    // 날짜 필터
    const matchDate = !selectedDate || new Date(order.date).toDateString() === selectedDate.toDateString();

    return searchMatch && statusMatch && typeMatch && paymentMatch && cancelMatch && shippingMatch && customerTypeMatch && matchDate;
  });

  // 정렬 로직
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortBy) return 0;
    let aValue: string | number = '';
    let bValue: string | number = '';

    switch (sortBy) {
      case 'customer':
        aValue = a.customer.name.toLowerCase();
        bValue = b.customer.name.toLowerCase();
        break;
      case 'date':
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
        break;
      case 'total':
        aValue = a.total;
        bValue = b.total;
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // 제한형 페이지 네이션
  function getPaginationItems(page: number, totalPages: number, delta = 2): (number | string)[] {
    // 한 페이지만 있으면 그냥 1만 반환
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
  // 비회원 vs 탈퇴회원 표시
  function getDisplayUserType(order: OrderWithType) {
    if (order.customer.name.includes('(탈퇴한 회원)')) return '(탈퇴한 회원)';
    return '';
  }

  const ADMIN_SCOPE_TEXT = '이 화면의 포함 범위: 상품 주문 + 교체서비스 신청 (대여 제외)';

  /**
   * 관리자 UX용 “거래종류(kind)” 라벨
   * - 개발자/DB 타입(__type)은 운영자에게 그대로 노출하면 헷갈리기 쉽다.
   * - 정책 A: /admin/orders는 주문 + 신청서만 관리한다.
   */
  function getKindBadge(order: OrderWithType) {
    if (order.__type === 'stringing_application') {
      return { label: '신청서', className: kindBadgeClass('stringing_application') };
    }
    return { label: '주문', className: kindBadgeClass('order') };
  }

  /**
   * 관리자 UX용 “연결(link)” 라벨
   * - 통합/연결이 있는 경우 운영자가 즉시 인지할 수 있어야 “누락 처리”를 줄일 수 있다.
   *
   * 규칙(현재 코드 구조 기준):
   * - 신청서(__type=stringing_application) + linkedOrderId 있음 → "주문연결"
   * - 신청서 단독 → "단독"
   * - 주문(__type=order) 이면서 같은 그룹에 신청서가 존재 → "통합(주문+신청)"
   * - 그 외 → "단독"
   */
  function getLinkBadge(order: OrderWithType, isLinkedProductOrder: boolean) {
    if (order.__type === 'stringing_application') {
      if (order.linkedOrderId) {
        return { label: '주문연결', className: linkBadgeClass('linked_order') };
      }
      return { label: '단독', className: linkBadgeClass('standalone') };
    }
    if (isLinkedProductOrder) {
      return { label: '통합(주문+신청)', className: linkBadgeClass('integrated') };
    }
    return { label: '단독', className: linkBadgeClass('standalone') };
  }

  /**
   * 관리자 UX: “시나리오(Flow)” + “정산 앵커” 라벨
   * - 운영자가 봤을 때 이 행이 어떤 케이스(1~5)인지 즉시 구분되게 한다.
   * - 금액/정산 사고 방지: 신청서가 통합인지(주문 앵커) 단독인지(신청서 앵커)도 같이 표기한다.
   *
   * 참고: 정책 A에 따라 /admin/orders는 주문(order) + 신청서(stringing_application)만 노출한다.
   */
  type Flow = 1 | 2 | 3 | 4 | 5;

  const FLOW_LABEL: Record<Flow, string> = {
    1: '스트링 단품 구매',
    2: '스트링 구매 + 교체서비스 신청(통합)',
    3: '교체서비스 단일 신청',
    4: '라켓 단품 구매',
    5: '라켓 구매 + 스트링 선택 + 교체서비스 신청(통합)',
  };

  const FLOW_SHORT: Record<Flow, string> = {
    1: 'F1 스트링 단품',
    2: 'F2 스트링+신청',
    3: 'F3 신청 단독',
    4: 'F4 라켓 단품',
    5: 'F5 라켓+신청',
  };

  function hasRacketItems(items: any[] | undefined) {
    // order.ts의 OrderItem 타입에는 kind가 없어서(응답 스냅샷에는 존재),
    // 런타임 데이터 기준으로 안전하게 any로 검사한다.
    return Array.isArray(items) && items.some((it) => (it as any)?.kind === 'racket' || (it as any)?.kind === 'used_racket');
  }

  function orderFlowByHasRacket(hasRacket: boolean, integrated: boolean): Flow {
    // 주문(앵커) 기준:
    // - 통합이면 (스트링+신청=2) 또는 (라켓+신청=5)
    // - 단독이면 (스트링 단품=1) 또는 (라켓 단품=4)
    if (integrated) return (hasRacket ? 5 : 2) as Flow;
    return (hasRacket ? 4 : 1) as Flow;
  }

  function getFlowBadge(order: OrderWithType, ctx: { isLinkedProductOrder: boolean; anchorHasRacket: boolean; isIntegratedApp: boolean }) {
    const { isLinkedProductOrder, anchorHasRacket, isIntegratedApp } = ctx;

    let flow: Flow = 1;
    if (order.__type === 'stringing_application') {
      flow = isIntegratedApp ? orderFlowByHasRacket(anchorHasRacket, true) : 3;
    } else {
      flow = orderFlowByHasRacket(hasRacketItems((order as any)?.items), isLinkedProductOrder);
    }

    return { flow, shortLabel: FLOW_SHORT[flow], label: FLOW_LABEL[flow], className: flowBadgeClass(flow) };
  }

  function getSettlementBadge(order: OrderWithType, ctx: { isIntegratedApp: boolean }) {
    // /admin/orders 화면 기준 정산 앵커:
    // - 주문 행: 항상 주문 앵커
    // - 신청서 행: 통합이면 주문 앵커 / 단독이면 신청서 앵커
    if (order.__type === 'stringing_application') {
      return ctx.isIntegratedApp ? { label: '정산: 주문', className: linkBadgeClass('integrated') } : { label: '정산: 신청(단독)', className: linkBadgeClass('standalone') };
    }
    return { label: '정산: 주문', className: linkBadgeClass('integrated') };
  }

  // 연결 신청서는 "최신 수정/생성 시각" 기준으로 1건을 선택해 요약에 사용
  function getLatestStringingApplicationInGroup(group: OrderWithType[]) {
    const apps = group.filter((o) => o.__type === 'stringing_application') as Array<OrderWithType & { updatedAt?: string; createdAt?: string }>;
    if (apps.length === 0) return null;

    const getStamp = (app: { updatedAt?: string; createdAt?: string }, idx: number) => {
      const raw = app.updatedAt ?? app.createdAt;
      const ts = raw ? new Date(raw).getTime() : Number.NaN;
      return Number.isFinite(ts) ? ts : -idx;
    };

    return apps
      .map((app, idx) => ({ app, ts: getStamp(app, idx), idx }))
      .sort((a, b) => (b.ts !== a.ts ? b.ts - a.ts : a.idx - b.idx))[0]?.app;
  }

  // 관리자 목록에서는 원문 코드 대신 접수 방식 라벨로 노출
  function getReceptionLabel(raw: unknown): string | null {
    const method = String(raw ?? '').trim().toLowerCase();
    if (!method) return null;
    if (method === 'visit') return '방문 접수';
    if (method === 'courier_pickup') return '기사 방문 수거';
    return '발송 접수';
  }

  // 날짜 포맷터
  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(dateString));

  // 금액 포맷터
  const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

  // 필터 리셋
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPaymentFilter('all');
    setShippingFilter('all');
    setCustomerTypeFilter('all');
    setCancelFilter('all');
    setSelectedDate(undefined);
  };

  // 정렬 헤더 클릭 핸들러
  const handleSort = (key: 'customer' | 'date' | 'total') => {
    if (sortBy === key) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
  };

  // 공통 스타일 상수
  const thClasses = 'px-4 py-2 text-center align-middle ' + 'border-b border-border ' + 'font-semibold text-foreground';
  const tdClasses = 'px-3 py-4 align-middle text-center';

  // 배송정보 업데이트 네비게이션
  const handleShippingUpdate = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) {
        showErrorToast('주문 정보를 불러올 수 없습니다.');
        return;
      }
      const order = await res.json();
      if (['취소', '결제취소'].includes(order.status)) {
        showErrorToast('취소된 주문은 배송 정보를 등록할 수 없습니다.');
        return;
      }

      // "상품 주문 + 교체서비스 신청서"가 연결된 케이스면
      // 운송장/배송정보는 "신청서"에서만 관리하도록 강제한다.
      // - 따라서 신청서 배송등록 페이지로 자동 이동
      const appIdFromList =
        Array.isArray(order.stringingApplications) && order.stringingApplications.length > 0
          ? order.stringingApplications.filter((a: any) => a?.id).sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0]?.id
          : null;
      const appId = appIdFromList ?? order.stringingApplicationId ?? null;

      if (order.isStringServiceApplied && appId) {
        showSuccessToast('이 주문은 교체서비스 신청서와 연결되어 있어 배송 정보는 신청서에서 관리합니다.');
        router.push(`/admin/applications/stringing/${appId}/shipping-update`);
        return;
      }

      router.push(`/admin/orders/${orderId}/shipping-update`);
    } catch {
      showErrorToast('오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 스트링 상품 주문과 그에 연결된 교체 서비스 신청을 "묶음"으로 그룹화하는 함수
  function groupLinkedOrders(orders: OrderWithType[]) {
    // @param orders 주문 목록 (OrderWithType[])
    // @returns OrderWithType[][] 형태로 반환되며,
    //  - 일반 주문만 있는 경우 → [[order]]
    //  - 연결된 상품 + 서비스 신청이 있으면 → [[productOrder, stringingApplication]]
    const visited = new Set(); // 중복 방지를 위한 방문 체크용 Set
    const groups: OrderWithType[][] = []; // 반환할 그룹 배열 (이중 배열)

    for (const order of orders) {
      // 이미 방문한 주문이면 skip
      if (visited.has(order.id)) continue;

      // 📌 스트링 교체 서비스 신청이면 (stringing_application)
      if (order.__type === 'stringing_application' && order.linkedOrderId) {
        // 연결된 상품 주문 찾기
        const linked = orders.find((o) => o.id === order.linkedOrderId);

        if (linked) {
          //  연결된 상품 주문과 함께 묶음으로 그룹에 추가
          groups.push([linked, order]);

          // 둘 다 visited 처리
          visited.add(order.id);
          visited.add(linked.id);
        } else {
          //  연결된 상품 주문 못 찾으면 단독으로 묶음 처리
          groups.push([order]);
          visited.add(order.id);
        }
      }

      //  일반 주문인데 아무 교체 서비스도 연결되지 않은 경우
      else if (!orders.some((o) => o.linkedOrderId === order.id)) {
        groups.push([order]);
        visited.add(order.id);
      }

      // else 생략: 이미 연결된 상품 주문은 위에서 처리되기 때문에 따로 처리 안함
    }

    return groups;
  }

  return (
    <AuthGuard>
      <div className="container py-4 lg:py-5">
        {/* 제목 및 설명 */}
        <div className="mx-auto mb-4 max-w-[1440px]">
          <h1 className="text-4xl font-semibold tracking-tight">주문·신청 관리</h1>
          <p className="mt-1 text-xs text-muted-foreground">{ADMIN_SCOPE_TEXT}. (통합건은 같은 색 테두리로 묶여 표시됩니다)</p>
        </div>

        {/* 필터 및 검색 카드 */}
        <Card className="mb-4 rounded-xl border-border bg-card px-4 py-4 shadow-md lg:px-5">
          <CardHeader className="pb-2.5">
            <CardTitle>필터 및 검색</CardTitle>
            <CardDescription className="text-xs">{ADMIN_SCOPE_TEXT}. 주문/신청 상태, 유형, 결제 상태로 필터링하거나 주문 ID, 고객명, 이메일로 검색하세요.</CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="flex flex-col gap-4">
              {/* 검색 input */}
              <div className="w-full max-w-md">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input type="search" placeholder="주문/신청 ID, 고객명, 이메일 검색..." className="pl-8 text-xs h-9 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  {searchTerm && (
                    <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3" onClick={() => setSearchTerm('')}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* 필터 컴포넌트들 */}
              <div className="grid w-full gap-2 border-t pt-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                <CustomerTypeFilter value={customerTypeFilter} onChange={setCustomerTypeFilter} />
                <OrderStatusFilter value={statusFilter} onChange={setStatusFilter} />
                <PaymentStatusFilter value={paymentFilter} onChange={setPaymentFilter} />
                <ShippingStatusFilter value={shippingFilter} onChange={setShippingFilter} />
                <OrderTypeFilter value={typeFilter} onChange={setTypeFilter} />
                <Button variant="outline" size="sm" onClick={resetFilters} className="w-full bg-transparent">
                  필터 초기화
                </Button>
              </div>

              {isTableLoading && (
                <div className="grid w-full gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <Skeleton key={`filter-skeleton-${idx}`} className="h-9 w-full rounded-md" />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 주문 목록 테이블 */}
        <Card className="rounded-xl border-border bg-card px-4 py-4 shadow-md lg:px-5">
          <CardHeader className="pb-2 pt-1">
            <div className="flex items-center justify-between">
              {data ? (
                <>
                  <CardTitle className="text-base font-medium">주문 목록</CardTitle>
                  <p className="text-xs text-muted-foreground">총 {data.total}개의 주문</p>
                </>
              ) : (
                <>
                  <Skeleton className="h-5 w-24 rounded bg-muted" />
                  <Skeleton className="h-4 w-36 rounded bg-muted" />
                </>
              )}
            </div>
            {/* 운영자용: “이 화면에서 뭘 보고 처리해야 하는지”를 한 번에 이해시키는 장치 */}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', kindBadgeClass('order'))}>주문</Badge>
              <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', kindBadgeClass('stringing_application'))}>신청서</Badge>
              <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', linkBadgeClass('integrated'))}>통합(주문+신청)</Badge>
              <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', linkBadgeClass('standalone'))}>단독</Badge>
              <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', linkBadgeClass('standalone'))}>범위: 주문+신청</Badge>
              <span>• 같은 색 테두리 = 같은 통합건</span>
              <span>• “신청서에서 관리” = 운송장/배송정보는 신청서에서만 등록</span>
              <span>• 대여 주문은 /admin/rentals에서만 관리</span>
            </div>
          </CardHeader>
          <CardContent className="relative min-h-[420px] overflow-x-auto scrollbar-hidden pr-2 md:overflow-x-visible md:pr-0">
            <Table className="w-full table-auto border-separate text-xs [border-spacing-block:0.4rem] [border-spacing-inline:0]">
              <TableHeader className="sticky top-0 bg-muted dark:bg-card shadow-sm">
                <TableRow>
                  <TableHead className={cn(thClasses, 'w-[140px]')}>주문 ID</TableHead>
                  <TableHead onClick={() => handleSort('customer')} className={cn(thClasses, 'text-center cursor-pointer select-none transition-colors hover:text-primary', sortBy === 'customer' && 'text-primary')}>
                    고객
                    <ChevronDown className={cn('inline ml-1 w-3 h-3 text-muted-foreground transition-transform', sortBy === 'customer' && sortDirection === 'desc' && 'rotate-180')} />
                  </TableHead>
                  <TableHead className={cn(thClasses, 'w-36')}>
                    <div className="flex items-center justify-center gap-2">
                      <span onClick={() => handleSort('date')} className={cn('flex items-center gap-1 cursor-pointer select-none transition-colors hover:text-primary', sortBy === 'date' && 'text-primary')}>
                        날짜
                        <ChevronDown className={cn('w-3 h-3 transition-transform', sortBy === 'date' && sortDirection === 'desc' && 'rotate-180')} />
                      </span>
                      <DateFilter date={selectedDate} onChange={setSelectedDate} />
                    </div>
                  </TableHead>
                  <TableHead className={cn(thClasses, 'text-center')}>상태</TableHead>
                  <TableHead className={cn(thClasses, 'text-center')}>결제</TableHead>
                  <TableHead className={cn(thClasses, 'text-center')}>수령방식</TableHead>
                  <TableHead className={cn(thClasses, 'text-center')}>운송장</TableHead>
                  <TableHead className={cn(thClasses, 'text-center')}>유형</TableHead>
                  <TableHead onClick={() => handleSort('total')} className={cn(thClasses, 'text-center cursor-pointer select-none', sortBy === 'total' && 'text-primary')}>
                    금액
                    <ChevronDown className={cn('inline ml-1 w-3 h-3 text-muted-foreground transition-transform', sortBy === 'total' && sortDirection === 'desc' && 'rotate-180')} />
                  </TableHead>
                  <TableHead className={cn(thClasses, 'text-center')}>…</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {error ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-destructive">
                      주문 데이터를 불러오는 중 오류가 발생했습니다.
                    </TableCell>
                  </TableRow>
                ) : !data ? (
                  Array.from({ length: limit }).map((_, rowIdx) => (
                    <TableRow key={rowIdx}>
                      {Array.from({ length: 10 }).map((_, cellIdx) => (
                        <TableCell key={cellIdx}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className={tdClasses}>
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">불러올 주문이 없습니다.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className={tdClasses}>
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  groupLinkedOrders(sortedOrders).map((group, groupIdx) => {
                    // 이 그룹이 "상품 주문 + 교체서비스 신청서" 묶음인지 체크
                    const hasStringingAppInGroup = group.some((o) => o.__type === 'stringing_application');

                    const borderColors = ['border-border', 'border-border', 'border-border', 'border-border', 'border-border'];
                    const borderColor = borderColors[groupIdx % borderColors.length];
                    const isGrouped = group.length > 1;

                    const anchorOrder = group.find((o) => o.__type === 'order') ?? null;
                    const anchorHasRacket = hasRacketItems((anchorOrder as any)?.items);

                    return group.map((order) => {
                      const isLinkedProductOrder = order.__type === 'order' && hasStringingAppInGroup;
                      const isIntegratedApp = order.__type === 'stringing_application' && !!order.linkedOrderId && !!anchorOrder;
                      // 통합 주문 행에서도 연결 신청서 핵심 정보를 빠르게 읽기 위한 참조
                      const linkedApplication = getLatestStringingApplicationInGroup(group);
                      const linkedReceptionLabel = getReceptionLabel((linkedApplication as any)?.shippingInfo?.shippingMethod ?? (linkedApplication as any)?.collectionMethod);

                      const kind = getKindBadge(order);
                      const link = getLinkBadge(order, isLinkedProductOrder);
                      const flow = getFlowBadge(order, { isLinkedProductOrder, anchorHasRacket, isIntegratedApp });
                      const settlement = getSettlementBadge(order, { isIntegratedApp });
                      const actionMethodSource = order.__type === 'stringing_application' ? (order as any)?.shippingInfo?.shippingMethod ?? (order as any)?.collectionMethod : (order as any)?.shippingInfo;
                      const shippingActionLabel = isVisitPickupOrder(actionMethodSource) ? '수령 정보 등록' : '배송 정보 등록';

                      return (
                        <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className={cn(tdClasses, 'pl-6 border-l-4', isGrouped ? borderColor : 'border-transparent')}>
                            <TooltipProvider delayDuration={10}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex flex-col items-start gap-1 max-w-[140px] cursor-pointer w-full">
                                    <div className="flex items-center gap-1 truncate w-full justify-start">
                                      {/* 취소요청 상태일 때만 아이콘 노출 */}
                                      {order.cancelStatus === 'requested' && <AlertTriangle className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />}
                                      {/* 실제 표시되는 주문 ID (짧게) */}
                                      <span className="truncate">{shortenId(order.id)}</span>
                                    </div>

                                    {/* 운영자에게 가장 중요한 정보: “이게 주문인지/신청서인지 + 통합/단독인지” */}
                                    {/*
                                      테이블 난잡도 개선:
                                      - 테이블에서는 핵심 2개(종류/연결)만 우선 노출
                                      - 나머지(flow/정산)는 +N으로 접어서(hover title) 필요할 때만 확인
                                    */}
                                    <AdminBadgeRow
                                      maxVisible={2}
                                      items={[
                                        { label: kind.label, className: kind.className, title: '문서 종류' },
                                        { label: link.label, className: link.className, title: '통합/연결 상태' },
                                        { label: flow.shortLabel, className: flow.className, title: `주문/신청 시나리오: ${flow.label}` },
                                        { label: settlement.label, className: settlement.className, title: '정산 앵커(금액 해석 기준)' },
                                        ...(order.cancelStatus
                                          ? [
                                              {
                                                label: order.cancelStatus === 'requested' ? '취소요청' : order.cancelStatus === 'approved' ? '취소승인' : '취소거절',
                                                className: order.cancelStatus === 'requested' ? 'bg-destructive/10 text-destructive border border-destructive/30' : 'bg-muted text-muted-foreground border border-border',
                                                title: '취소 요청 상태',
                                              },
                                            ]
                                          : []),
                                      ]}
                                    />
                                    {isLinkedProductOrder && linkedApplication && (
                                      <p className="text-[11px] text-muted-foreground">신청 상태: {linkedApplication.status}</p>
                                    )}
                                  </div>
                                </TooltipTrigger>

                                <TooltipContent side="top" align="center" sideOffset={6} className={adminRichTooltipClass}>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono">{order.id}</span>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={() => {
                                          navigator.clipboard.writeText(order.id);
                                          showSuccessToast('주문 ID가 클립보드에 복사되었습니다.');
                                        }}
                                      >
                                        <Copy className="w-4 h-4" />
                                        <span className="sr-only">복사</span>
                                      </Button>
                                    </div>

                                    {order.cancelStatus === 'requested' && <p className="mt-2 text-sm text-primary">취소 요청이 접수된 주문입니다.</p>}
                                    {order.__type === 'stringing_application' && order.stringSummary && <p className="mt-1 text-[11px] text-muted-foreground">장착 상품: {order.stringSummary}</p>}

                                    <p className="mt-2 text-[11px] text-muted-foreground">
                                      주문/신청 시나리오: <span className="font-medium text-foreground">{flow.label}</span>
                                    </p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">{settlement.label}</p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">포함 범위: 주문 + 신청 (대여 제외)</p>

                                    {isLinkedProductOrder && <p className="mt-2 text-[11px] text-muted-foreground">연결: 교체서비스 신청서와 통합 처리(같은 테두리 색)</p>}
                                    {isLinkedProductOrder && linkedApplication && (
                                      <>
                                        {linkedReceptionLabel && <p className="mt-1 text-[11px] text-muted-foreground">접수 방식: {linkedReceptionLabel}</p>}
                                        {linkedApplication.stringSummary && <p className="mt-1 text-[11px] text-muted-foreground">스트링: {linkedApplication.stringSummary}</p>}
                                        {(linkedApplication as any)?.tensionSummary && <p className="mt-1 text-[11px] text-muted-foreground">텐션: {(linkedApplication as any).tensionSummary}</p>}
                                        {(linkedApplication as any)?.reservationLabel && <p className="mt-1 text-[11px] text-muted-foreground">예약: {(linkedApplication as any).reservationLabel}</p>}
                                      </>
                                    )}
                                    {order.__type === 'stringing_application' && order.linkedOrderId && (
                                      <p className="mt-1 text-[11px] text-muted-foreground">
                                        연결 주문: <span className="font-mono">{shortenId(order.linkedOrderId)}</span>
                                      </p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          {/* 고객 정보 셀 */}
                          <TableCell className={tdClasses}>
                            <div className="flex flex-col items-center">
                              <span className="flex items-center">
                                {/* "이름"만 남기기 */}
                                {order.customer.name.replace(/\s*\(비회원\)\s*$/, '').replace(/\s*\(탈퇴한 회원\)\s*$/, '')}
                                {/*  탈퇴한 회원 레이블 (기존 getDisplayUserType) */}
                                {getDisplayUserType(order) && <span className="ml-1 text-xs text-muted-foreground">{getDisplayUserType(order)}</span>}
                                {/*  비회원 레이블 */}
                                {order.customer.name.endsWith('(비회원)') && <span className="ml-1 text-xs text-muted-foreground">(비회원)</span>}
                              </span>
                              <span className="text-[11px] text-muted-foreground">{order.customer.email}</span>
                            </div>
                          </TableCell>
                          {/* 날짜 셀 */}
                          <TableCell className="w-36 truncate whitespace-nowrap">{formatDate(order.date)}</TableCell>
                          {/* 상태 셀 */}
                          <TableCell className={tdClasses}>
                            {order.__type === 'stringing_application' ? (
                              <div className="flex flex-col items-start gap-1">
                                <ApplicationStatusBadge status={order.status} />
                                {order.cancelStatus === 'requested' && <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap bg-destructive/10 text-destructive border border-destructive/30')}>취소요청</Badge>}
                              </div>
                            ) : (
                              (() => {
                                const st = getOrderStatusBadgeSpec(order.status);
                                return (
                                  <div className="flex flex-col items-start gap-1">
                                    <Badge variant={st.variant} className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap')}>
                                      {getOrderStatusLabelForDisplay(order.status, (order as any).shippingInfo)}
                                    </Badge>
                                    {order.cancelStatus === 'requested' && <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap bg-destructive/10 text-destructive border border-destructive/30')}>취소요청</Badge>}
                                  </div>
                                );
                              })()
                            )}
                          </TableCell>
                          {/* 결제 상태 셀 */}
                          <TableCell className={tdClasses}>
                            {(() => {
                              const pay = getPaymentStatusBadgeSpec(order.paymentStatus);
                              return (
                                <Badge variant={pay.variant} className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap')}>
                                  {order.paymentStatus}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          {/* 수령방식 셀 */}
                          <TableCell className={tdClasses}>
                            {(() => {
                              // 수령방식은 “사용자가 뭘 선택했는지”가 핵심이므로
                              // 통합 주문(isLinkedProductOrder)이어도 그대로 표시해준다.
                              const methodSource = order.__type === 'stringing_application' && anchorOrder && (order as any).linkedOrderId ? (anchorOrder as any) : (order as any);
                              const m = getShippingMethodBadge(methodSource);
                              return (
                                <Badge variant={m.variant} className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap')} title={`수령방식 코드: ${String(m.code ?? 'null')}`}>
                                  {m.label}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          {/* 운송장 셀 */}
                          <TableCell className={tdClasses}>
                            {(() => {
                              // 통합 주문의 “상품 주문”은 운송장/배송정보를 신청서에서만 관리하도록 정책이 정해져 있으므로
                              // 운송장 컬럼에서는 그 사실을 명시한다.
                              if (isLinkedProductOrder) {
                                return <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', linkBadgeClass('standalone'))}>신청서에서 관리</Badge>;
                              }

                              const t = getTrackingBadge(order);
                              return (
                                <Badge variant={t.variant} className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap')} title="택배인 경우만 운송장 등록/미등록 의미가 있습니다.">
                                  {t.label}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          {/* 유형 셀 */}
                          <TableCell className={tdClasses}>
                            <Badge variant={badgeToneVariant(order.__type === 'stringing_application' ? 'brand' : 'info')} className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap')}>
                              {order.type}
                            </Badge>
                          </TableCell>
                          {/* 금액 셀 */}
                          <TableCell className={tdClasses}>{formatCurrency(order.total)}</TableCell>
                          {/* 작업 메뉴 셀 */}
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
                                  <Link
                                    href={order.__type === 'stringing_application' ? `/admin/applications/stringing/${order.id}` : `/admin/orders/${order.id}`}
                                    onClick={() => {
                                      if (order.__type === 'stringing_application') {
                                        useStringingStore.getState().setSelectedApplicationId(order.id);
                                      } else {
                                        useOrderStore.getState().setSelectedOrderId(order.id);
                                      }
                                    }}
                                  >
                                    <Eye className="mr-2 h-4 w-4" /> 상세 보기
                                  </Link>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    // 신청서 행이면 신청서 배송등록으로 바로 이동
                                    if (order.__type === 'stringing_application') {
                                      router.push(`/admin/applications/stringing/${order.id}/shipping-update`);
                                      return;
                                    }
                                    // 주문 행이면: 연결된 신청서가 있으면 신청서로 리다이렉트(위 handleShippingUpdate 로직)
                                    handleShippingUpdate(order.id);
                                  }}
                                >
                                  <Truck className="mr-2 h-4 w-4" /> {shippingActionLabel}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })
                )}
              </TableBody>
            </Table>

            {/* 페이지네이션 */}
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
      </div>
    </AuthGuard>
  );
}
