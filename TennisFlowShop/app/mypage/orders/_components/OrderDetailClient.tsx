"use client";

import CustomerEditForm from "@/app/features/orders/components/CustomerEditForm";
import OrderHistory from "@/app/features/orders/components/OrderHistory";
import { NextTodoCallout } from "@/app/mypage/_components/OrdersScopeContextNav";
import { OrderStatusBadge } from "./OrderStatusBadge";
import PaymentMethodDetail from "@/app/mypage/orders/_components/PaymentMethodDetail";
import RequestEditForm from "@/app/mypage/orders/_components/RequestEditForm";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero, SummaryCard } from "@/components/public";
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
import { isMountableStringItem } from "@/lib/orders/string-mounting-policy";
import { cn } from "@/lib/utils";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import { formatKoreanPhone } from "@/lib/phone";
import { getCourierDisplayName } from "@/lib/shipping/courier-map";
import {
  ArrowRight,
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
import { useRouter, useSearchParams } from "next/navigation";
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
    if (data && typeof data.message === "string" && data.message.trim()) return data.message;
    if (data && typeof data.error === "string" && data.error.trim()) return data.error;
  }

  const text = await res.text().catch(() => "");
  return text.trim() || fallback;
};

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
  selectedStringName?: string | null;
  stringPrice?: number | null;
  selectedGauge?: string;
  selectedColor?: string;
  selectedColorLabel?: string;
  selectedColorHex?: string;
  mountingFee?: number; // 장착 서비스 대상 스트링이면 서버에서 내려오는 필드 (없으면 undefined)
  isMountableString?: boolean;
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
  paymentCardDisplayName?: string | null;
  paymentCardCompany?: string | null;
  paymentCardLabel?: string | null;
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
    updatedAt?: string | null;
    collectionMethod?: string | null;
    preferredDate?: string | null;
    preferredTime?: string | null;
    needsInboundTracking?: boolean;
    racketCount?: number;
    receptionLabel?: string;
    tensionSummary?: string | null;
    stringNames?: string[];
    reservationLabel?: string | null;
    totalPrice?: number | null;
    requirements?: string | null;
    lines?: Array<{
      id?: string | null;
      racketType?: string | null;
      racketLabel?: string | null;
      stringName?: string | null;
      tensionMain?: string | null;
      tensionCross?: string | null;
      gauge?: string | null;
      color?: string | null;
      colorLabel?: string | null;
      note?: string | null;
    }>;
    shippingInfo?: {
      collectionMethod?: string | null;
      deliveryRequest?: string | null;
      selfShip?: {
        courier?: string | null;
        trackingNo?: string | null;
        shippedAt?: string | null;
        note?: string | null;
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

const getTrackingFailureMessage = (
  tracking: Extract<OrderTrackingResponse, { success: false }>,
) => {
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

type TimelineStepState = "done" | "active" | "waiting";

type TimelineStep = {
  title: string;
  description: string;
  state: TimelineStepState;
};

const paymentDoneKeywords = ["paid", "결제완료", "결제 완료", "완료"];

const getTimelineStateLabel = (state: TimelineStepState) => {
  if (state === "done") return "완료";
  if (state === "active") return "진행 중";
  return "대기";
};

const getTimelineStepTone = (state: TimelineStepState) => {
  if (state === "done") {
    return {
      wrapper: "border border-success/30 bg-success/10 text-success",
      badge: "bg-success/15 text-success",
      Icon: CheckCircle,
    };
  }
  if (state === "active") {
    return {
      wrapper: "border border-primary/30 bg-primary/10 text-primary",
      badge: "bg-primary/15 text-primary",
      Icon: Clock,
    };
  }
  return {
    wrapper: "border border-border bg-muted/50 text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
    Icon: Clock,
  };
};

export default function OrderDetailClient({
  orderId,
  backUrl,
  linkedApplicationHrefBuilder,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedBackUrl = backUrl ?? "/mypage?tab=orders";
  const resolvedBackQuery = new URLSearchParams(resolvedBackUrl.split("?")[1] ?? "");
  const resolvedScope = resolvedBackQuery.get("scope");
  const flowScopeQuery = resolvedScope ? `&scope=${encodeURIComponent(resolvedScope)}` : "";

  // 편집 모드 전체 토글
  const [isEditMode, setIsEditMode] = useState(false);
  // 고객 정보 편집
  const [editingCustomer, setEditingCustomer] = useState(false);
  // 배송 요청사항 편집
  const [editingRequest, setEditingRequest] = useState(false);

  // 취소 철회 로딩
  const [isWithdrawingCancelRequest, setIsWithdrawingCancelRequest] = useState(false);
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

  useEffect(() => {
    if (searchParams.get("focus") !== "stringing") return;
    const target = document.getElementById("stringing-service");
    if (!target) return;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [searchParams, orderDetail?._id]);

  // 상품 리뷰 작성 여부 맵: { [productId]: boolean }
  const [reviewedMap, setReviewedMap] = useState<Record<string, boolean>>({});

  // 완료 상태
  const isVisitPickup = isVisitPickupOrder(orderDetail?.shippingInfo);
  const showDeliveryOnlyFields = shouldShowDeliveryOnlyFields(orderDetail?.shippingInfo);

  // 관리자 상세와 동일하게 shippingMethod -> deliveryMethod 순으로 읽고
  // 공용 정규화 유틸로 라벨을 만든다.
  const shippingMethodValue =
    orderDetail?.shippingInfo?.shippingMethod ?? (orderDetail?.shippingInfo as any)?.deliveryMethod;
  const shippingMethodLabel = orderShippingMethodLabel(shippingMethodValue);
  const displayOrderStatusLabel = getOrderStatusLabelForDisplay(
    getCommonOrderStatusLabel(orderDetail?.status ?? "") ?? orderDetail?.status ?? "",
    orderDetail?.shippingInfo,
  ).trim();
  const shouldShowTrackingSummarySkeleton = isTrackingLoading && !trackingData && !trackingError;
  const shouldShowTrackingStatusNotice = Boolean(
    trackingData &&
    trackingData.success &&
    trackingData.supported &&
    trackingData.displayStatus &&
    trackingData.displayStatus.trim() !== displayOrderStatusLabel,
  );

  const canShowReviewCTA =
    Boolean(orderDetail?.userConfirmedAt) || orderDetail?.status === "구매확정";
  const canConfirmPurchase = getCommonOrderStatusLabel(orderDetail?.status ?? "") === "배송완료";
  const reviewsReady = (orderDetail?.items ?? []).every((it) => it.id in reviewedMap);

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
  const allReviewed = items.length > 0 && items.every((it) => reviewedMap[it.id]);
  const firstUnreviewed = items.find((it) => !reviewedMap[it.id]);
  // 편집 가능 상태: 배송 중/완료/환불/취소가 아니어야 함
  const nonEditableStatuses = ["배송중", "배송완료", "환불", "취소"];
  const canUserEdit = !nonEditableStatuses.includes(orderDetail?.status ?? "");
  // 이력 페이지를 합쳐서 하나의 배열로
  const allHistory: any[] = historyPages ? historyPages.flatMap((page: any) => page.history) : [];

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
    .filter((item) => isMountableStringItem(item))
    .reduce((sum, item) => sum + (item.quantity ?? 1), 0);

  // remainingSlots 파생값
  const totalSlots = orderDetail.stringService?.totalSlots ?? stringServiceItemCount;
  const usedSlots =
    orderDetail.stringService?.usedSlots ??
    totalSlots - (orderDetail.stringService?.remainingSlots ?? 0);
  const remainingSlots =
    orderDetail.stringService?.remainingSlots ?? Math.max(totalSlots - usedSlots, 0);

  // 이 주문과 연결된 신청서 요약 리스트
  const linkedStringingApps = orderDetail?.stringingApplications ?? [];
  const hasLinkedStringingApps = linkedStringingApps.length > 0;
  const hasSubmittedStringingApplication =
    hasLinkedStringingApps ||
    Boolean(orderDetail?.stringingApplicationId) ||
    orderDetail?.isStringServiceApplied === true;
  const serviceLinkedOrder =
    Boolean(orderDetail?.shippingInfo?.withStringService) || hasSubmittedStringingApplication;

  // 리뷰/링크에 사용할 대표 신청 ID
  // - API 계약: stringingApplicationId는 최신 신청서(updatedAt/createdAt desc)
  // - 하위 호환 fallback: 요약 리스트 첫 원소(동일 정렬 계약)
  const primaryStringingAppId =
    orderDetail?.stringingApplicationId ??
    (hasLinkedStringingApps ? linkedStringingApps[0].id : undefined);

  const primaryStringingApp = hasLinkedStringingApps ? linkedStringingApps[0] : undefined;
  const isOrderCanceled = orderDetail.status === "취소";
  const isPrimaryStringingAppCanceled = primaryStringingApp?.status === "취소";
  const getApplicationHref = (applicationId: string) => {
    if (linkedApplicationHrefBuilder) return linkedApplicationHrefBuilder(applicationId);
    return `/mypage?tab=orders&flowType=application&flowId=${applicationId}&from=orders${flowScopeQuery}`;
  };
  const shouldShowInboundShippingBlock = Boolean(
    primaryStringingAppId &&
    primaryStringingApp?.needsInboundTracking === true &&
    !isPrimaryStringingAppCanceled,
  );
  const inboundShippingHref = primaryStringingAppId
    ? `/services/applications/${primaryStringingAppId}/shipping?${new URLSearchParams({ return: `/mypage?tab=orders&flowType=order&flowId=${orderId}&from=orders${flowScopeQuery}` }).toString()}`
    : null;
  const selfShipInfo = primaryStringingApp?.shippingInfo?.selfShip ?? null;
  const hasSelfShipTracking = Boolean(selfShipInfo?.trackingNo);
  const selfShipStatusLabel = hasSelfShipTracking ? "등록 완료" : "미등록";
  const selfShipCourierValue = selfShipInfo?.courier?.trim();
  const selfShipCourierLabel = selfShipCourierValue
    ? getCourierDisplayName(selfShipCourierValue)
    : "미등록";
  const selfShipTrackingNoLabel = selfShipInfo?.trackingNo?.trim() || "미등록";

  // 취소 요청 상태/라벨 계산
  const normalizedStatus = String(orderDetail?.status ?? "")
    .trim()
    .toLowerCase();
  const rawPaymentStatus = String(orderDetail?.paymentStatus ?? "").trim();
  const normalizedPaymentStatus = rawPaymentStatus.toLowerCase();
  const paymentLabel = getCommonOrderStatusLabel(rawPaymentStatus) ?? rawPaymentStatus;

  const receivedDone = Boolean(orderDetail?.date);
  const paymentDone = paymentDoneKeywords.some(
    (keyword) => normalizedPaymentStatus.includes(keyword) || paymentLabel.includes(keyword),
  );
  const isPreparing = ["processing", "preparing", "배송준비", "배송준비중", "처리중"].some(
    (keyword) => normalizedStatus.includes(keyword),
  );
  const isShipped = ["shipped", "배송중"].some((keyword) => normalizedStatus.includes(keyword));
  const isDelivered = ["delivered", "배송완료"].some((keyword) =>
    normalizedStatus.includes(keyword),
  );
  const isCompleted =
    Boolean(orderDetail?.userConfirmedAt) ||
    ["confirmed", "completed", "구매확정"].some((keyword) => normalizedStatus.includes(keyword));

  const timelineSteps: TimelineStep[] = [
    {
      title: "주문 접수",
      description: "주문이 정상적으로 접수되었습니다.",
      state: receivedDone ? "done" : "waiting",
    },
    {
      title: "결제 확인",
      description: "결제 상태를 확인하고 다음 절차를 준비합니다.",
      state: paymentDone ? "done" : receivedDone ? "active" : "waiting",
    },
    {
      title: "상품 준비",
      description: "주문 상품을 출고 또는 수령 준비 상태로 진행합니다.",
      state:
        isShipped || isDelivered || isCompleted
          ? "done"
          : paymentDone || isPreparing
            ? "active"
            : "waiting",
    },
    {
      title: isVisitPickup
        ? "방문 수령 준비"
        : serviceLinkedOrder
          ? "완성 라켓 배송 진행"
          : "배송 진행",
      description: isVisitPickup
        ? "방문 수령 준비 상태와 수령정보를 확인해주세요."
        : serviceLinkedOrder
          ? "완성 라켓 배송정보를 확인해주세요."
          : "배송정보를 확인해주세요.",
      state: isDelivered || isCompleted ? "done" : isShipped ? "active" : "waiting",
    },
    {
      title: "완료/구매확정",
      description: "주문 이용이 마무리된 단계입니다.",
      state: isCompleted ? "done" : isDelivered ? "active" : "waiting",
    },
  ];

  const shouldShowStringingTimelineHint = Boolean(
    orderDetail?.shippingInfo?.withStringService || primaryStringingAppId,
  );
  const cancelLabel = getCancelRequestLabel(orderDetail);
  const cancelStatus = (orderDetail as any)?.cancelRequest?.status;
  const canWithdrawCancelRequest = cancelStatus === "requested";
  const handleConfirmPurchase = async () => {
    if (!orderDetail?._id || isConfirmingPurchase) return;
    if (!window.confirm("구매확정 처리하시겠습니까?\n확정 후에는 되돌릴 수 없습니다.")) {
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
        showErrorToast(data?.error || data?.message || "구매확정 처리 중 오류가 발생했습니다.");
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
  const nextTodo: {
    label: string;
    ctaLabel: string;
    ctaHref?: string;
    onCtaClick?: () => void;
    description?: string;
  } | null =
    shouldShowInboundShippingBlock && inboundShippingHref && !hasSelfShipTracking
      ? {
          label: "라켓 발송 운송장 등록이 필요합니다.",
          description: "보유 라켓을 매장으로 보내고 라켓 발송 운송장을 등록해주세요.",
          ctaLabel: "라켓 발송 운송장 등록",
          ctaHref: inboundShippingHref,
        }
      : canConfirmPurchase
        ? {
            label: serviceLinkedOrder
              ? "상품을 받으셨다면 구매확정을 진행해주세요."
              : "구매확정이 필요합니다.",
            description: serviceLinkedOrder
              ? "완성 라켓 배송이 완료되었습니다. 상품을 받으셨다면 구매확정을 진행해주세요."
              : "상품을 받으셨다면 구매확정을 진행해주세요.",
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
      const timeout = window.setTimeout(() => controller.abort(), WITHDRAW_TIMEOUT_MS);

      let res: Response;
      try {
        res = await fetch(`/api/orders/${orderDetail._id}/cancel-request-withdraw`, {
          method: "POST",
          credentials: "include",
          signal: controller.signal,
        });
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
            res = await fetch(`/api/orders/${orderDetail._id}/cancel-request-withdraw`, {
              method: "POST",
              credentials: "include",
              headers: { "x-suppress-auth-expired": "1" },
              signal: retryController.signal,
            });
          } finally {
            window.clearTimeout(retryTimeout);
          }
        }
      }

      if (!res.ok) {
        throw new Error(await parseApiMessage(res, "취소 요청 철회 중 오류가 발생했습니다."));
      }

      // SWR 캐시 갱신: 상태, 이력, 마이페이지 목록, 상세 모두 재검증
      await Promise.all([
        mutateOrderDetail(),
        mutateHistory(),
        mutate(
          (key) =>
            typeof key === "string" && key.startsWith(`/api/orders/${orderDetail._id}/history`),
          undefined,
          { revalidate: true },
        ),
        mutate(
          (key) => typeof key === "string" && key.startsWith("/api/users/me/orders"),
          undefined,
          { revalidate: true },
        ),
      ]);

      showSuccessToast("취소 요청이 정상적으로 철회되었습니다.");
    } catch (err) {
      console.error(err);
      if (err instanceof DOMException && err.name === "AbortError") {
        showErrorToast("요청 시간이 초과되었습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.");
      } else {
        showErrorToast((err as Error).message || "취소 요청 철회 중 오류가 발생했습니다.");
      }
    } finally {
      setIsWithdrawingCancelRequest(false);
    }
  };

  return (
    <main className="w-full">
      <PublicPageHero
        eyebrow="마이페이지"
        title="주문 상세"
        description="주문번호, 주문 상태, 다음 해야 할 일을 한눈에 확인할 수 있습니다."
        className="rounded-2xl border border-border bg-card py-6 shadow-sm bp-sm:py-8"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(backUrl ?? "/mypage?tab=orders")}
              className="h-9 w-full overflow-hidden whitespace-nowrap border-border bg-background hover:border-primary/30 bp-sm:w-auto"
            >
              <span className="bp-sm:hidden">목록</span>
              <span className="hidden bp-sm:inline">주문 목록으로 돌아가기</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <Button
              variant={isEditMode ? "destructive" : "outline"}
              size="sm"
              onClick={() => setIsEditMode((m) => !m)}
              disabled={!canUserEdit}
              className={cn(
                "h-9 w-full whitespace-nowrap bp-sm:w-auto",
                !isEditMode &&
                  "border-border bg-background hover:bg-primary/10 dark:hover:bg-primary/20",
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
                className="h-9 w-full overflow-hidden whitespace-nowrap bp-sm:w-auto"
              >
                주문 취소 요청
              </Button>
            )}
          </>
        }
      >
        <div className="flex w-full flex-col gap-4 rounded-2xl border border-border bg-background/70 p-4 bp-sm:p-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="shrink-0 rounded-xl border border-border bg-muted/40 p-3">
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="break-keep text-ui-body-sm font-medium text-foreground">
                {hasLinkedStringingApps || orderDetail.shippingInfo?.withStringService
                  ? "스트링 구매 + 교체서비스"
                  : "상품 주문"}
              </p>
              <p className="break-all text-ui-body-sm text-muted-foreground" title={orderId}>
                주문번호: #{orderId.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 bp-sm:grid-cols-2 bp-xl:grid-cols-4">
            <SummaryCard
              className="rounded-xl bg-muted/20 shadow-none"
              contentClassName="p-3 bp-sm:p-4"
            >
              <div className="mb-2 flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-ui-body-sm font-medium text-foreground">주문일시</span>
              </div>
              <p className="break-keep text-ui-body font-semibold tabular-nums text-foreground bp-sm:text-ui-card-title-lg">
                {formatDate(orderDetail.date)}
              </p>
            </SummaryCard>

            <SummaryCard
              className="rounded-xl bg-muted/20 shadow-none"
              contentClassName="p-3 bp-sm:p-4"
            >
              <div className="mb-2 flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-ui-body-sm font-medium text-foreground">총 결제금액</span>
              </div>
              <p className="break-keep text-ui-body font-semibold tabular-nums text-foreground bp-sm:text-ui-card-title-lg">
                {formatCurrency(orderDetail.total)}
              </p>
            </SummaryCard>

            <SummaryCard
              className="rounded-xl bg-muted/20 shadow-none"
              contentClassName="p-3 bp-sm:p-4"
            >
              <div className="mb-2 flex items-center space-x-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span className="text-ui-body-sm font-medium text-foreground">대표 상품</span>
              </div>
              <p className="line-clamp-2 min-w-0 break-keep text-ui-body font-semibold text-foreground bp-sm:text-ui-card-title-lg">
                {orderDetail.items?.[0]?.name ?? "주문 상품"}
                {orderDetail.items.length > 1 ? ` 외 ${orderDetail.items.length - 1}건` : ""}
              </p>
            </SummaryCard>

            <SummaryCard
              className="rounded-xl bg-muted/20 shadow-none"
              contentClassName="p-3 bp-sm:p-4"
            >
              <div className="mb-2 flex items-center space-x-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-ui-body-sm font-medium text-foreground">주문 상태</span>
              </div>
              <OrderStatusBadge
                orderId={orderId}
                initialStatus={orderDetail.status}
                shippingMethod={orderDetail.shippingInfo}
              />
            </SummaryCard>
          </div>
        </div>
      </PublicPageHero>

      <SiteContainer
        variant="wide"
        className="space-y-4 px-0 py-4 bp-sm:space-y-5 bp-sm:px-4 bp-sm:py-5 bp-md:px-6 bp-lg:px-0"
      >
        {nextTodo && (
          <NextTodoCallout
            label={nextTodo.label}
            ctaLabel={nextTodo.ctaLabel}
            ctaHref={nextTodo.ctaHref}
            onCtaClick={nextTodo.onCtaClick}
            description={nextTodo.description}
          />
        )}
        {/* 취소 요청 상태 안내 배너 */}
        {cancelLabel && (
          <div className="mb-4 flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between rounded-lg border border-border bg-muted px-4 py-3 text-ui-body-sm text-foreground">
            <span className="min-w-0 break-words">{cancelLabel}</span>

            {canWithdrawCancelRequest && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleWithdrawCancelRequest}
                disabled={isWithdrawingCancelRequest}
                className="h-9 w-full gap-1.5 overflow-hidden whitespace-nowrap bp-sm:ml-4 bp-sm:w-auto"
              >
                <Undo2 className="h-4 w-4" />
                {isWithdrawingCancelRequest ? "취소 철회 중..." : "취소 요청 철회"}
              </Button>
            )}
          </div>
        )}
        {(orderDetail.shippingInfo?.withStringService || hasLinkedStringingApps) && (
          <section id="stringing-service" className="scroll-mt-24 space-y-4">
            <Card className="rounded-2xl border border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/30 rounded-t-xl">
                <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                  <div>
                    <CardTitle>교체서비스 정보</CardTitle>
                    <CardDescription>
                      이 주문과 연결된 교체서비스 진행 상태입니다. 보유 라켓 발송이 필요한 경우 이곳에서
                      라켓 발송 운송장을 등록할 수 있습니다.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">주문</Badge>
                    {hasLinkedStringingApps ? (
                      <Badge variant="secondary">교체서비스 연결</Badge>
                    ) : null}
                    {shouldShowInboundShippingBlock && !hasSelfShipTracking ? (
                      <Badge variant="destructive">라켓 발송 운송장 등록 필요</Badge>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4 bp-sm:p-6">
                {hasLinkedStringingApps ? (
                  linkedStringingApps.map((app, appIndex) => {
                    const appSelfShipInfo = app.shippingInfo?.selfShip ?? null;
                    const appHasTracking = Boolean(appSelfShipInfo?.trackingNo);
                    const isApplicationCanceled = app.status === "취소";
                    const appNeedsTracking =
                      !isApplicationCanceled && app.needsInboundTracking === true;
                    const appShippingHref = `/services/applications/${app.id}/shipping?${new URLSearchParams({ return: `/mypage?tab=orders&flowType=order&flowId=${orderId}&from=orders${flowScopeQuery}&focus=stringing` }).toString()}`;
                    const lines = app.lines ?? [];
                    const fallbackLine = {
                      id: `${app.id}-summary`,
                      racketLabel: null,
                      racketType: null,
                      stringName: app.stringNames?.join(", ") || null,
                      tensionMain: app.tensionSummary ?? null,
                      tensionCross: null,
                      gauge: null,
                      color: null,
                      colorLabel: null,
                      note: app.requirements ?? null,
                    };
                    const displayLines = lines.length > 0 ? lines : [fallbackLine];
                    const isMultipleLines = displayLines.length > 1;
                    const reservationLabel =
                      app.reservationLabel ??
                      (app.preferredDate && app.preferredTime
                        ? `${app.preferredDate} ${app.preferredTime}`
                        : "예약 불필요");

                    return (
                      <div
                        key={app.id}
                        className="rounded-2xl border border-border bg-muted/30 p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant={badgeToneVariant(getApplicationStatusTone(app.status))}
                                className="px-2 py-0.5 text-ui-label font-medium"
                              >
                                {app.status ?? "상태 미정"}
                              </Badge>
                              <span className="text-ui-body-sm font-semibold text-foreground">
                                {app.receptionLabel ?? "접수 방식 확인 중"}
                              </span>
                              {linkedStringingApps.length > 1 ? (
                                <span className="text-ui-label text-muted-foreground">
                                  신청 {appIndex + 1}
                                </span>
                              ) : null}
                            </div>
                            <div className="grid gap-2 text-ui-body-sm text-foreground bp-sm:grid-cols-2">
                              <p>
                                <span className="text-muted-foreground">희망 일시:</span>{" "}
                                {reservationLabel}
                              </p>
                              <p>
                                <span className="text-muted-foreground">라켓 수:</span>{" "}
                                {app.racketCount ?? displayLines.length}자루
                              </p>
                              <p>
                                <span className="text-muted-foreground">신청 금액:</span>{" "}
                                {typeof app.totalPrice === "number"
                                  ? formatCurrency(app.totalPrice)
                                  : "확인 중"}
                              </p>
                              <p>
                                <span className="text-muted-foreground">최근 업데이트:</span>{" "}
                                {app.updatedAt ? formatDate(app.updatedAt) : "-"}
                              </p>
                            </div>
                          </div>
                          {appNeedsTracking && !appHasTracking ? (
                            <Button asChild size="sm" className="w-full shrink-0 bp-sm:w-auto">
                              <Link href={appShippingHref}>라켓 발송 운송장 등록</Link>
                            </Button>
                          ) : null}
                        </div>

                        <div className="mt-4 space-y-3">
                          <p className="text-ui-body-sm font-semibold text-foreground">라켓 정보</p>
                          <div className="grid gap-3 bp-md:grid-cols-2">
                            {displayLines.map((line, lineIndex) => {
                              const racketLabel =
                                line.racketLabel || line.racketType || "라켓명 미입력";
                              const normalizedRacketLabel =
                                racketLabel && racketLabel !== "라켓명 미입력" ? racketLabel : null;
                              const racketCardTitle = normalizedRacketLabel ?? "라켓 정보";
                              const stringName =
                                line.stringName ||
                                app.stringNames?.join(", ") ||
                                "스트링명 확인 중";
                              const tensionMain = line.tensionMain || app.tensionSummary || "-";
                              const tensionCross = line.tensionCross || line.tensionMain || null;
                              const requestNote = line.note || app.requirements || null;
                              return (
                                <div
                                  key={line.id ?? `${app.id}-${lineIndex}`}
                                  className="rounded-lg border border-border/70 bg-card p-3 text-ui-body-sm"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="line-clamp-1 break-keep font-medium text-foreground">
                                        {racketCardTitle}
                                      </p>
                                      {isMultipleLines ? (
                                        <p className="text-ui-label text-muted-foreground">
                                          {lineIndex + 1}번째 라켓
                                        </p>
                                      ) : null}
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="max-w-[14rem] shrink-0 whitespace-normal break-keep text-left text-ui-micro leading-snug"
                                    >
                                      {stringName}
                                    </Badge>
                                  </div>
                                  <dl className="mt-3 space-y-2 text-foreground">
                                    <div className="flex gap-2">
                                      <dt className="w-20 shrink-0 text-muted-foreground">
                                        라켓명
                                      </dt>
                                      <dd className="min-w-0 break-words">{racketLabel}</dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="w-20 shrink-0 text-muted-foreground">
                                        스트링
                                      </dt>
                                      <dd className="min-w-0 break-words">{stringName}</dd>
                                    </div>
                                    {line.gauge || line.colorLabel || line.color ? (
                                      <div className="flex gap-2">
                                        <dt className="w-20 shrink-0 text-muted-foreground">
                                          옵션
                                        </dt>
                                        <dd className="min-w-0 break-words">
                                          {line.gauge
                                            ? `게이지 ${formatGaugeLabel(line.gauge)}`
                                            : "게이지 -"}
                                          {" / 색상 "}
                                          {line.colorLabel || line.color || "-"}
                                        </dd>
                                      </div>
                                    ) : null}
                                    <div className="flex gap-2">
                                      <dt className="w-20 shrink-0 text-muted-foreground">텐션</dt>
                                      <dd>
                                        메인 {tensionMain}
                                        {tensionCross ? ` / 크로스 ${tensionCross}` : ""}
                                      </dd>
                                    </div>
                                    {requestNote ? (
                                      <div className="flex gap-2">
                                        <dt className="w-20 shrink-0 text-muted-foreground">
                                          요청사항
                                        </dt>
                                        <dd className="min-w-0 whitespace-pre-wrap break-words">
                                          {requestNote}
                                        </dd>
                                      </div>
                                    ) : null}
                                  </dl>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {appNeedsTracking ? (
                          <div className="mt-4 rounded-lg border border-border bg-primary/5 p-3 text-ui-body-sm dark:bg-primary/10">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-foreground">라켓 발송 정보</p>
                                <p className="mt-1 text-muted-foreground">
                                  상태: {appHasTracking ? "등록 완료" : "미등록"}
                                </p>
                              </div>
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-8 w-full bg-transparent bp-sm:w-auto"
                              >
                                <Link href={appShippingHref}>
                                  {appHasTracking ? "라켓 발송 운송장 수정" : "라켓 발송 운송장 등록"}
                                </Link>
                              </Button>
                            </div>
                            <div className="mt-3 grid gap-2 bp-sm:grid-cols-2">
                              <p>
                                <span className="text-muted-foreground">택배사:</span>{" "}
                                {appSelfShipInfo?.courier?.trim()
                                  ? getCourierDisplayName(appSelfShipInfo.courier)
                                  : "미등록"}
                              </p>
                              <p>
                                <span className="text-muted-foreground">운송장 번호:</span>{" "}
                                {appSelfShipInfo?.trackingNo?.trim() || "미등록"}
                              </p>
                              <p>
                                <span className="text-muted-foreground">발송일:</span>{" "}
                                {appSelfShipInfo?.shippedAt
                                  ? formatDate(appSelfShipInfo.shippedAt)
                                  : "미등록"}
                              </p>
                              {appSelfShipInfo?.note ? (
                                <p>
                                  <span className="text-muted-foreground">메모:</span>{" "}
                                  {appSelfShipInfo.note}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-3 text-right">
                          <Link
                            href={getApplicationHref(app.id)}
                            className="text-ui-label text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                          >
                            교체서비스 신청 내용 보기
                          </Link>
                        </div>
                      </div>
                    );
                  })
                ) : !isOrderCanceled && totalSlots > 0 && remainingSlots > 0 ? (
                  <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-warning dark:bg-warning/15">
                    <p className="font-semibold">이 주문은 교체서비스 신청 대상입니다.</p>
                    <p className="mt-1 text-ui-body-sm">
                      총 {totalSlots}개 중 <strong>{usedSlots}</strong>개를 사용했으며, 남은 교체
                      가능 스트링은 <strong>{remainingSlots}</strong>개입니다.
                    </p>
                    <Button asChild className="mt-4 w-full bp-sm:w-auto">
                      <Link href={`/services/apply?orderId=${orderDetail._id}`}>
                        {hasSubmittedStringingApplication
                          ? "교체서비스 추가 신청하기"
                          : "교체서비스 신청하기"}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-ui-body-sm text-muted-foreground">
                    연결된 교체서비스 신청 정보를 확인 중입니다.
                  </div>
                )}

                {primaryStringingAppId ? (
                  <ServiceReviewCTA
                    applicationId={primaryStringingAppId}
                    userConfirmedAt={primaryStringingApp?.userConfirmedAt ?? null}
                  />
                ) : null}
              </CardContent>
            </Card>
          </section>
        )}

        <div id="reviews-cta" className="mt-4">
          {serviceLinkedOrder ? (
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-ui-body-sm text-muted-foreground">
              이 이용 건은 교체서비스 이용 경험에 대한 서비스 리뷰를 작성할 수 있습니다.
            </div>
          ) : allReviewed ? (
            <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4 shadow-sm dark:bg-primary/20 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between bp-sm:p-6">
              <div className="flex items-center gap-3 text-primary">
                <CheckCircle className="h-6 w-6" />
                <div>
                  <p className="font-semibold text-foreground">이 주문은 리뷰를 작성하였습니다.</p>
                  <p className="text-ui-body-sm text-foreground">
                    내가 작성한 리뷰를 확인할 수 있어요.
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                className="w-full border-border hover:bg-primary/10 dark:hover:bg-primary/20 bp-sm:w-auto"
              >
                <Link href="/mypage?tab=reviews">리뷰 관리로 이동</Link>
              </Button>
            </div>
          ) : (
            <div className="bg-warning/10 dark:bg-warning/15 border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between bp-sm:p-6">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-warning" />
                <div>
                  <p className="font-semibold text-warning">
                    이 주문은 리뷰를 작성하지 않았습니다.
                  </p>
                  <p className="text-ui-body-sm text-warning">
                    아래 ‘리뷰 작성하기’를 눌러 상품별로 리뷰를 남겨주세요.
                  </p>
                  {/* 방문 수령 주문은 배송완료 대신 수령 완료 문구로 안내 */}
                  <p className="text-ui-body-sm text-destructive">
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
                unreviewedCount={items.filter((it) => !reviewedMap[it.id]).length}
                reviewNextTargetProductId={firstUnreviewed?.id ?? null}
                orderStatus={orderDetail.status}
                userConfirmedAt={orderDetail.userConfirmedAt ?? null}
                showOnlyWhenCompleted
                serviceLinkedOrder={serviceLinkedOrder}
                loading={!reviewsReady}
              />
            </div>
          )}
        </div>

        <div className="grid gap-4 bp-sm:gap-6 bp-lg:grid-cols-2">
          {/* 고객 정보 */}
          <Card variant="elevatedGradient">
            <CardHeader variant="sectionGradient">
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <span>주문자 정보</span>
              </CardTitle>
            </CardHeader>
            {editingCustomer ? (
              <CardContent className="p-4 bp-lg:p-6">
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
              <CardContent className="p-4 bp-lg:p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-ui-body-sm text-foreground/80">이름</p>
                      <p className="font-semibold text-foreground">
                        {orderDetail.customer.name ?? "이름 없음"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-ui-body-sm text-foreground/80">이메일</p>
                      <p className="break-words font-semibold text-foreground">
                        {orderDetail.customer.email ?? "이메일 없음"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-ui-body-sm text-foreground/80">전화번호</p>
                      <p className="font-semibold text-foreground">
                        {formatKoreanPhone(orderDetail.customer.phone) || "전화번호 없음"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="min-w-0">
                      <p className="text-ui-body-sm text-foreground/80">주소</p>
                      <p className="break-words font-semibold text-foreground">
                        {orderDetail.customer.address ?? "주소 없음"}
                      </p>
                      {orderDetail.customer.addressDetail && (
                        <p className="text-ui-body-sm text-foreground/80 mt-1">
                          {orderDetail.customer.addressDetail}
                        </p>
                      )}
                      {orderDetail.customer.postalCode && (
                        <p className="text-ui-body-sm text-foreground/80">
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

          <Card className="rounded-2xl border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/60 bg-muted/30 rounded-t-xl">
              <CardTitle>주문 진행 타임라인</CardTitle>
              <CardDescription>
                주문 접수부터 결제, 준비, 완성 라켓 배송/방문 수령, 완료까지의 흐름을 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {timelineSteps.map((step, index) => {
                const tone = getTimelineStepTone(step.state);
                const Icon =
                  step.state === "active" && !isVisitPickup && step.title.includes("배송")
                    ? Truck
                    : tone.Icon;
                return (
                  <div
                    key={step.title}
                    className="rounded-xl border border-border/70 bg-muted/30 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 items-center justify-center rounded-full",
                          tone.wrapper,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">
                            {index + 1}. {step.title}
                          </p>
                          <Badge className={cn("px-2 py-0.5 text-ui-label", tone.badge)}>
                            {getTimelineStateLabel(step.state)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-ui-body-sm text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="space-y-1 text-ui-label text-muted-foreground">
                <p>이 타임라인은 현재 상태 기준 안내입니다.</p>
                <p>자세한 변경 기록은 아래 처리 이력에서 확인할 수 있습니다.</p>
                {shouldShowStringingTimelineHint && (
                  <p>
                    {primaryStringingAppId
                      ? "연결된 교체서비스 상세에서 진행 상태를 확인해주세요."
                      : "교체서비스가 포함된 주문은 교체서비스 상세에서 작업 진행 상태를 함께 확인할 수 있습니다."}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 완성 라켓 배송/수령 정보 */}
          <Card variant="elevatedGradient">
            <CardHeader variant="sectionGradient">
              <CardTitle className="flex items-center space-x-2">
                <Truck className="h-5 w-5 text-success" />
                <span>{getOrderDeliveryInfoTitle(orderDetail.shippingInfo)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 bp-lg:p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-ui-body-sm text-foreground/80">
                      {isVisitPickup ? "수령 방법" : "배송 방법"}
                    </p>
                    <p className="font-semibold text-foreground">{shippingMethodLabel}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-ui-body-sm text-foreground/80">예상 수령일</p>
                    <p className="font-semibold text-foreground">
                      {orderDetail.shippingInfo?.estimatedDate
                        ? formatDate(orderDetail.shippingInfo.estimatedDate)
                        : "미등록"}
                    </p>
                  </div>
                </div>

                {!showDeliveryOnlyFields && (
                  <p className="text-ui-body-sm text-foreground/80">
                    방문 수령 주문은 매장 안내에 따라 준비 완료 후 수령해주세요.
                  </p>
                )}

                {showDeliveryOnlyFields && orderDetail.shippingInfo.invoice?.trackingNumber && (
                  <>
                    <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
                      <div>
                        <p className="text-ui-body-sm text-foreground/80">택배사</p>
                        <p className="font-semibold text-foreground">
                          {getCourierDisplayName(orderDetail.shippingInfo.invoice.courier)}
                        </p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-start gap-3 rounded-lg bg-muted p-3">
                      <div className="min-w-0">
                        <p className="text-ui-body-sm text-foreground/80">완성 라켓 운송장 번호</p>
                        <p className="break-all font-semibold text-foreground">
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
                      <div className="space-y-2 p-3 bg-muted rounded-lg text-ui-body-sm">
                        {trackingData.success && trackingData.supported ? (
                          <>
                            <p className="text-foreground">
                              <span className="text-muted-foreground">실시간 배송 상태:</span>{" "}
                              {trackingData.displayStatus}
                            </p>
                            {trackingData.lastEvent?.locationName && (
                              <p className="text-foreground">
                                <span className="text-muted-foreground">최근 위치:</span>{" "}
                                {trackingData.lastEvent.locationName}
                              </p>
                            )}
                            {trackingData.lastEvent?.time && (
                              <p className="text-foreground">
                                <span className="text-muted-foreground">최근 갱신:</span>{" "}
                                {formatDateTime(trackingData.lastEvent.time)}
                              </p>
                            )}
                            {shouldShowTrackingStatusNotice && (
                              <div className="space-y-0.5 rounded-md bg-background/70 px-2.5 py-1.5 text-ui-label leading-relaxed text-muted-foreground">
                                <p>실시간 배송 상태는 택배사 기준이며,</p>
                                <p>주문 상태와 다를 수 있습니다.</p>
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                window.open(trackingData.linkUrl, "_blank", "noopener,noreferrer")
                              }
                            >
                              배송조회
                            </Button>
                          </>
                        ) : trackingData.success && !trackingData.supported ? (
                          <p className="text-muted-foreground">{trackingData.message}</p>
                        ) : (
                          <p className="text-destructive">
                            {getTrackingFailureMessage(trackingData)}
                          </p>
                        )}
                      </div>
                    )}
                    {trackingError && (
                      <p className="text-ui-body-sm text-destructive">
                        {getTrackingErrorMessage(trackingData, trackingError)}
                      </p>
                    )}
                  </>
                )}

                {shouldShowInboundShippingBlock && !hasLinkedStringingApps && (
                  <div className="rounded-lg border border-border bg-primary/5 p-3 dark:bg-primary/10">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-ui-body-sm font-semibold text-foreground">
                          라켓 발송 정보
                        </p>
                        <p className="text-ui-label text-foreground/75">
                          매장으로 보내는 라켓의 택배 등록 상태를 확인할 수 있어요.
                        </p>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 w-full bp-sm:w-auto"
                      >
                        <Link href={inboundShippingHref ?? "#"}>
                          {hasSelfShipTracking ? "라켓 발송 운송장 수정" : "라켓 발송 운송장 등록"}
                        </Link>
                      </Button>
                    </div>

                    <div className="mt-3 grid gap-2 text-ui-body-sm text-foreground bp-sm:grid-cols-2">
                      <p>
                        <span className="text-muted-foreground">상태:</span> {selfShipStatusLabel}
                      </p>
                      <p>
                        <span className="text-muted-foreground">택배사:</span>{" "}
                        {selfShipCourierLabel}
                      </p>
                      <p className="min-w-0 break-all">
                        <span className="text-muted-foreground">운송장 번호:</span>{" "}
                        {selfShipTrackingNoLabel}
                      </p>
                      <p>
                        <span className="text-muted-foreground">발송일:</span>{" "}
                        {selfShipInfo?.shippedAt ? formatDate(selfShipInfo.shippedAt) : "미등록"}
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
            <CardContent className="p-4 bp-lg:p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
                  <div>
                    <p className="text-ui-body-sm text-foreground/80">결제 상태</p>
                    {(() => {
                      const pay = getPaymentStatusBadgeSpec(orderDetail.paymentStatus);
                      return (
                        <Badge variant={pay.variant} className={cn(badgeBase, badgeSizeSm)}>
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
                    paymentCardDisplayName={orderDetail.paymentCardDisplayName}
                    paymentCardCompany={orderDetail.paymentCardCompany}
                    paymentCardLabel={orderDetail.paymentCardLabel}
                    paymentNiceSync={orderDetail.paymentNiceSync}
                  />
                </div>

                <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border border-border">
                  <div>
                    <p className="text-ui-body-sm text-foreground/80">결제 금액</p>
                    <p className="text-ui-section-title font-semibold text-primary">
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
            <CardContent className="p-4 bp-lg:p-6">
              <div className="space-y-4">
                {orderDetail.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-4 rounded-xl bg-muted p-4 transition-colors hover:bg-muted dark:hover:bg-card bp-sm:flex-row bp-sm:items-start"
                  >
                    {/* 상품 썸네일 */}
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-12 w-12 shrink-0 object-cover rounded"
                      />
                    )}

                    {/* 상품명 + 수량 */}
                    <div className="w-full min-w-0 flex-1">
                      <h4 className="line-clamp-2 break-keep font-semibold text-foreground">
                        {item.name}
                      </h4>
                      <p className="break-keep text-ui-body-sm text-foreground/80">
                        수량: {item.quantity}개
                      </p>
                      {item.selectedStringName && (
                        <p className="text-ui-label text-foreground/70">
                          선택 스트링: {item.selectedStringName}
                        </p>
                      )}
                      {item.selectedGauge && (
                        <p className="text-ui-label text-foreground/70">
                          게이지: {formatGaugeLabel(item.selectedGauge)}
                        </p>
                      )}
                      {(item.selectedColorLabel || item.selectedColor) && (
                        <p className="flex items-center gap-2 text-ui-label text-foreground/70">
                          <span>색상:</span>
                          {item.selectedColorHex && (
                            <span
                              className="h-3 w-3 rounded-full border border-border"
                              style={{ backgroundColor: item.selectedColorHex }}
                              aria-hidden="true"
                            />
                          )}
                          <span>{item.selectedColorLabel || item.selectedColor}</span>
                        </p>
                      )}
                    </div>

                    {/* 가격 및 소계 */}
                    <div className="w-full shrink-0 rounded-lg border border-border/60 bg-background/60 p-3 text-left bp-sm:w-auto bp-sm:border-0 bp-sm:bg-transparent bp-sm:p-0 bp-sm:text-right">
                      <p className="whitespace-nowrap font-semibold tabular-nums text-foreground">
                        가격: {formatCurrency(item.price)}
                      </p>
                      {typeof item.stringPrice === "number" && item.stringPrice > 0 && (
                        <p className="whitespace-nowrap text-ui-body-sm tabular-nums text-foreground/80">
                          스트링 가격: {formatCurrency(item.stringPrice)}
                        </p>
                      )}
                      {typeof item.mountingFee === "number" && item.mountingFee > 0 && (
                        <p className="whitespace-nowrap text-ui-body-sm tabular-nums text-foreground/80">
                          장착비: {formatCurrency(item.mountingFee)}
                        </p>
                      )}
                      <p className="whitespace-nowrap text-ui-body-sm tabular-nums text-foreground/80">
                        상품 소계: {formatCurrency(item.price * item.quantity)}
                      </p>
                      <div className="mt-2">
                        {canShowReviewCTA &&
                          (reviewedMap[item.id] ? (
                            <Button
                              asChild
                              size="sm"
                              variant="secondary"
                              className="w-full bp-sm:w-auto"
                            >
                              <Link href={`/products/${item.id}?tab=reviews`}>리뷰 상세 보기</Link>
                            </Button>
                          ) : (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="w-full bp-sm:w-auto"
                            >
                              <Link
                                href={`/reviews/write?productId=${item.id}&orderId=${orderDetail._id}`}
                              >
                                리뷰 작성하기
                              </Link>
                            </Button>
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
              <CardDescription>결제 시 입력한 배송 관련 요청사항입니다.</CardDescription>
            </CardHeader>
            {editingRequest ? (
              <CardContent className="p-4 bp-lg:p-6">
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
              <CardContent className="p-4 bp-lg:p-6">
                {orderDetail.shippingInfo.deliveryRequest ? (
                  <div className="bg-muted border border-border rounded-lg p-4">
                    <p className="text-foreground whitespace-pre-line">
                      {orderDetail.shippingInfo.deliveryRequest}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">요청사항이 입력되지 않았습니다.</p>
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
        <OrderHistory orderId={orderId} shippingMethod={shippingMethodValue} />

        {/* 취소 다이얼로그는 실제 요청 시점에만 mount */}
        {cancelDialogOpen && orderDetail?._id ? (
          <CancelOrderDialog
            orderId={String(orderDetail._id)}
            paymentProvider={orderDetail.paymentProvider}
            paymentMethod={orderDetail.paymentMethod}
            paymentStatus={orderDetail.paymentStatus}
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
