'use client';

import React, { useEffect, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, CreditCard, Download, Mail, MapPin, Package, Phone, ShoppingCart, Truck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { paymentStatusColors } from '@/lib/badge-style';
import AdminCancelOrderDialog from '@/app/admin/orders/_components/AdminCancelOrderDialog';
import OrderHistory from '@/app/admin/orders/_components/OrderHistory';
import { toast } from 'sonner';
import { OrderStatusSelect } from '@/app/admin/orders/_components/OrderStatusSelect';
import OrderDetailSkeleton from '@/app/mypage/orders/_components/OrderDetailSkeleton';
import Loading from '@/app/admin/orders/[id]/loading';

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

//  useSWRInfinite용 getKey (처리 이력)
const LIMIT = 5; // 페이지 당 이력 개수
const getOrderHistoryKey = (orderId: string) => (pageIndex: number, prev: any) => {
  if (prev && prev.history.length === 0) return null;
  return `/api/orders/${orderId}/history?page=${pageIndex + 1}&limit=${LIMIT}`;
};

//  타입 정의 (서버에서 내려받는 주문 정보 형태)
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
  history: Array<any>; // initialData용 (하지만 useSWRInfinite로 실제 이력 사용)
  cancelReason?: string;
  cancelReasonDetail?: string;
}

//  메인 컴포넌트
interface Props {
  orderId: string;
}

export default function OrderDetailClient({ orderId }: Props) {
  const router = useRouter();

  // 주문 전체 데이터를 SWR로 가져옴 (갱신 키: `/api/orders/${orderId}`)
  const { data: orderDetail, error: orderError, mutate: mutateOrder } = useSWR<OrderDetail>(`/api/orders/${orderId}`, fetcher);

  //  처리 이력 데이터를 SWRInfinite로 가져옴. (키: `/api/orders/${orderId}/history?…`)
  const {
    data: historyPages,
    error: historyError,
    mutate: mutateHistory,
  } = useSWRInfinite(getOrderHistoryKey(orderId), fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // local 상태를 두어 “옵티미스틱 업데이트”가 가능하게 적용
  // 서버에서 받아온 orderDetail.status가 바뀌면 자동 동기화
  const [localStatus, setLocalStatus] = useState<string>(orderDetail?.status || '대기중');
  useEffect(() => {
    if (orderDetail && orderDetail.status !== localStatus) {
      setLocalStatus(orderDetail.status);
    }
  }, [orderDetail]);

  // 로딩/에러 처리
  if (orderError) {
    return <div className="text-center text-destructive">주문을 불러오는 중 오류가 발생했습니다.</div>;
  }
  if (!orderDetail) {
    return <Loading />;
  }

  // 페이지네이션 없이 가져온 모든 이력 합치기
  const allHistory: any[] = historyPages ? historyPages.flatMap((page) => page.history) : [];

  //  날짜/통화 포맷 함수
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '날짜 없음';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '유효하지 않은 날짜';
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  //  취소 성공 시 호출되는 콜백
  const handleCancelSuccess = async (reason: string, detail?: string) => {
    //  옵티미스틱 업데이트: 클라이언트 화면에서 곧바로 상태를 '취소'로 바꿔줌
    setLocalStatus('취소');

    try {
      // SWR 캐시의 해당 키를 revalidate (서버에서 최신 정보 가져오기)
      await mutateOrder(); // `/api/orders/${orderId}` 다시 호출
      await mutateHistory(); // `/api/orders/${orderId}/history?…` 다시 호출
      toast.success('주문이 취소되었습니다.');
    } catch (err) {
      console.error('[OrderDetailClient] cancel mutate error:', err);
      toast.error('취소 후 데이터 갱신 중 오류가 발생했습니다.');
      // 오류 시, 서버에서 받아온 원래 상태로 복원
      if (orderDetail.status !== '취소') {
        setLocalStatus(orderDetail.status);
      }
    }
  };

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl">
        {/*  페이지 헤더  */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button variant="outline" size="sm" className="mb-3" asChild>
              <Link href="/admin/orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                주문 목록으로 돌아가기
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">주문 상세 정보</h1>
            <p className="mt-1 text-muted-foreground">주문 ID: {orderDetail._id}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              주문서 다운로드
            </Button>
            <Button asChild>
              <Link href={`/admin/orders/${orderId}/shipping-update`}>
                <Truck className="mr-2 h-4 w-4" />
                배송 정보 업데이트
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/*  주문 상태 및 요약  */}
          <Card className="md:col-span-3 rounded-xl border-gray-200 bg-white shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>주문 상태</CardTitle>
                {/* 
                  OrderStatusBadge: 주문 상태 뱃지를 보여줌.
                  초기 상태 대신 localStatus를 넘겨서 실시간 반영되도록함
                */}
                <Badge className={paymentStatusColors[orderDetail.paymentStatus]}>{localStatus}</Badge>
              </div>
              <CardDescription>{formatDate(orderDetail.date)}에 접수된 주문입니다.</CardDescription>
            </CardHeader>
            <CardFooter className="pt-4">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
                {/* 
                  OrderStatusSelect: 드롭다운으로 상태(대기중/결제완료/배송중/완료 등) 변경 
                  currentStatus → localStatus
                  orderId: string
                */}
                <OrderStatusSelect orderId={orderId} currentStatus={localStatus} />

                {/* 주문 취소 모달: status가 '취소'가 아닐 때만 보여줌 */}
                {localStatus === '취소' ? (
                  <p className="text-sm text-muted-foreground italic mt-2">취소된 주문입니다. 상태 변경 및 취소가 불가능합니다.</p>
                ) : (
                  <AdminCancelOrderDialog
                    orderId={orderId}
                    onCancelSuccess={handleCancelSuccess}
                    key={'cancel-' + allHistory.length}
                    // history 길이가 바뀔 때마다 모달 키를 바꿔주면 모달 내부 상태가 초기화
                  />
                )}
              </div>
            </CardFooter>
          </Card>

          {/*  고객 정보  */}
          <Card className="rounded-xl border-gray-200 bg-white shadow-md px-2 py-3">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                고객 정보
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
                  <div>
                    <Badge className={paymentStatusColors[orderDetail.paymentStatus]}>{orderDetail.paymentStatus}</Badge>
                  </div>
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

          {/*  배송 요청사항  */}
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
          <div className="md:col-span-3">
            <OrderHistory orderId={orderId} />
          </div>
        </div>
      </div>
    </div>
  );
}
