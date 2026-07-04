import { normalizeCollection } from "@/app/features/stringing-applications/lib/collection";
import {
  getStringingAddressReadLabels,
  withAddressValue,
  withPostalValue,
} from "@/app/features/stringing-applications/lib/fulfillment-labels";
import BackButtonGuard from "@/app/services/_components/BackButtonGuard";
import HeroCourtBackdrop from "@/components/system/HeroCourtBackdrop";
import LoginGate from "@/components/system/LoginGate";
import { ResultState, SummaryCard } from "@/components/public";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  verifyAccessToken,
  verifyApplicationAccessToken,
  verifyOrderAccessToken,
} from "@/lib/auth.utils";
import { bankLabelMap, racketBrandLabel } from "@/lib/constants";
import clientPromise from "@/lib/mongodb";
import { formatKoreanPhone } from "@/lib/phone";
import jwt from "jsonwebtoken";
import {
  Award,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  Home,
  Mail,
  MapPin,
  Package,
  Phone,
  Rocket as Racquet,
  Shield,
  Ticket,
  User,
  Zap,
} from "lucide-react";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "서비스 신청 완료",
};

interface Props {
  searchParams: Promise<{
    applicationId?: string;
  }>;
}

function isValidObjectId(id: string | undefined): boolean {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
}

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

function safeVerifyOrderAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyOrderAccessToken(token) as {
      orderId?: string;
      applicationId?: string;
    } | null;
  } catch {
    return null;
  }
}

function safeVerifyApplicationAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyApplicationAccessToken(token) as {
      applicationId?: string;
    } | null;
  } catch {
    return null;
  }
}

// 시간 2자리 포맷
const pad2 = (n: number) => String(n).padStart(2, "0");

// 방문 예약 일시를 "YYYY-MM-DD HH:mm ~ HH:mm (n슬롯 / 총 m분)" 형태로
function formatVisitTimeRange(
  preferredDate?: string,
  preferredTime?: string,
  durationMinutes?: number | null,
  slotCount?: number | null,
): string {
  if (!preferredDate || !preferredTime) {
    return "예약 일시 미입력";
  }

  const [hh, mm] = preferredTime.split(":");
  const h = Number(hh);
  const m = Number(mm);

  if (!Number.isFinite(h) || !Number.isFinite(m) || !durationMinutes || durationMinutes <= 0) {
    return `${preferredDate} ${preferredTime}`;
  }

  const startTotal = h * 60 + m;
  const endTotal = startTotal + durationMinutes;

  const endH = Math.floor(endTotal / 60) % 24;
  const endM = endTotal % 60;
  const endTimeStr = `${pad2(endH)}:${pad2(endM)}`;

  const baseRange = `${preferredDate} ${preferredTime} ~ ${endTimeStr}`;

  if (slotCount && slotCount > 0) {
    return `${baseRange} (${slotCount}슬롯 / 총 ${durationMinutes}분)`;
  }
  return `${baseRange} (총 ${durationMinutes}분)`;
}

export default async function StringServiceSuccessPage(props: Props) {
  const searchParams = await props.searchParams;
  const applicationId = searchParams.applicationId;

  if (!isValidObjectId(applicationId)) return notFound();

  // 비회원 주문/신청 차단 모드면, success 페이지도 로그인 필수로 막는다.
  // (applicationId/orderId/rentalId만으로 신청서/주문 정보가 렌더링되는 것을 DB 조회 전에 차단)
  const guestOrderMode = (
    process.env.GUEST_ORDER_MODE ??
    process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ??
    "legacy"
  ).trim();
  const allowGuestCheckout = guestOrderMode === "on";
  if (!allowGuestCheckout) {
    const token = (await cookies()).get("accessToken")?.value;
    const payload = safeVerifyAccessToken(token);
    if (!payload?.sub) {
      const qs = new URLSearchParams();
      qs.set("applicationId", String(applicationId));
      const next = `/services/success?${qs.toString()}`;
      return <LoginGate next={next} variant="checkout" />;
    }
  }

  const client = await clientPromise;

  /**
   * 배포 환경에서 기본 DB 선택이 꼬일 수 있으므로
   * MONGODB_DB가 있으면 명시적으로 그 DB를 사용합니다.
   */
  const dbName = process.env.MONGODB_DB?.trim();
  const db = dbName ? client.db(dbName) : client.db();

  const application = await db.collection("stringing_applications").findOne({
    _id: new ObjectId(applicationId),
  });

  // applicationId는 유효하지만, 실제 문서가 없으면 404 처리
  if (!application) return notFound();

  const cookieStore = await cookies();
  const accessPayload = safeVerifyAccessToken(cookieStore.get("accessToken")?.value);
  const orderAccessPayload = safeVerifyOrderAccessToken(cookieStore.get("orderAccessToken")?.value);
  const applicationAccessPayload = safeVerifyApplicationAccessToken(
    cookieStore.get("applicationAccessToken")?.value,
  );

  const ownerUserId = application.userId ? String(application.userId) : null;
  const ownerOrderId = application.orderId ? String(application.orderId) : null;
  const ownerApplicationId = String(application._id);

  const isMemberOwner = !!(accessPayload?.sub && ownerUserId && accessPayload.sub === ownerUserId);
  const isGuestOwner = !!(
    (orderAccessPayload?.orderId && ownerOrderId && orderAccessPayload.orderId === ownerOrderId) ||
    (applicationAccessPayload?.applicationId &&
      applicationAccessPayload.applicationId === ownerApplicationId)
  );

  if (!isMemberOwner && !isGuestOwner) return notFound();

  /**
   * 중첩 필드 방어
   * - stringDetails / shippingInfo 가 없거나
   * - 예전 문서 shape 가 달라도
   * 페이지가 죽지 않게 기본값을 만듭니다.
   */
  const stringDetails =
    application.stringDetails && typeof application.stringDetails === "object"
      ? application.stringDetails
      : {};

  const shippingInfo =
    application.shippingInfo && typeof application.shippingInfo === "object"
      ? application.shippingInfo
      : {};

  /**
   * createdAt 이 비어 있거나 이상한 값이어도
   * 화면에서 안전하게 표시하기 위한 라벨입니다.
   */
  const createdAtDate = application.createdAt ? new Date(application.createdAt) : null;
  const createdAtLabel =
    createdAtDate && !Number.isNaN(createdAtDate.getTime())
      ? createdAtDate.toLocaleDateString("ko-KR")
      : "-";

  // 수거 방식 표준화
  const rawMethod = shippingInfo?.collectionMethod ?? application?.collectionMethod ?? null; // (레거시 대비)
  const cm = normalizeCollection(typeof rawMethod === "string" ? rawMethod : "self_ship"); // 'visit' | 'self_ship' | 'courier_pickup'
  const isVisit = cm === "visit";
  const isSelfShip = cm === "self_ship";
  const isCourierPickup = cm === "courier_pickup";

  const shippingReadLabels = getStringingAddressReadLabels(cm);
  const shippingSectionTitle = shippingReadLabels.sectionTitle;
  const shippingPrimaryLabel = shippingReadLabels.primaryLabel;
  const shippingPrimaryValue = withAddressValue(cm, shippingInfo?.address);
  const shippingSecondaryLabel = shippingReadLabels.secondaryLabel;
  const shippingSecondaryValue = withPostalValue(cm, shippingInfo?.postalCode);

  // 방문 예약 희망 일시 라벨
  const visitTimeLabel = isVisit
    ? formatVisitTimeRange(
        stringDetails?.preferredDate,
        stringDetails?.preferredTime,
        (application as any)?.visitDurationMinutes ?? null,
        (application as any)?.visitSlotCount ?? null,
      )
    : "예약 불필요";

  // 패키지 정보 조회
  let appliedPass: any = null;
  if (application?.packageApplied && application?.packagePassId) {
    try {
      appliedPass = await db
        .collection("service_passes")
        .findOne(
          { _id: new ObjectId(application.packagePassId) },
          { projection: { remainingCount: 1, packageSize: 1, expiresAt: 1 } },
        );
    } catch {}
  }

  // 여러 개 선택/커스텀 이름까지 합쳐 표시용 이름 랜더
  const stringTypes: string[] = Array.isArray(stringDetails?.stringTypes)
    ? stringDetails.stringTypes
    : [];

  const productIds = stringTypes
    .filter((id: string) => id && id !== "custom" && ObjectId.isValid(id))
    .map((id: string) => new ObjectId(id));

  let stringNames: string[] = [];

  // products 컬렉션에서 name만
  if (productIds.length) {
    const prods = await db
      .collection("products")
      .find({ _id: { $in: productIds } }, { projection: { name: 1 } })
      .toArray();

    stringNames = prods.map((p: any) => p.name).filter(Boolean);
  }

  // 커스텀 이름이 포함되어 있다면 맨 앞에 붙임
  if (stringTypes.includes("custom") && stringDetails?.customStringName) {
    stringNames.unshift(String(stringDetails.customStringName));
  }

  // 최종 표시 문자열 (여러 개면 " + "로 연결)
  const stringDisplay = stringNames.join(" + ") || "-";

  const racketLines = Array.isArray(stringDetails?.lines)
    ? stringDetails.lines
    : Array.isArray(stringDetails?.racketLines)
      ? stringDetails.racketLines
      : [];

  // (통합결제) 주문 금액(라켓+스트링)까지 함께 보여주기 위한 주문 조회
  const orderObjectId =
    application.orderId && ObjectId.isValid(String(application.orderId))
      ? new ObjectId(String(application.orderId))
      : null;

  const order = orderObjectId
    ? await db.collection("orders").findOne({ _id: orderObjectId })
    : null;
  const orderHasRacket =
    Array.isArray((order as any)?.items) &&
    (order as any).items.some((it: any) =>
      ["racket", "used_racket"].includes(String(it?.kind ?? "")),
    );
  const inboundRequired =
    typeof (application as any)?.inboundRequired === "boolean"
      ? Boolean((application as any).inboundRequired)
      : application.rentalId
        ? false
        : application.orderId
          ? !orderHasRacket
          : true;
  const needsInboundTracking =
    typeof (application as any)?.needsInboundTracking === "boolean"
      ? Boolean((application as any).needsInboundTracking)
      : inboundRequired && cm === "self_ship";
  const hasTracking = Boolean(
    (application as any)?.shippingInfo?.selfShip?.trackingNo ||
      (application as any)?.shippingInfo?.selfShip?.trackingNumber ||
      (application as any)?.shippingInfo?.selfShip?.invoiceNumber ||
      (application as any)?.shippingInfo?.trackingNo ||
      (application as any)?.shippingInfo?.trackingNumber,
  );

  // 합계 계산 유틸
  const sumBy = (items: any[], pred: (it: any) => boolean) =>
    (items ?? [])
      .filter(pred)
      .reduce((acc, it) => acc + Number(it.price ?? 0) * Number(it.quantity ?? 1), 0);

  const racketSubtotal = order?.items
    ? sumBy(order.items, (it) => ["racket", "used_racket"].includes(it.kind))
    : 0;
  const stringSubtotal = order?.items
    ? sumBy(order.items, (it) => !["racket", "used_racket"].includes(it.kind))
    : 0;

  // 교체비(신청서 기준) — 패키지면 0
  const serviceSubtotal = application.packageApplied ? 0 : Number(application.totalPrice ?? 0);

  const combinedTotal = order ? racketSubtotal + stringSubtotal + serviceSubtotal : serviceSubtotal;

  // (대여 기반 신청서) rentalId가 있으면 대여 주문을 조회해서
  // 결제 요약을 '대여 결제 완료 금액' 기준으로 표시한다.
  const rentalIdStr = application.rentalId ? String(application.rentalId) : "";
  const rentalObjectId = ObjectId.isValid(rentalIdStr) ? new ObjectId(rentalIdStr) : null;
  const rental = rentalObjectId
    ? await db.collection("rental_orders").findOne({ _id: rentalObjectId })
    : null;

  const rentalDeposit = rental ? Number(rental.amount?.deposit ?? 0) : 0;
  const rentalFee = rental ? Number(rental.amount?.fee ?? 0) : 0;
  const rentalStringPrice = rental ? Number(rental.amount?.stringPrice ?? 0) : 0;
  const rentalStringingFee = rental ? Number(rental.amount?.stringingFee ?? 0) : 0;
  const rentalTotal = rental
    ? Number(
        rental.amount?.total ?? rentalDeposit + rentalFee + rentalStringPrice + rentalStringingFee,
      )
    : 0;

  const displayTotal = rental ? rentalTotal : Number(order ? combinedTotal : serviceSubtotal);

  // 무통장 입금 정보 우선순위:
  // 1) 대여 기반 신청서면 rental.payment 우선
  // 2) 통합결제(구매+서비스)면 order.payment/paymentInfo 우선
  // 3) 그 외에는 신청서 shippingInfo 기준
  const orderBankKey = (order as any)?.payment?.bank ?? (order as any)?.paymentInfo?.bank ?? null;
  const orderDepositor =
    (order as any)?.payment?.depositor ?? (order as any)?.paymentInfo?.depositor ?? null;

  const bankKey = rental?.payment?.bank ?? orderBankKey ?? shippingInfo?.bank ?? null;
  const depositor = rental?.payment?.depositor ?? orderDepositor ?? shippingInfo?.depositor ?? null; // 신청서에도 depositor가 있으면 보조신청서에도 depositor가 있으면 보조
  const bankInfo = bankKey ? (bankLabelMap as any)[bankKey] : null;
  const isNicePayment =
    (application as any)?.paymentInfo?.provider === "nicepay" ||
    (application as any)?.paymentMethod === "nicepay";

  const applicationFlowHref = `/mypage?tab=orders&flowType=application&flowId=${encodeURIComponent(String(application._id))}&from=orders`;
  const orderFlowHref = order?._id
    ? `/mypage?tab=orders&flowType=order&flowId=${encodeURIComponent(String(order._id))}&from=orders&focus=stringing`
    : applicationFlowHref;
  const rentalFlowHref = rental?._id
    ? `/mypage?tab=orders&flowType=rental&flowId=${encodeURIComponent(String(rental._id))}&from=orders&focus=stringing`
    : applicationFlowHref;
  const isOrderBasedApplication = Boolean(order);
  const isRentalBasedApplication = Boolean(rental);
  const mypageFlowHref = isRentalBasedApplication
    ? rentalFlowHref
    : isOrderBasedApplication
      ? orderFlowHref
      : applicationFlowHref;
  const shippingRegisterHref = `/services/applications/${applicationId}/shipping?return=${encodeURIComponent(mypageFlowHref)}`;
  const progressGuide = (() => {
    if (isRentalBasedApplication) {
      return {
        status: "대여 라켓 준비 중",
        todo: "사용자가 별도로 라켓을 발송하지 않아도 됩니다.",
        next: "매장에서 대여 라켓에 스트링을 장착해 준비합니다.",
        primaryLabel: "마이페이지 > 주문/신청 내역 확인",
        primaryHref: mypageFlowHref,
      };
    }
    if (isOrderBasedApplication && inboundRequired === false) {
      return {
        status: "매장 작업 대기",
        todo: "사용자가 별도로 라켓을 발송하지 않아도 됩니다.",
        next: "매장에서 구매한 라켓에 스트링을 장착해 준비합니다.",
        primaryLabel: "마이페이지 > 주문/신청 내역 확인",
        primaryHref: mypageFlowHref,
      };
    }
    if (needsInboundTracking && !hasTracking) {
      return {
        status: "접수 완료",
        todo: "보유 라켓을 매장으로 보내고 라켓 발송 운송장을 등록해주세요.",
        next: "매장에서 입고 확인 후 교체 작업을 진행합니다.",
        primaryLabel: "라켓 발송 운송장 등록하기",
        primaryHref: shippingRegisterHref,
      };
    }
    if (needsInboundTracking && hasTracking) {
      return {
        status: "매장 입고 확인 중",
        todo: "등록한 운송장 기준으로 매장 도착 확인을 기다려주세요.",
        next: "매장에서 입고 확인 후 교체 작업을 진행합니다.",
        primaryLabel: "마이페이지 > 주문/신청 내역 확인",
        primaryHref: mypageFlowHref,
      };
    }
    if (isVisit) {
      return {
        status: "방문 접수 완료",
        todo: "예약/희망 일시에 맞춰 매장 방문을 준비해주세요.",
        next: "매장에서 방문 접수 후 교체 작업을 진행합니다.",
        primaryLabel: "마이페이지 > 주문/신청 내역 확인",
        primaryHref: mypageFlowHref,
      };
    }
    return {
      status: "접수 완료",
      todo: "현재 추가로 진행할 작업은 없습니다.",
      next: "매장에서 신청 내용을 확인한 뒤 다음 진행 상태를 안내합니다.",
      primaryLabel: "마이페이지 > 주문/신청 내역 확인",
      primaryHref: mypageFlowHref,
    };
  })();

  // 로그인 여부 확인
  const refreshToken = cookieStore.get("refreshToken")?.value;
  let isLoggedIn = false;
  if (refreshToken) {
    try {
      jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
      isLoggedIn = true;
    } catch {}
  }

  return (
    <>
      <BackButtonGuard />

      <div className="min-h-full bg-background text-foreground">
        <div className="relative overflow-hidden bg-background py-8 md:py-12">
          <div className="absolute inset-0 bg-overlay/10"></div>
          <HeroCourtBackdrop className="h-full w-full text-primary opacity-[0.10] dark:opacity-[0.12]" />

          <ResultState
            status="success"
            title="신청이 완료되었습니다"
            description="현재 상태와 다음 단계, 필요한 작업을 확인해주세요."
            icon={<CheckCircle className="h-6 w-6" />}
            className="relative py-8 sm:py-10"
          >
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-ui-body-sm font-medium text-foreground shadow-sm">
              <Calendar className="h-4 w-4 text-primary" />
              신청일: {createdAtLabel}
            </div>
          </ResultState>

        </div>

        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className="max-w-5xl mx-auto">
            <div data-cy="service-success-summary-card" className="mb-8">
              <SummaryCard
                className="overflow-hidden border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50"
                contentClassName="p-0"
                footer={
                  <div className="flex w-full flex-col gap-3 sm:flex-row">
                    <Button
                      variant="default"
                      className="h-12 flex-1 transition-all duration-200"
                      asChild
                    >
                      <Link
                        data-cy="service-success-application-link"
                        href={mypageFlowHref}
                      >
                        <FileText className="h-5 w-5 mr-2" />
                        주문/신청 내역 보기
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 flex-1 transition-colors duration-200"
                      asChild
                    >
                      <Link href="/">
                        <Home className="h-5 w-5 mr-2" />
                        홈으로 돌아가기
                      </Link>
                    </Button>
                  </div>
                }
              >
                <div className="border-b border-border/70 bg-secondary/30 p-4 sm:p-5 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-ui-page-title font-semibold text-foreground flex items-center">
                        <FileText className="h-6 w-6 mr-3 text-primary" />
                        신청 정보
                      </h2>
                      <p className="mt-2 text-ui-body-sm text-muted-foreground">
                        신청 번호: <span className="font-mono">{application._id.toString()}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="success" className="px-4 py-2 text-ui-body-sm font-medium">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        접수 완료
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-5 md:p-6">
                  <div className="mb-6 border-l-2 border-primary/30 bg-primary/5 px-3 py-3 md:px-4">
                    <h3 className="text-ui-body-lg font-semibold text-foreground">현재 상태와 다음 단계</h3>
                    <div className="mt-3 grid gap-3 divide-y divide-border/60 text-ui-body-sm leading-relaxed md:grid-cols-3 md:divide-x md:divide-y-0">
                      <div className="pt-3 first:pt-0 md:pt-0 md:pl-3 md:first:pl-0">
                        <p className="font-semibold text-foreground">현재 상태</p>
                        <p className="mt-1 text-muted-foreground">{progressGuide.status}</p>
                      </div>
                      <div className="pt-3 md:pt-0 md:pl-3">
                        <p className="font-semibold text-foreground">지금 할 일</p>
                        <p className="mt-1 text-muted-foreground">{progressGuide.todo}</p>
                      </div>
                      <div className="pt-3 md:pt-0 md:pl-3">
                        <p className="font-semibold text-foreground">다음 단계</p>
                        <p className="mt-1 text-muted-foreground">{progressGuide.next}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Button asChild className="flex-1">
                        <Link href={progressGuide.primaryHref}>{progressGuide.primaryLabel}</Link>
                      </Button>
                      <Button asChild variant="outline" className="flex-1">
                        <Link href="/support">고객센터 문의하기</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="mb-6 grid grid-cols-1 gap-x-4 gap-y-0 divide-y divide-border/70 border-y border-border/70 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 md:gap-x-6 md:mb-8">
                    <div
                      data-cy="service-success-amount-card"
                      className="py-4"
                    >
                      <div className="flex items-center mb-3">
                        <Calendar className="h-6 w-6 text-primary mr-3" />
                        <h3 className="font-semibold text-foreground">신청일자</h3>
                      </div>
                      <p className="text-ui-page-title font-semibold text-primary">{createdAtLabel}</p>
                    </div>

                    <div
                      data-cy="service-success-collection-card"
                      className="py-4 lg:col-span-2"
                    >
                      <div className="flex items-center mb-3">
                        <CreditCard className="h-6 w-6 text-primary mr-3" />
                        <h3 className="font-semibold text-foreground">결제 요약</h3>
                      </div>

                      <p className="text-ui-page-title font-semibold text-primary">
                        {Number(displayTotal).toLocaleString()}원
                      </p>

                      {/* order가 있으면 상세 breakdown 유지 */}
                      {rental ? (
                        <div className="divide-y divide-border/60 [&>*]:py-2">
                          <div className="flex justify-between text-ui-body-sm">
                            <span className="text-muted-foreground">보증금</span>
                            <span>{rentalDeposit.toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between text-ui-body-sm">
                            <span className="text-muted-foreground">대여료</span>
                            <span>{rentalFee.toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between text-ui-body-sm">
                            <span className="text-muted-foreground">스트링 상품</span>
                            <span>{rentalStringPrice.toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between text-ui-body-sm">
                            <span className="text-muted-foreground">교체서비스</span>
                            <span>{rentalStringingFee.toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between items-center border-t pt-3">
                            <span className="font-semibold">합계</span>
                            <span className="font-semibold text-primary dark:text-success">
                              {Number(displayTotal).toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      ) : order ? (
                        <p className="mt-2 text-ui-body-sm text-muted-foreground">
                          {[
                            racketSubtotal > 0 ? `라켓 ${racketSubtotal.toLocaleString()}원` : null,
                            stringSubtotal > 0
                              ? `스트링 ${stringSubtotal.toLocaleString()}원`
                              : null,
                            `교체비 ${serviceSubtotal.toLocaleString()}원`,
                          ]
                            .filter(Boolean)
                            .join(" + ")}
                        </p>
                      ) : (
                        <p className="mt-2 text-ui-body-sm text-muted-foreground">교체서비스 비용 기준</p>
                      )}
                      {application.packageApplied ? (
                        <p className="mt-2 text-ui-body-sm text-foreground">패키지 적용으로 입금 불필요</p>
                      ) : isNicePayment ? (
                        <p className="mt-2 text-ui-body-sm text-foreground">
                          카드/간편결제 완료 · 추가 입금 불필요
                        </p>
                      ) : null}
                    </div>

                    <div className="py-4">
                      <div className="flex items-center mb-3">
                        <CheckCircle className="h-6 w-6 text-primary mr-3" />
                        <h3 className="font-semibold text-foreground">현재 상태</h3>
                      </div>
                      <p className="text-ui-card-title-lg font-semibold text-primary">접수 완료</p>
                    </div>

                    <div className="py-4">
                      <div className="flex items-center mb-3">
                        <Package className="h-6 w-6 text-primary mr-3" />
                        <h3 className="font-semibold text-foreground">수령 방식</h3>
                      </div>
                      <p className="text-ui-card-title-lg font-semibold text-primary">{shippingSectionTitle}</p>
                    </div>

                    <div className="py-4">
                      <div className="flex items-center mb-3">
                        <Racquet className="h-6 w-6 text-primary mr-3" />
                        <h3 className="font-semibold text-foreground">총 작업 수</h3>
                      </div>
                      <p className="text-ui-card-title-lg font-semibold text-primary">{racketLines.length}자루</p>
                    </div>

                    <div className="py-4 lg:col-span-2">
                      <div className="flex items-center mb-3">
                        <Clock className="h-6 w-6 text-primary mr-3" />
                        <h3 className="font-semibold text-foreground">희망 일시</h3>
                      </div>
                      <p className="text-ui-card-title-lg font-semibold text-primary">{visitTimeLabel}</p>
                    </div>
                  </div>
                  {rental && (
                    <div className="mb-6 md:mb-8">
                      <h3 className="text-ui-section-title font-semibold text-foreground mb-4 flex items-center">
                        <Package className="h-6 w-6 mr-3 text-primary" />
                        대여 정보
                      </h3>

                      <div className="divide-y divide-border/70 border-y border-border/70">
                        {/* 상단: 대여 번호 */}
                        <div className="py-4">
                          <p className="text-ui-body-sm text-muted-foreground">대여 번호</p>
                          <p className="font-mono font-semibold text-primary">
                            {String(rental._id)}
                          </p>
                        </div>

                        {/* 라켓 정보 */}
                        <div className="py-4">
                          <p className="text-ui-body-sm text-muted-foreground mb-1">대여 라켓</p>
                          <p className="font-semibold text-foreground">
                            {rental.brand
                              ? `${racketBrandLabel(rental.brand)} ${rental.model ?? ""}`
                              : "라켓 정보 없음"}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="info">대여 {Number(rental.days ?? 0)}일</Badge>
                          </div>
                        </div>

                        {/* 금액 breakdown: RentalsSuccessClient 구조 그대로 */}
                        <div className="divide-y divide-border/60 [&>*]:py-2">
                          <div className="flex justify-between text-ui-body-sm">
                            <span className="text-muted-foreground">대여 수수료</span>
                            <span>{rentalFee.toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between text-ui-body-sm">
                            <span className="text-muted-foreground">보증금</span>
                            <span>{rentalDeposit.toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between text-ui-body-sm">
                            <span className="text-muted-foreground">스트링 상품</span>
                            <span>{rentalStringPrice.toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between text-ui-body-sm">
                            <span className="text-muted-foreground">교체서비스</span>
                            <span>{rentalStringingFee.toLocaleString()}원</span>
                          </div>

                          <div className="mt-4 border-t border-border pt-4">
                            <div className="flex justify-between items-center font-semibold">
                              <span className="text-foreground">총 결제 금액</span>
                              <span className="text-primary">
                                {Number(displayTotal).toLocaleString()}원
                              </span>
                            </div>
                            <p className="text-ui-label text-muted-foreground mt-1">
                              * 반납 완료 후 보증금 환불 (연체/파손 시 차감)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {order && !rental && (
                    <div className="mb-6 md:mb-8">
                      <h3 className="text-ui-section-title font-semibold text-foreground mb-4 flex items-center">
                        <Package className="h-6 w-6 mr-3 text-primary" />
                        구매 정보
                      </h3>

                      <div className="divide-y divide-border/70 border-y border-border/70">
                        {/* 상단: 주문 번호 */}
                        <div className="py-4">
                          <p className="text-ui-body-sm text-muted-foreground">주문 번호</p>
                          <p className="font-mono font-semibold text-primary">
                            {String(order._id)}
                          </p>
                        </div>

                        {/* 금액 breakdown: 대여 카드 톤에 맞춰 동일 패턴 */}
                        <div className="space-y-3">
                          <div className="flex justify-between text-ui-body-sm">
                            <span className="text-muted-foreground">라켓</span>
                            <span>{Number(racketSubtotal).toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between text-ui-body-sm">
                            <span className="text-muted-foreground">스트링</span>
                            <span>{Number(stringSubtotal).toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between text-ui-body-sm">
                            <span className="text-muted-foreground">교체서비스</span>
                            <span>{Number(serviceSubtotal).toLocaleString()}원</span>
                          </div>

                          <div className="mt-4 border-t border-border pt-4">
                            <div className="flex justify-between items-center font-semibold">
                              <span className="text-foreground">총 결제 금액</span>
                              <span className="text-primary">
                                {Number(displayTotal).toLocaleString()}원
                              </span>
                            </div>
                            <p className="text-ui-label text-muted-foreground mt-1">
                              * 라켓/스트링/교체비 합산 기준
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {application.packageApplied ? (
                    // ===== 패키지 적용 카드 =====
                    <div className="mb-6 md:mb-8">
                      <h3 className="text-ui-section-title font-semibold text-foreground mb-4 flex items-center">
                        <Ticket className="h-6 w-6 mr-3 text-primary" />
                        패키지 적용됨
                      </h3>

                      <div className="border-l-2 border-primary/30 bg-muted/20 px-3 py-3 md:px-4">
                        <div className="flex items-start gap-4">
                          <div className="grid h-10 w-10 shrink-0 place-content-center rounded-full border border-border bg-secondary text-foreground shadow-sm">
                            <Ticket className="h-5 w-5" />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-primary">
                                교체 패키지가 자동 적용되었습니다.
                              </span>
                              <Badge variant="info">입금 불필요</Badge>
                            </div>

                            <p className="mt-1 text-ui-body-sm text-foreground">
                              교체비는 <span className="font-semibold text-primary">0원</span> 으로
                              처리 됩니다.
                            </p>

                            {/* 잔여/만료 pill */}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="neutral">
                                잔여 {appliedPass?.remainingCount ?? "-"}회
                              </Badge>
                              <Badge variant="neutral">
                                만료일{" "}
                                {appliedPass?.expiresAt
                                  ? new Date(appliedPass.expiresAt).toLocaleDateString("ko-KR")
                                  : "-"}
                              </Badge>
                            </div>

                            {/* 잔여 게이지 */}
                            {appliedPass?.packageSize
                              ? (() => {
                                  const total = appliedPass.packageSize as number;
                                  const remaining = appliedPass.remainingCount as number;
                                  const used = Math.max(0, total - remaining);
                                  const remainPct = Math.round((remaining / total) * 100);
                                  return (
                                    <div className="mt-4">
                                      <div className="flex items-center justify-between text-ui-label text-muted-foreground mb-1">
                                        <span>
                                          총 {total}회 중{" "}
                                          <span className="font-medium text-foreground">
                                            {used}
                                          </span>
                                          회 사용
                                        </span>
                                        <span className="tabular-nums">{remainPct}%</span>
                                      </div>
                                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-primary"
                                          style={{ width: `${remainPct}%` }}
                                        />
                                      </div>
                                      <div className="mt-1 text-ui-label text-muted-foreground">
                                        잔여{" "}
                                        <span className="font-medium text-primary">
                                          {remaining}
                                        </span>
                                        회
                                      </div>
                                    </div>
                                  );
                                })()
                              : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : isNicePayment ? (
                    // ===== 카드/간편결제 완료 안내 =====
                    <div className="mb-6 md:mb-8">
                      <h3 className="text-ui-section-title font-semibold text-foreground mb-4 flex items-center">
                        <CreditCard className="h-6 w-6 mr-3 text-primary" />
                        카드/간편결제 완료
                      </h3>
                      <div className="border-l-2 border-primary/30 bg-primary/5 px-3 py-3 md:px-4">
                        <p className="font-semibold text-primary">
                          카드/간편결제가 완료되었습니다.
                        </p>
                        <p className="mt-2 text-ui-body-sm text-foreground">
                          결제가 정상 승인되었습니다. 추가 입금은 필요하지 않습니다.
                        </p>
                      </div>
                    </div>
                  ) : (
                    // ===== 기존 입금 계좌 정보 (패키지·카드결제 미적용 시에만 노출) =====
                    bankInfo && (
                      <div className="mb-6 md:mb-8">
                        <h3 className="text-ui-section-title font-semibold text-foreground mb-4 flex items-center">
                          <CreditCard className="h-6 w-6 mr-3 text-primary" />
                          무통장 입금 안내
                        </h3>

                        <div className="divide-y divide-border/70 border-y border-border/70">
                          <p className="text-ui-body-sm text-muted-foreground mb-4">
                            아래 계좌로 입금해 주세요. 입금 확인 후 결제완료로 상태가 변경됩니다.
                          </p>

                          <div className="grid grid-cols-1 divide-y divide-border/60 border-y border-border/70 md:grid-cols-4 md:divide-x md:divide-y-0">
                            <div className="py-3 md:px-3">
                              <p className="text-ui-body-sm text-muted-foreground mb-1">은행</p>
                              <p className="font-semibold text-ui-card-title-lg text-foreground">{bankInfo.label}</p>
                            </div>
                            <div className="py-3 md:px-3">
                              <p className="text-ui-body-sm text-muted-foreground mb-1">계좌번호</p>
                              <p className="font-mono font-semibold text-ui-card-title-lg text-foreground break-all tabular-nums">
                                {bankInfo.account}
                              </p>
                            </div>
                            <div className="py-3 md:px-3">
                              <p className="text-ui-body-sm text-muted-foreground mb-1">예금주</p>
                              <p className="font-semibold text-ui-card-title-lg text-foreground">{bankInfo.holder}</p>
                            </div>
                            <div className="py-3 md:px-3">
                              <p className="text-ui-body-sm text-muted-foreground mb-1">입금 금액</p>
                              <p className="font-semibold text-ui-card-title-lg text-primary">
                                {Number(displayTotal).toLocaleString()}원
                              </p>
                            </div>
                          </div>

                          {depositor && (
                            <div className="mt-4 border-l-2 border-border bg-muted/20 px-3 py-2">
                              <p className="text-ui-body-sm text-muted-foreground mb-1">입금자명</p>
                              <p className="font-semibold text-foreground">{String(depositor)}</p>
                            </div>
                          )}

                          <div className="mt-4 border-l-2 border-destructive/50 bg-destructive/10 px-3 py-3 dark:bg-destructive/15">
                            <div className="flex items-center">
                              <Zap className="h-5 w-5 text-destructive mr-2" />
                              <p className="font-semibold text-destructive">
                                입금 기한: {createdAtLabel} 23:59까지
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  <Separator className="my-6 md:my-8" />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-4 md:space-y-6">
                      <h3 className="text-ui-section-title font-semibold text-foreground flex items-center">
                        <User className="h-6 w-6 mr-3 text-primary" />
                        신청자 정보
                      </h3>
                      <div className="divide-y divide-border/70 border-y border-border/70">
                        <div className="flex items-center py-4">
                          <User className="h-5 w-5 text-muted-foreground mr-3" />
                          <div>
                            <p className="text-ui-body-sm text-muted-foreground">이름</p>
                            <p className="font-semibold text-foreground">{application.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center py-4">
                          <Mail className="h-5 w-5 text-muted-foreground mr-3" />
                          <div>
                            <p className="text-ui-body-sm text-muted-foreground">이메일</p>
                            <p className="font-semibold text-foreground">{application.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center py-4">
                          <Phone className="h-5 w-5 text-muted-foreground mr-3" />
                          <div>
                            <p className="text-ui-body-sm text-muted-foreground">연락처</p>
                            <p className="font-semibold text-foreground">
                              {formatKoreanPhone(application.phone) || application.phone}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 md:space-y-6">
                      <h3 className="text-ui-section-title font-semibold text-foreground flex items-center">
                        <MapPin className="h-6 w-6 mr-3 text-foreground" />
                        {shippingSectionTitle}
                      </h3>
                      <div className="divide-y divide-border/70 border-y border-border/70">
                        <div className="py-4">
                          <p className="text-ui-body-sm text-muted-foreground mb-1">
                            {shippingPrimaryLabel}
                          </p>
                          <p className="font-semibold text-foreground">{shippingPrimaryValue}</p>
                          {!isVisit && shippingInfo?.addressDetail && (
                            <p className="text-foreground mt-1">{shippingInfo.addressDetail}</p>
                          )}
                        </div>
                        <div className="py-4">
                          <p className="text-ui-body-sm text-muted-foreground mb-1">
                            {shippingSecondaryLabel}
                          </p>
                          <p className="font-semibold text-foreground">{shippingSecondaryValue}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6 md:my-8" />

                  <div className="space-y-4 md:space-y-6">
                    <h3 className="text-ui-section-title font-semibold text-foreground flex items-center">
                      <Racquet className="h-6 w-6 mr-3 text-primary" />
                      작업 요청사항
                    </h3>

                    {stringDetails?.requirements && (
                      <div className="border-l-2 border-primary/30 bg-muted/20 px-3 py-3 md:px-4">
                        <div className="flex items-start mb-3">
                          <FileText className="h-5 w-5 text-primary mr-2 mt-0.5" />
                          <p className="text-ui-body-sm font-medium text-muted-foreground">요청사항</p>
                        </div>
                        <p className="text-foreground leading-relaxed">
                          {String(stringDetails.requirements)}
                        </p>
                      </div>
                    )}
                  </div>
                  {racketLines.length > 0 && (
                    <div className="mt-6 md:mt-8">
                      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-ui-section-title font-semibold text-foreground flex items-center">
                          <Racquet className="h-6 w-6 mr-3 text-primary" />
                          라켓·스트링별 작업 정보
                        </h3>
                        <Badge variant="neutral">총 작업 수: {racketLines.length}자루</Badge>
                      </div>

                      <div className="divide-y divide-border/70 border-y border-border/70">
                        {racketLines.map((line: any, idx: number) => (
                          <div key={line.id ?? idx} className="py-4">
                            <div className="space-y-3">
                              <p className="text-ui-label text-muted-foreground mb-1">
                                라켓 {line.racketType || line.racketLabel || `${idx + 1}번`}
                              </p>

                              <p className="font-semibold text-foreground">
                                스트링: {line.stringName || "스트링명 미입력"}
                              </p>

                              <div className="grid grid-cols-1 gap-2 text-ui-body-sm text-foreground">
                                {(line.tensionMain || line.tensionCross) && (
                                  <p>
                                    텐션{" "}
                                    <span className="font-medium">
                                      메인 {line.tensionMain ? `${line.tensionMain}LB` : "-"} /
                                      크로스 {line.tensionCross ? `${line.tensionCross}LB` : "-"}
                                    </span>
                                  </p>
                                )}
                                {typeof line.mountingFee === "number" && (
                                  <p className="text-muted-foreground">
                                    장착비: {line.mountingFee.toLocaleString("ko-KR")}원
                                  </p>
                                )}
                                {line.note && (
                                  <p className="text-muted-foreground break-words">
                                    메모: {line.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SummaryCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <SummaryCard
                title={
                  <span className="flex items-center">
                    <Shield className="h-6 w-6 mr-3 text-primary" />
                    신청 안내사항
                  </span>
                }
                className="border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50"
              >
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">
                      신청 정보를 정확히 입력했는지 다시 확인해주세요.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">
                      신청서에 따라 장착 담당자가 확인 후 연락드릴 예정입니다.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">
                      문의 사항은 고객센터(02-1234-5678)로 연락 주세요.
                    </span>
                  </li>
                </ul>
              </SummaryCard>

              <SummaryCard
                title={
                  <span className="flex items-center">
                    <Award className="h-6 w-6 mr-3 text-foreground" />
                    서비스 특징
                  </span>
                }
                className="border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50"
              >
                <div className="space-y-4">
                  <div className="flex items-center border-l-2 border-primary/30 bg-muted/20 px-3 py-3">
                    <Shield className="h-6 w-6 text-primary mr-3" />
                    <div>
                      <p className="font-semibold text-foreground">정품 보장</p>
                      <p className="text-ui-body-sm text-muted-foreground">100% 정품 스트링만 사용</p>
                    </div>
                  </div>
                  <div className="flex items-center border-l-2 border-border bg-muted/20 px-3 py-3">
                    <Clock className="h-6 w-6 text-foreground mr-3" />
                    <div>
                      <p className="font-semibold text-foreground">철저한 예약 장착 완료</p>
                      <p className="text-ui-body-sm text-muted-foreground">빠르고 정확한 장착 서비스</p>
                    </div>
                  </div>
                  <div className="flex items-center border-l-2 border-primary/30 bg-muted/20 px-3 py-3">
                    <Award className="h-6 w-6 text-foreground mr-3" />
                    <div>
                      <p className="font-semibold text-foreground">전문가 상담</p>
                      <p className="text-ui-body-sm text-muted-foreground">전문가가 직접 상담</p>
                    </div>
                  </div>
                </div>
              </SummaryCard>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
