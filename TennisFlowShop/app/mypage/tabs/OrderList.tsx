'use client';

import { useMemo, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { orderStatusColors } from '@/lib/badge-style';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShoppingBag, Calendar, User, CreditCard, Package, ArrowRight, CheckCircle, Clock, Truck, Ban, MoreVertical, MessageSquarePlus, Undo2 } from 'lucide-react';
import OrderReviewCTA from '@/components/reviews/OrderReviewCTA';
import CancelOrderDialog from '@/app/mypage/orders/_components/CancelOrderDialog';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { mutate as globalMutate } from 'swr';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
  items: Array<{ name: string; quantity: number; price: number; imageUrl?: string | null }>;
  totalPrice: number;
  userSnapshot?: { name: string; email: string };
  shippingInfo?: { deliveryMethod?: string; withStringService?: boolean };
  isStringServiceApplied?: boolean;
  stringingApplicationId?: string | null; // 연결된 교체 서비스 신청서 ID(있으면 '신청서 보기' CTA로 연결)
  reviewAllDone?: boolean;
  unreviewedCount?: number;
  reviewNextTargetProductId?: string | null;

  // 주문 취소 요청 상태/사유(목록 카드용)
  cancelStatus?: string;
  cancelReasonSummary?: string | null;
}

const fetcher = async (url: string): Promise<any> => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case '배송중':
      return <Truck className="h-4 w-4 text-primary" />;
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

    const ok = window.confirm('구매확정을 진행하시겠습니까?\n\n- 배송완료 이후에만 확정할 수 있습니다.\n- 확정 후에는 되돌릴 수 없습니다.');
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

  // 첫 로딩
  if (!data && isValidating) {
    return <div className="text-center py-8 text-muted-foreground">주문 내역을 불러오는 중입니다...</div>;
  }

  //  주문이 없을 경우
  if (!isValidating && items.length === 0) {
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
      {items.map((order) => {
        // 이 주문이 현재 "취소 요청 버튼"을 보여줄 수 있는 상태인지 계산
        const isCancelable = ['대기중', '결제완료'].includes(order.status) && (!order.cancelStatus || order.cancelStatus === 'none' || order.cancelStatus === 'rejected');
        // 스트링 관련 주문 여부 (스트링 서비스 가능 주문)
        const isStringOrder = order.shippingInfo?.withStringService === true;
        // 상태 판정은 boolean으로 분리 (TS 좁힘/비교 에러 방지)
        const isDelivered = order.status === '배송완료';
        const isConfirmed = order.status === '구매확정';

        // 버튼/메뉴 분기용 값 (모바일 핵심 1~2개 + 더보기)
        const detailHref = `/mypage?tab=orders&orderId=${order.id}`;
        const showConfirm = order.status !== '취소' && order.status !== '환불';
        const canConfirm = showConfirm && isDelivered && !isConfirmed && confirmingOrderId !== order.id;
        // 신청서 연결 여부(있으면 "교체 신청" 대신 "신청서 보기"로 유도)
        const hasLinkedApplication = Boolean(order.stringingApplicationId);

        // 모바일 보조 CTA: "교체 신청" 또는 "신청서 보기" 중 하나라도 있으면 2버튼 레이아웃
        const showMobileSecondCTA = (Boolean(order.shippingInfo?.withStringService) && !order.isStringServiceApplied && !hasLinkedApplication) || hasLinkedApplication;

        // "교체 신청"은 신청서가 아직 없을 때만 노출
        const showMobileStringApply = Boolean(order.shippingInfo?.withStringService) && !order.isStringServiceApplied && !hasLinkedApplication;

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
                      <h3 className="font-semibold text-foreground truncate">{isStringOrder ? '스트링 주문 + 교체 서비스 포함' : `스트링 주문`}</h3>

                      {/* 신청서가 연결된 주문임을 한눈에 표시(탭 분리로 인한 혼란 완화) */}
                      {order.stringingApplicationId ? (
                        <span className="shrink-0 rounded-full border border-border bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary dark:border-border dark:bg-primary/20 dark:text-primary">신청서 연결됨</span>
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
                  {getStatusIcon(order.status)}
                  <Badge className={`px-3 py-1 text-xs font-medium ${orderStatusColors[order.status]}`}>{order.status}</Badge>

                  {/* 취소 요청이 들어간 주문이면 뱃지 표시 */}
                  {order.cancelStatus === 'requested' && (
                    <Badge variant="outline" className="ml-1 border-warning/30 bg-warning/10 text-[11px] font-medium text-warning dark:bg-warning/15 dark:text-warning">
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
                      // 신청서 ID가 있으면 무조건 "신청서 보기"
                      order.stringingApplicationId ? (
                        <Button size="sm" variant="outline" className="border-border hover:border-border hover:bg-primary/10 dark:border-border dark:hover:border-border dark:hover:bg-primary/20 bg-transparent" asChild>
                          {/* 성공페이지(/services/success) 대신 "마이페이지 신청내역 상세"로 보내는게 더 자연스러움 */}
                          <Link href={`/mypage?tab=applications&applicationId=${order.stringingApplicationId}`} className="inline-flex items-center gap-1">
                            신청서 보기
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      ) : !order.isStringServiceApplied ? (
                        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200" asChild>
                          <Link href={`/services/apply?orderId=${order.id}`} className="inline-flex items-center gap-1">
                            스트링 교체 신청
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-muted px-4 py-2 text-sm font-semibold text-foreground dark:border-border">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              교체 신청 완료
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
                  {order.stringingApplicationId ? (
                    <Button size="sm" variant="outline" asChild className="col-span-5 w-full whitespace-nowrap hover:border-border dark:hover:bg-primary/20 bg-transparent">
                      <Link href={`/mypage?tab=applications&applicationId=${order.stringingApplicationId}`} className="inline-flex w-full items-center justify-center gap-1">
                        신청서 보기
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  ) : showMobileStringApply ? (
                    <Button size="sm" className="col-span-5 w-full whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                      <Link href={`/services/apply?orderId=${order.id}`} className="inline-flex w-full items-center justify-center gap-1">
                        교체 신청
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
                        order.isStringServiceApplied ? (
                          order.stringingApplicationId ? (
                            <DropdownMenuItem asChild>
                              <Link href={`/mypage?tab=applications&applicationId=${order.stringingApplicationId}`} className="flex items-center gap-2">
                                <ArrowRight className="h-4 w-4" />
                                신청서 보기
                              </Link>
                            </DropdownMenuItem>
                          ) : (
                            // (안전장치) 신청 완료 상태인데 ID가 없으면 기존처럼 완료만 표시
                            <DropdownMenuItem disabled className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              교체 신청 완료
                            </DropdownMenuItem>
                          )
                        ) : (
                          <DropdownMenuItem asChild>
                            <Link href={`/services/apply?orderId=${order.id}`} className="flex items-center gap-2">
                              <ArrowRight className="h-4 w-4" />
                              스트링 교체 신청
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
            {isValidating ? '불러오는 중…' : '더 보기'}
          </Button>
        ) : items.length ? (
          <span className="text-sm text-muted-foreground">마지막 페이지입니다</span>
        ) : null}
      </div>
    </div>
  );
}
