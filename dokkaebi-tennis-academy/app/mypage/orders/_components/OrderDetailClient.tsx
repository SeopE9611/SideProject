'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import { ArrowLeft, Calendar, CheckCircle, CreditCard, Mail, MapPin, Pencil, Phone, ShoppingCart, Truck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import CancelOrderDialog from './CancelOrderDialog'; // 기존 다이얼로그 그대로 사용
import OrderHistory from '@/app/features/orders/components/OrderHistory';
import { OrderStatusBadge } from '@/app/features/orders/components/OrderStatusBadge';
import { paymentStatusColors } from '@/lib/badge-style';
import OrderDetailSkeleton from '@/app/mypage/orders/_components/OrderDetailSkeleton';
import { useRouter } from 'next/navigation';
import RequestEditForm from '@/app/mypage/orders/_components/RequestEditForm';
import CustomerEditForm from '@/app/features/orders/components/CustomerEditForm';

// SWR Infinite용 getKey (처리 이력 페이지네이션)
const LIMIT = 5;
const getOrderHistoryKey = (orderId?: string) => (pageIndex: number, prev: any) => {
  // orderId가 없으면 요청 중단
  if (!orderId) return null;
  if (prev && prev.history.length === 0) return null;
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
    postalCode?: string;
  };
  shippingInfo: {
    shippingMethod: string;
    estimatedDate: string;
    withStringService?: boolean;
    deliveryMethod?: string;
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
  isStringServiceApplied?: boolean;
}
interface Props {
  orderId: string;
}

export default function OrderDetailClient({ orderId }: Props) {
  const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());
  const router = useRouter();

  // 편집 모드 전체 토글
  const [isEditMode, setIsEditMode] = useState(false);
  // 고객 정보 편집
  const [editingCustomer, setEditingCustomer] = useState(false);
  // 배송 요청사항 편집
  const [editingRequest, setEditingRequest] = useState(false);

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

  // 편집 가능 상태: 배송 중/완료/환불/취소가 아니어야 함
  const nonEditableStatuses = ['배송중', '배송완료', '환불', '취소'];
  const canUserEdit = !nonEditableStatuses.includes(orderDetail.status);

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
    <main className="container mx-auto p-6">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        {/* 왼쪽 제목 */}
        <div className="text-left">
          <h1 className="text-3xl font-bold">주문 상세 정보</h1>
          <p className="text-sm text-muted-foreground">
            주문 ID: <code>{orderId}</code>
          </p>
        </div>

        {/* 오른쪽 버튼 그룹 */}
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <Button variant="outline" size="sm" onClick={() => router.push('/mypage?tab=orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            주문 목록으로 돌아가기
          </Button>
          <Button variant={isEditMode ? 'destructive' : 'outline'} size="sm" onClick={() => setIsEditMode((m) => !m)} disabled={!canUserEdit}>
            <Pencil className="mr-1 h-4 w-4" />
            {isEditMode ? '편집 종료' : '편집 모드'}
          </Button>
        </div>
      </header>

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

          {orderDetail.shippingInfo?.deliveryMethod?.replace(/\s/g, '') === '방문수령' && orderDetail.shippingInfo?.withStringService && (
            <>
              {!orderDetail.isStringServiceApplied ? (
                <div className="mt-6 p-4 bg-yellow-100 border border-yellow-300 rounded-md text-sm text-yellow-900">
                  <p className="mb-2 font-medium">이 주문은 스트링 장착 서비스가 포함되어 있습니다.</p>
                  <Link href={`/services/apply?orderId=${orderDetail._id}`} className="inline-block px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-md text-sm">
                    스트링 장착 서비스 신청하기
                  </Link>
                </div>
              ) : (
                <div className="mt-6 p-4 bg-green-50 border border-green-300 rounded-md text-sm text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">이 주문은 스트링 장착 서비스가 신청 완료되었습니다.</span>
                </div>
              )}
            </>
          )}
        </Card>

        {/*  고객 정보  */}
        <Card className="rounded-xl border-gray-200 bg-white shadow-md px-2 py-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />내 정보
            </CardTitle>
          </CardHeader>
          {editingCustomer ? (
            <CardContent>
              <CustomerEditForm
                initialData={{
                  name: orderDetail.customer.name,
                  email: orderDetail.customer.email,
                  phone: orderDetail.customer.phone,
                  address: orderDetail.customer.address,
                  postalCode: orderDetail.customer.postalCode || '',
                }}
                orderId={orderId}
                onSuccess={() => {
                  mutateOrderDetail();
                  mutateHistory();
                  setEditingCustomer(false);
                }}
                onCancel={() => setEditingCustomer(false)}
              />
            </CardContent>
          ) : (
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
          )}
          {isEditMode && canUserEdit && !editingCustomer && (
            <CardFooter className="pt-3 flex justify-center">
              <Button size="sm" variant="outline" onClick={() => setEditingCustomer(true)}>
                고객정보 수정
              </Button>
            </CardFooter>
          )}
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
          {editingRequest ? (
            <CardContent>
              <RequestEditForm
                initialData={orderDetail.shippingInfo.deliveryRequest || ''}
                orderId={orderId}
                onSuccess={() => {
                  mutateOrderDetail();
                  mutateHistory();
                  setEditingRequest(false);
                }}
                onCancel={() => setEditingRequest(false)}
              />
            </CardContent>
          ) : (
            <CardContent>
              {orderDetail.shippingInfo.deliveryRequest ? <p className="whitespace-pre-line text-sm text-foreground">{orderDetail.shippingInfo.deliveryRequest}</p> : <p className="text-sm text-muted-foreground">요청사항이 입력되지 않았습니다.</p>}
            </CardContent>
          )}
          {isEditMode && canUserEdit && !editingRequest && (
            <CardFooter className="flex justify-center">
              <Button size="sm" variant="outline" onClick={() => setEditingRequest(true)}>
                요청사항 수정
              </Button>
            </CardFooter>
          )}
        </Card>

        {/*  처리 이력  */}
        <OrderHistory orderId={orderId} />
      </div>
    </main>
  );
}
