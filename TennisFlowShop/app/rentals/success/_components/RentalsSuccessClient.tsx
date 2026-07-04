"use client";

import SiteContainer from "@/components/layout/SiteContainer";
import { ResultState } from "@/components/public";
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
import { Separator } from "@/components/ui/separator";
import { badgeToneVariant } from "@/lib/badge-style";
import { bankLabelMap, racketBrandLabel } from "@/lib/constants";
import { getRefundBankLabel } from "@/lib/cancel-request/refund-account";
import { getPaymentDisplaySummary } from "@/lib/payments/payment-display";
import { shortenId } from "@/lib/shorten";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  MapPin,
  Package,
  Phone,
  Shield,
  Truck,
  Undo2,
} from "lucide-react";
import Link from "next/link";

const rentalStatusLabel = (status: string, isBankTransfer: boolean) => {
  if (status === "pending") return isBankTransfer ? "입금 확인 대기" : "접수 완료";
  if (status === "paid") return "결제 확인 완료";
  if (status === "out") return "대여 중";
  if (status === "returned") return "반납 완료";
  if (status === "canceled" || status === "cancelled") return "취소됨";
  return status || "접수 완료";
};

const stringingStatusLabel = (status?: string | null) => {
  if (status === "검토 중") return "접수 검토 중";
  if (status === "접수완료") return "작업 접수 완료";
  if (status === "작업 중") return "장착 작업 중";
  if (status === "교체완료") return "장착 완료";
  return status || "접수 확인 중";
};

type Props = {
  data: {
    id: string;
    period: 7 | 15 | 30;
    fee: number;
    deposit: number;
    stringPrice: number;
    stringingFee: number;
    total: number;
    status: string;
    withStringService?: boolean;
    isStringServiceApplied?: boolean;
    stringingApplicationId?: string | null;
    applicationSummary?: {
      status: string;
      lineCount: number;
      stringNames: string[];
      tensionSummary: string | null;
      receptionLabel: string;
      reservationLabel: string | null;
    } | null;
    queryHint?: {
      withService?: boolean | null;
      stringingSubmitted?: boolean | null;
      stringingApplicationId?: string | null;
    };
    racket: { brand: string; model: string; condition: "A" | "B" | "C" } | null;
    payment?: {
      method?: string;
      bank?: string | null;
      depositor?: string | null;
    } | null;
    paymentStatus?: string | null;
    paidAt?: string | null;
    paymentInfo?: {
      status?: string | null;
      provider?: string | null;
      method?: string | null;
      bank?: string | null;
      depositor?: string | null;
      tid?: string | null;
      approvedAt?: string | null;
      easyPayProvider?: string | null;
      cardDisplayName?: string | null;
      cardCompany?: string | null;
      cardLabel?: string | null;
      niceCard?: {
        displayName?: string | null;
        cardName?: string | null;
        issuerName?: string | null;
        issuerCode?: string | null;
        acquirerName?: string | null;
        acquirerCode?: string | null;
        cardCode?: string | null;
      } | null;
      rawSummary?: {
        easyPay?: { provider?: string | null } | null;
      } | null;
    } | null;
    shipping?: {
      name?: string | null;
      phone?: string | null;
      postalCode?: string | null;
      address?: string | null;
      addressDetail?: string | null;
      deliveryRequest?: string | null;
      shippingMethod?: string | null;
    } | null;
    refundAccount?: {
      bank?: string | null;
      account?: string | null;
      holder?: string | null;
    } | null;
  };
};

export default function RentalsSuccessClient({ data }: Props) {
  const dbWithService = Boolean(data.withStringService);
  const dbStringingApplied = Boolean(data.isStringServiceApplied);
  const dbStringingApplicationId =
    typeof data.stringingApplicationId === "string" ? data.stringingApplicationId : "";

  const hintedWithService =
    typeof data.queryHint?.withService === "boolean" ? data.queryHint.withService : null;
  const hintedStringingSubmitted =
    typeof data.queryHint?.stringingSubmitted === "boolean"
      ? data.queryHint.stringingSubmitted
      : null;
  const hintedStringingApplicationId =
    typeof data.queryHint?.stringingApplicationId === "string"
      ? data.queryHint.stringingApplicationId
      : "";

  const withService = dbWithService;
  const stringingApplied = dbStringingApplied;
  const stringingApplicationId = dbStringingApplicationId;

  const hasStateMismatch =
    (hintedWithService !== null && hintedWithService !== dbWithService) ||
    (hintedStringingSubmitted !== null && hintedStringingSubmitted !== dbStringingApplied) ||
    (Boolean(hintedStringingApplicationId) &&
      hintedStringingApplicationId !== dbStringingApplicationId);

  const rentalStringingHref = dbStringingApplicationId
    ? `/mypage?tab=orders&flowType=rental&flowId=${encodeURIComponent(data.id)}&from=orders&focus=stringing`
    : null;
  const isPickup = data.shipping?.shippingMethod === "pickup";

  const total =
    typeof data.total === "number"
      ? data.total
      : data.fee + data.deposit + (data.stringPrice ?? 0) + (data.stringingFee ?? 0);
  const bankKeyFromServer = data.payment?.bank || "";
  const depositorFromServer = data.payment?.depositor || "";
  const bankKeyFallback =
    (typeof window !== "undefined" && sessionStorage.getItem("rentals-last-bank")) || "";
  const depositorFallback =
    (typeof window !== "undefined" && sessionStorage.getItem("rentals-last-depositor")) || "";
  const bankKey = bankKeyFromServer || bankKeyFallback;
  const depositor = depositorFromServer || depositorFallback;
  const bankInfo = bankKey ? (bankLabelMap as any)[bankKey] : null;

  const refundBankKey =
    data.refundAccount?.bank ||
    (typeof window !== "undefined" && sessionStorage.getItem("rentals-refund-bank")) ||
    "";
  const refundAccount =
    data.refundAccount?.account ||
    (typeof window !== "undefined" && sessionStorage.getItem("rentals-refund-account")) ||
    "";
  const refundHolder =
    data.refundAccount?.holder ||
    (typeof window !== "undefined" && sessionStorage.getItem("rentals-refund-holder")) ||
    "";
  const refundBankLabel = refundBankKey ? getRefundBankLabel(refundBankKey) : null;

  const paymentSummary = getPaymentDisplaySummary({
    method: data.paymentInfo?.method ?? data.payment?.method,
    provider: data.paymentInfo?.provider ?? data.payment?.method,
    easyPayProvider: data.paymentInfo?.easyPayProvider ?? data.paymentInfo?.rawSummary?.easyPay?.provider,
    cardDisplayName: data.paymentInfo?.cardDisplayName,
    cardCompany: data.paymentInfo?.cardCompany,
    cardLabel: data.paymentInfo?.cardLabel,
    niceCard: data.paymentInfo?.niceCard,
    rawSummary: data.paymentInfo?.rawSummary,
    bank: data.paymentInfo?.bank,
    depositor: data.paymentInfo?.depositor,
  });
  const paymentMethodLabel = paymentSummary.userLabel;
  const normalizedPaymentProvider = String(data.paymentInfo?.provider ?? "")
    .trim()
    .toLowerCase();
  const normalizedPaymentStatus = String(data.paymentStatus ?? data.paymentInfo?.status ?? "")
    .trim()
    .toLowerCase();
  const isOnlinePayment =
    normalizedPaymentProvider === "nicepay" || normalizedPaymentProvider === "tosspayments";
  const isOnlinePaid =
    isOnlinePayment && ["paid", "결제완료"].includes(normalizedPaymentStatus);
  const isBankTransfer = data.payment?.method === "bank_transfer";
  const rentalDetailHref = `/mypage?tab=orders&flowType=rental&flowId=${encodeURIComponent(data.id)}&from=orders`;
  const rentalProgressGuide = (() => {
    if (withService) {
      return {
        status: "대여 라켓 준비 중",
        todo: "사용자가 별도로 라켓을 발송하지 않아도 됩니다.",
        next: "매장에서 대여 라켓에 스트링을 장착해 준비합니다.",
      };
    }
    return {
      status: isBankTransfer ? "입금 확인 대기" : isOnlinePaid ? "결제 확인 완료" : "대여 준비 중",
      todo: isBankTransfer
        ? "입금 확인 후 대여 준비가 진행됩니다."
        : "대여 라켓 출고 또는 수령 준비를 기다려주세요.",
      next: isPickup
        ? "방문 전 수령 상태를 확인해주세요."
        : "배송이 시작되면 마이페이지에서 확인할 수 있습니다.",
    };
  })();

  return (
    <div className="min-h-full bg-muted/30">
      <SiteContainer variant="wide" className="py-8 md:py-12">
        <ResultState
          status="success"
          icon={<CheckCircle className="h-6 w-6" />}
          title="대여 신청이 완료되었습니다"
          description="현재 상태와 다음 단계, 대여 라켓 정보를 확인해주세요."
          className="py-8 sm:py-10"
        />
      </SiteContainer>

      <SiteContainer variant="wide" className="py-8">
        <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
          {hasStateMismatch && (
            <Card className="border-0 bg-warning/10 shadow-lg shadow-foreground/[0.03] ring-1 ring-warning/40">
              <CardHeader className="border-b border-warning/20 bg-warning/10 p-4 sm:p-5">
                <CardTitle className="text-ui-body text-warning">접수 상태 확인 중</CardTitle>
                <CardDescription className="text-warning/90">
                  최신 상태 동기화 중입니다. 잠시 후 새로고침하거나 마이페이지의 주문/대여 내역에서 최종 상태를
                  확인해 주세요.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card className="overflow-hidden border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
            <div className="border-b bg-secondary/30 p-4 sm:p-5">
              <CardTitle className="flex items-center gap-3 text-ui-page-title">
                <Package className="h-6 w-6 text-primary" />
                대여 정보
                {withService && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-ui-label font-medium text-muted-foreground">
                    교체서비스 포함
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-2 text-ui-card-title-lg">
                {withService
                  ? "접수된 대여 및 교체서비스 정보를 함께 확인하세요."
                  : isPickup
                    ? "접수된 대여 정보와 결제/수령 진행 상황을 확인하세요."
                    : "접수된 대여 정보와 결제/배송 진행 상황을 확인하세요."}
              </CardDescription>
            </div>
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="divide-y divide-border/60 border-y border-border text-ui-body-sm">
                <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-muted-foreground">대여 접수번호:</span>{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {shortenId(data.id)}
                  </span>
                </p>
                {withService && stringingApplicationId && (
                  <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-muted-foreground">교체서비스 접수번호:</span>{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {shortenId(stringingApplicationId)}
                    </span>
                  </p>
                )}
                <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-muted-foreground">대여 상태:</span>{" "}
                  <span className="font-semibold text-foreground">
                    {rentalStatusLabel(data.status, data.payment?.method === "bank_transfer")}
                  </span>
                </p>
                {withService && (
                  <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-muted-foreground">교체서비스 상태:</span>{" "}
                    <span className="font-semibold text-foreground">
                      {stringingApplied
                        ? stringingStatusLabel(data.applicationSummary?.status || "접수완료")
                        : "접수 확인 중"}
                    </span>
                  </p>
                )}
              </div>

              <div className="mt-5 border-l-2 border-primary bg-primary/5 px-3 py-3 text-ui-body-sm text-muted-foreground sm:px-4">
                <h3 className="font-semibold text-foreground">현재 상태와 다음 단계</h3>
                <div className="mt-3 grid gap-3 leading-relaxed md:grid-cols-3">
                  <div>
                    <p className="font-semibold text-foreground">현재 상태</p>
                    <p className="mt-1">{rentalProgressGuide.status}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">지금 할 일</p>
                    <p className="mt-1">{rentalProgressGuide.todo}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">다음 단계</p>
                    <p className="mt-1">{rentalProgressGuide.next}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button asChild className="flex-1">
                    <Link href={rentalDetailHref}>주문/대여 내역 확인</Link>
                  </Button>
                  {withService && rentalStringingHref && (
                    <Button asChild variant="outline" className="flex-1">
                      <Link href={rentalStringingHref}>교체서비스 진행상태 확인</Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/support">고객센터 문의하기</Link>
                  </Button>
                </div>
              </div>

              <Separator className="my-4 md:my-6" />

              <div className="mb-4 md:mb-6">
                <h3 className="mb-4 flex items-center gap-2 text-ui-card-title-lg font-semibold">
                  <Package className="h-5 w-5 text-foreground" /> 대여 라켓
                </h3>
                <div className="border-y border-border py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="min-w-0 break-words font-semibold text-foreground">
                        {data.racket
                          ? `${racketBrandLabel(data.racket.brand)} ${data.racket.model}`
                          : "라켓 정보 없음"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge
                          variant={badgeToneVariant("brand")}
                          className="px-2 py-0.5 text-ui-label"
                        >
                          상태 {data.racket?.condition}
                        </Badge>
                        <span className="text-ui-body-sm text-muted-foreground">
                          대여 기간: {data.period}일
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {withService && stringingApplied && data.applicationSummary && (
                <>
                  <Separator className="my-4 md:my-6" />
                  <div className="space-y-3">
                    <h3 className="text-ui-card-title-lg font-semibold text-foreground">
                      교체서비스 정보
                    </h3>
                    <div className="divide-y divide-border/60 border-y border-border text-ui-body-sm">
                      <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">접수 방식:</span>{" "}
                        <span className="font-semibold text-foreground">
                          {data.applicationSummary.receptionLabel}
                        </span>
                      </p>
                      <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">라인 수:</span>{" "}
                        <span className="font-semibold text-foreground">
                          {data.applicationSummary.lineCount}개
                        </span>
                      </p>
                      {data.applicationSummary.stringNames.length > 0 && (
                        <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-muted-foreground">선택 스트링:</span>{" "}
                          <span className="font-semibold text-foreground">
                            {data.applicationSummary.stringNames.join(", ")}
                          </span>
                        </p>
                      )}
                      {data.applicationSummary.tensionSummary && (
                        <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-muted-foreground">텐션:</span>{" "}
                          <span className="font-semibold text-foreground">
                            {data.applicationSummary.tensionSummary}
                          </span>
                        </p>
                      )}
                      {data.applicationSummary.reservationLabel && (
                        <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-muted-foreground">방문 예약:</span>{" "}
                          <span className="font-semibold text-foreground">
                            {data.applicationSummary.reservationLabel}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator className="my-4 md:my-6" />

              <div className="space-y-3">
                <h3 className="text-ui-card-title-lg font-semibold text-foreground">금액 정보</h3>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">대여 수수료</span>
                  <span className="text-ui-card-title-lg font-semibold">
                    {data.fee.toLocaleString()}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">보증금</span>
                  <span className="text-ui-card-title-lg font-semibold">
                    {data.deposit.toLocaleString()}원
                  </span>
                </div>
                {data.stringPrice > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">스트링 상품</span>
                    <span className="text-ui-card-title-lg font-semibold">
                      {data.stringPrice.toLocaleString()}원
                    </span>
                  </div>
                )}
                {data.stringingFee > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">교체서비스</span>
                    <span className="text-ui-card-title-lg font-semibold">
                      {data.stringingFee.toLocaleString()}원
                    </span>
                  </div>
                )}
                <Separator />
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between text-ui-page-title font-semibold">
                    <span className="text-foreground">총 결제 금액</span>
                    <span className="text-primary">{total.toLocaleString()}원</span>
                  </div>
                  <p className="mt-2 border-l-2 border-primary/40 bg-muted/20 px-3 py-2 text-ui-body-sm text-muted-foreground">
                    * 반납 완료 후 보증금 환불 (연체/파손 시 차감)
                  </p>
                </div>
              </div>

              <Separator className="my-4 md:my-6" />

              <div className="space-y-3">
                <h3 className="text-ui-card-title-lg font-semibold text-foreground">결제 정보</h3>
                {isOnlinePaid ? (
                  <div className="space-y-2 border-l-2 border-primary bg-primary/5 px-3 py-3 text-ui-body-sm sm:px-4">
                    <p className="text-muted-foreground">결제가 완료되었습니다.</p>
                    <div>
                      결제수단: <b>{paymentMethodLabel}</b>
                    </div>
                    {data.paymentInfo?.approvedAt && (
                      <div>
                        승인시각:{" "}
                        <b>{new Date(data.paymentInfo.approvedAt).toLocaleString("ko-KR")}</b>
                      </div>
                    )}
                    {data.paymentInfo?.cardCompany && (
                      <div>
                        카드사: <b>{data.paymentInfo.cardCompany}</b>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-l-2 border-primary bg-primary/5 px-3 py-3 text-ui-body-sm sm:px-4">
                    <p className="text-muted-foreground">
                      아래 계좌로 입금해 주세요. 입금 확인 후 결제완료로 상태가 변경됩니다.
                    </p>
                    {bankInfo && (
                      <div className="mt-4 space-y-1">
                        <div>
                          은행: <b>{bankInfo.label}</b>
                        </div>
                        <div>
                          계좌: <b>{bankInfo.account}</b>
                        </div>
                        <div>
                          예금주: <b>{bankInfo.holder}</b>
                        </div>
                        {depositor && (
                          <div>
                            입금자명: <b>{depositor}</b>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator className="my-4 md:my-6" />

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-ui-card-title-lg font-semibold text-foreground">
                  <MapPin className="h-5 w-5 text-foreground" />
                  수령 정보
                </h3>
                <div className="divide-y divide-border/60 border-y border-border text-ui-body-sm">
                  {isPickup ? (
                    <>
                      <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">수령 방식:</span>{" "}
                        <span className="font-semibold">방문 수령 선택됨</span>
                      </p>
                      <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">이름:</span>{" "}
                        <span className="font-semibold">{data.shipping?.name || "-"}</span>
                      </p>
                      <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">연락처:</span>{" "}
                        <span className="font-semibold">{data.shipping?.phone || "-"}</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">이름:</span>{" "}
                        <span className="font-semibold">{data.shipping?.name || "-"}</span>
                      </p>
                      <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">연락처:</span>{" "}
                        <span className="font-semibold">{data.shipping?.phone || "-"}</span>
                      </p>
                      <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">우편번호:</span>{" "}
                        <span className="font-semibold">{data.shipping?.postalCode || "-"}</span>
                      </p>
                      <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">주소:</span>{" "}
                        <span className="font-semibold">{data.shipping?.address || "-"}</span>
                      </p>
                      <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">상세주소:</span>{" "}
                        <span className="font-semibold">{data.shipping?.addressDetail || "-"}</span>
                      </p>
                      <p className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">요청사항:</span>{" "}
                        <span className="font-semibold">
                          {data.shipping?.deliveryRequest || "-"}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              <Separator className="my-4 md:my-6" />

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-ui-card-title-lg font-semibold text-foreground">
                  <Undo2 className="h-5 w-5 text-foreground" />
                  보증금 환급 계좌
                </h3>
                <div className="border-l-2 border-primary bg-primary/5 px-3 py-3 text-ui-body-sm sm:px-4">
                  <p className="text-muted-foreground">
                    반납 완료 후 아래 계좌로 보증금을 환급해 드립니다.
                  </p>
                  <div className="mt-4 space-y-1">
                    {refundBankLabel && (
                      <div>
                        은행: <b>{refundBankLabel}</b>
                      </div>
                    )}
                    {refundAccount && (
                      <div>
                        계좌: <b>{refundAccount}</b>
                      </div>
                    )}
                    {refundHolder && (
                      <div>
                        예금주: <b>{refundHolder}</b>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="border-t bg-secondary/30 p-4 sm:p-5 md:p-6">
              <div className="flex w-full flex-col gap-4 sm:flex-row">
                <Button
                  className="h-12 flex-1 shadow-sm transition-[box-shadow,background-color,color] duration-200 hover:shadow-md"
                  asChild
                >
                  <Link href="/mypage?tab=orders&scope=rental" className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    주문/대여 내역 확인
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                {rentalStringingHref ? (
                  <Button
                    variant="outline"
                    className="h-12 flex-1 shadow-sm transition-[box-shadow,background-color,color] duration-200 hover:shadow-md"
                    asChild
                  >
                    <Link href={rentalStringingHref} className="flex items-center gap-2">
                      교체서비스 신청 내역 보기
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  className="h-12 flex-1 shadow-sm transition-[box-shadow,background-color,color] duration-200 hover:shadow-md"
                  asChild
                >
                  <Link href="/rackets" className="flex items-center gap-2">
                    다른 라켓 보기
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card className="border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
            <CardHeader className="border-b bg-secondary/30 p-4 sm:p-5">
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-foreground" />
                대여 안내사항
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 border-l-2 border-border bg-muted/20 px-3 py-3">
                    <Truck className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="mb-1 font-semibold text-foreground">
                        {isPickup ? "방문 수령 안내" : "완성 라켓 배송 안내"}
                      </h4>
                      <p className="text-ui-body-sm text-muted-foreground">
                        {isPickup
                          ? "입금 확인 후 매장에서 수령 준비가 진행됩니다."
                          : "결제 완료 후 대여 라켓 배송이 시작됩니다."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 border-l-2 border-border bg-muted/20 px-3 py-3">
                    <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="mb-1 font-semibold text-foreground">대여 기간</h4>
                      <p className="text-ui-body-sm text-muted-foreground">
                        대여 기간은 {data.period}일입니다. 반납 기한을 꼭 지켜주세요.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 border-l-2 border-border bg-muted/20 px-3 py-3">
                    <Shield className="mt-0.5 h-5 w-5 text-foreground" />
                    <div>
                      <h4 className="mb-1 font-semibold text-foreground">보증금 환불</h4>
                      <p className="text-ui-body-sm text-muted-foreground">
                        반납 완료 시 보증금이 환불됩니다. 연체 또는 파손 시 차감될 수 있습니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 border-l-2 border-border bg-muted/20 px-3 py-3">
                    <Phone className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="mb-1 font-semibold text-foreground">고객 지원</h4>
                      <p className="text-ui-body-sm text-muted-foreground">
                        대여 관련 문의사항은 고객센터(010-5218-5248)로 연락주세요.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SiteContainer>
    </div>
  );
}
