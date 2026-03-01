import Link from 'next/link';
import { CheckCircle, CreditCard, MapPin, Package, Clock, ArrowRight, Star, Shield, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import ContinueShoppingButton from '@/app/checkout/_components/ContinueShoppingButton';
import { bankLabelMap } from '@/lib/constants';
import BackButtonGuard from '@/app/checkout/success/_components/BackButtonGuard';
import ClearCartOnMount from '@/app/checkout/success/_components/ClearCartOnMount';
import SetGuestOrderToken from '@/app/checkout/success/_components/SetGuestOrderToken';
import SiteContainer from '@/components/layout/SiteContainer';
import { verifyAccessToken } from '@/lib/auth.utils';
import LoginGate from '@/components/system/LoginGate';

type PopulatedItem = {
  name: string;
  price: number;
  quantity: number;
};

type NumericLike = number | string | null | undefined;
type OrderItemLike = { name?: string; price?: NumericLike; quantity?: NumericLike } | null | undefined;

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
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

  const appParams = new URLSearchParams({ orderId: order._id.toString() });
  const appHref = `/services/apply?${appParams.toString()}`;

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken')?.value;

  let isLoggedIn = false;
  if (refreshToken) {
    try {
      jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
      isLoggedIn = true;
    } catch {}
  }

  const isGuest = !isLoggedIn && (!order.userId || order.guest === true);
  const orderDetailHref = isLoggedIn ? '/mypage' : `/order-lookup/details/${order._id.toString()}`;
  const withStringService = order.shippingInfo?.withStringService === true;
  const hasSubmittedApplication = !!order.stringingApplicationId;
  const shouldShowApplyCta = withStringService && !hasSubmittedApplication;

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

  return (
    <>
      <BackButtonGuard />
      <ClearCartOnMount />
      <SetGuestOrderToken orderId={order._id.toString()} isGuest={isGuest} />
      <div className="min-h-full bg-background text-foreground">
        {/* Hero Section */}
        <div className="relative overflow-hidden border-b border-border bg-muted/30 text-foreground dark:bg-card/40">
          <div className="absolute inset-0 bg-muted/50 dark:bg-card/60"></div>
          <SiteContainer variant="wide" className="relative py-16">
            <div className="text-center">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 backdrop-blur-sm dark:bg-primary/20">
                <CheckCircle className="h-12 w-12 text-foreground" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">주문이 완료되었습니다!</h1>
              <p className="mb-6 text-xl text-muted-foreground">주문해주셔서 감사합니다. 아래 정보를 확인해주세요.</p>


            </div>

            {withStringService && (
              <div className="mt-8 max-w-2xl mx-auto">
                <div className="rounded-xl border border-border bg-card/10 p-6 text-center backdrop-blur-sm">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="rounded-full border border-primary/20 bg-primary/10 p-2 text-primary dark:bg-primary/20">
                      <Package className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">스트링 장착 서비스 포함</h3>
                  </div>
                  {/* 문구 분기: 방문/택배 */}
                  {hasSubmittedApplication ? (
                    <p className="mb-1 text-muted-foreground">교체 서비스 신청이 함께 접수되었습니다.</p>
                  ) : (
                    <p className="mb-4 text-muted-foreground">
                      {order.shippingInfo?.deliveryMethod === '방문수령' ? '방문 수령 시 현장 장착으로 진행됩니다. 평균 15~20분 소요.' : '택배 수령을 선택하셨으므로 수거/반송을 통해 장착 서비스가 진행됩니다.'}
                    </p>
                  )}
                  {hasSubmittedApplication ? (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>별도 신청서 작성 없이 현재 주문에 포함되어 처리됩니다.</p>
                      <p>추가 요청/장착 정보도 주문과 함께 저장되었습니다.</p>
                    </div>
                  ) : (
                    <Button className="bg-primary text-primary-foreground font-semibold shadow-lg hover:bg-primary/90" asChild>
                      <Link href={appHref} className="flex items-center gap-2">
                        장착 서비스 신청서 작성하기
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )}
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
                </CardTitle>
                <CardDescription className="mt-2 text-lg text-muted-foreground">
                  주문 번호:{' '}
                  <span data-cy="checkout-order-id" className="font-mono font-semibold text-foreground">
                    {order._id.toString()}
                  </span>
                </CardDescription>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                        <p className="font-semibold text-foreground">무통장입금</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <h3 className="font-bold text-foreground">입금 계좌 정보</h3>
                    </div>
                    {order.paymentInfo?.bank && bankLabelMap[order.paymentInfo.bank] ? (
                      <div className="space-y-2 rounded-lg border border-border bg-card p-4">
                        <div className="font-semibold text-foreground">{bankLabelMap[order.paymentInfo.bank].label}</div>
                        <div className="font-mono text-lg font-bold text-primary">{bankLabelMap[order.paymentInfo.bank].account}</div>
                        <div className="text-sm text-muted-foreground">예금주: {bankLabelMap[order.paymentInfo.bank].holder}</div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">선택된 은행 없음</p>
                    )}
                    <div className="mt-4 rounded-lg border border-border bg-card p-3">
                      <p className="text-sm font-semibold text-primary">⏰ 입금 기한: {new Date(order.createdAt).toLocaleDateString('ko-KR')} 23:59까지</p>
                    </div>
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

                {/* 배송 정보 */}
                <div className="mb-6">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                    <MapPin className="h-5 w-5 text-primary" />
                    배송 정보
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
                    <div>
                      <span className="text-sm text-muted-foreground">주소:</span>
                      <span className="ml-2 font-semibold text-foreground">{order.shippingInfo?.address || '정보 없음'}</span>
                    </div>
                    {order.shippingInfo?.deliveryRequest && (
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
                    {Number(pointsUsed) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">포인트 적용 전 금액</span>
                        <span className="font-semibold">{formatPrice(originalTotal)}원</span>
                      </div>
                    )}

                    {Number(pointsUsed) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">포인트 사용</span>
                        <span className="font-semibold text-primary">-{formatPrice(pointsUsed)}원</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-2xl font-bold pt-2">
                      <span className="text-foreground">총 결제 금액</span>
                      <span className="text-primary">{formatPrice(order.totalPrice)}원</span>
                    </div>

                    <p className="text-sm text-muted-foreground">(배송비 {formatPrice(order.shippingFee)}원 포함)</p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t border-border bg-background p-6">
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
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <h4 className="mb-1 font-semibold text-foreground">배송 안내</h4>
                        <p className="text-sm text-muted-foreground">입금 확인 후 배송이 시작됩니다.</p>
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
                        <p className="text-sm text-muted-foreground">배송 관련 문의사항은 고객센터(02-123-4567)로 연락주세요.</p>
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
