import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { bankLabelMap } from '@/lib/constants';
import jwt from 'jsonwebtoken';
import Link from 'next/link';
import { CheckCircle, Calendar, CreditCard, MapPin, Phone, Mail, User, RatIcon as Racquet, Clock, Home, FileText, Shield, Award, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import BackButtonGuard from '@/app/services/_components/BackButtonGuard';

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

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-teal-600 to-blue-600 py-20">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
            <div className="absolute top-32 right-20 w-16 h-16 bg-white/10 rounded-full animate-pulse delay-1000"></div>
            <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-white/10 rounded-full animate-pulse delay-500"></div>
          </div>

          <div className="relative container mx-auto px-4 text-center text-white">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm mb-8 animate-bounce">
              <CheckCircle className="h-12 w-12 text-green-300" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">신청이 완료되었습니다!</h1>
            <p className="text-xl md:text-2xl text-green-100 max-w-3xl mx-auto leading-relaxed">도깨비 테니스 아카데미에서 확인 후 빠르게 연락드리겠습니다</p>
            <div className="mt-8 inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3">
              <Calendar className="h-5 w-5" />
              <span className="text-sm font-medium">신청일: {new Date(application.createdAt).toLocaleDateString('ko-KR')}</span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16">
          <div className="max-w-5xl mx-auto">
            <Card className="mb-8 backdrop-blur-sm bg-white/90 dark:bg-slate-800/90 border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 rounded-t-lg">
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
                    <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
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

                  <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
                    <div className="flex items-center mb-3">
                      <CreditCard className="h-6 w-6 text-green-600 mr-3" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">장착 금액</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{application.totalPrice.toLocaleString()}원</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
                    <div className="flex items-center mb-3">
                      <Clock className="h-6 w-6 text-purple-600 mr-3" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">희망일</h3>
                    </div>
                    <p className="text-lg font-bold text-purple-600">{application.stringDetails.preferredDate}</p>
                    {application.stringDetails.preferredTime && <p className="text-sm text-purple-500 mt-1">{application.stringDetails.preferredTime}</p>}
                  </div>
                </div>

                {/* 입금 정보 */}
                {application.shippingInfo?.bank && (
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
                )}

                <Separator className="my-8" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* 신청자 정보 */}
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

                  {/* 배송지 */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                      <MapPin className="h-6 w-6 mr-3 text-green-600" />
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

                {/* 장착 정보 */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Racquet className="h-6 w-6 mr-3 text-purple-600" />
                    장착 정보
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-700 dark:to-slate-600 rounded-xl">
                      <div className="flex items-center mb-3">
                        <Racquet className="h-5 w-5 text-purple-600 mr-2" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">라켓</p>
                      </div>
                      <p className="font-bold text-lg text-gray-900 dark:text-white">{application.stringDetails.racketType}</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-xl">
                      <div className="flex items-center mb-3">
                        <Zap className="h-5 w-5 text-blue-600 mr-2" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">스트링</p>
                      </div>
                      <p className="font-bold text-lg text-gray-900 dark:text-white">{application.stringDetails.stringType === 'custom' ? application.stringDetails.customStringName : application.stringDetails.stringType}</p>
                    </div>
                  </div>

                  {application.stringDetails.requirements && (
                    <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-700 dark:to-slate-600 rounded-xl">
                      <div className="flex items-start mb-3">
                        <FileText className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">요청사항</p>
                      </div>
                      <p className="text-gray-900 dark:text-white leading-relaxed">{application.stringDetails.requirements}</p>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="bg-gray-50 dark:bg-slate-700 rounded-b-lg p-8">
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <Button className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transition-all duration-200" asChild>
                    <Link href="/mypage?tab=applications">
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
              {/* 안내사항 */}
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
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">신청 정보를 정확히 입력했는지 다시 확인해주세요.</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">신청서에 따라 장착 담당자가 확인 후 연락드릴 예정입니다.</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">문의 사항은 고객센터(02-1234-5678)로 연락 주세요.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* 서비스 특징 */}
              <Card className="backdrop-blur-sm bg-white/90 dark:bg-slate-800/90 border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Award className="h-6 w-6 mr-3 text-purple-600" />
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
                    <div className="flex items-center p-3 bg-green-50 dark:bg-slate-700 rounded-lg">
                      <Clock className="h-6 w-6 text-green-500 mr-3" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">당일 완료</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">빠르고 정확한 장착 서비스</p>
                      </div>
                    </div>
                    <div className="flex items-center p-3 bg-purple-50 dark:bg-slate-700 rounded-lg">
                      <Award className="h-6 w-6 text-purple-500 mr-3" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">전문가 상담</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">15년 경력의 전문가가 직접</p>
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
