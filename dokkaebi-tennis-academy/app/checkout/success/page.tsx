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
import CheckoutApplyHandoffClient from '@/app/checkout/success/_components/CheckoutApplyHandoffClient';

type PopulatedItem = {
  name: string;
  price: number;
  quantity: number;
};

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ orderId?: string; autoApply?: string }> }) {
  const sp = await searchParams;
  const orderId = sp.orderId;
  const autoApply = sp.autoApply === '1';

  if (!orderId) return notFound();

  const client = await clientPromise;
  const db = client.db();
  const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });

  if (!order) return notFound();

  const appParams = new URLSearchParams({ orderId: order._id.toString() });
  let appHref = `/services/apply?${appParams.toString()}`;

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
  // autoApply=1 + withStringService=true 인 경우: 성공페이지 대신 "핸드오프 화면"만 보여주기
  const isHandoff = autoApply && order.shippingInfo?.withStringService === true;

  if (isHandoff) {
    return (
      <>
        <BackButtonGuard />
        <ClearCartOnMount />
        <SetGuestOrderToken orderId={order._id.toString()} isGuest={isGuest} />

        <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="container mx-auto px-4 py-12">
            <CheckoutApplyHandoffClient href={appHref} orderId={order._id.toString()} seconds={8} />

            <div className="mt-6 flex justify-center">
              <Button variant="outline" asChild>
                <Link href={orderDetailHref} target="_blank" rel="noopener noreferrer">
                  주문 상세 보기(새 탭)
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // 안전한 가격 표시 함수
  const formatPrice = (price: any): string => {
    const numPrice = Number(price);
    return isNaN(numPrice) || numPrice === null || numPrice === undefined ? '0' : numPrice.toLocaleString();
  };

  // 안전한 수량 표시 함수
  const formatQuantity = (quantity: any): number => {
    const numQuantity = Number(quantity);
    return isNaN(numQuantity) || numQuantity === null || numQuantity === undefined ? 1 : numQuantity;
  };

  const populatedItems: PopulatedItem[] = (order.items || []).map((it: any) => {
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
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white dark:from-green-700 dark:via-emerald-700 dark:to-teal-700">
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40"></div>
          <div className="absolute inset-0 bg-[url('/placeholder.svg?height=400&width=800')] opacity-10"></div>
          <div className="relative container mx-auto px-4 py-16">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 dark:bg-white/30 backdrop-blur-sm rounded-full mb-6  ">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">주문이 완료되었습니다!</h1>
              <p className="text-xl text-green-100 mb-6">주문해주셔서 감사합니다. 아래 정보를 확인해주세요.</p>

              {/* <div className="flex flex-wrap justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-400" />
                  <span>안전한 결제 완료</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span>빠른 처리</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span>프리미엄 서비스</span>
                </div>
              </div> */}
            </div>

            {/* 서비스 ON이면 항상 노출 */}
            {order.shippingInfo?.withStringService && (
              <div className="mt-8 max-w-2xl mx-auto">
                <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur-sm border border-yellow-300/30 rounded-xl p-6 text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="p-2 bg-yellow-400/20 rounded-full">
                      <Package className="h-6 w-6 text-yellow-300" />
                    </div>
                    <h3 className="text-xl font-bold text-yellow-100">스트링 장착 서비스 포함</h3>
                  </div>
                  {/* 문구 분기: 방문/택배 */}
                  <p className="text-yellow-200 mb-4">{order.shippingInfo?.deliveryMethod === '방문수령' ? '방문 수령 시 현장 장착으로 진행됩니다. 평균 15~20분 소요.' : '택배 수령을 선택하셨으므로 수거/반송을 통해 장착 서비스가 진행됩니다.'}</p>
                  <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold shadow-lg" asChild>
                    {/* 신청서로 곧바로 이동 (자동 생성 전제) */}
                    <Link href={appHref} className="flex items-center gap-2">
                      장착 서비스 신청서 작성하기
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  {/* <AutoRedirectToApply enabled={autoApply} href={appHref} seconds={5} /> */}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 주문 정보 카드 */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10 p-6">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Package className="h-6 w-6 text-blue-600" />
                  주문 정보
                </CardTitle>
                <CardDescription className="mt-2 text-lg">
                  주문 번호: <span className="font-mono font-semibold text-blue-600">{order._id.toString()}</span>
                </CardDescription>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">주문일자</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {new Date(order.createdAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                      <CreditCard className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">결제 방법</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">무통장입금</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard className="h-5 w-5 text-orange-600" />
                      <h3 className="font-bold text-orange-700 dark:text-orange-400">입금 계좌 정보</h3>
                    </div>
                    {order.paymentInfo?.bank && bankLabelMap[order.paymentInfo.bank] ? (
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border-2 border-orange-200 dark:border-orange-800 space-y-2">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{bankLabelMap[order.paymentInfo.bank].label}</div>
                        <div className="font-mono text-lg font-bold text-blue-600">{bankLabelMap[order.paymentInfo.bank].account}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">예금주: {bankLabelMap[order.paymentInfo.bank].holder}</div>
                      </div>
                    ) : (
                      <p className="text-slate-500">선택된 은행 없음</p>
                    )}
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-red-700 dark:text-red-400 font-semibold text-sm">⏰ 입금 기한: {new Date(order.createdAt).toLocaleDateString('ko-KR')} 23:59까지</p>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* 주문 상품 */}
                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-600" /> 주문 상품
                  </h3>
                  <div className="space-y-3">
                    {populatedItems.map((item: PopulatedItem, index: number) => {
                      const itemPrice = formatPrice(item.price);
                      const itemQuantity = formatQuantity(item.quantity);
                      const totalItemPrice = formatPrice(item.price * itemQuantity);

                      return (
                        <div key={index} className="flex justify-between items-center p-4 bg-gradient-to-r from-slate-50/50 to-blue-50/30 rounded-lg">
                          <div className="flex-1">
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-sm text-slate-600">수량: {itemQuantity}개</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-blue-600">{totalItemPrice}원</p>
                            <p className="text-sm text-slate-500">단가: {itemPrice}원</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator className="my-6" />

                {/* 배송 정보 */}
                <div className="mb-6">
                  <h3 className="flex items-center gap-2 font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">
                    <MapPin className="h-5 w-5 text-green-600" />
                    배송 정보
                  </h3>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">수령인:</span>
                        <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">{order.shippingInfo?.name || '정보 없음'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">연락처:</span>
                        <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">{order.shippingInfo?.phone || '정보 없음'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">주소:</span>
                      <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">{order.shippingInfo?.address || '정보 없음'}</span>
                    </div>
                    {order.shippingInfo?.deliveryRequest && (
                      <div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">배송 요청사항:</span>
                        <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">{order.shippingInfo.deliveryRequest}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-6" />

                {/* 결제 금액 - 안전한 데이터 처리 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="space-y-2">
                    {Number(pointsUsed) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-700 dark:text-slate-300">포인트 적용 전 금액</span>
                        <span className="font-semibold">{formatPrice(originalTotal)}원</span>
                      </div>
                    )}

                    {Number(pointsUsed) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-700 dark:text-slate-300">포인트 사용</span>
                        <span className="font-semibold text-rose-600">-{formatPrice(pointsUsed)}원</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-2xl font-bold pt-2">
                      <span className="text-slate-800 dark:text-slate-200">총 결제 금액</span>
                      <span className="text-blue-600">{formatPrice(order.totalPrice)}원</span>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-400">(배송비 {formatPrice(order.shippingFee)}원 포함)</p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="bg-gradient-to-r from-slate-50/50 via-blue-50/30 to-purple-50/30 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-600/30 p-6">
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <Button
                    className="flex-1 h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 hover:from-blue-700 hover:via-purple-700 hover:to-teal-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                    asChild
                  >
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
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10">
                <CardTitle className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-indigo-600" />
                  주문 안내사항
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
                      <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-1">입금 안내</h4>
                        <p className="text-sm text-blue-600 dark:text-blue-400">주문하신 상품의 결제 금액을 위 계좌로 입금해주세요.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                      <Package className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-green-700 dark:text-green-400 mb-1">배송 안내</h4>
                        <p className="text-sm text-green-600 dark:text-green-400">입금 확인 후 배송이 시작됩니다.</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                      <Star className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-1">주문 확인</h4>
                        <p className="text-sm text-purple-600 dark:text-purple-400">주문 내역은 마이페이지에서 확인하실 수 있습니다.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg">
                      <Phone className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-1">고객 지원</h4>
                        <p className="text-sm text-orange-600 dark:text-orange-400">배송 관련 문의사항은 고객센터(02-123-4567)로 연락주세요.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
