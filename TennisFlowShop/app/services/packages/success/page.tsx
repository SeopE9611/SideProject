import BackButtonGuard from "@/app/checkout/success/_components/BackButtonGuard";
import UnifiedPackageCard from "@/app/services/packages/_components/UnifiedPackageCard";
import { normalizePackageCardData } from "@/app/services/packages/_lib/packageCard";
import { toPackageVariant } from "@/app/services/packages/_lib/packageVariant";
import DevMarkPaidButton from "@/app/services/packages/success/DevMarkPaidButton";
import HeroCourtBackdrop from "@/components/system/HeroCourtBackdrop";
import LoginGate from "@/components/system/LoginGate";
import { PublicSurface, SummaryCard } from "@/components/public";
import { Button } from "@/components/ui/button";
import { getPaymentDisplaySummary } from "@/lib/payments/payment-display";
import { formatKoreanPhone } from "@/lib/phone";
import { verifyAccessToken } from "@/lib/auth.utils";
import { bankLabelMap } from "@/lib/constants";
import clientPromise from "@/lib/mongodb";
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
import { ObjectId } from "mongodb";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "패키지 결제 완료",
};

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
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

  // 비회원 주문/신청 차단 모드면, 패키지 success 페이지도 로그인 필수로 막는다.
  // (packageOrderId만으로 주문 정보가 렌더링되는 것을 DB 조회 전에 차단)
  const guestOrderMode = (
    process.env.GUEST_ORDER_MODE ??
    process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ??
    "legacy"
  ).trim();
  const allowGuestCheckout = guestOrderMode === "on";
  if (!allowGuestCheckout) {
    const gateCookieStore = await cookies();
    const token = gateCookieStore.get("accessToken")?.value;
    const payload = safeVerifyAccessToken(token);
    if (!payload?.sub) {
      const qs = new URLSearchParams();
      qs.set("packageOrderId", String(packageOrderId));
      const next = `/services/packages/success?${qs.toString()}`;
      return <LoginGate next={next} variant="checkout" />;
    }
  }

  const client = await clientPromise;
  const db = client.db();
  const packageOrder = await db
    .collection("packageOrders")
    .findOne({ _id: new ObjectId(packageOrderId) });

  if (!packageOrder) return notFound();

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  let isLoggedIn = false;
  if (refreshToken) {
    try {
      jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
      isLoggedIn = true;
    } catch {}
  }

  // --- 관리자 판별 ---
  const cookieStore2 = await cookies();
  const accessToken = cookieStore2.get("accessToken")?.value;

  let authPayload: any = null;
  try {
    if (accessToken) authPayload = verifyAccessToken(accessToken);
  } catch {}
  if (!authPayload && refreshToken) {
    try {
      authPayload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
    } catch {}
  }

  // 토큰 페이로드 기반
  const tokenIsAdmin =
    authPayload?.role === "admin" ||
    authPayload?.roles?.includes?.("admin") ||
    authPayload?.isAdmin === true;

  // 이메일 화이트리스트(옵션)
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const emailIsAdmin = ADMIN_EMAILS.includes((authPayload?.email ?? "").toLowerCase());

  const isAdmin = tokenIsAdmin || emailIsAdmin;

  // 운영 긴급 노출 스위치
  const showDevBtn = isAdmin || process.env.NEXT_PUBLIC_SHOW_DEV_BUTTON === "1";

  // 안전한 가격 표시 함수
  const formatPrice = (price: any): string => {
    const numPrice = Number(price);
    return isNaN(numPrice) || numPrice === null || numPrice === undefined
      ? "0"
      : numPrice.toLocaleString();
  };

  const packageInfo = packageOrder.packageInfo;
  const serviceInfo = packageOrder.serviceInfo;
  const paymentInfo = packageOrder.paymentInfo;
  const paymentSummary = getPaymentDisplaySummary({
    method: paymentInfo?.method,
    provider: paymentInfo?.provider ?? "manual_bank_transfer",
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
  const isPaid = String(packageOrder.paymentStatus ?? "") === "결제완료";
  const normalizedPaymentProvider = String(paymentInfo?.provider ?? "")
    .trim()
    .toLowerCase();
  const isNicePayment = normalizedPaymentProvider === "nicepay";
  const isTossPayment = normalizedPaymentProvider === "tosspayments";

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
  const isOnlinePayment = isTossPayment || isNicePayment;
  const lookupHref = isLoggedIn
    ? "/mypage?tab=passes"
    : `/package-lookup/details/${packageOrder._id}`;

  return (
    <>
      <BackButtonGuard />
      <div className="min-h-full bg-background">
        {/* Hero Section */}
        <div className="relative overflow-hidden border-b border-border bg-muted/20 text-foreground">
          <div className="absolute inset-0 bg-overlay/10"></div>
          <HeroCourtBackdrop className="h-full w-full text-primary opacity-[0.05] dark:opacity-[0.08]" />
          <div className="relative container py-8 md:py-12">
            <div className="text-center">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h1 className="mb-3 text-ui-page-title font-semibold sm:text-ui-page-title-lg md:text-ui-page-title-lg">
                {isOnlinePayment ? "패키지 결제가 완료되었습니다" : "패키지 주문이 접수되었습니다"}
              </h1>
              <p className="mx-auto mb-5 max-w-2xl break-keep text-ui-body-lg leading-relaxed text-muted-foreground sm:text-ui-card-title-lg">
                {isOnlinePayment
                  ? "결제가 확인되어 패키지가 즉시 활성화되었습니다. 아래에서 주문 요약과 다음 행동을 확인해주세요."
                  : "주문 정보가 접수되었습니다. 입금 확인 후 패키지가 활성화되며, 활성화 전에는 패키지 사용이 제한됩니다."}
              </p>

              <div className="flex flex-wrap justify-center gap-2 text-ui-body-sm sm:gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                  <Shield className="h-4 w-4 text-success" />
                  <span>{isOnlinePayment ? "결제 완료" : "주문 접수"}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{isPaid ? "패키지 활성화 완료" : "패키지 활성화 대기"}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                  <Package className="h-4 w-4 text-primary" />
                  <span>{isPaid ? "바로 신청 가능" : "입금 확인 필요"}</span>
                </div>
              </div>
            </div>

            {/* 패키지 활성화 안내 */}
            <div className="mx-auto mt-6 max-w-4xl">
              <PublicSurface className="space-y-4">
                <div className="grid grid-cols-1 gap-3 text-ui-body-sm md:grid-cols-3">
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="font-semibold text-foreground">
                      {isOnlinePayment ? "결제 완료" : "주문 접수"}
                    </p>
                    <p className="mt-1 text-muted-foreground">{paymentMethodLabel}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="font-semibold text-foreground">
                      {isPaid ? "패키지 즉시 활성화" : "입금 확인 후 활성화"}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {isPaid ? "현재 사용 가능합니다" : "입금 전 사용 불가"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="font-semibold text-foreground">다음 행동</p>
                    <p className="mt-1 text-muted-foreground">
                      {isPaid ? "교체서비스 신청" : "입금 후 패키지권 확인"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant={isPaid ? "default" : "outline"}
                    className="h-12 flex-1 font-semibold shadow-sm"
                    asChild
                  >
                    <Link href="/services/apply" className="flex items-center gap-2">
                      교체서비스 신청하기
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant={isPaid ? "outline" : "default"}
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
            </div>
          </div>
        </div>

        <div className="container py-8 md:py-10">
          <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
            {/* 패키지 주문 정보 카드 */}
            <SummaryCard
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
                  <Button
                    variant="default"
                    className="h-12 flex-1 shadow-sm transition-[box-shadow,background-color,border-color] hover:shadow-md"
                    asChild
                  >
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
                      <p className="text-ui-body-sm text-muted-foreground">결제/활성화 상태</p>
                      <p className="font-semibold text-foreground">
                        {isPaid ? "결제 완료 · 활성화 완료" : "입금 확인 대기 · 활성화 대기"}
                      </p>
                    </div>
                  </PublicSurface>
                  <PublicSurface variant="muted" padding="sm">
                    <div className="flex items-end justify-between gap-4 text-ui-card-title-lg font-semibold sm:text-ui-section-title">
                      <span className="text-foreground">총 결제 금액</span>
                      <span className="shrink-0 text-primary">
                        {formatPrice(packageOrder.totalPrice)}원
                      </span>
                    </div>
                  </PublicSurface>
                </div>

                {!isTossPayment && !isNicePayment ? (
                  <PublicSurface variant="muted" padding="sm">
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-primary">입금 계좌 정보</h3>
                    </div>
                    {paymentInfo?.bank && bankLabelMap[paymentInfo.bank] ? (
                      <PublicSurface variant="default" padding="sm" className="space-y-2">
                        <div className="font-semibold text-foreground">
                          {bankLabelMap[paymentInfo.bank].label}
                        </div>
                        <div className="break-all font-mono text-ui-card-title-lg font-semibold text-primary">
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
                ) : (
                  <PublicSurface variant="muted" padding="sm">
                    <h3 className="font-semibold text-primary mb-3">
                      {isNicePayment ? "카드/간편결제 정보" : "토스 결제 정보"}
                    </h3>
                    <p className="text-ui-body-sm text-muted-foreground">결제 상태: 결제 완료</p>
                    <p className="text-ui-body-sm text-muted-foreground mt-1">
                      승인 시각:{" "}
                      {paymentInfo?.approvedAt
                        ? new Date(paymentInfo.approvedAt).toLocaleString("ko-KR")
                        : "-"}
                    </p>
                  </PublicSurface>
                )}
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
                  show={showDevBtn && !isPaid}
                />
              </div>
            </SummaryCard>

            {/* 안내사항 */}
            <SummaryCard
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
                      <h4 className="font-semibold text-primary mb-1">
                        {isTossPayment || isNicePayment ? "결제 안내" : "입금 안내"}
                      </h4>
                      <p className="text-ui-body-sm text-muted-foreground">
                        {isOnlinePayment
                          ? `${isNicePayment ? "카드/간편" : "토스"} 결제가 완료되어 패키지가 즉시 활성화되었습니다.`
                          : "입금 확인 후 패키지가 활성화되며, 활성화 전에는 패키지를 사용할 수 없습니다."}
                      </p>
                    </div>
                  </PublicSurface>
                  <PublicSurface variant="muted" padding="sm" className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-primary mb-1">사용 안내</h4>
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
                      <h4 className="font-semibold text-primary mb-1">고객 지원</h4>
                      <p className="text-ui-body-sm text-muted-foreground">
                        패키지 관련 문의는 고객센터(010-5218-5248)로 연락해주세요.
                      </p>
                    </div>
                  </PublicSurface>
                </div>
              </div>
            </SummaryCard>
          </div>
        </div>
      </div>
    </>
  );
}
