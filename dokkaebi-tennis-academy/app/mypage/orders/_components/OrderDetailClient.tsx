'use client';

import React from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import { ArrowLeft, Calendar, CreditCard, Mail, MapPin, Phone, ShoppingCart, Truck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import CancelOrderDialog from './CancelOrderDialog'; // 기존 다이얼로그 그대로 사용
import OrderHistory from '@/app/admin/orders/_components/OrderHistory';
import { OrderStatusBadge } from '@/app/admin/orders/_components/OrderStatusBadge';
import { paymentStatusColors } from '@/lib/badge-style';
import OrderDetailSkeleton from '@/app/mypage/orders/_components/OrderDetailSkeleton';
import { useRouter } from 'next/navigation';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const router = useRouter();

// SWR Infinite용 getKey (처리 이력 페이지네이션)
const LIMIT = 5;
const getOrderHistoryKey = (orderId: string) => (pageIndex: number, previousPageData: any) => {
  if (previousPageData && previousPageData.history.length === 0) return null;
  return `/api/orders/${orderId}/history?page=${pageIndex + 1}&limit=${LIMIT}`;
};

interface OrderDetail {
  _id: string;
  status: string;
  date: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  shippingInfo: {
    shippingMethod: string;
    estimatedDate: string;
    invoice?: {
      courier: string;
      trackingNumber: string;
    };
    deliveryRequest?: string;
  };
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  history: Array<any>;
  cancelReason?: string;
  cancelReasonDetail?: string;
}
interface Props {
  orderId: string;
}

export default function OrderDetailClient({ orderId }: Props) {
  // 주문 상세를 SWR로 가져오기
  const { data: orderDetail, error: orderError, mutate: mutateOrderDetail } = useSWR<OrderDetail>(`/api/orders/${orderId}`, fetcher);

  // 처리 이력 데이터를 SWRInfinite로 가져오기
  const { data: historyPages, error: historyError, mutate: mutateHistory } = useSWRInfinite(getOrderHistoryKey(orderId), fetcher, { revalidateOnFocus: false, revalidateOnReconnect: false });

  // 에러/로딩 처리
  if (orderError) {
    return <div className="text-center text-destructive">주문을 불러오는 중 오류가 발생했습니다.</div>;
  }
  if (!orderDetail) {
    return <OrderDetailSkeleton />;
  }

  // 이력 페이지를 합쳐서 하나의 배열로
  const allHistory: any[] = historyPages ? historyPages.flatMap((page) => page.history) : [];

  // 날짜/금액 포맷 함수
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '날짜 없음';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '유효하지 않은 날짜';
    return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  return (
    <div className="container">
      <div className="mx-auto max-w-4xl">
        {/* 페이지 헤더 */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button variant="ghost" onClick={() => router.push('/mypage?tab=orders')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              목록으로 돌아가기
            </Button>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">주문 상세 정보</h1>
            <p className="mt-1 text-muted-foreground">주문 ID: {orderId}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/*  주문 상태 및 요약  */}
          <Card className="md:col-span-3 rounded-xl border-gray-200 bg-white shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>주문 상태</CardTitle>
                {/* SWR로 가져온 orderDetail.status를 반영 */}
                <OrderStatusBadge orderId={orderId} initialStatus={orderDetail.status} />
              </div>
              <CardDescription>{formatDate(orderDetail.date)}에 접수된 주문입니다.</CardDescription>
            </CardHeader>
            <CardFooter className="pt-4">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
                {/* ‘대기중’ 또는 ‘결제완료’ 상태일 때만 취소 버튼 표시 */}
                {['대기중', '결제완료'].includes(orderDetail.status) && <CancelOrderDialog orderId={orderDetail._id.toString()} />}
              </div>
            </CardFooter>
          </Card>

          {/*  고객 정보  */}
          <Card className="rounded-xl border-gray-200 bg-white shadow-md px-2 py-3">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />내 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">이름</div>
                  <div>{orderDetail.customer.name ?? '이름 없음'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium flex items-center">
                    <Mail className="mr-1 h-3.5 w-3.5" />
                    이메일
                  </div>
                  <div>{orderDetail.customer.email ?? '이메일 없음'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium flex items-center">
                    <Phone className="mr-1 h-3.5 w-3.5" />
                    전화번호
                  </div>
                  <div>{orderDetail.customer.phone ?? '전화번호 없음'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium flex items-center">
                    <MapPin className="mr-1 h-3.5 w-3.5" />
                    주소
                  </div>
                  <div>{orderDetail.customer.address ?? '주소 없음'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/*  배송 정보  */}
          <Card className="rounded-xl border-gray-200 bg-white shadow-md px-2 py-3">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Truck className="mr-2 h-5 w-5" />
                배송 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">배송 방법</div>
                  <div>
                    {{
                      delivery: '택배 배송',
                      quick: '퀵 배송 (당일)',
                      visit: '방문 수령',
                    }[orderDetail.shippingInfo.shippingMethod] || '정보 없음'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium flex items-center">
                    <Calendar className="mr-1 h-3.5 w-3.5" />
                    예상 수령일
                  </div>
                  <div>{formatDate(orderDetail.shippingInfo.estimatedDate)}</div>
                </div>
                {orderDetail.shippingInfo.invoice?.trackingNumber && (
                  <>
                    <div>
                      <div className="text-sm font-medium">택배사</div>
                      <div>
                        {{
                          cj: 'CJ 대한통운',
                          hanjin: '한진택배',
                          logen: '로젠택배',
                          post: '우체국택배',
                          etc: '기타',
                        }[orderDetail.shippingInfo.invoice.courier] || '미지정'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">운송장 번호</div>
                      <div>{orderDetail.shippingInfo.invoice.trackingNumber}</div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/*  결제 정보  */}
          <Card className="rounded-xl border-gray-200 bg-white shadow-md px-2 py-3">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                결제 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">결제 상태</div>
                  <Badge className={paymentStatusColors[orderDetail.paymentStatus]}>{orderDetail.paymentStatus}</Badge>
                </div>
                <div>
                  <div className="text-sm font-medium">결제 방법</div>
                  <div>{orderDetail.paymentMethod}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">결제 금액</div>
                  <div className="text-lg font-bold">{formatCurrency(orderDetail.total)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/*  주문 항목  */}
          <Card className="md:col-span-3 rounded-xl border-gray-200 bg-white shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5" />
                주문 항목
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">상품/서비스</th>
                      <th className="px-4 py-3 text-center font-medium">수량</th>
                      <th className="px-4 py-3 text-right font-medium">가격</th>
                      <th className="px-4 py-3 text-right font-medium">합계</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orderDetail.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3">{item.name}</td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-medium">
                        총 합계
                      </td>
                      <td className="px-4 py-3 text-right text-lg font-bold">{formatCurrency(orderDetail.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/*  요청사항  */}
          <Card className="md:col-span-3 rounded-xl border-gray-200 bg-white shadow-md">
            <CardHeader className="pb-3">
              <CardTitle>배송 요청사항</CardTitle>
              <CardDescription>사용자가 결제 시 입력한 배송 관련 요청사항입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {orderDetail.shippingInfo.deliveryRequest ? <p className="whitespace-pre-line text-sm text-foreground">{orderDetail.shippingInfo.deliveryRequest}</p> : <p className="text-sm text-muted-foreground">요청사항이 입력되지 않았습니다.</p>}
            </CardContent>
          </Card>

          {/*  처리 이력  */}
          <OrderHistory orderId={orderId} />
        </div>
      </div>
    </div>
  );
}
