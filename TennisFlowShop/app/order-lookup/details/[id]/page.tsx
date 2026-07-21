"use client";

import {
  getOrderShippingReadLabels,
  normalizeOrderShippingMethod,
} from "@/app/features/stringing-applications/lib/fulfillment-labels";
import { hasCompletedStringingApplication } from "@/app/order-lookup/_lib/stringing-status";
import SiteContainer from "@/components/layout/SiteContainer";
import { EmptyState, PublicPageHero, ResultState } from "@/components/public";
import LoginGate from "@/components/system/LoginGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { badgeToneVariant, getOrderStatusTone, getPaymentStatusTone } from "@/lib/badge-style";
import { bankLabelMap } from "@/lib/constants";
import { getPaymentDisplaySummary } from "@/lib/payments/payment-display";
import { formatKoreanPhone } from "@/lib/phone";
import { getOrderStatusLabelForDisplay, isVisitPickupOrder } from "@/lib/order-shipping";
import {
  getCommonApplicationStatusLabel,
  getCommonOrderStatusLabel,
} from "@/lib/status-labels/base";
import { getGuestOrderNextActionText } from "@/app/order-lookup/_lib/guestOrderNextAction";
import { getCustomerOrderPaymentStatusLabel } from "@/app/mypage/_lib/flow-display";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  MapPin,
  Package,
  Phone,
  Shield,
  ShoppingBag,
  Store,
  Truck,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// 주문 상세 타입 정의
interface OrderDetail {
  _id: string;
  createdAt: string;
  shippingInfo: {
    name: string;
    phone: string;
    address: string;
    deliveryMethod?: string;
    shippingMethod?: string;
    withStringService?: boolean;
    invoice?: {
      courier?: string;
      trackingNumber?: string;
    };
  };
  isStringServiceApplied?: boolean;
  stringingApplicationId?: string | null;
  stringingApplications?: {
    id: string;
    status: string;
    createdAt?: string | null;
    racketCount?: number;
    receptionLabel?: string;
    tensionSummary?: string | null;
    stringNames?: string[];
    reservationLabel?: string | null;
  }[];
  paymentInfo?: {
    status?: string | null;
    method?: string | null;
    provider?: string | null;
    easyPayProvider?: string | null;
    cardDisplayName?: string | null;
    cardCompany?: string | null;
    cardLabel?: string | null;
    depositor?: string | null;
    bank?: "shinhan" | "kookmin" | "woori";
  };
  totalPrice: number | null;
  shippingFee: number;
  status: string;
  paymentStatus?: string | null;
  paymentMethod?: string;
  trackingNumber?: string;
  items: {
    id?: string;
    name: string;
    option?: string;
    price: number;
    quantity: number;
    image?: string;
  }[];
}

type TrackingResponse =
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

const getTrackingFailureMessage = (tracking: Extract<TrackingResponse, { success: false }>) => {
  if (tracking.errorCode === "UNAUTHENTICATED" || tracking.errorCode === "FORBIDDEN") {
    return "배송조회 서비스 설정을 확인해주세요.";
  }
  if (tracking.errorCode === "BAD_REQUEST") {
    return "운송장 번호 형식이 올바르지 않습니다.";
  }
  return tracking.message || "배송조회 정보를 불러오지 못했습니다.";
};

type GuestOrderMode = "off" | "legacy" | "on";

function getGuestOrderModeClient(): GuestOrderMode {
  // 클라이언트에서는 NEXT_PUBLIC_만 접근 가능
  // env가 없으면 legacy로 기본값 처리(= 신규 비회원 주문은 막고, 기존 조회만 유지 가능)
  const raw = (process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? "legacy").trim();
  return raw === "off" || raw === "legacy" || raw === "on" ? raw : "legacy";
}

const getStatusIcon = (status: string, isVisitPickup: boolean) => {
  switch (status) {
    case "배송완료":
      return <CheckCircle className="w-5 h-5" />;
    case "배송중":
      return isVisitPickup ? <Store className="w-5 h-5" /> : <Truck className="w-5 h-5" />;
    case "배송준비중":
      return <Clock className="w-5 h-5" />;
    default:
      return <Package className="w-5 h-5" />;
  }
};

const getLookupOrderStatusLabel = (status?: string, shippingLike?: any) => {
  const normalized = String(status ?? "").trim();
  const baseLabel = getCommonOrderStatusLabel(normalized) ?? normalized;
  if (!baseLabel) return "배송준비중";
  return getOrderStatusLabelForDisplay(baseLabel, shippingLike);
};

const getLookupApplicationStatusLabel = (status?: string) => {
  const normalized = String(status ?? "").trim();
  const commonLabel = getCommonApplicationStatusLabel(normalized);
  if (commonLabel) return commonLabel;

  const lower = normalized.toLowerCase();
  const lookupFallbackMap: Record<string, string> = {
    draft: "접수완료",
    reviewing: "검토 중",
    processing: "검토 중",
    completed: "교체완료",
    canceled: "취소",
    cancelled: "취소",
  };

  return lookupFallbackMap[lower] ?? normalized;
};

type TimelineStepState = "done" | "active" | "waiting";

type TimelineStep = {
  title: string;
  description: string;
  state: TimelineStepState;
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

const getTimelineStateLabel = (state: TimelineStepState) => {
  if (state === "done") return "완료";
  if (state === "active") return "진행 중";
  return "대기";
};

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;

  // 비회원 주문 조회(게스트) 접근 허용 여부(클라)
  const guestOrderMode = getGuestOrderModeClient();
  const allowGuestLookup = guestOrderMode !== "off";

  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<TrackingResponse | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  useEffect(() => {
    if (!allowGuestLookup) {
      setLoading(false);
      return;
    }
    const fetchOrderDetail = async () => {
      try {
        const res = await fetch(`/api/guest-orders/${orderId}`, {
          credentials: "include",
        });
        const data = await res.json();

        if (data.success && data.order) {
          setOrder(data.order);
        } else {
          setError("주문 정보를 확인할 수 없습니다.");
        }
      } catch (err) {
        console.error("주문 상세 정보 조회 중 오류 발생:", err);
        setError("주문 정보를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [params.id, allowGuestLookup]);

  if (!allowGuestLookup) {
    return <LoginGate next="/mypage" variant="orderLookup" />;
  }

  // 주문 목록으로 돌아가기
  const handleGoBack = () => {
    router.back();
  };

  const hasStringingApplication = hasCompletedStringingApplication(order ?? {});
  const latestStringingApplication =
    Array.isArray(order?.stringingApplications) && order.stringingApplications.length > 0
      ? [...order.stringingApplications].sort(
          (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
        )[0]
      : null;

  // 금액 포맷팅 함수
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      currencyDisplay: "symbol",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-background">
        <PublicPageHero
          align="center"
          title={<Skeleton className="mx-auto h-10 w-72 max-w-full" />}
          description={<Skeleton className="mx-auto h-6 w-52 max-w-full" />}
        >
          <Skeleton className="mx-auto h-14 w-14 rounded-full" />
        </PublicPageHero>

        <SiteContainer className="py-8 md:py-12">
          <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
            <Skeleton className="h-5 w-40" />

            {Array.from({ length: 3 }).map((_, index) => (
              <Card
                key={index}
                className="rounded-2xl border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50"
              >
                <CardHeader className="space-y-2 rounded-t-2xl border-b border-border/60 bg-secondary/30 p-4 bp-sm:p-5">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-64 max-w-full" />
                </CardHeader>
                <CardContent className="space-y-3 p-4 bp-sm:p-5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[88%]" />
                  <Skeleton className="h-4 w-[72%]" />
                </CardContent>
              </Card>
            ))}
          </div>
        </SiteContainer>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-full bg-background">
        <SiteContainer className="flex min-h-[60vh] items-center py-10 md:py-16">
          <ResultState
            status="error"
            title="주문 정보를 확인할 수 없습니다"
            description={error}
            actions={
              <>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/order-lookup">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    주문 다시 조회하기
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href="/board/qna/write">고객센터 문의하기</Link>
                </Button>
              </>
            }
          />
        </SiteContainer>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-full bg-background">
        <SiteContainer className="py-10 md:py-14">
          <EmptyState
            title="주문 정보를 확인할 수 없습니다"
            description="조회 정보가 만료되었거나 주문 시 입력한 정보와 일치하지 않을 수 있어요. 다시 조회하거나 고객센터로 문의해주세요."
            action={
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/order-lookup">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    주문 다시 조회하기
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href="/board/qna/write">고객센터 문의하기</Link>
                </Button>
              </div>
            }
          />
        </SiteContainer>
      </div>
    );
  }

  const rawShippingMethod =
    order.shippingInfo?.shippingMethod ?? order.shippingInfo?.deliveryMethod;
  const orderShippingMethod = normalizeOrderShippingMethod(rawShippingMethod);
  // 비회원 주문 상세도 공용 방문 수령 판별 유틸로 통일해 화면/서버 정책 판단 기준을 맞춘다.
  const isVisitPickup = isVisitPickupOrder(order.shippingInfo);
  const orderShippingReadLabels = getOrderShippingReadLabels(orderShippingMethod);
  const shippingCardTitle = orderShippingReadLabels.sectionTitle;
  const shippingAddressLabel = orderShippingReadLabels.primaryLabel;
  const shippingAddressValue = isVisitPickup
    ? orderShippingReadLabels.primaryValue
    : order.shippingInfo.address;
  const displayStatus = getLookupOrderStatusLabel(order.status, order.shippingInfo);
  const orderPaymentInfo = order.paymentInfo as Record<string, unknown> | undefined;
  const rawPaymentStatus =
    String(order.paymentStatus ?? "").trim() ||
    String(order.paymentInfo?.status ?? "").trim() ||
    null;
  const paymentStatusLabel = getCustomerOrderPaymentStatusLabel({
    paymentStatus: rawPaymentStatus,
    paymentMethod: order.paymentMethod ?? order.paymentInfo?.method ?? null,
    paymentProvider: order.paymentInfo?.provider ?? null,
    totalPrice: order.totalPrice,
  });
  const nextActionText = getGuestOrderNextActionText({
    status: order.status,
    displayStatus,
    paymentStatusLabel,
    shippingLike: order.shippingInfo,
  });
  const trackingNumber = order.shippingInfo?.invoice?.trackingNumber ?? order.trackingNumber;
  const canTrack = !isVisitPickup && Boolean(trackingNumber);
  const isUnsupportedCourier =
    String(order.shippingInfo?.invoice?.courier ?? "")
      .trim()
      .toLowerCase() === "etc";
  const unsupportedCourierMessage = "현재 택배사는 자동 배송조회가 지원되지 않습니다.";

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

  const handleTrackingClick = async () => {
    if (!canTrack || trackingLoading) return;
    if (isUnsupportedCourier) {
      setTrackingError(unsupportedCourierMessage);
      return;
    }
    setTrackingLoading(true);
    setTrackingError(null);
    try {
      const res = await fetch(`/api/guest-orders/${order._id}/tracking`, {
        credentials: "include",
      });
      const data = (await res.json()) as TrackingResponse;
      setTrackingInfo(data);
      if (!res.ok) {
        if (!data.success) {
          setTrackingError(getTrackingFailureMessage(data));
        } else {
          setTrackingError((data as any)?.message ?? "배송조회 정보를 불러오지 못했습니다.");
        }
        return;
      }
      if (data.success && data.supported) {
        window.open(data.linkUrl, "_blank", "noopener,noreferrer");
        return;
      }
      if (data.success && !data.supported) {
        setTrackingError(data.message);
        return;
      }
      setTrackingError(getTrackingFailureMessage(data));
    } catch {
      setTrackingError("배송조회 정보를 불러오지 못했습니다.");
    } finally {
      setTrackingLoading(false);
    }
  };

  const normalizedStatus = String(order.status ?? "")
    .trim()
    .toLowerCase();
  const paymentDisplaySummary = getPaymentDisplaySummary({
    method: order.paymentMethod ?? orderPaymentInfo?.method,
    provider: orderPaymentInfo?.provider,
    easyPayProvider: orderPaymentInfo?.easyPayProvider,
    cardDisplayName: orderPaymentInfo?.cardDisplayName,
    cardCompany: orderPaymentInfo?.cardCompany,
    cardLabel: orderPaymentInfo?.cardLabel,
    niceCard: orderPaymentInfo?.niceCard,
    rawSummary: orderPaymentInfo?.rawSummary,
    bank: orderPaymentInfo?.bank,
    depositor: orderPaymentInfo?.depositor,
  });
  const normalizedProvider = String(order.paymentInfo?.provider ?? "")
    .trim()
    .toLowerCase();
  const isOnlinePayment =
    normalizedProvider === "nicepay" ||
    normalizedProvider === "tosspayments" ||
    normalizedProvider === "toss";
  const hasBankInfo = Boolean(order.paymentInfo?.bank && bankLabelMap[order.paymentInfo.bank]);
  const shouldShowBankInfo =
    paymentStatusLabel !== "결제 불필요" && !isOnlinePayment && hasBankInfo;
  const receivedDone = Boolean(order.createdAt);
  const isPaymentResolved = ["결제 완료", "결제 불필요"].includes(paymentStatusLabel);
  const isPaymentPending = [
    "입금 확인 대기",
    "결제 확인 대기",
    "결제 또는 입금 확인 대기",
  ].includes(paymentStatusLabel);
  const isPaymentFailed = paymentStatusLabel === "결제 실패";
  const paymentDone = isPaymentResolved;
  const isPreparing = ["processing", "preparing", "배송준비", "배송준비중", "처리중"].some(
    (keyword) => normalizedStatus.includes(keyword),
  );
  const isShipped = ["shipped", "배송중"].some((keyword) => normalizedStatus.includes(keyword));
  const isDelivered = ["delivered", "배송완료"].some((keyword) =>
    normalizedStatus.includes(keyword),
  );
  const isCompleted = ["confirmed", "completed", "구매확정"].some((keyword) =>
    normalizedStatus.includes(keyword),
  );
  const paymentTimelineDescription =
    paymentStatusLabel === "결제 완료"
      ? "결제가 완료되었습니다."
      : paymentStatusLabel === "결제 불필요"
        ? "추가 결제 없이 접수된 주문입니다."
        : paymentStatusLabel === "입금 확인 대기"
          ? "입금 또는 입금 확인을 기다리고 있습니다."
          : paymentStatusLabel === "결제 확인 대기" ||
              paymentStatusLabel === "결제 또는 입금 확인 대기"
            ? "결제 승인 상태를 확인하고 있습니다."
            : isPaymentFailed
              ? "결제가 완료되지 않았습니다. 상태 확인이 필요합니다."
              : "결제 상태를 확인하고 다음 절차를 준비합니다.";

  const timelineSteps: TimelineStep[] = [
    {
      title: "주문 접수",
      description: "주문이 정상적으로 접수되었습니다.",
      state: receivedDone ? "done" : "waiting",
    },
    {
      title: "결제 확인",
      description: paymentTimelineDescription,
      state: paymentDone ? "done" : isPaymentPending || isPaymentFailed ? "active" : "waiting",
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
      title: isVisitPickup ? "수령 준비" : "배송/수령 진행",
      description: isVisitPickup
        ? "매장 수령 준비 상태를 확인해주세요."
        : "배송 정보를 확인해주세요.",
      state: isDelivered || isCompleted ? "done" : isShipped ? "active" : "waiting",
    },
    {
      title: "완료/구매확정",
      description: "주문 이용이 마무리된 단계입니다.",
      state: isCompleted ? "done" : isDelivered ? "active" : "waiting",
    },
  ];

  const shouldShowStringingTimelineHint = Boolean(
    order.shippingInfo?.withStringService || hasStringingApplication,
  );

  return (
    <div className="min-h-full bg-background">
      <PublicPageHero
        align="center"
        eyebrow="비회원 주문 상세"
        title="주문 상세 정보"
        description={`주문번호 ${order._id.slice(-8)}의 현재 상태와 다음 해야 할 일을 확인하세요.`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
            <Package className="h-7 w-7" />
          </div>
          <Badge
            variant={badgeToneVariant(getOrderStatusTone(displayStatus))}
            className="gap-2 px-4 py-2 text-ui-body font-semibold"
          >
            {getStatusIcon(displayStatus, isVisitPickup)}
            {displayStatus}
          </Badge>
        </div>
      </PublicPageHero>

      <SiteContainer className="py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <div className="mb-6 md:mb-8">
            <Button
              variant="ghost"
              className="inline-flex items-center text-ui-body-sm text-muted-foreground hover:text-primary transition-colors group"
              onClick={handleGoBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              주문 목록으로 돌아가기
            </Button>
          </div>

          {nextActionText && (
            <div className="mb-6 border-l-2 border-primary/40 bg-primary/5 px-3 py-2 md:mb-8">
              <p className="text-ui-body-sm font-medium text-foreground bp-md:text-ui-body">
                현재 진행 안내
              </p>
              <p className="mt-1 text-ui-body-sm text-muted-foreground bp-md:text-ui-body">
                {nextActionText}
              </p>
            </div>
          )}

          <details className="group mb-6 md:mb-8 bp-md:block">
            <summary className="cursor-pointer rounded-xl border-0 bg-card p-4 shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50 font-semibold text-foreground bp-md:hidden">
              진행 단계
            </summary>
            <Card className="mt-3 hidden rounded-xl border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50 group-open:block bp-md:block">
              <CardHeader className="rounded-t-xl border-b border-border/60 bg-secondary/30 p-4 bp-sm:p-5">
                <CardTitle className="text-ui-body">주문 진행 타임라인</CardTitle>
                <p className="text-ui-body-sm text-muted-foreground">
                  주문 접수부터 결제, 준비, 배송/수령, 완료까지의 흐름을 확인할 수 있습니다.
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {timelineSteps.map((step, index) => {
                  const tone = getTimelineStepTone(step.state);
                  const Icon =
                    step.state === "active" && !isVisitPickup && step.title.includes("배송")
                      ? Truck
                      : tone.Icon;
                  return (
                    <div
                      key={step.title}
                      className="border-t border-border/60 py-4 first:border-t-0"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${tone.wrapper}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">
                              {index + 1}. {step.title}
                            </p>
                            <Badge className={`px-2 py-0.5 text-ui-caption ${tone.badge}`}>
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
                <div className="mt-2 border-l-2 border-border bg-muted/20 px-3 py-2 text-ui-label text-muted-foreground">
                  <p>이 타임라인은 현재 상태 기준 안내입니다.</p>
                  <p>주문 정보와 배송/수령 정보에서 세부 상태를 함께 확인할 수 있습니다.</p>
                  {shouldShowStringingTimelineHint && (
                    <p>
                      {hasStringingApplication
                        ? "아래 교체서비스 접수 요약에서 진행 상태를 확인해주세요."
                        : "교체서비스가 포함된 주문은 접수 후 이 화면의 요약에서 작업 진행 상태를 확인할 수 있습니다."}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </details>

          {/* String Service Alert */}
          {order.shippingInfo?.withStringService && (
            <Card className="mb-6 border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50 md:mb-8">
              <CardContent className="p-4 md:p-6">
                {!hasStringingApplication ? (
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-2">교체서비스 신청 가능</h3>
                      <p className="border-l-2 border-primary/40 bg-primary/5 px-3 py-2 text-muted-foreground mb-4">
                        {isVisitPickup
                          ? "이 주문은 스트링 장착 서비스가 포함되어 있습니다. 방문 수령 시 현장 장착으로 진행되며, 아직 접수된 신청서가 없어 신청을 진행할 수 있습니다."
                          : "이 주문은 스트링 장착 서비스가 포함되어 있습니다. 택배 수령 주문은 라켓 발송과 완성 라켓 배송으로 장착 서비스가 진행되며, 아직 접수된 신청서가 없어 신청을 진행할 수 있습니다."}
                      </p>
                      <Link
                        href={`/services/apply?orderId=${order._id}`}
                        className="inline-flex items-center rounded-lg border border-border bg-secondary px-4 py-2 font-semibold text-foreground transition-colors hover:bg-secondary/80"
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        {isVisitPickup ? "교체서비스 신청하기" : "교체서비스 신청하기"}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold text-foreground">
                        교체서비스 신청서 접수 완료
                      </h3>
                      <p className="text-foreground">
                        {isVisitPickup
                          ? "이미 접수된 신청서가 존재합니다. 방문 수령 시 접수된 내용에 따라 현장 장착이 진행됩니다."
                          : "이미 접수된 신청서가 존재합니다. 택배 장착 서비스는 접수된 내용에 따라 라켓 발송과 완성 라켓 배송으로 진행됩니다."}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 비회원 조회에서도 신청서 상세 진입 없이 핵심 맥락을 확인할 수 있게 요약 노출 */}
          {order.shippingInfo?.withStringService &&
            hasStringingApplication &&
            latestStringingApplication && (
              <Card className="mb-6 border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50 md:mb-8">
                <CardHeader className="rounded-t-xl border-b border-border/60 bg-secondary/30 p-4 bp-sm:p-5">
                  <CardTitle className="text-ui-body">교체서비스 접수 요약</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 p-4 text-ui-body-sm bp-sm:p-5 [&>p]:rounded-xl [&>p]:bg-muted/15 [&>p]:p-3">
                  <p className="text-muted-foreground">
                    신청 상태:{" "}
                    <span className="font-medium text-foreground">
                      {getLookupApplicationStatusLabel(latestStringingApplication.status)}
                    </span>
                  </p>
                  {latestStringingApplication.receptionLabel && (
                    <p className="text-muted-foreground">
                      접수 방식:{" "}
                      <span className="font-medium text-foreground">
                        {latestStringingApplication.receptionLabel}
                      </span>
                    </p>
                  )}
                  {typeof latestStringingApplication.racketCount === "number" &&
                    latestStringingApplication.racketCount > 0 && (
                      <p className="text-muted-foreground">
                        라인 수:{" "}
                        <span className="font-medium text-foreground">
                          {latestStringingApplication.racketCount}개
                        </span>
                      </p>
                    )}
                  {Array.isArray(latestStringingApplication.stringNames) &&
                    latestStringingApplication.stringNames.length > 0 && (
                      <p className="text-muted-foreground">
                        스트링:{" "}
                        <span className="font-medium text-foreground">
                          {latestStringingApplication.stringNames.join(", ")}
                        </span>
                      </p>
                    )}
                  {latestStringingApplication.tensionSummary && (
                    <p className="text-muted-foreground">
                      텐션:{" "}
                      <span className="font-medium text-foreground">
                        {latestStringingApplication.tensionSummary}
                      </span>
                    </p>
                  )}
                  {latestStringingApplication.reservationLabel && (
                    <p className="text-muted-foreground">
                      방문 예약:{" "}
                      <span className="font-medium text-foreground">
                        {latestStringingApplication.reservationLabel}
                      </span>
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

          <details className="group bp-md:block" open>
            <summary className="cursor-pointer rounded-xl border-0 bg-card p-4 shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50 font-semibold text-foreground bp-md:hidden">
              주문 상품
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-3">
              {/* Main Content */}
              <div className="space-y-6 md:space-y-8 lg:col-span-2">
                {/* 주문 정보 */}
                <Card className="border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
                  <CardHeader className="rounded-t-xl border-b border-border/60 bg-secondary/30 p-4 bp-sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary">
                        <Calendar className="w-5 h-5 text-foreground" />
                      </div>
                      <CardTitle className="text-ui-card-title-lg font-semibold">
                        주문 정보
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="grid gap-3">
                        <div className="py-3">
                          <p className="text-ui-body-sm text-muted-foreground mb-1">주문일자</p>
                          <p className="font-semibold">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="py-3">
                          <p className="text-ui-body-sm text-muted-foreground mb-1">주문번호</p>
                          <p className="break-all font-mono text-ui-body-sm">{order._id}</p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-muted/15 p-3">
                        <p className="text-ui-body-sm text-muted-foreground mb-2">결제수단</p>
                        <p className="mb-3 font-semibold text-foreground">
                          {paymentDisplaySummary.userLabel}
                        </p>
                        <p className="text-ui-body-sm text-muted-foreground mb-2">결제 상태</p>
                        <Badge
                          variant={badgeToneVariant(getPaymentStatusTone(paymentStatusLabel))}
                          className="mb-3 text-ui-label font-medium"
                        >
                          {paymentStatusLabel}
                        </Badge>
                        {shouldShowBankInfo && order.paymentInfo?.bank && (
                          <>
                            <p className="text-ui-body-sm text-muted-foreground mb-2">입금 계좌</p>
                            <div className="border-l-2 border-primary/40 bg-primary/5 px-3 py-2">
                              <div className="space-y-2">
                                <p className="font-semibold text-foreground">무통장입금</p>
                                <p className="font-semibold text-foreground">
                                  {bankLabelMap[order.paymentInfo.bank].label}
                                </p>
                                <p className="font-mono text-foreground">
                                  {bankLabelMap[order.paymentInfo.bank].account}
                                </p>
                                <p className="text-ui-body-sm text-muted-foreground">
                                  예금주: {bankLabelMap[order.paymentInfo.bank].holder}
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 배송 정보 */}
                <Card className="border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
                  <CardHeader className="rounded-t-xl border-b border-border/60 bg-secondary/30 p-4 bp-sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary">
                        <MapPin className="w-5 h-5 text-foreground" />
                      </div>
                      <CardTitle className="text-ui-card-title-lg font-semibold">
                        {shippingCardTitle}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="grid gap-3">
                        <div className="flex items-center gap-3 py-3">
                          <User className="w-5 h-5 text-foreground" />
                          <div>
                            <p className="text-ui-body-sm text-muted-foreground">수령인</p>
                            <p className="font-semibold">{order.shippingInfo.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 py-3">
                          <Phone className="w-5 h-5 text-foreground" />
                          <div>
                            <p className="text-ui-body-sm text-muted-foreground">연락처</p>
                            <p className="font-semibold">
                              {formatKoreanPhone(order.shippingInfo.phone) ||
                                order.shippingInfo.phone}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-3">
                        <div className="py-3">
                          <p className="text-ui-body-sm text-muted-foreground mb-1">
                            {shippingAddressLabel}
                          </p>
                          <p className="break-words font-semibold">{shippingAddressValue}</p>
                        </div>
                        {canTrack && (
                          <div className="flex items-center gap-3 rounded-xl bg-muted/15 px-3 py-2">
                            <Truck className="w-5 h-5 text-primary" />
                            <div className="flex-1">
                              <p className="text-ui-body-sm text-muted-foreground mb-1">
                                운송장 번호
                              </p>
                              <p className="font-mono font-semibold text-foreground">
                                {trackingNumber}
                              </p>
                              {trackingInfo?.success && trackingInfo.supported && (
                                <p className="mt-1 text-ui-body-sm text-foreground">
                                  실시간 배송 상태: {trackingInfo.displayStatus}
                                  {trackingInfo.lastEvent?.locationName
                                    ? ` · ${trackingInfo.lastEvent.locationName}`
                                    : ""}
                                  {trackingInfo.lastEvent?.time
                                    ? ` · ${formatDateTime(trackingInfo.lastEvent.time)}`
                                    : ""}
                                </p>
                              )}
                              {trackingError && (
                                <p className="mt-1 text-ui-body-sm text-muted-foreground">
                                  {trackingError}
                                </p>
                              )}
                              {!trackingError && isUnsupportedCourier && (
                                <p className="mt-1 text-ui-body-sm text-muted-foreground">
                                  {unsupportedCourierMessage}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="link"
                              className="p-0"
                              onClick={handleTrackingClick}
                              disabled={trackingLoading || isUnsupportedCourier}
                            >
                              {isUnsupportedCourier
                                ? "조회 불가"
                                : trackingLoading
                                  ? "조회 중..."
                                  : "배송 조회"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 주문 상품 */}
                <Card className="border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
                  <CardHeader className="rounded-t-xl border-b border-border/60 bg-secondary/30 p-4 bp-sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary">
                        <ShoppingBag className="w-5 h-5 text-foreground" />
                      </div>
                      <CardTitle className="text-ui-card-title-lg font-semibold">
                        주문 상품
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {order.items.map((item, index) => (
                        <div
                          key={item.id || index}
                          className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 md:flex-row"
                        >
                          <div className="h-24 w-full flex-shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border/60 md:w-24">
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              width={96}
                              height={96}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="mb-1 break-words font-semibold text-foreground">
                              {item.name}
                            </h4>
                            {item.option && (
                              <p className="text-ui-body-sm text-muted-foreground mb-2">
                                {item.option}
                              </p>
                            )}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-4 text-ui-body-sm text-muted-foreground">
                                <span>단가: {formatCurrency(item.price)}</span>
                                <span>수량: {item.quantity}개</span>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-ui-price-lg text-primary">
                                  {formatCurrency(item.price * item.quantity)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - 결제 정보 */}
              <div className="lg:col-span-1">
                <Card className="sticky top-8 border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
                  <CardHeader className="rounded-t-xl border-b border-border/60 bg-secondary/30 p-4 bp-sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary">
                        <CreditCard className="w-5 h-5 text-foreground" />
                      </div>
                      <CardTitle className="text-ui-card-title-lg font-semibold">
                        결제 정보
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0 break-words text-muted-foreground">상품 금액</span>
                        <span className="shrink-0 whitespace-nowrap text-right font-semibold tabular-nums">
                          {typeof order.totalPrice === "number"
                            ? formatCurrency(order.totalPrice - order.shippingFee)
                            : "금액 확인 중"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0 break-words text-muted-foreground">배송비</span>
                        <span className="shrink-0 whitespace-nowrap text-right font-semibold tabular-nums">
                          {order.shippingFee > 0 ? formatCurrency(order.shippingFee) : "무료"}
                        </span>
                      </div>
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0 break-words text-ui-price-lg font-semibold text-foreground">
                          총 결제금액
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-right text-ui-price-lg font-semibold tabular-nums text-primary">
                          {typeof order.totalPrice === "number"
                            ? formatCurrency(order.totalPrice)
                            : "금액 확인 중"}
                        </span>
                      </div>

                      {/* Benefits */}
                      <div className="mt-6 space-y-3">
                        <div className="flex items-center gap-3 rounded-xl bg-muted/15 px-3 py-2">
                          <Shield className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-ui-body-sm font-medium text-foreground">
                              안전한 결제
                            </p>
                            <p className="text-ui-label text-muted-foreground">
                              SSL 보안 결제 시스템
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl bg-muted/15 px-3 py-2">
                          <Truck className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-ui-body-sm font-medium text-foreground">배송 보장</p>
                            <p className="text-ui-label text-muted-foreground">
                              상품에 따라 배송비가 다를 수 있습니다.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-6">
                    <Button
                      variant="outline"
                      onClick={handleGoBack}
                      className="w-full bg-transparent"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      주문 목록으로 돌아가기
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </details>
        </div>
      </SiteContainer>
    </div>
  );
}
