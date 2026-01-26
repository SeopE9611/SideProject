'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, CreditCard, LinkIcon, Mail, MapPin, Package, Pencil, Phone, ShoppingCart, Truck, User, Settings, Edit3, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { badgeBase, badgeSizeSm, orderStatusColors, paymentStatusColors } from '@/lib/badge-style';
import AdminCancelOrderDialog from '@/app/features/orders/components/AdminCancelOrderDialog';
import OrderHistory from '@/app/features/orders/components/OrderHistory';
import Loading from '@/app/admin/orders/[id]/loading';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import CustomerEditForm from '@/app/features/orders/components/CustomerEditForm';
import PaymentEditForm from '@/app/features/orders/components/PaymentEditForm';
import RequestEditForm from '@/app/features/orders/components/RequestEditForm';
import PaymentMethodDetail from '@/app/features/orders/components/PaymentMethodDetail';
import OrderStatusSelect from '@/app/features/orders/components/OrderStatusSelect';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import LinkedDocsCard, { LinkedDocItem } from '@/components/admin/LinkedDocsCard';

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
  stringService?: {
    hasStringService: boolean; // 이 주문에 스트링 서비스(패키지/신청 연결)가 있는지
    totalSlots?: number | null; // 패키지 전체 횟수
    usedSlots?: number | null; // 지금까지 사용한 횟수
    remainingSlots?: number | null; // 남은 횟수
    passTitle?: string | null; // (있다면) 패키지 이름
    note?: string | null; // (선택) 설명/메모용
  } | null;
  // 이 주문과 연결된 모든 스트링 신청서 요약 리스트
  stringingApplications?: {
    id: string;
    status: string;
    createdAt?: string | null;
    racketCount?: number;
  }[];
}

// 관리자용 취소 요청 상태 정보 헬퍼
function getAdminCancelRequestInfo(order: any): {
  label: string;
  badge: string;
  reason?: string;
} | null {
  const cancel = order?.cancelRequest;
  if (!cancel || !cancel.status || cancel.status === 'none') return null;

  const reasonSummary = cancel.reasonCode ? `${cancel.reasonCode}${cancel.reasonText ? ` (${cancel.reasonText})` : ''}` : cancel.reasonText || '';

  switch (cancel.status) {
    case 'requested':
      return {
        label: '고객이 주문 취소를 요청했습니다.',
        badge: '요청됨',
        reason: reasonSummary,
      };
    case 'approved':
      return {
        label: '취소 요청이 승인되어 주문이 취소되었습니다.',
        badge: '승인',
        reason: reasonSummary,
      };
    case 'rejected':
      return {
        label: '취소 요청이 거절되었습니다.',
        badge: '거절',
        reason: reasonSummary,
      };
    default:
      return null;
  }
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

  const [isProcessingCancelRequest, setIsProcessingCancelRequest] = useState(false);

  //  구매확정 처리 중(중복 클릭 방지)
  const [isConfirmingPurchase, setIsConfirmingPurchase] = useState(false);

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

  // remainingSlots 값을 안전하게 읽어오는 파생값
  const remainingSlots = orderDetail?.stringService?.remainingSlots ?? 0;
  const totalSlots = orderDetail?.stringService?.totalSlots ?? 0;
  const usedSlots = orderDetail?.stringService?.usedSlots ?? 0;

  // 취소 요청 상태 정보 계산
  const cancelInfo = getAdminCancelRequestInfo(orderDetail);

  // 실제 cancelRequest.status 를 보고 "요청됨" 상태인지 여부
  const cancelStatus = (orderDetail as any).cancelRequest?.status ?? 'none';
  const isCancelRequested = cancelStatus === 'requested';

  // 상태 판정은 boolean으로 분리 (조건/disabled/tooltip에서 안정적으로 사용)
  const isDelivered = localStatus === '배송완료';
  const isConfirmed = localStatus === '구매확정';
  const isCanceled = ['취소', '결제취소', '환불'].includes(localStatus);

  //  연결된 교체서비스 신청서 ID(있다면 최신 1개를 우선 사용)
  // - 주문 + 교체서비스가 묶인 케이스에서는 운송장/배송정보를 '신청서'에서 단일 관리하도록 통일.
  const linkedStringingAppId = (() => {
    const list = Array.isArray(orderDetail.stringingApplications) ? orderDetail.stringingApplications : [];
    const latest = list.filter((a) => a?.id).sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0]?.id;

    return latest ?? orderDetail.stringingApplicationId ?? null;
  })();
  const isShippingManagedByApplication = Boolean(linkedStringingAppId);

  /**
   *  구매확정(관리자 화면에서 처리 버튼)
   * - 서버(/api/orders/[id]/confirm)가 관리자 세션에서도 허용되어 있어야 정상 동작합니다.
   * - 성공 시: 상태를 '구매확정'으로 반영 + 주문/이력 재조회
   */
  const handleConfirmPurchase = async () => {
    if (!orderId) return;
    if (isConfirmingPurchase) return;

    const ok = window.confirm('구매확정을 진행하시겠습니까?\n\n- 배송완료 이후에만 확정할 수 있습니다.\n- 확정 후에는 되돌릴 수 없습니다.');
    if (!ok) return;

    try {
      setIsConfirmingPurchase(true);

      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.message || '구매확정 처리 중 오류가 발생했습니다.';
        showErrorToast(msg);
        return;
      }

      // 이미 확정된 케이스도 서버 응답 기준으로 토스트 처리
      if (data?.alreadyConfirmed) showSuccessToast('이미 구매확정된 주문입니다.');
      else showSuccessToast('구매확정이 완료되었습니다.');

      // 화면 즉시 반영(옵티미스틱) + 최신 데이터 재조회
      setLocalStatus('구매확정');
      await mutateOrder();
      await mutateHistory();
    } catch (e) {
      console.error(e);
      showErrorToast('구매확정 처리 중 오류가 발생했습니다.');
    } finally {
      setIsConfirmingPurchase(false);
    }
  };

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

  // 연결 문서(표시용) 구성: 신청서(복수) 우선, 없으면 레거시 단일 필드 사용
  // - 핵심: “연결/통합”을 운영자가 한눈에 파악하도록, 상세 화면에서도 공용 카드로 통일
  const linkedDocs: LinkedDocItem[] = (() => {
    const docs: LinkedDocItem[] = [];
    const apps = Array.isArray(orderDetail.stringingApplications) ? orderDetail.stringingApplications : [];

    if (apps.length > 0) {
      for (const app of apps) {
        if (!app?.id) continue;
        const parts: string[] = [];
        if (app.status) parts.push(`상태: ${app.status}`);
        if (app.createdAt) parts.push(formatDate(app.createdAt));
        parts.push(`라켓 ${app.racketCount ?? 0}개`);
        docs.push({
          kind: 'stringing_application',
          id: app.id,
          href: `/admin/applications/stringing/${app.id}`,
          subtitle: parts.filter(Boolean).join(' · ') || undefined,
        });
      }
      return docs;
    }

    if (orderDetail.stringingApplicationId) {
      docs.push({
        kind: 'stringing_application',
        id: orderDetail.stringingApplicationId,
        href: `/admin/applications/stringing/${orderDetail.stringingApplicationId}`,
      });
    }

    return docs;
  })();

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

  // 🔹 (추가) "취소 요청 승인" 버튼 클릭 시
  const handleApproveCancelRequest = async () => {
    if (!orderId) return;

    const ok = window.confirm('이 주문의 취소 요청을 승인하시겠습니까?\n주문과 연결된 모든 교체 서비스 신청이 함께 취소됩니다.');
    if (!ok) return;

    setIsProcessingCancelRequest(true);
    try {
      const existingReq: any = (orderDetail as any).cancelRequest ?? {};

      const res = await fetch(`/api/orders/${orderId}/cancel-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          // 고객이 요청할 때 저장된 reasonCode / reasonText 를 그대로 넘겨줌
          reasonCode: existingReq.reasonCode,
          reasonText: existingReq.reasonText,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || '취소 승인 실패');
      }

      // 서버에서 주문/신청/패키지 복원 처리 후 최신 상태로 갱신
      await mutateOrder();
      await mutateHistory();
      setLocalStatus('취소');
      showSuccessToast('주문 취소 요청을 승인했습니다.');
    } catch (err: any) {
      console.error(err);
      showErrorToast(err?.message || '취소 승인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessingCancelRequest(false);
    }
  };

  // 🔹 (추가) "취소 요청 거절" 버튼 클릭 시
  const handleRejectCancelRequest = async () => {
    if (!orderId) return;

    const adminMemo = window.prompt('취소 요청 거절 사유를 입력하세요.\n(선택 입력, 비워두면 사유 없이 기록됩니다.)') ?? '';

    const ok = window.confirm('이 주문의 취소 요청을 거절하시겠습니까?');
    if (!ok) return;

    setIsProcessingCancelRequest(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          adminMemo: adminMemo.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || '취소 거절 실패');
      }

      await mutateOrder();
      await mutateHistory();
      showSuccessToast('주문 취소 요청을 거절했습니다.');
    } catch (err: any) {
      console.error(err);
      showErrorToast(err?.message || '취소 거절 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessingCancelRequest(false);
    }
  };

  const handleShippingUpdate = () => {
    if (isCanceled) {
      showErrorToast('취소된 주문은 배송 정보를 수정할 수 없습니다.');
      return;
    }

    // 연결 주문(주문 + 교체서비스 신청서)인 경우:
    // 배송정보/운송장은 신청서에서 단일 관리 → 신청서 배송등록 페이지로 이동
    if (isShippingManagedByApplication && linkedStringingAppId) {
      showSuccessToast('이 주문은 교체서비스 신청서와 연결되어 있어 배송 정보는 신청서에서 관리합니다.');
      router.push(`/admin/applications/stringing/${linkedStringingAppId}/shipping-update`);
      return;
    }

    router.push(`/admin/orders/${orderId}/shipping-update`);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50
                  dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-black"
    >
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
                <Button
                  variant="outline"
                  size="sm"
                  className="mb-3 bg-white/60 backdrop-blur-sm border-purple-200 hover:bg-purple-50
             dark:bg-slate-800/60 dark:border-slate-700 dark:hover:bg-slate-700/60"
                  asChild
                >
                  <Link href="/admin/orders">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    주문 목록으로 돌아가기
                  </Link>
                </Button>
                <Button
                  variant={isEditMode ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={
                    isEditMode
                      ? ''
                      : 'bg-white/60 backdrop-blur-sm border-purple-200 hover:bg-purple-50 \
         dark:bg-slate-800/60 dark:border-slate-700 dark:hover:bg-slate-700/60'
                  }
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  {isEditMode ? '편집 취소' : '편집 모드'}
                </Button>
                <Button onClick={handleShippingUpdate} className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                  <Truck className="mr-2 h-4 w-4" />
                  {isShippingManagedByApplication ? '신청서 배송 정보 관리' : '배송 정보 업데이트'}
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
                <Badge className={cn(badgeBase, badgeSizeSm, orderStatusColors[localStatus] ?? 'bg-slate-500/10 text-slate-500')}>{localStatus}</Badge>
              </div>

              <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">결제 상태</span>
                </div>
                <Badge className={cn(badgeBase, badgeSizeSm, paymentStatusColors[orderDetail.paymentStatus])}>{orderDetail.paymentStatus}</Badge>
              </div>
            </div>
            {/* 취소 요청 상태 안내 (관리자용) */}
            {cancelInfo && (
              <div className="mt-4 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-amber-900">취소 요청 상태: {cancelInfo.badge}</p>
                    <p className="mt-1">{cancelInfo.label}</p>
                    {cancelInfo.reason && <p className="mt-1 text-xs text-amber-900/80">사유: {cancelInfo.reason}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 주문 상태 및 요약 */}
          <Card
            className="border-0 shadow-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60
                 bg-gradient-to-br from-white to-gray-50/50
                 dark:from-slate-900 dark:to-slate-800/60 overflow-hidden mb-8"
          >
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>주문 상태 관리</CardTitle>
                <Badge className={cn(badgeBase, badgeSizeSm, orderStatusColors[localStatus] ?? 'bg-slate-500/10 text-slate-500')}>{localStatus}</Badge>
              </div>
              <CardDescription>{formatDate(orderDetail.date)}에 접수된 주문입니다.</CardDescription>
            </CardHeader>
            <CardFooter className="pt-4">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <OrderStatusSelect orderId={orderId!} currentStatus={localStatus} />

                  {/* 구매확정 버튼 (배송완료 전/확정 후/취소 주문은 disabled + tooltip) */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700 dark:hover:border-emerald-600 dark:hover:bg-emerald-950 bg-transparent"
                            disabled={isCanceled || !isDelivered || isConfirmed || isConfirmingPurchase}
                            onClick={handleConfirmPurchase}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            {isConfirmingPurchase ? '확정 중…' : isConfirmed ? '구매확정 완료' : '구매확정'}
                          </Button>
                        </span>
                      </TooltipTrigger>

                      {isCanceled ? (
                        <TooltipContent side="top" className="text-sm">
                          취소/환불된 주문은 구매확정할 수 없습니다.
                        </TooltipContent>
                      ) : isConfirmed ? (
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
                </div>

                {localStatus === '취소' ? (
                  <p className="text-sm text-muted-foreground italic mt-2">취소된 주문입니다. 상태 변경 및 취소가 불가능합니다.</p>
                ) : isCancelRequested ? (
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <Button size="sm" variant="destructive" onClick={handleApproveCancelRequest} disabled={isProcessingCancelRequest}>
                      취소 승인
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleRejectCancelRequest} disabled={isProcessingCancelRequest}>
                      취소 거절
                    </Button>
                  </div>
                ) : (
                  <AdminCancelOrderDialog orderId={orderId!} onCancelSuccess={handleCancelSuccess} key={'cancel-' + allHistory.length} />
                )}
              </div>
            </CardFooter>

            {/* 연결 문서(공용 카드) */}
            {linkedDocs.length > 0 && (
              <div className="m-4">
                <LinkedDocsCard
                  docs={linkedDocs}
                  description={
                    totalSlots > 0
                      ? `이 주문은 교체서비스 신청서와 연결되어 있습니다. · 총 ${totalSlots}회 중 ${usedSlots}회 사용 · 남은 ${remainingSlots}회`
                      : '이 주문은 교체서비스 신청서와 연결되어 있습니다. 배송/운송장 정보는 신청서에서 단일 관리합니다.'
                  }
                />
              </div>
            )}
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* 고객 정보 */}
            <Card
              className="border-0 shadow-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60
                 bg-gradient-to-br from-white to-gray-50/50
                 dark:from-slate-900 dark:to-slate-800/60 overflow-hidden"
            >
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
                      <div
                        className="flex items-center space-x-3 p-3
                bg-gray-50 dark:bg-slate-800/70 rounded-lg
                border border-gray-100 dark:border-slate-700/60"
                      >
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">이름</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{orderDetail.customer.name ?? '이름 없음'}</p>
                        </div>
                      </div>

                      <div
                        className="flex items-center space-x-3 p-3
                bg-gray-50 dark:bg-slate-800/70 rounded-lg
                border border-gray-100 dark:border-slate-700/60"
                      >
                        <Mail className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">이메일</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{orderDetail.customer.email ?? '이메일 없음'}</p>
                        </div>
                      </div>

                      <div
                        className="flex items-center space-x-3 p-3
                bg-gray-50 dark:bg-slate-800/70 rounded-lg
                border border-gray-100 dark:border-slate-700/60"
                      >
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
            <Card
              className="border-0 shadow-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60
                 bg-gradient-to-br from-white to-gray-50/50
                 dark:from-slate-900 dark:to-slate-800/60 overflow-hidden"
            >
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b pb-3">
                <CardTitle className="flex items-center">
                  <Truck className="mr-2 h-5 w-5 text-blue-600" />
                  배송 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isShippingManagedByApplication && linkedStringingAppId ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-100">
                    <div className="flex items-start gap-2">
                      <LinkIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="space-y-2">
                        <p className="font-medium">이 주문은 교체서비스 신청서와 연결되어 있어 배송 정보는 신청서에서 관리합니다.</p> 
                        <div className="flex items-center space-x-3 p-3 bg-white/60 dark:bg-slate-900/30 rounded-lg border border-blue-200/60 dark:border-blue-800/40">
                          <Truck className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-sm text-blue-800/80 dark:text-blue-200/80">주문 시 선택한 수령 방식</p>
                            <p className="font-semibold text-blue-950 dark:text-blue-50">
                              {{
                                delivery: '택배 배송',
                                quick: '퀵 배송 (당일)',
                                visit: '방문 수령',
                              }[orderDetail.shippingInfo.shippingMethod] || '정보 없음'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" className="bg-transparent" asChild>
                            <Link href={`/admin/applications/stringing/${linkedStringingAppId}`}>신청서 상세 보기</Link>
                          </Button>

                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                            onClick={() => router.push(`/admin/applications/stringing/${linkedStringingAppId}/shipping-update`)}
                          >
                            <Truck className="mr-2 h-4 w-4" />
                            배송 정보 등록/수정
                          </Button>
                        </div>

                        <p className="text-xs text-blue-700 dark:text-blue-200/80">주문(상품) 쪽 운송장/배송정보는 혼선을 방지하기 위해 사용하지 않습니다.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div
                      className="flex items-center space-x-3 p-3
                  bg-gray-50 dark:bg-slate-800/70 rounded-lg
                  border border-gray-100 dark:border-slate-700/60"
                    >
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

                    <div
                      className="flex items-center space-x-3 p-3
                  bg-gray-50 dark:bg-slate-800/70 rounded-lg
                  border border-gray-100 dark:border-slate-700/60"
                    >
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">예상 수령일</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDate(orderDetail.shippingInfo.estimatedDate)}</p>
                      </div>
                    </div>

                    {orderDetail.shippingInfo.invoice?.trackingNumber && (
                      <>
                        <div
                          className="flex items-center space-x-3 p-3
                  bg-gray-50 dark:bg-slate-800/70 rounded-lg
                  border border-gray-100 dark:border-slate-700/60"
                        >
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
                        <div
                          className="flex items-center space-x-3 p-3
                  bg-gray-50 dark:bg-slate-800/70 rounded-lg
                  border border-gray-100 dark:border-slate-700/60"
                        >
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">운송장 번호</p>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{orderDetail.shippingInfo.invoice.trackingNumber}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 결제 정보 */}
            <Card
              className="border-0 shadow-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60
                 bg-gradient-to-br from-white to-gray-50/50
                 dark:from-slate-900 dark:to-slate-800/60 overflow-hidden"
            >
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
                      <div
                        className="flex items-center space-x-3 p-3
                bg-gray-50 dark:bg-slate-800/70 rounded-lg
                border border-gray-100 dark:border-slate-700/60"
                      >
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">결제 상태</p>
                          <Badge className={cn(badgeBase, badgeSizeSm, paymentStatusColors[orderDetail.paymentStatus])}>{orderDetail.paymentStatus}</Badge>
                        </div>
                      </div>

                      <div
                        className="rounded-md border border-border bg-card/80 p-4 text-sm shadow-sm
                dark:bg-slate-800/60"
                      >
                        <PaymentMethodDetail method={orderDetail.paymentMethod || '무통장입금'} bankKey={orderDetail.paymentBank} depositor={orderDetail.shippingInfo?.depositor} />
                      </div>

                      <div
                        className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50
                dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg
                border border-purple-100 dark:border-purple-800/50"
                      >
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
            <Card
              className="border-0 shadow-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60
                 bg-gradient-to-br from-white to-gray-50/50
                 dark:from-slate-900 dark:to-slate-800/60 overflow-hidden"
            >
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
          <Card
            className="border-0 shadow-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60
                 bg-gradient-to-br from-white to-gray-50/50
                 dark:from-slate-900 dark:to-slate-800/60 overflow-hidden"
          >
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
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/60 rounded-lg p-4">
                      <p className="text-gray-700 dark:text-gray-200 whitespace-pre-line">{orderDetail.shippingInfo.deliveryRequest}</p>
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
          <Card
            className="border-0 shadow-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60
                 bg-gradient-to-br from-white to-gray-50/50
                 dark:from-slate-900 dark:to-slate-800/60 overflow-hidden"
          >
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
    </div>
  );
}
