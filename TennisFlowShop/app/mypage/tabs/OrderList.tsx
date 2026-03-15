'use client';

import CancelOrderDialog from '@/app/mypage/orders/_components/CancelOrderDialog';
import OrderReviewCTA from '@/components/reviews/OrderReviewCTA';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getOrderStatusBadgeSpec, getWorkflowMetaBadgeSpec } from '@/lib/badge-style';
import { authenticatedSWRFetcher } from '@/lib/fetchers/authenticatedSWRFetcher';
import { getOrderStatusLabelForDisplay, isVisitPickupOrder } from '@/lib/order-shipping';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { ArrowRight, Ban, Calendar, CheckCircle, Clock, CreditCard, MessageSquarePlus, MoreVertical, Package, ShoppingBag, Truck, Undo2, User, Store } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { mutate as globalMutate } from 'swr';
import useSWRInfinite from 'swr/infinite';

//  주문 데이터 타입 정의
type OrderResponse = {
  items: Order[];
  total: number;
};

interface Order {
  id: string;
  date: string;
  total: number;
  status: string;
  items: Array<{ name: string; quantity: number; price: number; imageUrl?: string | null; kind?: 'racket' | 'string' | 'product' }>;
  totalPrice: number;
  userSnapshot?: { name: string; email: string };
  shippingInfo?: { deliveryMethod?: string; shippingMethod?: string; withStringService?: boolean };
  isStringServiceApplied?: boolean;
  stringingApplicationId?: string | null; // API가 최신순(updatedAt/createdAt desc) 기준으로 고른 대표 신청서 ID
  stringService?: {
    totalSlots?: number;
    usedSlots?: number;
    remainingSlots?: number;
  };
  canApplyMoreStringService?: boolean;
  reviewAllDone?: boolean;
  unreviewedCount?: number;
  reviewNextTargetProductId?: string | null;

  // 주문 취소 요청 상태/사유(목록 카드용)
  cancelStatus?: string;
  cancelReasonSummary?: string | null;
}

const fetcher = (url: string) => authenticatedSWRFetcher<OrderResponse>(url);

const getStatusIcon = (status: string, isVisitPickup: boolean) => {
  switch (status) {
    case '배송중':
      return isVisitPickup ? <Store className="h-4 w-4 text-primary" /> : <Truck className="h-4 w-4 text-primary" />;
    case '배송완료':
      return <CheckCircle className="h-4 w-4 text-primary" />;
    case '대기중':
      return <Clock className="h-4 w-4 text-warning" />;
    case '결제완료':
      return <CheckCircle className="h-4 w-4 text-primary" />;
    case '구매확정':
      return <CheckCircle className="h-4 w-4 text-primary" />;
    default:
      return <Ban className="h-4 w-4 text-destructive" />;
  }
};

// 날짜 포맷팅
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const LIMIT = 5;

const OrderListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, idx) => (
      <Card key={idx} className="border-0 bg-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-48" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="flex justify-end gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const getOrderCompositionTitle = (order: Order) => {
  const itemKinds = order.items.map((item) => item.kind).filter((kind): kind is 'racket' | 'string' | 'product' => Boolean(kind));
  const hasRacket = itemKinds.includes('racket');
  const hasString = itemKinds.includes('string');

  let baseTitle = '일반 상품 주문';
  if (hasRacket && hasString) baseTitle = '라켓 + 스트링 주문';
  else if (hasRacket) baseTitle = '라켓 주문';
  else if (hasString) baseTitle = '스트링 주문';

  if (order.shippingInfo?.withStringService) {
    return `${baseTitle} + 교체 서비스 포함`;
  }

  return baseTitle;
};

export default function OrderList() {
  // SWR Infinite 키 생성 (필터/검색 파라미터 만들게된다면 여기에 반드시 포함하기)
  const getKey = (pageIndex: number, prev: OrderResponse | null) => {
    // 직전 페이지 아이템 길이가 LIMIT 미만이면 다음 페이지 없음
    if (prev && prev.items && prev.items.length < LIMIT) return null;
    const page = pageIndex + 1;

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(LIMIT));
    // 필터 대비용 주석
    // if (statusFilter) params.set('status', statusFilter);
    // if (keyword) params.set('q', keyword);
    // if (dateFrom) params.set('dateFrom', dateFrom);
    // if (dateTo) params.set('dateTo', dateTo);
    // if (sort) params.set('sort', sort);

    return `/api/users/me/orders?${params.toString()}`;
  };

  const { data, size, setSize, isValidating, error, mutate } = useSWRInfinite<OrderResponse>(getKey, fetcher, {
    revalidateFirstPage: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // 구매확정 처리 중인 주문 id (중복 클릭 방지)
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

  // 모바일 드롭다운 open 상태를 "주문 단위"로 제어
  const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);
  const [cancelDialogOrderId, setCancelDialogOrderId] = useState<string | null>(null);

  /**
   * 구매확정
   * - 서버(/api/orders/[id]/confirm)에서 배송완료/연동 서비스 완료 여부를 최종 검증합니다.
   * - 성공 시 주문 상태 갱신 + (옵션) 포인트 탭도 즉시 갱신합니다.
   */
  const handleConfirmPurchase = async (orderId: string) => {
    if (confirmingOrderId) return; // 이미 처리 중이면 무시

    const ok = window.confirm('구매확정을 진행하시겠습니까?\n\n- 구매확정 시 반품/교환/환불이 어려울 수 있습니다.');
    if (!ok) return;

    try {
      setConfirmingOrderId(orderId);

      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));

      // 서버가 실패를 내려주면 그 메시지를 그대로 토스트로 노출
      if (!res.ok) {
        const msg = data?.error || data?.message || '구매확정 처리 중 오류가 발생했습니다.';
        showErrorToast(msg);
        return;
      }

      // alreadyConfirmed 케이스도 서버 응답에 따라 처리
      if (data?.alreadyConfirmed) showSuccessToast('이미 구매확정된 주문입니다.');
      else showSuccessToast('구매확정이 완료되었습니다.');

      // 주문 목록 재조회 (상태 뱃지/버튼 상태 즉시 반영)
      await mutate();

      // 포인트 탭도 새로고침 없이 즉시 반영하고 싶으면 추가
      await globalMutate((key) => typeof key === 'string' && key.startsWith('/api/points/me'), undefined, { revalidate: true });
    } catch (e) {
      console.error(e);
      showErrorToast('구매확정 처리 중 오류가 발생했습니다.');
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleWithdrawCancelRequest = async (orderId: string) => {
    if (!confirm('이 주문의 취소 요청을 철회하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/cancel-request-withdraw`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.message || '취소 요청 철회 중 오류가 발생했습니다.';
        showErrorToast(msg);
        return;
      }

      showSuccessToast('주문 취소 요청을 철회했습니다.');

      // 무한스크롤 주문 목록 전체 다시 조회
      await mutate();
    } catch (e) {
      console.error(e);
      showErrorToast('취소 요청 철회 중 오류가 발생했습니다.');
    }
  };

  // 누적 아이템
  const items = useMemo(() => (data ? data.flatMap((d) => d.items) : []), [data]);

  // 더 보기 여부: 마지막 페이지의 items 길이가 LIMIT와 같으면 더 있음
  const hasMore = useMemo(() => {
    if (!data || data.length === 0) return false;
    const last = data[data.length - 1];
    return (last?.items?.length ?? 0) === LIMIT;
  }, [data]);

  // 에러 처리
  if (error) {
    return (
      <Card className="border-0 bg-card">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/15">
            <Package className="h-8 w-8" />
          </div>
          <p className="font-semibold text-destructive">주문 내역을 불러오는 중 오류가 발생했습니다.</p>
          <p className="mt-1 text-sm text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
        </CardContent>
      </Card>
    );
  }

  const isInitialLoading = !data && isValidating;

  //  주문이 없을 경우
  if (!isInitialLoading && !isValidating && items.length === 0) {
    return (
      <Card className="relative overflow-hidden border-0 bg-muted/30 dark:bg-card/40">
        <CardContent className="p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted/30 shadow-lg">
            <ShoppingBag className="h-10 w-10 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">주문 내역이 없습니다</h3>
          <p className="text-muted-foreground">아직 주문하신 상품이 없습니다. 지금 바로 쇼핑을 시작해보세요!</p>
        </CardContent>
      </Card>
    );
  }

  //  주문 내역 렌더링
  return (
    <div className="space-y-6">
      {isInitialLoading ? (
        <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">주문 내역을 불러오는 중입니다...</div>
      ) : null}
      {items.map((order) => {
        // 이 주문이 현재 "취소 요청 버튼"을 보여줄 수 있는 상태인지 계산
        const isCancelable = ['대기중', '결제완료'].includes(order.status) && (!order.cancelStatus || order.cancelStatus === 'none' || order.cancelStatus === 'rejected');
        // 상태 판정은 boolean으로 분리 (TS 좁힘/비교 에러 방지)
        const isDelivered = order.status === '배송완료';
        const isConfirmed = order.status === '구매확정';

        // 버튼/메뉴 분기용 값 (모바일 핵심 1~2개 + 더보기)
        const detailHref = `/mypage?tab=orders&flowType=order&flowId=${order.id}&from=orders`;
        const showConfirm = order.status !== '취소' && order.status !== '환불';
        const canConfirm = showConfirm && isDelivered && !isConfirmed && confirmingOrderId !== order.id;
        // 신청서 연결 여부(있으면 "교체 신청" 대신 "교체서비스 보기"로 유도)
        const hasLinkedApplication = Boolean(order.stringingApplicationId);
        const totalSlots = order.stringService?.totalSlots ?? 0;
        const usedSlots = order.stringService?.usedSlots ?? 0;
        const remainingSlots = order.stringService?.remainingSlots ?? Math.max(totalSlots - usedSlots, 0);
        const canApplyMoreStringService = order.canApplyMoreStringService ?? (Boolean(order.shippingInfo?.withStringService) && totalSlots > 0 && remainingSlots > 0);
        const hasSubmittedStringingApplication = hasLinkedApplication || order.isStringServiceApplied === true || usedSlots > 0;

        const stringServiceCTAKind: 'apply' | 'add' | 'view' | 'done' | null = !order.shippingInfo?.withStringService
          ? null
          : canApplyMoreStringService
            ? hasSubmittedStringingApplication
              ? 'add'
              : 'apply'
            : hasLinkedApplication
              ? 'view'
              : hasSubmittedStringingApplication
                ? 'done'
                : 'apply';

        const stringServiceCTAHref =
          stringServiceCTAKind === 'view' && order.stringingApplicationId
            ? `/mypage?tab=orders&flowType=application&flowId=${order.stringingApplicationId}&from=orders`
            : stringServiceCTAKind === 'apply' || stringServiceCTAKind === 'add'
              ? `/services/apply?orderId=${order.id}`
              : null;
        const stringServiceCTALabel = stringServiceCTAKind === 'add' ? '추가 신청' : stringServiceCTAKind === 'view' ? '교체서비스 보기' : stringServiceCTAKind === 'done' ? '교체 신청 완료' : '교체 신청';

        // 모바일 보조 CTA: "교체 신청" 또는 "교체서비스 보기" 중 하나라도 있으면 2버튼 레이아웃
        const showMobileSecondCTA = Boolean(stringServiceCTAHref);

        return (
          <Card key={order.id} className="group relative overflow-hidden border-0 bg-card shadow-md transition-all duration-300 bp-sm:hover:shadow-xl bp-sm:hover:-translate-y-1">
            <div className="pointer-events-none absolute inset-0 bg-muted/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '1px' }}>
              <div className="h-full w-full bg-card rounded-lg" />
            </div>

            <CardContent className="relative p-4 bp-sm:p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30 shadow-lg">
                    <ShoppingBag className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{getOrderCompositionTitle(order)}</h3>

                      {/* 신청서가 연결된 주문임을 한눈에 표시(탭 분리로 인한 혼란 완화) */}
                      {order.stringingApplicationId ? (
                        <Badge variant={getWorkflowMetaBadgeSpec('application_linked').variant} className="shrink-0 px-2 py-0.5 text-[11px] font-semibold">
                          신청서 연결됨
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(order.date)}
                    </div>
                  </div>
                </div>

                {/* 상태/취소 관련 영역 */}
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {getStatusIcon(order.status, isVisitPickupOrder(order.shippingInfo))}
                  <Badge variant={getOrderStatusBadgeSpec(order.status).variant} className="px-3 py-1 text-xs font-medium">
                    {getOrderStatusLabelForDisplay(order.status, order.shippingInfo)}
                  </Badge>

                  {/* 취소 요청이 들어간 주문이면 뱃지 표시 */}
                  {order.cancelStatus === 'requested' && (
                    <Badge variant={getWorkflowMetaBadgeSpec('cancel_requested').variant} className="ml-1 text-[11px] font-medium">
                      취소 요청됨
                    </Badge>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              {order.userSnapshot?.name && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted mb-4">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">주문자</div>
                    <div className="font-medium text-foreground">{order.userSnapshot.name}</div>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">주문 상품</span>
                </div>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                      {/* 상품 썸네일 */}
                      {item.imageUrl ? <img src={item.imageUrl || '/placeholder.svg'} alt={item.name} className="h-10 w-10 shrink-0 rounded object-cover" /> : <div className="h-10 w-10 shrink-0 rounded bg-muted/80 dark:bg-muted" />}

                      {/* 상품명 + 가격/수량 (모바일에서 자연스럽게 줄바꿈) */}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground break-words">{item.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{(item.price ?? 0).toLocaleString()}원</span>
                          <span className="text-muted-foreground">×</span>
                          <span>{item.quantity}개</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col bp-sm:flex-row bp-sm:items-center bp-sm:justify-between gap-4 pt-4 border-t border-border/60 dark:border-border/60">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-bold text-foreground">{typeof order.totalPrice === 'number' ? `${order.totalPrice.toLocaleString()}원` : '총 결제 금액 정보 없음'}</span>
                </div>

                <div className="hidden bp-sm:flex items-center gap-3">
                  <Button size="sm" variant="outline" asChild className="border-border hover:border-border hover:bg-primary/10 dark:border-border dark:hover:border-border dark:hover:bg-primary/20 bg-transparent">
                    <Link href={detailHref} className="inline-flex items-center gap-1">
                      상세보기
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>

                  <OrderReviewCTA orderId={order.id} reviewAllDone={order.reviewAllDone} unreviewedCount={order.unreviewedCount} reviewNextTargetProductId={order.reviewNextTargetProductId} orderStatus={order.status} showOnlyWhenCompleted />

                  {showConfirm ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-border hover:border-border hover:bg-primary/10 dark:border-border dark:hover:border-border dark:hover:bg-primary/20 bg-transparent"
                              disabled={!isDelivered || isConfirmed || confirmingOrderId === order.id}
                              onClick={() => handleConfirmPurchase(order.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {confirmingOrderId === order.id ? '확정 중…' : isConfirmed ? '구매확정 완료' : '구매확정'}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {isConfirmed ? (
                          <TooltipContent side="top" className="text-sm">
                            이미 구매확정된 주문입니다.
                          </TooltipContent>
                        ) : !isDelivered ? (
                          <TooltipContent side="top" className="text-sm">
                            배송완료 후 구매확정이 가능합니다.
                          </TooltipContent>
                        ) : null}
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}

                  <TooltipProvider>
                    {order.shippingInfo?.withStringService ? (
                      stringServiceCTAHref ? (
                        <Button
                          size="sm"
                          variant={stringServiceCTAKind === 'apply' || stringServiceCTAKind === 'add' ? 'default' : 'outline'}
                          className={
                            stringServiceCTAKind === 'apply' || stringServiceCTAKind === 'add'
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200'
                              : 'border-border hover:border-border hover:bg-primary/10 dark:border-border dark:hover:border-border dark:hover:bg-primary/20 bg-transparent'
                          }
                          asChild
                        >
                          <Link href={stringServiceCTAHref} className="inline-flex items-center gap-1">
                            {stringServiceCTALabel}
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-muted px-4 py-2 text-sm font-semibold text-foreground dark:border-border">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              {stringServiceCTALabel}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-sm">
                            이미 신청이 완료된 주문입니다
                          </TooltipContent>
                        </Tooltip>
                      )
                    ) : null}
                  </TooltipProvider>

                  {order.cancelStatus === 'requested' ? (
                    <Button size="sm" variant="destructive" onClick={() => handleWithdrawCancelRequest(order.id)} className="gap-2">
                      취소 요청 철회
                    </Button>
                  ) : (
                    isCancelable && (
                      <CancelOrderDialog orderId={order.id}>
                        <Button variant="destructive" size="sm">
                          주문 취소 요청
                        </Button>
                      </CancelOrderDialog>
                    )
                  )}
                </div>

                {/* Mobile(<bp-sm): 핵심 1~2개만 노출 + 나머지는 더보기 */}
                <div className="grid bp-sm:hidden grid-cols-12 items-center gap-2">
                  <Button size="sm" variant="outline" asChild className={`${showMobileSecondCTA ? 'col-span-5' : 'col-span-10'} w-full whitespace-nowrap border-border hover:border-border hover:bg-primary/10 dark:hover:bg-primary/20 bg-transparent`}>
                    <Link href={detailHref} className="inline-flex w-full items-center justify-center gap-1">
                      상세보기
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                  {stringServiceCTAKind === 'view' && stringServiceCTAHref ? (
                    <Button size="sm" variant="outline" asChild className="col-span-5 w-full whitespace-nowrap hover:border-border dark:hover:bg-primary/20 bg-transparent">
                      <Link href={stringServiceCTAHref} className="inline-flex w-full items-center justify-center gap-1">
                        {stringServiceCTALabel}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  ) : stringServiceCTAHref ? (
                    <Button size="sm" className="col-span-5 w-full whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                      <Link href={stringServiceCTAHref} className="inline-flex w-full items-center justify-center gap-1">
                        {stringServiceCTALabel}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  ) : null}
                  <DropdownMenu open={openMenuOrderId === order.id} onOpenChange={(open) => setOpenMenuOrderId(open ? order.id : null)}>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="outline" className="col-span-2 h-9 w-full border-border bg-transparent">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">더보기</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>더보기</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {/* 리뷰 CTA: 완료 상태일 때만 노출(기존 컴포넌트 정책과 동일) */}
                      {(['배송완료', '구매확정'].includes(order.status) || order.cancelStatus === 'requested') && (
                        <DropdownMenuItem asChild>
                          <Link href={detailHref} className="flex items-center gap-2">
                            <MessageSquarePlus className="h-4 w-4" />
                            리뷰 작성하기
                          </Link>
                        </DropdownMenuItem>
                      )}

                      {showConfirm ? (
                        <DropdownMenuItem
                          disabled={!canConfirm}
                          onSelect={(e) => {
                            handleConfirmPurchase(order.id);
                          }}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {isConfirmed ? '구매확정 완료' : '구매확정'}
                        </DropdownMenuItem>
                      ) : null}

                      {order.shippingInfo?.withStringService ? (
                        stringServiceCTAHref ? (
                          <DropdownMenuItem asChild>
                            <Link href={stringServiceCTAHref} className="flex items-center gap-2">
                              <ArrowRight className="h-4 w-4" />
                              {stringServiceCTALabel}
                            </Link>
                          </DropdownMenuItem>
                        ) : stringServiceCTAKind === 'done' ? (
                          // (안전장치) 신청 완료 상태인데 ID가 없으면 완료만 표시
                          <DropdownMenuItem disabled className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            {stringServiceCTALabel}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem asChild>
                            <Link href={`/services/apply?orderId=${order.id}`} className="flex items-center gap-2">
                              <ArrowRight className="h-4 w-4" />
                              교체 신청
                            </Link>
                          </DropdownMenuItem>
                        )
                      ) : null}

                      {(order.cancelStatus === 'requested' || isCancelable) && <DropdownMenuSeparator />}

                      {/* 취소 요청 철회는 목록에서도 바로 가능 */}
                      {order.cancelStatus === 'requested' ? (
                        <DropdownMenuItem
                          onSelect={(e) => {
                            handleWithdrawCancelRequest(order.id);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Undo2 className="h-4 w-4" />
                          취소 요청 철회
                        </DropdownMenuItem>
                      ) : null}

                      {/* 취소 요청은 상세에서 다이얼로그로 처리(목록에서는 메뉴만 제공) */}
                      {order.cancelStatus !== 'requested' && isCancelable ? (
                        <DropdownMenuItem
                          onSelect={() => {
                            setOpenMenuOrderId(null); // 드롭다운 닫기
                            setCancelDialogOrderId(order.id); // 다이얼로그 열기
                          }}
                          className="flex items-center gap-2"
                        >
                          <Ban className="h-4 w-4" />
                          주문 취소 요청
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      <CancelOrderDialog
        orderId={cancelDialogOrderId ?? ''} // null이면 빈 값
        open={!!cancelDialogOrderId} // 열림 여부
        onOpenChange={(open) => {
          if (!open) setCancelDialogOrderId(null); // 닫히면 초기화
        }}
      />

      {/* '더 보기' 버튼 */}
      <div className="flex justify-center pt-4">
        {hasMore ? (
          <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating} className="border-border hover:bg-primary/10 dark:hover:bg-primary/20 bg-transparent">
            더 보기
          </Button>
        ) : items.length ? (
          <span className="text-sm text-muted-foreground">마지막 페이지입니다</span>
        ) : null}
      </div>

      {hasMore && isValidating ? <OrderListSkeleton count={2} /> : null}
    </div>
  );
}
