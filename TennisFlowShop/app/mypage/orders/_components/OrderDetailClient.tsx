"use client";

import CustomerEditForm from "@/app/features/orders/components/CustomerEditForm";
import MypageDetailCard from "@/app/mypage/_components/MypageDetailCard";
import MypageInfoField from "@/app/mypage/_components/MypageInfoField";
import {
  getCustomerApplicationStatusLabel,
  getCustomerNextActionCopy,
  getCustomerOrderStatusLabel,
  getCustomerPaymentStatusLabel,
} from "@/app/mypage/_lib/flow-display";
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
import { refreshOnce } from "@/lib/auth/refresh-mutex";
import {
  badgeBase,
  badgeSizeSm,
  badgeToneVariant,
  getApplicationStatusTone,
  getPaymentStatusBadgeSpec,
} from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import {
  trackingSWRFetcher,
  type TrackingSWRFetcherError,
} from "@/lib/fetchers/trackingSWRFetcher";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import {
  getOrderStatusLabelForDisplay,
  isVisitPickupOrder,
  orderShippingMethodLabel,
  shouldShowDeliveryOnlyFields,
} from "@/lib/order-shipping";
import { isMountableStringItem } from "@/lib/orders/string-mounting-policy";
import { getCourierDisplayName } from "@/lib/shipping/courier-map";
import { getCommonOrderStatusLabel } from "@/lib/status-labels/base";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { CheckCircle, ChevronDown, Clock, CreditCard, ShoppingCart, Truck } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { mypageDetailLayout } from "../../_components/mypage-detail-style";
import MypageDetailHero from "../../_components/MypageDetailHero";
import { OrderStatusBadge } from "./OrderStatusBadge";

const CancelOrderDialog = dynamic(() => import("./CancelOrderDialog"), {
  loading: () => null,
});

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

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  regularPrice?: number | null;
  salePrice?: number | null;
  discountAmount?: number | null;
  discountRate?: number | null;
  imageUrl?: string | null;
  selectedColorImage?: string | null;
  selectedStringName?: string | null;
  stringPrice?: number | null;
  selectedGauge?: string;
  selectedColor?: string;
  selectedColorLabel?: string;
  selectedColorHex?: string;
  mountingFee?: number;
  isMountableString?: boolean;
}

type StringingApplicationPackageInfo = {
  applied?: boolean;
  useCount?: number | null;
  remainingCount?: number | null;
};

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
    serviceReviewPending?: boolean;
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
    packageInfo?: StringingApplicationPackageInfo | null;
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

const paymentDoneKeywords = ["paid", "결제완료", "결제 완료", "완료"];

export default function OrderDetailClient({ orderId, backUrl }: Props) {
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

  // 상품 후기 작성 여부 맵: { [productId]: boolean }
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

  const toFinitePriceOrNull = (value: unknown): number | null => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const resolveOrderItemPriceDisplay = (item: OrderItem) => {
    const rawPrice = toFinitePriceOrNull(item.price);
    const rawSalePrice = toFinitePriceOrNull(item.salePrice);
    const rawRegularPrice = toFinitePriceOrNull(item.regularPrice);
    const rawDiscountRate = toFinitePriceOrNull(item.discountRate);

    const isExplicitFree = rawSalePrice === 0 && rawDiscountRate === 100;

    const displayUnitPrice =
      rawSalePrice !== null && (rawSalePrice > 0 || isExplicitFree)
        ? rawSalePrice
        : (rawPrice ?? 0);

    const regularPrice = rawRegularPrice;
    const hasDiscount = regularPrice !== null && regularPrice > displayUnitPrice;

    return {
      displayUnitPrice,
      regularPrice: hasDiscount ? regularPrice : null,
      hasDiscount,
      discountRate:
        hasDiscount && regularPrice
          ? Math.round(((regularPrice - displayUnitPrice) / regularPrice) * 100)
          : null,
    };
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
  const packageUsageInfos = linkedStringingApps.reduce<StringingApplicationPackageInfo[]>(
    (infos, app) => {
      const packageInfo = app.packageInfo;
      if (packageInfo?.applied) {
        infos.push(packageInfo);
      }
      return infos;
    },
    [],
  );
  const packageUsedSlots = packageUsageInfos.reduce(
    (sum, info) => sum + Math.max(0, info.useCount ?? 1),
    0,
  );
  const packageRemainingSlots =
    packageUsageInfos.find((info) => typeof info.remainingCount === "number")?.remainingCount ?? 0;

  const reviewableStringingApp =
    linkedStringingApps.find((app) => app.serviceReviewPending) ?? primaryStringingApp;

  const reviewableStringingAppId = reviewableStringingApp?.id ?? primaryStringingAppId;

  const canShowProductReviewCTA = canShowReviewCTA && !serviceLinkedOrder;

  const canShowServiceReviewCTA = Boolean(
    serviceLinkedOrder && reviewableStringingAppId && reviewableStringingApp?.serviceReviewPending,
  );

  const serviceReviewHref = reviewableStringingAppId
    ? `/reviews/write?service=stringing&applicationId=${reviewableStringingAppId}`
    : null;

  const isOrderCanceled = orderDetail.status === "취소";
  const isPrimaryStringingAppCanceled = primaryStringingApp?.status === "취소";
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
  const selfShipCourierValue = selfShipInfo?.courier?.trim();
  const selfShipCourierLabel = selfShipCourierValue
    ? getCourierDisplayName(selfShipCourierValue)
    : "미등록";

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

  // 결제대기 무통장 여부 변수
  const normalizedPaymentMethod = String(orderDetail?.paymentMethod ?? "")
    .trim()
    .toLowerCase();

  const isBankTransferPayment =
    normalizedPaymentMethod.includes("무통장") ||
    normalizedPaymentMethod.includes("bank") ||
    normalizedPaymentMethod.includes("deposit");

  const isPaymentWaiting = isBankTransferPayment && !paymentDone && !isOrderCanceled;

  const depositorName = orderDetail.shippingInfo?.depositor?.trim();

  const customerPaymentMethodLabel = isBankTransferPayment
    ? "무통장입금"
    : orderDetail.paymentEasyPayProvider
      ? `${orderDetail.paymentEasyPayProvider} 간편결제`
      : orderDetail.paymentCardDisplayName ||
        orderDetail.paymentCardLabel ||
        orderDetail.paymentCardCompany ||
        orderDetail.paymentMethod ||
        "결제수단 확인 중";

  const paymentApprovedAtLabel = orderDetail.paymentApprovedAt
    ? formatDateTime(orderDetail.paymentApprovedAt)
    : null;

  const bankAccountLabel = "카카오뱅크 3333-2110-92155";
  const bankAccountHolderLabel = "김재민";

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

  const cancelLabel = getCancelRequestLabel(orderDetail);
  const cancelStatus = (orderDetail as any)?.cancelRequest?.status;
  const canWithdrawCancelRequest = cancelStatus === "requested";
  const handleConfirmPurchase = async () => {
    if (!orderDetail?._id || isConfirmingPurchase) return;
    if (!window.confirm("구매 확정 처리하시겠습니까?\n확정 후에는 되돌릴 수 없습니다.")) {
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
        showErrorToast(data?.error || data?.message || "구매 확정 처리 중 오류가 발생했습니다.");
        return;
      }

      showSuccessToast("구매 확정이 완료되었습니다.");
      await Promise.all([mutateOrderDetail(), mutate(`/api/orders/${orderDetail._id}/status`)]);
    } catch (e) {
      console.error(e);
      showErrorToast("구매 확정 처리 중 오류가 발생했습니다.");
    } finally {
      setIsConfirmingPurchase(false);
    }
  };
  const shouldShowInboundShippingTodo =
    shouldShowInboundShippingBlock &&
    inboundShippingHref &&
    !hasSelfShipTracking &&
    !isShipped &&
    !isDelivered &&
    !isCompleted &&
    !canConfirmPurchase &&
    !(canShowProductReviewCTA && Boolean(firstUnreviewed));

  const nextTodo: {
    label: string;
    ctaLabel: string;
    ctaHref?: string;
    onCtaClick?: () => void;
    description?: string;
  } | null = shouldShowInboundShippingTodo
    ? {
        label: isPaymentWaiting
          ? "입금 후 라켓 발송 운송장을 등록해주세요."
          : "라켓 발송 운송장 등록이 필요합니다.",
        description: isPaymentWaiting
          ? "무통장입금 주문은 입금 확인 후 작업이 진행됩니다. 라켓을 먼저 보내실 수는 있지만, 입금이 확인되지 않으면 교체 작업이 시작되지 않습니다."
          : "보유 라켓을 매장으로 보내고 라켓 발송 운송장을 등록해주세요.",
        ctaLabel: "라켓 발송 운송장 등록",
        ctaHref: inboundShippingHref,
      }
    : canConfirmPurchase
      ? {
          label: serviceLinkedOrder
            ? "상품을 받으셨다면 구매 확정을 진행해주세요."
            : "구매 확정이 필요합니다.",
          description: serviceLinkedOrder
            ? "완성 라켓 배송이 완료되었습니다. 상품을 받으셨다면 구매 확정을 진행해주세요."
            : "상품을 받으셨다면 구매 확정을 진행해주세요.",
          ctaLabel: isConfirmingPurchase ? "확정 중…" : "구매 확정",
          onCtaClick: handleConfirmPurchase,
        }
      : canShowServiceReviewCTA && serviceReviewHref
        ? {
            label: "상품·교체서비스 후기 작성 가능",
            description: "수령 확인된 교체서비스에 대해 상품과 서비스 경험을 함께 남겨주세요.",
            ctaLabel: "후기 작성",
            ctaHref: serviceReviewHref,
          }
        : canShowProductReviewCTA && Boolean(firstUnreviewed)
          ? {
              label: "후기 작성 가능",
              ctaLabel: "후기 작성",
              ctaHref: `/reviews/write?productId=${firstUnreviewed?.id}&orderId=${orderDetail?._id}`,
            }
          : null;
  const customerStatusLabel = getCustomerOrderStatusLabel(displayOrderStatusLabel);
  const nextActionCopy = getCustomerNextActionCopy({
    hasTodo: Boolean(nextTodo),
    todoLabel: nextTodo?.label,
    todoDescription: nextTodo?.description,
    isCompleted,
    isCanceled: isOrderCanceled,
  });

  // 상세 헤더에서 "주문 취소 요청" 버튼을 보여줄 수 있는 상태인지 판단
  // - 대기중 / 결제완료 상태에서만 가능
  // - 이미 요청 중(requested)이면 새 요청 버튼 대신 "취소 철회" 배너를 보여주므로 숨김
  // - rejected 는 다시 요청 가능하게 유지
  const canShowCancelButton =
    ["대기중", "결제완료"].includes(orderDetail.status) &&
    (!cancelStatus || cancelStatus === "none" || cancelStatus === "rejected");

  const hasDeliveryRequest = Boolean(orderDetail.shippingInfo.deliveryRequest?.trim());
  const hasAddress = Boolean(orderDetail.customer.address || orderDetail.customer.addressDetail);

  const deliveryAddress = [orderDetail.customer.address, orderDetail.customer.addressDetail]
    .filter(Boolean)
    .join(" ");

  const shippingProgressLabel = shouldShowTrackingStatusNotice
    ? trackingData?.success && trackingData.supported
      ? trackingData.displayStatus
      : displayOrderStatusLabel
    : displayOrderStatusLabel || "상태 확인 중";

  const outboundInvoice = orderDetail.shippingInfo.invoice;
  const hasOutboundTracking = Boolean(outboundInvoice?.trackingNumber);

  const outboundDeliveryLabel = serviceLinkedOrder ? "완성 라켓 배송" : "배송 정보";

  const outboundDeliveryValue = isVisitPickup
    ? "매장 방문 수령"
    : hasOutboundTracking && outboundInvoice
      ? `${getCourierDisplayName(outboundInvoice.courier)} · ${outboundInvoice.trackingNumber}`
      : serviceLinkedOrder
        ? "작업 완료 후 배송 준비"
        : shippingProgressLabel;

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
        throw new Error(await parseApiMessage(res, "취소 요청 처리 중 오류가 발생했습니다."));
      }

      // SWR 캐시 갱신: 마이페이지 목록과 주문 상세를 재검증
      await Promise.all([
        mutateOrderDetail(),

        mutate(
          (key) => typeof key === "string" && key.startsWith("/api/users/me/orders"),
          undefined,
          { revalidate: true },
        ),
      ]);

      showSuccessToast("취소 요청을 철회했습니다.");
    } catch (err) {
      console.error(err);
      if (err instanceof DOMException && err.name === "AbortError") {
        showErrorToast("요청 시간이 초과되었습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.");
      } else {
        showErrorToast((err as Error).message || "취소 요청 처리 중 오류가 발생했습니다.");
      }
    } finally {
      setIsWithdrawingCancelRequest(false);
    }
  };

  return (
    <main className="w-full">
      <MypageDetailHero
        title={serviceLinkedOrder ? "상품 구매 + 교체서비스 상세" : "주문 상세"}
        description={
          serviceLinkedOrder
            ? "주문 상품, 결제 상태, 교체서비스 진행 정보를 확인하세요."
            : "주문 상품, 결제 상태, 배송 정보를 확인하세요."
        }
        icon={<ShoppingCart className="h-6 w-6 text-primary" />}
        status={
          <OrderStatusBadge
            orderId={orderId}
            initialStatus={orderDetail.status}
            shippingMethod={orderDetail.shippingInfo}
          />
        }
        statusTitle={customerStatusLabel}
        identifier={`주문번호: #${orderId.slice(-6).toUpperCase()}`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(backUrl ?? "/mypage?tab=orders")}
              className="h-9 w-full whitespace-normal break-keep border-border bg-background hover:border-primary/30 bp-sm:w-auto"
            >
              <span className="bp-sm:hidden">목록</span>
              <span className="hidden bp-sm:inline">주문 목록으로 돌아가기</span>
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
              {isEditMode ? "수정 종료" : "주문 정보 수정"}
            </Button>

            {canShowCancelButton ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setCancelDialogOpen(true)}
                className="h-9 w-full whitespace-normal break-keep bp-sm:w-auto"
              >
                취소 요청
              </Button>
            ) : null}
          </>
        }
      />

      <SiteContainer variant="wide" className={mypageDetailLayout.contentContainer}>
        {/* 취소 요청 상태 안내 배너 */}
        {cancelLabel && (
          <div className="mb-4 flex flex-col gap-3 border-l-2 border-destructive/50 bg-muted/20 px-3 py-3 text-ui-body-sm text-foreground bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
            <span className="min-w-0 break-words">{cancelLabel}</span>

            {canWithdrawCancelRequest && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleWithdrawCancelRequest}
                disabled={isWithdrawingCancelRequest}
                className="h-9 w-full gap-1.5 whitespace-normal break-keep bp-sm:ml-4 bp-sm:w-auto"
              >
                {isWithdrawingCancelRequest ? "철회 중..." : "취소 요청 철회"}
              </Button>
            )}
          </div>
        )}

        {nextTodo ? (
          <div className="mb-5 flex w-full flex-col gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm shadow-foreground/[0.02] bp-sm:flex-row bp-sm:items-center bp-sm:justify-between bp-sm:px-5">
            <div className="min-w-0 space-y-1">
              <p className="text-ui-label font-medium text-muted-foreground">다음 할 일</p>
              <p className="break-keep text-ui-body-sm font-medium text-foreground">
                {nextActionCopy.title}
              </p>
              {nextActionCopy.description ? (
                <p className="break-keep text-ui-label leading-relaxed text-muted-foreground">
                  {nextActionCopy.description}
                </p>
              ) : null}
            </div>

            <Button
              asChild={Boolean(nextTodo.ctaHref)}
              onClick={nextTodo.onCtaClick}
              disabled={isConfirmingPurchase}
              className="w-full shrink-0 whitespace-normal break-keep bp-sm:w-auto"
            >
              {nextTodo.ctaHref ? (
                <Link href={nextTodo.ctaHref}>{nextTodo.ctaLabel}</Link>
              ) : (
                nextTodo.ctaLabel
              )}
            </Button>
          </div>
        ) : null}

        <div className="w-full space-y-5">
          <div className="space-y-5">
            {/* 주문 항목 */}
            <MypageDetailCard
              title="주문상품"
              description="구매한 상품과 선택 옵션을 확인하세요."
              icon={<ShoppingCart className="h-5 w-5 text-warning" />}
            >
              <div className="divide-y divide-border/60">
                {orderDetail.items.map((item, idx) => {
                  const optionParts = [
                    `${item.quantity}개`,
                    item.selectedGauge ? `게이지 ${formatGaugeLabel(item.selectedGauge)}` : null,
                    item.selectedColorLabel || item.selectedColor || null,
                  ].filter(Boolean);

                  const priceDisplay = resolveOrderItemPriceDisplay(item);
                  const lineAmount = priceDisplay.displayUnitPrice * item.quantity;
                  const itemImageUrl = item.imageUrl || item.selectedColorImage || null;

                  return (
                    <div key={idx} className="flex gap-3 py-4 first:pt-0 last:pb-0 bp-sm:gap-4">
                      {itemImageUrl ? (
                        <img
                          src={itemImageUrl}
                          alt={item.name || "주문 상품"}
                          className="h-16 w-16 shrink-0 rounded-xl border border-border/60 object-cover bp-sm:h-20 bp-sm:w-20"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/20 bp-sm:h-20 bp-sm:w-20">
                          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-col gap-3 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                          <div className="min-w-0">
                            <h4 className="line-clamp-2 break-keep text-ui-body-sm font-medium text-foreground">
                              {item.name}
                            </h4>

                            {optionParts.length > 0 ? (
                              <p className="mt-1 break-keep text-ui-label text-muted-foreground">
                                {optionParts.join(" · ")}
                              </p>
                            ) : null}
                          </div>

                          <div className="shrink-0 text-left bp-sm:text-right">
                            <p className="whitespace-nowrap text-ui-body-sm font-semibold tabular-nums text-foreground">
                              상품가 {formatCurrency(lineAmount)}
                            </p>

                            {priceDisplay.hasDiscount && priceDisplay.regularPrice !== null ? (
                              <p className="whitespace-nowrap text-ui-label tabular-nums text-muted-foreground">
                                정가{" "}
                                <span className="line-through">
                                  {formatCurrency(priceDisplay.regularPrice)}
                                </span>
                                {priceDisplay.discountRate !== null
                                  ? ` · ${priceDisplay.discountRate}% 할인`
                                  : ""}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {canShowProductReviewCTA ? (
                          <div className="mt-3">
                            {reviewedMap[item.id] ? (
                              <Button
                                asChild
                                size="sm"
                                variant="secondary"
                                className="w-full bp-sm:w-auto"
                              >
                                <Link href={`/products/${item.id}?tab=reviews`}>
                                  후기 상세 보기
                                </Link>
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
                                  후기 작성
                                </Link>
                              </Button>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </MypageDetailCard>
            {(orderDetail.shippingInfo?.withStringService || hasLinkedStringingApps) && (
              <section id="stringing-service" className="scroll-mt-24 space-y-4">
                <MypageDetailCard
                  title="연결된 교체서비스"
                  description="진행 상태와 핵심 일정을 요약했습니다."
                  contentClassName="space-y-4"
                >
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
                          className="border-b border-border/70 pb-4 last:border-b-0 last:pb-0"
                        >
                          <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={badgeToneVariant(getApplicationStatusTone(app.status))}
                                  className="px-2 py-0.5 text-ui-label font-medium"
                                >
                                  {getCustomerApplicationStatusLabel(app.status)}
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
                              </div>
                            </div>
                          </div>

                          <details className="group mt-4 rounded-xl bg-muted/15 p-3">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-ui-body-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                              <span>라켓·스트링 상세</span>
                              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="mt-3 space-y-2">
                              {displayLines.map((line, lineIndex) => {
                                const racketLabel =
                                  line.racketLabel || line.racketType || "라켓명 미입력";
                                const normalizedRacketLabel =
                                  racketLabel && racketLabel !== "라켓명 미입력"
                                    ? racketLabel
                                    : null;
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
                                    className="border-t border-border/60 py-3 text-ui-body-sm first:border-t-0"
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
                                              ? `게이지(굵기) ${formatGaugeLabel(line.gauge)}`
                                              : "게이지(굵기) -"}
                                            {" / 색상 "}
                                            {line.colorLabel || line.color || "-"}
                                          </dd>
                                        </div>
                                      ) : null}
                                      <div className="flex gap-2">
                                        <dt className="w-20 shrink-0 text-muted-foreground">
                                          텐션
                                        </dt>
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
                          </details>

                          {appNeedsTracking ? (
                            <div className="mt-4 rounded-xl bg-muted/15 px-3 py-3 text-ui-body-sm">
                              {appHasTracking ? (
                                <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground">
                                      라켓 발송 운송장이 등록되었습니다.
                                    </p>
                                    <p className="mt-1 break-all text-muted-foreground">
                                      {appSelfShipInfo?.courier?.trim()
                                        ? getCourierDisplayName(appSelfShipInfo.courier)
                                        : "택배사 확인 중"}
                                      {appSelfShipInfo?.trackingNo?.trim()
                                        ? ` · ${appSelfShipInfo.trackingNo}`
                                        : ""}
                                    </p>
                                    {appSelfShipInfo?.shippedAt ? (
                                      <p className="mt-1 text-ui-label text-muted-foreground">
                                        발송일: {formatDate(appSelfShipInfo.shippedAt)}
                                      </p>
                                    ) : null}
                                    {appSelfShipInfo?.note ? (
                                      <p className="mt-1 whitespace-pre-wrap break-words text-ui-label text-muted-foreground">
                                        메모: {appSelfShipInfo.note}
                                      </p>
                                    ) : null}
                                  </div>

                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-full bg-transparent bp-sm:w-auto"
                                  >
                                    <Link href={appShippingHref}>운송장 수정</Link>
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground">
                                      라켓 발송 전입니다.
                                    </p>
                                    <p className="mt-1 break-keep text-muted-foreground">
                                      {isPaymentWaiting
                                        ? "무통장입금 주문은 입금 확인 후 작업이 진행됩니다. 입금과 라켓 발송을 완료한 뒤 운송장을 등록해주세요."
                                        : "라켓을 매장으로 보내고 운송장을 등록해주세요."}
                                    </p>
                                  </div>

                                  <Button
                                    asChild
                                    size="sm"
                                    className="w-full shrink-0 bp-sm:w-auto"
                                  >
                                    <Link href={appShippingHref}>라켓 발송 운송장 등록</Link>
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  ) : !isOrderCanceled && totalSlots > 0 && remainingSlots > 0 ? (
                    <div className="border-l-2 border-warning/60 bg-warning/10 px-3 py-3 text-warning dark:bg-warning/15">
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
                    <div className="rounded-xl bg-muted/15 p-3 text-ui-body-sm text-muted-foreground">
                      연결된 교체서비스 신청 정보를 확인 중입니다.
                    </div>
                  )}

                  {reviewableStringingAppId ? (
                    <ServiceReviewCTA
                      applicationId={reviewableStringingAppId}
                      userConfirmedAt={reviewableStringingApp?.userConfirmedAt ?? null}
                    />
                  ) : null}
                </MypageDetailCard>
              </section>
            )}
          </div>

          <aside className="space-y-5">
            {/* 결제 정보 */}
            <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm shadow-foreground/[0.02]">
              <CardHeader className="border-b border-border/60 bg-secondary/20 p-4 bp-sm:p-5">
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-foreground" />
                  <span>결제 요약</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 bp-sm:p-5">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 border-b border-border/60 py-3 first:pt-0 last:border-b-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-ui-label font-medium text-muted-foreground">결제 상태</p>
                      {(() => {
                        const pay = getPaymentStatusBadgeSpec(orderDetail.paymentStatus);
                        return (
                          <Badge variant={pay.variant} className={cn(badgeBase, badgeSizeSm)}>
                            {getCustomerPaymentStatusLabel(orderDetail.paymentStatus)}
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="space-y-3 border-b border-border/60 py-3 last:border-b-0 last:pb-0">
                    <MypageInfoField label="결제 방식" value={customerPaymentMethodLabel} />

                    {isBankTransferPayment ? (
                      <div className="rounded-xl bg-muted/15 p-3 ring-1 ring-border/40">
                        <p className="text-ui-label font-medium text-muted-foreground">입금 계좌</p>
                        <p className="mt-1 font-medium text-foreground">{bankAccountLabel}</p>
                        <p className="mt-1 text-ui-body-sm text-muted-foreground">
                          예금주: {bankAccountHolderLabel}
                        </p>

                        {depositorName ? (
                          <p className="mt-2 text-ui-body-sm text-foreground">
                            입금자명: {depositorName}
                          </p>
                        ) : null}

                        {isPaymentWaiting ? (
                          <p className="mt-2 break-keep text-ui-label leading-relaxed text-muted-foreground">
                            입금 확인 후 주문과 교체서비스 작업이 진행됩니다.
                          </p>
                        ) : null}
                      </div>
                    ) : paymentApprovedAtLabel ? (
                      <MypageInfoField label="결제 일시" value={paymentApprovedAtLabel} />
                    ) : null}
                  </div>

                  <MypageInfoField
                    className="rounded-xl bg-primary/5 p-4 ring-1 ring-primary/10"
                    label="결제 금액"
                    value={formatCurrency(orderDetail.total)}
                    valueClassName="text-ui-section-title text-primary"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 배송/수령 요약 */}
            <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm shadow-foreground/[0.02]">
              <CardHeader className="border-b border-border/60 bg-secondary/20 p-4 bp-sm:p-5">
                <CardTitle className="flex items-center space-x-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <span>배송/수령 요약</span>
                </CardTitle>
                <CardDescription>수령·배송 핵심 정보입니다.</CardDescription>
              </CardHeader>
              {editingCustomer ? (
                <CardContent className="p-4 bp-sm:p-5">
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
                    onSuccess={async () => {
                      await mutateOrderDetail();
                      showSuccessToast(
                        showDeliveryOnlyFields
                          ? "배송지/연락처가 수정되었습니다."
                          : "수령자 정보가 수정되었습니다.",
                      );
                      setEditingCustomer(false);
                    }}
                    onCancel={() => setEditingCustomer(false)}
                  />
                </CardContent>
              ) : (
                <CardContent className="space-y-4 p-4 bp-sm:p-5">
                  <div className="space-y-3">
                    <MypageInfoField label="수령 방법" value={shippingMethodLabel} />

                    {showDeliveryOnlyFields && hasAddress ? (
                      <MypageInfoField
                        label="배송지"
                        value={deliveryAddress}
                        valueClassName="break-keep"
                      />
                    ) : null}

                    <MypageInfoField
                      label={outboundDeliveryLabel}
                      value={outboundDeliveryValue}
                      valueClassName={hasOutboundTracking ? "break-all" : undefined}
                    />

                    {hasDeliveryRequest ? (
                      <MypageInfoField
                        label="배송 요청사항"
                        value={orderDetail.shippingInfo.deliveryRequest}
                        valueClassName="whitespace-pre-wrap break-words"
                      />
                    ) : null}
                  </div>

                  {showDeliveryOnlyFields && orderDetail.shippingInfo.invoice?.trackingNumber ? (
                    <details className="group overflow-hidden rounded-xl bg-muted/10 ring-1 ring-border/40">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-ui-body-sm font-semibold text-foreground transition-colors hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
                        <span>운송장·배송조회 상세</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="space-y-3 border-t border-border/60 p-3 bp-sm:p-4">
                        <div className="grid gap-3 bp-sm:grid-cols-2 bp-lg:grid-cols-1">
                          <MypageInfoField
                            label="택배사"
                            value={getCourierDisplayName(orderDetail.shippingInfo.invoice.courier)}
                          />
                          <MypageInfoField
                            label="완성 라켓 운송장 번호"
                            value={orderDetail.shippingInfo.invoice.trackingNumber}
                            valueClassName="break-all"
                          />
                        </div>
                        {shouldShowTrackingSummarySkeleton && (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-8 w-24" />
                          </div>
                        )}
                        {!isTrackingLoading && !trackingError && trackingData && (
                          <div className="space-y-2 border-l-2 border-primary/40 bg-primary/5 px-3 py-3 text-ui-body-sm">
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
                                  <div className="space-y-0.5 border-l-2 border-border bg-background/60 px-2.5 py-1.5 text-ui-label leading-relaxed text-muted-foreground">
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
                      </div>
                    </details>
                  ) : null}

                  {showDeliveryOnlyFields && isEditMode && canUserEdit ? (
                    <div className="rounded-xl bg-muted/10 p-3 ring-1 ring-border/40">
                      {editingRequest ? (
                        <RequestEditForm
                          initialData={orderDetail.shippingInfo.deliveryRequest || ""}
                          orderId={orderId}
                          onSuccess={async () => {
                            await mutateOrderDetail();
                            showSuccessToast("배송 요청사항이 수정되었습니다.");
                            setEditingRequest(false);
                          }}
                          onCancel={() => setEditingRequest(false)}
                        />
                      ) : (
                        <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-ui-body-sm font-medium text-foreground">
                              배송 요청사항
                            </p>
                            <p className="mt-1 text-ui-label text-muted-foreground">
                              필요한 경우 배송 요청사항만 수정할 수 있습니다.
                            </p>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingRequest(true)}
                            className="h-8 w-full hover:bg-warning/10 dark:hover:bg-warning/15 bp-sm:w-auto"
                          >
                            요청사항 수정
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {shouldShowInboundShippingBlock &&
                  !hasLinkedStringingApps &&
                  hasSelfShipTracking ? (
                    <div className="rounded-xl bg-muted/15 px-3 py-3 text-ui-body-sm">
                      <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            라켓 발송 운송장이 등록되었습니다.
                          </p>
                          <p className="mt-1 break-all text-muted-foreground">
                            {selfShipCourierValue ? selfShipCourierLabel : "택배사 확인 중"}
                            {selfShipInfo?.trackingNo?.trim()
                              ? ` · ${selfShipInfo.trackingNo}`
                              : ""}
                          </p>
                          {selfShipInfo?.shippedAt ? (
                            <p className="mt-1 text-ui-label text-muted-foreground">
                              발송일: {formatDate(selfShipInfo.shippedAt)}
                            </p>
                          ) : null}
                        </div>

                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8 w-full bp-sm:w-auto"
                        >
                          <Link href={inboundShippingHref ?? "#"}>운송장 수정</Link>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              )}
              {isEditMode && canUserEdit && !editingCustomer && (
                <CardFooter className="flex justify-center bg-muted/50 pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingCustomer(true)}
                    className="border-border hover:bg-primary/10 dark:hover:bg-primary/20"
                  >
                    {showDeliveryOnlyFields ? "배송지/연락처 수정" : "수령자 정보 수정"}
                  </Button>
                </CardFooter>
              )}
            </Card>

            {packageUsedSlots > 0 ? (
              <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm shadow-foreground/[0.02]">
                <CardHeader className="border-b border-border/60 bg-secondary/20 p-4 bp-sm:p-5">
                  <CardTitle>패키지 사용</CardTitle>
                  <CardDescription>이번 이용에 패키지 이용권이 사용되었습니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 text-ui-body-sm bp-lg:p-5">
                  <div className="rounded-xl bg-muted/15 p-3 text-foreground">
                    <p className="text-ui-body font-medium">
                      사용 {packageUsedSlots}회 · 남은 {packageRemainingSlots}회
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {packageRemainingSlots > 0
                        ? `이번 이용에 패키지 ${packageUsedSlots}회가 차감되었습니다.`
                        : "이번 이용으로 패키지를 모두 사용했습니다."}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full bp-sm:w-auto">
                    <Link href="/mypage?tab=passes">패키지 관리로 이동</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {!serviceLinkedOrder ? (
              <div id="reviews-cta" className="mt-4">
                {allReviewed ? (
                  <div className="flex flex-col gap-3 border-l-2 border-primary/50 bg-primary/10 px-3 py-3 dark:bg-primary/20 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between bp-sm:px-4 bp-sm:py-4">
                    <div className="flex items-center gap-3 text-primary">
                      <CheckCircle className="h-6 w-6" />
                      <div>
                        <p className="mt-1 break-words font-semibold text-foreground">
                          이 주문은 리뷰를 작성하였습니다.
                        </p>
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
                  <div className="flex flex-col gap-3 border-l-2 border-warning/60 bg-warning/10 px-3 py-3 dark:bg-warning/15 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between bp-sm:px-4 bp-sm:py-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-6 w-6 text-warning" />
                      <div>
                        <p className="font-semibold text-warning">
                          이 주문은 리뷰를 작성하지 않았습니다.
                        </p>
                        <p className="text-ui-body-sm text-warning">
                          아래 ‘후기 작성’ 버튼을 눌러 상품별로 후기를 남겨주세요.
                        </p>
                        <p className="text-ui-body-sm text-destructive">
                          ※
                          {isVisitPickup
                            ? "상품을 구매 확정하면 [후기 작성] 버튼이 나타납니다."
                            : "구매 확정 후 [후기 작성] 버튼이 나타납니다."}
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
                      serviceLinkedOrder={false}
                      loading={!reviewsReady}
                    />
                  </div>
                )}
              </div>
            ) : null}
          </aside>
        </div>

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
