"use client";

import { getDepositBanner } from "@/app/features/rentals/utils/ui";
import MypageDetailCard from "@/app/mypage/_components/MypageDetailCard";
import MypageInfoField from "@/app/mypage/_components/MypageInfoField";
import { NextTodoCallout } from "@/app/mypage/_components/OrdersScopeContextNav";
import { getCustomerApplicationStatusLabel, getCustomerRentalStatusLabel } from "@/app/mypage/_lib/flow-display";
import AsyncState from "@/components/system/AsyncState";
import ServiceReviewCTA from "@/components/reviews/ServiceReviewCTA";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { racketBrandLabel } from "@/lib/constants";
import { getCourierDisplayName } from "@/lib/shipping/courier-map";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Package,
  TrendingUp,
  Truck,
  Wrench,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const CancelRentalDialog = dynamic(
  () => import("@/app/mypage/rentals/_components/CancelRentalDialog"),
  {
    loading: () => null,
  },
);

type Rental = {
  id: string;
  brand: string;
  model: string;
  days: number;
  status: "pending" | "paid" | "out" | "returned" | "canceled";
  amount?: {
    fee?: number;
    deposit?: number;
    /**
     * 스트링 상품 금액 (스트링 선택 + 교체 신청한 경우에만 존재)
     * - 과거 데이터 호환을 위해 optional
     */
    stringPrice?: number;
    /**
     * 교체 서비스비(장착비) (스트링 선택 + 교체 신청한 경우에만 존재)
     */
    stringingFee?: number;
    total?: number;
  };
  createdAt?: string;
  dueAt?: string | null;
  outAt?: string | null;
  returnedAt?: string | null;
  depositRefundedAt?: string | null;

  // 대여 기반 교체 서비스 신청서 연결
  stringingApplicationId?: string | null;
  isStringServiceApplied?: boolean;
  applicationSummary?: {
    status: string;
    lineCount: number;
    stringNames: string[];
    tensionSummary: string | null;
    receptionLabel: string;
    reservationLabel: string | null;
  } | null;
  stringingApplication?: {
    id: string;
    rentalId?: string | null;
    status: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    userConfirmedAt?: string | null;
    desiredDateTime?: string | null;
    collectionMethod?: string | null;
    receptionLabel?: string | null;
    preferredDate?: string | null;
    preferredTime?: string | null;
    reservationLabel?: string | null;
    requirements?: string | null;
    lineCount?: number;
    stringNames?: string[];
    tensionSummary?: string | null;
    totalPrice?: number | null;
    needsInboundTracking?: boolean;
    lines?: Array<{
      id?: string | null;
      racketType?: string | null;
      racketLabel?: string | null;
      stringName?: string | null;
      tensionMain?: string | null;
      tensionCross?: string | null;
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
  } | null;

  /**
   * 교체 서비스 포함 여부 (레거시/예외 케이스 보강)
   * - 목록 API(/api/me/rentals)에서 내려주는 withStringService와 동일한 목적
   */
  withStringService?: boolean;

  shipping?: {
    shippingMethod?: string;
    outbound?: {
      courier?: string;
      carrier?: string;
      trackingNumber?: string;
      trackingNo?: string;
      tracking_no?: string;
      shippedAt?: string | Date | null;
      shipped_at?: string | Date | null;
    } | null;
    return?: {
      courier?: string;
      carrier?: string;
      trackingNumber?: string;
      trackingNo?: string;
      tracking_no?: string;
      shippedAt?: string | Date | null;
      shipped_at?: string | Date | null;
      note?: string;
    } | null;
  } | null;

  // 취소 요청 정보 (상세 화면에서 상태 판단용)
  cancelRequest?: {
    status: "requested" | "approved" | "rejected";
    reasonCode?: string;
    reasonText?: string;
    requestedAt?: string;
    processedAt?: string;
  } | null;
};

const normalizeRentalShippingMethod = (value?: string | null) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "pickup" || normalized === "visit") return "pickup";
  if (normalized === "delivery" || normalized === "courier") return "delivery";
  return "";
};

// 안전 라벨/URL 헬퍼
const getCourierLabel = (code?: string) => (code ? getCourierDisplayName(code) : "-");

const getTrackHref = (code?: string, no?: string) => {
  if (!code || !no) return "#";
  const key = code as keyof typeof courierTrackUrl;
  const fn = courierTrackUrl[key];
  return typeof fn === "function" ? fn(no) : "#";
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "returned":
      return <CheckCircle className="h-5 w-5 text-success" />;
    case "out":
      return <Clock className="h-5 w-5 text-primary" />;
    case "paid":
      return <Package className="h-5 w-5 text-success" />;
    case "canceled":
      return <XCircle className="h-5 w-5 text-destructive" />;
    default:
      return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "returned":
      return "success";
    case "out":
      return "info";
    case "paid":
      return "success";
    case "canceled":
      return "danger";
    default:
      return "neutral";
  }
};

const courierTrackUrl: Record<string, (no: string) => string> = {
  cj: (no) => `https://trace.cjlogistics.com/web/detail.jsp?slipno=${encodeURIComponent(no)}`,
  post: (no) =>
    `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${encodeURIComponent(no)}`,
  logen: (no) => `https://www.ilogen.com/m/personal/trace/${encodeURIComponent(no)}`,
  hanjin: (no) =>
    `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&wblnum=${encodeURIComponent(no)}`,
};
const fmt = (v?: string | Date | null) => (v ? new Date(v).toLocaleString() : "-");

const getTrackingNumber = (value: unknown) => {
  const item = value as
    | {
        trackingNumber?: string | null;
        trackingNo?: string | null;
        tracking_no?: string | null;
      }
    | null
    | undefined;
  return item?.trackingNumber ?? item?.trackingNo ?? item?.tracking_no ?? null;
};

const getCourierValue = (value: unknown) => {
  const item = value as
    | {
        courier?: string | null;
        carrier?: string | null;
      }
    | null
    | undefined;
  return item?.courier ?? item?.carrier ?? null;
};

const getShippedAtValue = (value: unknown) => {
  const item = value as
    | {
        shippedAt?: string | Date | null;
        shipped_at?: string | Date | null;
      }
    | null
    | undefined;
  return item?.shippedAt ?? item?.shipped_at ?? null;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
const fmtDateOnly = (v?: string | Date | null) =>
  v ? new Date(v).toLocaleDateString("ko-KR") : "-";

const formatCurrency = (amount: number) => `${new Intl.NumberFormat("ko-KR").format(amount)}원`;

type Props = {
  id: string;
  backUrl?: string;
};

export default function RentalsDetailClient({
  id,
  backUrl = "/mypage?tab=orders",
}: Props) {
  const searchParams = useSearchParams();
  const focusTarget = searchParams.get("focus");
  const [data, setData] = useState<Rental | null>(null);
  const [isReceiving, setIsReceiving] = useState(false);
  const refreshRental = async () => {
    try {
      const res = await fetch(`/api/me/rentals/${id}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const json = await res.json();
      setData(json); // 최신 상태로 덮어쓰기
    } catch (e) {
      console.error("대여 상세 재조회 실패", e);
    }
  };

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const handleReceiveRental = async () => {
    if (isReceiving) return;
    if (
      !window.confirm(
        "라켓 수령을 확인하시겠습니까?\n확인 시점부터 대여 기간이 시작되고 반납 예정일이 계산됩니다.",
      )
    )
      return;

    try {
      setIsReceiving(true);
      const res = await fetch(`/api/rentals/${id}/receive`, {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message || "수령 확인을 처리하지 못했습니다.");
      }
      showSuccessToast("수령 확인이 완료되어 대여가 시작되었습니다.");
      await refreshRental();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "수령 확인을 처리하지 못했습니다.");
    } finally {
      setIsReceiving(false);
    }
  };

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdrawCancelRequest = async () => {
    if (!data) return;
    if (!data.cancelRequest || data.cancelRequest.status !== "requested") return;

    try {
      setWithdrawing(true);
      const res = await fetch(`/api/rentals/${data.id}/cancel-withdraw`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg = body?.message ?? "취소 요청 처리 중 오류가 발생했습니다.";
        showErrorToast(msg);
        return;
      }

      // 성공 시 상세 상태에서만 cancelRequest 제거
      setData((prev) => (prev ? { ...prev, cancelRequest: null } : prev));

      showSuccessToast("취소 요청을 철회했습니다.");
    } catch (e) {
      console.error(e);
      showErrorToast("취소 요청 처리 중 오류가 발생했습니다.");
    } finally {
      setWithdrawing(false);
    }
  };

  const loadRentalDetail = useCallback(async () => {
    try {
      setErr(null);
      const res = await fetch(`/api/me/rentals/${id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error((await res.json()).message || "조회 실패");
      }
      setData(await res.json());
    } catch (e: any) {
      setErr(e?.message ?? "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadRentalDetail();
  }, [loadRentalDetail]);

  // 교체 서비스 포함 여부(상세에서도 리스트와 동일한 분기 기준이 필요)
  // - stringingApplicationId가 있으면: 이미 신청서가 연결된 상태
  // - isStringServiceApplied=true인데 신청서 ID가 비어있는 레거시/예외 케이스를 대비
  const withStringService =
    Boolean(data?.withStringService) ||
    Boolean(data?.isStringServiceApplied) ||
    Boolean(data?.stringingApplicationId);
  // 신청서 ID가 없는데 교체 서비스가 포함된 경우 => "교체 신청하기" CTA 노출
  const canApplyStringService = withStringService && !data?.stringingApplicationId;

  useEffect(() => {
    if (focusTarget !== "stringing") return;
    if (!withStringService) return;

    const timeout = window.setTimeout(() => {
      document
        .getElementById("stringing-service")
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [focusTarget, withStringService, data?.stringingApplicationId]);

  // 교체 신청하기 링크(대여 기반 신청)
  const applyHref = `/services/apply?rentalId=${encodeURIComponent(id)}`;
  const returnShippingHref = `/mypage/rentals/${id}/return-shipping`;

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
          <CardContent className="p-6 md:p-8">
            <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (err) {
    return (
      <AsyncState
        kind="error"
        tone="user"
        variant="card"
        resourceName="대여 상세"
        onAction={() => {
          setLoading(true);
          void loadRentalDetail();
        }}
      />
    );
  }

  if (!data) {
    return (
      <AsyncState
        kind="empty"
        tone="user"
        variant="card"
        resourceName="대여 상세"
        title="대여 정보를 찾을 수 없어요"
        description="대여 번호를 확인한 뒤 다시 시도해 주세요."
      />
    );
  }

  // 결제 금액(표시용): 서버/DB 저장 구조와 동일하게 분해
  // - stringPrice/stringingFee는 과거 데이터에는 없을 수 있으니 0 fallback
  const fee = data.amount?.fee ?? 0;
  const deposit = data.amount?.deposit ?? 0;
  const stringPrice = data.amount?.stringPrice ?? 0;
  const stringingFee = data.amount?.stringingFee ?? 0;
  // 서버가 total을 계산해 저장하지만, 혹시 없을 경우를 대비해 동일 로직으로 fallback
  const total = data.amount?.total ?? fee + deposit + stringPrice + stringingFee;

  const banner = getDepositBanner({
    status: data.status,
    returnedAt: data.returnedAt ?? undefined,
    depositRefundedAt: data.depositRefundedAt ?? undefined,
  });

  const outboundTrackingNo = getTrackingNumber(data.shipping?.outbound);
  const outboundCourier = getCourierValue(data.shipping?.outbound);
  const outboundShippedAt = getShippedAtValue(data.shipping?.outbound);
  const returnTrackingNo = getTrackingNumber(data.shipping?.return);
  const hasOutboundShipping = !!outboundTrackingNo;
  const rentalShippingMethod = normalizeRentalShippingMethod(data.shipping?.shippingMethod);
  const isVisitPickup = rentalShippingMethod === "pickup";
  const isLinkedStringingComplete =
    !data.withStringService ||
    data.stringingApplication?.status === "교체완료" ||
    data.applicationSummary?.status === "교체완료";
  const canReceiveRental =
    data.status === "paid" && !isVisitPickup && hasOutboundShipping && isLinkedStringingComplete;
  const displayStatusLabel = data.depositRefundedAt
    ? "보증금 환급 완료"
    : data.status === "paid"
      ? hasOutboundShipping
        ? "배송/수령 준비 중"
        : "대여 준비 중"
      : getCustomerRentalStatusLabel(data.status);

  // 대기중/결제완료 + 아직 취소요청이 아닌 경우에만 '활성화' 허용 (버튼 자체는 항상 노출)
  const isOnlineCancelRestricted =
    ["out", "returned", "canceled", "cancelled"].includes(data.status) ||
    Boolean(data.depositRefundedAt);
  const canRequestCancel =
    // 상태는 pending 또는 paid만 허용
    (data.status === "pending" || data.status === "paid") &&
    // 출고 운송장이 아직 없을 때만
    !hasOutboundShipping &&
    // 이미 취소 요청이 들어가 있지 않은 경우만
    (!data.cancelRequest || data.cancelRequest.status !== "requested") &&
    !data.depositRefundedAt;
  // 취소 상태 배너용 데이터
  const cancelBanner = data.cancelRequest?.status
    ? {
        status: data.cancelRequest.status as "requested" | "approved" | "rejected",
        title:
          data.cancelRequest.status === "requested"
            ? "이 대여는 취소 요청 처리 중입니다. 관리자 확인 후 결과가 반영됩니다."
            : "이 대여의 취소 요청이 거절되었습니다.",
        reason: data.cancelRequest.reasonCode
          ? `${data.cancelRequest.reasonCode}${data.cancelRequest.reasonText ? ` (${data.cancelRequest.reasonText})` : ""}`
          : data.cancelRequest.reasonText || "",
      }
    : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = data.dueAt ? new Date(data.dueAt) : null;
  if (dueDate) dueDate.setHours(0, 0, 0, 0);
  const isReturnWindowOpen = Boolean(dueDate && today >= dueDate);
  const isReturnShippingAvailable = data.status === "out" && !data.returnedAt && isReturnWindowOpen;

  const nextTodo = canApplyStringService
    ? {
        label: "교체서비스 신청",
        ctaLabel: "교체서비스 신청하기",
        ctaHref: applyHref,
      }
    : isReturnShippingAvailable
      ? {
          label: returnTrackingNo ? "반납 운송장 확인/수정" : "반납 운송장 등록",
          ctaLabel: returnTrackingNo ? "반납 운송장 수정" : "반납 운송장 등록",
          ctaHref: returnShippingHref,
        }
      : null;
  const linkedApplication = data.stringingApplication;
  const linkedApplicationLines = linkedApplication?.lines ?? [];
  const linkedApplicationDisplayLines =
    linkedApplicationLines.length > 0
      ? linkedApplicationLines
      : data.applicationSummary
        ? [
            {
              id: `${data.id}-stringing-summary`,
              racketLabel: `${racketBrandLabel(data.brand)} ${data.model}`,
              stringName: data.applicationSummary.stringNames.join(", ") || null,
              tensionMain: data.applicationSummary.tensionSummary,
              tensionCross: null,
              note: null,
            },
          ]
        : [];
  const installedStringNames = Array.from(
    new Set(
      [
        ...linkedApplicationLines.map((line) => line.stringName),
        ...(linkedApplication?.stringNames ?? []),
        ...(data.applicationSummary?.stringNames ?? []),
      ]
        .map((name) => String(name ?? "").trim())
        .filter(Boolean),
    ),
  );
  const installedStringLabel = installedStringNames.length
    ? installedStringNames.join(", ")
    : stringPrice > 0 || stringingFee > 0
      ? "관리자 확인 중"
      : "선택된 스트링 정보 없음";
  const hasStringingCost = stringPrice > 0 || stringingFee > 0;
  const linkedApplicationStatus =
    linkedApplication?.status ?? data.applicationSummary?.status ?? null;
  const linkedApplicationIsComplete = linkedApplicationStatus === "교체완료";
  const rentalNextActionMessage = canApplyStringService
    ? "연결된 교체서비스 신청서를 작성해 주세요."
    : canReceiveRental
      ? "상품을 받으셨다면 수령 확인을 눌러 대여를 시작해 주세요."
      : isReturnShippingAvailable
        ? "반납 절차를 진행해 주세요."
        : data.status === "pending"
          ? "결제 또는 입금 확인을 기다리고 있습니다."
          : data.status === "paid"
            ? isVisitPickup
              ? "매장 수령 준비 상태를 확인해 주세요."
              : "대여 상품 수령을 준비해 주세요."
            : data.status === "out"
              ? "대여 기간과 반납 예정일을 확인해 주세요."
              : data.status === "returned"
                ? data.depositRefundedAt
                  ? "이용이 완료되었습니다."
                  : "반납 확인과 보증금 환급을 기다리고 있습니다."
                : data.status === "canceled"
                  ? "취소가 완료되었습니다."
                  : "진행 상황이 변경되면 이 화면에서 안내해 드립니다.";
  const shippingMethodLabel = isVisitPickup ? "매장 수령" : "택배 배송";
  const returnMethodLabel = isVisitPickup ? "매장 반납" : "택배 반납";
  return (
    <main className="space-y-5 bp-sm:space-y-6">
      <div className="rounded-2xl border-0 bg-card p-4 shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50 bp-sm:p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="mb-0 flex min-w-0 items-center gap-4">
            <div className="shrink-0 rounded-full bg-primary/10 p-3 ring-1 ring-primary/10">
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="break-keep text-ui-page-title font-semibold text-foreground">대여 상세</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="min-w-0 break-all text-muted-foreground">대여번호: {data.id}</p>

                {data.stringingApplicationId ? (
                  <Badge variant="info">신청서 연결됨</Badge>
                ) : withStringService ? (
                  <Badge variant="info">교체서비스 포함</Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:ml-auto sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap lg:justify-end">
            {isReturnShippingAvailable && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-9 w-full overflow-hidden whitespace-nowrap border-border bg-background hover:border-primary/30 lg:w-auto"
              >
                <Link href={returnShippingHref}>
                  <Truck className="mr-2 h-4 w-4" />
                  {returnTrackingNo ? "반납 운송장 수정" : "반납 운송장 등록"}
                </Link>
              </Button>
            )}

            {/* 버튼은 항상 노출하되, 조건을 만족하지 않으면 비활성화 */}
            {canRequestCancel ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setCancelDialogOpen(true)}
                className="h-9 w-full gap-2 overflow-hidden whitespace-nowrap lg:w-auto"
              >
                <XCircle className="h-4 w-4" />
                대여 취소
              </Button>
            ) : isOnlineCancelRestricted ? (
              <p className="max-w-sm text-ui-body-sm text-muted-foreground">
                이미 출고 또는 대여가 진행된 건은 온라인 취소 요청이 불가합니다. 변경이 필요하면
                고객센터로 문의해주세요.
              </p>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-9 w-full overflow-hidden whitespace-nowrap border-border bg-background hover:border-primary/30 lg:w-auto"
            >
              <Link href={backUrl}>
                목록으로 돌아가기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        {canReceiveRental && (
          <div className="mb-4 border-l-2 border-primary bg-primary/5 px-3 py-3">
            <p className="font-semibold text-foreground">라켓을 수령하셨나요?</p>
            <p className="mt-1 text-ui-body-sm text-muted-foreground">
              수령 확인을 누르면 오늘부터 대여 기간이 시작되고 반납 예정일이 계산됩니다.
            </p>
            <Button size="sm" className="mt-3" disabled={isReceiving} onClick={handleReceiveRental}>
              {isReceiving ? "수령 확인 처리 중..." : "수령 확인하고 대여 시작"}
            </Button>
          </div>
        )}
        {nextTodo && (
          <NextTodoCallout
            className="mb-4"
            label={nextTodo.label}
            ctaLabel={nextTodo.ctaLabel}
            ctaHref={nextTodo.ctaHref}
          />
        )}

        <div className="mb-4 grid gap-3 bp-md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="rounded-xl bg-primary/5 p-4 ring-1 ring-primary/10">
            <p className="text-ui-label font-medium text-muted-foreground">현재 상태</p>
            <div className="mt-2 flex items-center gap-2">
              {getStatusIcon(data.status)}
              <Badge variant={getStatusBadgeVariant(data.status)} className="px-3 py-1 text-ui-body-sm font-medium">
                {displayStatusLabel}
              </Badge>
            </div>
          </div>
          <div className="rounded-xl bg-muted/20 p-4 ring-1 ring-border/60">
            <p className="text-ui-label font-medium text-muted-foreground">다음 할 일</p>
            <p className="mt-2 break-keep text-ui-body-sm font-semibold text-foreground">{rentalNextActionMessage}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 bp-sm:grid-cols-2 xl:grid-cols-4">
          <div className="p-3 bp-sm:p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-ui-body-sm font-medium text-muted-foreground">대여 상품명</span>
            </div>
            <p className="line-clamp-2 min-w-0 break-keep text-ui-body font-semibold text-foreground bp-sm:text-ui-card-title-lg">
              {racketBrandLabel(data.brand)} {data.model}
            </p>
          </div>

          <div className="p-3 bp-sm:p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-ui-body-sm font-medium text-muted-foreground">대여 기간</span>
            </div>
            <p className="break-words text-ui-card-title-lg font-semibold text-foreground">{data.days}일</p>
          </div>

          <div className="p-3 bp-sm:p-4">
            <div className="mb-2 flex items-center space-x-2">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-ui-body-sm font-medium text-muted-foreground">결제 금액</span>
            </div>
            <p className="break-keep text-ui-card-title-lg font-semibold tabular-nums text-foreground">
              {(data.amount?.total ?? 0).toLocaleString()}원
            </p>
          </div>

          <div className="p-3 bp-sm:p-4">
            <div className="flex items-center space-x-2 mb-2">
              {getStatusIcon(data.status)}
              <span className="text-ui-body-sm font-medium text-muted-foreground">반납 예정일</span>
            </div>
            <Badge
              variant={getStatusBadgeVariant(data.status)}
              className="px-3 py-1 text-ui-body-sm font-medium"
            >
              {data.dueAt ? formatDate(data.dueAt) : "대여 시작 후 계산"}
            </Badge>
          </div>
        </div>
      </div>
      {/* 대여 취소 상태 안내 배너 */}
      {cancelBanner && (
        <div
          className={`mb-4 flex items-center justify-between border-l-2 px-3 py-3 text-ui-body-sm ${cancelBanner.status === "requested" ? "border-primary bg-primary/5 text-muted-foreground dark:bg-primary/10 dark:text-foreground" : "border-destructive/60 bg-destructive/5 text-foreground dark:bg-destructive/10 dark:text-foreground"}`}
        >
          <div>
            <p className="font-medium">{cancelBanner.title}</p>
            {/* {cancelBanner.reason && <p className="mt-1 text-ui-label opacity-80">사유: {cancelBanner.reason}</p>} */}
          </div>

          {cancelBanner.status === "requested" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleWithdrawCancelRequest}
              disabled={withdrawing}
              className="mt-3 h-9 w-full overflow-hidden whitespace-nowrap sm:ml-4 sm:mt-0 sm:w-auto"
            >
              {withdrawing ? "철회 중…" : "취소 요청 철회"}
            </Button>
          )}
        </div>
      )}

      {banner && (
        <div
          className={`border-l-2 px-3 py-3 ${banner.tone === "success" ? "border-success bg-success/10 text-success dark:bg-success/20 dark:text-success" : "border-primary bg-muted/20 text-foreground dark:bg-muted/20 dark:text-foreground"}`}
        >
          <div className="flex items-center gap-3">
            {banner.tone === "success" ? (
              <CheckCircle className="h-6 w-6 text-success" />
            ) : (
              <AlertCircle className="h-6 w-6 text-primary" />
            )}
            <div>
              <p className="font-semibold text-ui-card-title-lg">{banner.title}</p>
              {banner.desc && <p className="text-ui-body-sm mt-1 opacity-80">{banner.desc}</p>}
            </div>
          </div>
        </div>
      )}

      <>
        <MypageDetailCard title="대여 상품 정보" icon={<Package className="h-5 w-5 text-primary" />}>
            <div className="divide-y divide-border/60">
              <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-ui-label font-medium text-muted-foreground">라켓</p>
                  <p className="mt-1 break-words font-semibold text-foreground">
                    {racketBrandLabel(data.brand)} {data.model}
                  </p>
                </div>
              </div>

              {withStringService && (
                <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-ui-label font-medium text-muted-foreground">장착 스트링</p>
                    <p className="mt-1 break-words font-semibold text-foreground">{installedStringLabel}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-ui-label font-medium text-muted-foreground">대여 기간</p>
                  <p className="mt-1 break-words font-semibold text-foreground">{data.days}일</p>
                </div>
              </div>

              <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-ui-label font-medium text-muted-foreground">상태</p>
                  <Badge variant={getStatusBadgeVariant(data.status)} className="mt-1">
                    {displayStatusLabel}
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-ui-label font-medium text-muted-foreground">반납 예정일</p>
                  <p className="mt-1 break-words font-semibold text-foreground">
                    {data.dueAt ? formatDate(data.dueAt) : "대여 시작 후 계산"}
                  </p>
                </div>
              </div>
            </div>
          </MypageDetailCard>

        <MypageDetailCard title="결제 정보" icon={<CreditCard className="h-5 w-5 text-primary" />}>
            <div className="space-y-3">
              <div className="flex items-start gap-3 border-b border-border/60 py-3 first:pt-0 last:border-b-0 last:pb-0">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-ui-label font-medium text-muted-foreground">결제 상태</p>
                  <p className="mt-1 break-words font-semibold text-foreground">{displayStatusLabel}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 border-b border-border/60 py-3 first:pt-0 last:border-b-0 last:pb-0">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-ui-label font-medium text-muted-foreground">결제 방식</p>
                  <p className="mt-1 break-words font-semibold text-foreground">결제 정보 확인 중</p>
                </div>
              </div>

              <div className="flex items-start gap-3 border-b border-border/60 py-3 first:pt-0 last:border-b-0 last:pb-0">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-ui-label font-medium text-muted-foreground">대여 수수료</p>
                  <p className="mt-1 break-words font-semibold text-foreground tabular-nums">
                    {fee.toLocaleString()}원
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 border-b border-border/60 py-3 first:pt-0 last:border-b-0 last:pb-0">
                <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-ui-label font-medium text-muted-foreground">보증금</p>
                  <p className="mt-1 break-words font-semibold text-foreground tabular-nums">
                    {deposit.toLocaleString()}원
                  </p>
                </div>
              </div>

              {stringPrice > 0 && (
                <div className="flex items-start gap-3 border-b border-border/60 py-3 first:pt-0 last:border-b-0 last:pb-0">
                  <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-ui-label font-medium text-muted-foreground">스트링 상품 금액</p>
                    <p className="mt-1 break-words font-semibold text-foreground tabular-nums">
                      {stringPrice.toLocaleString()}원
                    </p>
                  </div>
                </div>
              )}

              {stringingFee > 0 && (
                <div className="flex items-start gap-3 border-b border-border/60 py-3 first:pt-0 last:border-b-0 last:pb-0">
                  <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-ui-label font-medium text-muted-foreground">교체서비스 비용</p>
                    <p className="mt-1 break-words font-semibold text-foreground tabular-nums">
                      {stringingFee.toLocaleString()}원
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-xl bg-primary/5 p-4 ring-1 ring-primary/10">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="flex-1">
                  <p className="text-ui-label font-medium text-muted-foreground">총 결제 금액</p>
                  <p className="mt-1 break-words text-ui-section-title font-semibold text-primary tabular-nums">
                    {total.toLocaleString()}원
                  </p>
                </div>
              </div>
            </div>
          </MypageDetailCard>

        <MypageDetailCard title="배송/수령 정보" icon={<Truck className="h-5 w-5 text-primary" />}>
          <div className="grid gap-4 bp-sm:grid-cols-2">
            <MypageInfoField label="수령 방식" value={shippingMethodLabel} />
            <div className="border-b border-border/60 py-3 first:pt-0 last:border-b-0 last:pb-0">
              <p className="text-ui-label font-medium text-muted-foreground">수령/출고 정보</p>
              <p className="mt-1 break-words text-ui-body-sm font-semibold text-foreground">
                {isVisitPickup
                  ? outboundTrackingNo
                    ? `매장 수령 준비 완료 · ${outboundTrackingNo}`
                    : "매장 수령 준비 중입니다."
                  : outboundTrackingNo
                    ? `${getCourierLabel(outboundCourier ?? undefined)} · ${outboundTrackingNo}`
                    : "출고 운송장 등록 전입니다."}
              </p>
            </div>
            <MypageInfoField label="출고 택배사" value={outboundCourier ? getCourierLabel(outboundCourier) : null} fallback={isVisitPickup ? "방문 수령" : "출고 택배사 확인 중"} />
            <MypageInfoField label="출고 운송장" value={outboundTrackingNo} fallback={isVisitPickup ? "방문 수령 준비 상태로 안내됩니다." : "출고 운송장 등록 전입니다."} valueClassName="break-all" />
            <MypageInfoField label="출고일" value={outboundShippedAt ? formatDateTime(outboundShippedAt) : null} fallback="출고일 확인 중" />
          </div>
          </MypageDetailCard>

        <MypageDetailCard title="반납 정보" icon={<Truck className="h-5 w-5 text-primary" />}>
          <div className="grid gap-4 bp-sm:grid-cols-2">
            <MypageInfoField label="반납 예정일" value={data.dueAt ? formatDate(data.dueAt) : "대여 시작 후 계산"} />
            <MypageInfoField label="반납 방식" value={returnMethodLabel} />
            <MypageInfoField label={isVisitPickup ? "반환 접수 번호" : "반납 운송장"} value={returnTrackingNo} fallback="반납 운송장이 아직 등록되지 않았습니다." valueClassName="break-all" />
            <MypageInfoField label="반납 확인" value={data.returnedAt ? formatDateTime(data.returnedAt) : "반납 확인 전"} />
          </div>
        </MypageDetailCard>

        <MypageDetailCard title="신청 정보" icon={<Briefcase className="h-5 w-5 text-primary" />}>
          <div className="grid gap-4">
            <MypageInfoField label="신청번호" value={data.id} valueClassName="break-all" />
            <MypageInfoField label="신청일" value={data.createdAt ? formatDateTime(data.createdAt) : null} fallback="신청일 확인 중" />
            <p className="text-ui-body-sm text-muted-foreground">신청자 연락처는 계정 정보 기준으로 관리됩니다. 연락처 변경이 필요하면 고객센터로 문의해주세요.</p>
          </div>
        </MypageDetailCard>
      </>

      {withStringService ? (
        <section id="stringing-service" className="scroll-mt-24">
          <Card className="overflow-hidden rounded-2xl border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
            <CardHeader className="border-b border-border bg-secondary/30 p-4 bp-sm:p-5">
              <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    <span>연결된 교체서비스</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    대여 라켓에 장착될 스트링과 작업 정보를 확인할 수 있어요.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.stringingApplicationId ? (
                    <Badge variant="secondary">교체서비스 연결</Badge>
                  ) : (
                    <Badge variant="secondary">신청 필요</Badge>
                  )}
                  {linkedApplicationIsComplete ? <Badge variant="success">교체완료</Badge> : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 bp-sm:p-6">
              {linkedApplication || data.applicationSummary ? (
                <>
                  <div className="grid grid-cols-1 gap-3 text-ui-body-sm text-foreground bp-sm:grid-cols-2 xl:grid-cols-4">
                    <div className="p-3 bp-sm:p-4">
                      <p className="text-muted-foreground">진행 상태</p>
                      <Badge
                        variant="info"
                        className="mt-2 max-w-full whitespace-normal break-keep text-left"
                      >
                        {getCustomerApplicationStatusLabel(linkedApplication?.status ?? data.applicationSummary?.status)}
                      </Badge>
                    </div>
                    <div className="p-3 bp-sm:p-4">
                      <p className="text-muted-foreground">신청일</p>
                      <p className="mt-2 font-semibold tabular-nums text-foreground">
                        {linkedApplication?.createdAt
                          ? formatDate(linkedApplication.createdAt)
                          : data.createdAt
                            ? formatDate(data.createdAt)
                            : "-"}
                      </p>
                    </div>
                    <div className="p-3 bp-sm:p-4">
                      <p className="text-muted-foreground">희망 작업일</p>
                      <p className="mt-2 break-words font-semibold text-foreground">
                        {linkedApplication?.reservationLabel ??
                          data.applicationSummary?.reservationLabel ??
                          "예약 정보 없음"}
                      </p>
                    </div>
                    <div className="p-3 bp-sm:p-4">
                      <p className="text-muted-foreground">서비스 금액</p>
                      <p className="mt-2 font-semibold tabular-nums text-foreground">
                        {typeof linkedApplication?.totalPrice === "number"
                          ? formatCurrency(linkedApplication.totalPrice)
                          : stringingFee > 0
                            ? formatCurrency(stringingFee)
                            : "결제 정보 확인"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-ui-body-sm font-semibold text-foreground">라켓·스트링 정보</p>
                    <div className="grid gap-3 bp-md:grid-cols-2">
                      {linkedApplicationDisplayLines.map((line, index) => {
                        const racketLabel =
                          line.racketLabel ||
                          line.racketType ||
                          `${racketBrandLabel(data.brand)} ${data.model}`;
                        const stringName =
                          line.stringName ||
                          linkedApplication?.stringNames?.join(", ") ||
                          data.applicationSummary?.stringNames.join(", ") ||
                          (hasStringingCost ? "관리자 확인 중" : "선택된 스트링 정보 없음");
                        const tensionMain =
                          line.tensionMain ||
                          linkedApplication?.tensionSummary ||
                          data.applicationSummary?.tensionSummary ||
                          "-";
                        const tensionCross =
                          line.tensionCross && line.tensionCross !== tensionMain
                            ? line.tensionCross
                            : null;

                        return (
                          <div
                            key={line.id ?? `${data.id}-line-${index}`}
                            className="border-t border-border/70 py-3 text-ui-body-sm first:border-t-0"
                          >
                            <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                              <p className="min-w-0 break-words font-semibold text-foreground">
                                {racketLabel}
                              </p>
                              <Badge
                                variant="outline"
                                className="w-fit max-w-full whitespace-normal break-words text-left"
                              >
                                {stringName}
                              </Badge>
                            </div>
                            <dl className="mt-3 space-y-2 text-foreground">
                              <div className="flex gap-2">
                                <dt className="w-20 shrink-0 text-muted-foreground">텐션</dt>
                                <dd className="min-w-0 break-words">
                                  메인 {tensionMain}
                                  {tensionCross ? ` / 크로스 ${tensionCross}` : ""}
                                </dd>
                              </div>
                              {line.note || linkedApplication?.requirements ? (
                                <div className="flex gap-2">
                                  <dt className="w-20 shrink-0 text-muted-foreground">요청사항</dt>
                                  <dd className="min-w-0 whitespace-pre-wrap break-words">
                                    {line.note ?? linkedApplication?.requirements}
                                  </dd>
                                </div>
                              ) : null}
                            </dl>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl bg-muted/15 p-3 text-ui-body-sm text-foreground">
                    <div>
                      <p className="font-semibold text-foreground">장착·출고 안내</p>
                      <p className="mt-1 text-muted-foreground">
                        매장에서 대여 라켓에 스트링을 장착한 뒤 고객님께 발송합니다.
                      </p>
                    </div>
                    <dl className="grid gap-3 bp-sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">장착 방식</dt>
                        <dd className="mt-1 font-medium">매장 장착</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">출고 방식</dt>
                        <dd className="mt-1 font-medium">
                          {isVisitPickup ? "매장 수령" : "대여 라켓 출고"}
                        </dd>
                      </div>
                      {outboundTrackingNo ? (
                        <>
                          <div>
                            <dt className="text-muted-foreground">출고 택배사</dt>
                            <dd className="mt-1 font-medium">
                              {getCourierLabel(outboundCourier ?? undefined)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">출고 운송장</dt>
                            <dd className="mt-1 break-all font-medium">{outboundTrackingNo}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">출고일</dt>
                            <dd className="mt-1 font-medium">
                              {outboundShippedAt
                                ? formatDate(String(outboundShippedAt))
                                : "출고일 확인 중"}
                            </dd>
                          </div>
                        </>
                      ) : (
                        <div className="bp-sm:col-span-2">
                          <dt className="text-muted-foreground">출고 운송장</dt>
                          <dd className="mt-1 font-medium text-muted-foreground">
                            관리자가 대여 라켓에 스트링을 장착한 뒤 출고 운송장을 등록하면 이곳에서
                            확인할 수 있습니다.
                          </dd>
                        </div>
                      )}
                      {linkedApplication?.shippingInfo?.deliveryRequest ? (
                        <div className="bp-sm:col-span-2">
                          <dt className="text-muted-foreground">배송 요청사항</dt>
                          <dd className="mt-1 whitespace-pre-wrap break-words font-medium">
                            {linkedApplication.shippingInfo.deliveryRequest}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>

                  <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:flex-wrap bp-sm:items-center">
                    {data.stringingApplicationId ? (
                      <ServiceReviewCTA
                        applicationId={data.stringingApplicationId}
                        userConfirmedAt={linkedApplication?.userConfirmedAt ?? null}
                        className="h-9 w-full overflow-hidden whitespace-nowrap bp-sm:w-auto"
                      />
                    ) : null}
                  </div>
                </>
              ) : canApplyStringService ? (
                <div className="flex flex-col gap-3 border-l-2 border-primary bg-primary/5 px-3 py-3 text-ui-body-sm bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
                  <p className="text-muted-foreground">
                    대여에 교체서비스가 포함되어 있어 신청서 작성이 필요합니다.
                  </p>
                  <Button
                    asChild
                    className="h-9 w-full gap-2 overflow-hidden whitespace-nowrap bp-sm:w-auto"
                  >
                    <Link href={applyHref}>
                      <Wrench className="h-4 w-4" />
                      교체서비스 신청하기
                    </Link>
                  </Button>
                </div>
              ) : (
                <p className="text-ui-body-sm text-muted-foreground">
                  교체서비스 정보를 확인 중입니다.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <Card className="overflow-hidden rounded-2xl border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
        <CardHeader className="border-b border-border bg-secondary/30 p-4 bp-sm:p-5">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>진행 단계</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 bp-sm:p-5">
          <div className="grid gap-3">
            <div className="flex items-start gap-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-ui-body-sm font-medium text-foreground">대여 시작</p>
                <p className="text-ui-body-sm text-foreground/80">
                  {data.outAt ? formatDateTime(data.outAt) : "수령 확인 대기"}
                </p>
              </div>
            </div>

            {outboundTrackingNo && (
              <div className="flex items-start gap-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-ui-body-sm font-medium text-foreground">
                    {isVisitPickup ? "매장 수령 준비 완료" : "출고 운송장 등록"}
                  </p>
                  <p className="text-ui-label text-foreground/75">{fmtDateOnly(outboundShippedAt)}</p>
                  <p className="text-ui-body-sm mt-1">
                    {isVisitPickup ? (
                      <>준비 확인 번호 · {outboundTrackingNo ?? "-"}</>
                    ) : (
                      <>
                        {getCourierLabel(outboundCourier ?? undefined)} ·{" "}
                        <a
                          className="underline underline-offset-2"
                          href={getTrackHref(outboundCourier ?? undefined, outboundTrackingNo)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {outboundTrackingNo ?? "-"}
                        </a>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-ui-body-sm font-medium text-foreground">반납 예정</p>
                <p className="text-ui-body-sm text-foreground/80">
                  {data.dueAt ? formatDate(data.dueAt) : "대여 시작 후 계산"}
                </p>
              </div>
            </div>

            {/* 반납 운송장 등록(사용자 발송) */}
            {returnTrackingNo && (
              <div className="flex items-start gap-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 dark:bg-primary/25">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-ui-body-sm font-medium text-foreground">
                    {isVisitPickup ? "매장 반환 접수 완료" : "반납 운송장 등록"}
                  </p>
                  <p className="text-ui-label text-foreground/75">
                    {fmtDateOnly(getShippedAtValue(data.shipping?.return))}
                  </p>
                  <p className="text-ui-body-sm mt-1">
                    {isVisitPickup ? (
                      <>접수 번호 · {returnTrackingNo ?? "-"}</>
                    ) : (
                      <>
                        {getCourierLabel(getCourierValue(data.shipping?.return) ?? undefined)} ·{" "}
                        <a
                          className="underline underline-offset-2"
                          href={getTrackHref(
                            getCourierValue(data.shipping?.return) ?? undefined,
                            returnTrackingNo,
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {returnTrackingNo ?? "-"}
                        </a>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 dark:bg-primary/25">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-ui-body-sm font-medium text-foreground">반납 완료</p>
                <p className="text-ui-body-sm text-foreground/80">
                  {data.returnedAt ? formatDateTime(data.returnedAt) : "-"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-ui-body-sm font-medium text-foreground">보증금 환불</p>
                <p className="text-ui-body-sm text-foreground/80">
                  {data.depositRefundedAt ? formatDateTime(data.depositRefundedAt) : "-"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 다이얼로그는 클릭 시점에만 마운트해 초기 번들을 경량화 */}
      {cancelDialogOpen && data?.id ? (
        <CancelRentalDialog
          rentalId={data.id}
          onSuccess={refreshRental}
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          hideTrigger
        />
      ) : null}
    </main>
  );
}
