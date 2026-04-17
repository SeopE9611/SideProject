"use client";

import CustomerEditForm from "@/app/features/orders/components/CustomerEditForm";
import OrderHistory from "@/app/features/orders/components/OrderHistory";
import { NextTodoCallout } from "@/app/mypage/_components/OrdersScopeContextNav";
import { OrderStatusBadge } from "./OrderStatusBadge";
import PaymentMethodDetail from "@/app/mypage/orders/_components/PaymentMethodDetail";
import RequestEditForm from "@/app/mypage/orders/_components/RequestEditForm";
import SiteContainer from "@/components/layout/SiteContainer";
import OrderReviewCTA from "@/components/reviews/OrderReviewCTA";
import ServiceReviewCTA from "@/components/reviews/ServiceReviewCTA";
import AsyncState from "@/components/system/AsyncState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  badgeBase,
  badgeSizeSm,
  badgeToneVariant,
  getApplicationStatusTone,
  getPaymentStatusBadgeSpec,
} from "@/lib/badge-style";
import { refreshOnce } from "@/lib/auth/refresh-mutex";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import {
  trackingSWRFetcher,
  type TrackingSWRFetcherError,
} from "@/lib/fetchers/trackingSWRFetcher";
import {
  getOrderDeliveryInfoTitle,
  getOrderStatusLabelForDisplay,
  isVisitPickupOrder,
  orderShippingMethodLabel,
  shouldShowDeliveryOnlyFields,
} from "@/lib/order-shipping";
import { getCommonOrderStatusLabel } from "@/lib/status-labels/base";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShoppingCart,
  Truck,
  Undo2,
  User,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import useSWRInfinite from "swr/infinite";

const CancelOrderDialog = dynamic(() => import("./CancelOrderDialog"), {
  loading: () => null,
});

// SWR Infinite용 getKey (처리 이력 페이지네이션)
const LIMIT = 5;
const WITHDRAW_TIMEOUT_MS = 12000;

const parseApiMessage = async (res: Response, fallback: string) => {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => null);
    if (data && typeof data.message === "string" && data.message.trim())
      return data.message;
    if (data && typeof data.error === "string" && data.error.trim())
      return data.error;
  }

  const text = await res.text().catch(() => "");
  return text.trim() || fallback;
};

const getOrderHistoryKey =
  (orderId?: string) => (pageIndex: number, prev: any) => {
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
  userConfirmedAt?: string | null;
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
  paymentBank?: string | null;
  paymentProvider?: string | null;
  paymentEasyPayProvider?: string | null;
  paymentApprovedAt?: string | null;
  paymentTid?: string | null;
  paymentNiceSync?: {
    lastSyncedAt?: string | null;
    pgStatus?: string | null;
    source?: string | null;
  } | null;
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
    userConfirmedAt?: string | null;
    createdAt?: string | null;
    needsInboundTracking?: boolean;
    racketCount?: number;
    receptionLabel?: string;
    tensionSummary?: string | null;
    stringNames?: string[];
    reservationLabel?: string | null;
    shippingInfo?: {
      selfShip?: {
        courier?: string | null;
        trackingNo?: string | null;
        shippedAt?: string | null;
      } | null;
    } | null;
  }[];
}
interface Props {
  orderId: string;
  backUrl?: string;
  linkedApplicationHrefBuilder?: (applicationId: string) => string;
}

type OrderTrackingResponse =
  | {
      success: true;
      supported: true;
      displayStatus: string;
      linkUrl: string;
      lastEvent: {
        time: string | null;
        statusText: string | null;
        locationName: string | null;
        description: string | null;
      } | null;
      progresses: Array<{
        time: string | null;
        statusText: string | null;
        locationName: string | null;
        description: string | null;
      }>;
    }
  | {
      success: true;
      supported: false;
      reason: "unsupported_courier";
      message: string;
    }
  | {
      success: false;
      errorCode?:
        | "NOT_FOUND"
        | "BAD_REQUEST"
        | "UNAUTHENTICATED"
        | "FORBIDDEN"
        | "INTERNAL"
        | "UNKNOWN";
      message: string;
    };

const getTrackingFailureMessage = (tracking: Extract<OrderTrackingResponse, { success: false }>) => {
  if (tracking.errorCode === "UNAUTHENTICATED" || tracking.errorCode === "FORBIDDEN") {
    return "배송조회 서비스 설정을 확인해주세요.";
  }
  if (tracking.errorCode === "BAD_REQUEST") {
    return "운송장 번호 형식이 올바르지 않습니다.";
  }
  return tracking.message || "배송조회 정보를 불러오지 못했습니다.";
};

const getTrackingErrorMessage = (
  trackingData: OrderTrackingResponse | undefined,
  trackingError: unknown,
) => {
  if (trackingData && !trackingData.success && trackingData.message) {
    return trackingData.message;
  }

  const message = (trackingError as TrackingSWRFetcherError | undefined)?.message;
  return message || "배송조회 정보를 불러오지 못했습니다.";
};

// 주문 취소 요청 상태 텍스트를 계산하는 헬퍼
function getCancelRequestLabel(order: any): string | null {
  const cancel = order?.cancelRequest;
  if (!cancel || !cancel.status || cancel.status === "none") return null;

  switch (cancel.status) {
    case "requested":
      return "취소 요청 처리 중입니다. 관리자 확인 후 결과가 반영됩니다.";
    case "approved":
      // 보통 status === '취소'랑 함께 가겠지만, 혹시 모를 비동기 어긋남에 대비해서 안내
      return "취소 요청이 승인되어 주문이 취소되었습니다.";
    case "rejected":
      return "취소 요청이 거절되었습니다. 상세 사유는 관리자에게 문의해주세요.";
    default:
      return null;
  }
}

export default function OrderDetailClient({
  orderId,
  backUrl,
  linkedApplicationHrefBuilder,
}: Props) {
  const router = useRouter();
  const resolvedBackUrl = backUrl ?? "/mypage?tab=orders";
  const resolvedBackQuery = new URLSearchParams(
    resolvedBackUrl.split("?")[1] ?? "",
  );
  const resolvedScope = resolvedBackQuery.get("scope");
  const flowScopeQuery = resolvedScope
    ? `&scope=${encodeURIComponent(resolvedScope)}`
    : "";

  // 편집 모드 전체 토글
  const [isEditMode, setIsEditMode] = useState(false);
  // 고객 정보 편집
  const [editingCustomer, setEditingCustomer] = useState(false);
  // 배송 요청사항 편집
  const [editingRequest, setEditingRequest] = useState(false);

  // 취소 철회 로딩
  const [isWithdrawingCancelRequest, setIsWithdrawingCancelRequest] =
    useState(false);
  const [isConfirmingPurchase, setIsConfirmingPurchase] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // 주문 상세를 SWR로 가져오기
  const {
    data: orderDetail,
    error: orderError,
    isLoading: isOrderLoading,
    mutate: mutateOrderDetail,
  } = useSWR<OrderDetail>(`/api/orders/${orderId}`, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // 처리 이력 데이터를 SWRInfinite로 가져오기
  const {
    data: historyPages,
    error: historyError,
    mutate: mutateHistory,
  } = useSWRInfinite(getOrderHistoryKey(orderId), authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const canTrackDelivery =
    !isVisitPickupOrder(orderDetail?.shippingInfo) &&
    Boolean(orderDetail?.shippingInfo?.invoice?.trackingNumber);
  const {
    data: trackingData,
    error: trackingError,
    isLoading: isTrackingLoading,
  } = useSWR<OrderTrackingResponse>(
    canTrackDelivery ? `/api/orders/${orderId}/tracking` : null,
    trackingSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  // 상품 리뷰 작성 여부 맵: { [productId]: boolean }
  const [reviewedMap, setReviewedMap] = useState<Record<string, boolean>>({});

  // 완료 상태
  const isVisitPickup = isVisitPickupOrder(orderDetail?.shippingInfo);
  const showDeliveryOnlyFields = shouldShowDeliveryOnlyFields(
    orderDetail?.shippingInfo,
  );

  // 관리자 상세와 동일하게 shippingMethod -> deliveryMethod 순으로 읽고
  // 공용 정규화 유틸로 라벨을 만든다.
  const shippingMethodValue =
    orderDetail?.shippingInfo?.shippingMethod ??
    (orderDetail?.shippingInfo as any)?.deliveryMethod;
  const shippingMethodLabel = orderShippingMethodLabel(shippingMethodValue);
  const displayOrderStatusLabel = getOrderStatusLabelForDisplay(
    getCommonOrderStatusLabel(orderDetail?.status ?? "") ?? (orderDetail?.status ?? ""),
    orderDetail?.shippingInfo,
  ).trim();
  const shouldShowTrackingSummarySkeleton =
    isTrackingLoading && !trackingData && !trackingError;
  const shouldShowTrackingStatusNotice =
    Boolean(
      trackingData &&
        trackingData.success &&
        trackingData.supported &&
        trackingData.displayStatus &&
        trackingData.displayStatus.trim() !== displayOrderStatusLabel,
    );

  const canShowReviewCTA =
    Boolean(orderDetail?.userConfirmedAt) || orderDetail?.status === "구매확정";
  const canConfirmPurchase = getCommonOrderStatusLabel(orderDetail?.status ?? "") === "배송완료";
  const reviewsReady = (orderDetail?.items ?? []).every(
    (it) => it.id in reviewedMap,
  );

  useEffect(() => {
    const ids = (orderDetail?.items ?? []).map((it) => it.id).filter(Boolean);
    if (!ids.length) return;
    let aborted = false;
    (async () => {
      const order = orderDetail?._id;
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/reviews/self?productId=${id}&orderId=${order}`, {
            credentials: "include",
          }).then((r) => (r.ok ? r.json() : null)),
        ),
      );
      if (aborted) return;
      const next: Record<string, boolean> = {};
      results.forEach((res, i) => {
        next[ids[i]] = res.status === "fulfilled" && !!res.value; // 존재하면 true
      });
      setReviewedMap(next);
    })();
    return () => {
      aborted = true;
    };
  }, [orderDetail?._id]);

  const items = orderDetail?.items ?? [];
  const allReviewed =
    items.length > 0 && items.every((it) => reviewedMap[it.id]);
  const firstUnreviewed = items.find((it) => !reviewedMap[it.id]);
  // 편집 가능 상태: 배송 중/완료/환불/취소가 아니어야 함
  const nonEditableStatuses = ["배송중", "배송완료", "환불", "취소"];
  const canUserEdit = !nonEditableStatuses.includes(orderDetail?.status ?? "");
  // 이력 페이지를 합쳐서 하나의 배열로
  const allHistory: any[] = historyPages
    ? historyPages.flatMap((page: any) => page.history)
    : [];

  // 날짜/금액 포맷 함수
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "날짜 없음";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "유효하지 않은 날짜";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(amount);
  };
  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  };

  // 에러/로딩 처리
  if (orderError) {
    return (
      <main className="w-full">
        <SiteContainer variant="wide" className="py-4 bp-sm:py-6">
          <AsyncState
            kind="error"
            tone="user"
            variant="page-center"
            resourceName="주문 상세"
            onAction={() => {
              void mutateOrderDetail();
            }}
          />
        </SiteContainer>
      </main>
    );
  }

  const isInitialLoading = isOrderLoading && !orderDetail;

  if (isInitialLoading) {
    return (
      <main className="w-full">
        <SiteContainer variant="wide" className="py-4 bp-sm:py-6 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Skeleton className="h-[440px] rounded-xl" />
            <Skeleton className="h-[440px] rounded-xl" />
          </div>
        </SiteContainer>
      </main>
    );
  }

  if (!orderDetail) {
    return (
      <main className="w-full">
        <SiteContainer variant="wide" className="py-4 bp-sm:py-6">
          <AsyncState
            kind="empty"
            tone="user"
            variant="page-center"
            resourceName="주문 상세"
            title="주문 정보를 찾을 수 없어요"
            description="주문 번호를 확인한 뒤 다시 시도해 주세요."
          />
        </SiteContainer>
      </main>
    );
  }
  // quantity 기반으로 총 '장착 서비스 대상 스트링 수량' 계산
  const stringServiceItemCount = (orderDetail.items ?? [])
    .filter((item) => item.mountingFee != null && item.mountingFee > 0)
    .reduce((sum, item) => sum + (item.quantity ?? 1), 0);

  // remainingSlots 파생값
  const totalSlots =
    orderDetail.stringService?.totalSlots ?? stringServiceItemCount;
  const usedSlots =
    orderDetail.stringService?.usedSlots ??
    totalSlots - (orderDetail.stringService?.remainingSlots ?? 0);
  const remainingSlots =
    orderDetail.stringService?.remainingSlots ??
    Math.max(totalSlots - usedSlots, 0);

  // 이 주문과 연결된 신청서 요약 리스트
  const linkedStringingApps = orderDetail?.stringingApplications ?? [];
  const hasLinkedStringingApps = linkedStringingApps.length > 0;
  const hasSubmittedStringingApplication =
    hasLinkedStringingApps ||
    Boolean(orderDetail?.stringingApplicationId) ||
    orderDetail?.isStringServiceApplied === true;

  // 리뷰/링크에 사용할 대표 신청 ID
  // - API 계약: stringingApplicationId는 최신 신청서(updatedAt/createdAt desc)
  // - 하위 호환 fallback: 요약 리스트 첫 원소(동일 정렬 계약)
  const primaryStringingAppId =
    orderDetail?.stringingApplicationId ??
    (hasLinkedStringingApps ? linkedStringingApps[0].id : undefined);

  const primaryStringingApp = hasLinkedStringingApps
    ? linkedStringingApps[0]
    : undefined;
  const getApplicationHref = (applicationId: string) => {
    if (linkedApplicationHrefBuilder)
      return linkedApplicationHrefBuilder(applicationId);
    return `/mypage?tab=orders&flowType=application&flowId=${applicationId}&from=orders${flowScopeQuery}`;
  };
  const shouldShowInboundShippingBlock = Boolean(
    primaryStringingAppId && primaryStringingApp?.needsInboundTracking === true,
  );
  const inboundShippingHref = primaryStringingAppId
    ? `/services/applications/${primaryStringingAppId}/shipping?${new URLSearchParams({ return: `/mypage?tab=orders&flowType=order&flowId=${orderId}&from=orders${flowScopeQuery}` }).toString()}`
    : null;
  const selfShipInfo = primaryStringingApp?.shippingInfo?.selfShip ?? null;
  const hasSelfShipTracking = Boolean(selfShipInfo?.trackingNo);
  const selfShipStatusLabel = hasSelfShipTracking ? "등록 완료" : "미등록";
  const selfShipCourierLabel = selfShipInfo?.courier?.trim() || "미등록";
  const selfShipTrackingNoLabel = selfShipInfo?.trackingNo?.trim() || "미등록";

  // 취소 요청 상태/라벨 계산
  const cancelLabel = getCancelRequestLabel(orderDetail);
  const cancelStatus = (orderDetail as any)?.cancelRequest?.status;
  const canWithdrawCancelRequest = cancelStatus === "requested";
  const handleConfirmPurchase = async () => {
    if (!orderDetail?._id || isConfirmingPurchase) return;
    if (
      !window.confirm(
        "구매확정 처리하시겠습니까?\n확정 후에는 되돌릴 수 없습니다.",
      )
    ) {
      return;
    }

    try {
      setIsConfirmingPurchase(true);
      const res = await fetch(`/api/orders/${orderDetail._id}/confirm`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        showErrorToast(
          data?.error || data?.message || "구매확정 처리 중 오류가 발생했습니다.",
        );
        return;
      }

      showSuccessToast("구매확정이 완료되었습니다.");
      await Promise.all([
        mutateOrderDetail(),
        mutateHistory(),
        mutate(`/api/orders/${orderDetail._id}/status`),
      ]);
    } catch (e) {
      console.error(e);
      showErrorToast("구매확정 처리 중 오류가 발생했습니다.");
    } finally {
      setIsConfirmingPurchase(false);
    }
  };
  const nextTodo = shouldShowInboundShippingBlock && inboundShippingHref
    ? {
        label: "라켓 운송장 등록",
        ctaLabel: hasSelfShipTracking ? "라켓 발송 수정" : "라켓 발송 등록",
        ctaHref: inboundShippingHref,
      }
    : canConfirmPurchase
      ? {
          label: "구매확정",
          ctaLabel: isConfirmingPurchase ? "처리 중..." : "구매확정",
          onCtaClick: handleConfirmPurchase,
        }
    : canShowReviewCTA && Boolean(firstUnreviewed)
      ? {
          label: "리뷰 작성",
          ctaLabel: "리뷰 작성하기",
          ctaHref: `/reviews/write?productId=${firstUnreviewed?.id}&orderId=${orderDetail?._id}`,
        }
      : null;

  // 상세 헤더에서 "주문 취소 요청" 버튼을 보여줄 수 있는 상태인지 판단
  // - 대기중 / 결제완료 상태에서만 가능
  // - 이미 요청 중(requested)이면 새 요청 버튼 대신 "취소 철회" 배너를 보여주므로 숨김
  // - rejected 는 다시 요청 가능하게 유지
  const canShowCancelButton =
    ["대기중", "결제완료"].includes(orderDetail.status) &&
    (!cancelStatus || cancelStatus === "none" || cancelStatus === "rejected");

  const handleWithdrawCancelRequest = async () => {
    if (!orderDetail?._id || isWithdrawingCancelRequest) return;

    if (!window.confirm("이미 제출한 취소 요청을 취소하시겠습니까?")) {
      return;
    }

    try {
      setIsWithdrawingCancelRequest(true);

      const controller = new AbortController();
      const timeout = window.setTimeout(
        () => controller.abort(),
        WITHDRAW_TIMEOUT_MS,
      );

      let res: Response;
      try {
        res = await fetch(
          `/api/orders/${orderDetail._id}/cancel-request-withdraw`,
          {
            method: "POST",
            credentials: "include",
            signal: controller.signal,
          },
        );
      } finally {
        window.clearTimeout(timeout);
      }

      if (res.status === 401 || res.status === 403) {
        const rr = await refreshOnce();
        if (rr.ok) {
          const retryController = new AbortController();
          const retryTimeout = window.setTimeout(
            () => retryController.abort(),
            WITHDRAW_TIMEOUT_MS,
          );
          try {
            res = await fetch(
              `/api/orders/${orderDetail._id}/cancel-request-withdraw`,
              {
                method: "POST",
                credentials: "include",
                headers: { "x-suppress-auth-expired": "1" },
                signal: retryController.signal,
              },
            );
          } finally {
            window.clearTimeout(retryTimeout);
          }
        }
      }

      if (!res.ok) {
        throw new Error(
          await parseApiMessage(res, "취소 요청 철회 중 오류가 발생했습니다."),
        );
      }

      // SWR 캐시 갱신: 상태, 이력, 마이페이지 목록, 상세 모두 재검증
      await Promise.all([
        mutateOrderDetail(),
        mutateHistory(),
        mutate(
          (key) =>
            typeof key === "string" &&
            key.startsWith(`/api/orders/${orderDetail._id}/history`),
          undefined,
          { revalidate: true },
        ),
        mutate(
          (key) =>
            typeof key === "string" && key.startsWith("/api/users/me/orders"),
          undefined,
          { revalidate: true },
        ),
      ]);

      showSuccessToast("취소 요청이 정상적으로 철회되었습니다.");
    } catch (err) {
      console.error(err);
      if (err instanceof DOMException && err.name === "AbortError") {
        showErrorToast(
          "요청 시간이 초과되었습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.",
        );
      } else {
        showErrorToast(
          (err as Error).message || "취소 요청 철회 중 오류가 발생했습니다.",
        );
      }
    } finally {
      setIsWithdrawingCancelRequest(false);
    }
  };

  return (
    <main className="w-full">
      <SiteContainer
        variant="wide"
        className="px-0 py-4 bp-sm:px-4 bp-sm:py-6 space-y-5 bp-sm:space-y-8 bp-md:px-6"
      >
        <div className="bg-muted/30 rounded-2xl border border-border p-4 shadow-lg bp-sm:p-6 bp-md:p-8">
          {/* 헤더: 제목과 액션 버튼 */}
          <div className="flex flex-col bp-md:flex-row bp-md:items-center bp-md:justify-between gap-4 bp-md:gap-6">
            {/* 제목 섹션 */}
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <div className="bg-card rounded-full p-3 shadow-md shrink-0">
                <ShoppingCart className="h-8 w-8 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl bp-sm:text-3xl font-bold text-foreground">
                  주문 상세정보
                </h1>
                <p className="text-muted-foreground mt-1 break-all text-sm">
                  주문번호: {orderId}
                </p>
              </div>
            </div>

            {/* 액션 버튼 섹션 */}
            <div className="flex flex-wrap gap-2 shrink-0 bp-md:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(backUrl ?? "/mypage?tab=orders")}
                className="bg-card/70 backdrop-blur-sm border-border hover:bg-primary/10 dark:hover:bg-primary/20"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                주문 목록으로 돌아가기
              </Button>

              <Button
                variant={isEditMode ? "destructive" : "outline"}
                size="sm"
                onClick={() => setIsEditMode((m) => !m)}
                disabled={!canUserEdit}
                className={cn(
                  isEditMode
                    ? ""
                    : "bg-card/70 backdrop-blur-sm border-border hover:bg-primary/10 dark:hover:bg-primary/20",
                )}
              >
                <Pencil className="mr-1 h-4 w-4" />
                {isEditMode ? "수정 종료" : "주문 정보 수정"}
              </Button>

              {canShowCancelButton && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  주문 취소 요청
                </Button>
              )}
            </div>
          </div>
          {/* 주문 상태 및 요약 섹션 */}
          <div className="mt-5 bp-sm:mt-8">
            <div className="grid grid-cols-1 gap-4 bp-sm:gap-6 bp-md:grid-cols-3">
              <div className="bg-card/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    주문일시
                  </span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {formatDate(orderDetail.date)}
                </p>
              </div>

              <div className="bg-card/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    총 결제금액
                  </span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(orderDetail.total)}
                </p>
              </div>

              <div className="bg-card/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    주문 상태
                  </span>
                </div>
                <OrderStatusBadge
                  orderId={orderId}
                  initialStatus={orderDetail.status}
                  shippingMethod={orderDetail.shippingInfo}
                />
              </div>
            </div>
          </div>
        </div>
        {nextTodo && (
          <NextTodoCallout
            label={nextTodo.label}
            ctaLabel={nextTodo.ctaLabel}
            ctaHref={nextTodo.ctaHref}
            onCtaClick={nextTodo.onCtaClick}
          />
        )}
        {/* 취소 요청 상태 안내 배너 */}
        {cancelLabel && (
          <div className="mb-4 flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">
            <span className="min-w-0 break-words">{cancelLabel}</span>

            {canWithdrawCancelRequest && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleWithdrawCancelRequest}
                disabled={isWithdrawingCancelRequest}
                className="w-full gap-1.5 bp-sm:ml-4 bp-sm:w-auto"
              >
                <Undo2 className="h-4 w-4" />
                {isWithdrawingCancelRequest
                  ? "취소 철회 중..."
                  : "취소 요청 철회"}
              </Button>
            )}
          </div>
        )}
        {orderDetail.shippingInfo?.withStringService && (
          <>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground">
                연결된 교체서비스 요약
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                신청 가능 여부, 남은 신청 수량, 연결된 신청 상세를 한 곳에서
                확인할 수 있어요.
              </p>
            </div>
            {totalSlots > 0 && remainingSlots > 0 ? (
              <div className="bg-muted/30 border border-border rounded-xl p-4 shadow-lg bp-sm:p-6">
                <div className="flex flex-col gap-4 bp-md:flex-row bp-md:items-center bp-md:justify-between">
                  <div className="flex items-start bp-sm:items-center space-x-3 min-w-0">
                    <div className="bg-warning/10 dark:bg-warning/15 rounded-full p-2">
                      <CheckCircle className="h-6 w-6 text-warning" />
                    </div>
                    <div>
                      <p className="font-semibold text-warning">
                        이 주문은 스트링 장착 서비스가 포함되어 있습니다.
                      </p>
                      <p className="text-sm text-warning">
                        총 {totalSlots}개 중 <strong>{usedSlots}</strong>개를
                        사용했으며, 남은 교체 가능 스트링은{" "}
                        <strong>{remainingSlots}</strong>개입니다.
                      </p>
                      {stringServiceItemCount > 1 && (
                        <p className="mt-1 text-xs text-warning">
                          (상품 기준으로는 교체 서비스 대상 스트링이{" "}
                          {stringServiceItemCount}개 포함되어 있습니다.)
                        </p>
                      )}
                      {hasSubmittedStringingApplication && (
                        <p className="mt-1 text-xs text-warning">
                          이미 교체 서비스 접수가 완료된 주문이며, 남은 대상에
                          한해 추가 신청이 가능합니다.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-center bp-md:justify-end">
                    <Link
                      className="w-full bp-sm:max-w-xs bp-md:w-auto"
                      href={`/services/apply?orderId=${orderDetail._id}`}
                    >
                      <Button variant="default" className="w-full shadow-lg">
                        {hasSubmittedStringingApplication
                          ? "교체서비스 추가 신청하기"
                          : "교체서비스 신청하기"}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : totalSlots > 0 ? (
              <div className="mt-4 bg-success/10 dark:bg-success/15 border border-border rounded-xl p-4 shadow-lg bp-sm:p-6">
                <div className="flex flex-col bp-md:flex-row bp-md:items-start bp-md:justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-success/10 dark:bg-success/15 rounded-full p-2 mt-1">
                      <CheckCircle className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold text-success">
                        이 주문으로 교체 서비스 신청이 완료되었습니다.
                      </p>
                      <p className="text-sm text-success">
                        이 주문에는 교체 서비스 대상 스트링이{" "}
                        <span className="font-semibold">
                          {stringServiceItemCount}개
                        </span>{" "}
                        포함되어 있습니다.
                      </p>
                      <p className="text-sm text-success">
                        실제 신청 접수 방식/텐션/예약 정보는 아래 요약 또는 신청
                        상세에서 확인하실 수 있습니다.
                      </p>

                      {/* 사용자 오해 방지를 위해 접수 핵심 정보만 노출 */}
                      {hasLinkedStringingApps && (
                        <div className="mt-3 space-y-1 text-xs text-success">
                          {linkedStringingApps.map((app) => (
                            <div
                              key={app.id}
                              className="flex flex-wrap items-center justify-between gap-2"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={badgeToneVariant(
                                    getApplicationStatusTone(app.status),
                                  )}
                                  className="px-1.5 py-0.5 text-[11px] font-medium"
                                >
                                  {app.status ?? "상태 미정"}
                                </Badge>
                                {app.createdAt && (
                                  <span>{formatDate(app.createdAt)}</span>
                                )}
                                <span>라인 {app.racketCount ?? 0}개</span>
                                {app.receptionLabel && (
                                  <span>· {app.receptionLabel}</span>
                                )}
                                {app.reservationLabel && (
                                  <span>· 예약 {app.reservationLabel}</span>
                                )}
                              </div>
                              {app.stringNames &&
                                app.stringNames.length > 0 && (
                                  <p className="text-[11px] text-success">
                                    스트링: {app.stringNames.join(", ")}
                                  </p>
                                )}
                              {app.tensionSummary && (
                                <p className="text-[11px] text-success">
                                  텐션: {app.tensionSummary}
                                </p>
                              )}
                              <Link
                                className="w-full bp-sm:w-auto"
                                href={getApplicationHref(app.id)}
                              >
                                <Button
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                >
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
                      <Link
                        className="w-full bp-sm:w-auto"
                        href={getApplicationHref(primaryStringingAppId)}
                      >
                        <Button
                          variant="outline"
                          className="border-border text-success dark:border-border dark:text-success dark:hover:bg-success/15 bg-transparent"
                        >
                          신청 상세 보기
                        </Button>
                      </Link>
                    )}

                    {primaryStringingAppId && (
                      <ServiceReviewCTA
                        applicationId={primaryStringingAppId}
                        userConfirmedAt={
                          primaryStringingApp?.userConfirmedAt ?? null
                        }
                        className="ml-2"
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div id="reviews-cta" className="mt-4">
              {allReviewed ? (
                <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4 shadow-sm dark:bg-primary/20 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between bp-sm:p-6">
                  <div className="flex items-center gap-3 text-primary">
                    <CheckCircle className="h-6 w-6" />
                    <div>
                      <p className="font-semibold text-foreground">
                        이 주문은 리뷰를 작성하였습니다.
                      </p>
                      <p className="text-sm text-foreground">
                        내가 작성한 리뷰를 확인할 수 있어요.
                      </p>
                    </div>
                  </div>
                  <Link
                    className="w-full bp-sm:w-auto"
                    href="/mypage?tab=reviews"
                  >
                    <Button
                      variant="outline"
                      className="border-border hover:bg-primary/10 dark:hover:bg-primary/20"
                    >
                      리뷰 관리로 이동
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="bg-warning/10 dark:bg-warning/15 border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between bp-sm:p-6">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-warning" />
                    <div>
                      <p className="font-semibold text-warning">
                        이 주문은 리뷰를 작성하지 않았습니다.
                      </p>
                      <p className="text-sm text-warning">
                        아래 ‘리뷰 작성하기’를 눌러 상품별로 리뷰를 남겨주세요.
                      </p>
                      {/* 방문 수령 주문은 배송완료 대신 수령 완료 문구로 안내 */}
                      <p className="text-sm text-destructive">
                        ※
                        {isVisitPickup
                          ? "상품을 구매확정하면 [리뷰 작성] 버튼이 나타납니다."
                          : "구매확정 후 [리뷰 작성] 버튼이 나타납니다."}
                      </p>
                    </div>
                  </div>
                  <OrderReviewCTA
                    orderId={orderDetail._id as string}
                    reviewAllDone={allReviewed}
                    unreviewedCount={
                      items.filter((it) => !reviewedMap[it.id]).length
                    }
                    reviewNextTargetProductId={firstUnreviewed?.id ?? null}
                    orderStatus={orderDetail.status}
                    userConfirmedAt={orderDetail.userConfirmedAt ?? null}
                    showOnlyWhenCompleted
                    loading={!reviewsReady}
                  />
                </div>
              )}
            </div>
          </>
        )}

        <div className="grid gap-6 bp-sm:gap-8 bp-lg:grid-cols-2">
          {/* 고객 정보 */}
          <Card variant="elevatedGradient">
            <CardHeader variant="sectionGradient">
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <span>주문자 정보</span>
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
                    postalCode: orderDetail.customer.postalCode || "",
                    addressDetail: orderDetail.customer.addressDetail || "",
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
                      <p className="font-semibold text-foreground">
                        {orderDetail.customer.name ?? "이름 없음"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">이메일</p>
                      <p className="font-semibold text-foreground">
                        {orderDetail.customer.email ?? "이메일 없음"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">전화번호</p>
                      <p className="font-semibold text-foreground">
                        {orderDetail.customer.phone ?? "전화번호 없음"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">주소</p>
                      <p className="font-semibold text-foreground">
                        {orderDetail.customer.address ?? "주소 없음"}
                      </p>
                      {orderDetail.customer.addressDetail && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {orderDetail.customer.addressDetail}
                        </p>
                      )}
                      {orderDetail.customer.postalCode && (
                        <p className="text-sm text-muted-foreground">
                          우편번호: {orderDetail.customer.postalCode}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
            {isEditMode && canUserEdit && !editingCustomer && (
              <CardFooter className="pt-3 flex justify-center bg-muted/50">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingCustomer(true)}
                  className="hover:bg-primary/10 dark:hover:bg-primary/20 border-border"
                >
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
                <span>
                  {getOrderDeliveryInfoTitle(orderDetail.shippingInfo)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 bp-sm:p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isVisitPickup ? "수령 방법" : "배송 방법"}
                    </p>
                    <p className="font-semibold text-foreground">
                      {shippingMethodLabel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      예상 수령일
                    </p>
                    <p className="font-semibold text-foreground">
                      {orderDetail.shippingInfo?.estimatedDate
                        ? formatDate(orderDetail.shippingInfo.estimatedDate)
                        : "미등록"}
                    </p>
                  </div>
                </div>

                {!showDeliveryOnlyFields && (
                  <p className="text-sm text-muted-foreground">
                    방문 수령 주문은 매장 안내에 따라 준비 완료 후 수령해주세요.
                  </p>
                )}

                {showDeliveryOnlyFields &&
                  orderDetail.shippingInfo.invoice?.trackingNumber && (
                    <>
                      <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            택배사
                          </p>
                          <p className="font-semibold text-foreground">
                            {{
                              cj: "CJ 대한통운",
                              hanjin: "한진택배",
                              logen: "로젠택배",
                              post: "우체국택배",
                              etc: "기타",
                            }[orderDetail.shippingInfo.invoice.courier] ||
                              "미지정"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            운송장 번호
                          </p>
                          <p className="font-semibold text-foreground">
                            {orderDetail.shippingInfo.invoice.trackingNumber}
                          </p>
                        </div>
                      </div>
                      {shouldShowTrackingSummarySkeleton && (
                        <div className="space-y-2 p-3 bg-muted rounded-lg">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-8 w-24" />
                        </div>
                      )}
                      {!isTrackingLoading && !trackingError && trackingData && (
                        <div className="space-y-2 p-3 bg-muted rounded-lg text-sm">
                          {trackingData.success && trackingData.supported ? (
                            <>
                              <p className="text-foreground">
                                <span className="text-muted-foreground">
                                  실시간 배송 상태:
                                </span>{" "}
                                {trackingData.displayStatus}
                              </p>
                              {trackingData.lastEvent?.locationName && (
                                <p className="text-foreground">
                                  <span className="text-muted-foreground">
                                    최근 위치:
                                  </span>{" "}
                                  {trackingData.lastEvent.locationName}
                                </p>
                              )}
                              {trackingData.lastEvent?.time && (
                                <p className="text-foreground">
                                  <span className="text-muted-foreground">
                                    최근 갱신:
                                  </span>{" "}
                                  {formatDateTime(trackingData.lastEvent.time)}
                                </p>
                              )}
                              {shouldShowTrackingStatusNotice && (
                                <div className="space-y-0.5 rounded-md bg-background/70 px-2.5 py-1.5 text-xs leading-relaxed text-muted-foreground">
                                  <p>실시간 배송 상태는 택배사 기준이며,</p>
                                  <p>주문 상태와 다를 수 있습니다.</p>
                                </div>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  window.open(
                                    trackingData.linkUrl,
                                    "_blank",
                                    "noopener,noreferrer",
                                  )
                                }
                              >
                                배송조회
                              </Button>
                            </>
                          ) : trackingData.success && !trackingData.supported ? (
                            <p className="text-muted-foreground">
                              {trackingData.message}
                            </p>
                          ) : (
                            <p className="text-destructive">
                              {getTrackingFailureMessage(trackingData)}
                            </p>
                          )}
                        </div>
                      )}
                      {trackingError && (
                        <p className="text-sm text-destructive">
                          {getTrackingErrorMessage(trackingData, trackingError)}
                        </p>
                      )}
                    </>
                  )}

                {shouldShowInboundShippingBlock && (
                  <div className="rounded-lg border border-border bg-primary/5 p-3 dark:bg-primary/10">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          라켓 발송 정보
                        </p>
                        <p className="text-xs text-muted-foreground">
                          매장으로 보내는 라켓의 택배 등록 상태를 확인할 수
                          있어요.
                        </p>
                      </div>
                      <Link
                        href={inboundShippingHref ?? "#"}
                      >
                        <Button size="sm" variant="outline" className="h-8">
                          {hasSelfShipTracking
                            ? "라켓 발송 수정"
                            : "라켓 발송 등록"}
                        </Button>
                      </Link>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-foreground bp-sm:grid-cols-2">
                      <p>
                        <span className="text-muted-foreground">상태:</span>{" "}
                        {selfShipStatusLabel}
                      </p>
                      <p>
                        <span className="text-muted-foreground">택배사:</span>{" "}
                        {selfShipCourierLabel}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          운송장 번호:
                        </span>{" "}
                        {selfShipTrackingNoLabel}
                      </p>
                      <p>
                        <span className="text-muted-foreground">발송일:</span>{" "}
                        {selfShipInfo?.shippedAt
                          ? formatDate(selfShipInfo.shippedAt)
                          : "미등록"}
                      </p>
                    </div>
                  </div>
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
                    {(() => {
                      const pay = getPaymentStatusBadgeSpec(
                        orderDetail.paymentStatus,
                      );
                      return (
                        <Badge
                          variant={pay.variant}
                          className={cn(badgeBase, badgeSizeSm)}
                        >
                          {orderDetail.paymentStatus}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <PaymentMethodDetail
                    method={orderDetail.paymentMethod || "무통장입금"}
                    bankKey={orderDetail.paymentBank ?? undefined}
                    depositor={orderDetail.shippingInfo?.depositor}
                    paymentProvider={orderDetail.paymentProvider}
                    easyPayProvider={orderDetail.paymentEasyPayProvider}
                    paymentStatus={orderDetail.paymentStatus}
                    paymentTid={orderDetail.paymentTid}
                    paymentNiceSync={orderDetail.paymentNiceSync}
                  />
                </div>

                <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">결제 금액</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(orderDetail.total)}
                    </p>
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
                  <div
                    key={idx}
                    className="flex items-center p-4 bg-muted rounded-xl hover:bg-muted dark:hover:bg-card transition-colors space-x-4"
                  >
                    {/* 상품 썸네일 */}
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}

                    {/* 상품명 + 수량 */}
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">
                        {item.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        수량: {item.quantity}개
                      </p>
                    </div>

                    {/* 가격 및 소계 */}
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(item.price)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        소계: {formatCurrency(item.price * item.quantity)}
                      </p>
                      <div className="mt-2">
                        {canShowReviewCTA &&
                          (reviewedMap[item.id] ? (
                            <Link
                              className="w-full bp-sm:w-auto"
                              href={`/products/${item.id}?tab=reviews`}
                            >
                              <Button size="sm" variant="secondary">
                                리뷰 상세 보기
                              </Button>
                            </Link>
                          ) : (
                            <Link
                              className="w-full bp-sm:w-auto"
                              href={`/reviews/write?productId=${item.id}&orderId=${orderDetail._id}`}
                            >
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
        {showDeliveryOnlyFields && (
          <Card variant="elevatedGradient">
            <CardHeader variant="sectionGradient">
              <CardTitle>배송 요청사항</CardTitle>
              <CardDescription>
                결제 시 입력한 배송 관련 요청사항입니다.
              </CardDescription>
            </CardHeader>
            {editingRequest ? (
              <CardContent className="p-4 bp-sm:p-6">
                <RequestEditForm
                  initialData={orderDetail.shippingInfo.deliveryRequest || ""}
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
                  <div className="bg-muted border border-border rounded-lg p-4">
                    <p className="text-foreground whitespace-pre-line">
                      {orderDetail.shippingInfo.deliveryRequest}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">
                    요청사항이 입력되지 않았습니다.
                  </p>
                )}
              </CardContent>
            )}
            {isEditMode && canUserEdit && !editingRequest && (
              <CardFooter className="flex justify-center bg-muted/50">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingRequest(true)}
                  className="hover:bg-warning/10 dark:hover:bg-warning/15 border-border"
                >
                  요청사항 수정
                </Button>
              </CardFooter>
            )}
          </Card>
        )}

        {/* 처리 이력 */}
        <OrderHistory
          orderId={orderId}
          shippingMethod={shippingMethodValue}
        />

        {/* 취소 다이얼로그는 실제 요청 시점에만 mount */}
        {cancelDialogOpen && orderDetail?._id ? (
          <CancelOrderDialog
            orderId={String(orderDetail._id)}
            open={cancelDialogOpen}
            onOpenChange={setCancelDialogOpen}
            onSuccess={async () => {
              await mutateOrderDetail();
            }}
          />
        ) : null}
      </SiteContainer>
    </main>
  );
}
