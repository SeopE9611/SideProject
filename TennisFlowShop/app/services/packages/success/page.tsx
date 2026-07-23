import BackButtonGuard from "@/app/checkout/success/_components/BackButtonGuard";
import UnifiedPackageCard from "@/app/services/packages/_components/UnifiedPackageCard";
import {
  getCustomerTransactionPaymentStatusLabel,
  isCustomerBankTransferPayment,
} from "@/app/mypage/_lib/flow-display";
import { normalizePackageCardData } from "@/app/services/packages/_lib/packageCard";
import { toPackageVariant } from "@/app/services/packages/_lib/packageVariant";
import DevMarkPaidButton from "@/app/services/packages/success/DevMarkPaidButton";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicSurface, ResultState, SummaryCard } from "@/components/public";
import LoginGate from "@/components/system/LoginGate";
import { Button } from "@/components/ui/button";
import { verifyAccessToken } from "@/lib/auth.utils";
import { bankLabelMap } from "@/lib/constants";
import clientPromise from "@/lib/mongodb";
import { getPaymentDisplaySummary } from "@/lib/payments/payment-display";
import { formatKoreanPhone } from "@/lib/phone";
import jwt from "jsonwebtoken";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Gift,
  MapPin,
  Package,
  Phone,
  Shield,
  Star,
} from "lucide-react";
import { ObjectId, type Document, type Filter } from "mongodb";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "패키지 주문 결과",
};

type PackageSuccessViewerPayload = {
  sub: string;
  email?: string;
  role?: string;
  roles?: unknown;
  isAdmin?: boolean;
};

type PackagePaymentLifecycle = "pending" | "paid" | "failed" | "cancelled" | "refunded" | "unknown";
type PackageUsageStatus =
  | "available"
  | "paused"
  | "exhausted"
  | "expired"
  | "cancelled"
  | "not_issued"
  | "unknown";
type PackageActivationStatus =
  | "active"
  | "awaiting_payment"
  | "pending_issue"
  | "paused"
  | "ended"
  | "cancelled"
  | "failed"
  | "unknown";
type PackageDisplayGroup = "available" | "waiting" | "history";

function nullableTrim(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNullableFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toValidDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function compactToken(value: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function getPaymentLifecycle(
  paymentStatus: string | null,
  orderStatus: string | null,
): PackagePaymentLifecycle {
  const paymentToken = compactToken(paymentStatus);
  const orderToken = compactToken(orderStatus);
  if (["refunded", "refund", "refundcompleted", "환불", "환불완료"].includes(paymentToken))
    return "refunded";
  if (["canceled", "cancelled", "결제취소", "취소"].includes(paymentToken)) return "cancelled";
  if (["failed", "결제실패", "paymentfailed"].includes(paymentToken)) return "failed";
  if (["paid", "결제완료", "paymentcompleted"].includes(paymentToken)) return "paid";
  if (["pending", "결제대기", "대기중", "paymentpending"].includes(paymentToken)) return "pending";
  if (["refunded", "refund", "refundcompleted", "환불", "환불완료"].includes(orderToken))
    return "refunded";
  if (["canceled", "cancelled", "결제취소", "취소"].includes(orderToken)) return "cancelled";
  return "unknown";
}

function formatPaymentTotalAmount(amount: number | null): string {
  return amount === null ? "금액 확인 중" : `${amount.toLocaleString()}원`;
}

function resolvePackageSuccessViewer(
  accessToken?: string,
  refreshToken?: string,
): PackageSuccessViewerPayload | null {
  const parseViewerPayload = (payload: unknown): PackageSuccessViewerPayload | null => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

    const viewerPayload = payload as Record<string, unknown>;
    const viewerUserId = typeof viewerPayload.sub === "string" ? viewerPayload.sub : "";
    if (!viewerUserId || viewerUserId !== viewerUserId.trim() || !ObjectId.isValid(viewerUserId)) {
      return null;
    }

    return {
      sub: viewerUserId,
      email: typeof viewerPayload.email === "string" ? viewerPayload.email : undefined,
      role: typeof viewerPayload.role === "string" ? viewerPayload.role : undefined,
      roles: viewerPayload.roles,
      isAdmin: viewerPayload.isAdmin === true,
    };
  };

  if (accessToken) {
    try {
      const viewerPayload = parseViewerPayload(verifyAccessToken(accessToken));
      if (viewerPayload) return viewerPayload;
    } catch {}
  }

  if (refreshToken) {
    try {
      return parseViewerPayload(jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!));
    } catch {
      return null;
    }
  }

  return null;
}

export default async function PackageSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const packageOrderId = Array.isArray(sp.packageOrderId)
    ? sp.packageOrderId[0]
    : (sp.packageOrderId ?? "");

  if (!packageOrderId || !ObjectId.isValid(packageOrderId)) return notFound();

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;
  const viewerPayload = resolvePackageSuccessViewer(accessToken, refreshToken);
  if (!viewerPayload) {
    const qs = new URLSearchParams();
    qs.set("packageOrderId", packageOrderId);
    const next = `/services/packages/success?${qs.toString()}`;
    return <LoginGate next={next} variant="checkout" />;
  }

  const viewerUserId = viewerPayload.sub;
  if (typeof viewerUserId !== "string" || !ObjectId.isValid(viewerUserId)) return notFound();
  const viewerObjectId = new ObjectId(viewerUserId);

  // --- 관리자 판별 ---
  // 토큰 페이로드 기반
  const tokenIsAdmin =
    viewerPayload.role === "admin" ||
    (Array.isArray(viewerPayload.roles) && viewerPayload.roles.some((role) => role === "admin")) ||
    viewerPayload.isAdmin === true;

  // 이메일 화이트리스트(옵션)
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const emailIsAdmin = ADMIN_EMAILS.includes(
    typeof viewerPayload.email === "string" ? viewerPayload.email.toLowerCase() : "",
  );

  const isAdmin = tokenIsAdmin || emailIsAdmin;
  const packageOrderObjectId = new ObjectId(packageOrderId);
  const packageOrderFilter: Filter<Document> = isAdmin
    ? { _id: packageOrderObjectId }
    : { _id: packageOrderObjectId, userId: viewerObjectId };

  const client = await clientPromise;
  const db = client.db();
  const packageOrder = await db.collection("packageOrders").findOne(packageOrderFilter);

  if (!packageOrder) return notFound();

  // 운영 긴급 노출 스위치
  const showDevBtn = isAdmin || process.env.NEXT_PUBLIC_SHOW_DEV_BUTTON === "1";
  const packageOrderUserId =
    packageOrder.userId instanceof ObjectId
      ? packageOrder.userId
      : typeof packageOrder.userId === "string" && ObjectId.isValid(packageOrder.userId)
        ? new ObjectId(packageOrder.userId)
        : null;
  const servicePass = packageOrderUserId
    ? await db
        .collection("service_passes")
        .findOne(
          { orderId: packageOrderObjectId, userId: packageOrderUserId },
          { projection: { status: 1, remainingCount: 1, expiresAt: 1 } },
        )
    : null;

  const packageInfo = packageOrder.packageInfo;
  const serviceInfo = packageOrder.serviceInfo;
  const paymentInfo = packageOrder.paymentInfo;
  const rawPaymentStatus =
    nullableTrim(packageOrder.paymentStatus) ?? nullableTrim(paymentInfo?.status);
  const paymentMethod = nullableTrim(paymentInfo?.method);
  const paymentProvider = nullableTrim(paymentInfo?.provider);
  const paymentTotalAmount = toNullableFiniteNumber(packageOrder.totalPrice);
  const paymentSummary = getPaymentDisplaySummary({
    method: paymentMethod,
    provider: paymentProvider,
    easyPayProvider: paymentInfo?.easyPayProvider ?? paymentInfo?.rawSummary?.easyPay?.provider,
    cardDisplayName: paymentInfo?.cardDisplayName,
    cardCompany: paymentInfo?.cardCompany,
    cardLabel: paymentInfo?.cardLabel,
    niceCard: paymentInfo?.niceCard,
    rawSummary: paymentInfo?.rawSummary,
    bank: paymentInfo?.bank,
    depositor: paymentInfo?.depositor,
  });
  const paymentMethodLabel = paymentSummary.userLabel;
  const paymentStatusLabel = getCustomerTransactionPaymentStatusLabel({
    paymentStatus: rawPaymentStatus,
    paymentMethod,
    paymentProvider,
    totalPrice: paymentTotalAmount,
  });
  const paymentLifecycle = getPaymentLifecycle(rawPaymentStatus, nullableTrim(packageOrder.status));
  const hasTerminalPaymentState =
    paymentLifecycle === "failed" ||
    paymentLifecycle === "cancelled" ||
    paymentLifecycle === "refunded";
  const isBankTransfer = isCustomerBankTransferPayment({
    paymentMethod,
    paymentProvider,
    totalPrice: paymentTotalAmount,
  });
  const rawPassStatus = nullableTrim(servicePass?.status);
  const remainingCount = toNullableFiniteNumber(servicePass?.remainingCount);
  const expiresAt = toValidDateOrNull(servicePass?.expiresAt);
  const passStatusToken = compactToken(rawPassStatus);
  const usageStatus: PackageUsageStatus = !servicePass
    ? "not_issued"
    : passStatusToken === "cancelled"
      ? "cancelled"
      : remainingCount !== null && remainingCount <= 0
        ? "exhausted"
        : (expiresAt !== null && expiresAt.getTime() <= Date.now()) || passStatusToken === "expired"
          ? "expired"
          : ["paused", "suspended"].includes(passStatusToken)
            ? "paused"
            : passStatusToken === "active"
              ? "available"
              : "unknown";
  const activationStatus: PackageActivationStatus = servicePass
    ? usageStatus === "available"
      ? "active"
      : usageStatus === "paused"
        ? "paused"
        : usageStatus === "exhausted" || usageStatus === "expired"
          ? "ended"
          : usageStatus === "cancelled"
            ? "cancelled"
            : "unknown"
    : paymentLifecycle === "pending"
      ? "awaiting_payment"
      : paymentLifecycle === "paid"
        ? "pending_issue"
        : paymentLifecycle === "failed"
          ? "failed"
          : paymentLifecycle === "cancelled" || paymentLifecycle === "refunded"
            ? "cancelled"
            : "unknown";
  const activationStatusLabel = {
    active: "활성화 완료",
    awaiting_payment: "결제 확인 후 활성화",
    pending_issue: "발급 처리 중",
    paused: "활성화 일시정지",
    ended: "이용 종료",
    cancelled: "활성화 취소",
    failed: "발급 처리 실패",
    unknown: "활성화 상태 확인 중",
  }[activationStatus];
  const activationDescription = {
    active: "패키지권을 사용할 수 있습니다.",
    awaiting_payment: "결제 또는 입금 확인 후 활성화됩니다.",
    pending_issue: "패키지권 발급을 기다리고 있습니다.",
    paused: "현재 패키지권 사용이 일시정지되어 있습니다.",
    ended: "보유 횟수 또는 이용 기간을 확인해 주세요.",
    cancelled: "취소 또는 환불된 패키지는 사용할 수 없습니다.",
    failed: "결제 또는 발급 처리 결과를 확인해 주세요.",
    unknown: "패키지권 내역에서 최신 상태를 확인해 주세요.",
  }[activationStatus];
  const displayGroup: PackageDisplayGroup = hasTerminalPaymentState
    ? "history"
    : usageStatus === "available"
      ? "available"
      : usageStatus === "paused" || usageStatus === "not_issued" || usageStatus === "unknown"
        ? "waiting"
        : "history";
  const canStartStringingService = usageStatus === "available" && displayGroup === "available";
  const normalizedPaymentProvider = compactToken(paymentProvider);
  const isNicePayment = normalizedPaymentProvider === "nicepay";
  const isTossPayment = ["tosspayments", "toss"].includes(normalizedPaymentProvider);
  const isOnlinePayment = isTossPayment || isNicePayment;
  const approvedAt = toValidDateOrNull(paymentInfo?.approvedAt);
  const shouldShowBankAccount =
    isBankTransfer &&
    paymentStatusLabel === "입금 확인 대기" &&
    paymentTotalAmount !== null &&
    paymentTotalAmount > 0 &&
    Boolean(paymentInfo?.bank && bankLabelMap[paymentInfo.bank]) &&
    !hasTerminalPaymentState;
  const canShowDevMarkPaidButton =
    showDevBtn && isBankTransfer && paymentLifecycle === "pending" && !hasTerminalPaymentState;
  const packageResultPresentation = hasTerminalPaymentState
    ? paymentLifecycle === "failed"
      ? {
          status: "error" as const,
          title: "패키지 결제를 완료하지 못했습니다",
          description:
            "결제 또는 발급 처리 결과를 확인해 주세요. 실패한 주문에서는 패키지권을 사용할 수 없습니다.",
          nextActionTitle: "패키지권 확인",
          nextActionDescription: "마이페이지에서 최신 상태를 확인하세요",
        }
      : paymentLifecycle === "cancelled"
        ? {
            status: "warning" as const,
            title: "패키지 결제가 취소되었습니다",
            description: "취소된 주문에서는 패키지권을 사용할 수 없습니다.",
            nextActionTitle: "패키지권 확인",
            nextActionDescription: "마이페이지에서 최신 상태를 확인하세요",
          }
        : {
            status: "warning" as const,
            title: "패키지 결제가 환불되었습니다",
            description: "환불된 주문에서는 패키지권을 사용할 수 없습니다.",
            nextActionTitle: "패키지권 확인",
            nextActionDescription: "마이페이지에서 최신 상태를 확인하세요",
          }
    : usageStatus === "paused"
      ? {
          status: "warning" as const,
          title: "패키지권이 일시정지되어 있습니다",
          description:
            "결제는 확인됐지만 현재 패키지권 사용이 일시정지되어 있습니다. 패키지권 내역에서 상태를 확인해 주세요.",
          nextActionTitle: "패키지권 확인",
          nextActionDescription: "마이페이지에서 최신 상태를 확인하세요",
        }
      : usageStatus === "exhausted" || usageStatus === "expired"
        ? {
            status: "info" as const,
            title: "패키지 이용이 종료되었습니다",
            description: "보유 횟수를 모두 사용했거나 이용 기간이 만료되었습니다.",
            nextActionTitle: "패키지권 확인",
            nextActionDescription: "마이페이지에서 최신 상태를 확인하세요",
          }
        : paymentLifecycle === "paid" && usageStatus === "available"
          ? {
              status: "success" as const,
              title: "패키지 결제와 활성화가 완료되었습니다",
              description:
                "패키지권을 사용할 수 있습니다. 교체서비스 신청 시 보유 횟수에서 차감됩니다.",
              nextActionTitle: "바로 신청 가능",
              nextActionDescription: "교체서비스 신청",
            }
          : paymentLifecycle === "paid" && usageStatus === "not_issued"
            ? {
                status: "info" as const,
                title: "패키지 결제가 완료되었습니다",
                description:
                  "결제는 완료됐으며 패키지권 발급을 처리하고 있습니다. 중복 결제하지 말고 패키지권 내역을 확인해 주세요.",
                nextActionTitle: "패키지권 확인",
                nextActionDescription: "마이페이지에서 최신 상태를 확인하세요",
              }
            : paymentLifecycle === "pending" && isBankTransfer
              ? {
                  status: "info" as const,
                  title: "패키지 주문이 접수되었습니다",
                  description:
                    "입금 확인 후 패키지권이 활성화됩니다. 활성화 전에는 패키지를 사용할 수 없습니다.",
                  nextActionTitle: "입금 확인 필요",
                  nextActionDescription: "입금 후 패키지권 확인",
                }
              : paymentLifecycle === "pending"
                ? {
                    status: "info" as const,
                    title: "패키지 결제 상태를 확인하고 있습니다",
                    description:
                      "결제 처리 결과를 확인 중입니다. 중복 결제하지 말고 패키지권 내역을 확인해 주세요.",
                    nextActionTitle: "패키지권 확인",
                    nextActionDescription: "마이페이지에서 최신 상태를 확인하세요",
                  }
                : {
                    status: "warning" as const,
                    title: "패키지 주문 상태를 확인하고 있습니다",
                    description:
                      "결제 또는 패키지권 활성화 상태를 확인 중입니다. 패키지권 내역에서 최신 상태를 확인해 주세요.",
                    nextActionTitle: "패키지권 확인",
                    nextActionDescription: "마이페이지에서 최신 상태를 확인하세요",
                  };

  const packageCard = normalizePackageCardData({
    id: String(packageInfo.id ?? ""),
    title: String(packageInfo.title ?? ""),
    sessions: Number(packageInfo.sessions ?? 0),
    price: Number(packageInfo.price ?? 0),
    variant: toPackageVariant(packageInfo.variant),
    description: "구매하신 스트링 교체 패키지입니다.",
    validityPeriod: packageInfo.validityPeriod,
    features: Array.isArray(packageInfo.features) ? packageInfo.features : undefined,
    benefits: Array.isArray(packageInfo.benefits) ? packageInfo.benefits : undefined,
    popular: Number(packageInfo.sessions) === 30,
  });
  const lookupHref = "/mypage?tab=passes";

  return (
    <>
      <BackButtonGuard />
      <div className="min-h-full bg-background">
        <div className="border-b border-border bg-background text-foreground">
          <SiteContainer className="py-8 md:py-12">
            <ResultState
              status={packageResultPresentation.status}
              title={packageResultPresentation.title}
              description={packageResultPresentation.description}
              className="px-0 py-0 sm:py-0"
            >
              <PublicSurface variant="muted" className="space-y-4">
                <div className="grid grid-cols-1 text-ui-body-sm md:grid-cols-3 md:divide-x md:divide-border">
                  <div className="border-b border-border p-4 md:border-b-0">
                    <p className="font-semibold text-foreground">{paymentStatusLabel}</p>
                    <p className="mt-1 text-muted-foreground">{paymentMethodLabel}</p>
                  </div>
                  <div className="border-b border-border p-4 md:border-b-0">
                    <p className="font-semibold text-foreground">{activationStatusLabel}</p>
                    <p className="mt-1 text-muted-foreground">{activationDescription}</p>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-foreground">
                      {packageResultPresentation.nextActionTitle}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {packageResultPresentation.nextActionDescription}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  {canStartStringingService ? (
                    <Button variant="default" className="h-12 flex-1 font-semibold" asChild>
                      <Link href="/services#service-start" className="flex items-center gap-2">
                        교체서비스 시작하기
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    variant={canStartStringingService ? "outline" : "default"}
                    className="h-12 flex-1 font-semibold"
                    asChild
                  >
                    <Link href={lookupHref} className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      패키지권 확인
                    </Link>
                  </Button>
                </div>
              </PublicSurface>
            </ResultState>
          </SiteContainer>
        </div>

        <SiteContainer className="py-8 md:py-10">
          <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
            {/* 패키지 주문 정보 카드 */}
            <SummaryCard
              variant="feature"
              className="overflow-hidden"
              title={
                <span className="flex items-center gap-3 text-ui-section-title sm:text-ui-section-title-lg">
                  <Package className="h-6 w-6 text-primary" />
                  패키지 주문 정보
                </span>
              }
              description={
                <span className="break-all text-ui-body-sm text-muted-foreground">
                  문의 시 확인 번호:{" "}
                  <span className="font-mono text-ui-body-sm font-semibold text-primary">
                    {packageOrder._id.toString()}
                  </span>
                </span>
              }
              footer={
                <div className="flex w-full flex-col gap-3 sm:flex-row md:gap-4">
                  <Button variant="default" className="h-12 flex-1" asChild>
                    <Link href={lookupHref} className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      패키지권 확인
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-12 flex-1 border border-border" asChild>
                    <Link href="/services/packages" className="flex items-center gap-2">
                      <Gift className="h-5 w-5" />
                      다른 패키지 보기
                    </Link>
                  </Button>
                </div>
              }
            >
              {/* 패키지 정보 */}
              <div className="mb-6 md:mb-8">
                <UnifiedPackageCard pkg={packageCard} showTotalPrice className="shadow-none" />
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <div className="space-y-4">
                  <PublicSurface variant="muted" padding="sm" className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-ui-body-sm text-muted-foreground">주문일자</p>
                      <p className="font-semibold text-foreground">
                        {new Date(packageOrder.createdAt).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}
                      </p>
                    </div>
                  </PublicSurface>
                  <PublicSurface variant="muted" padding="sm" className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <div className="min-w-0">
                      <p className="text-ui-body-sm text-muted-foreground">결제 방법</p>
                      <p className="break-words font-semibold text-foreground">
                        {paymentMethodLabel}
                      </p>
                    </div>
                  </PublicSurface>
                  <PublicSurface variant="muted" padding="sm" className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-ui-body-sm text-muted-foreground">결제 상태</p>
                      <p className="font-semibold text-foreground">{paymentStatusLabel}</p>
                      <p className="mt-2 text-ui-body-sm text-muted-foreground">활성화 상태</p>
                      <p className="font-semibold text-foreground">{activationStatusLabel}</p>
                    </div>
                  </PublicSurface>
                  <PublicSurface variant="inverse" padding="sm" className="rounded-control">
                    <div className="flex items-end justify-between gap-4 text-ui-card-title-lg font-semibold sm:text-ui-section-title">
                      <span>총 결제 금액</span>
                      <span className="shrink-0 text-brand-highlight">
                        {formatPaymentTotalAmount(paymentTotalAmount)}
                      </span>
                    </div>
                  </PublicSurface>
                </div>

                {shouldShowBankAccount ? (
                  <PublicSurface variant="muted" padding="sm">
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">입금 계좌 정보</h3>
                    </div>
                    {paymentInfo?.bank && bankLabelMap[paymentInfo.bank] ? (
                      <PublicSurface variant="default" padding="sm" className="space-y-2">
                        <div className="font-semibold text-foreground">
                          {bankLabelMap[paymentInfo.bank].label}
                        </div>
                        <div className="break-all font-mono text-ui-card-title-lg font-semibold text-foreground">
                          {bankLabelMap[paymentInfo.bank].account}
                        </div>
                        <div className="text-ui-body-sm text-muted-foreground">
                          예금주: {bankLabelMap[paymentInfo.bank].holder}
                        </div>
                      </PublicSurface>
                    ) : (
                      <p className="text-muted-foreground">선택된 은행 없음</p>
                    )}
                    <div className="mt-4 rounded-lg border border-border bg-card p-3">
                      <p className="text-ui-body-sm font-semibold text-foreground">
                        입금 기한: {new Date(packageOrder.createdAt).toLocaleDateString("ko-KR")}{" "}
                        23:59까지
                      </p>
                    </div>
                  </PublicSurface>
                ) : isOnlinePayment ? (
                  <PublicSurface variant="muted" padding="sm">
                    <h3 className="font-semibold text-foreground mb-3">
                      {isNicePayment ? "카드/간편결제 정보" : "토스 결제 정보"}
                    </h3>
                    <p className="text-ui-body-sm text-muted-foreground">
                      결제 상태: {paymentStatusLabel}
                    </p>
                    {approvedAt ? (
                      <p className="mt-1 text-ui-body-sm text-muted-foreground">
                        승인 시각: {approvedAt.toLocaleString("ko-KR")}
                      </p>
                    ) : null}
                  </PublicSurface>
                ) : null}
              </div>

              <div className="my-6 border-t border-border" />

              {/* 신청자 정보 */}
              <div className="mb-6">
                <h3 className="flex items-center gap-2 font-semibold text-ui-card-title-lg mb-4 text-foreground">
                  <MapPin className="h-5 w-5 text-primary" />
                  신청자 정보
                </h3>
                <PublicSurface variant="muted" padding="sm" className="space-y-2">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="min-w-0">
                      <span className="text-ui-body-sm text-muted-foreground">신청자:</span>
                      <span className="ml-2 break-words font-semibold text-foreground">
                        {serviceInfo?.name || "정보 없음"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-ui-body-sm text-muted-foreground">연락처:</span>
                      <span className="ml-2 break-words font-semibold text-foreground">
                        {formatKoreanPhone(serviceInfo?.phone) || "정보 없음"}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="text-ui-body-sm text-muted-foreground">이메일:</span>
                    <span className="ml-2 break-words font-semibold text-foreground">
                      {serviceInfo?.email || "정보 없음"}
                    </span>
                  </div>

                  {serviceInfo?.serviceRequest && (
                    <div className="min-w-0">
                      <span className="text-ui-body-sm text-muted-foreground">
                        서비스 요청사항:
                      </span>
                      <span className="ml-2 break-words font-semibold text-foreground">
                        {serviceInfo.serviceRequest}
                      </span>
                    </div>
                  )}
                </PublicSurface>
              </div>

              <div className="px-4 md:px-6">
                <DevMarkPaidButton
                  orderId={packageOrder._id.toString()}
                  show={canShowDevMarkPaidButton}
                />
              </div>
            </SummaryCard>

            {/* 안내사항 */}
            <SummaryCard
              variant="feature"
              title={
                <span className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  패키지 이용 안내사항
                </span>
              }
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <div className="space-y-4">
                  <PublicSurface variant="muted" padding="sm" className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">
                        {isTossPayment || isNicePayment ? "결제 안내" : "입금 안내"}
                      </h4>
                      <p className="text-ui-body-sm text-muted-foreground">
                        {activationDescription}
                      </p>
                    </div>
                  </PublicSurface>
                  <PublicSurface variant="muted" padding="sm" className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">사용 안내</h4>
                      <p className="text-ui-body-sm text-muted-foreground">
                        교체서비스 신청이 완료되면 패키지 이용 횟수가 1회 차감됩니다.
                      </p>
                    </div>
                  </PublicSurface>
                </div>
                <div className="space-y-4">
                  <PublicSurface variant="muted" padding="sm" className="flex items-start gap-3">
                    <Star className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">유효기간</h4>
                      <p className="text-ui-body-sm text-muted-foreground">
                        패키지는 {packageCard.validityPeriod} 동안 유효하며, 기간 내 모든 횟수를
                        이용해주세요.
                      </p>
                    </div>
                  </PublicSurface>
                  <PublicSurface variant="muted" padding="sm" className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">고객 지원</h4>
                      <p className="text-ui-body-sm text-muted-foreground">
                        패키지 관련 문의는 고객센터(010-5218-5248)로 연락해주세요.
                      </p>
                    </div>
                  </PublicSurface>
                </div>
              </div>
            </SummaryCard>
          </div>
        </SiteContainer>
      </div>
    </>
  );
}
