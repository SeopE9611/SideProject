"use client";

import { collectionMethodLabel } from "@/app/features/stringing-applications/lib/fulfillment-labels";
import OrdersScopeTabs, { parseOrdersScope } from "@/app/mypage/_components/OrdersScopeTabs";
import {
  getMypageNormalizedStatus,
  getMypageUserStatusLabel,
} from "@/app/mypage/_lib/status-label";
import { EmptyState } from "@/components/public/EmptyState";
import AsyncState from "@/components/system/AsyncState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getApplicationStatusBadgeSpec,
  getOrderStatusBadgeSpec,
  getRentalStatusBadgeSpec,
  getWorkflowMetaBadgeSpec,
} from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { getOrderStatusLabelForDisplay, isVisitPickupOrder } from "@/lib/order-shipping";
import {
  isOrderConfirmedStatus,
  isOrderDeliveredStatus,
  isRentalReturnedStatus,
  isStringingCompletedStatus,
} from "@/lib/status/flow-status";
import { buildReviewWriteHref, type CanonicalReviewTarget, type ReviewContext } from "@/lib/reviews/review-target";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle,
  MessageSquarePlus,
  MoreHorizontal,
  Package,
  Wrench,
  Sparkles,
  Undo2,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
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
  reviewPendingCount?: number;
  reviewAllDone?: boolean;
  reviewNextTargetProductId?: string | null;
  reviewNextApplicationId?: string | null;
  reviewContext?: string | null;
  nextReviewTarget?: CanonicalReviewTarget | null;
  reviewTargetBundle?: unknown;
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
    firstItemImageUrl?: string | null;
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
    reviewNextApplicationId?: string | null;
    reviewContext?: string | null;
    nextReviewTarget?: CanonicalReviewTarget | null;
    reviewTargetBundle?: unknown;
    applicationSummaries?: ActivityApplicationSummary[];
  };
  rental?: {
    id?: string;
    createdAt?: string;
    status: string;
    userConfirmedAt?: string | null;
    brand?: string;
    model?: string;
    imageUrl?: string | null;
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
    reviewPendingCount?: number;
    reviewAllDone?: boolean;
    reviewNextTargetProductId?: string | null;
    reviewNextApplicationId?: string | null;
    reviewNextRacketId?: string | null;
    reviewContext?: string | null;
    nextReviewTarget?: CanonicalReviewTarget | null;
    reviewTargetBundle?: unknown;
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
    return `/mypage?tab=orders&flowType=rental&flowId=${app.rentalId}&${flowQuery}&focus=stringing`;
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

const formatAmount = (amount?: number | null) => {
  if (typeof amount !== "number") return "-";
  return `${amount.toLocaleString()}원`;
};

const FLOW_TYPE_META_LABEL: Record<FlowType, string> = {
  order_only: "주문",
  order_plus_stringing: "상품 구매 + 교체서비스",
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

const getRepresentativeTitle = (group: ActivityGroup): string => {
  if (group.kind === "order") {
    const firstItemName = group.order?.firstItemName?.trim();
    const itemsCount = group.order?.itemsCount ?? 0;
    const baseName = firstItemName && firstItemName !== "-" ? firstItemName : "주문 상품";

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

  return isStringingCompletedStatus(app.status) && !app.userConfirmedAt;
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

const isStandaloneApplication = (app?: ActivityApplicationSummary | null) =>
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

    if (isOrderDeliveredStatus(group.order?.status)) {
      return "구매 확정 필요";
    }

    const actionableApplication = group.order?.applicationSummaries?.find((app) =>
      isApplicationTrackingNeeded(app),
    );

    if (isApplicationTrackingNeeded(actionableApplication)) {
      return "라켓 발송 운송장 등록 필요";
    }

    const isConfirmed =
      Boolean(group.order?.userConfirmedAt) ||
      isOrderConfirmedStatus(group.order?.status);

    if (isConfirmed && (group.order?.reviewPendingCount ?? 0) > 0) {
      return "상품 후기 작성 가능";
    }

    if (group.application?.serviceReviewPending) {
      return "상품·교체서비스 후기 작성 가능";
    }

    return null;
  }

  if (group.kind === "rental") {
    if (isTerminalCanceledStatus(group.rental?.status)) return null;

    if (isRentalReturnShippingAvailable(group.rental)) {
      return group.rental?.hasReturnShipping ? "반납 운송장 수정 필요" : "반납 운송장 등록 필요";
    }

    if (
      isRentalReturnedStatus(group.rental?.status) &&
      !group.rental?.userConfirmedAt
    ) {
      return "수령 확인 필요";
    }

    if (group.application?.serviceReviewPending) {
      return "상품·교체서비스 후기 작성 가능";
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
    return "상품·교체서비스 후기 작성 가능";
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
      "구매 확정 필요": "상품을 받으셨다면 구매 확정을 진행해주세요.",
      "수령 확인 필요": "반납 내용을 확인하고 수령 확인을 진행해주세요.",
      "라켓 발송 운송장 등록 필요": "라켓 발송 운송장을 등록해주세요.",
      "교체서비스 확정 필요": "작업 내용을 확인하고 교체서비스 확정을 진행해주세요.",
      "후기를 남길 수 있어요": "후기를 남길 수 있어요.",
      "상품 후기 작성 가능": "후기를 남길 수 있어요.",
      "상품·교체서비스 후기 작성 가능": "후기를 남길 수 있어요.",
      "교체서비스 신청 필요": "교체서비스 신청을 이어갈 수 있어요.",
    };
    return todoMessageMap[opts.todoPrimaryReason] ?? null;
  }

  const viewKind: ActivityGroup["kind"] =
    opts?.prefersApplicationView && group.application ? "application" : group.kind;

  if (viewKind === "order") {
    const normalized = getMypageNormalizedStatus(group.order?.status);
    const linkedApplication = group.application ?? group.order?.applicationSummaries?.[0];
    if (normalized === "취소요청" || normalized === "취소 요청")
      return "취소 요청 확인을 기다려주세요.";
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
    if (isOrderDeliveredStatus(group.order?.status)) return "상품을 받으셨다면 구매 확정을 진행해주세요.";
    if (isOrderConfirmedStatus(group.order?.status)) {
      const hasPendingOrderReview =
        Boolean(group.order?.hasPendingReview) || (group.order?.reviewPendingCount ?? 0) > 0;

      const hasPendingServiceReview =
        Boolean(group.application?.serviceReviewPending) ||
        (group.order?.applicationSummaries ?? []).some((app) => app.serviceReviewPending);

      if (hasPendingServiceReview) {
        return "후기를 남길 수 있어요.";
      }

      if (hasPendingOrderReview) {
        return "후기를 남길 수 있어요.";
      }

      return null;
    }
    if (linkedApplication?.inboundRequired === false) {
      return linkedApplication.rentalId
        ? "매장에서 대여 라켓에 스트링을 장착해 준비합니다. 사용자가 별도로 라켓을 발송하지 않아도 됩니다."
        : "사용자가 별도로 라켓을 발송하지 않아도 됩니다. 매장에서 라켓에 스트링을 장착해 준비합니다.";
    }
    if (linkedApplication?.needsInboundTracking && !linkedApplication?.hasTracking) {
      return "라켓 발송 운송장을 등록해주세요.";
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
    if (isRentalReturnedStatus(group.rental?.status)) {
      const hasPendingServiceReview =
        Boolean(group.application?.serviceReviewPending) ||
        (group.rental?.applicationSummaries ?? []).some((app) => app.serviceReviewPending);

      if (!group.rental?.userConfirmedAt) {
        return "반납 내용을 확인하고 수령 확인을 진행해주세요.";
      }

      if (hasPendingServiceReview) {
        return "후기를 남길 수 있어요.";
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
  if (isStringingCompletedStatus(app?.status))
    return app?.serviceReviewPending
      ? "후기를 남길 수 있어요."
      : "작업 내용을 확인하고 교체서비스 확정을 진행해주세요.";
  if (app?.inboundRequired === false)
    return app?.rentalId
      ? "매장에서 대여 라켓에 스트링을 장착해 준비합니다. 사용자가 별도로 라켓을 발송하지 않아도 됩니다."
      : "사용자가 별도로 라켓을 발송하지 않아도 됩니다. 매장에서 라켓에 스트링을 장착해 준비합니다.";
  if (app?.needsInboundTracking && !app?.hasTracking) return "라켓 발송 운송장을 등록해주세요.";
  if (app?.needsInboundTracking && app?.hasTracking && isApplicationBeforeWork(app.status))
    return "등록한 운송장 기준으로 매장 도착 확인을 기다려주세요.";
  if (normalized === "접수완료") return "신청이 접수되었습니다. 검토를 기다려주세요.";
  if (normalized === "검토 중") return "신청 내용을 확인 중입니다. 안내를 기다려주세요.";
  if (normalized === "승인") return "신청이 확인되었습니다. 다음 안내를 기다려주세요.";
  return null;
};

const FALLBACK_FLOW_IMAGE = "/placeholder.svg?height=96&width=96&query=tennis+gear";

const getCompactStatusLabel = (label: string, kind: ActivityGroup["kind"]) => {
  if (label === "대기중" && (kind === "order" || kind === "rental")) {
    return "결제대기";
  }

  if (label === "구매확정") return "완료";
  if (label === "반납완료") return "완료";

  return label;
};

const getCompactDate = (iso: string) => {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

const getRepresentativeImage = (
  group: ActivityGroup,
  displayApplication?: ActivityApplicationSummary,
) => {
  if (group.kind === "order") {
    return group.order?.firstItemImageUrl || FALLBACK_FLOW_IMAGE;
  }

  if (group.kind === "rental") {
    return group.rental?.imageUrl || FALLBACK_FLOW_IMAGE;
  }

  return displayApplication ? null : FALLBACK_FLOW_IMAGE;
};

const canShowOrderShippingInfo = (status?: string | null) => {
  const normalized = getMypageNormalizedStatus(status);
  return normalized === "배송중" || isOrderDeliveredStatus(status) || isOrderConfirmedStatus(status);
};

function FlowListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <Card key={idx} className="rounded-control border-border bg-card shadow-none">
          <CardContent className="grid gap-3 p-4 bp-sm:grid-cols-[72px_minmax(0,1fr)_168px] bp-sm:p-5">
            <Skeleton className="h-16 w-16 rounded-control bp-sm:h-[72px] bp-sm:w-[72px]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full rounded-control" />
            </div>
            <div className="hidden space-y-2 bp-sm:block">
              <Skeleton className="ml-auto h-6 w-20" />
              <Skeleton className="h-9 w-full rounded-control" />
              <Skeleton className="h-9 w-full rounded-control" />
            </div>
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
    if (!window.confirm("구매 확정 처리하시겠습니까?\n확정 후에는 되돌릴 수 없습니다.")) return;

    try {
      setConfirmingOrderId(orderId);
      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        showErrorToast(data?.error || data?.message || "구매 확정 처리 중 오류가 발생했습니다.");
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
                if (app.userConfirmedAt || !isStringingCompletedStatus(app.status))
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

      showSuccessToast("구매 확정이 완료되었습니다.");
      await refreshRelatedQueries();
    } catch (e) {
      console.error(e);
      showErrorToast("구매 확정 처리 중 오류가 발생했습니다.");
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
    if (!window.confirm("수령 확인 처리하시겠습니까?\n확정 후에는 되돌릴 수 없습니다.")) return;

    try {
      setConfirmingRentalId(rentalId);
      const res = await fetch(`/api/me/rentals/${rentalId}/confirm`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        showErrorToast(data?.message || "수령 확인 처리 중 오류가 발생했습니다.");
        return;
      }

      const earnedPoints = Number(data?.earnedPoints ?? 0);
      showSuccessToast(
        data?.pointsGranted && earnedPoints > 0
          ? `수령 확인이 완료되었습니다. ${earnedPoints.toLocaleString()}P가 적립되었습니다.`
          : data?.already
            ? data?.message || "이미 수령 확인된 대여입니다."
            : "수령 확인이 완료되었습니다.",
      );
      await refreshRelatedQueries();
    } catch (e) {
      console.error(e);
      showErrorToast("수령 확인 처리 중 오류가 발생했습니다.");
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
        showErrorToast(body?.message || "취소 요청 처리 중 오류가 발생했습니다.");
        return;
      }

      showSuccessToast("취소 요청을 접수했습니다.");
      setCancelApplicationDialogId(null);
      await refreshRelatedQueries();
    } catch (e) {
      console.error(e);
      showErrorToast("취소 요청 처리 중 오류가 발생했습니다.");
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

      showSuccessToast("취소 요청을 철회했습니다.");
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
        <div className="rounded-control border border-warning/25 bg-warning/10 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-warning" />
            <p className="break-keep text-ui-label font-medium text-foreground">
              지금 처리할 수 있는 항목만 모았습니다.
            </p>
          </div>
        </div>
      ) : null}
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
            const todoPrimaryReason =
              scope === "todo" || scope === "all" ? getTodoPrimaryReason(g) : null;
            const nextActionText = getFlowNextActionText(g, {
              prefersApplicationView,
              todoPrimaryReason,
            });

            const displayKind: FlowDetailType = prefersApplicationView ? "application" : g.kind;
            const isApplicationActionContext =
              Boolean(applicationActionTarget) &&
              (isDirectApplicationCard || scope === "todo" || scope === "all");
            const displayTitle: string =
              (prefersApplicationView
                ? getApplicationTitle(displayApplication)
                : getRepresentativeTitle(g)) || "거래/이용 내역";
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
            const isCancelRequested =
              (displayKind === "order" && g.order?.cancelStatus === "requested") ||
              (displayKind === "rental" && g.rental?.cancelStatus === "requested") ||
              (displayKind === "application" &&
                (displayApplication ?? g.application)?.cancelStatus === "requested");
            const amountText =
              displayKind === "order" && typeof g.order?.totalPrice === "number"
                ? formatAmount(g.order.totalPrice)
                : displayKind === "rental" && typeof g.rental?.totalAmount === "number"
                  ? formatAmount(g.rental.totalAmount)
                  : null;

            const displayDateText = getCompactDate(displayDateValue);
            const linkedStringSummary = !prefersApplicationView
              ? getStringSelectionSummary(g.application)
              : null;
            const secondaryMetaText =
              displayKind === "order"
                ? [
                    linkedStringSummary,
                    g.order && g.order.itemsCount > 1 ? `${g.order.itemsCount}개 상품` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : displayKind === "rental"
                  ? [
                      typeof g.rental?.days === "number" ? `${g.rental.days}일 대여` : null,
                      linkedStringSummary,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : [
                      getApplicationCollectionLabel(displayApplication),
                      getStringSelectionSummary(displayApplication),
                    ]
                      .filter(Boolean)
                      .join(" · ");

            const representativeStatusLabel = isCancelRequested
              ? "취소요청"
              : getCompactStatusLabel(displayUserStatusLabel, g.kind);

            const representativeStatusBadgeSpec = isCancelRequested
              ? getWorkflowMetaBadgeSpec("cancel_requested")
              : displayStatusBadgeSpec;

            const representativeImage = getRepresentativeImage(g, displayApplication);
            const shouldShowServiceIcon =
              g.kind === "application" && isStandaloneApplication(g.application);

            return (
              <article
                key={g.key}
                aria-labelledby={`transaction-flow-${g.key}`}
                className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-control border border-border bg-card p-3.5 shadow-none transition-colors hover:bg-muted/20 bp-sm:p-4 md:grid-cols-[72px_minmax(0,1fr)_180px] md:items-start md:gap-4"
              >
                <Link
                  href={detailHref}
                  className={cn(
                    "relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border/60 md:h-[72px] md:w-[72px]",
                    shouldShowServiceIcon ? "bg-surface-inverse text-brand-highlight" : "bg-muted",
                  )}
                  aria-label={`${displayTitle} 상세 보기`}
                >
                  {shouldShowServiceIcon ? (
                    <Wrench className="h-7 w-7 text-brand-highlight" aria-hidden="true" />
                  ) : (
                    <Image
                      src={representativeImage ?? FALLBACK_FLOW_IMAGE}
                      alt={displayTitle}
                      width={72}
                      height={72}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </Link>

                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2 md:hidden">
                    <p className="min-w-0 break-keep text-ui-label font-medium text-muted-foreground">
                      {displayMetaLabel}
                    </p>
                    <Badge
                      variant={representativeStatusBadgeSpec.variant}
                      className="shrink-0 whitespace-nowrap"
                    >
                      {representativeStatusLabel}
                    </Badge>
                  </div>

                  <p className="hidden break-keep text-ui-label font-medium text-muted-foreground md:block">
                    {displayMetaLabel}
                  </p>

                  <Link href={detailHref} className="block min-w-0">
                    <span id={`transaction-flow-${g.key}`} className="line-clamp-2 break-keep text-ui-card-title font-semibold text-foreground transition-colors hover:text-primary bp-sm:text-ui-card-title-lg">
                      {displayTitle}
                    </span>
                  </Link>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ui-label bp-sm:text-ui-body-sm">
                    <span className="tabular-nums text-muted-foreground">
                      {displayDateText}
                    </span>
                    {amountText ? (
                      <>
                        <span aria-hidden="true" className="text-muted-foreground">
                          ·
                        </span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {amountText}
                        </span>
                      </>
                    ) : null}
                  </div>

                  {secondaryMetaText ? (
                    <p className="break-keep text-ui-label leading-relaxed text-muted-foreground">
                      {secondaryMetaText}
                    </p>
                  ) : null}

                  {nextActionText ? (
                    <div
                      className={cn(
                        "mt-2 rounded-control border px-3 py-2 text-ui-label leading-relaxed",
                        todoPrimaryReason
                          ? "border-warning/25 bg-warning/10 text-foreground"
                          : "border-border bg-muted/30 text-foreground",
                      )}
                    >
                      <span className={cn("mr-2 font-semibold", todoPrimaryReason ? "text-warning" : "text-muted-foreground")}>
                        {todoPrimaryReason ? "다음 조치" : "진행 안내"}
                      </span>
                      {nextActionText}
                    </div>
                  ) : null}
                </div>

                {/* 오른쪽(상태 배지 + 액션 버튼) + 펼침 패널 */}
                {(() => {
                  type CardAction = {
                    key: string;
                    node: React.ReactNode;
                  };

                  const primaryActionCandidates: CardAction[] = [];
                  const secondaryActions: CardAction[] = [];
                  const addPrimaryActionCandidate = (candidate: CardAction) => {
                    primaryActionCandidates.push(candidate);
                  };
                  const addSecondaryAction = (action: CardAction) => {
                    secondaryActions.push(action);
                  };

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

                  const resolvedDetailHref =
                    hasOrderLinkedApplication && orderId
                      ? `/mypage?tab=orders&flowType=order&flowId=${orderId}&${flowQuery}&focus=stringing`
                      : hasRentalLinkedApplication && rentalId
                        ? `/mypage?tab=orders&flowType=rental&flowId=${rentalId}&${flowQuery}&focus=stringing`
                        : detailHref;

                  const detailAction: CardAction = {
                    key: "flow-detail",
                    node: (
                      <Button asChild size="sm" variant="outline" className="min-h-11 bg-transparent md:min-h-9">
                        <Link href={resolvedDetailHref} aria-label={`${displayTitle} 상세 보기`}>
                          상세 보기 <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ),
                  };

                  const buildCanonicalReviewAction = (params: {
                    key: string;
                    orderId?: string;
                    rentalId?: string;
                    applicationId?: string;
                    reviewPendingCount?: number | null;
                    reviewContext?: string | null;
                    nextReviewTarget?: CanonicalReviewTarget | null;
                    fallbackProductId?: string | null;
                    fallbackApplicationId?: string | null;
                  }): CardAction | null => {
                    if ((params.reviewPendingCount ?? 0) <= 0) return null;
                    const target = params.nextReviewTarget;
                    const reviewContext = (target?.reviewContext ?? params.reviewContext) as ReviewContext | null;
                    const productId = target?.primaryProductId ?? params.fallbackProductId ?? null;
                    const applicationId =
                      target?.primaryApplicationId ?? params.fallbackApplicationId ?? params.applicationId ?? null;
                    const hasTarget = Boolean(target || productId || applicationId || params.rentalId);
                    if (!reviewContext || !hasTarget) return null;
                    const href = buildReviewWriteHref({
                      reviewContext,
                      orderId: params.orderId,
                      rentalId: params.rentalId,
                      applicationId,
                      productId,
                    });
                    return {
                      key: params.key,
                      node: (
                        <Button size="sm" asChild>
                          <Link href={href}>
                            <MessageSquarePlus className="mr-1 h-3.5 w-3.5" />
                            후기 작성
                          </Link>
                        </Button>
                      ),
                    };
                  };

                  if (prefersApplicationView) {
                    if (orderId) {
                      addSecondaryAction({
                        key: "application-linked-order",
                        node: (
                          <Button asChild size="sm" variant="outline" className="bg-transparent">
                            <Link href={`/mypage?tab=orders&flowType=order&flowId=${orderId}&${flowQuery}&focus=stringing`}>
                              주문 상세 보기
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ),
                      });
                    }
                    if (rentalId) {
                      addSecondaryAction({
                        key: "application-linked-rental",
                        node: (
                          <Button asChild size="sm" variant="outline" className="bg-transparent">
                            <Link href={`/mypage?tab=orders&flowType=rental&flowId=${rentalId}&${flowQuery}&focus=stringing`}>
                              대여 상세 보기
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ),
                      });
                    }
                  }

                  if (g.kind === "order" && orderId && !prefersApplicationView) {
                    const actionableOrderApplication = linkedApps.find((app) => isApplicationTrackingNeeded(app));
                    if (actionableOrderApplication?.id) {
                      addPrimaryActionCandidate({
                        key: "application-shipping",
                        node: (
                          <Button asChild size="sm">
                            <Link href={`/services/applications/${actionableOrderApplication.id}/shipping?return=${encodeURIComponent(resolvedDetailHref)}`}>
                              라켓 발송 운송장 등록
                            </Link>
                          </Button>
                        ),
                      });
                    } else if (isOrderDeliveredStatus(g.order?.status)) {
                      addPrimaryActionCandidate({
                        key: "order-confirm",
                        node: (
                          <Button size="sm" disabled={confirmingOrderId === orderId} onClick={() => handleConfirmPurchase(orderId)}>
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            {confirmingOrderId === orderId ? "처리 중..." : "구매 확정"}
                          </Button>
                        ),
                      });
                    } else if (Boolean(g.order?.userConfirmedAt) || isOrderConfirmedStatus(g.order?.status)) {
                      const reviewAction = buildCanonicalReviewAction({
                        key: "order-review",
                        orderId,
                        reviewPendingCount: g.order?.reviewPendingCount,
                        reviewContext: g.order?.reviewContext,
                        nextReviewTarget: g.order?.nextReviewTarget,
                        fallbackProductId: g.order?.reviewNextTargetProductId,
                        fallbackApplicationId: g.order?.reviewNextApplicationId,
                      });
                      if (reviewAction) addPrimaryActionCandidate(reviewAction);
                    }

                    if (canShowOrderShippingInfo(status)) {
                      const isVisitPickup = isVisitPickupOrder({ shippingMethod: g.order?.shippingMethod });
                      const shippingInfoLabel = isVisitPickup ? "수령정보 확인" : linkedCount > 0 ? "완성 라켓 배송정보 확인" : "배송정보 확인";
                      addSecondaryAction({
                        key: "order-shipping-info",
                        node: <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setShippingInfoDialogTarget({ orderId, triggerLabel: shippingInfoLabel, shippingMethod: g.order?.shippingMethod })}>{shippingInfoLabel}</Button>,
                      });
                    }
                    if (g.order?.cancelStatus === "requested") {
                      addSecondaryAction({ key: "order-cancel-withdraw", node: <Button size="sm" variant="outline" className="border-transparent bg-transparent text-foreground shadow-none hover:bg-muted hover:text-foreground" disabled={withdrawingOrderCancelId === orderId} onClick={() => handleOrderCancelWithdraw(orderId)}><Undo2 className="mr-1 h-3.5 w-3.5" />{withdrawingOrderCancelId === orderId ? "철회 중..." : "취소 요청 철회"}</Button> });
                    } else if (["대기중", "결제완료"].includes(normalizedStatus)) {
                      addSecondaryAction({ key: "order-cancel-request", node: <Button size="sm" variant="outline" className="border-transparent bg-transparent text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive" onClick={() => setCancelOrderDialogId(orderId)}><XCircle className="mr-1 h-3.5 w-3.5" />취소 요청</Button> });
                    }
                  }

                  if (g.kind === "rental" && rentalId && !prefersApplicationView) {
                    if (isRentalReturnShippingAvailable(g.rental) && !g.rental?.hasReturnShipping) {
                      addPrimaryActionCandidate({ key: "rental-return-shipping", node: <Button asChild size="sm"><Link href={`/mypage/rentals/${rentalId}/return-shipping`}>반납 운송장 등록</Link></Button> });
                    } else if (isRentalReturnedStatus(g.rental?.status) && !g.rental?.userConfirmedAt) {
                      addPrimaryActionCandidate({ key: "rental-confirm", node: <Button size="sm" disabled={confirmingRentalId === rentalId} onClick={() => handleConfirmRental(rentalId)}><CheckCircle className="mr-1 h-3.5 w-3.5" />{confirmingRentalId === rentalId ? "처리 중..." : "수령 확인"}</Button> });
                    } else if (g.rental?.userConfirmedAt) {
                      const reviewAction = buildCanonicalReviewAction({
                        key: "rental-review",
                        rentalId,
                        reviewPendingCount: g.rental?.reviewPendingCount,
                        reviewContext: g.rental?.reviewContext,
                        nextReviewTarget: g.rental?.nextReviewTarget,
                        fallbackProductId: g.rental?.reviewNextTargetProductId,
                        fallbackApplicationId: g.rental?.reviewNextApplicationId,
                      });
                      if (reviewAction) addPrimaryActionCandidate(reviewAction);
                    } else if (!g.rental?.stringingApplicationId && g.rental?.withStringService) {
                      addPrimaryActionCandidate({ key: "rental-apply-stringing", node: <Button asChild size="sm"><Link href={`/services/apply?rentalId=${rentalId}`}>교체서비스 신청<ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button> });
                    }

                    if (isRentalReturnShippingAvailable(g.rental) && g.rental?.hasReturnShipping) {
                      addSecondaryAction({ key: "rental-return-shipping-edit", node: <Button asChild size="sm" variant="outline" className="bg-transparent"><Link href={`/mypage/rentals/${rentalId}/return-shipping`}>반납 운송장 수정</Link></Button> });
                    }
                    if (["pending", "paid", "대기중", "결제완료"].includes(normalizedStatus) && !g.rental?.hasOutboundShipping) {
                      addSecondaryAction({ key: "rental-cancel-request", node: <Button size="sm" variant="outline" className="border-transparent bg-transparent text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive" onClick={() => setCancelRentalDialogId(rentalId)}><XCircle className="mr-1 h-3.5 w-3.5" />취소 요청</Button> });
                    }
                  }

                  if (isApplicationActionContext && applicationActionTarget?.id) {
                    const applicationShippingReturnHref = applicationActionTarget.orderId
                      ? `/mypage?tab=orders&flowType=order&flowId=${applicationActionTarget.orderId}&${flowQuery}&focus=stringing`
                      : applicationActionTarget.rentalId
                        ? `/mypage?tab=orders&flowType=rental&flowId=${applicationActionTarget.rentalId}&${flowQuery}&focus=stringing`
                        : `/mypage?tab=orders&flowType=application&flowId=${applicationActionTarget.id}&${flowQuery}`;

                    if (!isRentalLinkedApplicationAction && isApplicationTrackingNeeded(applicationActionTarget)) {
                      const action = { key: "application-shipping", node: <Button asChild size="sm" variant={applicationActionTarget.hasTracking ? "outline" : "default"} className={applicationActionTarget.hasTracking ? "bg-transparent" : undefined}><Link href={`/services/applications/${applicationActionTarget.id}/shipping?return=${encodeURIComponent(applicationShippingReturnHref)}`}>{applicationActionTarget.hasTracking ? "라켓 발송 운송장 수정" : "라켓 발송 운송장 등록"}</Link></Button> };
                      if (applicationActionTarget.hasTracking) addSecondaryAction(action);
                      else addPrimaryActionCandidate(action);
                    }
                    if (isDirectApplicationCard && ["접수완료", "검토 중"].includes(getMypageNormalizedStatus(applicationActionTarget.status))) {
                      addSecondaryAction({ key: "application-cancel-request", node: <Button size="sm" variant="outline" className="border-transparent bg-transparent text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive" onClick={() => setCancelApplicationDialogId(applicationActionTarget.id)}><XCircle className="mr-1 h-3.5 w-3.5" />취소 요청</Button> });
                    }
                    if (isStringingCompletedStatus(applicationActionTarget.status) && !applicationActionTarget.userConfirmedAt && !isLinkedApplicationConfirmSuppressed) {
                      addPrimaryActionCandidate({ key: "application-confirm", node: <Button size="sm" disabled={confirmingApplicationId === applicationActionTarget.id} onClick={() => handleConfirmApplication(applicationActionTarget.id)}><CheckCircle className="mr-1 h-3.5 w-3.5" />{confirmingApplicationId === applicationActionTarget.id ? "처리 중..." : "교체서비스 확정"}</Button> });
                    } else if (!applicationActionTarget.orderId && !applicationActionTarget.rentalId && applicationActionTarget.userConfirmedAt) {
                      const reviewAction = buildCanonicalReviewAction({
                        key: "application-review",
                        applicationId: applicationActionTarget.id,
                        reviewPendingCount: applicationActionTarget.reviewPendingCount,
                        reviewContext: applicationActionTarget.reviewContext ?? "standalone_stringing",
                        nextReviewTarget: applicationActionTarget.nextReviewTarget,
                        fallbackProductId: applicationActionTarget.reviewNextTargetProductId,
                        fallbackApplicationId: applicationActionTarget.reviewNextApplicationId ?? applicationActionTarget.id,
                      });
                      if (reviewAction) addPrimaryActionCandidate(reviewAction);
                    }
                  }

                  if (needsTrackingAction && actionableApplicationId && !isDirectApplicationCard && (!primaryLinkedApplicationId || primaryLinkedApplicationId !== actionableApplicationId)) {
                    addSecondaryAction({ key: "application-open-sheet", node: <Button asChild size="sm" variant="outline" className="bg-transparent"><Link href={applicationActionTarget ? getStringingDetailHref(applicationActionTarget, flowQuery) : `/mypage?tab=orders&flowType=application&flowId=${actionableApplicationId}&${flowQuery}`}>교체서비스 상태<ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button> });
                  }

                  const primaryAction = primaryActionCandidates[0] ?? null;
                  const hasSecondaryActions = secondaryActions.length > 0;

                  return (
                    <div className="col-span-2 flex w-full shrink-0 flex-col items-start gap-2 md:col-span-1 md:w-[180px] md:items-stretch md:self-start">
                      <div className="hidden flex-wrap items-center gap-1.5 md:flex md:justify-end">
                        <Badge variant={representativeStatusBadgeSpec.variant} className="shrink-0 whitespace-nowrap">
                          {representativeStatusLabel}
                        </Badge>
                      </div>

                      <div className="flex w-full flex-col gap-2">
                        {primaryAction ? (
                          <div className="hidden w-full gap-2 md:grid [&_a]:h-10 [&_a]:w-full [&_a]:min-w-0 [&_a]:justify-center [&_a]:px-2.5 [&_a]:text-center [&_a]:text-ui-label [&_a]:font-medium [&_a]:leading-snug [&_a]:whitespace-normal [&_a]:break-keep md:[&_a]:h-9 md:[&_a]:px-3 [&_button]:h-10 [&_button]:w-full [&_button]:min-w-0 [&_button]:justify-center [&_button]:px-2.5 [&_button]:text-center [&_button]:text-ui-label [&_button]:font-medium [&_button]:leading-snug [&_button]:whitespace-normal [&_button]:break-keep md:[&_button]:h-9 md:[&_button]:px-3">
                            {primaryAction.node}
                          </div>
                        ) : null}

                        <div className={cn(
                          "grid w-full gap-2 [&_a]:min-h-11 [&_a]:w-full [&_a]:min-w-0 [&_a]:justify-center [&_a]:px-2.5 [&_a]:text-center [&_a]:text-ui-label [&_a]:font-medium [&_a]:leading-snug [&_a]:whitespace-normal [&_a]:break-keep md:[&_a]:min-h-9 md:[&_a]:px-3 [&_button]:min-h-11 [&_button]:w-full [&_button]:min-w-0 [&_button]:justify-center [&_button]:px-2.5 [&_button]:text-center [&_button]:text-ui-label [&_button]:font-medium [&_button]:leading-snug [&_button]:whitespace-normal [&_button]:break-keep md:[&_button]:min-h-9 md:[&_button]:px-3",
                          primaryAction && hasSecondaryActions
                            ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px] md:grid-cols-[minmax(0,1fr)_40px]"
                            : primaryAction
                              ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-1"
                              : hasSecondaryActions
                                ? "grid-cols-[minmax(0,1fr)_40px]"
                                : "grid-cols-1",
                        )}>
                          {primaryAction ? (
                            <div className="md:hidden">{primaryAction.node}</div>
                          ) : null}
                          {detailAction.node}

                          {hasSecondaryActions ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-control border-border bg-background px-0 text-muted-foreground hover:bg-muted hover:text-foreground md:h-9 md:w-10" aria-label={`${secondaryActions.length}개 추가 작업 보기`} title="더보기">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 p-1">
                                <div className="grid gap-1 [&_a]:h-8 [&_a]:w-full [&_a]:justify-start [&_a]:px-3 [&_a]:text-ui-label [&_a]:font-medium [&_button]:h-8 [&_button]:w-full [&_button]:justify-start [&_button]:px-3 [&_button]:text-ui-label [&_button]:font-medium">
                                  {secondaryActions.map((action) => (
                                    <DropdownMenuItem key={action.key} asChild className="p-0 focus:bg-transparent">
                                      {action.node}
                                    </DropdownMenuItem>
                                  ))}
                                </div>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </article>
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
