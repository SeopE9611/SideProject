'use client';

import { useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { orderStatusColors } from '@/lib/badge-style';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShoppingBag, Calendar, User, CreditCard, Package, ArrowRight, CheckCircle, Clock, Truck, MessageSquarePlus, Ban } from 'lucide-react';
import OrderReviewCTA from '@/components/reviews/OrderReviewCTA';
import CancelOrderDialog from '@/app/mypage/orders/_components/CancelOrderDialog';

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
    case '완료':
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case '배송중':
      return <Truck className="h-4 w-4 text-blue-500" />;
    case '대기중':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <Ban className="h-4 w-4 text-red-500" />;
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

  const { data, size, setSize, isValidating, error } = useSWRInfinite<OrderResponse>(getKey, fetcher, {
    revalidateFirstPage: true,
  });

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
      <Card className="border-0 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950 dark:to-pink-950">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <Package className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-red-600 dark:text-red-400">주문 내역을 불러오는 중 오류가 발생했습니다.</p>
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
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br">
        <CardContent className="p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 shadow-lg">
            <ShoppingBag className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-100">주문 내역이 없습니다</h3>
          <p className="text-slate-600 dark:text-slate-400">아직 주문하신 상품이 없습니다. 지금 바로 쇼핑을 시작해보세요!</p>
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
        return (
          <Card key={order.id} className="group relative overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '1px' }}>
              <div className="h-full w-full bg-white dark:bg-slate-900 rounded-lg" />
            </div>

            <CardContent className="relative p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 shadow-lg">
                    <ShoppingBag className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{isStringOrder ? '스트링 주문 + 교체 서비스 신청' : `스트링 단일 주문 #${order.id}`}</h3>
                    <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                      <Calendar className="h-3 w-3" />
                      {formatDate(order.date)}
                    </div>
                  </div>
                </div>

                {/* 상태/취소 관련 영역 */}
                <div className="flex items-center gap-2">
                  {getStatusIcon(order.status)}
                  <Badge className={`px-3 py-1 text-xs font-medium ${orderStatusColors[order.status]}`}>{order.status}</Badge>

                  {/* 취소 요청이 들어간 주문이면 뱃지 표시 */}
                  {order.cancelStatus === 'requested' && (
                    <Badge variant="outline" className="ml-1 border-amber-300 bg-amber-50 text-[11px] font-medium text-amber-800">
                      취소 요청됨
                    </Badge>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              {order.userSnapshot?.name && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 mb-4">
                  <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">주문자</div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{order.userSnapshot.name}</div>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">주문 상품</span>
                </div>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 space-x-4">
                      {/* 상품 썸네일 */}
                      {item.imageUrl && <img src={item.imageUrl || '/placeholder.svg'} alt={item.name} className="w-10 h-10 object-cover rounded" />}
                      {/* 상품명 */}
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.name}</span>
                      {/* 가격 × 수량 */}
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {(item.price ?? 0).toLocaleString()} × {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{typeof order.totalPrice === 'number' ? `${order.totalPrice.toLocaleString()}원` : '총 결제 금액 정보 없음'}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Button size="sm" variant="outline" asChild className="border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:hover:border-emerald-600 dark:hover:bg-emerald-950 bg-transparent">
                    <Link href={`/mypage?tab=orders&orderId=${order.id}`} className="inline-flex items-center gap-1">
                      상세보기
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>

                  <OrderReviewCTA orderId={order.id} reviewAllDone={order.reviewAllDone} unreviewedCount={order.unreviewedCount} reviewNextTargetProductId={order.reviewNextTargetProductId} orderStatus={order.status} showOnlyWhenCompleted />

                  <TooltipProvider>
                    {order.shippingInfo?.withStringService &&
                      (!order.isStringServiceApplied ? (
                        <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200" asChild>
                          <Link href={`/services/apply?orderId=${order.id}`} className="inline-flex items-center gap-1">
                            스트링 교체 신청
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex h-9 items-center justify-center rounded-md border border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-600 dark:from-emerald-950 dark:to-green-950 dark:text-emerald-300">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              교체 신청 완료
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-sm">
                            이미 신청이 완료된 주문입니다
                          </TooltipContent>
                        </Tooltip>
                      ))}
                  </TooltipProvider>
                  {isCancelable && <CancelOrderDialog orderId={order.id} />}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* '더 보기' 버튼 */}
      <div className="flex justify-center pt-4">
        {hasMore ? (
          <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating} className="border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 bg-transparent">
            {isValidating ? '불러오는 중…' : '더 보기'}
          </Button>
        ) : items.length ? (
          <span className="text-sm text-slate-500">마지막 페이지입니다</span>
        ) : null}
      </div>
    </div>
  );
}
