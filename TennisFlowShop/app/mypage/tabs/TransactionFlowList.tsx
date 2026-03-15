"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CancelStringingDialog from "@/app/mypage/applications/_components/CancelStringingDialog";
import CancelOrderDialog from "@/app/mypage/orders/_components/CancelOrderDialog";
import CancelRentalDialog from "@/app/mypage/rentals/_components/CancelRentalDialog";
import ActivityOrderReviewCTA from "@/app/mypage/tabs/_components/ActivityOrderReviewCTA";
import ServiceReviewCTA from "@/components/reviews/ServiceReviewCTA";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import {
  getApplicationStatusBadgeSpec,
  getOrderStatusBadgeSpec,
  getRentalStatusBadgeSpec,
} from "@/lib/badge-style";
import { getMypageUserStatusLabel } from "@/app/mypage/_lib/status-label";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { ArrowRight, Calendar, CheckCircle, ChevronDown, CreditCard, Link2, Package, Undo2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  status: string;
  racketType?: string;
  hasTracking: boolean;
  needsInboundTracking?: boolean;
  userConfirmedAt?: string | null;
  cancelStatus?: string | null;
};

type ActivityGroup = {
  key: string;
  kind: "order" | "application" | "rental";
  sortAt: string;
  flowType: FlowType;
  flowLabel: string;
  detailTarget: { type: FlowDetailType; id: string };
  order?: {
    id?: string;
    status: string;
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
    status: string;
    brand?: string;
    model?: string;
    totalAmount?: number;
    linkedApplicationCount: number;
    stringingApplicationId?: string | null;
    withStringService?: boolean;
    cancelStatus?: string | null;
    hasOutboundShipping?: boolean;
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

  const racketType = group.application?.racketType?.trim();
  if (isFilledText(racketType)) return racketType as string;
  return "교체서비스 신청";
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

  const handleWithdrawOrderCancelRequest = async (orderId: string) => {
    if (!window.confirm("주문 취소 요청을 철회하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel-request-withdraw`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        showErrorToast(body?.message || "주문 취소 요청 철회 중 오류가 발생했습니다.");
        return;
      }
      showSuccessToast("주문 취소 요청을 철회했습니다.");
      await refreshRelatedQueries();
    } catch (e) {
      console.error(e);
      showErrorToast("주문 취소 요청 철회 중 오류가 발생했습니다.");
    }
  };

  const handleWithdrawRentalCancelRequest = async (rentalId: string) => {
    if (!window.confirm("대여 취소 요청을 철회하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/rentals/${rentalId}/cancel-withdraw`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        showErrorToast(body?.message || "대여 취소 요청 철회 중 오류가 발생했습니다.");
        return;
      }
      showSuccessToast("대여 취소 요청을 철회했습니다.");
      await refreshRelatedQueries();
    } catch (e) {
      console.error(e);
      showErrorToast("대여 취소 요청 철회 중 오류가 발생했습니다.");
    }
  };

  const handleWithdrawApplicationCancelRequest = async (applicationId: string) => {
    if (!window.confirm("신청 취소 요청을 철회하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/applications/${applicationId}/cancel-request-withdraw`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        showErrorToast(body?.message || "신청 취소 요청 철회 중 오류가 발생했습니다.");
        return;
      }
      showSuccessToast("신청 취소 요청을 철회했습니다.");
      await refreshRelatedQueries();
    } catch (e) {
      console.error(e);
      showErrorToast("신청 취소 요청 철회 중 오류가 발생했습니다.");
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
      <div className="flex flex-wrap gap-2">
        {FLOW_SCOPE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={scope === option.value ? "default" : "outline"}
            className={scope === option.value ? "" : "bg-transparent"}
            onClick={() => handleScopeChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {items.length === 0 ? (
        <Card className="border-0 bg-card">
          <CardContent className="p-8 text-center">
            <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              표시할 거래 흐름이 없습니다.
            </p>
          </CardContent>
        </Card>
      ) : items.map((g) => {
        const orderId = g.order?.id ?? (g.kind === "order" ? g.detailTarget.id : undefined);
        const rentalId = g.rental?.id ?? (g.kind === "rental" ? g.detailTarget.id : undefined);
        const applicationId = g.application?.id ?? (g.kind === "application" ? g.detailTarget.id : undefined);
        const primaryLinkedApplicationId = g.kind === "order"
          ? (g.order?.stringingApplicationId ?? g.order?.applicationSummaries?.[0]?.id)
          : g.kind === "rental"
            ? (g.rental?.stringingApplicationId ?? g.rental?.applicationSummaries?.[0]?.id)
            : undefined;
        const status =
          g.kind === "order"
            ? g.order?.status
            : g.kind === "rental"
              ? g.rental?.status
              : g.application?.status;
        const userStatusLabel = getMypageUserStatusLabel(status);
        const statusBadgeSpec = getStatusBadgeSpec(g, userStatusLabel);
        const amount =
          g.kind === "order"
            ? g.order?.totalPrice
            : g.kind === "rental"
              ? g.rental?.totalAmount
              : null;
        const linkedCount =
          g.kind === "order"
            ? (g.order?.linkedApplicationCount ?? 0)
            : g.kind === "rental"
              ? (g.rental?.linkedApplicationCount ?? 0)
              : 0;
        const needsTrackingAction = Boolean(
          g.application?.needsInboundTracking && !g.application?.hasTracking,
        );
        const normalizedMetaLabel = normalizeLabel(FLOW_TYPE_META_LABEL[g.flowType]);
        const normalizedFlowLabel = normalizeLabel(g.flowLabel);
        const shouldShowFlowBadge =
          Boolean(normalizedFlowLabel) &&
          normalizedFlowLabel !== normalizedMetaLabel;

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
                    {getRepresentativeTitle(g)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {FLOW_TYPE_META_LABEL[g.flowType]} · 최근 업데이트{" "}
                    {formatDate(g.sortAt)}
                  </p>
                </div>
                <Badge variant={statusBadgeSpec.variant}>
                  {userStatusLabel}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {shouldShowFlowBadge ? (
                  <Badge variant="outline">{g.flowLabel}</Badge>
                ) : null}
                {g.flowType !== "application_only" && linkedCount > 0 ? (
                  <Badge variant="secondary">
                    교체서비스 {linkedCount}건 연결
                  </Badge>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/50 bg-muted/30 p-3 bp-sm:grid-cols-2 bp-lg:grid-cols-3">
                {g.flowType !== "application_only" ? (
                  <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        결제/주문 금액
                      </p>
                      <p className="font-medium text-foreground">
                        {formatAmount(amount)}
                      </p>
                    </div>
                  </div>
                ) : null}

                {g.flowType !== "application_only" ? (
                  <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        연결 신청
                      </p>
                      <p className="font-medium text-foreground">
                        {linkedCount > 0 ? `${linkedCount}건` : "없음"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        신청 분류
                      </p>
                      <p className="font-medium text-foreground">
                        교체서비스 단독
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      최근 업데이트
                    </p>
                    <p className="font-medium text-foreground">
                      {formatDate(g.sortAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 md:pt-4">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="bg-transparent"
                >
                  <Link
                    href={`/mypage?tab=orders&flowType=${g.detailTarget.type}&flowId=${g.detailTarget.id}&from=orders`}
                  >
                    상세 보기 <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>

                {(() => {
                  type ActionDef = {
                    key: string;
                    priority: number;
                    pinInline?: boolean;
                    node: React.ReactNode;
                  };

                  const actions: ActionDef[] = [];

                  const canRenderOrderReview = ["배송완료", "구매확정"].includes(
                    status ?? "",
                  );
                  const canRenderServiceReview = ["교체완료", "완료", "completed"].includes(
                    status ?? "",
                  );

                  if (g.kind === "order" && orderId) {
                    if (primaryLinkedApplicationId) {
                      actions.push({
                        key: "order-linked-application",
                        priority: 0,
                        pinInline: true,
                        node: (
                          <Button key="order-linked-application" asChild size="sm" variant="outline" className="bg-transparent">
                            <Link href={`/mypage?tab=orders&flowType=application&flowId=${primaryLinkedApplicationId}&from=orders`}>
                              연결 신청서 보기
                            </Link>
                          </Button>
                        ),
                      });
                    }

                    if (g.order?.cancelStatus === "requested") {
                      actions.push({
                        key: "order-cancel-withdraw",
                        priority: 1,
                        node: (
                          <Button key="order-cancel-withdraw" size="sm" variant="destructive" onClick={() => handleWithdrawOrderCancelRequest(orderId)}>
                            <Undo2 className="mr-1 h-3.5 w-3.5" />취소 요청 철회
                          </Button>
                        ),
                      });
                    } else if (["대기중", "결제완료"].includes(status ?? "")) {
                      actions.push({
                        key: "order-cancel-request",
                        priority: 1,
                        node: (
                          <Button key="order-cancel-request" size="sm" variant="destructive" onClick={() => setCancelOrderDialogId(orderId)}>
                            <XCircle className="mr-1 h-3.5 w-3.5" />취소 요청
                          </Button>
                        ),
                      });
                    } else if (status === "배송완료") {
                      actions.push({
                        key: "order-confirm",
                        priority: 2,
                        node: (
                          <Button key="order-confirm" size="sm" variant="outline" disabled={confirmingOrderId === orderId} onClick={() => handleConfirmPurchase(orderId)}>
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            {confirmingOrderId === orderId ? "처리 중..." : "구매확정"}
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

                  if (g.kind === "rental" && rentalId) {
                    if (g.rental?.cancelStatus === "requested") {
                      actions.push({
                        key: "rental-cancel-withdraw",
                        priority: 1,
                        node: (
                          <Button key="rental-cancel-withdraw" size="sm" variant="destructive" onClick={() => handleWithdrawRentalCancelRequest(rentalId)}>
                            <Undo2 className="mr-1 h-3.5 w-3.5" />대여 취소 철회
                          </Button>
                        ),
                      });
                    } else if (["pending", "paid"].includes(status ?? "") && !g.rental?.hasOutboundShipping) {
                      actions.push({
                        key: "rental-cancel-request",
                        priority: 1,
                        node: <CancelRentalDialog key="rental-cancel-request" rentalId={rentalId} onSuccess={refreshRelatedQueries} />,
                      });
                    }

                    if (g.rental?.stringingApplicationId) {
                      actions.push({
                        key: "rental-linked-application",
                        priority: 2,
                        node: (
                          <Button key="rental-linked-application" asChild size="sm" variant="outline" className="bg-transparent">
                            <Link href={`/mypage?tab=orders&flowType=application&flowId=${g.rental.stringingApplicationId}&from=orders`}>
                              신청서 보기
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

                  if (g.kind === "application" && applicationId) {
                    if (g.application?.needsInboundTracking ?? false) {
                      actions.push({
                        key: "application-shipping",
                        priority: 0,
                        pinInline: true,
                        node: (
                          <Button key="application-shipping" asChild size="sm" variant="outline" className="bg-transparent">
                            <Link href={`/services/applications/${applicationId}/shipping?return=${encodeURIComponent("/mypage?tab=orders")}`}>
                              {g.application?.hasTracking ? "운송장 수정" : "운송장 등록"}
                            </Link>
                          </Button>
                        ),
                      });
                    }

                    if (g.application?.cancelStatus === "requested" || g.application?.cancelStatus === "요청") {
                      actions.push({
                        key: "application-cancel-withdraw",
                        priority: 1,
                        node: (
                          <Button key="application-cancel-withdraw" size="sm" variant="destructive" onClick={() => handleWithdrawApplicationCancelRequest(applicationId)}>
                            <Undo2 className="mr-1 h-3.5 w-3.5" />신청 취소 철회
                          </Button>
                        ),
                      });
                    } else if (["접수완료", "검토 중"].includes(status ?? "")) {
                      actions.push({
                        key: "application-cancel-request",
                        priority: 1,
                        node: (
                          <Button key="application-cancel-request" size="sm" variant="destructive" onClick={() => setCancelApplicationDialogId(applicationId)}>
                            <XCircle className="mr-1 h-3.5 w-3.5" />신청 취소 요청
                          </Button>
                        ),
                      });
                    }

                    if (status === "교체완료" && !g.application?.userConfirmedAt) {
                      actions.push({
                        key: "application-confirm",
                        priority: 2,
                        node: (
                          <Button key="application-confirm" size="sm" variant="outline" disabled={confirmingApplicationId === applicationId} onClick={() => handleConfirmApplication(applicationId)}>
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            {confirmingApplicationId === applicationId ? "처리 중..." : "교체확정"}
                          </Button>
                        ),
                      });
                    }

                    if (canRenderServiceReview) {
                      actions.push({
                        key: "application-review",
                        priority: 4,
                        node: <ServiceReviewCTA key="application-review" applicationId={applicationId} status={status} />,
                      });
                    }
                  }

                  if (needsTrackingAction && (!primaryLinkedApplicationId || primaryLinkedApplicationId !== g.application?.id)) {
                    actions.push({
                      key: "application-open-sheet",
                      priority: 3,
                      node: (
                        <Button key="application-open-sheet" asChild size="sm" variant="default">
                          <Link href={`/mypage?tab=orders&flowType=application&flowId=${g.application?.id}&from=orders`}>
                            교체 신청서 확인
                          </Link>
                        </Button>
                      ),
                    });
                  }

                  const sortedActions = actions.sort((a, b) => a.priority - b.priority);
                  const shouldUseSecondary = sortedActions.length > 3;
                  const pinnedInline = sortedActions.filter((a) => a.pinInline);
                  const nonPinned = sortedActions.filter((a) => !a.pinInline);

                  const primaryCount = shouldUseSecondary ? 1 : nonPinned.length;
                  const inlineActions = [
                    ...pinnedInline,
                    ...nonPinned.slice(0, primaryCount),
                  ];
                  const secondaryActions = shouldUseSecondary
                    ? nonPinned.slice(primaryCount)
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
                          보조 액션 {secondaryActions.length}개
                          <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${isSecondaryOpen ? "rotate-180" : ""}`} />
                        </Button>
                      ) : null}

                      {secondaryActions.length > 0 && isSecondaryOpen ? (
                        <div className="flex w-full flex-wrap gap-2 pt-1">
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
