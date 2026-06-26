"use client";

import { collectionMethodLabel } from "@/app/features/stringing-applications/lib/fulfillment-labels";
import OrdersScopeTabs, { parseOrdersScope } from "@/app/mypage/_components/OrdersScopeTabs";
import {
  getMypageNormalizedStatus,
  getMypagePaymentStatusLabel,
  getMypageUserStatusLabel,
} from "@/app/mypage/_lib/status-label";
import ActivityOrderReviewCTA from "@/app/mypage/tabs/_components/ActivityOrderReviewCTA";
import ServiceReviewCTA from "@/components/reviews/ServiceReviewCTA";
import { EmptyState } from "@/components/public/EmptyState";
import AsyncState from "@/components/system/AsyncState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getApplicationStatusBadgeSpec,
  getOrderStatusBadgeSpec,
  getRentalStatusBadgeSpec,
  getWorkflowMetaBadgeSpec,
} from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { getOrderStatusLabelForDisplay, isVisitPickupOrder } from "@/lib/order-shipping";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Package,
  Sparkles,
  Undo2,
  Wrench,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { mutate as globalMutate } from "swr";
import useSWRInfinite from "swr/infinite";

type FlowDetailType = "order" | "application" | "rental";
type FlowType =
  | "order_only"
  | "order_plus_stringing"
  | "rental_only"
  | "rental_plus_stringing"
  | "application_only";

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
  packageApplied?: boolean;
  paymentStatus?: string | null;
  paymentProvider?: string | null;
  serviceReviewPending?: boolean;
  selectedStringName?: string | null;
  selectedGauge?: string | null;
  selectedColorLabel?: string | null;
};

type ActivityGroup = {
  key: string;
  kind: "order" | "application" | "rental";
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
    userConfirmedAt?: string | null;
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
    dueAt?: string | null;
    returnedAt?: string | null;
    hasReturnShipping?: boolean;
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

type CancelStringingParams = {
  reasonCode: string;
  reasonText?: string;
  refundAccount?: { bank: string; account: string; holder: string };
};

const shouldRequestCancelRefundAccount = (app?: ActivityApplicationSummary | null) => {
  if (!app) return true;
  const normalizedProvider = String(app.paymentProvider ?? "")
    .trim()
    .toLowerCase();
  return (
    !app.packageApplied && app.paymentStatus === "결제완료" && normalizedProvider !== "nicepay"
  );
};

const getNoRefundAccountMessage = (app?: ActivityApplicationSummary | null) => {
  const normalizedProvider = String(app?.paymentProvider ?? "")
    .trim()
    .toLowerCase();
  if (app?.packageApplied)
    return "패키지 사용 신청은 환불계좌 입력 없이 취소 요청할 수 있습니다. 승인 시 사용 회차 복원 기준으로 처리됩니다.";
  if (normalizedProvider === "nicepay")
    return "카드 결제 취소는 환불계좌 없이 요청할 수 있습니다. 관리자 승인 후 결제사 취소 또는 주문 취소 흐름에 따라 처리됩니다.";
  return "이 신청은 환불계좌 입력 없이 취소 요청할 수 있습니다.";
};

const getStringingDetailHref = (
  app: { id: string; orderId?: string | null; rentalId?: string | null },
  flowQuery = "from=orders",
) => {
  if (app.orderId) {
    return `/mypage?tab=orders&flowType=order&flowId=${app.orderId}&${flowQuery}&focus=stringing`;
  }

  if (app.rentalId) {
    return `/mypage?tab=orders&flowType=application&flowId=${app.id}&${flowQuery}`;
  }

  return `/mypage?tab=orders&flowType=application&flowId=${app.id}&${flowQuery}`;
};

const fetcher = (url: string) => authenticatedSWRFetcher<ActivityResponse>(url);
const CancelOrderDialog = dynamic(
  () => import("@/app/mypage/orders/_components/CancelOrderDialog"),
  { loading: () => null },
);
const CancelStringingDialog = dynamic(
  () => import("@/app/mypage/applications/_components/CancelStringingDialog"),
  { loading: () => null },
);
const CancelRentalDialog = dynamic(
  () => import("@/app/mypage/rentals/_components/CancelRentalDialog"),
  { loading: () => null },
);
const OrderShippingInfoDialog = dynamic(
  () => import("@/app/mypage/tabs/_components/OrderShippingInfoDialog"),
  { loading: () => null },
);

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

const formatAmount = (amount?: number | null) => {
  if (typeof amount !== "number") return "-";
  return `${amount.toLocaleString()}원`;
};

const FLOW_TYPE_META_LABEL: Record<FlowType, string> = {
  order_only: "주문",
  order_plus_stringing: "주문 + 교체서비스",
  rental_only: "대여",
  rental_plus_stringing: "대여 + 교체서비스",
  application_only: "교체서비스",
};

const normalizeLabel = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

const isFilledText = (value?: string | null) =>
  Boolean(value && value.trim() && value.trim() !== "-");

const getRepresentativeTitle = (group: ActivityGroup) => {
  if (group.kind === "order") {
    const firstItemName = group.order?.firstItemName?.trim();
    const itemsCount = group.order?.itemsCount ?? 0;
    const baseName = isFilledText(firstItemName) ? firstItemName : "주문 상품";
    return itemsCount > 1 ? `${baseName} 외 ${itemsCount - 1}건` : baseName;
  }

  if (group.kind === "rental") {
    const brand = group.rental?.brand?.trim() ?? "";
    const model = group.rental?.model?.trim() ?? "";
    const racketName = `${brand} ${model}`.trim() || "라켓";
    return `${racketName} 대여`;
  }

  return getApplicationTitle(group.application);
};

const getStatusBadgeSpec = (group: ActivityGroup, label: string) => {
  if (group.kind === "order") return getOrderStatusBadgeSpec(label);
  if (group.kind === "rental") return getRentalStatusBadgeSpec(label);

  const normalized = label.trim();
  if (normalized === "승인") return getApplicationStatusBadgeSpec("접수완료");
  if (normalized === "거절") return getApplicationStatusBadgeSpec("취소");
  if (normalized === "환불") return getApplicationStatusBadgeSpec("취소");
  if (normalized === "반납완료") return getApplicationStatusBadgeSpec("교체완료");
  return getApplicationStatusBadgeSpec(label);
};

const isApplicationBeforeWork = (status?: string | null) => {
  const normalized = getMypageNormalizedStatus(status);
  return ["접수완료", "검토 중", "승인", "대기중"].includes(normalized);
};

const isApplicationTrackingNeeded = (app?: ActivityApplicationSummary) => {
  if (!app) return false;
  if (isTerminalCanceledStatus(app.status)) return false;

  return Boolean(app.needsInboundTracking && !app.hasTracking);
};

const isApplicationConfirmNeeded = (app?: ActivityApplicationSummary) => {
  if (!app) return false;
  if (isTerminalCanceledStatus(app.status)) return false;

  return getMypageNormalizedStatus(app.status) === "교체완료" && !app.userConfirmedAt;
};

const isApplicationServiceReviewPending = (app?: ActivityApplicationSummary) =>
  Boolean(app?.serviceReviewPending);

const isApplicationTodoActionable = (app?: ActivityApplicationSummary) =>
  isApplicationTrackingNeeded(app) ||
  isApplicationConfirmNeeded(app) ||
  isApplicationServiceReviewPending(app);

const isTerminalCanceledStatus = (status?: string | null) => {
  const normalized = getMypageNormalizedStatus(status);

  return (
    normalized === "취소" || normalized === "환불" || normalized === "거절" || normalized === "반려"
  );
};

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

const isStandaloneApplication = (app?: ActivityApplicationSummary) =>
  Boolean(app && !app.orderId && !app.rentalId);

const shortId = (value?: string | null) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return normalized.slice(-6).toUpperCase();
};

const getApplicationTitle = (app?: ActivityApplicationSummary) => {
  if (!app) return "교체서비스 신청";
  if (app.orderId) return "주문 연계 교체서비스 신청";
  if (app.rentalId) return "대여 연계 교체서비스 신청";
  return "단독 교체서비스 신청";
};

const getApplicationCollectionLabel = (app?: ActivityApplicationSummary) => {
  if (!app) return "-";
  if (!app.inboundRequired) return "입고 불필요(연계 처리)";
  return collectionMethodLabel(app.collectionMethod);
};

const getStringSelectionSummary = (app?: ActivityApplicationSummary | null) => {
  if (!app?.selectedStringName) return null;
  const options = [app.selectedGauge, app.selectedColorLabel].filter(isFilledText).join(" · ");
  return options
    ? `장착 스트링: ${app.selectedStringName} (${options})`
    : `장착 스트링: ${app.selectedStringName}`;
};

const getApplicationTrackingLabel = (app?: ActivityApplicationSummary) => {
  if (!app) return "-";
  if (!app.inboundRequired) return "운송장 입력 대상 아님";
  if (!app.needsInboundTracking) return "운송장 입력 선택 사항";
  return app.hasTracking ? "라켓 발송 운송장 등록됨" : "라켓 발송 운송장 등록 필요";
};

const isRentalReturnShippingAvailable = (rental?: ActivityGroup["rental"]) => {
  if (!rental || rental.status !== "out" || rental.returnedAt) return false;
  if (!rental.dueAt) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(rental.dueAt);
  if (Number.isNaN(dueDate.getTime())) return false;
  dueDate.setHours(0, 0, 0, 0);

  return today >= dueDate;
};

const getTodoPrimaryReason = (group: ActivityGroup): string | null => {
  if (group.kind === "order") {
    // 취소/환불된 주문은 사용자가 더 처리할 일이 없으므로 Todo에서 제외합니다.
    if (isTerminalCanceledStatus(group.order?.status)) return null;

    if (getMypageNormalizedStatus(group.order?.status) === "배송완료") {
      return "구매확정 필요";
    }

    const actionableApplication = group.order?.applicationSummaries?.find((app) =>
      isApplicationTrackingNeeded(app),
    );

    if (isApplicationTrackingNeeded(actionableApplication)) {
      return "라켓 발송 운송장 등록 필요";
    }

    const isConfirmed =
      Boolean(group.order?.userConfirmedAt) ||
      getMypageNormalizedStatus(group.order?.status) === "구매확정";

    if (isConfirmed && (group.order?.reviewPendingCount ?? 0) > 0) {
      return "상품 후기 작성 가능";
    }

    if (group.application?.serviceReviewPending) {
      return "상품+교체서비스 후기 가능";
    }

    return null;
  }

  if (group.kind === "rental") {
    if (isTerminalCanceledStatus(group.rental?.status)) return null;

    if (isRentalReturnShippingAvailable(group.rental)) {
      return group.rental?.hasReturnShipping ? "반납 운송장 수정 필요" : "반납 운송장 등록 필요";
    }

    if (
      getMypageNormalizedStatus(group.rental?.status) === "반납완료" &&
      !group.rental?.userConfirmedAt
    ) {
      return "수령확인 필요";
    }

    if (group.application?.serviceReviewPending) {
      return "상품+교체서비스 후기 가능";
    }

    if (!group.rental?.stringingApplicationId && group.rental?.withStringService) {
      return "교체서비스 신청 필요";
    }

    return null;
  }

  if (isTerminalCanceledStatus(group.application?.status)) return null;

  if (isApplicationTrackingNeeded(group.application)) return "라켓 발송 운송장 등록 필요";
  if (isApplicationConfirmNeeded(group.application)) return "교체서비스 확정 필요";
  if (group.application?.serviceReviewPending) {
    return "상품+교체서비스 후기 가능";
  }

  return null;
};

const getFlowNextActionText = (
  group: ActivityGroup,
  opts?: {
    prefersApplicationView?: boolean;
    todoPrimaryReason?: string | null;
  },
): string | null => {
  if (opts?.todoPrimaryReason) {
    const todoMessageMap: Record<string, string> = {
      "구매확정 필요": "상품을 받으셨다면 구매확정을 진행해주세요.",
      "수령확인 필요": "반납 내용을 확인하고 수령확인을 진행해주세요.",
      "라켓 발송 운송장 등록 필요": "보유 라켓을 매장으로 보내고 운송장 번호를 등록해주세요.",
      "교체서비스 확정 필요": "작업 내용을 확인하고 교체서비스 확정을 진행해주세요.",
      "후기를 남길 수 있어요": "구매확정된 상품은 후기를 작성할 수 있어요.",
      "상품 후기 작성 가능": "구매확정된 상품은 후기를 작성할 수 있어요.",
      "상품+교체서비스 후기 가능": "수령확인된 교체서비스 후기를 작성할 수 있어요.",
      "교체서비스 신청 필요": "교체서비스 신청을 이어서 진행해주세요.",
    };
    return todoMessageMap[opts.todoPrimaryReason] ?? null;
  }

  const viewKind: ActivityGroup["kind"] =
    opts?.prefersApplicationView && group.application ? "application" : group.kind;

  if (viewKind === "order") {
    const normalized = getMypageNormalizedStatus(group.order?.status);
    const linkedApplication = group.application ?? group.order?.applicationSummaries?.[0];
    if (normalized === "취소요청" || normalized === "취소 요청")
      return "취소 요청이 접수되었습니다. 처리 결과를 기다려주세요.";
    if (normalized === "취소") return "취소가 완료되었습니다.";
    if (normalized === "환불" || normalized === "환불 처리중")
      return "환불 진행 상태를 확인해주세요.";
    if (normalized === "대기중") return "결제를 완료해주세요.";
    if (normalized === "결제완료") return "결제가 완료되었습니다. 상품 준비를 기다려주세요.";
    if (normalized === "처리중") {
      if (
        linkedApplication &&
        ["처리중", "작업 중"].includes(getMypageNormalizedStatus(linkedApplication.status))
      ) {
        return "교체서비스 작업이 진행 중입니다. 완료 안내를 기다려주세요.";
      }
      return "상품을 준비하고 있습니다. 준비가 끝나면 배송 또는 수령 안내가 진행됩니다.";
    }
    if (normalized === "배송중") {
      return isVisitPickupOrder({ shippingMethod: group.order?.shippingMethod })
        ? "수령 준비 상태를 확인해주세요."
        : "완성 라켓 배송 중입니다. 배송정보를 확인해주세요.";
    }
    if (normalized === "배송완료") return "상품을 받으셨다면 구매확정을 진행해주세요.";
    if (normalized === "구매확정") {
      const hasPendingOrderReview =
        Boolean(group.order?.hasPendingReview) || (group.order?.reviewPendingCount ?? 0) > 0;

      const hasPendingServiceReview =
        Boolean(group.application?.serviceReviewPending) ||
        (group.order?.applicationSummaries ?? []).some((app) => app.serviceReviewPending);

      if (hasPendingServiceReview) {
        return "수령확인된 교체서비스 후기를 작성할 수 있어요.";
      }

      if (hasPendingOrderReview) {
        return "구매확정된 상품은 후기를 작성할 수 있어요.";
      }

      return null;
    }
    if (linkedApplication?.inboundRequired === false) {
      return linkedApplication.rentalId
        ? "매장에서 대여 라켓에 스트링을 장착해 준비합니다. 사용자가 별도로 라켓을 발송하지 않아도 됩니다."
        : "사용자가 별도로 라켓을 발송하지 않아도 됩니다. 매장에서 라켓에 스트링을 장착해 준비합니다.";
    }
    if (
      linkedApplication?.needsInboundTracking &&
      linkedApplication?.hasTracking &&
      isApplicationBeforeWork(linkedApplication.status)
    ) {
      return "등록한 운송장 기준으로 매장 도착 확인을 기다려주세요.";
    }
    return null;
  }

  if (viewKind === "rental") {
    const normalized = getMypageNormalizedStatus(group.rental?.status);
    if (normalized === "취소") return "대여가 취소되었습니다.";
    if (normalized === "대기중") return "결제를 완료해주세요.";
    if (normalized === "결제완료") return "대여 상품 출고 또는 수령 준비 중입니다.";
    if (normalized === "대여중") return "대여 중입니다. 반납 일정을 확인해주세요.";
    if (normalized === "반납완료") {
      const hasPendingServiceReview =
        Boolean(group.application?.serviceReviewPending) ||
        (group.rental?.applicationSummaries ?? []).some((app) => app.serviceReviewPending);

      if (!group.rental?.userConfirmedAt) {
        return "반납 내용을 확인하고 수령확인을 진행해주세요.";
      }

      if (hasPendingServiceReview) {
        return "수령확인된 교체서비스 후기를 작성할 수 있어요.";
      }

      return null;
    }
    if (!group.rental?.stringingApplicationId && group.rental?.withStringService)
      return "교체서비스 신청을 이어서 진행해주세요.";
    if ((group.rental?.applicationSummaries ?? []).length > 0)
      return "매장에서 대여 라켓에 스트링을 장착해 준비합니다. 사용자가 별도로 라켓을 발송하지 않아도 됩니다.";
    return null;
  }

  const app = group.application;
  const normalized = getMypageNormalizedStatus(app?.status);
  if (normalized === "취소") return "신청이 취소되었습니다.";
  if (normalized === "거절") return "신청이 반려되었습니다. 자세한 내용은 고객센터로 문의해주세요.";
  if (normalized === "처리중" || normalized === "작업 중")
    return "교체서비스 작업이 진행 중입니다. 완료 안내를 기다려주세요.";
  if (normalized === "교체완료")
    return app?.serviceReviewPending
      ? "수령확인된 교체서비스 후기를 작성할 수 있어요."
      : "작업 내용을 확인하고 교체서비스 확정을 진행해주세요.";
  if (app?.inboundRequired === false)
    return app?.rentalId
      ? "매장에서 대여 라켓에 스트링을 장착해 준비합니다. 사용자가 별도로 라켓을 발송하지 않아도 됩니다."
      : "사용자가 별도로 라켓을 발송하지 않아도 됩니다. 매장에서 라켓에 스트링을 장착해 준비합니다.";
  if (app?.needsInboundTracking && app?.hasTracking && isApplicationBeforeWork(app.status))
    return "등록한 운송장 기준으로 매장 도착 확인을 기다려주세요.";
  if (normalized === "접수완료") return "신청이 접수되었습니다. 검토를 기다려주세요.";
  if (normalized === "검토 중") return "신청 내용을 확인 중입니다. 안내를 기다려주세요.";
  if (normalized === "승인") return "신청이 확인되었습니다. 다음 안내를 기다려주세요.";
  return null;
};
const canShowOrderShippingInfo = (status?: string | null) => {
  const normalized = getMypageNormalizedStatus(status);
  return normalized === "배송중" || normalized === "배송완료" || normalized === "구매확정";
};

function FlowListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <Card key={idx} className="border-border bg-card shadow-sm">
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
  const scope = parseOrdersScope(searchParams.get("scope")) ?? "all";
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [confirmingRentalId, setConfirmingRentalId] = useState<string | null>(null);
  const [confirmingApplicationId, setConfirmingApplicationId] = useState<string | null>(null);
  const [expandedSecondaryKey, setExpandedSecondaryKey] = useState<string | null>(null);
  const [cancelOrderDialogId, setCancelOrderDialogId] = useState<string | null>(null);
  const [cancelApplicationDialogId, setCancelApplicationDialogId] = useState<string | null>(null);
  const [cancelRentalDialogId, setCancelRentalDialogId] = useState<string | null>(null);
  const [shippingInfoDialogTarget, setShippingInfoDialogTarget] = useState<{
    orderId: string;
    triggerLabel: string;
    shippingMethod?: string;
  } | null>(null);
  const [isCancelApplicationSubmitting, setIsCancelApplicationSubmitting] = useState(false);
  const [withdrawingOrderCancelId, setWithdrawingOrderCancelId] = useState<string | null>(null);
  const getKey = (pageIndex: number, previousPageData: ActivityResponse | null) => {
    if (previousPageData && previousPageData.items && previousPageData.items.length < LIMIT)
      return null;
    const page = pageIndex + 1;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(LIMIT));
    if (scope !== "all") {
      params.set("scope", scope);
    }
    return `/api/mypage/activity?${params.toString()}`;
  };

  const { data, size, setSize, isValidating, error, mutate } = useSWRInfinite<ActivityResponse>(
    getKey,
    fetcher,
    {
      revalidateFirstPage: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const patchOrderCancelStatus = async (orderId: string, nextCancelStatus: "requested" | null) => {
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
                  cancelStatus: isTargetLinkedApplication
                    ? nextCancelStatus
                    : item.application.cancelStatus,
                }
              : item.application;

            const nextOrder =
              isTargetOrderCard && item.order
                ? {
                    ...item.order,
                    cancelStatus: nextCancelStatus,
                    cancelReasonSummary:
                      nextCancelStatus === null ? null : (item.order.cancelReasonSummary ?? null),
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
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/mypage/activity"),
        undefined,
        { revalidate: true },
      ),
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/users/me/orders"),
        undefined,
        { revalidate: true },
      ),
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/me/rentals"),
        undefined,
        { revalidate: true },
      ),
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/applications/me"),
        undefined,
        { revalidate: true },
      ),
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/points/me"),
        undefined,
        { revalidate: true },
      ),
    ]);
  };

  const syncOrderRelatedCaches = async (orderId: string) => {
    await Promise.all([
      globalMutate(`/api/orders/${orderId}/status`, undefined, {
        revalidate: true,
      }),
      globalMutate(`/api/orders/${orderId}/history`, undefined, {
        revalidate: true,
      }),
      globalMutate(`/api/orders/${orderId}`, undefined, { revalidate: true }),
    ]);
  };

  const handleConfirmPurchase = async (orderId: string) => {
    if (confirmingOrderId) return;
    if (!window.confirm("구매확정 처리하시겠습니까?\n확정 후에는 되돌릴 수 없습니다.")) return;

    try {
      setConfirmingOrderId(orderId);
      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        showErrorToast(data?.error || data?.message || "구매확정 처리 중 오류가 발생했습니다.");
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
                if (app.userConfirmedAt || getMypageNormalizedStatus(app.status) !== "교체완료")
                  return app;
                return { ...app, userConfirmedAt: optimisticConfirmedAt };
              };

              const patchedSelectedApplication = item.application
                ? patchConfirmedApp(item.application)
                : item.application;

              return {
                ...item,
                order: item.order
                  ? {
                      ...item.order,
                      status: "구매확정",
                      userConfirmedAt: optimisticConfirmedAt,
                      applicationSummaries: item.order.applicationSummaries?.map((app) =>
                        patchConfirmedApp(app),
                      ),
                    }
                  : item.order,
                application: patchedSelectedApplication,
              };
            }),
          }));
        },
        { revalidate: false },
      );

      showSuccessToast("구매확정이 완료되었습니다.");
      await refreshRelatedQueries();
    } catch (e) {
      console.error(e);
      showErrorToast("구매확정 처리 중 오류가 발생했습니다.");
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleConfirmApplication = async (applicationId: string) => {
    if (confirmingApplicationId) return;
    if (!window.confirm("교체 확정 처리할까요?\n확정 시 포인트가 지급되며 되돌릴 수 없습니다."))
      return;

    try {
      setConfirmingApplicationId(applicationId);
      const res = await fetch(`/api/applications/stringing/${applicationId}/confirm`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        showErrorToast(data?.message || "교체 확정에 실패했습니다.");
        return;
      }
      showSuccessToast(
        data?.already
          ? data?.message || "이미 교체서비스 확정된 신청입니다."
          : "교체 확정이 완료되었습니다.",
      );
      await refreshRelatedQueries();
    } catch (e) {
      console.error(e);
      showErrorToast("교체 확정 중 오류가 발생했습니다.");
    } finally {
      setConfirmingApplicationId(null);
    }
  };

  const handleConfirmRental = async (rentalId: string) => {
    if (confirmingRentalId) return;
    if (!window.confirm("수령확인 처리하시겠습니까?\n확정 후에는 되돌릴 수 없습니다.")) return;

    try {
      setConfirmingRentalId(rentalId);
      const res = await fetch(`/api/me/rentals/${rentalId}/confirm`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        showErrorToast(data?.message || "수령확인 처리 중 오류가 발생했습니다.");
        return;
      }

      const earnedPoints = Number(data?.earnedPoints ?? 0);
      showSuccessToast(
        data?.pointsGranted && earnedPoints > 0
          ? `수령확인이 완료되었습니다. ${earnedPoints.toLocaleString()}P가 적립되었습니다.`
          : data?.already
            ? data?.message || "이미 수령확인된 대여입니다."
            : "수령확인이 완료되었습니다.",
      );
      await refreshRelatedQueries();
    } catch (e) {
      console.error(e);
      showErrorToast("수령확인 처리 중 오류가 발생했습니다.");
    } finally {
      setConfirmingRentalId(null);
    }
  };

  const handleApplicationCancelRequest = async (params: CancelStringingParams) => {
    if (!cancelApplicationDialogId) return;
    try {
      setIsCancelApplicationSubmitting(true);
      const res = await fetch(
        `/api/applications/stringing/${cancelApplicationDialogId}/cancel-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reasonCode: params.reasonCode,
            reasonText: params.reasonText,
            ...(params.refundAccount ? { refundAccount: params.refundAccount } : {}),
          }),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        showErrorToast(body?.message || "신청 취소 요청 처리 중 오류가 발생했습니다.");
        return;
      }

      showSuccessToast("신청 취소 요청이 접수되었습니다.");
      setCancelApplicationDialogId(null);
      await refreshRelatedQueries();
    } catch (e) {
      console.error(e);
      showErrorToast("신청 취소 요청 처리 중 오류가 발생했습니다.");
    } finally {
      setIsCancelApplicationSubmitting(false);
    }
  };

  const handleOrderCancelWithdraw = async (orderId: string) => {
    if (withdrawingOrderCancelId) return;
    if (!window.confirm("이 주문의 취소 요청을 철회하시겠습니까?")) return;

    try {
      setWithdrawingOrderCancelId(orderId);
      const res = await fetch(`/api/orders/${orderId}/cancel-request-withdraw`, {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        showErrorToast(body?.message || "취소 요청 철회 중 오류가 발생했습니다.");
        return;
      }

      showSuccessToast("주문 취소 요청을 철회했습니다.");
      await patchOrderCancelStatus(orderId, null);
      await syncOrderRelatedCaches(orderId);
    } catch (e) {
      console.error(e);
      showErrorToast("취소 요청 철회 중 오류가 발생했습니다.");
    } finally {
      setWithdrawingOrderCancelId(null);
    }
  };

  const flowQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("from", "orders");
    params.set("scope", scope);
    return params.toString();
  }, [scope]);

  const items = useMemo(() => (data ? data.flatMap((d) => d.items) : []), [data]);
  const cancelOrderTarget = cancelOrderDialogId
    ? items.find((group) => {
        const id = group.order?.id ?? (group.kind === "order" ? group.detailTarget.id : undefined);
        return id === cancelOrderDialogId;
      })?.order
    : null;
  const cancelApplicationTarget = cancelApplicationDialogId
    ? (items
        .flatMap((group) => [
          group.application,
          ...(group.order?.applicationSummaries ?? []),
          ...(group.rental?.applicationSummaries ?? []),
        ])
        .find((app) => app?.id === cancelApplicationDialogId) ?? null)
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
      {scope === "todo" ? (
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <p className="break-keep text-ui-label font-medium text-foreground">
              지금 처리할 수 있는 구매확정, 운송장, 후기 작성 항목만 모았습니다.
            </p>
          </div>
        </div>
      ) : null}
      <p className="break-keep text-ui-label text-muted-foreground">
        주문·대여와 연결된 교체서비스를 함께 확인할 수 있습니다.
      </p>
      {items.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title={
            scope === "todo"
              ? "지금 처리할 일이 없습니다."
              : scope === "application"
                ? "표시할 서비스 신청이 없습니다."
                : scope === "rental"
                  ? "표시할 대여 내역이 없습니다."
                  : scope === "order"
                    ? "표시할 주문 내역이 없습니다."
                    : "표시할 거래/이용 내역이 없습니다."
          }
          description={
            scope === "todo"
              ? "주문, 교체서비스, 대여 진행 중 필요한 작업이 생기면 이곳에 표시됩니다."
              : "새 이용내역이 생기면 이곳에서 상태와 다음 행동을 확인할 수 있습니다."
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((g) => {
            const orderId = g.order?.id ?? (g.kind === "order" ? g.detailTarget.id : undefined);
            const rentalId = g.rental?.id ?? (g.kind === "rental" ? g.detailTarget.id : undefined);

            const linkedApps =
              g.kind === "order"
                ? (g.order?.applicationSummaries ?? [])
                : g.kind === "rental"
                  ? (g.rental?.applicationSummaries ?? [])
                  : [];
            const linkedActionableApplication =
              linkedApps.find((app) => isApplicationTrackingNeeded(app)) ??
              linkedApps.find((app) => isApplicationTodoActionable(app));
            const prefersApplicationView = scope === "application" && Boolean(g.application);
            const displayApplication = g.application;
            const isDirectApplicationCard = g.kind === "application" || prefersApplicationView;
            const applicationActionTarget = displayApplication ?? linkedActionableApplication;
            const isLinkedApplicationConfirmSuppressed = Boolean(
              applicationActionTarget?.orderId || applicationActionTarget?.rentalId,
            );
            const actionableApplicationId = applicationActionTarget?.id;
            const primaryLinkedApplicationId =
              g.kind === "order"
                ? (g.order?.stringingApplicationId ??
                  linkedActionableApplication?.id ??
                  g.order?.applicationSummaries?.[0]?.id)
                : g.kind === "rental"
                  ? (g.rental?.stringingApplicationId ??
                    linkedActionableApplication?.id ??
                    g.rental?.applicationSummaries?.[0]?.id)
                  : undefined;
            const status =
              g.kind === "order"
                ? g.order?.status
                : g.kind === "rental"
                  ? g.rental?.status
                  : g.application?.status;
            const normalizedStatus = getMypageNormalizedStatus(status);
            const userStatusLabel = getMypageUserStatusLabel(status);
            const orderDisplayStatusLabel =
              g.kind === "order"
                ? getOrderStatusLabelForDisplay(userStatusLabel, {
                    shippingMethod: g.order?.shippingMethod,
                  })
                : userStatusLabel;
            const statusBadgeSpec = getStatusBadgeSpec(g, userStatusLabel);
            const linkedCount =
              g.kind === "order"
                ? (g.order?.linkedApplicationCount ?? 0)
                : g.kind === "rental"
                  ? (g.rental?.linkedApplicationCount ?? 0)
                  : 0;
            const needsTrackingAction = isApplicationTrackingNeeded(applicationActionTarget);
            const normalizedMetaLabel = normalizeLabel(FLOW_TYPE_META_LABEL[g.flowType]);
            const normalizedFlowLabel = normalizeLabel(g.flowLabel);
            const todoPrimaryReason =
              scope === "todo" || scope === "all" ? getTodoPrimaryReason(g) : null;
            const nextActionText = getFlowNextActionText(g, {
              prefersApplicationView,
              todoPrimaryReason,
            });

            const linkedFlowBadgeLabel =
              !prefersApplicationView &&
              (g.flowType === "order_plus_stringing" || g.flowType === "rental_plus_stringing")
                ? "교체서비스 연결"
                : null;
            const shouldShowFlowBadge =
              !prefersApplicationView &&
              !linkedFlowBadgeLabel &&
              Boolean(normalizedFlowLabel) &&
              normalizedFlowLabel !== normalizedMetaLabel;
            const displayKind: FlowDetailType = prefersApplicationView ? "application" : g.kind;
            const isApplicationActionContext =
              Boolean(applicationActionTarget) &&
              (isDirectApplicationCard || scope === "todo" || scope === "all");
            const displayTitle = prefersApplicationView
              ? getApplicationTitle(displayApplication)
              : getRepresentativeTitle(g);
            const displayStatus = prefersApplicationView ? displayApplication?.status : status;
            const displayUserStatusLabel = prefersApplicationView
              ? getMypageUserStatusLabel(displayStatus)
              : orderDisplayStatusLabel;
            const displayStatusBadgeSpec = prefersApplicationView
              ? getStatusBadgeSpec({ ...g, kind: "application" }, displayUserStatusLabel)
              : statusBadgeSpec;

            const displayDateValue =
              displayKind === "order"
                ? (g.order?.createdAt ?? g.sortAt)
                : displayKind === "rental"
                  ? (g.rental?.createdAt ?? g.sortAt)
                  : (displayApplication?.createdAt ?? g.createdAt ?? g.sortAt);
            const detailTargetType: FlowDetailType = prefersApplicationView
              ? "application"
              : g.detailTarget.type;
            const detailTargetId =
              prefersApplicationView && displayApplication?.id
                ? displayApplication.id
                : g.detailTarget.id;
            const detailHref =
              prefersApplicationView && displayApplication?.id
                ? getStringingDetailHref(displayApplication, flowQuery)
                : `/mypage?tab=orders&flowType=${detailTargetType}&flowId=${detailTargetId}&${flowQuery}`;
            const displayMetaLabel = prefersApplicationView
              ? "교체서비스 신청"
              : FLOW_TYPE_META_LABEL[g.flowType];
            const showLinkedStatusBadge =
              g.flowType !== "application_only" && linkedCount > 0 && !prefersApplicationView;
            const standaloneApplicationIdMeta =
              isStandaloneApplication(displayApplication) && displayApplication?.id
                ? ` · #${shortId(displayApplication.id) ?? "-"}`
                : "";
            const isCancelRequested =
              (displayKind === "order" && g.order?.cancelStatus === "requested") ||
              (displayKind === "rental" && g.rental?.cancelStatus === "requested") ||
              (displayKind === "application" &&
                (displayApplication ?? g.application)?.cancelStatus === "requested");
            const FlowIcon =
              displayKind === "order" ? Package : displayKind === "rental" ? Calendar : Wrench;
            const heroSummary =
              displayKind === "order"
                ? formatAmount(g.order?.totalPrice)
                : displayKind === "rental"
                  ? formatAmount(g.rental?.totalAmount)
                  : getApplicationTrackingLabel(displayApplication);
            const heroSubSummary =
              displayKind === "order"
                ? getMypagePaymentStatusLabel(g.order?.paymentStatus)
                : displayKind === "rental"
                  ? typeof g.rental?.days === "number"
                    ? `${g.rental.days}일 대여`
                    : "대여 기간 확인"
                  : getApplicationCollectionLabel(displayApplication);
            const linkedStringSummary = !prefersApplicationView
              ? getStringSelectionSummary(g.application)
              : null;
            const linkedApplicationStatusLabel =
              !prefersApplicationView && g.application
                ? getMypageUserStatusLabel(g.application.status)
                : null;

            return (
              <div
                key={g.key}
                className="grid gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm transition-colors hover:bg-muted/30 bp-sm:px-4 md:grid-cols-[112px_minmax(0,1fr)_auto] md:items-start md:gap-4"
              >
                <div className="flex min-w-0 items-start justify-between gap-3 md:hidden">
                  <div className="min-w-0">
                    <p className="text-ui-body-sm font-semibold text-foreground">
                      {displayUserStatusLabel}
                    </p>
                    <p className="mt-0.5 text-ui-label text-muted-foreground">
                      {formatDate(displayDateValue)} · {displayMetaLabel}
                    </p>
                  </div>
                </div>
                <div className="hidden min-w-0 md:block">
                  <span className="text-ui-label tabular-nums text-muted-foreground">
                    {formatDate(displayDateValue)}
                  </span>
                  <span className="mt-1 block text-ui-label font-medium text-muted-foreground/70">
                    {displayMetaLabel}
                  </span>
                </div>

                {/* 중간: 메인 정보 */}
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Link href={detailHref} className="inline-flex max-w-full items-start gap-1.5">
                    <FlowIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="line-clamp-2 break-keep text-ui-body-sm font-semibold text-foreground transition-colors hover:text-primary bp-sm:text-ui-body">
                      {displayTitle}
                    </span>
                  </Link>
                  <p className="break-keep text-ui-label tabular-nums text-muted-foreground bp-sm:text-ui-body-sm">
                    {heroSummary}
                    {heroSubSummary ? ` · ${heroSubSummary}` : ""}
                    {standaloneApplicationIdMeta}
                  </p>

                  {linkedFlowBadgeLabel ||
                  shouldShowFlowBadge ||
                  showLinkedStatusBadge ||
                  isCancelRequested ? (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-ui-label">
                      {linkedFlowBadgeLabel ? (
                        <Badge variant="secondary" className="shrink-0 whitespace-nowrap">
                          {linkedFlowBadgeLabel}
                        </Badge>
                      ) : null}
                      {shouldShowFlowBadge ? (
                        <Badge variant="outline" className="shrink-0 whitespace-nowrap">
                          {g.flowLabel}
                        </Badge>
                      ) : null}
                      {showLinkedStatusBadge ? (
                        <Badge
                          variant="secondary"
                          className="hidden shrink-0 whitespace-nowrap bp-sm:inline-flex"
                        >
                          {getLinkedApplicationStatusSummary(linkedApps)}
                        </Badge>
                      ) : null}
                      {isCancelRequested ? (
                        <Badge
                          variant={getWorkflowMetaBadgeSpec("cancel_requested").variant}
                          className="gap-1"
                        >
                          <AlertCircle className="h-3 w-3" />
                          취소 요청됨
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}

                  {linkedStringSummary || linkedApplicationStatusLabel ? (
                    <p className="line-clamp-2 break-keep text-ui-label leading-relaxed text-muted-foreground bp-sm:line-clamp-none">
                      {[
                        linkedStringSummary,
                        linkedApplicationStatusLabel
                          ? `교체서비스 상태: ${linkedApplicationStatusLabel}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}

                  {todoPrimaryReason && nextActionText ? (
                    <p className="line-clamp-2 break-keep text-ui-label leading-relaxed bp-sm:line-clamp-none">
                      <span className="font-semibold text-primary">{todoPrimaryReason}</span>
                      <span className="text-muted-foreground"> · {nextActionText}</span>
                    </p>
                  ) : nextActionText ? (
                    <p className="line-clamp-2 break-keep text-ui-label leading-relaxed text-muted-foreground bp-sm:line-clamp-none">
                      {nextActionText}
                    </p>
                  ) : null}
                </div>

                {/* 오른쪽(상태 배지 + 액션 버튼) + 펼침 패널 */}
                {(() => {
                  type ActionDef = {
                    key: string;
                    priority: number;
                    pinInline?: boolean;
                    forceSecondary?: boolean;
                    node: React.ReactNode;
                  };

                  const actions: ActionDef[] = [];

                  const hasOrderLinkedApplication =
                    g.kind === "order" &&
                    !prefersApplicationView &&
                    Boolean(primaryLinkedApplicationId) &&
                    Boolean(orderId);
                  const hasRentalLinkedApplication =
                    g.kind === "rental" &&
                    !prefersApplicationView &&
                    Boolean(primaryLinkedApplicationId) &&
                    Boolean(rentalId);
                  const isRentalLinkedApplicationAction =
                    g.kind === "rental" &&
                    !prefersApplicationView &&
                    Boolean(applicationActionTarget?.rentalId);
                  const hasIntegratedLinkedApplication =
                    hasOrderLinkedApplication || hasRentalLinkedApplication;

                  const resolvedDetailHref =
                    hasOrderLinkedApplication && orderId
                      ? `/mypage?tab=orders&flowType=order&flowId=${orderId}&${flowQuery}&focus=stringing`
                      : hasRentalLinkedApplication && rentalId
                        ? `/mypage?tab=orders&flowType=rental&flowId=${rentalId}&${flowQuery}&focus=stringing`
                        : detailHref;

                  const resolvedDetailLabel = hasOrderLinkedApplication
                    ? "주문 상세"
                    : hasRentalLinkedApplication
                      ? "대여 상세"
                      : detailTargetType === "order"
                        ? "주문 상세"
                        : detailTargetType === "rental"
                          ? "대여 상세"
                          : "교체서비스 상세";

                  const detailPriority = scope === "todo" || prefersApplicationView ? 10 : 3;
                  actions.push({
                    key: "flow-detail",
                    priority: detailPriority,
                    node: (
                      <Button
                        key="flow-detail"
                        asChild
                        size="sm"
                        variant="outline"
                        className="bg-transparent"
                      >
                        <Link href={resolvedDetailHref}>
                          {resolvedDetailLabel} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ),
                  });

                  const canRenderOrderReview =
                    Boolean(g.order?.userConfirmedAt) || normalizedStatus === "구매확정";

                  if (prefersApplicationView) {
                    if (orderId) {
                      actions.push({
                        key: "application-linked-order",
                        priority: 5,
                        forceSecondary: true,
                        node: (
                          <Button
                            key="application-linked-order"
                            asChild
                            size="sm"
                            variant="outline"
                            className="bg-transparent"
                          >
                            <Link
                              href={`/mypage?tab=orders&flowType=order&flowId=${orderId}&${flowQuery}&focus=stringing`}
                            >
                              주문 상세
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ),
                      });
                    }

                    if (rentalId) {
                      actions.push({
                        key: "application-linked-rental",
                        priority: 5,
                        forceSecondary: true,
                        node: (
                          <Button
                            key="application-linked-rental"
                            asChild
                            size="sm"
                            variant="outline"
                            className="bg-transparent"
                          >
                            <Link
                              href={`/mypage?tab=orders&flowType=rental&flowId=${rentalId}&${flowQuery}&focus=stringing`}
                            >
                              대여 상세
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ),
                      });
                    }
                  }

                  if (g.kind === "order" && orderId && !prefersApplicationView) {
                    if (canShowOrderShippingInfo(status)) {
                      const isVisitPickup = isVisitPickupOrder({
                        shippingMethod: g.order?.shippingMethod,
                      });
                      const shippingInfoLabel = isVisitPickup
                        ? "수령정보 확인"
                        : linkedCount > 0
                          ? "완성 라켓 배송정보 확인"
                          : "배송정보 확인";
                      actions.push({
                        key: "order-shipping-info",
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
                            {shippingInfoLabel}
                          </Button>
                        ),
                      });
                    }

                    if (g.order?.cancelStatus === "requested") {
                      actions.push({
                        key: "order-cancel-withdraw",
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
                            {withdrawingOrderCancelId === orderId ? "철회 중..." : "취소 요청 철회"}
                          </Button>
                        ),
                      });
                    } else if (["대기중", "결제완료"].includes(normalizedStatus)) {
                      actions.push({
                        key: "order-cancel-request",
                        priority: 1,
                        forceSecondary: true,
                        node: (
                          <Button
                            key="order-cancel-request"
                            size="sm"
                            variant="destructive"
                            onClick={() => setCancelOrderDialogId(orderId)}
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            취소 요청
                          </Button>
                        ),
                      });
                    } else if (normalizedStatus === "배송완료") {
                      actions.push({
                        key: "order-confirm",
                        priority: 0,
                        pinInline: true,
                        node: (
                          <Button
                            key="order-confirm"
                            size="sm"
                            disabled={confirmingOrderId === orderId}
                            onClick={() => handleConfirmPurchase(orderId)}
                          >
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            {confirmingOrderId === orderId ? "처리 중..." : "구매확정"}
                          </Button>
                        ),
                      });
                    }

                    const hasOrderReviewPending =
                      Boolean(g.order?.hasPendingReview) || (g.order?.reviewPendingCount ?? 0) > 0;

                    if (canRenderOrderReview && hasOrderReviewPending) {
                      actions.push({
                        key: "order-review",
                        priority: 4,
                        node: (
                          <ActivityOrderReviewCTA
                            key="order-review"
                            orderId={orderId}
                            orderStatus={status}
                            userConfirmedAt={g.order?.userConfirmedAt}
                            className="bg-transparent"
                          />
                        ),
                      });
                    }
                  }

                  if (g.kind === "rental" && rentalId && !prefersApplicationView) {
                    if (normalizedStatus === "반납완료" && !g.rental?.userConfirmedAt) {
                      actions.push({
                        key: "rental-confirm",
                        priority: 0,
                        pinInline: true,
                        node: (
                          <Button
                            key="rental-confirm"
                            size="sm"
                            disabled={confirmingRentalId === rentalId}
                            onClick={() => handleConfirmRental(rentalId)}
                          >
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            {confirmingRentalId === rentalId ? "처리 중..." : "수령확인"}
                          </Button>
                        ),
                      });
                    }

                    if (
                      ["pending", "paid", "대기중", "결제완료"].includes(normalizedStatus) &&
                      !g.rental?.hasOutboundShipping
                    ) {
                      actions.push({
                        key: "rental-cancel-request",
                        priority: 1,
                        forceSecondary: true,
                        node: (
                          <Button
                            key="rental-cancel-request"
                            size="sm"
                            variant="destructive"
                            onClick={() => setCancelRentalDialogId(rentalId)}
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            대여 취소 요청
                          </Button>
                        ),
                      });
                    }

                    if (isRentalReturnShippingAvailable(g.rental)) {
                      actions.push({
                        key: "rental-return-shipping",
                        priority: 0,
                        pinInline: true,
                        node: (
                          <Button key="rental-return-shipping" asChild size="sm">
                            <Link href={`/mypage/rentals/${rentalId}/return-shipping`}>
                              {g.rental?.hasReturnShipping
                                ? "반납 운송장 수정"
                                : "반납 운송장 등록"}
                            </Link>
                          </Button>
                        ),
                      });
                    }

                    if (!g.rental?.stringingApplicationId && g.rental?.withStringService) {
                      actions.push({
                        key: "rental-apply-stringing",
                        priority: 2,
                        node: (
                          <Button key="rental-apply-stringing" asChild size="sm">
                            <Link href={`/services/apply?rentalId=${rentalId}`}>
                              교체서비스 신청
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ),
                      });
                    }
                  }

                  if (isApplicationActionContext && applicationActionTarget?.id) {
                    if (
                      !isRentalLinkedApplicationAction &&
                      isApplicationTrackingNeeded(applicationActionTarget)
                    ) {
                      actions.push({
                        key: "application-shipping",
                        priority: 0,
                        pinInline: true,
                        node: (
                          <Button
                            key="application-shipping"
                            asChild
                            size="sm"
                            variant={applicationActionTarget.hasTracking ? "outline" : "default"}
                            className={applicationActionTarget.hasTracking ? "bg-transparent" : undefined}
                          >
                            <Link
                              href={`/services/applications/${applicationActionTarget.id}/shipping?return=${encodeURIComponent(`/mypage?tab=orders&${flowQuery}`)}`}
                            >
                              {applicationActionTarget.hasTracking ? "라켓 발송 운송장 수정" : "라켓 발송 운송장 등록"}
                            </Link>
                          </Button>
                        ),
                      });
                    }

                    if (
                      isDirectApplicationCard &&
                      ["접수완료", "검토 중"].includes(
                        getMypageNormalizedStatus(applicationActionTarget.status),
                      )
                    ) {
                      actions.push({
                        key: "application-cancel-request",
                        priority: 1,
                        forceSecondary: true,
                        node: (
                          <Button
                            key="application-cancel-request"
                            size="sm"
                            variant="destructive"
                            onClick={() => setCancelApplicationDialogId(applicationActionTarget.id)}
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            신청 취소 요청
                          </Button>
                        ),
                      });
                    }

                    if (
                      getMypageNormalizedStatus(applicationActionTarget.status) === "교체완료" &&
                      !applicationActionTarget.userConfirmedAt &&
                      !isLinkedApplicationConfirmSuppressed
                    ) {
                      actions.push({
                        key: "application-confirm",
                        priority: 0,
                        pinInline: scope === "todo" || scope === "all",
                        node: (
                          <Button
                            key="application-confirm"
                            size="sm"
                            disabled={confirmingApplicationId === applicationActionTarget.id}
                            onClick={() => handleConfirmApplication(applicationActionTarget.id)}
                          >
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            {confirmingApplicationId === applicationActionTarget.id
                              ? "처리 중..."
                              : "교체서비스 확정"}
                          </Button>
                        ),
                      });
                    }

                    if (
                      applicationActionTarget.userConfirmedAt &&
                      applicationActionTarget.serviceReviewPending
                    ) {
                      actions.push({
                        key: "application-review",
                        priority: 0,
                        pinInline: true,
                        node: (
                          <ServiceReviewCTA
                            key="application-review"
                            applicationId={applicationActionTarget.id}
                            status={applicationActionTarget.status}
                            userConfirmedAt={applicationActionTarget.userConfirmedAt}
                          />
                        ),
                      });
                    }
                  }

                  if (
                    needsTrackingAction &&
                    actionableApplicationId &&
                    (!primaryLinkedApplicationId ||
                      primaryLinkedApplicationId !== actionableApplicationId)
                  ) {
                    actions.push({
                      key: "application-open-sheet",
                      priority: 3,
                      node: (
                        <Button key="application-open-sheet" asChild size="sm" variant="default">
                          <Link
                            href={
                              applicationActionTarget
                                ? getStringingDetailHref(applicationActionTarget, flowQuery)
                                : `/mypage?tab=orders&flowType=application&flowId=${actionableApplicationId}&${flowQuery}`
                            }
                          >
                            교체서비스 상세
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      ),
                    });
                  }

                  const sortedActions = actions.sort((a, b) => a.priority - b.priority);
                  const forcedSecondary = sortedActions.filter((a) => a.forceSecondary);
                  const inlineEligible = sortedActions.filter((a) => !a.forceSecondary);
                  const shouldUseSecondary =
                    inlineEligible.length > 3 || forcedSecondary.length > 0;
                  const pinnedInline = sortedActions.filter((a) => a.pinInline);
                  const nonPinned = inlineEligible.filter((a) => !a.pinInline);

                  const primaryCount = shouldUseSecondary ? 1 : nonPinned.length;
                  const inlineActions = [...pinnedInline, ...nonPinned.slice(0, primaryCount)];
                  const secondaryActions = shouldUseSecondary
                    ? [...nonPinned.slice(primaryCount), ...forcedSecondary]
                    : [];
                  const isSecondaryOpen = expandedSecondaryKey === g.key;

                  return (
                    <>
                      {/* 오른쪽 컬럼: 상태 배지 + 액션 버튼 */}
                      <div className="flex w-full shrink-0 flex-col items-start gap-2 md:w-[168px] md:items-stretch md:self-start">
                        <div className="hidden flex-wrap items-center gap-1.5 md:flex md:justify-end">
                          <Badge
                            variant={displayStatusBadgeSpec.variant}
                            className="shrink-0 whitespace-nowrap"
                          >
                            {displayUserStatusLabel}
                          </Badge>
                        </div>

                        {inlineActions.length > 0 || secondaryActions.length > 0 ? (
                          <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-full md:flex-col md:items-stretch [&_a]:h-9 [&_a]:w-full [&_a]:min-w-0 [&_a]:justify-center [&_a]:overflow-hidden [&_a]:px-2.5 [&_a]:text-center [&_a]:text-ui-label [&_a]:font-medium [&_a]:leading-none [&_a]:whitespace-nowrap md:[&_a]:h-8 md:[&_a]:px-3 [&_button]:h-9 [&_button]:w-full [&_button]:min-w-0 [&_button]:justify-center [&_button]:overflow-hidden [&_button]:px-2.5 [&_button]:text-center [&_button]:text-ui-label [&_button]:font-medium [&_button]:leading-none [&_button]:whitespace-nowrap md:[&_button]:h-8 md:[&_button]:px-3">
                            {inlineActions.map((action) => (
                              <Fragment key={action.key}>{action.node}</Fragment>
                            ))}
                            {secondaryActions.length > 0 ? (
                              <button
                                type="button"
                                className={`group relative flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-ui-label font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 md:h-8 md:px-3 ${
                                  isSecondaryOpen
                                    ? "border-border bg-muted text-foreground shadow-none"
                                    : "border-border bg-background text-muted-foreground hover:bg-card hover:text-foreground"
                                }`}
                                onClick={() =>
                                  setExpandedSecondaryKey((prev) => (prev === g.key ? null : g.key))
                                }
                              >
                                <span>
                                  {isSecondaryOpen
                                    ? "접기"
                                    : `추가 작업 ${secondaryActions.length}개`}
                                </span>
                                {isSecondaryOpen ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                        {secondaryActions.length > 0 && isSecondaryOpen ? (
                          <div className="hidden w-full grid-cols-1 gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-2 py-2 md:grid [&_a]:h-8 [&_a]:w-full [&_a]:min-w-0 [&_a]:justify-center [&_a]:overflow-hidden [&_a]:px-3 [&_a]:text-center [&_a]:text-ui-label [&_a]:font-medium [&_a]:leading-none [&_a]:whitespace-nowrap [&_button]:h-8 [&_button]:w-full [&_button]:min-w-0 [&_button]:justify-center [&_button]:overflow-hidden [&_button]:px-3 [&_button]:text-center [&_button]:text-ui-label [&_button]:font-medium [&_button]:leading-none [&_button]:whitespace-nowrap">
                            {secondaryActions.map((action) => (
                              <Fragment key={action.key}>{action.node}</Fragment>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      {secondaryActions.length > 0 && isSecondaryOpen ? (
                        <div className="col-span-full grid w-full grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 md:hidden [&_a]:h-9 [&_a]:w-full [&_a]:min-w-0 [&_a]:justify-center [&_a]:overflow-hidden [&_a]:px-2.5 [&_a]:text-center [&_a]:text-ui-label [&_a]:font-medium [&_a]:leading-none [&_a]:whitespace-nowrap [&_button]:h-9 [&_button]:w-full [&_button]:min-w-0 [&_button]:justify-center [&_button]:overflow-hidden [&_button]:px-2.5 [&_button]:text-center [&_button]:text-ui-label [&_button]:font-medium [&_button]:leading-none [&_button]:whitespace-nowrap">
                          {secondaryActions.map((action) => (
                            <Fragment key={action.key}>{action.node}</Fragment>
                          ))}
                        </div>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating}>
            {isValidating ? "불러오는 중..." : "더 보기"}
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
            await patchOrderCancelStatus(orderId, "requested");
          }}
        />
      ) : null}

      {cancelApplicationDialogId ? (
        <CancelStringingDialog
          open={Boolean(cancelApplicationDialogId)}
          onOpenChange={(open) => !open && setCancelApplicationDialogId(null)}
          onConfirm={handleApplicationCancelRequest}
          isSubmitting={isCancelApplicationSubmitting}
          needsRefundAccount={shouldRequestCancelRefundAccount(cancelApplicationTarget)}
          noRefundAccountMessage={getNoRefundAccountMessage(cancelApplicationTarget)}
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
