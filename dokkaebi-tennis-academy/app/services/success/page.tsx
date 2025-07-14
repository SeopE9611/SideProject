import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { bankLabelMap } from '@/lib/constants';
import jwt from 'jsonwebtoken';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
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

export default async function StringServiceSuccessPage({ searchParams }: Props) {
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

      <div className="container py-8">
        <div className="max-w-3xl mx-auto">
          {/* 상단 안내 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold">신청이 완료되었습니다.</h1>
            <p className="text-muted-foreground mt-2">도깨비 테니스 아카데미에서 확인 후 연락드리겠습니다.</p>
          </div>

          {/* 카드 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>신청 정보</CardTitle>
              <CardDescription>신청 번호: {application._id.toString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {/* 날짜, 금액 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">신청일자</p>
                  <p className="font-medium">{new Date(application.createdAt).toLocaleDateString('ko-KR')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">장착 금액</p>
                  <p className="font-medium">{application.totalPrice.toLocaleString()}원</p>
                </div>
              </div>

              {/* 입금 정보 */}
              {application.shippingInfo?.bank && (
                <div className="rounded-md bg-muted p-4">
                  <p className="font-medium mb-2">입금 계좌 정보</p>
                  <div className="rounded-md bg-gray-100 px-4 py-3 border border-gray-200 text-sm text-gray-800 space-y-1 mt-2">
                    <div className="font-medium">{bankLabelMap[application.shippingInfo.bank]?.label}</div>
                    <div className="font-mono">{bankLabelMap[application.shippingInfo.bank]?.account}</div>
                    <div className="text-sm text-muted-foreground">예금주: {bankLabelMap[application.shippingInfo.bank]?.holder}</div>
                  </div>
                  <p className="mt-2 text-primary font-medium">입금 기한: {new Date(application.createdAt).toLocaleDateString('ko-KR')} 23:59까지</p>
                </div>
              )}

              <Separator />

              {/* 신청자 */}
              <div>
                <h3 className="font-medium mb-3">신청자 정보</h3>
                <div className="space-y-1">
                  <p>
                    <span className="text-muted-foreground">이름:</span> {application.name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">이메일:</span> {application.email}
                  </p>
                  <p>
                    <span className="text-muted-foreground">연락처:</span> {application.phone}
                  </p>
                </div>
              </div>

              {/* 배송지 */}
              <Separator />
              <div>
                <h3 className="font-medium mb-3">배송지 정보</h3>
                <div className="space-y-1">
                  <p>
                    <span className="text-muted-foreground">주소:</span> {application.shippingInfo?.address}
                  </p>
                  <p>
                    <span className="text-muted-foreground">상세주소:</span> {application.shippingInfo?.addressDetail}
                  </p>
                  <p>
                    <span className="text-muted-foreground">우편번호:</span> {application.shippingInfo?.postalCode}
                  </p>
                </div>
              </div>

              {/* 장착정보 */}
              <Separator />
              <div>
                <h3 className="font-medium mb-3">장착 정보</h3>
                <div className="space-y-1">
                  <p>
                    <span className="text-muted-foreground">라켓:</span> {application.stringDetails.racketType}
                  </p>
                  <p>
                    <span className="text-muted-foreground">스트링:</span> {application.stringDetails.stringType === 'custom' ? application.stringDetails.customStringName : application.stringDetails.stringType}
                  </p>
                  <p>
                    <span className="text-muted-foreground">희망일:</span> {application.stringDetails.preferredDate}
                    {application.stringDetails.preferredTime && ` ${application.stringDetails.preferredTime}`}
                  </p>
                  {application.stringDetails.requirements && (
                    <p>
                      <span className="text-muted-foreground">요청사항:</span> {application.stringDetails.requirements}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 sm:flex-row">
              <Button className="w-full" asChild>
                <Link href="/mypage?tab=applications">신청 내역 보기</Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/">홈으로 돌아가기</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* 안내사항 */}
          <div className="rounded-md border p-4 text-sm">
            <h3 className="font-medium mb-2">신청 안내사항</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>• 신청 정보를 정확히 입력했는지 다시 확인해주세요.</li>
              <li>• 신청서에 따라 장착 담당자가 확인 후 연락드릴 예정입니다.</li>
              <li>• 문의 사항은 고객센터(02-1234-5678)로 연락 주세요.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
