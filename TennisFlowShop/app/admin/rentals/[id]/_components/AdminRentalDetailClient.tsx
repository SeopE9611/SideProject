"use client";

import AdminRentalHistory from "@/app/admin/rentals/_components/AdminRentalHistory";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { derivePaymentStatus, deriveShippingStatus } from "@/app/features/rentals/utils/status";
import AdminCancelRequestCard from "@/components/admin/AdminCancelRequestCard";
import AdminDetailSectionNav from "@/components/admin/AdminDetailSectionNav";
import { AdminInfoGrid, AdminInfoItem } from "@/components/admin/AdminInfoGrid";
import AdminInternalNotesCard from "@/components/admin/AdminInternalNotesCard";
import AdminNextActionPanel from "@/components/admin/AdminNextActionPanel";
import AdminStatusCard from "@/components/admin/AdminStatusCard";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
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
import AsyncState from "@/components/system/AsyncState";
import { runAdminActionWithToast } from "@/lib/admin/adminActionHelpers";
import { adminFetcher, adminMutator, ensureAdminMutationSucceeded } from "@/lib/admin/adminFetcher";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import {
  badgeBase,
  badgeSizeSm,
  getApplicationStatusBadgeSpec,
  getPaymentStatusBadgeSpec,
  getRentalStatusBadgeSpec,
} from "@/lib/badge-style";
import { buildAdminCancelRequestView } from "@/lib/cancel-request/admin-cancel-request-view";
import { getRefundBankLabel } from "@/lib/cancel-request/refund-account";
import { racketBrandLabel, stringColorLabel } from "@/lib/constants";
import { getCourierDisplayName } from "@/lib/shipping/courier-map";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/application-status";
import { shortenId } from "@/lib/shorten";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { hasRentalStringingService, isRentalStringingComplete } from "@/lib/rental-stringing-flow";
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
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";

const won = (n: number) => (n || 0).toLocaleString("ko-KR") + "원";

const rentalStatusLabels: Record<string, string> = {
  pending: "결제대기",
  paid: "결제완료",
  out: "대여중",
  returned: "반납완료",
  canceled: "취소됨",
  cancelled: "취소됨",
};

const courierTrackUrl: Record<string, (no: string) => string> = {
  cj: (no) => `https://trace.cjlogistics.com/web/detail.jsp?slipno=${encodeURIComponent(no)}`,
  post: (no) =>
    `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${encodeURIComponent(no)}`,
  logen: (no) => `https://www.ilogen.com/m/personal/trace/${encodeURIComponent(no)}`,
  hanjin: (no) =>
    `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&wblnum=${encodeURIComponent(no)}`,
};

// 날짜 포맷 보조
const fmt = (v?: string | Date | null) => (v ? new Date(v).toLocaleString() : "-");

const rentalHistoryActionLabels: Record<string, string> = {
  paid: "결제 확인",
  out: "수령 확인 / 대여 시작",
  returned: "반납 완료",
  "cancel-request": "취소 요청",
  "cancel-approved": "취소 승인",
  "cancel-rejected": "취소 거절",
  "cancel-withdrawn": "취소 철회",
};

function getRentalHistoryActorLabel(actor?: { role?: string; id?: string } | null) {
  if (!actor?.role) return "이력에 처리자 정보 없음";
  if (actor.role === "admin") return "관리자";
  if (actor.role === "user") return "고객";
  if (actor.role === "system") return "시스템";
  return actor.role;
}

const fetcher = (url: string) => authenticatedSWRFetcher<any>(url);

const AdminConfirmDialog = dynamic(() => import("@/components/admin/AdminConfirmDialog"), {
  loading: () => null,
});

type RentalPendingAction =
  | "approveCancel"
  | "rejectCancel"
  | "confirmPayment"
  | "out"
  | "return"
  | "refundMark"
  | "refundClear";
type AdminNextActionTone = "urgent" | "warning" | "info" | "success";
type AdminNextActionGuide = {
  tone: AdminNextActionTone;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export default function AdminRentalDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isSyncingNice, setIsSyncingNice] = useState(false);
  const [isUpdatingApplicationStatus, setIsUpdatingApplicationStatus] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/admin/rentals/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const isVisitPickup = data?.servicePickupMethod === "SHOP_VISIT";

  const [busyAction, setBusyAction] = useState<RentalPendingAction | null>(null);
  const [pendingAction, setPendingAction] = useState<RentalPendingAction | null>(null);

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
      successMessage: mark ? "보증금 환불 처리 완료" : "보증금 환불 처리 해제 완료",
      fallbackErrorMessage: "처리 실패",
    });
    if (result) await mutate();
  };

  const onOut = async () => {
    const result = await runAdminActionWithToast({
      action: () => adminMutator(`/api/admin/rentals/${id}/out`, { method: "POST" }),
      successMessage: isVisitPickup ? "방문 수령 처리 완료" : "대여 시작 처리 완료",
      fallbackErrorMessage: "처리 실패",
    });
    if (result) await mutate();
  };

  const onReturn = async () => {
    const result = await runAdminActionWithToast({
      action: () => adminMutator(`/api/admin/rentals/${id}/return`, { method: "POST" }),
      successMessage: "반납 처리 완료",
      fallbackErrorMessage: "처리 실패",
    });
    if (result) await mutate();
  };

  const onUpdateApplicationStatus = async (nextStatus: ApplicationStatus) => {
    if (!nextStatus || isUpdatingApplicationStatus) return;
    setIsUpdatingApplicationStatus(true);
    try {
      const result = await runAdminActionWithToast({
        action: async () => {
          const json = await adminMutator<{ ok?: boolean; message?: string }>(
            `/api/admin/linked-flows/rental-stringing/${id}/application-status`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: nextStatus }),
            },
          );
          ensureAdminMutationSucceeded(json, "교체 작업 상태 변경 실패");
          return json;
        },
        successMessage: `교체 작업 상태를 ${nextStatus}(으)로 변경했습니다.`,
        fallbackErrorMessage: "교체 작업 상태 변경 실패",
      });
      if (result) await mutate();
    } finally {
      setIsUpdatingApplicationStatus(false);
    }
  };

  const onSyncNicePayment = async () => {
    if (!id || isSyncingNice) return;
    setIsSyncingNice(true);
    try {
      const json = await adminMutator<{ success?: boolean; error?: string }>(
        `/api/admin/payments/nice/rental/sync/${id}`,
        { method: "POST" },
      );
      if (!json?.success) {
        throw new Error(json?.error || "PG 상태 재동기화에 실패했습니다.");
      }
      await mutate();
      showSuccessToast("NicePay 상태 재동기화를 완료했습니다.");
    } catch (error: any) {
      showErrorToast(error?.message || "PG 상태 재동기화 중 오류가 발생했습니다.");
    } finally {
      setIsSyncingNice(false);
    }
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
        ? "자가 발송(택배)"
        : "택배 발송");

  const pendingDialogConfig =
    pendingAction === "approveCancel"
      ? {
          title: "대여 취소 요청을 승인할까요?",
          description:
            "고객의 대여 취소 요청을 승인합니다. 결제 수단에 따라 PG 취소 또는 환불 처리가 함께 진행될 수 있으며, 처리 후 상태가 변경됩니다. 보증금/환불 정보와 인도 상태, 결제 상태를 먼저 확인해주세요.",
          confirmText: "취소 승인",
          eventKey: "admin-rental-detail-cancel-approve-confirm",
          eventMeta: { rentalId: id, currentStatus: data?.status },
        }
      : pendingAction === "rejectCancel"
        ? {
            title: "대여 취소 요청을 거절할까요?",
            description:
              "고객의 대여 취소 요청을 거절합니다. 대여 주문은 기존 처리 흐름을 유지하며, 필요한 경우 거절 사유를 남겨 운영 이력으로 관리해주세요.",
            confirmText: "취소 거절",
            eventKey: "admin-rental-detail-cancel-reject-confirm",
            eventMeta: { rentalId: id, currentStatus: data?.status },
          }
        : pendingAction === "confirmPayment"
          ? {
              title: "결제 완료 처리할까요?",
              description:
                "무통장 대여 주문의 결제 상태를 결제완료(paid)로 변경합니다. 입금 여부를 확인한 뒤 진행해주세요.",
              confirmText: "결제 완료 처리",
              eventKey: "admin-rental-detail-payment-confirm",
              eventMeta: { rentalId: id, currentStatus: data?.status },
            }
          : pendingAction === "out"
            ? {
                title: isVisitPickup ? "방문 수령 처리할까요?" : "수령 확인 후 대여를 시작할까요?",
                description: isVisitPickup
                  ? "방문 수령 확인 시점부터 대여 기간과 반납 예정일이 계산됩니다."
                  : "고객 수령 확인 시점부터 대여 기간과 반납 예정일이 계산됩니다.",
                confirmText: isVisitPickup ? "방문 수령 처리" : "수령 확인 / 대여 시작",
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
                    description:
                      "반납 상태와 라켓 상태를 확인한 뒤 보증금 환불 처리를 진행합니다. 처리 후 운영 이력에 남으므로 환불 계좌/결제 수단과 실제 환불 여부를 함께 확인해주세요.",
                    confirmText: "환불 처리",
                    eventKey: "admin-rental-detail-refund-mark-confirm",
                    eventMeta: { rentalId: id, currentStatus: data?.status },
                  }
                : pendingAction === "refundClear"
                  ? {
                      title: "보증금 환불 처리를 해제할까요?",
                      description:
                        "환불 완료 기록을 해제합니다. 이미 실제 환불이 진행되지 않았는지와 환불 이력 정합성을 먼저 확인해주세요.",
                      confirmText: "환불 해제",
                      eventKey: "admin-rental-detail-refund-clear-confirm",
                      eventMeta: { rentalId: id, currentStatus: data?.status },
                    }
                  : null;

  const getPendingActionSeverity = (action: RentalPendingAction | null): "default" | "danger" => {
    switch (action) {
      case "approveCancel":
      case "refundMark":
      case "refundClear":
        return "danger";
      default:
        return "default";
    }
  };

  const handleConfirmPendingAction = async () => {
    if (!pendingAction || isBusy) return;

    const actionToRun = pendingAction;
    setPendingAction(null);
    setBusyAction(actionToRun);
    try {
      if (actionToRun === "approveCancel") {
        await onApproveCancel();
        return;
      }
      if (actionToRun === "rejectCancel") {
        await onRejectCancel();
        return;
      }
      if (actionToRun === "confirmPayment") {
        await onConfirmPayment();
        return;
      }
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
      <AdminPageShell className="lg:py-8">
          <AsyncState
            kind="error"
            tone="admin"
            variant="page-center"
            resourceName="대여 상세"
            onAction={() => {
              void mutate();
            }}
          />
      </AdminPageShell>
    );
  }
  if (!data) {
    if (isLoading) {
      return (
        <AdminPageShell className="space-y-6 lg:py-8">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-9 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-xl" />
              ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
              <Skeleton className="h-[420px] rounded-xl" />
              <Skeleton className="h-[420px] rounded-xl" />
            </div>
        </AdminPageShell>
      );
    }

    if (!isLoading) {
      return (
        <AdminPageShell className="lg:py-8">
            <AsyncState
              kind="empty"
              tone="admin"
              variant="page-center"
              resourceName="대여 상세"
              title="대여 정보를 찾을 수 없습니다"
              description="대여 ID를 확인한 뒤 다시 시도해 주세요."
            />
        </AdminPageShell>
      );
    }
  }

  const Outbound = data?.shipping?.outbound;
  const ReturnShip = data?.shipping?.return;
  const canConfirmPayment =
    data.status === "pending" && (!data.cancelRequest || data.cancelRequest.status === "rejected");

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

  const linkedApplication = data?.linkedStringingApplication ?? null;
  const linkedApplicationStatus = String(
    linkedApplication?.status ?? data?.stringingApplicationStatus ?? "",
  ).trim();
  const hasLinkedApplication = hasRentalStringingService(data);
  const isStringingComplete = isRentalStringingComplete(linkedApplicationStatus);
  const hasStatusOrderMismatch =
    hasLinkedApplication &&
    ["out", "returned"].includes(String(data?.status ?? "")) &&
    !isStringingComplete;
  const hasOutboundTracking = Boolean(
    String(data?.shipping?.outbound?.trackingNumber ?? "").trim(),
  );
  const blockRentalStart =
    (hasLinkedApplication && !isStringingComplete) || (!isVisitPickup && !hasOutboundTracking);

  const paymentLabel =
    data?.paymentStatusLabel ?? (derivePaymentStatus(data) === "paid" ? "결제완료" : "결제대기");
  const paymentSource = data?.paymentStatusSource ?? "derived";
  const isNicePayment =
    String(data?.paymentProvider ?? "")
      .trim()
      .toLowerCase() === "nicepay";
  const stringingName = data?.stringing?.name ? String(data.stringing.name) : null;
  const stringPrice = Number(
    data?.amount?.stringPrice ?? (data?.stringing?.requested ? (data?.stringing?.price ?? 0) : 0),
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

  const lowerStatus = String(data.status ?? "").toLowerCase();
  const lowerPayment = String(paymentLabel ?? "").toLowerCase();
  const hasCancelRequested = cancelInfo?.status === "requested";
  const needsPaymentCheck =
    lowerPayment.includes("대기") ||
    lowerPayment.includes("입금") ||
    lowerPayment.includes("미입금") ||
    lowerPayment.includes("pending");
  const isBeforeOut = lowerStatus === "pending" || lowerStatus === "paid";
  const hasReturnTracking = Boolean(String(data?.shipping?.return?.trackingNumber ?? "").trim());
  const needsReturnCheck = lowerStatus === "out" && (Boolean(data?.dueAt) || hasReturnTracking);
  const needsDepositRefund = lowerStatus === "returned" && data?.depositRefunded !== true;
  const nextActionGuide: AdminNextActionGuide = hasCancelRequested
    ? {
        tone: "urgent",
        title: "취소 요청 검토 필요",
        description: "취소 요청 카드 기준으로 승인/거절을 우선 검토하세요.",
      }
    : hasStatusOrderMismatch
      ? {
          tone: "urgent",
          title: "상태 순서 확인 필요",
          description:
            "교체 작업이 완료되지 않았는데 대여가 인도 또는 반납 단계로 진행되었습니다. 교체 작업 상태와 처리 이력을 확인하세요.",
        }
      : needsPaymentCheck
        ? {
            tone: "warning",
            title: "결제 상태 확인 필요",
            description: "입금/결제 반영 여부를 확인한 뒤 대여 라켓 인도 여부를 판단하세요.",
          }
        : isBeforeOut && hasLinkedApplication && !isStringingComplete
          ? {
              tone: "warning",
              title: "교체 작업 완료 필요",
              description: "대여에 포함된 교체 작업이 완료된 뒤 대여 라켓 인도 또는 대여 시작을 진행하세요.",
            }
          : isBeforeOut && !isVisitPickup && hasOutboundTracking
            ? {
                tone: "warning",
                title: "인도 완료 · 수령 확인 대기",
                description: "고객 수령 확인 후 대여를 시작하세요.",
              }
            : isBeforeOut
              ? {
                  tone: "warning",
                  title: isVisitPickup ? "방문 수령 처리 필요" : "인도 운송장 등록 필요",
                  description: isVisitPickup
                    ? "고객 방문 수령을 확인한 뒤 대여를 시작하세요."
                    : "교체 작업 완료 상태를 확인한 뒤 인도 운송장을 등록하세요.",
                  actionLabel: isVisitPickup ? undefined : "인도 운송장 등록/수정",
                  actionHref: isVisitPickup ? undefined : `/admin/rentals/${id}/shipping-update`,
                }
              : needsReturnCheck
                ? {
                    tone: "info",
                    title: "반납 확인 필요",
                    description: "반납 운송장과 라켓 상태를 확인한 뒤 반납 처리를 진행하세요.",
                  }
                : needsDepositRefund
                  ? {
                      tone: "warning",
                      title: "보증금 환불 확인",
                      description:
                        "반납 상태·라켓 상태·환불 계좌를 확인한 뒤 보증금 환불 처리 여부를 판단하세요.",
                    }
                  : hasLinkedApplication
                    ? {
                        tone: "info",
                        title: "대여에 포함된 교체 작업 확인",
                        description:
                          "대여 결제에 포함된 교체 작업 상태를 확인한 뒤 후속 처리를 진행하세요.",
                      }
                    : {
                        tone: "success",
                        title: "추가 조치 필요 없음",
                        description: "현재 기준으로 즉시 필요한 추가 조치는 없습니다.",
                      };
  const recommendedActions = [
    { label: "결제 정보 확인", href: "#admin-rental-payment", show: true },
    {
      label: "인도/반납 정보 확인",
      href: "#admin-rental-shipping",
      show: true,
    },
    { label: "반납 처리 확인", href: "#admin-rental-return", show: true },
    { label: "보증금 환불 확인", href: "#admin-rental-deposit", show: true },
    {
      label: "교체 작업 정보 확인",
      href: "#admin-rental-linked-docs",
      show: hasLinkedApplication,
    },
    {
      label: "취소 요청 확인",
      href: "#admin-rental-cancel",
      show: hasCancelRequested,
    },
    { label: "처리 이력 보기", href: "#admin-rental-history", show: true },
  ].filter((action) => action.show);

  const latestProcessingHistory = data?.latestHistory ?? null;

  const latestProcessingAction = latestProcessingHistory?.action
    ? (rentalHistoryActionLabels[String(latestProcessingHistory.action)] ??
      String(latestProcessingHistory.action))
    : null;
  const latestProcessingActor = latestProcessingHistory?.actor?.role
    ? getRentalHistoryActorLabel(latestProcessingHistory.actor)
    : null;
  const latestProcessingDate = latestProcessingHistory?.at ? fmt(latestProcessingHistory.at) : null;
  const hasLatestProcessingSummary = Boolean(
    latestProcessingAction ||
      latestProcessingActor ||
      latestProcessingDate ||
      latestProcessingHistory?.from ||
      latestProcessingHistory?.to,
  );
  const effectiveStockDeduction = data?.stockDeduction ?? data?.stringing?.stockDeduction ?? null;
  const effectiveStockRestore = data?.stockRestore ?? data?.stringing?.stockRestore ?? null;
  const isVariantStockMode = effectiveStockDeduction?.mode === "variant";
  const isCanceledState = data?.status === "canceled" || data?.status === "cancelled";
  const currentApplicationStatusIndex = APPLICATION_STATUSES.indexOf(
    linkedApplicationStatus as ApplicationStatus,
  );
  const nextApplicationStatus =
    currentApplicationStatusIndex >= 0
      ? (APPLICATION_STATUSES[currentApplicationStatusIndex + 1] ?? null)
      : null;
  const applicationStatusBadge = getApplicationStatusBadgeSpec(linkedApplicationStatus);
  const canUpdateLinkedApplication = data?.status === "paid";
  const linkedApplicationLines = Array.isArray(linkedApplication?.lines)
    ? linkedApplication.lines
    : [];
  const linkedApplicationNotes = Array.from(
    new Set(
      linkedApplicationLines.map((line: any) => String(line?.note ?? "").trim()).filter(Boolean),
    ),
  );
  const linkedApplicationStrings = Array.from(
    new Set(
      linkedApplicationLines
        .map((line: any) => String(line?.stringName ?? "").trim())
        .filter(Boolean),
    ),
  );
  const linkedApplicationPaymentIncluded =
    String(linkedApplication?.paymentSource ?? "") === `rental:${id}`;

  return (
    <AdminPageShell className="lg:py-8">
        {isLoading ? (
          <div className="mx-auto mb-4 w-full max-w-[1500px] rounded-lg border border-border bg-muted/20 px-4 py-2 text-sm text-foreground/80">
            최신 상태를 확인하고 있습니다...
          </div>
        ) : null}
        <div className="mx-auto w-full max-w-[1500px] space-y-6 lg:space-y-8">
          <div className={cn("mb-6 p-5 lg:mb-8 lg:p-6", adminSurface.cardMuted)}>
            <div className="mb-5 flex flex-col gap-3 lg:mb-6 lg:gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-card rounded-full p-3 shadow-md">
                  <Settings className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className={adminTypography.pageTitle}>
                    대여 상세 관리
                  </h1>
                  <div className={cn("mt-1 flex flex-wrap items-center gap-2 text-foreground/75", adminTypography.body)}>
                    <span>대여 ID: {shortenId(String(data.id))}</span>
                    <span>고객: {data.user?.name || data.user?.email || "-"}</span>
                    <span>결제: {paymentLabel} · {won(data.amount?.total)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      aria-label="전체 대여 ID 복사"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(String(data.id));
                          showSuccessToast("대여 ID가 복사되었습니다");
                        } catch {
                          showErrorToast("대여 ID 복사에 실패했습니다");
                        }
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      전체 ID 복사
                    </Button>
                  </div>
                </div>
              </div>
              <div className="sm:ml-auto flex flex-wrap items-center justify-end gap-2.5">
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

                {data?.status !== "canceled" &&
                  !isVisitPickup &&
                  (blockRentalStart ? (
                    <Button variant="outline" size="sm" disabled className="h-8 whitespace-nowrap">
                      <Truck className="mr-2 h-4 w-4" />
                      {hasLinkedApplication && !isStringingComplete
                        ? "교체 작업 완료 후 인도 가능"
                        : "인도 운송장 등록 필요"}
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 border-border text-foreground hover:bg-muted whitespace-nowrap"
                    >
                      <Link href={`/admin/rentals/${id}/shipping-update`}>
                        <Truck className="h-4 w-4 mr-2" />
                        {data?.shipping?.outbound?.trackingNumber
                          ? "인도 운송장 수정"
                          : "인도 운송장 등록"}
                      </Link>
                    </Button>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:gap-4">
              <AdminStatusCard
                density="compact"
                title="대여 상태"
                icon={Package}
                tone={
                  hasStatusOrderMismatch
                    ? "warning"
                    : data.status === "returned"
                      ? "success"
                      : "neutral"
                }
                value={(() => {
                  const rentalLabel =
                    data.status === "paid" && hasOutboundTracking
                      ? "결제완료 · 수령 확인 대기"
                      : rentalStatusLabels[data.status] || data.status;
                  const rentalSpec = getRentalStatusBadgeSpec(data.status);
                  return (
                    <Badge variant={rentalSpec.variant} className={cn(badgeBase, badgeSizeSm)}>
                      {rentalLabel}
                    </Badge>
                  );
                })()}
                description={
                  data.outAt ? `대여 시작 ${fmtDateOnly(data.outAt)}` : "결제 확인 후 인도 단계 진행"
                }
              />

              <AdminStatusCard
                density="compact"
                title="결제 상태"
                icon={CreditCard}
                tone={needsPaymentCheck ? "warning" : "neutral"}
                value={(() => {
                  const pay = getPaymentStatusBadgeSpec(paymentLabel);
                  return (
                    <Badge variant={pay.variant} className={cn(badgeBase, badgeSizeSm)}>
                      {paymentLabel}
                    </Badge>
                  );
                })()}
                description={`총 결제금액 ${won(data.amount?.total)}`}
              />

              <AdminStatusCard
                density="compact"
                title="교체 작업 상태"
                icon={Wrench}
                tone={
                  hasStatusOrderMismatch
                    ? "warning"
                    : isStringingComplete
                      ? "success"
                      : hasLinkedApplication
                        ? "primary"
                        : "neutral"
                }
                value={
                  <Badge
                    variant={applicationStatusBadge.variant}
                    className={cn(badgeBase, badgeSizeSm)}
                  >
                    {linkedApplicationStatus ||
                      (hasStringingSummary ? "교체 작업 검토 중" : "교체 작업 없음")}
                  </Badge>
                }
                description={
                  hasLinkedApplication ? "대여 결제에 포함된 하위 작업" : "연결된 교체 작업 없음"
                }
              />

              <AdminStatusCard
                density="compact"
                title="인도 / 반납"
                icon={Truck}
                tone={
                  data.status === "returned"
                    ? "success"
                    : data.status === "out"
                      ? "warning"
                      : hasOutboundTracking
                        ? "primary"
                        : "neutral"
                }
                value={
                  data.status === "returned"
                    ? "반납 완료"
                    : data.status === "out"
                      ? "반납 필요"
                      : Outbound?.trackingNumber
                        ? "인도 완료"
                        : "인도 전"
                }
                description={pickupMethodLabel}
              />
            </div>
          </div>

          <AdminDetailSectionNav
            items={[
              { href: "#admin-rental-return", label: "처리 작업" },
              { href: "#admin-rental-customer", label: "고객정보" },
              { href: "#admin-rental-payment", label: "결제정보" },
              { href: "#admin-rental-shipping", label: "배송/반납" },
              { href: "#admin-rental-deposit", label: "보증금/일정" },
              { href: "#admin-rental-history", label: "이력" },
            ]}
          />

          <AdminNextActionPanel
            tone={nextActionGuide.tone}
            badgeLabel={
              nextActionGuide.tone === "urgent"
                ? "긴급"
                : nextActionGuide.tone === "warning"
                  ? "확인 필요"
                  : nextActionGuide.tone === "success"
                    ? "정상"
                    : "안내"
            }
            stage={pickupMethodLabel}
            nextActionTitle={nextActionGuide.title}
            nextActionDescription={nextActionGuide.description}
            primaryAction={
              <>
                {canConfirmPayment ? (
                  <Button size="sm" disabled={isBusy || confirming} onClick={() => { if (isBusy || confirming) return; setPendingAction("confirmPayment"); }}>
                    {confirming ? "결제 처리중…" : "결제 확인"}
                  </Button>
                ) : null}
                {data.status === "paid" ? (
                  <Button size="sm" disabled={isBusy || blockRentalStart} onClick={() => { if (isBusy || blockRentalStart) return; setPendingAction("out"); }}>
                    {busyAction === "out" ? (isVisitPickup ? "방문 수령 처리중…" : "수령 확인 처리중…") : (isVisitPickup ? "방문 수령 처리" : "수령 확인 / 대여 시작")}
                  </Button>
                ) : null}
                {data.status === "out" ? (
                  <Button size="sm" disabled={isBusy} onClick={() => { if (isBusy) return; setPendingAction("return"); }}>
                    {busyAction === "return" ? "반납 처리중…" : "반납 처리"}
                  </Button>
                ) : null}
              </>
            }
            secondaryActions={
              <>
                {data.status === "returned" && !data.depositRefundedAt ? (
                  <Button size="sm" variant="outline" disabled={isBusy} onClick={() => { if (isBusy) return; setPendingAction("refundMark"); }}>
                    {busyAction === "refundMark" ? "환불 처리 중…" : "보증금 환불 확인"}
                  </Button>
                ) : null}
                {nextActionGuide.actionHref && nextActionGuide.actionLabel ? (
                  <Button asChild size="sm" variant="outline" className="bg-transparent">
                    <Link href={nextActionGuide.actionHref}>{nextActionGuide.actionLabel}</Link>
                  </Button>
                ) : null}
                {recommendedActions.slice(0, 2).map((action) => (
                  <Button key={action.href} asChild size="sm" variant="ghost" className="justify-start">
                    <a href={action.href}>{action.label}</a>
                  </Button>
                ))}
              </>
            }
            note={
              isVariantStockMode
                ? `조합 재고 기준: 색상 ${stringColorLabel(effectiveStockDeduction?.colorValue) || "-"} / 게이지 ${formatGaugeLabel(effectiveStockDeduction?.gaugeValue) || "-"}`
                : "기존 색상/게이지 재고 기준으로 처리된 대여입니다."
            }
            footer={
              hasLatestProcessingSummary ? (
                <div className="grid gap-1.5 leading-relaxed sm:grid-cols-2">
                  {latestProcessingAction ? <p><span className="font-medium text-foreground">마지막 처리:</span> {latestProcessingAction}</p> : null}
                  {latestProcessingDate ? <p><span className="font-medium text-foreground">처리 시각:</span> {latestProcessingDate}</p> : null}
                  {latestProcessingActor ? <p><span className="font-medium text-foreground">처리자:</span> {latestProcessingActor}</p> : null}
                  {latestProcessingHistory?.from || latestProcessingHistory?.to ? (
                    <p className="sm:col-span-2"><span className="font-medium text-foreground">상태 변화:</span> {latestProcessingHistory?.from ?? "-"} → {latestProcessingHistory?.to ?? "-"}</p>
                  ) : null}
                </div>
              ) : "최근 처리 이력 없음"
            }
          />

          {/* 취소 요청 상태 안내 (관리자용) */}
          {cancelInfo && (
            <div id="admin-rental-cancel">
              <AdminCancelRequestCard
                className={cn("mt-0", hasCancelRequested && "border-warning/50 bg-warning/5")}
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
                      onClick={() => {
                        if (isBusy) return;
                        setPendingAction("approveCancel");
                      }}
                    >
                      {busyAction === "approveCancel" ? "승인 처리중…" : "요청 승인"}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-primary hover:bg-muted"
                      disabled={isBusy}
                      onClick={() => {
                        if (isBusy) return;
                        setPendingAction("rejectCancel");
                      }}
                    >
                      {busyAction === "rejectCancel" ? "거절 처리중…" : "요청 거절"}
                    </Button>
                  </div>
                )}
              </AdminCancelRequestCard>
            </div>
          )}

          {hasStringingSummary && !linkedApplication && (
            <Card className="border border-border/60 shadow-none bg-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">스트링/교체서비스 요약</CardTitle>
                <CardDescription>
                  스트링 선택 정보와 교체서비스 신청 진행 상태를 한 번에 확인합니다.
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
                    교체서비스 상태:{" "}
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
                    {Array.isArray(data?.stringingNames) && data.stringingNames.length > 0 && (
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
                        교체 작업 상세 보기
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {linkedApplication && (
            <Card
              id="admin-rental-linked-docs"
              className={cn(adminSurface.card, "overflow-hidden")}
            >
              <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">대여에 포함된 교체 작업</CardTitle>
                    <CardDescription className="mt-1 max-w-3xl leading-relaxed">
                      대여에 포함된 교체 작업 상태만 확인합니다.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={cn(badgeBase, badgeSizeSm)}>
                      대여 결제에 포함됨
                    </Badge>
                    <Badge
                      variant={applicationStatusBadge.variant}
                      className={cn(badgeBase, badgeSizeSm)}
                    >
                      {linkedApplicationStatus || "상태 확인 필요"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="grid gap-x-5 gap-y-2 text-ui-body-sm sm:grid-cols-2 xl:grid-cols-3">
                  <p className="text-muted-foreground">
                    교체 작업 ID:{" "}
                    <span className="font-medium text-foreground">
                      {shortenId(String(linkedApplication.id))}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    장착 스트링:{" "}
                    <span className="font-medium text-foreground">
                      {linkedApplicationStrings.join(", ") ||
                        (Array.isArray(data?.stringingNames)
                          ? data.stringingNames.join(", ")
                          : "") ||
                        stringingName ||
                        (stringPrice > 0 || stringingFee > 0 ? "관리자 확인 필요" : "정보 없음")}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    게이지/색상:{" "}
                    <span className="font-medium text-foreground">
                      {[linkedApplication.selectedGauge, linkedApplication.selectedColor]
                        .filter(Boolean)
                        .join(" / ") || "정보 없음"}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    텐션:{" "}
                    <span className="font-medium text-foreground">
                      {data?.stringingTensionSummary ?? "정보 없음"}
                    </span>
                  </p>
                  <p className="text-muted-foreground sm:col-span-2">
                    요청사항:{" "}
                    <span className="font-medium text-foreground">
                      {[linkedApplication.requirements, ...linkedApplicationNotes]
                        .filter(Boolean)
                        .join(" / ") || "요청사항 없음"}
                    </span>
                  </p>
                  <p className="text-muted-foreground sm:col-span-2 xl:col-span-3">
                    결제 문맥:{" "}
                    <span className="font-medium text-foreground">
                      {linkedApplicationPaymentIncluded
                        ? "대여 결제에 포함됨"
                        : linkedApplication.paymentSource || "연결 정보 확인 필요"}
                    </span>
                  </p>
                </div>

                <details className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-ui-label text-muted-foreground">
                  <summary className="cursor-pointer font-semibold text-foreground">상태 안내 보기</summary>
                  <div className="mt-2 space-y-1">
                    <p>대여 결제 상태: 대여 주문의 결제 확인 여부</p>
                    <p>교체 작업 상태: 스트링 장착 작업 진행 여부</p>
                    <p>인도/반납: 작업 완료 이후 진행하는 대여 운영 단계</p>
                  </div>
                </details>

                {data.status === "pending" ? (
                  <p className="rounded-md border border-warning/25 bg-warning/[0.04] px-3 py-2 text-sm text-foreground">
                    결제 확인 후 대여에 포함된 교체 작업 상태를 변경하세요.
                  </p>
                ) : data.status === "paid" && linkedApplicationStatus === "검토 중" ? (
                  <p className="rounded-md border border-info/25 bg-info/[0.04] px-3 py-2 text-sm text-foreground">
                    결제가 확인되었습니다. 대여에 포함된 교체 작업 접수가 필요합니다.
                  </p>
                ) : data.status === "paid" && linkedApplicationStatus === "작업 중" ? (
                  <p className="rounded-md border border-warning/25 bg-warning/[0.04] px-3 py-2 text-sm text-foreground">
                    현재 교체 작업 중입니다. 교체완료 후 대여 라켓 인도 또는 대여 시작을 진행하세요.
                  </p>
                ) : data.status === "paid" && linkedApplicationStatus === "교체완료" ? (
                  <p className="rounded-md border border-info/25 bg-info/[0.04] px-3 py-2 text-sm text-foreground">
                    장착 작업이 완료되었습니다. 인도 정보 등록 또는 대여 시작 단계를 진행할 수
                    있습니다.
                  </p>
                ) : ["out", "returned"].includes(data.status) &&
                  linkedApplicationStatus !== "교체완료" ? (
                  <p className="rounded-md border border-warning/25 bg-warning/[0.04] px-3 py-2 text-sm text-foreground">
                    상태 순서 확인 필요: 교체 작업이 완료되지 않았는데 대여가 인도 또는 반납 단계로
                    진행되었습니다. 교체 작업 상태와 처리 이력을 확인하세요.
                  </p>
                ) : null}

                <div className={cn(adminSurface.fieldPanel, "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between")}>
                  <div className="space-y-2">
                    <p className={adminTypography.panelTitle}>교체 작업 진행 단계</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="w-fit">
                        현재: {linkedApplicationStatus || "상태 확인 필요"}
                      </Badge>
                      <Badge variant="outline" className="w-fit">
                        다음: {nextApplicationStatus ?? "다음 단계 없음"}
                      </Badge>
                    </div>
                    <p className={adminTypography.meta}>
                      대여 결제에 포함된 하위 교체 작업만 다음 운영 단계로 변경합니다.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/admin/applications/stringing/${encodeURIComponent(String(linkedApplication.id))}`}
                      >
                        교체 작업 상세 보기
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      disabled={
                        !canUpdateLinkedApplication ||
                        isUpdatingApplicationStatus ||
                        !nextApplicationStatus
                      }
                      onClick={() =>
                        nextApplicationStatus && onUpdateApplicationStatus(nextApplicationStatus)
                      }
                    >
                      {isUpdatingApplicationStatus
                        ? "처리 중…"
                        : nextApplicationStatus
                          ? `${nextApplicationStatus} 처리`
                          : "다음 단계 없음"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
                  <p>
                    이 작업은 대여에 포함된 교체 작업 상태만 변경합니다. 대여 결제, 인도
                    운송장 등록, 대여 시작, 반납 처리는 기존 대여 액션에서 별도로 진행하세요.
                  </p>
                  <p>접수완료: 결제 확인 후 작업 접수 상태로 표시합니다.</p>
                  <p>작업 중: 실제 스트링 장착 작업이 시작된 상태입니다.</p>
                  <p>교체완료: 장착 작업이 완료되어 인도 또는 수령 준비가 가능한 상태입니다.</p>
                  {!canUpdateLinkedApplication && (
                    <p className="font-medium text-foreground">
                      {data.status === "returned"
                        ? "반납 완료된 대여에서는 교체 작업 상태를 변경할 수 없습니다."
                        : data.status === "out"
                          ? "대여 시작 후에는 교체 작업 상태를 읽기 전용으로 확인합니다."
                          : "결제완료 상태에서 교체 작업 상태를 변경할 수 있습니다."}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card id="admin-rental-return" className={cn(adminSurface.card, "overflow-hidden")}>
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
              <CardTitle>대여 상태 관리</CardTitle>
              <CardDescription>
                처리 전 결제 상태, 라켓 반납 상태, 보증금 환불 정보를 확인하세요. 모든 상태 변경은
                처리 이력에 남습니다.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-4">
              <div className="flex gap-2 flex-wrap">
                {/* 입금 확인 처리 – pending 상태에서만 노출 */}
                {canConfirmPayment && (
                  <Button
                    size="sm"
                    className="h-9 bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isBusy || confirming}
                    onClick={() => {
                      if (isBusy || confirming) return;
                      setPendingAction("confirmPayment");
                    }}
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        결제 처리중…
                      </>
                    ) : (
                      "입금 확인 처리"
                    )}
                  </Button>
                )}

                {/* 대여 시작 */}
                <Button
                  size="sm"
                  className="h-9 bg-muted hover:bg-muted"
                  disabled={isBusy || data.status !== "paid" || blockRentalStart}
                  onClick={() => {
                    if (isBusy) return;
                    setPendingAction("out");
                  }}
                >
                  {busyAction === "out"
                    ? isVisitPickup
                      ? "방문 수령 처리중…"
                      : "수령 확인 처리중…"
                    : isVisitPickup
                      ? "방문 수령 처리"
                      : "수령 확인 / 대여 시작"}
                </Button>

                {/* 반납 처리 */}
                <Button
                  size="sm"
                  className="h-9 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isBusy || data.status !== "out"}
                  onClick={() => {
                    if (isBusy) return;
                    setPendingAction("return");
                  }}
                >
                  {busyAction === "return" ? "반납 처리중…" : "반납 처리"}
                </Button>

                {data.status === "paid" && (
                  <p className="w-full text-xs text-muted-foreground">
                    {hasLinkedApplication && !isStringingComplete
                      ? "이 대여에는 교체 작업이 포함되어 있습니다. 교체 작업 상태가 `교체완료`가 된 뒤 대여 라켓 인도 또는 대여 시작을 진행하세요."
                      : !isVisitPickup && !hasOutboundTracking
                        ? "택배 인도 건은 인도 운송장을 등록한 뒤 수령 확인 / 대여 시작을 진행하세요."
                        : "고객 수령 확인 후 대여를 시작할 수 있습니다."}
                  </p>
                )}

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
                      {busyAction === "refundClear" ? "환불 해제 중…" : "환불 해제"}
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
                      {busyAction === "refundMark" ? "환불 처리 중…" : "환불 처리"}
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
              severity={getPendingActionSeverity(pendingAction)}
              title={pendingDialogConfig.title}
              description={pendingDialogConfig.description}
              confirmText={pendingDialogConfig.confirmText}
              cancelText="취소"
              confirmDisabled={isBusy || confirming}
              eventKey={pendingDialogConfig.eventKey}
              eventMeta={pendingDialogConfig.eventMeta}
            />
          )}
          <Card id="admin-rental-customer" className={cn(adminSurface.card, "overflow-hidden")}>
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
              <CardTitle className={adminTypography.sectionTitle}>고객 정보</CardTitle>
              <CardDescription>연락과 본인 확인에 필요한 정보를 먼저 확인합니다.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <AdminInfoGrid>
                <AdminInfoItem label="이름" value={data.user?.name || "-"} />
                <AdminInfoItem label="이메일" value={data.user?.email || "-"} />
                <AdminInfoItem label="연락처" value={data.user?.phone || "-"} />
              </AdminInfoGrid>
            </CardContent>
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border border-border/60 shadow-none bg-card overflow-hidden">
              <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-destructive" />
                  <span>라켓 정보</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <AdminInfoGrid columns="two">
                  {/*
          금액 표시 정합성
          - 서버(/api/admin/rentals)가 amount.stringPrice / amount.stringingFee를 저장하므로
           관리자 상세에서도 해당 금액 근거를 그대로 노출시킴.
          - 대여만 한 케이스(스트링 미선택)는 UI가 지저분해지지 않도록 조건부 렌더링.
         */}
                  <AdminInfoItem label="브랜드" value={racketBrandLabel(data.brand)} />
                  <AdminInfoItem label="모델" value={data.model} />
                  <AdminInfoItem label="대여 기간" value={`${data.days}일`} />
                </AdminInfoGrid>
              </CardContent>
            </Card>

            <Card
              id="admin-rental-payment"
              className="border border-border/60 shadow-none bg-card overflow-hidden"
            >
              <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span>결제 정보</span>
                </CardTitle>
                <div className="ml-auto flex flex-col items-end gap-1">
                  {(() => {
                    const pay = getPaymentStatusBadgeSpec(paymentLabel);
                    return (
                      <Badge variant={pay.variant} className={cn(badgeBase, badgeSizeSm)}>
                        {paymentLabel}
                      </Badge>
                    );
                  })()}
                  {paymentSource === "derived" && (
                    <span className="text-xs text-foreground/75">대여 상태 기준 파생</span>
                  )}
                  {isNicePayment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onSyncNicePayment}
                      disabled={isSyncingNice}
                    >
                      {isSyncingNice ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          PG 상태 동기화 중...
                        </>
                      ) : (
                        "PG 상태 다시 확인"
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 rounded-md border border-border/60 bg-background/80 px-3 py-2">
                    <div>
                      <p className="text-sm text-foreground/80">대여 수수료</p>
                      <p className="font-medium text-foreground">{won(data.amount?.fee)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 rounded-md border border-border/60 bg-background/80 px-3 py-2">
                    <div>
                      <p className="text-sm text-foreground/80">보증금</p>
                      <p className="font-medium text-foreground">{won(data.amount?.deposit)}</p>
                    </div>
                  </div>
                  {/* 스트링 상품 금액: 있을 때만 표시 */}
                  {(data.amount?.stringPrice ?? 0) > 0 && (
                    <div className="flex items-center space-x-3 rounded-md border border-border/60 bg-background/80 px-3 py-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-foreground/80">스트링 상품</p>
                        <p className="font-medium text-foreground">
                          {won(data.amount?.stringPrice ?? 0)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 교체 서비스비(장착비): 있을 때만 표시 */}
                  {(data.amount?.stringingFee ?? 0) > 0 && (
                    <div className="flex items-center space-x-3 rounded-md border border-border/60 bg-background/80 px-3 py-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-foreground/80">교체 서비스비</p>
                        <p className="font-medium text-foreground">
                          {won(data.amount?.stringingFee ?? 0)}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg border border-border/50">
                    <div>
                      <p className="text-sm text-foreground/80">총 결제 금액</p>
                      <p className="text-xl font-semibold text-primary dark:text-foreground">
                        {won(data.amount?.total)}
                      </p>
                    </div>
                  </div>
                  {(hasCancelRefundAccount || hasLegacyRefundAccount) && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">보증금 환급 정보</p>
                      {hasCancelRefundAccount && (
                        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                취소 요청 시 제출한 환불 계좌
                              </p>
                              <p className="mt-1 text-xs text-foreground/75">
                                취소 요청 시 고객이 제출한 환불 계좌입니다. 환불 처리 전 이 계좌를
                                우선 검토하세요.
                              </p>
                            </div>
                            <Badge variant="outline" className="border-primary/40 text-primary">
                              우선 검토
                            </Badge>
                          </div>
                          <dl className="mt-3 space-y-1 text-sm text-foreground">
                            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                              <dt className="text-muted-foreground">환급 은행</dt>
                              <dd>{cancelRefundAccount?.bankLabel || "미입력"}</dd>
                            </div>
                            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                              <dt className="text-muted-foreground">계좌번호</dt>
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
                                  await navigator.clipboard.writeText(cancelRefundAccount.account);
                                  showSuccessToast("취소 요청 환불 계좌번호를 복사했습니다");
                                } catch {
                                  showErrorToast("계좌번호 복사에 실패했습니다");
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
                              ? "border-border/60 bg-muted/20"
                              : "border-border bg-muted/20 dark:bg-card",
                          )}
                        >
                          <p className="text-sm font-medium text-foreground">보증금 환불 계좌</p>
                          <p className="mt-1 text-xs text-foreground/75">
                            기존에 등록된 보증금 환불 계좌입니다. 취소 요청 계좌가 없을 때
                            참고용으로 확인하세요.
                          </p>
                          <dl className="mt-3 space-y-1 text-sm text-foreground">
                            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                              <dt className="text-muted-foreground">환급 은행</dt>
                              <dd>{getRefundBankLabel(data.refundAccount.bank) || "미입력"}</dd>
                            </div>
                            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                              <dt className="text-muted-foreground">예금주</dt>
                              <dd>{data.refundAccount.holderMasked || "미입력"}</dd>
                            </div>
                            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                              <dt className="text-muted-foreground">계좌번호</dt>
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
                                showSuccessToast("보증금 환불 계좌 정보를 복사했습니다");
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

          <Card
            id="admin-rental-shipping"
            className="border border-border/60 shadow-none bg-card overflow-hidden"
          >
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                {isVisitPickup ? "방문 수령 정보" : "배송 정보"}
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
                        인도 운송장
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
            <CardContent className="p-5">
              {!isVisitPickup &&
              deriveShippingStatus(data) === "none" &&
              !data?.shipping?.outbound?.trackingNumber &&
              !data?.shipping?.return?.trackingNumber ? (
                <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  배송 정보 미등록 · 운송장이 생기면 배송 업데이트에서 등록하세요.
                </p>
              ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {/* 인도 */}
                <div className="rounded-lg border border-border/60 bg-background/80 p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    인도
                  </p>
                  {isVisitPickup ? (
                    <div className="space-y-1 text-sm">
                      <div>
                        수령 방법: <b>{pickupMethodLabel}</b>
                      </div>
                      <div>
                        방문 수령 처리일: <b>{data.outAt ? fmtDateOnly(data.outAt) : "-"}</b>
                      </div>
                    </div>
                  ) : data?.shipping?.outbound?.trackingNumber ? (
                    <div className="space-y-1 text-sm">
                      <div>
                        택배사:{" "}
                        <b>
                          {data.shipping.outbound.courier
                            ? getCourierDisplayName(data.shipping.outbound.courier)
                            : "-"}
                        </b>
                      </div>
                      <div>
                        운송장번호:
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
                        인도일: <b>{fmtDateOnly(data.shipping.outbound.shippedAt)}</b>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">미등록</div>
                  )}
                </div>
                {/* 반납 */}
                <div className="rounded-lg border border-border/60 bg-background/80 p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">반납</p>
                  {data?.shipping?.return?.trackingNumber ? (
                    <div className="space-y-1 text-sm">
                      <div>
                        택배사:{" "}
                        <b>
                          {data.shipping.return.courier
                            ? getCourierDisplayName(data.shipping.return.courier)
                            : "-"}
                        </b>
                      </div>
                      <div>
                        운송장번호:
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
                        발송일: <b>{fmtDateOnly(data.shipping.return.shippedAt)}</b>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">미등록</div>
                  )}
                </div>
              </div>
              )}
            </CardContent>
          </Card>

          <Card
            id="admin-rental-deposit"
            className="border border-border/60 shadow-none bg-card overflow-hidden"
          >
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>대여 타임라인</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-start space-x-3 rounded-md border border-border/60 bg-background/80 px-3 py-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-foreground/80">
                      {isVisitPickup ? "방문 수령 처리" : "수령 확인 / 대여 시작"}
                    </p>
                    <p className="font-medium text-foreground">
                      {data.outAt ? formatDate(data.outAt) : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 rounded-md border border-border/60 bg-background/80 px-3 py-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-foreground/80">반납 예정</p>
                    <p className="font-medium text-foreground">
                      {data.dueAt ? formatDate(data.dueAt) : "수령 확인 후 계산"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 rounded-md border border-border/60 bg-background/80 px-3 py-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-foreground/80">반납 완료</p>
                    <p className="font-medium text-foreground">
                      {data.returnedAt ? formatDate(data.returnedAt) : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 rounded-md border border-border/60 bg-background/80 px-3 py-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-foreground/80">보증금 환불</p>
                    <p className="font-medium text-foreground">
                      {data.depositRefundedAt ? formatDate(data.depositRefundedAt) : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {data?.id ? <AdminInternalNotesCard targetType="rental" targetId={data.id} /> : null}
          <div id="admin-rental-history">
            <AdminRentalHistory id={id} servicePickupMethod={servicePickupMethod} />
          </div>
    </AdminPageShell>
  );
}
