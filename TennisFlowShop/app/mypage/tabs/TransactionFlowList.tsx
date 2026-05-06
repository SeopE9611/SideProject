'use client';

import { collectionMethodLabel, orderShippingMethodLabel } from '@/app/features/stringing-applications/lib/fulfillment-labels';
import { getMypageNormalizedStatus, getMypagePaymentStatusLabel, getMypageUserStatusLabel } from '@/app/mypage/_lib/status-label';
import OrdersScopeTabs, { parseOrdersScope } from '@/app/mypage/_components/OrdersScopeTabs';
import ActivityOrderReviewCTA from '@/app/mypage/tabs/_components/ActivityOrderReviewCTA';
import ServiceReviewCTA from '@/components/reviews/ServiceReviewCTA';
import AsyncState from '@/components/system/AsyncState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getApplicationStatusBadgeSpec,
  getOrderStatusBadgeSpec,
  getRentalStatusBadgeSpec,
  getWorkflowMetaBadgeSpec,
} from '@/lib/badge-style';
import { authenticatedSWRFetcher } from '@/lib/fetchers/authenticatedSWRFetcher';
import { getOrderStatusLabelForDisplay, isVisitPickupOrder } from '@/lib/order-shipping';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { AlertCircle, ArrowRight, Calendar, CheckCircle, ChevronDown, ChevronUp, CreditCard, Link2, Package, Sparkles, Store, Truck, Undo2, Wallet, Wrench, XCircle } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Fragment, useMemo, useState } from 'react';
import { mutate as globalMutate } from 'swr';
import useSWRInfinite from 'swr/infinite';

type FlowDetailType = 'order' | 'application' | 'rental';
type FlowType = 'order_only' | 'order_plus_stringing' | 'rental_only' | 'rental_plus_stringing' | 'application_only';

type ActivityApplicationSummary = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  status: string;
  racketType?: string;
  hasTracking: boolean;
  inboundRequired?: boolean;
  needsInboundTracking?: boolean;
  collectionMethod?: string;
  orderId?: string | null;
  rentalId?: string | null;
  userConfirmedAt?: string | null;
  cancelStatus?: string | null;
};

type ActivityGroup = {
  key: string;
  kind: 'order' | 'application' | 'rental';
  sortAt: string;
  createdAt?: string;
  flowType: FlowType;
  flowLabel: string;
  detailTarget: { type: FlowDetailType; id: string };
  order?: {
    id?: string;
    createdAt?: string;
    status: string;
    paymentStatus?: string;
    paymentProvider?: string | null;
    paymentMethod?: string | null;
    shippingMethod?: string;
    totalPrice: number;
    firstItemName?: string;
    itemsCount: number;
    linkedApplicationCount: number;
    stringingApplicationId?: string | null;
    cancelStatus?: string | null;
    cancelReasonSummary?: string | null;
    userConfirmedAt?: string | null;
    reviewPendingCount?: number;
    hasPendingReview?: boolean;
    reviewAllDone?: boolean;
    reviewNextTargetProductId?: string | null;
    applicationSummaries?: ActivityApplicationSummary[];
  };
  rental?: {
    id?: string;
    createdAt?: string;
    status: string;
    brand?: string;
    model?: string;
    totalAmount?: number;
    days?: number;
    linkedApplicationCount: number;
    stringingApplicationId?: string | null;
    withStringService?: boolean;
    cancelStatus?: string | null;
    shippingMethod?: string;
    hasOutboundShipping?: boolean;
    outboundTrackingNumber?: string | null;
    applicationSummaries?: ActivityApplicationSummary[];
  };
  application?: ActivityApplicationSummary;
};

type ActivityResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: ActivityGroup[];
};

const LIMIT = 5;
const fetcher = (url: string) => authenticatedSWRFetcher<ActivityResponse>(url);
const CancelOrderDialog = dynamic(() => import('@/app/mypage/orders/_components/CancelOrderDialog'), { loading: () => null });
const CancelStringingDialog = dynamic(() => import('@/app/mypage/applications/_components/CancelStringingDialog'), { loading: () => null });
const CancelRentalDialog = dynamic(() => import('@/app/mypage/rentals/_components/CancelRentalDialog'), { loading: () => null });
const OrderShippingInfoDialog = dynamic(() => import('@/app/mypage/tabs/_components/OrderShippingInfoDialog'), { loading: () => null });

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

const formatAmount = (amount?: number | null) => {
  if (typeof amount !== 'number') return '-';
  return `${amount.toLocaleString()}원`;
};

const FLOW_TYPE_META_LABEL: Record<FlowType, string> = {
  order_only: '주문',
  order_plus_stringing: '주문 + 교체서비스',
  rental_only: '대여',
  rental_plus_stringing: '대여 + 교체서비스',
  application_only: '교체서비스',
};

const normalizeLabel = (value?: string | null) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');

const isFilledText = (value?: string | null) => Boolean(value && value.trim() && value.trim() !== '-');

const getRepresentativeTitle = (group: ActivityGroup) => {
  if (group.kind === 'order') {
    const firstItemName = group.order?.firstItemName?.trim();
    const itemsCount = group.order?.itemsCount ?? 0;
    const baseName = isFilledText(firstItemName) ? firstItemName : '주문 상품';
    return itemsCount > 1 ? `${baseName} 외 ${itemsCount - 1}건` : baseName;
  }

  if (group.kind === 'rental') {
    const brand = group.rental?.brand?.trim() ?? '';
    const model = group.rental?.model?.trim() ?? '';
    const racketName = `${brand} ${model}`.trim() || '라켓';
    return `${racketName} 대여`;
  }

  return getApplicationTitle(group.application);
};

const getStatusBadgeSpec = (group: ActivityGroup, label: string) => {
  if (group.kind === 'order') return getOrderStatusBadgeSpec(label);
  if (group.kind === 'rental') return getRentalStatusBadgeSpec(label);

  const normalized = label.trim();
  if (normalized === '승인') return getApplicationStatusBadgeSpec('접수완료');
  if (normalized === '거절') return getApplicationStatusBadgeSpec('취소');
  if (normalized === '환불') return getApplicationStatusBadgeSpec('취소');
  if (normalized === '반납완료') return getApplicationStatusBadgeSpec('교체완료');
  return getApplicationStatusBadgeSpec(label);
};

const isApplicationTrackingNeeded = (app?: ActivityApplicationSummary) => Boolean(app?.needsInboundTracking && !app?.hasTracking);

const isApplicationConfirmNeeded = (app?: ActivityApplicationSummary) => getMypageNormalizedStatus(app?.status) === '교체완료' && !app?.userConfirmedAt;

const isApplicationTodoActionable = (app?: ActivityApplicationSummary) => isApplicationTrackingNeeded(app) || isApplicationConfirmNeeded(app);

const getLinkedApplicationStatusSummary = (apps: ActivityApplicationSummary[] = []) => {
  if (apps.length === 0) return null;
  const latest = [...apps].sort((a, b) => {
    const aUpdated = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    const bUpdated = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
    if (bUpdated !== aUpdated) return bUpdated - aUpdated;
    const aCreated = new Date(a.createdAt ?? 0).getTime();
    const bCreated = new Date(b.createdAt ?? 0).getTime();
    return bCreated - aCreated;
  })[0];
  const label = getMypageUserStatusLabel(latest?.status);
  return `${label} · ${apps.length}건 연결`;
};

const getApplicationOriginLabel = (app?: ActivityApplicationSummary) => {
  if (!app) return null;
  if (app.orderId) return '주문';
  if (app.rentalId) return '대여';
  return '단독 신청';
};

const isStandaloneApplication = (app?: ActivityApplicationSummary) => Boolean(app && !app.orderId && !app.rentalId);

const shortId = (value?: string | null) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  return normalized.slice(-6).toUpperCase();
};

const getApplicationTitle = (app?: ActivityApplicationSummary) => {
  if (!app) return '교체서비스 신청';
  if (app.orderId) return '주문 연계 교체서비스 신청';
  if (app.rentalId) return '대여 연계 교체서비스 신청';
  return '단독 교체서비스 신청';
};

const getApplicationCollectionLabel = (app?: ActivityApplicationSummary) => {
  if (!app) return '-';
  if (!app.inboundRequired) return '입고 불필요(연계 처리)';
  return collectionMethodLabel(app.collectionMethod);
};

const getApplicationTrackingLabel = (app?: ActivityApplicationSummary) => {
  if (!app) return '-';
  if (!app.inboundRequired) return '운송장 입력 대상 아님';
  if (!app.needsInboundTracking) return '운송장 입력 선택 사항';
  return app.hasTracking ? '운송장 등록됨' : '운송장 등록 필요';
};

const getRentalReturnStatusLabel = (status?: string | null) => {
  const normalized = getMypageNormalizedStatus(status);
  if (normalized === '반납완료') return '반납완료';
  if (normalized === '취소') return '반납 없음';
  return '반납 대기';
};

const getRentalShippingStatusMeta = (rental?: ActivityGroup['rental']) => {
  const shippingMethod = String(rental?.shippingMethod ?? '')
    .trim()
    .toLowerCase();
  const isVisitPickup = shippingMethod === 'pickup' || shippingMethod === 'visit';
  if (isVisitPickup) {
    return {
      label: '수령 상태',
      value: rental?.hasOutboundShipping ? '수령 준비 완료' : '수령 준비중',
    };
  }
  return {
    label: '출고 상태',
    value: rental?.hasOutboundShipping ? '출고됨' : '출고 준비중',
  };
};

const getTodoPrimaryReason = (group: ActivityGroup): string | null => {
  if (group.kind === 'order') {
    if (getMypageNormalizedStatus(group.order?.status) === '배송완료') return '구매확정 필요';
    const actionableApplication = group.order?.applicationSummaries?.find((app) => isApplicationTodoActionable(app));
    if (isApplicationTrackingNeeded(actionableApplication)) return '운송장 등록 필요';
    if (isApplicationConfirmNeeded(actionableApplication)) return '교체확정 필요';
    const isConfirmed = Boolean(group.order?.userConfirmedAt) || getMypageNormalizedStatus(group.order?.status) === '구매확정';
    if (isConfirmed && (group.order?.reviewPendingCount ?? 0) > 0) return '후기를 남길 수 있어요';
    return null;
  }

  if (group.kind === 'rental') {
    const actionableApplication = group.rental?.applicationSummaries?.find((app) => isApplicationTodoActionable(app));
    if (isApplicationTrackingNeeded(actionableApplication)) return '운송장 등록 필요';
    if (isApplicationConfirmNeeded(actionableApplication)) return '교체확정 필요';
    if (!group.rental?.stringingApplicationId && group.rental?.withStringService) return '교체서비스 신청 필요';
    return null;
  }

  if (isApplicationTrackingNeeded(group.application)) return '운송장 등록 필요';
  if (isApplicationConfirmNeeded(group.application)) return '교체확정 필요';
  return null;
};


const getFlowNextActionText = (group: ActivityGroup, opts?: { prefersApplicationView?: boolean; todoPrimaryReason?: string | null }): string | null => {
  if (opts?.todoPrimaryReason) {
    const todoMessageMap: Record<string, string> = {
      '구매확정 필요': '상품을 받으셨다면 구매확정을 진행해주세요.',
      '운송장 등록 필요': '운송장 정보를 등록해주세요.',
      '교체확정 필요': '작업 내용을 확인하고 교체확정을 진행해주세요.',
      '후기를 남길 수 있어요': '구매확정된 상품은 후기를 작성할 수 있어요.',
      '교체서비스 신청 필요': '교체서비스 신청을 이어서 진행해주세요.',
    };
    return todoMessageMap[opts.todoPrimaryReason] ?? null;
  }

  const viewKind: ActivityGroup['kind'] = opts?.prefersApplicationView && group.application ? 'application' : group.kind;

  if (viewKind === 'order') {
    const normalized = getMypageNormalizedStatus(group.order?.status);
    if (normalized === '취소요청' || normalized === '취소 요청') return '취소 요청이 접수되었습니다. 처리 결과를 기다려주세요.';
    if (normalized === '취소') return '취소가 완료되었습니다.';
    if (normalized === '환불' || normalized === '환불 처리중') return '환불 진행 상태를 확인해주세요.';
    if (normalized === '대기중') return '결제를 완료해주세요.';
    if (normalized === '결제완료') return '결제가 완료되었습니다. 상품 준비를 기다려주세요.';
    if (normalized === '처리중') return '상품을 준비하고 있습니다. 준비가 끝나면 배송 또는 수령 안내가 진행됩니다.';
    if (normalized === '배송중') {
      return isVisitPickupOrder({ shippingMethod: group.order?.shippingMethod })
        ? '수령 준비 상태를 확인해주세요.'
        : '배송 정보를 확인해주세요.';
    }
    if (normalized === '배송완료') return '상품을 받으셨다면 구매확정을 진행해주세요.';
    if (normalized === '구매확정') return '구매확정된 상품은 후기를 작성할 수 있어요.';
    return null;
  }

  if (viewKind === 'rental') {
    const normalized = getMypageNormalizedStatus(group.rental?.status);
    if (normalized === '취소') return '대여가 취소되었습니다.';
    if (normalized === '대기중') return '결제를 완료해주세요.';
    if (normalized === '결제완료') return '대여 상품 출고 또는 수령 준비 중입니다.';
    if (normalized === '대여중') return '대여 중입니다. 반납 일정을 확인해주세요.';
    if (normalized === '반납완료') return '반납이 완료되었습니다.';
    if (!group.rental?.stringingApplicationId && group.rental?.withStringService) return '교체서비스 신청을 이어서 진행해주세요.';
    if ((group.rental?.applicationSummaries ?? []).length > 0) return '해당 신청서의 진행 정보를 확인해주세요.';
    return null;
  }

  const app = group.application;
  const normalized = getMypageNormalizedStatus(app?.status);
  if (normalized === '취소') return '신청이 취소되었습니다.';
  if (normalized === '접수완료') return '신청이 접수되었습니다. 검토를 기다려주세요.';
  if (normalized === '검토 중') return '신청 내용을 확인 중입니다. 안내를 기다려주세요.';
  if (normalized === '승인') return '신청이 확인되었습니다. 다음 안내를 기다려주세요.';
  if (normalized === '처리중' || normalized === '작업 중') return '교체서비스 작업이 진행 중입니다. 완료 안내를 기다려주세요.';
  if (normalized === '교체완료') return '작업 내용을 확인하고 교체확정을 진행해주세요.';
  if (normalized === '거절') return '신청이 반려되었습니다. 자세한 내용은 고객센터로 문의해주세요.';
  return null;
};
const canShowOrderShippingInfo = (status?: string | null) => {
  const normalized = getMypageNormalizedStatus(status);
  return normalized === '배송중' || normalized === '배송완료' || normalized === '구매확정';
};

function FlowListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <Card key={idx} className="border-0 bg-card">
          <CardContent className="space-y-3 p-4 bp-sm:p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-4 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TransactionFlowList() {
  const searchParams = useSearchParams();
  const scope = parseOrdersScope(searchParams.get('scope')) ?? 'all';
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [confirmingApplicationId, setConfirmingApplicationId] = useState<string | null>(null);
  const [expandedSecondaryKey, setExpandedSecondaryKey] = useState<string | null>(null);
  const [cancelOrderDialogId, setCancelOrderDialogId] = useState<string | null>(null);
  const [cancelApplicationDialogId, setCancelApplicationDialogId] = useState<string | null>(null);
  const [cancelRentalDialogId, setCancelRentalDialogId] = useState<string | null>(null);
  const [shippingInfoDialogTarget, setShippingInfoDialogTarget] = useState<{ orderId: string; triggerLabel: string; shippingMethod?: string } | null>(null);
  const [isCancelApplicationSubmitting, setIsCancelApplicationSubmitting] = useState(false);
  const [withdrawingOrderCancelId, setWithdrawingOrderCancelId] = useState<string | null>(null);
  const getKey = (pageIndex: number, previousPageData: ActivityResponse | null) => {
    if (previousPageData && previousPageData.items && previousPageData.items.length < LIMIT) return null;
    const page = pageIndex + 1;
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(LIMIT));
    if (scope !== 'all') {
      params.set('scope', scope);
    }
    return `/api/mypage/activity?${params.toString()}`;
  };

  const { data, size, setSize, isValidating, error, mutate } = useSWRInfinite<ActivityResponse>(getKey, fetcher, {
    revalidateFirstPage: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const patchOrderCancelStatus = async (orderId: string, nextCancelStatus: 'requested' | null) => {
    await mutate(
      (currentPages) => {
        if (!currentPages) return currentPages;

        return currentPages.map((page) => ({
          ...page,
          items: page.items.map((item) => {
            const isTargetOrderCard = item.order?.id === orderId;
            const isTargetLinkedApplication = item.application?.orderId === orderId;

            if (!isTargetOrderCard && !isTargetLinkedApplication) return item;

            const nextApplication = item.application
              ? {
                  ...item.application,
                  cancelStatus: isTargetLinkedApplication ? nextCancelStatus : item.application.cancelStatus,
                }
              : item.application;

            const nextOrder =
              isTargetOrderCard && item.order
                ? {
                    ...item.order,
                    cancelStatus: nextCancelStatus,
                    cancelReasonSummary: nextCancelStatus === null ? null : item.order.cancelReasonSummary ?? null,
                    applicationSummaries: item.order.applicationSummaries?.map((app) =>
                      app.orderId === orderId
                        ? {
                            ...app,
                            cancelStatus: nextCancelStatus,
                          }
                        : app,
                    ),
                  }
                : item.order;

            return { ...item, order: nextOrder, application: nextApplication };
          }),
        }));
      },
      { revalidate: false },
    );
  };

  const refreshRelatedQueries = async () => {
    await Promise.all([
      mutate(undefined, { revalidate: true }),
      globalMutate((key) => typeof key === 'string' && key.startsWith('/api/mypage/activity'), undefined, { revalidate: true }),
      globalMutate((key) => typeof key === 'string' && key.startsWith('/api/users/me/orders'), undefined, { revalidate: true }),
      globalMutate((key) => typeof key === 'string' && key.startsWith('/api/me/rentals'), undefined, { revalidate: true }),
      globalMutate((key) => typeof key === 'string' && key.startsWith('/api/applications/me'), undefined, { revalidate: true }),
      globalMutate((key) => typeof key === 'string' && key.startsWith('/api/points/me'), undefined, { revalidate: true }),
    ]);
  };

  const syncOrderRelatedCaches = async (orderId: string) => {
    await Promise.all([
      globalMutate(`/api/orders/${orderId}/status`, undefined, { revalidate: true }),
      globalMutate(`/api/orders/${orderId}/history`, undefined, { revalidate: true }),
      globalMutate(`/api/orders/${orderId}`, undefined, { revalidate: true }),
    ]);
  };

  const handleConfirmPurchase = async (orderId: string) => {
    if (confirmingOrderId) return;
    if (!window.confirm('구매확정 처리하시겠습니까?\n확정 후에는 되돌릴 수 없습니다.')) return;

    try {
      setConfirmingOrderId(orderId);
      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        showErrorToast(data?.error || data?.message || '구매확정 처리 중 오류가 발생했습니다.');
        return;
      }

      const optimisticConfirmedAt = new Date().toISOString();
      await mutate(
        (currentPages) => {
          if (!currentPages) return currentPages;

          return currentPages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.order?.id !== orderId) return item;

              const patchConfirmedApp = (app: ActivityApplicationSummary) => {
                if (app.userConfirmedAt || getMypageNormalizedStatus(app.status) !== '교체완료') return app;
                return { ...app, userConfirmedAt: optimisticConfirmedAt };
              };

              const patchedSelectedApplication = item.application ? patchConfirmedApp(item.application) : item.application;

              return {
                ...item,
                order: item.order
                  ? {
                      ...item.order,
                      status: '구매확정',
                      userConfirmedAt: optimisticConfirmedAt,
                      applicationSummaries: item.order.applicationSummaries?.map((app) => patchConfirmedApp(app)),
                    }
                  : item.order,
                application: patchedSelectedApplication,
              };
            }),
          }));
        },
        { revalidate: false },
      );

      showSuccessToast('구매확정이 완료되었습니다.');
      await refreshRelatedQueries();
    } catch (e) {
      console.error(e);
      showErrorToast('구매확정 처리 중 오류가 발생했습니다.');
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleConfirmApplication = async (applicationId: string) => {
    if (confirmingApplicationId) return;
    if (!window.confirm('교체 확정 처리할까요?\n확정 시 포인트가 지급되며 되돌릴 수 없습니다.')) return;

    try {
      setConfirmingApplicationId(applicationId);
      const res = await fetch(`/api/applications/stringing/${applicationId}/confirm`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        showErrorToast(data?.message || '교체 확정에 실패했습니다.');
        return;
      }
      showSuccessToast(data?.already ? data?.message || '이미 교체확정된 신청입니다.' : '교체 확정이 완료되었습니다.');
      await refreshRelatedQueries();
    } catch (e) {
      console.error(e);
      showErrorToast('교체 확정 중 오류가 발생했습니다.');
    } finally {
      setConfirmingApplicationId(null);
    }
  };

  const handleApplicationCancelRequest = async (params: { reasonCode: string; reasonText?: string; refundAccount: { bank: string; account: string; holder: string } }) => {
    if (!cancelApplicationDialogId) return;
    try {
      setIsCancelApplicationSubmitting(true);
      const res = await fetch(`/api/applications/stringing/${cancelApplicationDialogId}/cancel-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        showErrorToast(body?.message || '신청 취소 요청 처리 중 오류가 발생했습니다.');
        return;
      }

      showSuccessToast('신청 취소 요청이 접수되었습니다.');
      setCancelApplicationDialogId(null);
      await refreshRelatedQueries();
    } catch (e) {
      console.error(e);
      showErrorToast('신청 취소 요청 처리 중 오류가 발생했습니다.');
    } finally {
      setIsCancelApplicationSubmitting(false);
    }
  };

  const handleOrderCancelWithdraw = async (orderId: string) => {
    if (withdrawingOrderCancelId) return;
    if (!window.confirm('이 주문의 취소 요청을 철회하시겠습니까?')) return;

    try {
      setWithdrawingOrderCancelId(orderId);
      const res = await fetch(`/api/orders/${orderId}/cancel-request-withdraw`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        showErrorToast(body?.message || '취소 요청 철회 중 오류가 발생했습니다.');
        return;
      }

      showSuccessToast('주문 취소 요청을 철회했습니다.');
      await patchOrderCancelStatus(orderId, null);
      await syncOrderRelatedCaches(orderId);
    } catch (e) {
      console.error(e);
      showErrorToast('취소 요청 철회 중 오류가 발생했습니다.');
    } finally {
      setWithdrawingOrderCancelId(null);
    }
  };

  const flowQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('from', 'orders');
    params.set('scope', scope);
    return params.toString();
  }, [scope]);

  const items = useMemo(() => (data ? data.flatMap((d) => d.items) : []), [data]);
  const cancelOrderTarget =
    cancelOrderDialogId
      ? items.find((group) => {
          const id =
            group.order?.id ??
            (group.kind === 'order' ? group.detailTarget.id : undefined);
          return id === cancelOrderDialogId;
        })?.order
      : null;
  const hasMore = useMemo(() => {
    if (!data || data.length === 0) return false;
    const last = data[data.length - 1];
    return (last?.items?.length ?? 0) === LIMIT;
  }, [data]);

  if (!data && isValidating) {
    return <FlowListSkeleton />;
  }

  if (error) {
    return (
      <AsyncState kind="error" variant="card" resourceName="거래 흐름" onAction={() => mutate()} />
    );
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Filter Tabs */}
      <OrdersScopeTabs activeScope={scope} />
      {scope === 'todo' ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 ring-1 ring-primary/10 dark:bg-primary/10 bp-sm:p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-background/70 p-1.5 text-primary ring-1 ring-primary/15">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground">해야 할 일만 모아봤어요</p>
              <p className="text-xs leading-relaxed text-foreground/75">구매확정, 운송장 등록, 교체확정, 후기 작성처럼 지금 바로 처리할 수 있는 항목입니다.</p>
              <p className="text-xs leading-relaxed text-muted-foreground">각 항목 아래 버튼으로 바로 처리할 수 있습니다.</p>
            </div>
          </div>
        </div>
      ) : null}
      <p className="text-xs text-foreground/75">주문 구매확정과 교체서비스 확정은 별도로 처리됩니다.</p>
      {items.length === 0 ? (
        <Card className="border-0 bg-card">
          <CardContent className="p-8 text-center">
            <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            {scope === 'todo' ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground/90">지금 처리할 일이 없습니다.</p>
                <p className="text-sm text-muted-foreground">주문, 장착서비스, 대여 진행 중 필요한 작업이 생기면 이곳에 표시됩니다.</p>
              </div>
            ) : (
              <p className="text-sm text-foreground/80">
                {scope === 'application'
                  ? '표시할 서비스 신청이 없습니다.'
                  : scope === 'rental'
                    ? '표시할 대여 내역이 없습니다.'
                    : scope === 'order'
                      ? '표시할 주문 내역이 없습니다.'
                      : '표시할 거래/이용 내역이 없습니다.'}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        items.map((g) => {
          const orderId = g.order?.id ?? (g.kind === 'order' ? g.detailTarget.id : undefined);
          const rentalId = g.rental?.id ?? (g.kind === 'rental' ? g.detailTarget.id : undefined);
          const applicationId = g.application?.id ?? (g.kind === 'application' ? g.detailTarget.id : undefined);
          const linkedApps = g.kind === 'order' ? (g.order?.applicationSummaries ?? []) : g.kind === 'rental' ? (g.rental?.applicationSummaries ?? []) : [];
          const linkedActionableApplication = linkedApps.find((app) => isApplicationTodoActionable(app));
          const prefersApplicationView = scope === 'application' && Boolean(g.application);
          const displayApplication = g.application;
          const isDirectApplicationCard = g.kind === 'application' || prefersApplicationView;
          const applicationActionTarget = displayApplication ?? linkedActionableApplication;
          const actionableApplicationId = applicationActionTarget?.id;
          const primaryLinkedApplicationId =
            g.kind === 'order'
              ? (g.order?.stringingApplicationId ?? linkedActionableApplication?.id ?? g.order?.applicationSummaries?.[0]?.id)
              : g.kind === 'rental'
                ? (g.rental?.stringingApplicationId ?? linkedActionableApplication?.id ?? g.rental?.applicationSummaries?.[0]?.id)
                : undefined;
          const status = g.kind === 'order' ? g.order?.status : g.kind === 'rental' ? g.rental?.status : g.application?.status;
          const normalizedStatus = getMypageNormalizedStatus(status);
          const userStatusLabel = getMypageUserStatusLabel(status);
          const orderDisplayStatusLabel =
            g.kind === 'order'
              ? getOrderStatusLabelForDisplay(userStatusLabel, {
                  shippingMethod: g.order?.shippingMethod,
                })
              : userStatusLabel;
          const statusBadgeSpec = getStatusBadgeSpec(g, userStatusLabel);
          const linkedCount = g.kind === 'order' ? (g.order?.linkedApplicationCount ?? 0) : g.kind === 'rental' ? (g.rental?.linkedApplicationCount ?? 0) : 0;
          const needsTrackingAction = Boolean(applicationActionTarget?.needsInboundTracking && !applicationActionTarget?.hasTracking);
          const normalizedMetaLabel = normalizeLabel(FLOW_TYPE_META_LABEL[g.flowType]);
          const normalizedFlowLabel = normalizeLabel(g.flowLabel);
          const todoPrimaryReason = scope === 'todo' || scope === 'all' ? getTodoPrimaryReason(g) : null;
          const nextActionText = getFlowNextActionText(g, { prefersApplicationView, todoPrimaryReason });
          const flowKindBadgeLabel = prefersApplicationView ? '서비스 신청' : g.kind === 'order' ? '주문' : g.kind === 'rental' ? '대여' : '서비스 신청';
          const linkedFlowBadgeLabel = !prefersApplicationView && (g.flowType === 'order_plus_stringing' || g.flowType === 'rental_plus_stringing') ? '교체서비스 연결' : null;
          const shouldShowFlowBadge =
            !prefersApplicationView &&
            !linkedFlowBadgeLabel &&
            Boolean(normalizedFlowLabel) &&
            normalizedFlowLabel !== normalizedMetaLabel;
          const displayKind: FlowDetailType = prefersApplicationView ? 'application' : g.kind;
          const isApplicationActionContext = Boolean(applicationActionTarget) && (isDirectApplicationCard || scope === 'todo' || scope === 'all');
          const displayTitle = prefersApplicationView ? getApplicationTitle(displayApplication) : getRepresentativeTitle(g);
          const displayStatus = prefersApplicationView ? displayApplication?.status : status;
          const displayUserStatusLabel = prefersApplicationView
            ? getMypageUserStatusLabel(displayStatus)
            : orderDisplayStatusLabel;
          const displayStatusBadgeSpec = prefersApplicationView ? getStatusBadgeSpec({ ...g, kind: 'application' }, displayUserStatusLabel) : statusBadgeSpec;
          const displayDateLabel = displayKind === 'order' ? '주문일' : displayKind === 'rental' ? '대여일' : '신청일';
          const displayDateValue = displayKind === 'order' ? (g.order?.createdAt ?? g.sortAt) : displayKind === 'rental' ? (g.rental?.createdAt ?? g.sortAt) : (displayApplication?.createdAt ?? g.createdAt ?? g.sortAt);
          const detailTargetType: FlowDetailType = prefersApplicationView ? 'application' : g.detailTarget.type;
          const detailTargetId = prefersApplicationView && displayApplication?.id ? displayApplication.id : g.detailTarget.id;
          const displayMetaLabel = prefersApplicationView ? '교체서비스 신청' : FLOW_TYPE_META_LABEL[g.flowType];
          const showLinkedStatusBadge = g.flowType !== 'application_only' && linkedCount > 0 && !prefersApplicationView;
          const standaloneApplicationIdMeta = isStandaloneApplication(displayApplication) && displayApplication?.id ? ` · #${shortId(displayApplication.id) ?? '-'}` : '';
          const isCancelRequested =
            (displayKind === 'order' && g.order?.cancelStatus === 'requested') ||
            (displayKind === 'rental' && g.rental?.cancelStatus === 'requested') ||
            (displayKind === 'application' && (displayApplication ?? g.application)?.cancelStatus === 'requested');

          return (
            <Card key={g.key} className="group relative overflow-hidden border border-border bg-card shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-md">
              <div className="absolute inset-0 border border-border/40 bg-secondary/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ padding: '1px' }}>
                <div className="h-full w-full rounded-lg bg-card" />
              </div>
              <CardContent className="relative space-y-4 p-4 bp-sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">{displayTitle}</p>
                    <p className="mt-1 text-xs text-foreground/75">
                      {displayMetaLabel} · {displayDateLabel} {formatDate(displayDateValue)}
                      {standaloneApplicationIdMeta}
                    </p>
                  </div>
                  <Badge variant={displayStatusBadgeSpec.variant}>{displayUserStatusLabel}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">{flowKindBadgeLabel}</Badge>
                  {linkedFlowBadgeLabel ? <Badge variant="secondary">{linkedFlowBadgeLabel}</Badge> : null}
                  {todoPrimaryReason ? (
                    <Badge variant={getWorkflowMetaBadgeSpec('action_required').variant}>
                      해야 할 일: {todoPrimaryReason}
                    </Badge>
                  ) : null}
                  {shouldShowFlowBadge ? <Badge variant="outline">{g.flowLabel}</Badge> : null}
                  {showLinkedStatusBadge ? <Badge variant="secondary">{getLinkedApplicationStatusSummary(linkedApps)}</Badge> : null}
                  {isCancelRequested ? (
                    <Badge
                      variant={getWorkflowMetaBadgeSpec('cancel_requested').variant}
                      className="gap-1"
                    >
                      <AlertCircle className="h-3 w-3" />
                      취소 요청됨
                    </Badge>
                  ) : null}
                </div>

                {todoPrimaryReason && nextActionText ? (
                  <div
                    className={`rounded-xl border p-3 bp-sm:p-4 ${
                      scope === 'todo'
                        ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/10 dark:bg-primary/10'
                        : 'border-border/60 bg-secondary/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[11px]">
                        해야 할 일
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-foreground">{todoPrimaryReason}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{nextActionText}</p>
                    <p className="mt-2 text-xs text-muted-foreground">아래 버튼에서 바로 처리할 수 있어요.</p>
                  </div>
                ) : nextActionText ? (
                  <p className="mt-1 text-xs text-muted-foreground">{nextActionText}</p>
                ) : null}

                <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/50 bg-muted/30 p-3 bp-sm:grid-cols-2 bp-lg:grid-cols-4">
                  {displayKind === 'order' ? (
                    <>
                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm uppercase tracking-wide text-foreground/75">결제 금액</p>
                          <p className="font-medium text-foreground">{formatAmount(g.order?.totalPrice)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm uppercase tracking-wide text-foreground/75">주문 상태</p>
                          <p className="font-medium text-foreground">{orderDisplayStatusLabel}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm uppercase tracking-wide text-foreground/75">결제 상태</p>
                          <p className="font-medium text-foreground">{getMypagePaymentStatusLabel(g.order?.paymentStatus)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm uppercase tracking-wide text-foreground/75">수령 방법</p>
                          <p className="font-medium text-foreground">{orderShippingMethodLabel(g.order?.shippingMethod)}</p>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {displayKind === 'rental' ? (
                    <>
                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm uppercase tracking-wide text-foreground/75">대여 금액</p>
                          <p className="font-medium text-foreground">{formatAmount(g.rental?.totalAmount)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm uppercase tracking-wide text-foreground/75">대여 기간</p>
                          <p className="font-medium text-foreground">{typeof g.rental?.days === 'number' ? `${g.rental.days}일` : '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm uppercase tracking-wide text-foreground/75">{getRentalShippingStatusMeta(g.rental).label}</p>
                          <p className="font-medium text-foreground">{getRentalShippingStatusMeta(g.rental).value}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <Undo2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm uppercase tracking-wide text-foreground/75">반납 상태</p>
                          <p className="font-medium text-foreground">{getRentalReturnStatusLabel(g.rental?.status)}</p>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {displayKind === 'application' ? (
                    <>
                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm uppercase tracking-wide text-foreground/75">접수 방식</p>
                          <p className="font-medium text-foreground">{getApplicationCollectionLabel(displayApplication)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm uppercase tracking-wide text-foreground/75">운송장 상태</p>
                          <p className="font-medium text-foreground">{getApplicationTrackingLabel(displayApplication)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm uppercase tracking-wide text-foreground/75">진행 단계</p>
                          <p className="font-medium text-foreground">{displayUserStatusLabel}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm uppercase tracking-wide text-foreground/75">연계 원본</p>
                          <p className="font-medium text-foreground">
                            {getApplicationOriginLabel(displayApplication)}
                            {displayApplication?.orderId ? ` · #${shortId(displayApplication.orderId) ?? '-'}` : ''}
                            {displayApplication?.rentalId ? ` · #${shortId(displayApplication.rentalId) ?? '-'}` : ''}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3 md:pt-4">
                  {(() => {
                    type ActionDef = {
                      key: string;
                      priority: number;
                      pinInline?: boolean;
                      forceSecondary?: boolean;
                      node: React.ReactNode;
                    };

                    const actions: ActionDef[] = [];

                    const detailPriority = scope === 'todo' || prefersApplicationView ? 10 : 3;
                    actions.push({
                      key: 'flow-detail',
                      priority: detailPriority,
                      node: (
                        <Button key="flow-detail" asChild size="sm" variant="outline" className="bg-transparent">
                          <Link href={`/mypage?tab=orders&flowType=${detailTargetType}&flowId=${detailTargetId}&${flowQuery}`}>
                            상세 보기 <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      ),
                    });

                    const canRenderOrderReview = Boolean(g.order?.userConfirmedAt) || normalizedStatus === '구매확정';

                    if (prefersApplicationView) {
                      if (orderId) {
                        actions.push({
                          key: 'application-linked-order',
                          priority: 5,
                          forceSecondary: true,
                          node: (
                            <Button key="application-linked-order" asChild size="sm" variant="outline" className="bg-transparent">
                              <Link href={`/mypage?tab=orders&flowType=order&flowId=${orderId}&${flowQuery}`}>연계 주문 보기</Link>
                            </Button>
                          ),
                        });
                      }

                      if (rentalId) {
                        actions.push({
                          key: 'application-linked-rental',
                          priority: 5,
                          forceSecondary: true,
                          node: (
                            <Button key="application-linked-rental" asChild size="sm" variant="outline" className="bg-transparent">
                              <Link href={`/mypage?tab=orders&flowType=rental&flowId=${rentalId}&${flowQuery}`}>연계 대여 보기</Link>
                            </Button>
                          ),
                        });
                      }
                    }

                    if (g.kind === 'order' && orderId && !prefersApplicationView) {
                      if (canShowOrderShippingInfo(status)) {
                        const isVisitPickup = isVisitPickupOrder({ shippingMethod: g.order?.shippingMethod });
                        const shippingInfoLabel = isVisitPickup ? '방문 수령 정보 확인' : '배송정보 확인';
                        const ShippingInfoIcon = isVisitPickup ? Store : Truck;
                        actions.push({
                          key: 'order-shipping-info',
                          priority: 1,
                          node: (
                            <Button
                              key="order-shipping-info"
                              size="sm"
                              variant="outline"
                              className="bg-transparent"
                              onClick={() =>
                                setShippingInfoDialogTarget({
                                  orderId,
                                  triggerLabel: shippingInfoLabel,
                                  shippingMethod: g.order?.shippingMethod,
                                })
                              }
                            >
                              <ShippingInfoIcon className="mr-2 h-4 w-4" />
                              {shippingInfoLabel}
                            </Button>
                          ),
                        });
                      }

                      if (primaryLinkedApplicationId) {
                        actions.push({
                          key: 'order-linked-application',
                          priority: 0,
                          pinInline: true,
                          node: (
                            <Button key="order-linked-application" asChild size="sm" variant="outline" className="bg-transparent">
                              <Link href={`/mypage?tab=orders&flowType=application&flowId=${primaryLinkedApplicationId}&${flowQuery}`}>교체서비스 보기</Link>
                            </Button>
                          ),
                        });
                      }

                      if (g.order?.cancelStatus === 'requested') {
                        actions.push({
                          key: 'order-cancel-withdraw',
                          priority: 1,
                          forceSecondary: true,
                          node: (
                            <Button
                              key="order-cancel-withdraw"
                              size="sm"
                              variant="destructive"
                              disabled={withdrawingOrderCancelId === orderId}
                              onClick={() => handleOrderCancelWithdraw(orderId)}
                            >
                              <Undo2 className="mr-1 h-3.5 w-3.5" />
                              {withdrawingOrderCancelId === orderId ? '철회 중...' : '취소 요청 철회'}
                            </Button>
                          ),
                        });
                      } else if (['대기중', '결제완료'].includes(normalizedStatus)) {
                        actions.push({
                          key: 'order-cancel-request',
                          priority: 1,
                          forceSecondary: true,
                          node: (
                            <Button key="order-cancel-request" size="sm" variant="destructive" onClick={() => setCancelOrderDialogId(orderId)}>
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              취소 요청
                            </Button>
                          ),
                        });
                      } else if (normalizedStatus === '배송완료') {
                        actions.push({
                          key: 'order-confirm',
                          priority: 0,
                          pinInline: true,
                          node: (
                            <Button key="order-confirm" size="sm" disabled={confirmingOrderId === orderId} onClick={() => handleConfirmPurchase(orderId)}>
                              <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              {confirmingOrderId === orderId ? '처리 중...' : '구매확정'}
                            </Button>
                          ),
                        });
                      }

                      if (canRenderOrderReview) {
                        actions.push({
                          key: 'order-review',
                          priority: 4,
                          node: <ActivityOrderReviewCTA key="order-review" orderId={orderId} orderStatus={status} userConfirmedAt={g.order?.userConfirmedAt} className="bg-transparent" />,
                        });
                      }
                    }

                    if (g.kind === 'rental' && rentalId && !prefersApplicationView) {
                      if (['pending', 'paid', '대기중', '결제완료'].includes(normalizedStatus) && !g.rental?.hasOutboundShipping) {
                        actions.push({
                          key: 'rental-cancel-request',
                          priority: 1,
                          forceSecondary: true,
                          node: (
                            <Button key="rental-cancel-request" size="sm" variant="destructive" onClick={() => setCancelRentalDialogId(rentalId)}>
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              대여 취소 요청
                            </Button>
                          ),
                        });
                      }

                      if (g.rental?.stringingApplicationId) {
                        actions.push({
                          key: 'rental-linked-application',
                          priority: 2,
                          node: (
                            <Button key="rental-linked-application" asChild size="sm" variant="outline" className="bg-transparent">
                              <Link href={`/mypage?tab=orders&flowType=application&flowId=${g.rental.stringingApplicationId}&${flowQuery}`}>교체서비스 보기</Link>
                            </Button>
                          ),
                        });
                      } else if (g.rental?.withStringService) {
                        actions.push({
                          key: 'rental-apply-stringing',
                          priority: 2,
                          node: (
                            <Button key="rental-apply-stringing" asChild size="sm">
                              <Link href={`/services/apply?rentalId=${rentalId}`}>교체 신청하기</Link>
                            </Button>
                          ),
                        });
                      }
                    }

                    if (isApplicationActionContext && applicationActionTarget?.id) {
                      if (applicationActionTarget.needsInboundTracking ?? false) {
                        actions.push({
                          key: 'application-shipping',
                          priority: 0,
                          pinInline: true,
                          node: (
                            <Button key="application-shipping" asChild size="sm" variant="outline" className="bg-transparent">
                              <Link href={`/services/applications/${applicationActionTarget.id}/shipping?return=${encodeURIComponent(`/mypage?tab=orders&${flowQuery}`)}`}>{applicationActionTarget.hasTracking ? '운송장 수정' : '운송장 등록'}</Link>
                            </Button>
                          ),
                        });
                      }

                      if (isDirectApplicationCard && ['접수완료', '검토 중'].includes(getMypageNormalizedStatus(applicationActionTarget.status))) {
                        actions.push({
                          key: 'application-cancel-request',
                          priority: 1,
                          forceSecondary: true,
                          node: (
                            <Button key="application-cancel-request" size="sm" variant="destructive" onClick={() => setCancelApplicationDialogId(applicationActionTarget.id)}>
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              신청 취소 요청
                            </Button>
                          ),
                        });
                      }

                      if (getMypageNormalizedStatus(applicationActionTarget.status) === '교체완료' && !applicationActionTarget.userConfirmedAt) {
                        actions.push({
                          key: 'application-confirm',
                          priority: 0,
                          pinInline: scope === 'todo' || scope === 'all',
                          node: (
                            <Button key="application-confirm" size="sm" disabled={confirmingApplicationId === applicationActionTarget.id} onClick={() => handleConfirmApplication(applicationActionTarget.id)}>
                              <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              {confirmingApplicationId === applicationActionTarget.id ? '처리 중...' : '교체서비스 확정'}
                            </Button>
                          ),
                        });
                      }

                      if (applicationActionTarget.userConfirmedAt) {
                        actions.push({
                          key: 'application-review',
                          priority: 4,
                          node: <ServiceReviewCTA key="application-review" applicationId={applicationActionTarget.id} status={applicationActionTarget.status} userConfirmedAt={applicationActionTarget.userConfirmedAt} />,
                        });
                      }
                    }

                    if (needsTrackingAction && actionableApplicationId && (!primaryLinkedApplicationId || primaryLinkedApplicationId !== actionableApplicationId)) {
                      actions.push({
                        key: 'application-open-sheet',
                        priority: 3,
                        node: (
                          <Button key="application-open-sheet" asChild size="sm" variant="default">
                            <Link href={`/mypage?tab=orders&flowType=application&flowId=${actionableApplicationId}&${flowQuery}`}>교체서비스 보기</Link>
                          </Button>
                        ),
                      });
                    }

                    const sortedActions = actions.sort((a, b) => a.priority - b.priority);
                    const forcedSecondary = sortedActions.filter((a) => a.forceSecondary);
                    const inlineEligible = sortedActions.filter((a) => !a.forceSecondary);
                    const shouldUseSecondary = inlineEligible.length > 3 || forcedSecondary.length > 0;
                    const pinnedInline = sortedActions.filter((a) => a.pinInline);
                    const nonPinned = inlineEligible.filter((a) => !a.pinInline);

                    const primaryCount = shouldUseSecondary ? 1 : nonPinned.length;
                    const inlineActions = [...pinnedInline, ...nonPinned.slice(0, primaryCount)];
                    const secondaryActions = shouldUseSecondary ? [...nonPinned.slice(primaryCount), ...forcedSecondary] : [];
                    const isSecondaryOpen = expandedSecondaryKey === g.key;

                    return (
                      <>
                        {inlineActions.map((action) => (
                          <Fragment key={action.key}>{action.node}</Fragment>
                        ))}

                        {secondaryActions.length > 0 ? (
                          <button
                            type="button"
                            className={`
        group relative flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium
        transition-[box-shadow,border-color,background-color,color,opacity] duration-200 ease-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1
  ${isSecondaryOpen ? "border-border bg-secondary text-foreground shadow-sm" : "border-border bg-background text-muted-foreground hover:bg-card hover:text-foreground"}
      `}
                            onClick={() => setExpandedSecondaryKey((prev) => (prev === g.key ? null : g.key))}
                          >
                            <Sparkles className={`h-3.5 w-3.5 transition-[box-shadow,border-color,background-color,color,opacity] duration-200 ${isSecondaryOpen ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-primary/70'}`} />
                            <span>{isSecondaryOpen ? '기타 작업 닫기' : '기타 작업 더보기'}</span>
                            <span
                              className={`
        flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold
        transition-colors duration-200
        ${isSecondaryOpen ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground group-hover:bg-secondary group-hover:text-foreground'}
      `}
                            >
                              {secondaryActions.length}
                            </span>
                            {isSecondaryOpen ? <ChevronUp className="h-3.5 w-3.5 transition-transform duration-200" /> : <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-y-0.5" />}
                          </button>
                        ) : null}

                        {secondaryActions.length > 0 && isSecondaryOpen ? (
                          <div className="flex w-full animate-in fade-in flex-wrap justify-end gap-2 rounded-lg border border-dashed border-border/50 bg-muted/20 p-3 duration-200">
                            {secondaryActions.map((action) => (
                              <Fragment key={action.key}>{action.node}</Fragment>
                            ))}
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating}>
            {isValidating ? '불러오는 중...' : '더 보기'}
          </Button>
        </div>
      ) : null}

      {/* 다이얼로그는 실제로 열릴 때만 마운트해 초기 번들 로드를 줄입니다. */}
      {cancelOrderDialogId ? (
        <CancelOrderDialog
          open={Boolean(cancelOrderDialogId)}
          onOpenChange={(open) => !open && setCancelOrderDialogId(null)}
          orderId={cancelOrderDialogId}
          paymentProvider={cancelOrderTarget?.paymentProvider}
          paymentMethod={cancelOrderTarget?.paymentMethod}
          paymentStatus={cancelOrderTarget?.paymentStatus}
          onSuccess={async (orderId) => {
            if (!orderId) return;
            await patchOrderCancelStatus(orderId, 'requested');
          }}
        />
      ) : null}

      {cancelApplicationDialogId ? (
        <CancelStringingDialog
          open={Boolean(cancelApplicationDialogId)}
          onOpenChange={(open) => !open && setCancelApplicationDialogId(null)}
          onConfirm={handleApplicationCancelRequest}
          isSubmitting={isCancelApplicationSubmitting}
        />
      ) : null}

      {cancelRentalDialogId ? (
        <CancelRentalDialog
          rentalId={cancelRentalDialogId}
          open={Boolean(cancelRentalDialogId)}
          hideTrigger
          onOpenChange={(open) => !open && setCancelRentalDialogId(null)}
          onSuccess={refreshRelatedQueries}
        />
      ) : null}

      {shippingInfoDialogTarget ? (
        <OrderShippingInfoDialog
          orderId={shippingInfoDialogTarget.orderId}
          triggerLabel={shippingInfoDialogTarget.triggerLabel}
          shippingMethod={shippingInfoDialogTarget.shippingMethod}
          open={Boolean(shippingInfoDialogTarget)}
          hideTrigger
          onOpenChange={(open) => !open && setShippingInfoDialogTarget(null)}
        />
      ) : null}
    </div>
  );
}
