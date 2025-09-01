'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import { ArrowLeft, Calendar, CheckCircle, Clock, CreditCard, Mail, MapPin, Pencil, Phone, ShoppingCart, Truck, User } from 'lucide-react';
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
import PaymentMethodDetail from '@/app/mypage/orders/_components/PaymentMethodDetail';
import ServiceReviewCTA from '@/components/reviews/ServiceReviewCTA';
import OrderReviewCTA from '@/components/reviews/OrderReviewCTA';

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
    addressDetail?: string;
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
    depositor: string;
  };
  paymentStatus: string;
  paymentMethod: string;
  paymentBank: string;
  total: number;
  items: Array<{ id: string; name: string; quantity: number; price: number; imageUrl?: string | null }>;
  history: Array<any>;
  cancelReason?: string;
  cancelReasonDetail?: string;
  isStringServiceApplied?: boolean;
  stringingApplicationId?: string;
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

  // 상품 리뷰 작성 여부 맵: { [productId]: boolean }
  const [reviewedMap, setReviewedMap] = useState<Record<string, boolean>>({});

  // 완료 상태
  const completedStatuses = new Set(['배송완료', '완료', '구매확정']);
  const canShowReviewCTA = completedStatuses.has(orderDetail?.status ?? '');
  const reviewsReady = (orderDetail?.items ?? []).every((it) => it.id in reviewedMap);

  useEffect(() => {
    const ids = (orderDetail?.items ?? []).map((it) => it.id).filter(Boolean);
    if (!ids.length) return;
    let aborted = false;
    (async () => {
      const order = orderDetail?._id;
      const results = await Promise.allSettled(ids.map((id) => fetch(`/api/reviews/self?productId=${id}&orderId=${order}`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null))));
      if (aborted) return;
      const next: Record<string, boolean> = {};
      results.forEach((res, i) => {
        next[ids[i]] = res.status === 'fulfilled' && !!res.value; // 존재하면 true
      });
      setReviewedMap(next);
    })();
    return () => {
      aborted = true;
    };
  }, [orderDetail?._id]);

  const items = orderDetail?.items ?? [];
  const allReviewed = items.length > 0 && items.every((it) => reviewedMap[it.id]);
  const firstUnreviewed = items.find((it) => !reviewedMap[it.id]);
  // 편집 가능 상태: 배송 중/완료/환불/취소가 아니어야 함
  const nonEditableStatuses = ['배송중', '배송완료', '환불', '취소'];
  const canUserEdit = !nonEditableStatuses.includes(orderDetail?.status ?? '');
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

  // 에러/로딩 처리
  if (orderError) {
    return <div className="text-center text-destructive">주문을 불러오는 중 오류가 발생했습니다.</div>;
  }
  if (!orderDetail) {
    return <OrderDetailSkeleton />;
  }

  return (
    <main className="container mx-auto p-6 space-y-8">
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 rounded-2xl p-8 border border-blue-100 dark:border-blue-800/30 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-md">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">주문 상세정보</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">주문번호: {orderId}</p>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" size="sm" onClick={() => router.push('/mypage?tab=orders')} className="bg-white/60 backdrop-blur-sm border-blue-200 hover:bg-blue-50">
              <ArrowLeft className="mr-2 h-4 w-4" />
              주문 목록으로 돌아가기
            </Button>
            <Button variant={isEditMode ? 'destructive' : 'outline'} size="sm" onClick={() => setIsEditMode((m) => !m)} disabled={!canUserEdit} className={isEditMode ? '' : 'bg-white/60 backdrop-blur-sm border-blue-200 hover:bg-blue-50'}>
              <Pencil className="mr-1 h-4 w-4" />
              {isEditMode ? '편집 종료' : '편집 모드'}
            </Button>
          </div>
        </div>

        {/*  주문 상태 및 요약  */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">주문일시</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatDate(orderDetail.date)}</p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-2">
              <CreditCard className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">총 결제금액</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(orderDetail.total)}</p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Truck className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">주문 상태</span>
            </div>
            <OrderStatusBadge orderId={orderId} initialStatus={orderDetail.status} />
          </div>
        </div>
      </div>

      {orderDetail.shippingInfo?.deliveryMethod?.replace(/\s/g, '') === '방문수령' && orderDetail.shippingInfo?.withStringService && (
        <>
          {!orderDetail.isStringServiceApplied ? (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border border-yellow-200 dark:border-yellow-800/30 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-full p-2">
                    <CheckCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-yellow-900 dark:text-yellow-100">이 주문은 스트링 장착 서비스가 포함되어 있습니다.</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">아래 버튼을 클릭하여 스트링 장착 서비스를 신청해주세요.</p>
                  </div>
                </div>
                <Link href={`/services/apply?orderId=${orderDetail._id}`}>
                  <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg">스트링 장착 서비스 신청하기</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800/30 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-2">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">이 주문은 스트링 장착 서비스가 신청 완료되었습니다.</p>
                    <p className="text-sm text-green-700 dark:text-green-300">신청 상세 정보를 확인하실 수 있습니다.</p>
                  </div>
                </div>
                {orderDetail.stringingApplicationId && (
                  <Link href={`/mypage?tab=applications&id=${orderDetail.stringingApplicationId}`}>
                    <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950/20 bg-transparent">
                      신청 상세 보기
                    </Button>
                  </Link>
                )}
                <ServiceReviewCTA applicationId={orderDetail.stringingApplicationId} className="ml-2" />
              </div>
            </div>
          )}
          <div id="reviews-cta" className="mt-4">
            {allReviewed ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-6 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">이 주문은 리뷰를 작성하였습니다.</p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">내가 작성한 리뷰를 확인할 수 있어요.</p>
                  </div>
                </div>
                <Link href="/mypage?tab=reviews">
                  <Button variant="outline" className="border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
                    리뷰 관리로 이동
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-xl p-6 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-900 dark:text-yellow-100">이 주문은 리뷰를 작성하지 않았습니다.</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">아래 ‘리뷰 작성하기’를 눌러 상품별로 리뷰를 남겨주세요.</p>
                    <p className="text-sm text-red-700 dark:text-red-300">※상품이 정상적으로 '배송완료' 처리가 되면 [리뷰 작성] 버튼이 나타납니다.</p>
                  </div>
                </div>
                <OrderReviewCTA
                  orderId={orderDetail._id as string}
                  reviewAllDone={allReviewed}
                  unreviewedCount={items.filter((it) => !reviewedMap[it.id]).length}
                  reviewNextTargetProductId={firstUnreviewed?.id ?? null}
                  orderStatus={orderDetail.status}
                  showOnlyWhenCompleted
                  loading={!reviewsReady}
                />
              </div>
            )}
          </div>
        </>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* 고객 정보 */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b">
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <span>내 정보</span>
            </CardTitle>
          </CardHeader>
          {editingCustomer ? (
            <CardContent className="p-6">
              <CustomerEditForm
                initialData={{
                  name: orderDetail.customer.name,
                  email: orderDetail.customer.email,
                  phone: orderDetail.customer.phone,
                  address: orderDetail.customer.address,
                  postalCode: orderDetail.customer.postalCode || '',
                  addressDetail: orderDetail.customer.addressDetail || '',
                }}
                orderId={orderId}
                resourcePath="/api/orders"
                onSuccess={() => {
                  mutateOrderDetail();
                  mutateHistory();
                  setEditingCustomer(false);
                }}
                onCancel={() => setEditingCustomer(false)}
              />
            </CardContent>
          ) : (
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">이름</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{orderDetail.customer.name ?? '이름 없음'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">이메일</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{orderDetail.customer.email ?? '이메일 없음'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">전화번호</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{orderDetail.customer.phone ?? '전화번호 없음'}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">주소</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{orderDetail.customer.address ?? '주소 없음'}</p>
                    {orderDetail.customer.addressDetail && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{orderDetail.customer.addressDetail}</p>}
                    {orderDetail.customer.postalCode && <p className="text-sm text-gray-600 dark:text-gray-400">우편번호: {orderDetail.customer.postalCode}</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          )}
          {isEditMode && canUserEdit && !editingCustomer && (
            <CardFooter className="pt-3 flex justify-center bg-gray-50/50 dark:bg-gray-800/50">
              <Button size="sm" variant="outline" onClick={() => setEditingCustomer(true)} className="hover:bg-blue-50 border-blue-200">
                고객정보 수정
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* 배송 정보 */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b">
            <CardTitle className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-green-600" />
              <span>배송 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Truck className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">배송 방법</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {{
                      delivery: '택배 배송',
                      quick: '퀵 배송 (당일)',
                      visit: '방문 수령',
                    }[orderDetail.shippingInfo.shippingMethod] || '정보 없음'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">예상 수령일</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDate(orderDetail.shippingInfo.estimatedDate)}</p>
                </div>
              </div>

              {orderDetail.shippingInfo.invoice?.trackingNumber && (
                <>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">택배사</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {{
                          cj: 'CJ 대한통운',
                          hanjin: '한진택배',
                          logen: '로젠택배',
                          post: '우체국택배',
                          etc: '기타',
                        }[orderDetail.shippingInfo.invoice.courier] || '미지정'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">운송장 번호</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{orderDetail.shippingInfo.invoice.trackingNumber}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 결제 정보 */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b">
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <span>결제 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">결제 상태</p>
                  <Badge className={paymentStatusColors[orderDetail.paymentStatus]}>{orderDetail.paymentStatus}</Badge>
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <PaymentMethodDetail method={orderDetail.paymentMethod || '무통장입금'} bankKey={orderDetail.paymentBank} depositor={orderDetail.shippingInfo?.depositor} />
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">결제 금액</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(orderDetail.total)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주문 항목 */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b">
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-orange-600" />
              <span>주문 항목</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {orderDetail.items.map((item, idx) => (
                <div key={idx} className="flex items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors space-x-4">
                  {/* 상품 썸네일 */}
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded" />}

                  {/* 상품명 + 수량 */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">수량: {item.quantity}개</p>
                  </div>

                  {/* 가격 및 소계 */}
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(item.price)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">소계: {formatCurrency(item.price * item.quantity)}</p>
                    <div className="mt-2">
                      {canShowReviewCTA &&
                        (reviewedMap[item.id] ? (
                          <Link href={`/products/${item.id}?tab=reviews`}>
                            <Button size="sm" variant="secondary">
                              리뷰 상세보기
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/reviews/write?productId=${item.id}&orderId=${orderDetail._id}`}>
                            <Button size="sm" variant="outline">
                              리뷰 작성하기
                            </Button>
                          </Link>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 요청사항 */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b">
          <CardTitle>배송 요청사항</CardTitle>
          <CardDescription>사용자가 결제 시 입력한 배송 관련 요청사항입니다.</CardDescription>
        </CardHeader>
        {editingRequest ? (
          <CardContent className="p-6">
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
          <CardContent className="p-6">
            {orderDetail.shippingInfo.deliveryRequest ? (
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{orderDetail.shippingInfo.deliveryRequest}</p>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">요청사항이 입력되지 않았습니다.</p>
            )}
          </CardContent>
        )}
        {isEditMode && canUserEdit && !editingRequest && (
          <CardFooter className="flex justify-center bg-gray-50/50 dark:bg-gray-800/50">
            <Button size="sm" variant="outline" onClick={() => setEditingRequest(true)} className="hover:bg-orange-50 border-orange-200">
              요청사항 수정
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* 처리 이력 */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <span>주문 이력</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <OrderHistory orderId={orderId} />
        </CardContent>
      </Card>

      {['대기중', '결제완료'].includes(orderDetail.status) && (
        <div className="flex justify-center">
          <CancelOrderDialog orderId={orderDetail._id.toString()} />
        </div>
      )}
    </main>
  );
}
