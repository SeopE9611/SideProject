'use client';

import CustomerEditForm from '@/app/features/orders/components/CustomerEditForm';
import OrderHistory from '@/app/features/orders/components/OrderHistory';
import { OrderStatusBadge } from '@/app/features/orders/components/OrderStatusBadge';
import OrderDetailSkeleton from '@/app/mypage/orders/_components/OrderDetailSkeleton';
import PaymentMethodDetail from '@/app/mypage/orders/_components/PaymentMethodDetail';
import RequestEditForm from '@/app/mypage/orders/_components/RequestEditForm';
import SiteContainer from '@/components/layout/SiteContainer';
import OrderReviewCTA from '@/components/reviews/OrderReviewCTA';
import ServiceReviewCTA from '@/components/reviews/ServiceReviewCTA';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { badgeBase, badgeSizeSm, paymentStatusColors } from '@/lib/badge-style';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, CheckCircle, Clock, CreditCard, Mail, MapPin, Pencil, Phone, ShoppingCart, Truck, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR, { mutate } from 'swr';
import useSWRInfinite from 'swr/infinite';
import CancelOrderDialog from './CancelOrderDialog'; // 기존 다이얼로그 그대로 사용

// SWR Infinite용 getKey (처리 이력 페이지네이션)
const LIMIT = 5;
const getOrderHistoryKey = (orderId?: string) => (pageIndex: number, prev: any) => {
  // orderId가 없으면 요청 중단
  if (!orderId) return null;
  if (prev && prev.history.length === 0) return null;
  return `/api/orders/${orderId}/history?page=${pageIndex + 1}&limit=${LIMIT}`;
};

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string | null;
  mountingFee?: number; // 장착 서비스 대상 스트링이면 서버에서 내려오는 필드 (없으면 undefined)
}

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
  items: OrderItem[];
  history: Array<any>;
  cancelReason?: string;
  cancelReasonDetail?: string;
  isStringServiceApplied?: boolean;
  stringingApplicationId?: string;

  stringService?: {
    totalSlots?: number | null;
    usedSlots?: number | null;
    remainingSlots?: number | null;
  } | null;
  stringingApplications?: {
    id: string;
    status: string;
    createdAt?: string | null;
    racketCount?: number;
  }[];
}
interface Props {
  orderId: string;
}

// 주문 취소 요청 상태 텍스트를 계산하는 헬퍼
function getCancelRequestLabel(order: any): string | null {
  const cancel = order?.cancelRequest;
  if (!cancel || !cancel.status || cancel.status === 'none') return null;

  switch (cancel.status) {
    case 'requested':
      return '취소 요청 처리 중입니다. 관리자 확인 후 결과가 반영됩니다.';
    case 'approved':
      // 보통 status === '취소'랑 함께 가겠지만, 혹시 모를 비동기 어긋남에 대비해서 안내
      return '취소 요청이 승인되어 주문이 취소되었습니다.';
    case 'rejected':
      return '취소 요청이 거절되었습니다. 상세 사유는 관리자에게 문의해주세요.';
    default:
      return null;
  }
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

  // 취소 철회 로딩
  const [isWithdrawingCancelRequest, setIsWithdrawingCancelRequest] = useState(false);

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
  // quantity 기반으로 총 '장착 서비스 대상 스트링 수량' 계산
  const stringServiceItemCount = (orderDetail.items ?? []).filter((item) => item.mountingFee != null && item.mountingFee > 0).reduce((sum, item) => sum + (item.quantity ?? 1), 0);

  // remainingSlots 파생값
  const totalSlots = orderDetail.stringService?.totalSlots ?? stringServiceItemCount;
  const usedSlots = orderDetail.stringService?.usedSlots ?? totalSlots - (orderDetail.stringService?.remainingSlots ?? 0);
  const remainingSlots = orderDetail.stringService?.remainingSlots ?? Math.max(totalSlots - usedSlots, 0);

  // 이 주문과 연결된 신청서 요약 리스트
  const linkedStringingApps = orderDetail?.stringingApplications ?? [];
  const hasLinkedStringingApps = linkedStringingApps.length > 0;
  const hasSubmittedStringingApplication = hasLinkedStringingApps || Boolean(orderDetail?.stringingApplicationId) || orderDetail?.isStringServiceApplied === true;

  // 리뷰/링크에 사용할 대표 신청 ID
  // - 우선순위: 기존 필드(stringingApplicationId) → 요약 리스트의 첫 번째 신청
  const primaryStringingAppId = orderDetail?.stringingApplicationId ?? (hasLinkedStringingApps ? linkedStringingApps[0].id : undefined);

  // 취소 요청 상태/라벨 계산
  const cancelLabel = getCancelRequestLabel(orderDetail);
  const cancelStatus = (orderDetail as any)?.cancelRequest?.status;
  const canWithdrawCancelRequest = cancelStatus === 'requested';

  // 상세 헤더에서 "주문 취소 요청" 버튼을 보여줄 수 있는 상태인지 판단
  // - 대기중 / 결제완료 상태에서만 가능
  // - 이미 요청 중(requested)이면 새 요청 버튼 대신 "취소 철회" 배너를 보여주므로 숨김
  // - rejected 는 다시 요청 가능하게 유지
  const canShowCancelButton = ['대기중', '결제완료'].includes(orderDetail.status) && (!cancelStatus || cancelStatus === 'none' || cancelStatus === 'rejected');

  const handleWithdrawCancelRequest = async () => {
    if (!orderDetail?._id) return;

    if (!window.confirm('이미 제출한 취소 요청을 취소하시겠습니까?')) {
      return;
    }

    try {
      setIsWithdrawingCancelRequest(true);

      const res = await fetch(`/api/orders/${orderDetail._id}/cancel-request-withdraw`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const message = await res.text().catch(() => '');
        throw new Error(message || '취소 요청을 취소하는 중 오류가 발생했습니다.');
      }

      // SWR 캐시 갱신: 상태, 이력, 마이페이지 목록, 상세 모두 재검증
      await Promise.all([
        mutate(`/api/orders/${orderDetail._id}/status`, undefined, { revalidate: true }),
        mutate(`/api/orders/${orderDetail._id}/history`, undefined, { revalidate: true }),
        mutate('/api/users/me/orders', undefined, { revalidate: true }),
        mutate(`/api/orders/${orderDetail._id}`, undefined, { revalidate: true }),
      ]);

      // UX는 프로젝트 기존 패턴에 맞게 토스트/alert 중 하나 사용
      alert('취소 요청이 정상적으로 취소되었습니다.');
    } catch (err) {
      console.error(err);
      alert((err as Error).message || '취소 요청을 취소하는 중 오류가 발생했습니다.');
    } finally {
      setIsWithdrawingCancelRequest(false);
    }
  };

  return (
    <main className="w-full">
      <SiteContainer variant="wide" className="py-4 bp-sm:py-6 space-y-6 bp-sm:space-y-8">
        <div className="bg-muted/30 rounded-2xl p-8 border border-border shadow-lg">
          {/* 헤더: 제목과 액션 버튼 */}
          <div className="flex flex-col bp-md:flex-row bp-md:items-center bp-md:justify-between gap-4 bp-md:gap-6">
            {/* 제목 섹션 */}
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <div className="bg-card rounded-full p-3 shadow-md shrink-0">
                <ShoppingCart className="h-8 w-8 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl bp-sm:text-3xl font-bold text-foreground">주문 상세정보</h1>
                <p className="text-muted-foreground mt-1 break-all text-sm">주문번호: {orderId}</p>
              </div>
            </div>

            {/* 액션 버튼 섹션 */}
            <div className="flex flex-wrap gap-2 shrink-0 bp-md:justify-end">
              <Button variant="outline" size="sm" onClick={() => router.push('/mypage?tab=orders')} className="bg-card/70 backdrop-blur-sm border-border hover:bg-primary/10 dark:hover:bg-primary/20">
                <ArrowLeft className="mr-2 h-4 w-4" />
                주문 목록으로 돌아가기
              </Button>

              <Button
                variant={isEditMode ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setIsEditMode((m) => !m)}
                disabled={!canUserEdit}
                className={cn(isEditMode ? '' : 'bg-card/70 backdrop-blur-sm border-border hover:bg-primary/10 dark:hover:bg-primary/20')}
              >
                <Pencil className="mr-1 h-4 w-4" />
                {isEditMode ? '편집 종료' : '편집 모드'}
              </Button>

              {canShowCancelButton && (
                <CancelOrderDialog orderId={orderDetail._id.toString()}>
                  <Button variant="destructive" size="sm">
                    주문 취소 요청
                  </Button>
                </CancelOrderDialog>
              )}
            </div>
          </div>

          {/* 주문 상태 및 요약 섹션 */}
          <div className="mt-8">
            <div className="grid grid-cols-1 bp-md:grid-cols-3 gap-6">
              <div className="bg-card/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">주문일시</span>
                </div>
                <p className="text-lg font-semibold text-foreground">{formatDate(orderDetail.date)}</p>
              </div>

              <div className="bg-card/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">총 결제금액</span>
                </div>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(orderDetail.total)}</p>
              </div>

              <div className="bg-card/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">주문 상태</span>
                </div>
                <OrderStatusBadge orderId={orderId} initialStatus={orderDetail.status} />
              </div>
            </div>
          </div>
        </div>
        {/* 취소 요청 상태 안내 배너 */}
        {cancelLabel && (
          <div className="mb-4 flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">
            <span className="min-w-0 break-words">{cancelLabel}</span>

            {canWithdrawCancelRequest && (
              <Button size="sm" variant="outline" onClick={handleWithdrawCancelRequest} disabled={isWithdrawingCancelRequest} className="w-full bp-sm:w-auto bp-sm:ml-4 border-border bg-card/70 text-primary hover:bg-muted hover:text-primary">
                {isWithdrawingCancelRequest ? '취소 철회 중...' : '취소 철회하기'}
              </Button>
            )}
          </div>
        )}
        {orderDetail.shippingInfo?.withStringService && (
          <>
            {totalSlots > 0 && remainingSlots > 0 ? (
              <div className="bg-muted/30 border border-border rounded-xl p-6 shadow-lg">
                <div className="flex flex-col gap-4 bp-md:flex-row bp-md:items-center bp-md:justify-between">
                  <div className="flex items-start bp-sm:items-center space-x-3 min-w-0">
                    <div className="bg-warning/10 dark:bg-warning/15 rounded-full p-2">
                      <CheckCircle className="h-6 w-6 text-warning" />
                    </div>
                    <div>
                      <p className="font-semibold text-warning">이 주문은 스트링 장착 서비스가 포함되어 있습니다.</p>
                      <p className="text-sm text-warning">
                        총 {totalSlots}개 중 <strong>{usedSlots}</strong>개를 사용했으며, 남은 교체 가능 스트링은 <strong>{remainingSlots}</strong>개입니다.
                      </p>
                      {stringServiceItemCount > 1 && <p className="mt-1 text-xs text-warning">(상품 기준으로는 교체 서비스 대상 스트링이 {stringServiceItemCount}개 포함되어 있습니다.)</p>}
                      {hasSubmittedStringingApplication && (
                        <p className="mt-1 text-xs text-warning">
                          이미 교체 서비스 접수가 완료된 주문이며, 남은 대상에 한해 추가 신청이 가능합니다.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-center bp-md:justify-end">
                    <Link className="w-full bp-sm:max-w-xs bp-md:w-auto" href={`/services/apply?orderId=${orderDetail._id}`}>
                      <Button variant="default" className="w-full shadow-lg">
                        {hasSubmittedStringingApplication ? '스트링 장착 서비스 추가 신청하기' : '스트링 장착 서비스 신청하기'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : totalSlots > 0 ? (
              <div className="bg-success/10 dark:bg-success/15 border border-border rounded-xl p-6 shadow-lg mt-4">
                <div className="flex flex-col bp-md:flex-row bp-md:items-start bp-md:justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-success/10 dark:bg-success/15 rounded-full p-2 mt-1">
                      <CheckCircle className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold text-success">이 주문으로 교체 서비스 신청이 완료되었습니다.</p>
                      <p className="text-sm text-success">
                        이 주문에는 교체 서비스 대상 스트링이 <span className="font-semibold">{stringServiceItemCount}개</span> 포함되어 있습니다.
                      </p>
                      <p className="text-sm text-success">실제 신청에 포함된 개수와 라켓 정보는 신청 상세 화면에서 확인하실 수 있습니다.</p>

                      {/* 연결된 신청 리스트 간단 요약 */}
                      {hasLinkedStringingApps && (
                        <div className="mt-3 space-y-1 text-xs text-success">
                          {linkedStringingApps.map((app) => (
                            <div key={app.id} className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded-full bg-success/10 dark:bg-success/15 text-[11px] font-medium">{app.status ?? '상태 미정'}</span>
                                {app.createdAt && <span>{formatDate(app.createdAt)}</span>}
                                <span>라켓 {app.racketCount ?? 0}개</span>
                              </div>
                              <Link className="w-full bp-sm:w-auto" href={`/mypage?tab=applications&applicationId=${app.id}`}>
                                <Button variant="outline" className="h-7 px-2 text-xs">
                                  신청 상세
                                </Button>
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* [호환용] 리스트가 없고, 대표 신청 ID만 있는 경우 단일 버튼 유지 */}
                    {!hasLinkedStringingApps && primaryStringingAppId && (
                      <Link className="w-full bp-sm:w-auto" href={`/mypage?tab=applications&applicationId=${primaryStringingAppId}`}>
                        <Button variant="outline" className="border-border text-success dark:border-border dark:text-success dark:hover:bg-success/15 bg-transparent">
                          신청 상세 보기
                        </Button>
                      </Link>
                    )}

                    {primaryStringingAppId && <ServiceReviewCTA applicationId={primaryStringingAppId} className="ml-2" />}
                  </div>
                </div>
              </div>
            ) : null}

            <div id="reviews-cta" className="mt-4">
              {allReviewed ? (
                <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 p-6 shadow-sm dark:bg-primary/20">
                  <div className="flex items-center gap-3 text-primary">
                    <CheckCircle className="h-6 w-6" />
                    <div>
                      <p className="font-semibold text-foreground">이 주문은 리뷰를 작성하였습니다.</p>
                      <p className="text-sm text-foreground">내가 작성한 리뷰를 확인할 수 있어요.</p>
                    </div>
                  </div>
                  <Link className="w-full bp-sm:w-auto" href="/mypage?tab=reviews">
                    <Button variant="outline" className="border-border hover:bg-primary/10 dark:hover:bg-primary/20">
                      리뷰 관리로 이동
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="bg-warning/10 dark:bg-warning/15 border border-border rounded-xl p-6 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-warning" />
                    <div>
                      <p className="font-semibold text-warning">이 주문은 리뷰를 작성하지 않았습니다.</p>
                      <p className="text-sm text-warning">아래 ‘리뷰 작성하기’를 눌러 상품별로 리뷰를 남겨주세요.</p>
                      <p className="text-sm text-destructive">※상품이 정상적으로 '배송완료' 처리가 되면 [리뷰 작성] 버튼이 나타납니다.</p>
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

        <div className="grid gap-8 bp-lg:grid-cols-2">
          {/* 고객 정보 */}
          <Card variant="elevatedGradient">
            <CardHeader variant="sectionGradient">
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <span>내 정보</span>
              </CardTitle>
            </CardHeader>
            {editingCustomer ? (
              <CardContent className="p-4 bp-sm:p-6">
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
              <CardContent className="p-4 bp-sm:p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">이름</p>
                      <p className="font-semibold text-foreground">{orderDetail.customer.name ?? '이름 없음'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">이메일</p>
                      <p className="font-semibold text-foreground">{orderDetail.customer.email ?? '이메일 없음'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">전화번호</p>
                      <p className="font-semibold text-foreground">{orderDetail.customer.phone ?? '전화번호 없음'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">주소</p>
                      <p className="font-semibold text-foreground">{orderDetail.customer.address ?? '주소 없음'}</p>
                      {orderDetail.customer.addressDetail && <p className="text-sm text-muted-foreground mt-1">{orderDetail.customer.addressDetail}</p>}
                      {orderDetail.customer.postalCode && <p className="text-sm text-muted-foreground">우편번호: {orderDetail.customer.postalCode}</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
            {isEditMode && canUserEdit && !editingCustomer && (
              <CardFooter className="pt-3 flex justify-center bg-muted/50">
                <Button size="sm" variant="outline" onClick={() => setEditingCustomer(true)} className="hover:bg-primary/10 dark:hover:bg-primary/20 border-border">
                  고객정보 수정
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* 배송 정보 */}
          <Card variant="elevatedGradient">
            <CardHeader variant="sectionGradient">
              <CardTitle className="flex items-center space-x-2">
                <Truck className="h-5 w-5 text-success" />
                <span>배송 정보</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 bp-sm:p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">배송 방법</p>
                    <p className="font-semibold text-foreground">
                      {{
                        delivery: '택배 배송',
                        quick: '퀵 배송 (당일)',
                        visit: '방문 수령',
                      }[orderDetail.shippingInfo.shippingMethod] || '정보 없음'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">예상 수령일</p>
                    <p className="font-semibold text-foreground">{formatDate(orderDetail.shippingInfo.estimatedDate)}</p>
                  </div>
                </div>

                {orderDetail.shippingInfo.invoice?.trackingNumber && (
                  <>
                    <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">택배사</p>
                        <p className="font-semibold text-foreground">
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
                    <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">운송장 번호</p>
                        <p className="font-semibold text-foreground">{orderDetail.shippingInfo.invoice.trackingNumber}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 결제 정보 */}
          <Card variant="elevatedGradient">
            <CardHeader variant="sectionGradient">
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-foreground" />
                <span>결제 정보</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 bp-sm:p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">결제 상태</p>
                    <Badge className={cn(badgeBase, badgeSizeSm, paymentStatusColors[orderDetail.paymentStatus])}>{orderDetail.paymentStatus}</Badge>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <PaymentMethodDetail method={orderDetail.paymentMethod || '무통장입금'} bankKey={orderDetail.paymentBank} depositor={orderDetail.shippingInfo?.depositor} />
                </div>

                <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">결제 금액</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(orderDetail.total)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 주문 항목 */}
          <Card variant="elevatedGradient">
            <CardHeader variant="sectionGradient">
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5 text-warning" />
                <span>주문 항목</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 bp-sm:p-6">
              <div className="space-y-4">
                {orderDetail.items.map((item, idx) => (
                  <div key={idx} className="flex items-center p-4 bg-muted rounded-xl hover:bg-muted dark:hover:bg-card transition-colors space-x-4">
                    {/* 상품 썸네일 */}
                    {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded" />}

                    {/* 상품명 + 수량 */}
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">수량: {item.quantity}개</p>
                    </div>

                    {/* 가격 및 소계 */}
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatCurrency(item.price)}</p>
                      <p className="text-sm text-muted-foreground">소계: {formatCurrency(item.price * item.quantity)}</p>
                      <div className="mt-2">
                        {canShowReviewCTA &&
                          (reviewedMap[item.id] ? (
                            <Link className="w-full bp-sm:w-auto" href={`/products/${item.id}?tab=reviews`}>
                              <Button size="sm" variant="secondary">
                                리뷰 상세보기
                              </Button>
                            </Link>
                          ) : (
                            <Link className="w-full bp-sm:w-auto" href={`/reviews/write?productId=${item.id}&orderId=${orderDetail._id}`}>
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
        <Card variant="elevatedGradient">
          <CardHeader variant="sectionGradient">
            <CardTitle>배송 요청사항</CardTitle>
            <CardDescription>사용자가 결제 시 입력한 배송 관련 요청사항입니다.</CardDescription>
          </CardHeader>
          {editingRequest ? (
            <CardContent className="p-4 bp-sm:p-6">
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
            <CardContent className="p-4 bp-sm:p-6">
              {orderDetail.shippingInfo.deliveryRequest ? (
                <div className="bg-warning/10 dark:bg-warning/15 border border-border rounded-lg p-4">
                  <p className="text-foreground whitespace-pre-line">{orderDetail.shippingInfo.deliveryRequest}</p>
                </div>
              ) : (
                <p className="text-muted-foreground italic">요청사항이 입력되지 않았습니다.</p>
              )}
            </CardContent>
          )}
          {isEditMode && canUserEdit && !editingRequest && (
            <CardFooter className="flex justify-center bg-muted/50">
              <Button size="sm" variant="outline" onClick={() => setEditingRequest(true)} className="hover:bg-warning/10 dark:hover:bg-warning/15 border-border">
                요청사항 수정
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* 처리 이력 */}
        <OrderHistory orderId={orderId} />
      </SiteContainer>
    </main>
  );
}
