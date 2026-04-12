import ContinueShoppingButton from '@/app/checkout/_components/ContinueShoppingButton';
import BackButtonGuard from '@/app/checkout/success/_components/BackButtonGuard';
import ClearCartOnMount from '@/app/checkout/success/_components/ClearCartOnMount';
import SetGuestOrderToken from '@/app/checkout/success/_components/SetGuestOrderToken';
import SiteContainer from '@/components/layout/SiteContainer';
import LoginGate from '@/components/system/LoginGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { verifyAccessToken, verifyOrderAccessToken } from '@/lib/auth.utils';
import { buildCheckoutSuccessLinks } from '@/lib/checkout-success-links';
import { bankLabelMap } from '@/lib/constants';
import clientPromise from '@/lib/mongodb';
import { getOrderDeliveryInfoTitle, isVisitPickupOrder, shouldShowDeliveryOnlyFields } from '@/lib/order-shipping';
import { ArrowRight, CheckCircle, Clock, CreditCard, MapPin, Package, Phone, Shield, Star } from 'lucide-react';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type PopulatedItem = {
  name: string;
  price: number;
  quantity: number;
};

type NumericLike = number | string | null | undefined;
type OrderItemLike = { name?: string; price?: NumericLike; quantity?: NumericLike } | null | undefined;

type StringingSummary = {
  lineCount: number;
  stringNames: string[];
  tensionSummary: string | null;
  receptionLabel: string;
  reservationLabel: string | null;
  serviceFeeBefore: number | null;
  serviceFeeAfter: number | null;
  packageInfo: {
    applied: boolean;
    useCount: number;
    passId: string | null;
    passTitle: string | null;
    packageSize: number | null;
    usedCount: number | null;
    remainingCount: number | null;
    redeemedAt: string | null;
  };
};

function getApplicationLines(stringDetails: any): any[] {
  if (Array.isArray(stringDetails?.lines)) return stringDetails.lines;
  if (Array.isArray(stringDetails?.racketLines)) return stringDetails.racketLines;
  return [];
}

function getReceptionLabel(collectionMethod?: string | null): string {
  if (collectionMethod === 'visit') return '방문 접수';
  if (collectionMethod === 'courier_pickup') return '기사 방문 수거';
  return '발송 접수';
}

const EASY_PAY_PROVIDER_LABEL_MAP: Record<string, string> = {
  TOSSPAY: '토스페이',
  KAKAOPAY: '카카오페이',
  NAVERPAY: '네이버페이',
  PAYCO: '페이코',
  SAMSUNGPAY: '삼성페이',
  LGPAY: 'LG페이',
};

function getTossMethodLabel(method?: string, easyPayProvider?: string | null) {
  const normalizedMethod = String(method ?? '').trim().toUpperCase();
  const hasEasyPayProvider = Boolean(String(easyPayProvider ?? '').trim());

  if (normalizedMethod.includes('CARD') && (normalizedMethod.includes('EASY') || hasEasyPayProvider)) {
    return '카드/간편결제';
  }
  if (normalizedMethod.includes('EASY') || hasEasyPayProvider) {
    return '간편결제';
  }
  if (normalizedMethod.includes('CARD')) {
    return '카드 결제';
  }
  return '카드/간편결제';
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
    return verifyOrderAccessToken(token);
  } catch {
    return null;
  }
}

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const sp = await searchParams;
  const orderId = sp.orderId;

  if (!orderId || !ObjectId.isValid(orderId)) return notFound();

  // 비회원/게스트 주문 차단 모드면, success 페이지도 "로그인 필수"로 막는다.
  // (orderId만으로 주문 정보가 렌더링되는 것을 DB 조회 전에 차단)
  const guestOrderMode = (process.env.GUEST_ORDER_MODE ?? process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  const allowGuestCheckout = guestOrderMode === 'on';
  if (!allowGuestCheckout) {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const payload = safeVerifyAccessToken(token);
    if (!payload?.sub) {
      const qs = new URLSearchParams();
      qs.set('orderId', orderId);
      const next = `/checkout/success?${qs.toString()}`;
      return <LoginGate next={next} variant="checkout" />;
    }
  }

  const client = await clientPromise;
  const db = client.db();
  const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });

  if (!order) return notFound();

  const cookieStore = await cookies();
  const accessPayload = safeVerifyAccessToken(cookieStore.get('accessToken')?.value);
  const orderAccessPayload = safeVerifyOrderAccessToken(cookieStore.get('orderAccessToken')?.value);
  const ownerUserId = order.userId ? String(order.userId) : null;

  const isMemberOwner = !!(accessPayload?.sub && ownerUserId && accessPayload.sub === ownerUserId);
  const guestOrderId = orderAccessPayload && 'orderId' in orderAccessPayload && typeof orderAccessPayload.orderId === 'string' ? orderAccessPayload.orderId : null;

  const isGuestOwner = !!(guestOrderId && guestOrderId === String(order._id));
  if (!isMemberOwner && !isGuestOwner) return notFound();

  const appParams = new URLSearchParams({ orderId: order._id.toString() });
  const appHref = `/services/apply?${appParams.toString()}`;

  const withStringService = order.shippingInfo?.withStringService === true;
  const orderStringingApplicationId = typeof order.stringingApplicationId === 'string' && order.stringingApplicationId.trim() ? order.stringingApplicationId.trim() : null;

  const submittedStatusExclusions = ['draft', 'canceled', 'cancelled', '취소'];
  const latestSubmittedByOrderApp = withStringService
    ? await db.collection('stringing_applications').findOne(
        {
          $and: [
            {
              $or: [{ orderId: order._id }, { orderId: order._id.toString() }],
            },
            { status: { $nin: submittedStatusExclusions } },
          ],
        },
        { projection: { _id: 1 }, sort: { createdAt: -1, _id: -1 } },
      )
    : null;

  const orderLinkedSubmittedApp =
    withStringService && orderStringingApplicationId && ObjectId.isValid(orderStringingApplicationId)
      ? await db.collection('stringing_applications').findOne(
          {
            _id: new ObjectId(orderStringingApplicationId),
            status: { $nin: submittedStatusExclusions },
          },
          { projection: { _id: 1 } },
        )
      : null;

  const representativeStringingApplicationId = (orderLinkedSubmittedApp?._id ? String(orderLinkedSubmittedApp._id) : null) ?? (latestSubmittedByOrderApp?._id ? String(latestSubmittedByOrderApp._id) : null);
  const hasSubmittedApplication = Boolean(representativeStringingApplicationId);

  const { isLoggedIn, orderDetailHref, stringingApplicationHref } = buildCheckoutSuccessLinks({
    accessSub: accessPayload?.sub,
    orderId: order._id.toString(),
    stringingApplicationId: representativeStringingApplicationId,
  });
  const isGuest = !isLoggedIn && (!order.userId || order.guest === true);
  const shouldShowApplyCta = withStringService && !hasSubmittedApplication;
  const isVisitPickup = isVisitPickupOrder(order.shippingInfo);
  const showDeliveryOnlyFields = shouldShowDeliveryOnlyFields(order.shippingInfo);

  let stringingSummary: StringingSummary | null = null;
  if (hasSubmittedApplication && representativeStringingApplicationId && ObjectId.isValid(representativeStringingApplicationId)) {
    const app = await db.collection('stringing_applications').findOne(
      { _id: new ObjectId(representativeStringingApplicationId) },
      {
        projection: {
          stringDetails: 1,
          collectionMethod: 1,
          packageApplied: 1,
          packagePassId: 1,
          packageRedeemedAt: 1,
          packageUseCount: 1,
          serviceFeeBefore: 1,
          serviceFee: 1,
          totalPrice: 1,
        },
      },
    );
    if (app) {
      const lines = getApplicationLines((app as any).stringDetails);
      const stringNames = Array.from(new Set(lines.map((line: any) => String(line?.stringName ?? '').trim()).filter(Boolean)));
      const tensionSet = Array.from(
        new Set(
          lines
            .map((line: any) => {
              const main = String(line?.tensionMain ?? '').trim();
              const cross = String(line?.tensionCross ?? '').trim();
              if (!main && !cross) return '';
              return cross && cross !== main ? `${main}/${cross}` : main || cross;
            })
            .filter(Boolean),
        ),
      );
      const preferredDate = String((app as any)?.stringDetails?.preferredDate ?? '').trim();
      const preferredTime = String((app as any)?.stringDetails?.preferredTime ?? '').trim();
      const packagePassId = (app as any)?.packagePassId ? String((app as any).packagePassId) : null;
      const passDoc =
        packagePassId && ObjectId.isValid(packagePassId)
          ? await db.collection('service_passes').findOne(
              { _id: new ObjectId(packagePassId) },
              { projection: { packageSize: 1, usedCount: 1, remainingCount: 1, meta: 1 } },
            )
          : null;
      const serviceFeeBeforeRaw = Number((app as any)?.serviceFeeBefore);
      const serviceFeeAfterCandidates = [Number((app as any)?.serviceFee), Number((app as any)?.totalPrice)];
      const serviceFeeAfterRaw = serviceFeeAfterCandidates.find((v) => Number.isFinite(v));

      stringingSummary = {
        lineCount: lines.length,
        stringNames,
        tensionSummary: tensionSet.length ? tensionSet.join(', ') : null,
        receptionLabel: getReceptionLabel((app as any).collectionMethod),
        reservationLabel: preferredDate && preferredTime ? `${preferredDate} ${preferredTime}` : null,
        serviceFeeBefore: Number.isFinite(serviceFeeBeforeRaw) ? serviceFeeBeforeRaw : null,
        serviceFeeAfter: Number.isFinite(serviceFeeAfterRaw) ? (serviceFeeAfterRaw as number) : null,
        packageInfo: {
          applied: Boolean((app as any)?.packageApplied),
          useCount: typeof (app as any)?.packageUseCount === 'number' ? (app as any).packageUseCount : lines.length > 0 ? lines.length : 1,
          passId: packagePassId,
          passTitle: String((passDoc as any)?.meta?.planTitle ?? '').trim() || null,
          packageSize: typeof (passDoc as any)?.packageSize === 'number' ? (passDoc as any).packageSize : null,
          usedCount: typeof (passDoc as any)?.usedCount === 'number' ? (passDoc as any).usedCount : null,
          remainingCount: typeof (passDoc as any)?.remainingCount === 'number' ? (passDoc as any).remainingCount : null,
          redeemedAt: (app as any)?.packageRedeemedAt ? new Date((app as any).packageRedeemedAt).toISOString() : null,
        },
      };
    }
  }

  // 안전한 가격 표시 함수
  const formatPrice = (price: NumericLike): string => {
    const numPrice = Number(price);
    return isNaN(numPrice) || numPrice === null || numPrice === undefined ? '0' : numPrice.toLocaleString();
  };

  // 안전한 수량 표시 함수
  const formatQuantity = (quantity: NumericLike): number => {
    const numQuantity = Number(quantity);
    return isNaN(numQuantity) || numQuantity === null || numQuantity === undefined ? 1 : numQuantity;
  };

  const populatedItems: PopulatedItem[] = (order.items || []).map((it: OrderItemLike) => {
    const quantity = formatQuantity(it?.quantity);
    const price = Number(it?.price);

    return {
      name: it?.name ?? '상품명 없음',
      price: Number.isFinite(price) ? price : 0,
      quantity,
    };
  });

  // 포인트/적용 전 금액 안전 추출(필드가 없을 수도 있으니 fallback)
  const originalTotal = order.originalTotalPrice ?? order.paymentInfo?.originalTotal ?? order.totalPrice ?? 0;
  const pointsUsed = order.pointsUsed ?? order.paymentInfo?.pointsUsed ?? 0;
  const totalPrice = Number(order.totalPrice ?? 0);
  const normalizedTotalPrice = Number.isFinite(totalPrice) ? totalPrice : 0;
  const originalTotalNumber = Number(originalTotal);
  const normalizedOriginalTotal = Number.isFinite(originalTotalNumber) ? originalTotalNumber : 0;
  const pointsUsedNumber = Number(pointsUsed);
  const normalizedPointsUsed = Number.isFinite(pointsUsedNumber) ? pointsUsedNumber : 0;
  const serviceFeeRaw = Number(order.paymentInfo?.serviceFee ?? order.serviceFee ?? 0);
  const normalizedServiceFee = Number.isFinite(serviceFeeRaw) ? serviceFeeRaw : 0;
  const shippingFeeRaw = Number(order.paymentInfo?.shippingFee ?? order.shippingFee ?? 0);
  const normalizedShippingFee = Number.isFinite(shippingFeeRaw) ? shippingFeeRaw : 0;
  const productAmount = Math.max(0, normalizedOriginalTotal - normalizedServiceFee - normalizedShippingFee);
  // 0원 결제 시 입금 안내 오해 방지
  const isZeroPayment = normalizedTotalPrice <= 0 || normalizedOriginalTotal - normalizedPointsUsed <= 0;
  const paymentProvider = String(order.paymentInfo?.provider ?? '').trim().toLowerCase();
  const paymentMethodRaw = String(order.paymentInfo?.method ?? '').trim();
  const easyPayProviderRaw = String(order.paymentInfo?.rawSummary?.easyPay?.provider ?? '').trim().toUpperCase();
  const easyPayProviderLabel = easyPayProviderRaw ? EASY_PAY_PROVIDER_LABEL_MAP[easyPayProviderRaw] ?? easyPayProviderRaw : null;
  const isTossPayment = paymentProvider === 'tosspayments';
  const paymentMethodLabel = isZeroPayment ? '결제 불필요' : isTossPayment ? getTossMethodLabel(paymentMethodRaw, easyPayProviderRaw) : '무통장입금';

  return (
    <>
      <BackButtonGuard />
      <ClearCartOnMount />
      <SetGuestOrderToken orderId={order._id.toString()} isGuest={isGuest} />
      <div className="min-h-full bg-background text-foreground">
        {/* Hero Section */}
        <div className="relative overflow-hidden border-b border-border bg-muted/30 text-foreground dark:bg-card/40">
          <div className="absolute inset-0 bg-muted/50 dark:bg-card/60"></div>
          <SiteContainer variant="wide" className="relative py-10 md:py-16">
            <div className="text-center">
              <div className="mb-4 md:mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 backdrop-blur-sm dark:bg-primary/20">
                <CheckCircle className="h-12 w-12 text-foreground" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">주문이 완료되었습니다!</h1>
              <p className="mb-4 md:mb-6 text-xl text-muted-foreground">주문해주셔서 감사합니다. 아래 정보를 확인해주세요.</p>
            </div>
          </SiteContainer>
        </div>

        <SiteContainer variant="wide" className="py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 주문 정보 카드 */}
            <Card data-cy="checkout-success-order-card" className="overflow-hidden border border-border bg-card shadow-2xl backdrop-blur-sm">
              <div className="border-b border-border bg-background p-6">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Package className="h-6 w-6 text-primary" />
                  주문 정보
                  {withStringService && <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">교체 서비스 포함</span>}
                </CardTitle>
                <CardDescription className="mt-2 text-muted-foreground">주문 및 교체 서비스 진행 정보를 한 번에 확인하세요.</CardDescription>
              </div>
              <CardContent className="p-4 md:p-6">
                {/* 문서 정보 */}
                <div className="mb-6">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                    <Shield className="h-5 w-5 text-primary" />
                    문서 정보
                  </h3>
                  <div className="space-y-3 rounded-lg border border-border bg-background p-4">
                    <div>
                      <span className="text-sm text-muted-foreground">주문 번호:</span>{' '}
                      <span data-cy="checkout-order-id" className="font-mono font-semibold text-foreground">
                        {order._id.toString()}
                      </span>
                    </div>
                    {withStringService && hasSubmittedApplication && representativeStringingApplicationId && (
                      <div>
                        <span className="text-sm text-muted-foreground">교체 서비스 신청 번호:</span>{' '}
                        <span className="font-mono font-semibold text-foreground">{representativeStringingApplicationId}</span>
                      </div>
                    )}
                    {withStringService && (
                      <p className="text-sm text-muted-foreground">
                        {hasSubmittedApplication ? '주문과 함께 교체 서비스 신청이 접수되었습니다.' : '현재 주문에 교체 서비스가 포함되어 있습니다.'}
                      </p>
                    )}
                    {withStringService && hasSubmittedApplication && stringingApplicationHref ? (
                      <Button variant="outline" className="w-full sm:w-auto bg-transparent" asChild>
                        <Link href={stringingApplicationHref} className="flex items-center gap-2">
                          신청 내역 보기
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">주문일자</p>
                        <p className="font-semibold text-foreground">
                          {new Date(order.createdAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">결제 방법</p>
                        {isZeroPayment ? (
                          <>
                            <p className="font-semibold text-foreground">결제 완료 (결제 금액 0원)</p>
                            <p className="text-sm text-muted-foreground">포인트 전액 사용 등으로 추가 입금이 필요하지 않습니다.</p>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-foreground">{paymentMethodLabel}</p>
                            {isTossPayment && <p className="text-sm text-muted-foreground">결제 제공사: Toss Payments</p>}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <h3 className="font-bold text-foreground">{isTossPayment ? '결제 완료 정보' : '입금 계좌 정보'}</h3>
                    </div>
                    {isZeroPayment ? (
                      <div className="space-y-2 rounded-lg border border-border bg-card p-4">
                        <p className="font-semibold text-foreground">추가 입금 불필요</p>
                        <p className="text-sm text-muted-foreground">결제 금액이 0원으로 확인되어 입금 안내가 생략되었습니다.</p>
                      </div>
                    ) : isTossPayment ? (
                      <div className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
                        <p>
                          <span className="text-muted-foreground">결제 상태:</span> <span className="font-semibold text-foreground">{order.paymentStatus || '결제완료'}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">결제 방식:</span> <span className="font-semibold text-foreground">{paymentMethodLabel}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">결제 제공사:</span> <span className="font-semibold text-foreground">Toss Payments</span>
                        </p>
                        {easyPayProviderLabel && (
                          <p>
                            <span className="text-muted-foreground">간편결제:</span> <span className="font-semibold text-foreground">{easyPayProviderLabel}</span>
                          </p>
                        )}
                        <p className="text-muted-foreground">결제가 정상 승인되어 주문이 완료되었습니다.</p>
                      </div>
                    ) : order.paymentInfo?.bank && bankLabelMap[order.paymentInfo.bank] ? (
                      <>
                        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
                          <div className="font-semibold text-foreground">{bankLabelMap[order.paymentInfo.bank].label}</div>
                          <div className="font-mono text-lg font-bold text-primary">{bankLabelMap[order.paymentInfo.bank].account}</div>
                          <div className="text-sm text-muted-foreground">예금주: {bankLabelMap[order.paymentInfo.bank].holder}</div>
                        </div>
                        <div className="mt-4 rounded-lg border border-border bg-card p-3">
                          <p className="text-sm font-semibold text-primary">⏰ 입금 기한: {new Date(order.createdAt).toLocaleDateString('ko-KR')} 23:59까지</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">선택된 은행 없음</p>
                    )}
                  </div>
                </div>

                <Separator className="my-6" />

                {/* 주문 상품 */}
                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" /> 주문 상품
                  </h3>
                  <div className="space-y-3">
                    {populatedItems.map((item: PopulatedItem, index: number) => {
                      const itemPrice = formatPrice(item.price);
                      const itemQuantity = formatQuantity(item.quantity);
                      const totalItemPrice = formatPrice(item.price * itemQuantity);

                      return (
                        <div key={index} className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{item.name}</p>
                            <p className="text-sm text-muted-foreground">수량: {itemQuantity}개</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">{totalItemPrice}원</p>
                            <p className="text-sm text-muted-foreground">단가: {itemPrice}원</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator className="my-6" />

                {/* 교체 서비스 정보 */}
                {withStringService && (
                  <>
                    <div className="mb-6">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                        <Package className="h-5 w-5 text-primary" />
                        교체 서비스 정보
                      </h3>
                      {hasSubmittedApplication && stringingSummary ? (
                        <div className="space-y-2 rounded-lg border border-border bg-background p-4 text-sm text-foreground">
                          <p>
                            <span className="text-muted-foreground">접수 방식:</span> <span className="font-semibold">{stringingSummary.receptionLabel}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">작업 수량:</span> <span className="font-semibold">{stringingSummary.lineCount}자루</span>
                          </p>
                          {stringingSummary.stringNames.length > 0 && (
                            <p>
                              <span className="text-muted-foreground">선택 스트링:</span> <span className="font-semibold">{stringingSummary.stringNames.join(', ')}</span>
                            </p>
                          )}
                          {stringingSummary.tensionSummary && (
                            <p>
                              <span className="text-muted-foreground">텐션:</span> <span className="font-semibold">{stringingSummary.tensionSummary}</span>
                            </p>
                          )}
                          {stringingSummary.reservationLabel && (
                            <p>
                              <span className="text-muted-foreground">예약 정보:</span> <span className="font-semibold">{stringingSummary.reservationLabel}</span>
                            </p>
                          )}
                          <Separator className="my-3" />
                          <div className="space-y-1.5 rounded-md border border-border bg-card p-3">
                            <p className="font-semibold text-foreground">패키지 적용 정보</p>
                            {stringingSummary.packageInfo.applied ? (
                              <>
                                <p>
                                  <span className="text-muted-foreground">패키지 사용:</span> <span className="font-semibold text-primary">적용됨</span>
                                </p>
                                <p>
                                  <span className="text-muted-foreground">사용 패키지:</span>{' '}
                                  <span className="font-semibold">{stringingSummary.packageInfo.passTitle ?? '패키지명 확인 불가'}</span>
                                </p>
                                <p>
                                  <span className="text-muted-foreground">이번 차감 횟수:</span>{' '}
                                  <span className="font-semibold">{stringingSummary.packageInfo.useCount}회</span>
                                </p>
                                {typeof stringingSummary.packageInfo.remainingCount === 'number' && (
                                  <p>
                                    <span className="text-muted-foreground">남은 횟수:</span>{' '}
                                    <span className="font-semibold">{stringingSummary.packageInfo.remainingCount}회</span>
                                  </p>
                                )}
                                <p>
                                  <span className="text-muted-foreground">교체 서비스 비용:</span> <span className="font-semibold text-primary">0원 처리</span>
                                </p>
                              </>
                            ) : (
                              <>
                                <p>
                                  <span className="text-muted-foreground">패키지 사용:</span> <span className="font-semibold">적용 안 됨</span>
                                </p>
                                <p className="text-muted-foreground">사용 가능한 패키지가 없거나 이번 주문에 패키지가 적용되지 않아 교체 서비스 비용이 일반 결제로 반영되었습니다.</p>
                                <p>
                                  <span className="text-muted-foreground">교체 서비스 비용:</span>{' '}
                                  <span className="font-semibold">{formatPrice(stringingSummary.serviceFeeAfter ?? normalizedServiceFee)}원</span>
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 rounded-lg border border-border bg-background p-4">
                          <p className="text-sm text-muted-foreground">
                            {isVisitPickup ? '방문 수령 시 현장 장착으로 진행됩니다. 평균 15~20분 소요.' : '택배 수령을 선택하셨으므로 수거/반송을 통해 장착 서비스가 진행됩니다.'}
                          </p>
                          {shouldShowApplyCta ? (
                            <Button className="bg-primary text-primary-foreground font-semibold shadow-lg hover:bg-primary/90" asChild>
                              <Link href={appHref} className="flex items-center gap-2">
                                장착 서비스 신청서 작성하기
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <Separator className="my-6" />
                  </>
                )}

                {/* 수령/배송 정보 */}
                <div className="mb-6">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                    <MapPin className="h-5 w-5 text-primary" />
                    {getOrderDeliveryInfoTitle(order.shippingInfo)}
                  </h3>
                  <div className="space-y-2 rounded-lg border border-border bg-background p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">수령인:</span>
                        <span className="ml-2 font-semibold text-foreground">{order.shippingInfo?.name || '정보 없음'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">연락처:</span>
                        <span className="ml-2 font-semibold text-foreground">{order.shippingInfo?.phone || '정보 없음'}</span>
                      </div>
                    </div>
                    {showDeliveryOnlyFields && (
                      <div>
                        <span className="text-sm text-muted-foreground">주소:</span>
                        <span className="ml-2 font-semibold text-foreground">{order.shippingInfo?.address || '정보 없음'}</span>
                      </div>
                    )}
                    {!showDeliveryOnlyFields && <p className="text-sm text-muted-foreground">매장 방문 시 주문번호를 제시해주세요.</p>}
                    {showDeliveryOnlyFields && order.shippingInfo?.deliveryRequest && (
                      <div>
                        <span className="text-sm text-muted-foreground">배송 요청사항:</span>
                        <span className="ml-2 font-semibold text-foreground">{order.shippingInfo.deliveryRequest}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-6" />

                {/* 결제 금액 - 안전한 데이터 처리 */}
                <div className="rounded-xl border border-border bg-background p-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">상품 금액</span>
                      <span className="font-semibold">{formatPrice(productAmount)}원</span>
                    </div>

                    {withStringService && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">교체 서비스 비용</span>
                        <span className="font-semibold">{formatPrice(normalizedServiceFee)}원</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{isVisitPickup ? '추가 비용' : '배송비'}</span>
                      <span className="font-semibold">{formatPrice(normalizedShippingFee)}원</span>
                    </div>

                    {normalizedPointsUsed > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">포인트 사용</span>
                        <span className="font-semibold text-primary">-{formatPrice(normalizedPointsUsed)}원</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-2xl font-bold pt-2">
                      <span className="text-foreground">총 결제 금액</span>
                      <span className="text-primary">{formatPrice(order.totalPrice)}원</span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      ({isVisitPickup ? '추가 비용' : '배송비'} {formatPrice(normalizedShippingFee)}원 포함)
                    </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t border-border bg-background p-4 md:p-6">
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <Button className="h-12 flex-1 bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary/90 hover:shadow-xl" asChild>
                    <Link href={isLoggedIn ? '/mypage' : `/order-lookup/details/${order._id}`} className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      주문 내역 확인
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <div className="flex-1">
                    <ContinueShoppingButton deliveryMethod={order.shippingInfo?.deliveryMethod} withStringService={order.shippingInfo?.withStringService} />
                  </div>
                </div>
              </CardFooter>
            </Card>

            {/* 안내사항 */}
            <Card className="border border-border bg-card shadow-xl backdrop-blur-sm">
              <CardHeader className="border-b border-border bg-background">
                <CardTitle className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  주문 안내사항
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                      <CreditCard className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">입금 안내</h4>
                        <p className="text-sm text-muted-foreground">주문하신 상품의 결제 금액을 위 계좌로 입금해주세요.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                      <Package className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">{isVisitPickup ? '방문 수령 안내' : '배송 안내'}</h4>
                        <p className="text-sm text-muted-foreground">{isVisitPickup ? '입금 확인 후 매장에서 수령 준비가 진행됩니다.' : '입금 확인 후 배송이 시작됩니다.'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                      <Star className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">주문 확인</h4>
                        <p className="text-sm text-muted-foreground">주문 내역은 마이페이지에서 확인하실 수 있습니다.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                      <Phone className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">고객 지원</h4>
                        <p className="text-sm text-muted-foreground">{isVisitPickup ? '방문 수령 관련 문의사항은 고객센터(0507-1392-3493)로 연락주세요.' : '배송 관련 문의사항은 고객센터(0507-1392-3493)로 연락주세요.'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SiteContainer>
      </div>
    </>
  );
}
