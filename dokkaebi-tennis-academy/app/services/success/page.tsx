import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { bankLabelMap } from '@/lib/constants';
import jwt from 'jsonwebtoken';
import Link from 'next/link';
import { CheckCircle, Calendar, CreditCard, MapPin, Phone, Mail, User, Rocket as Racquet, Clock, Home, FileText, Shield, Award, Zap, Ticket, Package, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import BackButtonGuard from '@/app/services/_components/BackButtonGuard';
import { Badge } from '@/components/ui/badge';
import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';

interface Props {
  searchParams: {
    applicationId?: string;
  };
}

function isValidObjectId(id: string | undefined): boolean {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

export default async function StringServiceSuccessPage(props: Props) {
  const searchParams = await props.searchParams;
  const applicationId = searchParams.applicationId;

  if (!isValidObjectId(applicationId)) return notFound();

  const client = await clientPromise;
  const db = client.db();

  const application = await db.collection('stringing_applications').findOne({ _id: new ObjectId(applicationId) });

  // 수거 방식 표준화
  const rawMethod = application?.shippingInfo?.collectionMethod ?? application?.collectionMethod ?? null; // (레거시 대비)
  const cm = normalizeCollection(typeof rawMethod === 'string' ? rawMethod : 'self_ship'); // 'visit' | 'self_ship' | 'courier_pickup'
  const isVisit = cm === 'visit';
  const isSelfShip = cm === 'self_ship';
  const isCourierPickup = cm === 'courier_pickup'; // 패키지 정보 조회
  let appliedPass: any = null;
  if (application?.packageApplied && application?.packagePassId) {
    try {
      appliedPass = await db.collection('service_passes').findOne({ _id: new ObjectId(application.packagePassId) }, { projection: { remainingCount: 1, packageSize: 1, expiresAt: 1 } });
    } catch {}
  }

  // 여러 개 선택/커스텀 이름까지 합쳐 표시용 이름 랜더
  const stringTypes: string[] = application?.stringDetails?.stringTypes ?? [];

  const productIds = stringTypes.filter((id: string) => id && id !== 'custom' && ObjectId.isValid(id)).map((id: string) => new ObjectId(id));

  let stringNames: string[] = [];

  // products 컬렉션에서 name만
  if (productIds.length) {
    const prods = await db
      .collection('products')
      .find({ _id: { $in: productIds } }, { projection: { name: 1 } })
      .toArray();

    stringNames = prods.map((p: any) => p.name).filter(Boolean);
  }

  // 커스텀 이름이 포함되어 있다면 맨 앞에 붙임
  if (stringTypes.includes('custom') && application?.stringDetails?.customStringName) {
    stringNames.unshift(application.stringDetails.customStringName);
  }

  // 최종 표시 문자열 (여러 개면 " + "로 연결)
  const stringDisplay = stringNames.join(' + ') || '-';

  const racketLines = Array.isArray(application?.stringDetails?.racketLines) ? application.stringDetails.racketLines : [];

  if (!application) return notFound();

  // 로그인 여부 확인
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken')?.value;
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

      <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-500 py-20">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="successCourtLines" x="0" y="0" width="400" height="300" patternUnits="userSpaceOnUse">
                  <rect width="400" height="300" fill="none" stroke="white" strokeWidth="2" />
                  <line x1="200" y1="0" x2="200" y2="300" stroke="white" strokeWidth="2" />
                  <line x1="0" y1="150" x2="400" y2="150" stroke="white" strokeWidth="2" />
                  <rect x="50" y="75" width="300" height="150" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#successCourtLines)" />
            </svg>
          </div>
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
            <div className="absolute top-32 right-20 w-16 h-16 bg-white/10 rounded-full animate-pulse delay-1000"></div>
            <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-white/10 rounded-full animate-pulse delay-500"></div>
          </div>

          <div className="relative container mx-auto px-4 text-center text-white">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm mb-8">
              <CheckCircle className="h-12 w-12 text-blue-300" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">신청이 완료되었습니다!</h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">도깨비 테니스 아카데미에서 확인 후 빠르게 연락드리겠습니다</p>
            <div className="mt-8 inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3">
              <Calendar className="h-5 w-5" />
              <span className="text-sm font-medium">신청일: {new Date(application.createdAt).toLocaleDateString('ko-KR')}</span>
            </div>
          </div>

          {isSelfShip && (
            <div className="mt-10 max-w-2xl mx-auto px-4">
              <div className="bg-gradient-to-r from-blue-400/20 to-indigo-400/20 backdrop-blur-sm border border-blue-300/30 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="p-2 bg-blue-400/20 rounded-full">
                    <Package className="h-6 w-6 text-blue-200" />
                  </div>
                  <h3 className="text-xl font-bold text-blue-100">운송장 등록 안내</h3>
                </div>
                <p className="text-blue-100 mb-4 leading-relaxed">
                  <span className="font-semibold">라켓을 발송하신 뒤</span> 아래 버튼을 눌러 운송장을 등록해 주세요.
                  <br />
                  <span className="text-sm text-blue-200/80">(건너뛰고 마이페이지 → 신청내역 탭에서 등록도 가능합니다)</span>
                </p>
                <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold shadow-lg" asChild>
                  <Link href={`/services/applications/${applicationId}/shipping`} className="flex items-center gap-2">
                    운송장 등록하기
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="container mx-auto px-4 py-16">
          <div className="max-w-5xl mx-auto">
            <Card className="mb-8 backdrop-blur-sm bg-white/90 dark:bg-slate-800/90 border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                      <FileText className="h-6 w-6 mr-3 text-blue-600" />
                      신청 정보
                    </CardTitle>
                    <CardDescription className="text-lg mt-2">
                      신청 번호: <span className="font-mono font-semibold text-blue-600">{application._id.toString()}</span>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      접수 완료
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
                    <div className="flex items-center mb-3">
                      <Calendar className="h-6 w-6 text-blue-600 mr-3" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">신청일자</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{new Date(application.createdAt).toLocaleDateString('ko-KR')}</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
                    <div className="flex items-center mb-3">
                      <CreditCard className="h-6 w-6 text-indigo-600 mr-3" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">장착 금액</h3>
                    </div>
                    <p className="text-2xl font-bold text-indigo-600">{application.totalPrice.toLocaleString()}원</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
                    <div className="flex items-center mb-3">
                      <Clock className="h-6 w-6 text-purple-600 mr-3" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">희망일</h3>
                    </div>
                    {isVisit && application.stringDetails?.preferredDate && application.stringDetails?.preferredTime ? (
                      <>
                        <p className="text-lg font-bold text-purple-600">{application.stringDetails.preferredDate}</p>
                        <p className="text-sm text-purple-500 mt-1">{application.stringDetails.preferredTime}</p>
                      </>
                    ) : (
                      <p className="text-lg font-bold text-purple-600">예약 불필요{isSelfShip || isCourierPickup ? ' (자가발송/기사 수거)' : ''}</p>
                    )}{' '}
                  </div>
                </div>

                {application.packageApplied ? (
                  // ===== 패키지 적용 카드 =====
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Ticket className="h-6 w-6 mr-3 text-emerald-600" />
                      패키지 적용됨
                    </h3>

                    <div className="rounded-xl p-6 border-2 border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-600 text-white grid place-content-center shadow-sm">
                          <Ticket className="h-5 w-5" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-emerald-900 dark:text-emerald-200">교체 패키지가 자동 적용되었습니다.</span>
                            <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">입금 불필요</Badge>
                          </div>

                          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                            장착 금액은 <span className="font-semibold text-emerald-700 dark:text-emerald-300">0원</span> 으로 처리 됩니다.
                          </p>

                          {/* 잔여/만료 pill */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="outline" className="border-emerald-300/60 text-emerald-700 dark:text-emerald-300">
                              잔여 {appliedPass?.remainingCount ?? '-'}회
                            </Badge>
                            <Badge variant="outline" className="border-emerald-300/60 text-emerald-700 dark:text-emerald-300">
                              만료일 {appliedPass?.expiresAt ? new Date(appliedPass.expiresAt).toLocaleDateString('ko-KR') : '-'}
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
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                      <span>
                                        총 {total}회 중 <span className="font-medium text-slate-700">{used}</span>회 사용
                                      </span>
                                      <span className="tabular-nums">{remainPct}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500" style={{ width: `${remainPct}%` }} />
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                      잔여 <span className="font-medium text-emerald-700">{remaining}</span>회
                                    </div>
                                  </div>
                                );
                              })()
                            : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // ===== 기존 입금 계좌 정보 (패키지 미적용 시에만 노출) =====
                  application.shippingInfo?.bank && (
                    <div className="mb-8">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <CreditCard className="h-6 w-6 mr-3 text-blue-600" />
                        입금 계좌 정보
                      </h3>
                      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-6 border-2 border-blue-200 dark:border-slate-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">은행</p>
                            <p className="font-bold text-lg text-gray-900 dark:text-white">{bankLabelMap[application.shippingInfo.bank]?.label}</p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">계좌번호</p>
                            <p className="font-mono font-bold text-lg text-gray-900 dark:text-white">{bankLabelMap[application.shippingInfo.bank]?.account}</p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">예금주</p>
                            <p className="font-bold text-lg text-gray-900 dark:text-white">{bankLabelMap[application.shippingInfo.bank]?.holder}</p>
                          </div>
                        </div>
                        <div className="mt-4 p-4 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 rounded-lg border border-orange-200 dark:border-orange-700">
                          <div className="flex items-center">
                            <Zap className="h-5 w-5 text-orange-600 mr-2" />
                            <p className="font-semibold text-orange-800 dark:text-orange-200">입금 기한: {new Date(application.createdAt).toLocaleDateString('ko-KR')} 23:59까지</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}

                <Separator className="my-8" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                      <User className="h-6 w-6 mr-3 text-blue-600" />
                      신청자 정보
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <User className="h-5 w-5 text-gray-500 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">이름</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{application.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <Mail className="h-5 w-5 text-gray-500 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">이메일</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{application.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <Phone className="h-5 w-5 text-gray-500 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">연락처</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{application.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                      <MapPin className="h-6 w-6 mr-3 text-indigo-600" />
                      배송지 정보
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">주소</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{application.shippingInfo?.address}</p>
                        {application.shippingInfo?.addressDetail && <p className="text-gray-700 dark:text-gray-300 mt-1">{application.shippingInfo.addressDetail}</p>}
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">우편번호</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{application.shippingInfo?.postalCode}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />

                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Racquet className="h-6 w-6 mr-3 text-purple-600" />
                    장착 정보
                  </h3>
                  {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-xl">
                      <div className="flex items-center mb-3">
                        <Racquet className="h-5 w-5 text-blue-600 mr-2" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">라켓</p>
                      </div>
                      <p className="font-bold text-lg text-gray-900 dark:text-white">{application.stringDetails.racketType}</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 rounded-xl">
                      <div className="flex items-center mb-3">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">스트링</p>
                      </div>
                      <p className="font-bold text-lg text-gray-900 dark:text-white">{stringDisplay}</p>
                    </div>
                  </div> */}

                  {application.stringDetails.requirements && (
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 rounded-xl">
                      <div className="flex items-start mb-3">
                        <FileText className="h-5 w-5 text-purple-600 mr-2 mt-0.5" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">요청사항</p>
                      </div>
                      <p className="text-gray-900 dark:text-white leading-relaxed">{application.stringDetails.requirements}</p>
                    </div>
                  )}
                </div>
                {/* 기존 장착 정보 카드 아래 쪽에 추가 */}
                {racketLines.length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">라켓별 세부 장착 정보</h4>

                    <div className="space-y-3">
                      {racketLines.map((line: any, idx: number) => (
                        <div key={line.id ?? idx} className="p-4 rounded-lg bg-gray-50 dark:bg-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">라켓 {line.racketType || line.racketLabel || `${idx + 1}번`}</p>

                            {line.stringName && <p className="font-semibold text-gray-900 dark:text-white">스트링: {line.stringName}</p>}
                          </div>

                          <div className="text-sm text-gray-700 dark:text-gray-200 text-right">
                            {(line.tensionMain || line.tensionCross) && (
                              <p>
                                텐션&nbsp;
                                <span className="font-medium">
                                  메인 {line.tensionMain || '-'} / 크로스 {line.tensionCross || '-'}
                                </span>
                              </p>
                            )}
                            {line.note && <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">메모: {line.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="bg-gray-50 dark:bg-slate-700 rounded-b-lg p-8">
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <Button className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white transition-all duration-200" asChild>
                    <Link href={`/mypage?${new URLSearchParams({ tab: 'applications', id: String(application._id) }).toString()}`}>
                      <FileText className="h-5 w-5 mr-2" />
                      신청 내역 보기
                    </Link>
                  </Button>
                  <Button variant="outline" className="flex-1 h-12 hover:bg-gray-50 transition-colors duration-200 bg-transparent" asChild>
                    <Link href="/">
                      <Home className="h-5 w-5 mr-2" />
                      홈으로 돌아가기
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="backdrop-blur-sm bg-white/90 dark:bg-slate-800/90 border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Shield className="h-6 w-6 mr-3 text-blue-600" />
                    신청 안내사항
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">신청 정보를 정확히 입력했는지 다시 확인해주세요.</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">신청서에 따라 장착 담당자가 확인 후 연락드릴 예정입니다.</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">문의 사항은 고객센터(02-1234-5678)로 연락 주세요.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-sm bg-white/90 dark:bg-slate-800/90 border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Award className="h-6 w-6 mr-3 text-indigo-600" />
                    서비스 특징
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center p-3 bg-blue-50 dark:bg-slate-700 rounded-lg">
                      <Shield className="h-6 w-6 text-blue-500 mr-3" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">정품 보장</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">100% 정품 스트링만 사용</p>
                      </div>
                    </div>
                    <div className="flex items-center p-3 bg-indigo-50 dark:bg-slate-700 rounded-lg">
                      <Clock className="h-6 w-6 text-indigo-500 mr-3" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">철저한 예약 장착 완료</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">빠르고 정확한 장착 서비스</p>
                      </div>
                    </div>
                    <div className="flex items-center p-3 bg-purple-50 dark:bg-slate-700 rounded-lg">
                      <Award className="h-6 w-6 text-purple-500 mr-3" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">전문가 상담</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">전문가가 직접 상담</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
