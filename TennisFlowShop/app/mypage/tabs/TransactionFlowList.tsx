"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CancelStringingDialog from "@/app/mypage/applications/_components/CancelStringingDialog";
import CancelOrderDialog from "@/app/mypage/orders/_components/CancelOrderDialog";
import CancelRentalDialog from "@/app/mypage/rentals/_components/CancelRentalDialog";
import ActivityOrderReviewCTA from "@/app/mypage/tabs/_components/ActivityOrderReviewCTA";
import OrderShippingInfoDialog from "@/app/mypage/tabs/_components/OrderShippingInfoDialog";
import ServiceReviewCTA from "@/components/reviews/ServiceReviewCTA";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import {
  getApplicationStatusBadgeSpec,
  getOrderStatusBadgeSpec,
  getRentalStatusBadgeSpec,
} from "@/lib/badge-style";
import { getMypageNormalizedStatus, getMypagePaymentStatusLabel, getMypageUserStatusLabel } from "@/app/mypage/_lib/status-label";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { ArrowRight, Calendar, CheckCircle, ChevronDown, CreditCard, Link2, Package, Truck, Undo2, Wallet, Wrench, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { collectionMethodLabel, orderShippingMethodLabel } from "@/app/features/stringing-applications/lib/fulfillment-labels";
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
    shippingMethod?: string;
    totalPrice: number;
    firstItemName?: string;
    itemsCount: number;
    linkedApplicationCount: number;
    stringingApplicationId?: string | null;
    cancelStatus?: string | null;
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

type FlowScope = "all" | "todo" | "order" | "application" | "rental";

const FLOW_SCOPE_OPTIONS: Array<{ value: FlowScope; label: string }> = [
  { value: "all", label: "전체" },
  { value: "todo", label: "해야 할 일" },
  { value: "order", label: "주문" },
  { value: "application", label: "서비스 신청" },
  { value: "rental", label: "대여" },
];

const parseScope = (value: string | null): FlowScope => {
  if (value === "todo" || value === "order" || value === "application" || value === "rental") return value;
  return "all";
};

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
  if (normalized === "반납완료")
    return getApplicationStatusBadgeSpec("교체완료");
  return getApplicationStatusBadgeSpec(label);
};

const isApplicationTrackingNeeded = (app?: ActivityApplicationSummary) =>
  Boolean(app?.needsInboundTracking && !app?.hasTracking);

const isApplicationConfirmNeeded = (app?: ActivityApplicationSummary) =>
  getMypageNormalizedStatus(app?.status) === "교체완료" && !app?.userConfirmedAt;

const isApplicationTodoActionable = (app?: ActivityApplicationSummary) =>
  isApplicationTrackingNeeded(app) || isApplicationConfirmNeeded(app);

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
  if (app.orderId) return "주문";
  if (app.rentalId) return "대여";
  return "단독 신청";
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

const getApplicationTrackingLabel = (app?: ActivityApplicationSummary) => {
  if (!app) return "-";
  if (!app.inboundRequired) return "운송장 입력 대상 아님";
  if (!app.needsInboundTracking) return "운송장 입력 선택 사항";
  return app.hasTracking ? "운송장 등록됨" : "운송장 등록 필요";
};

const getRentalReturnStatusLabel = (status?: string | null) => {
  const normalized = getMypageNormalizedStatus(status);
  if (normalized === "반납완료") return "반납완료";
  if (normalized === "취소") return "반납 없음";
  return "반납 대기";
};

const getRentalShippingStatusMeta = (rental?: ActivityGroup["rental"]) => {
  const shippingMethod = String(rental?.shippingMethod ?? "").trim().toLowerCase();
  const isVisitPickup = shippingMethod === "pickup" || shippingMethod === "visit";
  if (isVisitPickup) {
    return {
      label: "수령 상태",
      value: rental?.hasOutboundShipping ? "수령 준비 완료" : "수령 준비중",
    };
  }
  return {
    label: "출고 상태",
    value: rental?.hasOutboundShipping ? "출고됨" : "출고 준비중",
  };
};

const getTodoPrimaryReason = (group: ActivityGroup): string | null => {
  if (group.kind === "order") {
    if (getMypageNormalizedStatus(group.order?.status) === "배송완료") return "구매확정 필요";
    const actionableApplication = group.order?.applicationSummaries?.find((app) =>
      isApplicationTodoActionable(app),
    );
    if (isApplicationTrackingNeeded(actionableApplication)) return "운송장 등록 필요";
    if (isApplicationConfirmNeeded(actionableApplication)) return "교체확정 필요";
    return null;
  }

  if (group.kind === "rental") {
    const actionableApplication = group.rental?.applicationSummaries?.find((app) => isApplicationTodoActionable(app));
    if (isApplicationTrackingNeeded(actionableApplication)) return "운송장 등록 필요";
    if (isApplicationConfirmNeeded(actionableApplication)) return "교체확정 필요";
    if (!group.rental?.stringingApplicationId && group.rental?.withStringService) return "교체서비스 신청 필요";
    return null;
  }

  if (isApplicationTrackingNeeded(group.application)) return "운송장 등록 필요";
  if (isApplicationConfirmNeeded(group.application)) return "교체확정 필요";
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
  const router = useRouter();
  const scope = parseScope(searchParams.get("scope"));
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [confirmingApplicationId, setConfirmingApplicationId] = useState<string | null>(null);
  const [expandedSecondaryKey, setExpandedSecondaryKey] = useState<string | null>(null);
  const [cancelOrderDialogId, setCancelOrderDialogId] = useState<string | null>(null);
  const [cancelApplicationDialogId, setCancelApplicationDialogId] = useState<string | null>(null);
  const [isCancelApplicationSubmitting, setIsCancelApplicationSubmitting] = useState(false);

  const getKey = (
    pageIndex: number,
    previousPageData: ActivityResponse | null,
  ) => {
    if (
      previousPageData &&
      previousPageData.items &&
      previousPageData.items.length < LIMIT
    )
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

  const { data, size, setSize, isValidating, error } =
    useSWRInfinite<ActivityResponse>(getKey, fetcher, {
      revalidateFirstPage: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    });

  const refreshRelatedQueries = async () => {
    await Promise.all([
      globalMutate((key) => typeof key === "string" && key.startsWith("/api/mypage/activity"), undefined, { revalidate: true }),
      globalMutate((key) => typeof key === "string" && key.startsWith("/api/users/me/orders"), undefined, { revalidate: true }),
      globalMutate((key) => typeof key === "string" && key.startsWith("/api/me/rentals"), undefined, { revalidate: true }),
      globalMutate((key) => typeof key === "string" && key.startsWith("/api/applications/me"), undefined, { revalidate: true }),
      globalMutate((key) => typeof key === "string" && key.startsWith("/api/points/me"), undefined, { revalidate: true }),
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
    if (!window.confirm("교체 확정 처리할까요?\n확정 시 포인트가 지급되며 되돌릴 수 없습니다.")) return;

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
      showSuccessToast(data?.already ? data?.message || "이미 교체확정된 신청입니다." : "교체 확정이 완료되었습니다.");
      await refreshRelatedQueries();
    } catch (e) {
      console.error(e);
      showErrorToast("교체 확정 중 오류가 발생했습니다.");
    } finally {
      setConfirmingApplicationId(null);
    }
  };

  const handleApplicationCancelRequest = async (params: { reasonCode: string; reasonText?: string; refundAccount: { bank: string; account: string; holder: string } }) => {
    if (!cancelApplicationDialogId) return;
    try {
      setIsCancelApplicationSubmitting(true);
      const res = await fetch(`/api/applications/stringing/${cancelApplicationDialogId}/cancel-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

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

  const handleScopeChange = (nextScope: FlowScope) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "orders");
    if (nextScope === "all") {
      params.delete("scope");
    } else {
      params.set("scope", nextScope);
    }
    router.replace(`/mypage?${params.toString()}`, { scroll: false });
  };

  const flowQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("from", "orders");
    if (scope !== "all") {
      params.set("scope", scope);
    }
    return params.toString();
  }, [scope]);

  const items = useMemo(
    () => (data ? data.flatMap((d) => d.items) : []),
    [data],
  );
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
      <Card className="border-0 bg-card">
        <CardContent className="p-8 text-center text-sm text-destructive">
          거래 흐름을 불러오는 중 오류가 발생했습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {FLOW_SCOPE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={scope === option.value ? "default" : "outline"}
            className={`justify-center ${scope === option.value ? "" : "bg-transparent"}`}
            onClick={() => handleScopeChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {scope === "todo" ? (
        <p className="text-xs text-muted-foreground">
          해야 할 일은 구매확정·운송장 등록·교체확정처럼 지금 바로 처리할 항목만 모아 보여줍니다.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        주문 구매확정과 교체서비스 확정은 별도로 처리됩니다.
      </p>
      {items.length === 0 ? (
        <Card className="border-0 bg-card">
          <CardContent className="p-8 text-center">
            <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {scope === "application"
                ? "표시할 서비스 신청이 없습니다."
                : scope === "todo"
                  ? "지금 처리할 항목이 없습니다."
                  : scope === "rental"
                    ? "표시할 대여 내역이 없습니다."
                    : scope === "order"
                      ? "표시할 주문 내역이 없습니다."
                      : "표시할 거래/이용 내역이 없습니다."}
            </p>
          </CardContent>
        </Card>
      ) : items.map((g) => {
        const orderId = g.order?.id ?? (g.kind === "order" ? g.detailTarget.id : undefined);
        const rentalId = g.rental?.id ?? (g.kind === "rental" ? g.detailTarget.id : undefined);
        const applicationId = g.application?.id ?? (g.kind === "application" ? g.detailTarget.id : undefined);
        const linkedApps = g.kind === "order" ? (g.order?.applicationSummaries ?? []) : g.kind === "rental" ? (g.rental?.applicationSummaries ?? []) : [];
        const linkedActionableApplication = linkedApps.find((app) => isApplicationTodoActionable(app));
        const prefersApplicationView = scope === "application" && Boolean(g.application);
        const displayApplication = g.application;
        const isDirectApplicationCard = g.kind === "application" || prefersApplicationView;
        const applicationActionTarget = displayApplication ?? linkedActionableApplication;
        const actionableApplicationId = applicationActionTarget?.id;
        const primaryLinkedApplicationId = g.kind === "order"
          ? (g.order?.stringingApplicationId ?? linkedActionableApplication?.id ?? g.order?.applicationSummaries?.[0]?.id)
          : g.kind === "rental"
            ? (g.rental?.stringingApplicationId ?? linkedActionableApplication?.id ?? g.rental?.applicationSummaries?.[0]?.id)
            : undefined;
        const status =
          g.kind === "order"
            ? g.order?.status
            : g.kind === "rental"
              ? g.rental?.status
              : g.application?.status;
        const normalizedStatus = getMypageNormalizedStatus(status);
        const userStatusLabel = getMypageUserStatusLabel(status);
        const statusBadgeSpec = getStatusBadgeSpec(g, userStatusLabel);
        const linkedCount =
          g.kind === "order"
            ? (g.order?.linkedApplicationCount ?? 0)
            : g.kind === "rental"
              ? (g.rental?.linkedApplicationCount ?? 0)
              : 0;
        const needsTrackingAction = Boolean(applicationActionTarget?.needsInboundTracking && !applicationActionTarget?.hasTracking);
        const normalizedMetaLabel = normalizeLabel(FLOW_TYPE_META_LABEL[g.flowType]);
        const normalizedFlowLabel = normalizeLabel(g.flowLabel);
        const todoPrimaryReason = scope === "todo" ? getTodoPrimaryReason(g) : null;
        const shouldShowFlowBadge =
          !prefersApplicationView &&
          Boolean(normalizedFlowLabel) &&
          normalizedFlowLabel !== normalizedMetaLabel;
        const displayKind: FlowDetailType = prefersApplicationView ? "application" : g.kind;
        const isApplicationActionContext = Boolean(applicationActionTarget) && (isDirectApplicationCard || scope === "todo");
        const displayTitle = prefersApplicationView
          ? getApplicationTitle(displayApplication)
          : getRepresentativeTitle(g);
        const displayStatus = prefersApplicationView ? displayApplication?.status : status;
        const displayUserStatusLabel = getMypageUserStatusLabel(displayStatus);
        const displayStatusBadgeSpec = prefersApplicationView
          ? getStatusBadgeSpec({ ...g, kind: "application" }, displayUserStatusLabel)
          : statusBadgeSpec;
        const displayDateLabel = displayKind === "order" ? "주문일" : displayKind === "rental" ? "대여일" : "신청일";
        const displayDateValue = displayKind === "order"
          ? (g.order?.createdAt ?? g.sortAt)
          : displayKind === "rental"
            ? (g.rental?.createdAt ?? g.sortAt)
            : (displayApplication?.createdAt ?? g.createdAt ?? g.sortAt);
        const detailTargetType: FlowDetailType = prefersApplicationView
          ? "application"
          : g.detailTarget.type;
        const detailTargetId = prefersApplicationView && displayApplication?.id
          ? displayApplication.id
          : g.detailTarget.id;
        const displayMetaLabel = prefersApplicationView ? "교체서비스 신청" : FLOW_TYPE_META_LABEL[g.flowType];
        const showLinkedStatusBadge = g.flowType !== "application_only" && linkedCount > 0 && !prefersApplicationView;
        const standaloneApplicationIdMeta =
          isStandaloneApplication(displayApplication) && displayApplication?.id
            ? ` · #${shortId(displayApplication.id) ?? "-"}`
            : "";

        return (
          <Card
            key={g.key}
            className="group relative overflow-hidden border-0 bg-card shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div
              className="absolute inset-0 bg-muted/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ padding: "1px" }}
            >
              <div className="h-full w-full rounded-lg bg-card" />
            </div>
            <CardContent className="relative space-y-4 p-4 bp-sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-foreground">
                    {displayTitle}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {displayMetaLabel} · {displayDateLabel} {formatDate(displayDateValue)}{standaloneApplicationIdMeta}
                  </p>
                </div>
                <Badge variant={displayStatusBadgeSpec.variant}>
                  {displayUserStatusLabel}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {todoPrimaryReason ? (
                  <Badge variant="default">해야 할 일: {todoPrimaryReason}</Badge>
                ) : null}
                {shouldShowFlowBadge ? (
                  <Badge variant="outline">{g.flowLabel}</Badge>
                ) : null}
                {showLinkedStatusBadge ? (
                  <Badge variant="secondary">
                    {getLinkedApplicationStatusSummary(linkedApps)}
                  </Badge>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/50 bg-muted/30 p-3 bp-sm:grid-cols-2 bp-lg:grid-cols-4">
                {displayKind === "order" ? (
                  <>
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">결제 금액</p>
                        <p className="font-medium text-foreground">{formatAmount(g.order?.totalPrice)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">주문 상태</p>
                        <p className="font-medium text-foreground">{getMypageUserStatusLabel(g.order?.status)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">결제 상태</p>
                        <p className="font-medium text-foreground">{getMypagePaymentStatusLabel(g.order?.paymentStatus)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">수령 방식</p>
                        <p className="font-medium text-foreground">{orderShippingMethodLabel(g.order?.shippingMethod)}</p>
                      </div>
                    </div>
                  </>
                ) : null}

                {displayKind === "rental" ? (
                  <>
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">대여 금액</p>
                        <p className="font-medium text-foreground">{formatAmount(g.rental?.totalAmount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">대여 기간</p>
                        <p className="font-medium text-foreground">{typeof g.rental?.days === "number" ? `${g.rental.days}일` : "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{getRentalShippingStatusMeta(g.rental).label}</p>
                        <p className="font-medium text-foreground">{getRentalShippingStatusMeta(g.rental).value}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                      <Undo2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">반납 상태</p>
                        <p className="font-medium text-foreground">{getRentalReturnStatusLabel(g.rental?.status)}</p>
                      </div>
                    </div>
                  </>
                ) : null}

                {displayKind === "application" ? (
                  <>
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">접수 방식</p>
                        <p className="font-medium text-foreground">{getApplicationCollectionLabel(displayApplication)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">운송장 상태</p>
                        <p className="font-medium text-foreground">{getApplicationTrackingLabel(displayApplication)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">진행 단계</p>
                        <p className="font-medium text-foreground">{displayUserStatusLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">연계 원본</p>
                        <p className="font-medium text-foreground">
                          {getApplicationOriginLabel(displayApplication)}
                          {displayApplication?.orderId ? ` · #${shortId(displayApplication.orderId) ?? "-"}` : ""}
                          {displayApplication?.rentalId ? ` · #${shortId(displayApplication.rentalId) ?? "-"}` : ""}
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

                  const detailPriority = scope === "todo" || prefersApplicationView ? 10 : 1;
                  actions.push({
                    key: "flow-detail",
                    priority: detailPriority,
                    node: (
                      <Button key="flow-detail" asChild size="sm" variant="outline" className="bg-transparent">
                        <Link href={`/mypage?tab=orders&flowType=${detailTargetType}&flowId=${detailTargetId}&${flowQuery}`}>
                          상세 보기 <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ),
                  });

                  const canRenderOrderReview = ["배송완료", "구매확정"].includes(normalizedStatus);

                  if (prefersApplicationView) {
                    if (orderId) {
                      actions.push({
                        key: "application-linked-order",
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
                        key: "application-linked-rental",
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

                  if (g.kind === "order" && orderId && !prefersApplicationView) {
                    if (canShowOrderShippingInfo(status)) {
                      actions.push({
                        key: "order-shipping-info",
                        priority: 1,
                        node: (
                          <OrderShippingInfoDialog
                            orderId={orderId}
                            triggerLabel="배송정보 확인"
                            className="bg-transparent"
                          />
                        ),
                      });
                    }

                    if (primaryLinkedApplicationId) {
                      actions.push({
                        key: "order-linked-application",
                        priority: 0,
                        pinInline: true,
                        node: (
                          <Button key="order-linked-application" asChild size="sm" variant="outline" className="bg-transparent">
                            <Link href={`/mypage?tab=orders&flowType=application&flowId=${primaryLinkedApplicationId}&${flowQuery}`}>
                              교체서비스 보기
                            </Link>
                          </Button>
                        ),
                      });
                    }

                    if (["대기중", "결제완료"].includes(normalizedStatus) && g.order?.cancelStatus !== "requested") {
                      actions.push({
                        key: "order-cancel-request",
                        priority: 1,
                        forceSecondary: true,
                        node: (
                          <Button key="order-cancel-request" size="sm" variant="destructive" onClick={() => setCancelOrderDialogId(orderId)}>
                            <XCircle className="mr-1 h-3.5 w-3.5" />취소 요청
                          </Button>
                        ),
                      });
                    } else if (normalizedStatus === "배송완료") {
                      actions.push({
                        key: "order-confirm",
                        priority: 2,
                        node: (
                          <Button key="order-confirm" size="sm" disabled={confirmingOrderId === orderId} onClick={() => handleConfirmPurchase(orderId)}>
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            {confirmingOrderId === orderId ? "처리 중..." : "주문 구매확정"}
                          </Button>
                        ),
                      });
                    }

                    if (canRenderOrderReview) {
                      actions.push({
                        key: "order-review",
                        priority: 4,
                        node: <ActivityOrderReviewCTA key="order-review" orderId={orderId} orderStatus={status} className="bg-transparent" />,
                      });
                    }
                  }

                  if (g.kind === "rental" && rentalId && !prefersApplicationView) {
                    if (["pending", "paid", "대기중", "결제완료"].includes(normalizedStatus) && !g.rental?.hasOutboundShipping) {
                      actions.push({
                        key: "rental-cancel-request",
                        priority: 1,
                        forceSecondary: true,
                        node: <CancelRentalDialog key="rental-cancel-request" rentalId={rentalId} onSuccess={refreshRelatedQueries} />,
                      });
                    }

                    if (g.rental?.stringingApplicationId) {
                      actions.push({
                        key: "rental-linked-application",
                        priority: 2,
                        node: (
                          <Button key="rental-linked-application" asChild size="sm" variant="outline" className="bg-transparent">
                            <Link href={`/mypage?tab=orders&flowType=application&flowId=${g.rental.stringingApplicationId}&${flowQuery}`}>
                              교체서비스 보기
                            </Link>
                          </Button>
                        ),
                      });
                    } else if (g.rental?.withStringService) {
                      actions.push({
                        key: "rental-apply-stringing",
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
                        key: "application-shipping",
                        priority: 0,
                        pinInline: true,
                        node: (
                          <Button key="application-shipping" asChild size="sm" variant="outline" className="bg-transparent">
                            <Link href={`/services/applications/${applicationActionTarget.id}/shipping?return=${encodeURIComponent(`/mypage?tab=orders&${flowQuery}`)}`}>
                              {applicationActionTarget.hasTracking ? "운송장 수정" : "운송장 등록"}
                            </Link>
                          </Button>
                        ),
                      });
                    }

                    if (isDirectApplicationCard && ["접수완료", "검토 중"].includes(getMypageNormalizedStatus(applicationActionTarget.status))) {
                      actions.push({
                        key: "application-cancel-request",
                        priority: 1,
                        forceSecondary: true,
                        node: (
                          <Button key="application-cancel-request" size="sm" variant="destructive" onClick={() => setCancelApplicationDialogId(applicationActionTarget.id)}>
                            <XCircle className="mr-1 h-3.5 w-3.5" />신청 취소 요청
                          </Button>
                        ),
                      });
                    }

                    if (getMypageNormalizedStatus(applicationActionTarget.status) === "교체완료" && !applicationActionTarget.userConfirmedAt) {
                      actions.push({
                        key: "application-confirm",
                        priority: 2,
                        pinInline: scope === "todo",
                        node: (
                          <Button key="application-confirm" size="sm" disabled={confirmingApplicationId === applicationActionTarget.id} onClick={() => handleConfirmApplication(applicationActionTarget.id)}>
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            {confirmingApplicationId === applicationActionTarget.id ? "처리 중..." : "교체서비스 확정"}
                          </Button>
                        ),
                      });
                    }

                    if (getMypageUserStatusLabel(applicationActionTarget.status) === "교체완료") {
                      actions.push({
                        key: "application-review",
                        priority: 4,
                        node: <ServiceReviewCTA key="application-review" applicationId={applicationActionTarget.id} status={applicationActionTarget.status} />,
                      });
                    }
                  }

                  if (
                    needsTrackingAction &&
                    actionableApplicationId &&
                    (!primaryLinkedApplicationId || primaryLinkedApplicationId !== actionableApplicationId)
                  ) {
                    actions.push({
                      key: "application-open-sheet",
                      priority: 3,
                      node: (
                        <Button key="application-open-sheet" asChild size="sm" variant="default">
                          <Link href={`/mypage?tab=orders&flowType=application&flowId=${actionableApplicationId}&${flowQuery}`}>
                            교체서비스 보기
                          </Link>
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
                  const inlineActions = [
                    ...pinnedInline,
                    ...nonPinned.slice(0, primaryCount),
                  ];
                  const secondaryActions = shouldUseSecondary
                    ? [...nonPinned.slice(primaryCount), ...forcedSecondary]
                    : [];
                  const isSecondaryOpen = expandedSecondaryKey === g.key;

                  return (
                    <>
                      {inlineActions.map((action) => action.node)}

                      {secondaryActions.length > 0 ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() =>
                            setExpandedSecondaryKey((prev) =>
                              prev === g.key ? null : g.key,
                            )
                          }
                        >
                          {isSecondaryOpen ? "기타 작업 닫기" : `기타 작업 더보기 (${secondaryActions.length})`}
                          <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${isSecondaryOpen ? "rotate-180" : ""}`} />
                        </Button>
                      ) : null}

                      {secondaryActions.length > 0 && isSecondaryOpen ? (
                        <div className="flex w-full flex-wrap justify-end gap-2 pt-1">
                          {secondaryActions.map((action) => action.node)}
                        </div>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => setSize(size + 1)}
            disabled={isValidating}
          >
            {isValidating ? "불러오는 중..." : "더 보기"}
          </Button>
        </div>
      ) : null}

      <CancelOrderDialog open={Boolean(cancelOrderDialogId)} onOpenChange={(open) => !open && setCancelOrderDialogId(null)} orderId={cancelOrderDialogId ?? ""} />

      <CancelStringingDialog
        open={Boolean(cancelApplicationDialogId)}
        onOpenChange={(open) => !open && setCancelApplicationDialogId(null)}
        onConfirm={handleApplicationCancelRequest}
        isSubmitting={isCancelApplicationSubmitting}
      />
    </div>
  );
}
