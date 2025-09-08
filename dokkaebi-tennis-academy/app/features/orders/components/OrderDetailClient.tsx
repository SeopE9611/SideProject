'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, CreditCard, LinkIcon, Mail, MapPin, Package, Pencil, Phone, ShoppingCart, Truck, User, Settings, Edit3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { paymentStatusColors } from '@/lib/badge-style';
import AdminCancelOrderDialog from '@/app/features/orders/components/AdminCancelOrderDialog';
import OrderHistory from '@/app/features/orders/components/OrderHistory';
import Loading from '@/app/admin/orders/[id]/loading';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import CustomerEditForm from '@/app/features/orders/components/CustomerEditForm';
import PaymentEditForm from '@/app/features/orders/components/PaymentEditForm';
import RequestEditForm from '@/app/features/orders/components/RequestEditForm';
import PaymentMethodDetail from '@/app/features/orders/components/PaymentMethodDetail';
import OrderStatusSelect from '@/app/features/orders/components/OrderStatusSelect';

// SWR fetcher
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

//  useSWRInfinite용 getKey (처리 이력)
const LIMIT = 5; // 페이지 당 이력 개수
const getOrderHistoryKey = (orderId?: string) => (pageIndex: number, prev: any) => {
  // orderId가 없으면 요청 중단
  if (!orderId) return null;
  if (prev && prev.history.length === 0) return null;
  return `/api/orders/${orderId}/history?page=${pageIndex + 1}&limit=${LIMIT}`;
};

//  타입 정의 (서버에서 내려받는 주문 정보 형태)
interface OrderDetail {
  _id: string;
  stringingApplicationId?: string;
  status: string;
  date: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    addressDetail: string;
    postalCode?: string;
  };
  shippingInfo: {
    shippingMethod: string;
    estimatedDate: string;
    invoice?: {
      courier: string;
      trackingNumber: string;
    };
    deliveryRequest?: string;
    depositor?: string;
  };
  paymentStatus: string;
  paymentMethod: string;
  paymentBank?: string;
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

  // 편집 모드
  const [isEditMode, setIsEditMode] = useState(false);
  // 카드별 편집 토글
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editingPayment, setEditingPayment] = useState(false);
  const [editingItems, setEditingItems] = useState(false);
  const [editingRequest, setEditingRequest] = useState(false);

  // 주문 전체 데이터를 SWR로 가져옴
  const { data: orderDetail, error: orderError, mutate: mutateOrder } = useSWR<OrderDetail>(orderId ? `/api/orders/${orderId}` : null, fetcher);
  //  처리 이력 데이터를 SWRInfinite로 가져옴. (키: `/api/orders/${orderId}/history?…`)
  const {
    data: historyPages,
    error: historyError,
    mutate: mutateHistory,
  } = useSWRInfinite(getOrderHistoryKey(orderId), fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // local 상태를 두어 "옵티미스틱 업데이트"가 가능하게 적용
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
      showSuccessToast('주문이 취소되었습니다.');
    } catch (err) {
      console.error('[OrderDetailClient] cancel mutate error:', err);
      showErrorToast('취소 후 데이터 갱신 중 오류가 발생했습니다.');
      // 오류 시, 서버에서 받아온 원래 상태로 복원
      if (orderDetail.status !== '취소') {
        setLocalStatus(orderDetail.status);
      }
    }
  };

  const handleShippingUpdate = () => {
    if (['취소', '결제취소'].includes(orderDetail.status)) {
      showErrorToast('취소된 주문은 배송 정보를 수정할 수 없습니다.');
      return;
    }

    router.push(`/admin/orders/${orderId}/shipping-update`);
  };

  return (
    <div className="container py-10 space-y-8">
      <div className="mx-auto max-w-4xl">
        {/* 개선된 관리자 헤더 */}
        <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-8 border border-purple-100 dark:border-purple-800/30 shadow-lg mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-md">
                <Settings className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">주문 관리</h1>
                <p className="mt-1 text-gray-600 dark:text-gray-400">주문 ID: {orderDetail._id}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" size="sm" className="mb-3 bg-white/60 backdrop-blur-sm border-purple-200 hover:bg-purple-50" asChild>
                <Link href="/admin/orders">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  주문 목록으로 돌아가기
                </Link>
              </Button>
              <Button variant={isEditMode ? 'destructive' : 'outline'} size="sm" onClick={() => setIsEditMode(!isEditMode)} className={isEditMode ? '' : 'bg-white/60 backdrop-blur-sm border-purple-200 hover:bg-purple-50'}>
                <Pencil className="mr-1 h-4 w-4" />
                {isEditMode ? '편집 취소' : '편집 모드'}
              </Button>
              <Button onClick={handleShippingUpdate} className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                <Truck className="mr-2 h-4 w-4" />
                배송 정보 업데이트
              </Button>
            </div>
          </div>

          {/* 주문 요약 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">주문 상태</span>
              </div>
              <Badge className={paymentStatusColors[orderDetail.paymentStatus]}>{localStatus}</Badge>
            </div>

            <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">결제 상태</span>
              </div>
              <Badge className={paymentStatusColors[orderDetail.paymentStatus]}>{orderDetail.paymentStatus}</Badge>
            </div>
          </div>
        </div>

        {/* 주문 상태 및 요약 */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden mb-8">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>주문 상태 관리</CardTitle>
              <Badge className={paymentStatusColors[orderDetail.paymentStatus]}>{localStatus}</Badge>
            </div>
            <CardDescription>{formatDate(orderDetail.date)}에 접수된 주문입니다.</CardDescription>
          </CardHeader>
          <CardFooter className="pt-4">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
              <OrderStatusSelect orderId={orderId!} currentStatus={localStatus} />

              {localStatus === '취소' ? (
                <p className="text-sm text-muted-foreground italic mt-2">취소된 주문입니다. 상태 변경 및 취소가 불가능합니다.</p>
              ) : (
                <AdminCancelOrderDialog orderId={orderId!} onCancelSuccess={handleCancelSuccess} key={'cancel-' + allHistory.length} />
              )}
            </div>
          </CardFooter>
          {orderDetail?.stringingApplicationId && (
            <Card className="border border-muted text-sm text-muted-foreground m-4">
              <CardContent className="flex justify-between items-center py-3">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  <span>이 주문은 스트링 장착 서비스 신청서와 연결되어 있습니다.</span>
                </div>
                <Link href={`/admin/applications/stringing/${orderDetail.stringingApplicationId}`}>
                  <Button variant="ghost" size="sm">
                    신청서 보기
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 고객 정보 */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-green-600" />
                  <span>고객 정보</span>
                </div>
                {isEditMode && <Edit3 className="h-4 w-4 text-gray-400" />}
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
                    addressDetail: orderDetail.customer.addressDetail ?? '',
                    postalCode: orderDetail.customer.postalCode || '',
                  }}
                  orderId={orderDetail._id}
                  resourcePath="/api/orders"
                  onSuccess={(updated: any) => {
                    mutateOrder(); // SWR 캐시 갱신
                    mutateHistory();
                    setEditingCustomer(false);
                  }}
                  onCancel={() => setEditingCustomer(false)}
                />
              </CardContent>
            ) : (
              <>
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
                {isEditMode && (
                  <CardFooter className="pt-3 flex justify-center bg-gray-50/50 dark:bg-gray-800/50">
                    <Button variant="outline" size="sm" onClick={() => setEditingCustomer(true)} className="hover:bg-green-50 border-green-200">
                      수정하기
                    </Button>
                  </CardFooter>
                )}
              </>
            )}
          </Card>

          {/* 배송 정보 */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b pb-3">
              <CardTitle className="flex items-center">
                <Truck className="mr-2 h-5 w-5 text-blue-600" />
                배송 정보
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
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                  <span>결제 정보</span>
                </div>
                {isEditMode && <Edit3 className="h-4 w-4 text-gray-400" />}
              </CardTitle>
            </CardHeader>

            {editingPayment ? (
              <CardContent className="p-6">
                <PaymentEditForm
                  initialData={{ total: orderDetail.total }}
                  orderId={orderId}
                  onSuccess={() => {
                    mutateOrder();
                    mutateHistory();
                    setEditingPayment(false);
                  }}
                  onCancel={() => setEditingPayment(false)}
                />
              </CardContent>
            ) : (
              <>
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

                    <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-100 dark:border-purple-800/30">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">결제 금액</p>
                        <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(orderDetail.total)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                {isEditMode && (
                  <CardFooter className="flex justify-center bg-gray-50/50 dark:bg-gray-800/50">
                    <Button variant="outline" size="sm" onClick={() => setEditingPayment(true)} className="hover:bg-purple-50 border-purple-200">
                      수정하기
                    </Button>
                  </CardFooter>
                )}
              </>
            )}
          </Card>

          {/* 주문 항목 */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b pb-3">
              <CardTitle className="flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5 text-orange-600" />
                주문 항목
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {orderDetail.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">수량: {item.quantity}개</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(item.price)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">소계: {formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 배송 요청사항 */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>배송 요청사항</span>
              {isEditMode && <Edit3 className="h-4 w-4 text-gray-400" />}
            </CardTitle>
            <CardDescription>사용자가 결제 시 입력한 배송 관련 요청사항입니다.</CardDescription>
          </CardHeader>
          {editingRequest ? (
            <CardContent className="p-6">
              <RequestEditForm
                initialData={orderDetail.shippingInfo.deliveryRequest || ''}
                orderId={orderId}
                onSuccess={() => {
                  mutateOrder();
                  mutateHistory();
                  setEditingRequest(false);
                }}
                onCancel={() => setEditingRequest(false)}
              />
            </CardContent>
          ) : (
            <>
              <CardContent className="p-6">
                {orderDetail.shippingInfo.deliveryRequest ? (
                  <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{orderDetail.shippingInfo.deliveryRequest}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic">요청사항이 입력되지 않았습니다.</p>
                )}
              </CardContent>
              {isEditMode && (
                <CardFooter className="flex justify-center bg-gray-50/50 dark:bg-gray-800/50">
                  <Button variant="outline" size="sm" onClick={() => setEditingRequest(true)} className="hover:bg-orange-50 border-orange-200">
                    수정하기
                  </Button>
                </CardFooter>
              )}
            </>
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
      </div>
    </div>
  );
}
