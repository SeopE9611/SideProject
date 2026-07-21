"use client";

import SiteContainer from "@/components/layout/SiteContainer";
import { EmptyState, PublicPageHero, ResultState } from "@/components/public";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingBag,
  ChevronRight,
  Calendar,
  User,
  Phone,
  CreditCard,
  ArrowLeft,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  Shield,
  Store,
} from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import LoginGate from "@/components/system/LoginGate";
import { badgeToneVariant, getOrderStatusTone, getPaymentStatusTone } from "@/lib/badge-style";
import { formatKoreanPhone } from "@/lib/phone";
import {
  hasCompletedStringingApplication,
  normalizeStringingApplicationId,
} from "@/app/order-lookup/_lib/stringing-status";
import { getOrderStatusLabelForDisplay, isVisitPickupOrder } from "@/lib/order-shipping";
import { getGuestOrderNextActionText } from "@/app/order-lookup/_lib/guestOrderNextAction";
import { getCommonOrderStatusLabel } from "@/lib/status-labels/base";
import { getCustomerOrderPaymentStatusLabel } from "@/app/mypage/_lib/flow-display";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const onlyDigits = (v: string) => v.replace(/\D/g, "");
const isValidKoreanPhoneDigits = (digits: string) => digits.length === 10 || digits.length === 11;

type GuestOrderMode = "off" | "legacy" | "on";

function getGuestOrderModeClient(): GuestOrderMode {
  // 클라이언트에서는 NEXT_PUBLIC_만 접근 가능
  // env가 없으면 legacy로 기본값 처리(= 신규 비회원 주문은 막고, 기존 조회만 유지 가능)
  const raw = (process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? "legacy").trim();
  return raw === "off" || raw === "legacy" || raw === "on" ? raw : "legacy";
}

// 주문 타입 정의
const FIELD_LABELS: Record<string, string> = {
  name: "이름",
  email: "이메일",
  phone: "전화번호",
};

// 주문 타입 정의
interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  recipient: string;
  contactNumber: string;
  totalAmount: number | null;
  status: string;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentInfo?: {
    status?: string | null;
    method?: string | null;
    provider?: string | null;
  };
  shippingInfo?: {
    deliveryMethod?: string;
    shippingMethod?: string;
    withStringService?: boolean;
  };
  isStringServiceApplied?: boolean;
  stringingApplicationId?: string | null;
}

const getStatusIcon = (status: string, isVisitPickup: boolean) => {
  switch (status) {
    case "배송완료":
      return <CheckCircle2 className="w-4 h-4" />;
    case "배송중":
      return isVisitPickup ? <Store className="w-4 h-4" /> : <Truck className="w-4 h-4" />;
    case "배송준비중":
      return <Clock className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
};

const getLookupOrderStatusLabel = (status?: string, shippingLike?: any) => {
  const normalized = String(status ?? "").trim();
  const baseLabel = getCommonOrderStatusLabel(normalized) ?? normalized;
  if (!baseLabel) return "배송준비중";
  return getOrderStatusLabelForDisplay(baseLabel, shippingLike);
};

export default function OrderLookupResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  // 비회원 주문 조회(게스트) 접근 허용 여부(클라)
  const guestOrderMode = getGuestOrderModeClient();
  const allowGuestLookup = guestOrderMode !== "off";

  // 이름과 이메일 파라미터 가져오기
  const rawName: string = searchParams.get("name") ?? "";
  const rawEmail: string = searchParams.get("email") ?? "";
  const rawPhone: string = searchParams.get("phone") ?? "";

  // 화면 표시는 trim 된 값 기준 (공백만 들어오는 케이스 방지)
  const displayName = rawName.trim();

  useEffect(() => {
    if (!allowGuestLookup) {
      setLoading(false);
      return;
    }
    const fetchOrders = async () => {
      try {
        setFieldErrors(null);

        // 1) URL 파라미터 정규화
        const name = rawName.trim();
        const email = rawEmail.trim();
        const phoneDigits = rawPhone ? onlyDigits(rawPhone) : "";

        // 2) URL 파라미터 검증 (서버와 동일 기준)
        if (!name) {
          setError("이름이 비어있습니다. 주문 조회 페이지에서 다시 입력해주세요.");
          setLoading(false);
          return;
        }

        if (name.length > 50) {
          setError("이름은 50자 이내로 입력해주세요.");
          setLoading(false);
          return;
        }
        if (!email) {
          setError("이메일이 비어있습니다. 주문 조회 페이지에서 다시 입력해주세요.");
          setLoading(false);
          return;
        }
        if (!EMAIL_RE.test(email) || email.length > 254) {
          setError("유효한 이메일 주소를 입력해주세요.");
          setLoading(false);
          return;
        }
        if (phoneDigits && !isValidKoreanPhoneDigits(phoneDigits)) {
          setError("전화번호는 숫자 10~11자리만 입력해주세요.");
          setLoading(false);
          return;
        }

        // 3) 서버로는 "정규화된 값"만 전송 (phone은 빈 값이면 제외)
        const payload: { name: string; email: string; phone?: string } = {
          name,
          email,
        };
        if (phoneDigits) payload.phone = phoneDigits;

        const res = await fetch("/api/guest-orders/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });

        const data = await res.json();

        // 400(유효성 실패)도 여기로 들어오므로 ok/success 기준으로 분기
        if (!res.ok || !data?.success) {
          setError(data?.error ?? "주문 조회 요청 값이 올바르지 않습니다.");
          setFieldErrors(data?.fieldErrors ?? null);
          setLoading(false);
          return;
        }

        if (data.orders.length > 0) {
          setOrders(
            data.orders.map((o: any) => ({
              id: o._id, // key로 사용할 고유 ID
              orderNumber: o._id.slice(-6), // 보기 좋게 마지막 6자리만 주문번호처럼 사용
              orderDate: new Date(o.createdAt).toLocaleDateString(),
              recipient: o.shippingInfo?.name ?? "",
              contactNumber: formatKoreanPhone(o.shippingInfo?.phone) || "",
              totalAmount: typeof o.totalPrice === "number" ? o.totalPrice : null,
              status: o.status ?? "배송준비중",
              paymentStatus: o.paymentStatus ?? null,
              paymentMethod: o.paymentMethod ?? null,
              paymentInfo: {
                status: o.paymentInfo?.status ?? null,
                method: o.paymentInfo?.method ?? null,
                provider: o.paymentInfo?.provider ?? null,
              },
              shippingInfo: {
                deliveryMethod: o.shippingInfo?.deliveryMethod,
                shippingMethod: o.shippingInfo?.shippingMethod,
                withStringService: o.shippingInfo?.withStringService,
              },
              isStringServiceApplied: o.isStringServiceApplied,
              stringingApplicationId: normalizeStringingApplicationId(o.stringingApplicationId),
            })),
          );
        } else {
          setOrders([]);
        }

        setLoading(false);
      } catch (err) {
        console.error("주문 조회 중 오류 발생:", err);
        setError("주문 정보를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.");
        setLoading(false);
      }
    };

    fetchOrders();
  }, [rawName, rawEmail, rawPhone, allowGuestLookup]);

  if (!allowGuestLookup) {
    return <LoginGate next="/mypage" variant="orderLookup" />;
  }

  // 상세 페이지로 이동
  const handleViewDetails = (orderId: string) => {
    router.push(`/order-lookup/details/${orderId}`);
  };

  // 주문 조회 페이지로 돌아가기
  const handleGoBack = () => {
    router.push("/order-lookup");
  };
  const isInitialLoading = loading && !orders && !error;

  // 금액 포맷팅 함수
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      currencyDisplay: "symbol",
    }).format(amount);
  };

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-full bg-background">
        <SiteContainer className="flex min-h-[60vh] items-center py-10 md:py-16">
          <ResultState
            status="error"
            title="주문 정보를 불러오지 못했어요"
            description={error}
            actions={
              <Button
                onClick={handleGoBack}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                주문 조회 페이지로 돌아가기
              </Button>
            }
          >
            {fieldErrors && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-foreground dark:bg-destructive/15">
                <p className="mb-2 text-ui-label font-semibold text-destructive">
                  입력값 오류 상세
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {Object.entries(fieldErrors).map(([field, msgs]) =>
                    (msgs ?? []).map((msg, i) => (
                      <li key={`${field}-${i}`} className="text-ui-label text-destructive">
                        <span className="font-medium">{FIELD_LABELS[field] ?? field}:</span> {msg}
                      </li>
                    )),
                  )}
                </ul>
              </div>
            )}
          </ResultState>
        </SiteContainer>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <PublicPageHero
        align="center"
        eyebrow="조회 결과"
        title="주문 조회 결과"
        description={`${displayName}님의 주문 내역 ${orders?.length || 0}건을 확인했어요. 주문 상태와 다음 행동을 카드에서 확인해주세요.`}
      >
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card shadow-sm">
          <CheckCircle2 className="h-7 w-7" />
        </div>
      </PublicPageHero>

      <SiteContainer className="py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <div className="mb-6 md:mb-8">
            <Link
              href="/order-lookup"
              className="inline-flex items-center text-ui-body-sm text-muted-foreground hover:text-primary transition-colors group"
            >
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              이전 페이지로 돌아가기
            </Link>
          </div>

          <Card className="border border-border bg-card shadow-sm mb-6 md:mb-8">
            <CardHeader className="text-center pb-6 md:pb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary rounded-full mb-4 mx-auto border border-border/60">
                <ShoppingBag className="w-6 h-6 text-foreground" />
              </div>
              <CardTitle className="text-ui-card-title-lg font-semibold text-foreground">
                <span className="text-primary">주문</span> 내역
              </CardTitle>
              <CardDescription className="text-ui-body">
                {displayName}님의 주문 내역입니다
              </CardDescription>
            </CardHeader>

            <Separator className="mx-6" />

            <CardContent className="pt-6 md:pt-8">
              {isInitialLoading ? (
                <ResultState
                  status="info"
                  title="주문 내역을 불러오는 중입니다"
                  description="입력하신 정보와 일치하는 주문을 확인하고 있어요."
                  className="py-8 sm:py-10"
                />
              ) : orders && orders.length > 0 ? (
                <div className="space-y-4 md:space-y-6">
                  {orders.map((order, index) => {
                    const hasStringingApplication = hasCompletedStringingApplication(order);
                    // 비회원 조회도 관리자/마이페이지와 동일한 공용 방문 수령 판별 유틸을 사용해 정책 일관성을 유지한다.
                    const isVisitPickup = isVisitPickupOrder(order.shippingInfo);
                    const displayStatus = getLookupOrderStatusLabel(
                      order.status,
                      order.shippingInfo,
                    );
                    const rawPaymentStatus =
                      String(order.paymentStatus ?? "").trim() ||
                      String(order.paymentInfo?.status ?? "").trim() ||
                      null;
                    const paymentStatusLabel = getCustomerOrderPaymentStatusLabel({
                      paymentStatus: rawPaymentStatus,
                      paymentMethod: order.paymentMethod ?? order.paymentInfo?.method ?? null,
                      paymentProvider: order.paymentInfo?.provider ?? null,
                      totalPrice: order.totalAmount,
                    });
                    const nextActionText = getGuestOrderNextActionText({
                      status: order.status,
                      displayStatus,
                      paymentStatusLabel,
                      shippingLike: order.shippingInfo,
                    });

                    return (
                      <Card
                        key={order.id}
                        className="overflow-hidden border-2 border-border hover:border-border transition-all duration-200 hover:shadow-lg"
                      >
                        <div className="p-4 md:p-6">
                          {/* Order Header */}
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 md:mb-6">
                            <div className="flex items-center mb-4 lg:mb-0">
                              <div className="flex-shrink-0 w-12 h-12 bg-secondary rounded-full flex items-center justify-center mr-4 border border-border/60">
                                <span className="text-foreground font-semibold">#{index + 1}</span>
                              </div>
                              <div>
                                <h3 className="font-semibold text-ui-card-title-lg text-foreground">
                                  주문번호: {order.orderNumber}
                                </h3>
                                <p className="text-ui-body-sm text-muted-foreground">
                                  주문일자: {order.orderDate}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge
                                variant={badgeToneVariant(
                                  getOrderStatusTone(
                                    getLookupOrderStatusLabel(order.status, order.shippingInfo),
                                  ),
                                )}
                                className="gap-1 px-3 py-1.5 text-ui-label font-medium"
                              >
                                {getStatusIcon(displayStatus, isVisitPickup)}
                                {displayStatus}
                              </Badge>
                              <Badge
                                variant={badgeToneVariant(getPaymentStatusTone(paymentStatusLabel))}
                                className="gap-1 px-3 py-1.5 text-ui-label font-medium"
                              >
                                {paymentStatusLabel}
                              </Badge>
                            </div>
                          </div>

                          {nextActionText && (
                            <div className="mb-4 rounded-lg bg-muted/40 px-3 py-2 text-ui-label text-muted-foreground md:mb-6">
                              {nextActionText}
                            </div>
                          )}

                          {/* Order Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                            <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                              <User className="h-5 w-5 text-primary flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-ui-label text-muted-foreground mb-1">수령인</p>
                                <p className="font-medium text-foreground truncate">
                                  {order.recipient}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                              <Phone className="h-5 w-5 text-success flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-ui-label text-muted-foreground mb-1">연락처</p>
                                <p className="font-medium text-foreground truncate">
                                  {order.contactNumber}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                              <Calendar className="h-5 w-5 text-foreground flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-ui-label text-muted-foreground mb-1">주문일자</p>
                                <p className="font-medium text-foreground">{order.orderDate}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border">
                              <CreditCard className="h-5 w-5 text-primary flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-ui-label text-muted-foreground mb-1">결제금액</p>
                                <p className="font-semibold text-foreground">
                                  {formatCurrency(order.totalAmount)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row gap-3 justify-end">
                            <Button
                              variant="outline"
                              className="flex items-center gap-2 border-border text-foreground hover:bg-secondary hover:border-border bg-background"
                              onClick={() => handleViewDetails(order.id)}
                            >
                              <Package className="w-4 h-4" />
                              상세 보기
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>

                            {order.shippingInfo?.withStringService && (
                              <>
                                {!hasStringingApplication ? (
                                  <div className="flex flex-col items-end gap-2">
                                    <p className="text-ui-label text-muted-foreground">
                                      {isVisitPickup
                                        ? "방문수령 주문의 교체서비스 신청이 가능합니다."
                                        : "택배 기반 교체서비스 신청이 가능합니다."}
                                    </p>
                                    <Button
                                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm transition-all duration-200 hover:shadow-md"
                                      onClick={() =>
                                        router.push(`/services/apply?orderId=${order.id}`)
                                      }
                                    >
                                      <ShoppingBag className="w-4 h-4 mr-2" />
                                      {isVisitPickup
                                        ? "교체서비스 신청하기"
                                        : "교체서비스 신청하기"}
                                    </Button>
                                  </div>
                                ) : (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 py-2 text-ui-body-sm font-semibold text-foreground cursor-default">
                                          <CheckCircle2 className="w-4 h-4 mr-2" />
                                          교체서비스 신청서 접수 완료
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-ui-body-sm">
                                        {isVisitPickup
                                          ? "이미 접수된 신청서가 존재합니다. 방문수령 장착은 접수된 내용으로 진행됩니다."
                                          : "이미 접수된 신청서가 존재합니다. 택배 장착 서비스는 접수된 내용으로 진행됩니다."}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="조회된 주문이 없습니다"
                  description="입력하신 정보와 일치하는 비회원 주문을 찾지 못했습니다. 주문 시 입력한 정보가 정확한지 확인한 뒤 다시 조회해주세요."
                  action={
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
                      <Button
                        onClick={handleGoBack}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        다시 조회하기
                      </Button>
                      <Button asChild variant="outline" className="w-full border-border sm:w-auto">
                        <Link href="/board/qna/write">고객센터 문의하기</Link>
                      </Button>
                    </div>
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>
      </SiteContainer>
    </div>
  );
}
