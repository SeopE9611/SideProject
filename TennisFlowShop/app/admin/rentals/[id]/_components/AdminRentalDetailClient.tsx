"use client";

import AdminRentalHistory from "@/app/admin/rentals/_components/AdminRentalHistory";
import {
  derivePaymentStatus,
  deriveShippingStatus,
} from "@/app/features/rentals/utils/status";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import AdminCancelRequestCard from "@/components/admin/AdminCancelRequestCard";
import LinkedDocsCard, {
  LinkedDocItem,
} from "@/components/admin/LinkedDocsCard";
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
import AsyncState from "@/components/system/AsyncState";
import { Skeleton } from "@/components/ui/skeleton";
import { runAdminActionWithToast } from "@/lib/admin/adminActionHelpers";
import {
  adminFetcher,
  adminMutator,
  ensureAdminMutationSucceeded,
} from "@/lib/admin/adminFetcher";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { inferNextActionForOperationItem } from "@/lib/admin/next-action-guidance";
import {
  badgeBase,
  badgeSizeSm,
  getPaymentStatusBadgeSpec,
  getRentalStatusBadgeSpec,
} from "@/lib/badge-style";
import { buildAdminCancelRequestView } from "@/lib/cancel-request/admin-cancel-request-view";
import { getRefundBankLabel } from "@/lib/cancel-request/refund-account";
import { racketBrandLabel } from "@/lib/constants";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  Copy,
  CreditCard,
  Loader2,
  Package,
  Settings,
  Truck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";

const won = (n: number) => (n || 0).toLocaleString("ko-KR") + "원";

const rentalStatusLabels: Record<string, string> = {
  pending: "대기중",
  paid: "결제완료",
  out: "대여중",
  returned: "반납완료",
  canceled: "취소됨",
};

const courierLabel: Record<string, string> = {
  cj: "CJ대한통운",
  post: "우체국",
  logen: "로젠",
  hanjin: "한진",
};
const courierTrackUrl: Record<string, (no: string) => string> = {
  cj: (no) =>
    `https://trace.cjlogistics.com/web/detail.jsp?slipno=${encodeURIComponent(no)}`,
  post: (no) =>
    `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${encodeURIComponent(no)}`,
  logen: (no) =>
    `https://www.ilogen.com/m/personal/trace/${encodeURIComponent(no)}`,
  hanjin: (no) =>
    `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&wblnum=${encodeURIComponent(no)}`,
};

// 날짜 포맷 보조
const fmt = (v?: string | Date | null) =>
  v ? new Date(v).toLocaleString() : "-";

const fetcher = (url: string) => authenticatedSWRFetcher<any>(url);

export default function AdminRentalDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/admin/rentals/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const isVisitPickup = data?.servicePickupMethod === "SHOP_VISIT";

  const [busyAction, setBusyAction] = useState<
    | null
    | "approveCancel"
    | "rejectCancel"
    | "out"
    | "return"
    | "refundMark"
    | "refundClear"
  >(null);
  const [pendingAction, setPendingAction] = useState<
    null | "out" | "return" | "refundMark" | "refundClear"
  >(null);

  const isBusy = busyAction !== null;
  // 무통장 결제완료 처리: created → paid 전이
  const onConfirmPayment = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      const result = await runAdminActionWithToast({
        action: async () => {
          const json = await adminMutator<{ ok?: boolean; message?: string }>(
            `/api/admin/rentals/${id}/payment/confirm`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            },
          );
          ensureAdminMutationSucceeded(json, "결제완료 처리 실패");
          return json;
        },
        successMessage: "결제완료로 상태 변경",
        fallbackErrorMessage: "결제완료 처리 실패",
      });
      if (result) await mutate();
    } finally {
      setConfirming(false);
    }
  };

  const onToggleRefund = async (mark: boolean) => {
    const result = await runAdminActionWithToast({
      action: async () => {
        const json = await adminMutator<{ ok?: boolean; message?: string }>(
          `/api/admin/rentals/${id}/deposit/refund`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: mark ? "mark" : "clear" }),
          },
        );
        ensureAdminMutationSucceeded(json, "처리 실패");
        return json;
      },
      successMessage: mark
        ? "보증금 환불 처리 완료"
        : "보증금 환불 처리 해제 완료",
      fallbackErrorMessage: "처리 실패",
    });
    if (result) await mutate();
  };

  const onOut = async () => {
    const result = await runAdminActionWithToast({
      action: () =>
        adminMutator(`/api/admin/rentals/${id}/out`, { method: "POST" }),
      successMessage: isVisitPickup
        ? "방문 수령 처리 완료"
        : "대여 시작 처리 완료",
      fallbackErrorMessage: "처리 실패",
    });
    if (result) await mutate();
  };

  const onReturn = async () => {
    const result = await runAdminActionWithToast({
      action: () =>
        adminMutator(`/api/admin/rentals/${id}/return`, { method: "POST" }),
      successMessage: "반납 처리 완료",
      fallbackErrorMessage: "처리 실패",
    });
    if (result) await mutate();
  };

  // 대여 취소 요청 승인
  const onApproveCancel = async () => {
    const result = await runAdminActionWithToast({
      action: async () => {
        const json = await adminMutator<{
          ok?: boolean;
          detail?: string;
          message?: string;
        }>(`/api/admin/rentals/${id}/cancel-approve`, { method: "POST" });
        ensureAdminMutationSucceeded(json, "취소 요청 승인에 실패했습니다.");
        return json;
      },
      successMessage: "대여 취소 요청을 승인했습니다.",
      fallbackErrorMessage: "취소 요청 승인에 실패했습니다.",
    });
    if (result) await mutate();
  };

  // 대여 취소 요청 거절
  const onRejectCancel = async () => {
    const result = await runAdminActionWithToast({
      action: async () => {
        const json = await adminMutator<{
          ok?: boolean;
          detail?: string;
          message?: string;
        }>(`/api/admin/rentals/${id}/cancel-reject`, { method: "POST" });
        ensureAdminMutationSucceeded(json, "취소 요청 거절에 실패했습니다.");
        return json;
      },
      successMessage: "대여 취소 요청을 거절했습니다.",
      fallbackErrorMessage: "취소 요청 거절에 실패했습니다.",
    });
    if (result) await mutate();
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "날짜 없음";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "유효하지 않은 날짜";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const fmtDateOnly = (v?: string | Date | null) =>
    v ? new Date(v).toLocaleDateString("ko-KR") : "-";

  const servicePickupMethod = (data?.servicePickupMethod ?? null) as
    | "SELF_SEND"
    | "COURIER_VISIT"
    | "SHOP_VISIT"
    | null;
  const pickupMethodLabel =
    data?.pickupMethodLabel ??
    (isVisitPickup
      ? "방문 수령"
      : servicePickupMethod === "COURIER_VISIT"
        ? "기사 방문 수거"
        : "택배 발송");

  const pendingDialogConfig =
    pendingAction === "out"
      ? {
          title: isVisitPickup
            ? "방문 수령 처리할까요?"
            : "대여 시작 처리할까요?",
          description: isVisitPickup
            ? "방문 수령 확인 후 상태가 대여중(out)으로 변경됩니다."
            : "대여 상태가 대여중(out)으로 변경됩니다.",
          confirmText: isVisitPickup ? "방문 수령 처리" : "대여 시작",
          eventKey: "admin-rental-detail-out-confirm",
          eventMeta: { rentalId: id, currentStatus: data?.status },
        }
      : pendingAction === "return"
        ? {
            title: "반납 처리할까요?",
            description: "대여 상태가 반납완료(returned)로 변경됩니다.",
            confirmText: "반납 처리",
            eventKey: "admin-rental-detail-return-confirm",
            eventMeta: { rentalId: id, currentStatus: data?.status },
          }
        : pendingAction === "refundMark"
          ? {
              title: "보증금 환불 처리할까요?",
              description: "이 작업은 보증금 환불 완료 상태로 기록됩니다.",
              confirmText: "환불 처리",
              eventKey: "admin-rental-detail-refund-mark-confirm",
              eventMeta: { rentalId: id, currentStatus: data?.status },
            }
          : pendingAction === "refundClear"
            ? {
                title: "보증금 환불 처리를 해제할까요?",
                description: "이 작업은 환불 완료 기록을 해제합니다.",
                confirmText: "환불 해제",
                eventKey: "admin-rental-detail-refund-clear-confirm",
                eventMeta: { rentalId: id, currentStatus: data?.status },
              }
            : null;

  const handleConfirmPendingAction = async () => {
    if (!pendingAction || isBusy) return;

    const actionToRun = pendingAction;
    setPendingAction(null);
    setBusyAction(actionToRun);
    try {
      if (actionToRun === "out") {
        await onOut();
        return;
      }
      if (actionToRun === "return") {
        await onReturn();
        return;
      }
      await onToggleRefund(actionToRun === "refundMark");
    } finally {
      setBusyAction(null);
    }
  };

  if (!id) return <div className="p-4">유효하지 않은 ID</div>;
  if (error) {
    return (
      <div className="min-h-screen bg-muted/30 dark:bg-muted/30">
        <div className="container py-10">
          <AsyncState
            kind="error"
            tone="admin"
            variant="page-center"
            resourceName="대여 상세"
            onAction={() => {
              void mutate();
            }}
          />
        </div>
      </div>
    );
  }
  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-muted/30 dark:bg-muted/30">
        <div className="container py-10">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="rounded-2xl border border-border/30 bg-muted/30 p-8 shadow-lg">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-4 w-52" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-8 w-36" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-xl bg-card/60 p-4">
                    <Skeleton className="mb-3 h-4 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Card key={index} className="border-border/60">
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-56" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Array.from({ length: 4 }).map((__, rowIndex) => (
                      <Skeleton key={rowIndex} className="h-10 w-full" />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border/60">
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-3 w-52" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const Outbound = data?.shipping?.outbound;
  const ReturnShip = data?.shipping?.return;
  const canConfirmPayment =
    data.status === "pending" &&
    (!data.cancelRequest || data.cancelRequest.status === "rejected");

  // 취소 요청 상태 정보
  const cancelInfo = buildAdminCancelRequestView(data?.cancelRequest, "rental");
  const cancelRefundAccount = data?.cancelRequest?.refundAccount
    ? {
        bankLabel: getRefundBankLabel(data.cancelRequest.refundAccount.bank),
        account: String(data.cancelRequest.refundAccount.account ?? "").trim(),
        holder: String(data.cancelRequest.refundAccount.holder ?? "").trim(),
      }
    : null;
  const hasCancelRefundAccount = Boolean(cancelRefundAccount);
  const hasLegacyRefundAccount = Boolean(data?.refundAccount);

  // 연결 문서(표시 전용)
  const linkedDocs: LinkedDocItem[] = data?.stringingApplicationId
    ? [
        {
          kind: "stringing_application",
          id: String(data.stringingApplicationId),
          href: `/admin/applications/stringing/${encodeURIComponent(String(data.stringingApplicationId))}`,
          subtitle: "대여 기반 교체서비스 신청서",
        },
      ]
    : [];

  const paymentLabel =
    data?.paymentStatusLabel ??
    (derivePaymentStatus(data) === "paid" ? "결제완료" : "결제대기");
  const paymentSource = data?.paymentStatusSource ?? "derived";
  const stringingName = data?.stringing?.name
    ? String(data.stringing.name)
    : null;
  const stringPrice = Number(
    data?.amount?.stringPrice ??
      (data?.stringing?.requested ? (data?.stringing?.price ?? 0) : 0),
  );
  const stringingFee = Number(
    data?.amount?.stringingFee ??
      (data?.stringing?.requested ? (data?.stringing?.mountingFee ?? 0) : 0),
  );
  const hasStringingSummary = Boolean(
    data?.stringing?.requested ||
    stringPrice > 0 ||
    stringingFee > 0 ||
    data?.stringingApplicationId,
  );
  const hasStringingIntakeSummary = Boolean(
    data?.stringingReceptionLabel ||
    data?.stringingRacketCount ||
    data?.stringingTensionSummary ||
    (Array.isArray(data?.stringingNames) && data.stringingNames.length > 0) ||
    data?.stringingReservationLabel,
  );

  const rentalGuide = inferNextActionForOperationItem({
    kind: "rental",
    statusLabel: data.status,
    paymentLabel,
    hasOutboundTracking: Boolean(data?.shipping?.outbound?.trackingNumber),
  });

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-muted/30">
      <div className="container py-10">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="bg-muted/30 rounded-2xl p-8 border border-border/30 shadow-lg mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="bg-card rounded-full p-3 shadow-md">
                  <Settings className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    대여 관리
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    대여 ID: {data.id}
                  </p>
                </div>
              </div>
              <div className="sm:ml-auto flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-border text-foreground hover:bg-muted"
                  asChild
                >
                  <Link href="/admin/rentals">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    목록으로 돌아가기
                  </Link>
                </Button>

                {data?.status !== "canceled" && !isVisitPickup && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 border-border text-foreground hover:bg-muted whitespace-nowrap"
                  >
                    <Link href={`/admin/rentals/${id}/shipping-update`}>
                      <Truck className="h-4 w-4 mr-2" />
                      {data?.shipping?.outbound?.trackingNumber
                        ? "출고 운송장 수정"
                        : "출고 운송장 등록"}
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-card/60 dark:bg-card/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {isVisitPickup ? "방문 수령 처리(out)" : "대여 시작"}
                  </span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {data.outAt ? formatDate(data.outAt) : "-"}
                </p>
              </div>

              <div className="bg-card/60 dark:bg-card/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    총 결제금액
                  </span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {won(data.amount?.total)}
                </p>
              </div>

              <div className="bg-card/60 dark:bg-card/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    대여 상태
                  </span>
                </div>
                {(() => {
                  const rentalLabel =
                    rentalStatusLabels[data.status] || data.status;
                  const rentalSpec = getRentalStatusBadgeSpec(data.status);
                  return (
                    <Badge
                      variant={rentalSpec.variant}
                      className={cn(badgeBase, badgeSizeSm)}
                    >
                      {rentalLabel}
                    </Badge>
                  );
                })()}
              </div>

              <div className="bg-card/60 dark:bg-card/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    대여 기간
                  </span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {data.days}일
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  수령 방식: {pickupMethodLabel}
                </p>
              </div>
            </div>
            {/* 취소 요청 상태 안내 (관리자용) */}
            {cancelInfo && (
              <AdminCancelRequestCard
                badgeLabel={cancelInfo.badgeLabel}
                description={cancelInfo.description}
                reasonSummary={cancelInfo.reasonSummary}
                tone={cancelInfo.tone}
              >
                {/* 요청 상태일 때만 승인/거절 버튼 노출 */}
                {cancelInfo.status === "requested" && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={isBusy}
                      onClick={async () => {
                        if (isBusy) return;
                        setBusyAction("approveCancel");
                        try {
                          await onApproveCancel();
                        } finally {
                          setBusyAction(null);
                        }
                      }}
                    >
                      {busyAction === "approveCancel"
                        ? "승인 처리중…"
                        : "요청 승인"}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-primary hover:bg-muted"
                      disabled={isBusy}
                      onClick={async () => {
                        if (isBusy) return;
                        setBusyAction("rejectCancel");
                        try {
                          await onRejectCancel();
                        } finally {
                          setBusyAction(null);
                        }
                      }}
                    >
                      {busyAction === "rejectCancel"
                        ? "거절 처리중…"
                        : "요청 거절"}
                    </Button>
                  </div>
                )}
              </AdminCancelRequestCard>
            )}
          </div>

          {/* 연결 문서(공용 카드) */}
          {linkedDocs.length > 0 && (
            <>
              <LinkedDocsCard
                docs={linkedDocs}
                description="이 대여는 교체서비스 신청서와 연결되어 있습니다. 교체서비스 진행/상태는 신청서에서 확인하세요."
                className="border-0 shadow-xl ring-1 ring-ring"
              />
              <Card className="border-0 shadow-xl ring-1 ring-ring bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">연결 업무 가이드</CardTitle>
                  <CardDescription>
                    현재 업무 단계와 다음 해야 할 작업을 요약합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    현재 단계: {rentalGuide.stage}
                  </p>
                  <p className="font-medium">
                    다음 할 일: {rentalGuide.nextAction}
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {hasStringingSummary && (
            <Card className="border-0 shadow-xl ring-1 ring-ring bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  스트링/교체서비스 요약
                </CardTitle>
                <CardDescription>
                  스트링 선택 정보와 교체서비스 신청 진행 상태를 한 번에
                  확인합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <p className="text-muted-foreground">
                  스트링:{" "}
                  <span className="font-medium text-foreground">
                    {stringingName ?? "선택됨(이름 미기록)"}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  요금:{" "}
                  <span className="font-medium text-foreground">
                    {stringPrice > 0 ? won(stringPrice) : "0원"}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  교체비:{" "}
                  <span className="font-medium text-foreground">
                    {stringingFee > 0 ? won(stringingFee) : "0원"}
                  </span>
                </p>
                {data?.stringingApplicationId && (
                  <p className="text-muted-foreground">
                    신청 상태:{" "}
                    <span className="font-medium text-foreground">
                      {data?.stringingApplicationStatus ?? "상태 확인 필요"}
                    </span>
                  </p>
                )}
                {hasStringingIntakeSummary && (
                  <>
                    {data?.stringingReceptionLabel && (
                      <p className="text-muted-foreground">
                        접수 방식:{" "}
                        <span className="font-medium text-foreground">
                          {data.stringingReceptionLabel}
                        </span>
                      </p>
                    )}
                    {typeof data?.stringingRacketCount === "number" &&
                      data.stringingRacketCount > 0 && (
                        <p className="text-muted-foreground">
                          라인 수:{" "}
                          <span className="font-medium text-foreground">
                            {data.stringingRacketCount}개
                          </span>
                        </p>
                      )}
                    {Array.isArray(data?.stringingNames) &&
                      data.stringingNames.length > 0 && (
                        <p className="text-muted-foreground">
                          스트링 선택:{" "}
                          <span className="font-medium text-foreground">
                            {data.stringingNames.join(", ")}
                          </span>
                        </p>
                      )}
                    {data?.stringingTensionSummary && (
                      <p className="text-muted-foreground">
                        텐션:{" "}
                        <span className="font-medium text-foreground">
                          {data.stringingTensionSummary}
                        </span>
                      </p>
                    )}
                    {data?.stringingReservationLabel && (
                      <p className="text-muted-foreground">
                        방문 예약:{" "}
                        <span className="font-medium text-foreground">
                          {data.stringingReservationLabel}
                        </span>
                      </p>
                    )}
                  </>
                )}
                {data?.stringingApplicationId && (
                  <div className="pt-2">
                    <Button asChild size="sm" className="h-8">
                      <Link
                        href={`/admin/applications/stringing/${encodeURIComponent(String(data.stringingApplicationId))}`}
                      >
                        신청서 상세로 이동
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-xl ring-1 ring-ring bg-muted/30 overflow-hidden mb-8">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle>대여 상태 관리</CardTitle>
              <CardDescription>
                대여 상태를 변경하거나 보증금 환불을 처리할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-4">
              <div className="flex gap-2 flex-wrap">
                {/* 결제완료 처리(무통장) – pending 상태에서만 노출 */}
                {canConfirmPayment && (
                  <Button
                    size="sm"
                    className="h-9 bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isBusy || confirming}
                    onClick={onConfirmPayment}
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        결제 처리중…
                      </>
                    ) : (
                      "결제완료 처리(무통장)"
                    )}
                  </Button>
                )}

                {/* 대여 시작(out) */}
                <Button
                  size="sm"
                  className="h-9 bg-muted hover:bg-muted"
                  disabled={isBusy || data.status !== "paid"}
                  onClick={() => {
                    if (isBusy) return;
                    setPendingAction("out");
                  }}
                >
                  {busyAction === "out"
                    ? isVisitPickup
                      ? "방문 수령 처리중…"
                      : "대여 시작 처리중…"
                    : isVisitPickup
                      ? "방문 수령 처리(out)"
                      : "대여 시작(out)"}
                </Button>

                {/* 반납 처리(return) */}
                <Button
                  size="sm"
                  className="h-9 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isBusy || !["paid", "out"].includes(data.status)}
                  onClick={() => {
                    if (isBusy) return;
                    setPendingAction("return");
                  }}
                >
                  {busyAction === "return"
                    ? "반납 처리중…"
                    : "반납 처리(return)"}
                </Button>

                {/* 환불/해제 버튼 (아래는 기존 코드 그대로) */}
                {data.status === "returned" &&
                  (data.depositRefundedAt ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => {
                        if (isBusy) return;
                        setPendingAction("refundClear");
                      }}
                    >
                      {busyAction === "refundClear"
                        ? "환불 해제 중…"
                        : "환불 해제"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => {
                        if (isBusy) return;
                        setPendingAction("refundMark");
                      }}
                    >
                      {busyAction === "refundMark"
                        ? "환불 처리 중…"
                        : "환불 처리"}
                    </Button>
                  ))}
              </div>
            </CardFooter>
          </Card>
          {pendingDialogConfig && (
            <AdminConfirmDialog
              open={pendingAction !== null}
              onOpenChange={(open) => {
                if (!open) setPendingAction(null);
              }}
              onCancel={() => setPendingAction(null)}
              onConfirm={handleConfirmPendingAction}
              severity="danger"
              title={pendingDialogConfig.title}
              description={pendingDialogConfig.description}
              confirmText={pendingDialogConfig.confirmText}
              cancelText="취소"
              eventKey={pendingDialogConfig.eventKey}
              eventMeta={pendingDialogConfig.eventMeta}
            />
          )}
          <Card className="mt-8 border-0 shadow-xl ring-1 ring-ring bg-muted/30 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle>고객 정보</CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-sm space-y-3">
              <div>
                <span className="text-muted-foreground">이름</span>
                <div className="font-semibold">{data.user?.name || "-"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">이메일</span>
                <div className="font-semibold">{data.user?.email || "-"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">연락처</span>
                <div className="font-semibold">{data.user?.phone || "-"}</div>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-0 shadow-xl ring-1 ring-ring bg-muted/30 overflow-hidden">
              <CardHeader className="bg-muted/30 border-b pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-destructive" />
                  <span>라켓 정보</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/*
          금액 표시 정합성
          - 서버(/api/admin/rentals)가 amount.stringPrice / amount.stringingFee를 저장하므로
           관리자 상세에서도 해당 금액 근거를 그대로 노출시킴.
          - 대여만 한 케이스(스트링 미선택)는 UI가 지저분해지지 않도록 조건부 렌더링.
         */}
                  <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                    <div>
                      <p className="text-sm text-muted-foreground">브랜드</p>
                      <p className="font-semibold text-foreground">
                        {racketBrandLabel(data.brand)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                    <div>
                      <p className="text-sm text-muted-foreground">모델</p>
                      <p className="font-semibold text-foreground">
                        {data.model}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                    <div>
                      <p className="text-sm text-muted-foreground">대여 기간</p>
                      <p className="font-semibold text-foreground">
                        {data.days}일
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl ring-1 ring-ring bg-muted/30 overflow-hidden">
              <CardHeader className="bg-muted/30 border-b pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span>결제 정보</span>
                </CardTitle>
                <div className="ml-auto flex flex-col items-end gap-1">
                  {(() => {
                    const pay = getPaymentStatusBadgeSpec(paymentLabel);
                    return (
                      <Badge
                        variant={pay.variant}
                        className={cn(badgeBase, badgeSizeSm)}
                      >
                        {paymentLabel}
                      </Badge>
                    );
                  })()}
                  {paymentSource === "derived" && (
                    <span className="text-[11px] text-muted-foreground">
                      대여 상태 기준 파생
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        대여 수수료
                      </p>
                      <p className="font-semibold text-foreground">
                        {won(data.amount?.fee)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                    <div>
                      <p className="text-sm text-muted-foreground">보증금</p>
                      <p className="font-semibold text-foreground">
                        {won(data.amount?.deposit)}
                      </p>
                    </div>
                  </div>
                  {/* 스트링 상품 금액: 있을 때만 표시 */}
                  {(data.amount?.stringPrice ?? 0) > 0 && (
                    <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          스트링 상품
                        </p>
                        <p className="font-semibold text-foreground">
                          {won(data.amount?.stringPrice ?? 0)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 교체 서비스비(장착비): 있을 때만 표시 */}
                  {(data.amount?.stringingFee ?? 0) > 0 && (
                    <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          교체 서비스비
                        </p>
                        <p className="font-semibold text-foreground">
                          {won(data.amount?.stringingFee ?? 0)}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        총 결제 금액
                      </p>
                      <p className="text-xl font-bold text-primary dark:text-foreground">
                        {won(data.amount?.total)}
                      </p>
                    </div>
                  </div>
                  {(hasCancelRefundAccount || hasLegacyRefundAccount) && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        환불 계좌 확인
                      </p>
                      {hasCancelRefundAccount && (
                        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                취소 요청 시 제출한 환불 계좌
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                취소 요청 시 고객이 제출한 환불 계좌입니다. 환불
                                처리 전 이 계좌를 우선 검토하세요.
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="border-primary/40 text-primary"
                            >
                              우선 검토
                            </Badge>
                          </div>
                          <dl className="mt-3 space-y-1 text-sm text-foreground">
                            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                              <dt className="text-muted-foreground">
                                환불 은행
                              </dt>
                              <dd>
                                {cancelRefundAccount?.bankLabel || "미입력"}
                              </dd>
                            </div>
                            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                              <dt className="text-muted-foreground">
                                계좌번호
                              </dt>
                              <dd className="font-mono">
                                {cancelRefundAccount?.account || "미입력"}
                              </dd>
                            </div>
                            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                              <dt className="text-muted-foreground">예금주</dt>
                              <dd>{cancelRefundAccount?.holder || "미입력"}</dd>
                            </div>
                          </dl>
                          {cancelRefundAccount?.account && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    cancelRefundAccount.account,
                                  );
                                  showSuccessToast(
                                    "취소 요청 환불 계좌번호를 복사했습니다",
                                  );
                                } catch {
                                  showErrorToast(
                                    "계좌번호 복사에 실패했습니다",
                                  );
                                }
                              }}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              계좌번호 복사
                            </Button>
                          )}
                        </div>
                      )}

                      {hasLegacyRefundAccount && (
                        <div
                          className={cn(
                            "rounded-lg border p-4",
                            hasCancelRefundAccount
                              ? "border-border/60 bg-muted/40"
                              : "border-border bg-muted/60 dark:bg-card/70",
                          )}
                        >
                          <p className="text-sm font-medium text-foreground">
                            보증금 환불 계좌
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            기존에 등록된 보증금 환불 계좌입니다. 취소 요청
                            계좌가 없을 때 참고용으로 확인하세요.
                          </p>
                          <dl className="mt-3 space-y-1 text-sm text-foreground">
                            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                              <dt className="text-muted-foreground">
                                환불 은행
                              </dt>
                              <dd>
                                {getRefundBankLabel(data.refundAccount.bank) ||
                                  "미입력"}
                              </dd>
                            </div>
                            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                              <dt className="text-muted-foreground">예금주</dt>
                              <dd>
                                {data.refundAccount.holderMasked || "미입력"}
                              </dd>
                            </div>
                            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                              <dt className="text-muted-foreground">
                                계좌번호
                              </dt>
                              <dd className="font-mono">
                                {data.refundAccount.accountMasked || "미입력"}
                              </dd>
                            </div>
                          </dl>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={async () => {
                              try {
                                const j = await adminFetcher<{
                                  bank?: string;
                                  holder?: string;
                                  account?: string;
                                }>(`/api/admin/rentals/${id}/refund-account`, {
                                  cache: "no-store",
                                });
                                const text = `[${j.bank}] ${j.holder} / ${j.account}`;
                                await navigator.clipboard.writeText(text);
                                showSuccessToast(
                                  "보증금 환불 계좌 정보를 복사했습니다",
                                );
                              } catch {
                                showErrorToast("네트워크 오류");
                              }
                            }}
                          >
                            전체 계좌 보기/복사
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-xl ring-1 ring-ring bg-muted/30 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                {isVisitPickup ? "수령/배송 정보" : "운송장 정보"}
              </CardTitle>
              <div className="ml-auto">
                {isVisitPickup ? (
                  <span className="inline-flex px-2 py-0.5 rounded bg-primary/10 text-primary text-xs dark:bg-primary/20">
                    방문 수령
                  </span>
                ) : (
                  {
                    none: (
                      <span className="inline-flex px-2 py-0.5 rounded bg-muted text-foreground text-xs">
                        운송장 없음
                      </span>
                    ),
                    "outbound-set": (
                      <span className="inline-flex px-2 py-0.5 rounded bg-muted text-foreground text-xs">
                        출고 운송장
                      </span>
                    ),
                    "return-set": (
                      <span className="inline-flex px-2 py-0.5 rounded bg-muted text-foreground text-xs">
                        반납 운송장
                      </span>
                    ),
                    "both-set": (
                      <span className="inline-flex px-2 py-0.5 rounded bg-primary/10 text-primary text-xs dark:bg-primary/20">
                        왕복 운송장
                      </span>
                    ),
                  }[deriveShippingStatus(data)]
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* 출고 */}
                <div className="p-4 rounded-lg border bg-muted/60 dark:bg-card/70">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {isVisitPickup ? "인도(매장)" : "출고"}
                  </p>
                  {isVisitPickup ? (
                    <div className="space-y-1 text-sm">
                      <div>
                        수령 방식: <b>{pickupMethodLabel}</b>
                      </div>
                      <div>
                        방문 수령 처리일:{" "}
                        <b>{data.outAt ? fmtDateOnly(data.outAt) : "-"}</b>
                      </div>
                    </div>
                  ) : data?.shipping?.outbound?.trackingNumber ? (
                    <div className="space-y-1 text-sm">
                      <div>
                        택배사:{" "}
                        <b>
                          {courierLabel[data.shipping.outbound.courier] ??
                            data.shipping.outbound.courier ??
                            "-"}
                        </b>
                      </div>
                      <div>
                        운송장:
                        <a
                          className="underline underline-offset-2"
                          href={
                            courierTrackUrl[data.shipping.outbound.courier]?.(
                              data.shipping.outbound.trackingNumber,
                            ) ?? "#"
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          {data.shipping.outbound.trackingNumber}
                        </a>
                      </div>
                      <div>
                        출고일:{" "}
                        <b>{fmtDateOnly(data.shipping.outbound.shippedAt)}</b>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">미등록</div>
                  )}
                </div>
                {/* 반납 */}
                <div className="p-4 rounded-lg border bg-muted/60 dark:bg-card/70">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    반납
                  </p>
                  {data?.shipping?.return?.trackingNumber ? (
                    <div className="space-y-1 text-sm">
                      <div>
                        택배사:{" "}
                        <b>
                          {courierLabel[data.shipping.return.courier] ??
                            data.shipping.return.courier ??
                            "-"}
                        </b>
                      </div>
                      <div>
                        운송장:
                        <a
                          className="underline underline-offset-2"
                          href={
                            courierTrackUrl[data.shipping.return.courier]?.(
                              data.shipping.return.trackingNumber,
                            ) ?? "#"
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          {data.shipping.return.trackingNumber}
                        </a>
                      </div>
                      <div>
                        발송일:{" "}
                        <b>{fmtDateOnly(data.shipping.return.shippedAt)}</b>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">미등록</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl ring-1 ring-ring bg-muted/30 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>대여 타임라인</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isVisitPickup ? "방문 수령 처리(out)" : "대여 시작"}
                    </p>
                    <p className="font-semibold text-foreground">
                      {data.outAt ? formatDate(data.outAt) : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">반납 예정</p>
                    <p className="font-semibold text-foreground">
                      {data.dueAt ? formatDate(data.dueAt) : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">반납 완료</p>
                    <p className="font-semibold text-foreground">
                      {data.returnedAt ? formatDate(data.returnedAt) : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                  <CreditCard className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">보증금 환불</p>
                    <p className="font-semibold text-foreground">
                      {data.depositRefundedAt
                        ? formatDate(data.depositRefundedAt)
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <AdminRentalHistory
            id={id}
            servicePickupMethod={servicePickupMethod}
          />
        </div>
      </div>
    </div>
  );
}
