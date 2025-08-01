'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { orderStatusColors } from '@/lib/badge-style';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShoppingBag, Calendar, User, CreditCard, Package, ArrowRight, CheckCircle, Clock, Truck } from 'lucide-react';

//  주문 데이터 타입 정의
interface Order {
  id: string;
  date: string;
  total: number;
  status: string;
  items: { name: string; quantity: number }[];
  totalPrice: number;
  userSnapshot?: {
    name: string;
    email: string;
  };
  shippingInfo?: {
    deliveryMethod?: string;
    withStringService?: boolean;
  };
  isStringServiceApplied?: boolean;
}

const fetcher = async (url: string): Promise<any> => {
  const res = await fetch(url, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case '완료':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case '배송중':
      return <Truck className="h-4 w-4 text-blue-500" />;
    case '대기중':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <Package className="h-4 w-4 text-slate-500" />;
  }
};

export default function OrderList() {
  //  SWR을 사용해 API에서 주문 데이터 가져오기
  const { data: orders, error, isLoading } = useSWR<Order[]>('/api/users/me/orders', fetcher);
  console.log(' 주문:', orders);

  //  에러 처리
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

  //  로딩 처리 (부모 Suspense에서 fallback으로도 처리되지만 이중 보호)
  if (isLoading || !Array.isArray(orders)) {
    // SWR이 `undefined`를 리턴하는 동안 isLoading 또는 !orders 체크
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-slate-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  //  주문이 없을 경우
  if (orders.length === 0) {
    return (
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardContent className="p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
            <ShoppingBag className="h-10 w-10 text-blue-600 dark:text-blue-400" />
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
      {orders.map((order) => (
        <Card key={order.id} className="group relative overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          {/* Gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '1px' }}>
            <div className="h-full w-full bg-white dark:bg-slate-900 rounded-lg" />
          </div>

          <CardContent className="relative p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
                  <ShoppingBag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">주문 #{order.id}</h3>
                  <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3 w-3" />
                    {order.date}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getStatusIcon(order.status)}
                <Badge className={`px-3 py-1 text-xs font-medium ${orderStatusColors[order.status]}`}>{order.status}</Badge>
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
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="text-sm text-slate-900 dark:text-slate-100">{item.name}</span>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">x {item.quantity}</span>
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
                <Button size="sm" variant="outline" asChild className="border-slate-200 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:hover:border-blue-600 dark:hover:bg-blue-950 bg-transparent">
                  <Link href={`/mypage?tab=orders&orderId=${order.id}`} className="inline-flex items-center gap-1">
                    상세보기
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>

                <TooltipProvider>
                  {order.shippingInfo?.deliveryMethod?.replace(/\s/g, '') === '방문수령' && order.shippingInfo?.withStringService && (
                    <>
                      {!order.isStringServiceApplied ? (
                        <Button size="sm" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200" asChild>
                          <Link href={`/services/apply?orderId=${order.id}`} className="inline-flex items-center gap-1">
                            스트링 장착 신청
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex h-9 items-center justify-center rounded-md border border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 text-sm font-semibold text-green-700 dark:border-green-600 dark:from-green-950 dark:to-emerald-950 dark:text-green-300">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              스트링 신청 완료
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-sm">
                            이미 신청이 완료된 주문입니다
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </>
                  )}
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
