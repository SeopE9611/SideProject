import Link from 'next/link';
import { CheckCircle, CreditCard, MapPin, Package, Clock, ArrowRight, Star, Shield, Phone, Calendar, Gift, Target, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { bankLabelMap } from '@/lib/constants';

const Trophy = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z"
    />
  </svg>
);

export default async function PackageSuccessPage({ searchParams }: { searchParams: { packageOrderId?: string } }) {
  const packageOrderId = await searchParams.packageOrderId;

  if (!packageOrderId) return notFound();

  const client = await clientPromise;
  const db = client.db();
  const packageOrder = await db.collection('packageOrders').findOne({ _id: new ObjectId(packageOrderId) });

  if (!packageOrder) return notFound();

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken')?.value;

  let isLoggedIn = false;
  if (refreshToken) {
    try {
      jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
      isLoggedIn = true;
    } catch {}
  }

  // 안전한 가격 표시 함수
  const formatPrice = (price: any): string => {
    const numPrice = Number(price);
    return isNaN(numPrice) || numPrice === null || numPrice === undefined ? '0' : numPrice.toLocaleString();
  };

  const packageInfo = packageOrder.packageInfo;
  const serviceInfo = packageOrder.serviceInfo;
  const paymentInfo = packageOrder.paymentInfo;

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 400 300" fill="none">
            <defs>
              <pattern id="stringPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect width="40" height="40" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
                <line x1="0" y1="20" x2="40" y2="20" stroke="white" strokeWidth="1" opacity="0.5" />
                <line x1="20" y1="0" x2="20" y2="40" stroke="white" strokeWidth="1" opacity="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#stringPattern)" />
          </svg>
        </div>
        <div className="relative container py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-6 animate-bounce">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">패키지 구매가 완료되었습니다!</h1>
            <p className="text-xl text-blue-100 mb-6">스트링 교체 패키지를 구매해주셔서 감사합니다. 아래 정보를 확인해주세요.</p>

            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-400" />
                <span>안전한 결제 완료</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-400" />
                <span>패키지 활성화 대기</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span>프리미엄 서비스</span>
              </div>
            </div>
          </div>

          {/* 패키지 활성화 안내 */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur-sm border border-yellow-300/30 rounded-xl p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-2 bg-yellow-400/20 rounded-full">
                  <Package className="h-6 w-6 text-yellow-300" />
                </div>
                <h3 className="text-xl font-bold text-yellow-100">패키지 활성화 안내</h3>
              </div>
              <p className="text-yellow-200 mb-4">입금 확인 후 패키지가 활성화되며, 스트링 교체 서비스 예약이 가능합니다.</p>
              <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold shadow-lg" asChild>
                <Link href="/services" className="flex items-center gap-2">
                  서비스 예약하기
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 패키지 주문 정보 카드 */}
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10 p-6">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Package className="h-6 w-6 text-blue-600" />
                패키지 주문 정보
              </CardTitle>
              <CardDescription className="mt-2 text-lg">
                주문 번호: <span className="font-mono font-semibold text-blue-600">{packageOrder._id.toString()}</span>
              </CardDescription>
            </div>
            <CardContent className="p-6">
              {/* 패키지 정보 */}
              <div className="mb-8">
                <div
                  className={`p-6 bg-gradient-to-r ${
                    packageInfo.id.includes('10')
                      ? 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'
                      : packageInfo.id.includes('30')
                      ? 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20'
                      : packageInfo.id.includes('50')
                      ? 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20'
                      : 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20'
                  } rounded-xl border-2 ${
                    packageInfo.id.includes('10')
                      ? 'border-blue-200 dark:border-blue-800'
                      : packageInfo.id.includes('30')
                      ? 'border-indigo-200 dark:border-indigo-800'
                      : packageInfo.id.includes('50')
                      ? 'border-purple-200 dark:border-purple-800'
                      : 'border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className={`w-16 h-16 rounded-full bg-gradient-to-br ${
                        packageInfo.id.includes('10') ? 'from-blue-500 to-cyan-500' : packageInfo.id.includes('30') ? 'from-indigo-500 to-purple-500' : packageInfo.id.includes('50') ? 'from-purple-500 to-pink-500' : 'from-emerald-500 to-teal-500'
                      } flex items-center justify-center text-white shadow-lg`}
                    >
                      {packageInfo.id.includes('10') ? <Target className="h-8 w-8" /> : packageInfo.id.includes('30') ? <Star className="h-8 w-8" /> : packageInfo.id.includes('50') ? <Award className="h-8 w-8" /> : <Trophy className="h-8 w-8" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-2xl font-bold">{packageInfo.title}</h3>
                        {packageInfo.id.includes('30') && <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">인기</Badge>}
                      </div>
                      <p className="text-gray-600 dark:text-gray-300">구매하신 스트링 교체 패키지입니다.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{packageInfo.sessions}회</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">스트링 교체</div>
                    </div>
                    <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-2xl font-bold text-indigo-600">{packageInfo.validityPeriod}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">유효기간</div>
                    </div>
                    <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{(packageInfo.price / packageInfo.sessions).toLocaleString()}원</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">회당 가격</div>
                    </div>
                    <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-2xl font-bold text-emerald-600">{formatPrice(packageInfo.price)}원</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">총 금액</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">주문일자</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {new Date(packageOrder.createdAt).toLocaleDateString('ko-KR', {
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
                  {paymentInfo?.bank && bankLabelMap[paymentInfo.bank] ? (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border-2 border-orange-200 dark:border-orange-800 space-y-2">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{bankLabelMap[paymentInfo.bank].label}</div>
                      <div className="font-mono text-lg font-bold text-blue-600">{bankLabelMap[paymentInfo.bank].account}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">예금주: {bankLabelMap[paymentInfo.bank].holder}</div>
                    </div>
                  ) : (
                    <p className="text-slate-500">선택된 은행 없음</p>
                  )}
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-red-700 dark:text-red-400 font-semibold text-sm">⏰ 입금 기한: {new Date(packageOrder.createdAt).toLocaleDateString('ko-KR')} 23:59까지</p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* 신청자 정보 */}
              <div className="mb-6">
                <h3 className="flex items-center gap-2 font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">
                  <MapPin className="h-5 w-5 text-green-600" />
                  신청자 정보
                </h3>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">신청자:</span>
                      <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">{serviceInfo?.name || '정보 없음'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">연락처:</span>
                      <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">{serviceInfo?.phone || '정보 없음'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">이메일:</span>
                    <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">{serviceInfo?.email || '정보 없음'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">서비스 방식:</span>
                    <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">{serviceInfo?.serviceMethod || '정보 없음'}</span>
                  </div>
                  {serviceInfo?.serviceMethod === '출장서비스' && serviceInfo?.address && (
                    <div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">서비스 주소:</span>
                      <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">
                        {serviceInfo.address} {serviceInfo.addressDetail}
                      </span>
                    </div>
                  )}
                  {serviceInfo?.serviceRequest && (
                    <div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">서비스 요청사항:</span>
                      <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">{serviceInfo.serviceRequest}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-6" />

              {/* 결제 금액 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between items-center text-2xl font-bold">
                  <span className="text-slate-800 dark:text-slate-200">총 결제 금액</span>
                  <span className="text-blue-600">{formatPrice(packageOrder.totalPrice)}원</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">패키지 이용료 (입금 확인 후 활성화)</p>
              </div>
            </CardContent>

            <CardFooter className="bg-gradient-to-r from-slate-50/50 via-blue-50/30 to-purple-50/30 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-600/30 p-6">
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <Button
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 hover:from-blue-700 hover:via-purple-700 hover:to-teal-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                  asChild
                >
                  <Link href={isLoggedIn ? '/mypage/packages' : `/package-lookup/details/${packageOrder._id}`} className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    패키지 내역 확인
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" className="flex-1 h-12 border-2 hover:bg-slate-50 dark:hover:bg-slate-700 bg-transparent" asChild>
                  <Link href="/services/packages" className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    다른 패키지 보기
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* 안내사항 */}
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10">
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-indigo-600" />
                패키지 이용 안내사항
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
                    <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-1">입금 안내</h4>
                      <p className="text-sm text-blue-600 dark:text-blue-400">패키지 금액을 위 계좌로 입금해주세요. 입금 확인 후 패키지가 활성화됩니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                    <Calendar className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400 mb-1">예약 안내</h4>
                      <p className="text-sm text-green-600 dark:text-green-400">패키지 활성화 후 전화 또는 온라인으로 서비스 예약이 가능합니다.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                    <Star className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-1">유효기간</h4>
                      <p className="text-sm text-purple-600 dark:text-purple-400">패키지는 {packageInfo.validityPeriod} 동안 유효하며, 기간 내 모든 횟수를 이용해주세요.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg">
                    <Phone className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-1">고객 지원</h4>
                      <p className="text-sm text-orange-600 dark:text-orange-400">패키지 관련 문의사항은 고객센터(02-123-4567)로 연락주세요.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
