import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { notFound, useRouter } from 'next/navigation';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { useEffect } from 'react';
import ContinueShoppingButton from '@/app/checkout/_components/ContinueShoppingButton';
import { bankLabelMap } from '@/lib/constants';

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: { orderId?: string } }) {
  const orderId = await searchParams.orderId;

  if (!orderId) return notFound();

  const client = await clientPromise;
  const db = client.db();
  const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });

  if (!order) return notFound();

  // 쿠키에서 리프레시 토큰 꺼내기
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken')?.value;

  // 리프레시 토큰 유효성 검사 -> 로그인 여부 판단
  let isLoggedIn = false;
  if (refreshToken) {
    try {
      jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
      isLoggedIn = true;
    } catch {}
  }

  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">주문이 완료되었습니다</h1>
          <p className="text-muted-foreground mt-2">주문해주셔서 감사합니다. 아래 정보를 확인해주세요.</p>
          {order.shippingInfo?.deliveryMethod === '방문수령' && order.shippingInfo?.withStringService && (
            <div className="mt-6 p-4 bg-yellow-100 text-sm text-yellow-900 border border-yellow-300 rounded-md">
              <p className="font-medium text-lg">스트링 장착 서비스가 포함된 주문입니다.</p>
              <p className="mt-1">
                <Link href={`/services/apply?orderId=${order._id}`} className="underline font-semibold">
                  장착 서비스 신청서를 작성하러 가기 →
                </Link>
              </p>
            </div>
          )}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>주문 정보</CardTitle>
            <CardDescription>주문 번호: {order._id.toString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">주문일자</p>
                <p className="font-medium">{new Date(order.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">결제 방법</p>
                <p className="font-medium">무통장입금</p>
              </div>
            </div>

            <div className="rounded-md bg-muted p-4">
              <p className="font-medium mb-2">입금 계좌 정보</p>
              {order.paymentInfo?.bank && bankLabelMap[order.paymentInfo.bank] ? (
                <div className="rounded-md bg-gray-100 px-4 py-3 border border-gray-200 text-sm text-gray-800 space-y-1 mt-2">
                  <div className="font-medium">{order.paymentInfo.method}</div>
                  <div className="font-medium">{bankLabelMap[order.paymentInfo.bank].label}</div>
                  <div className="font-mono">{bankLabelMap[order.paymentInfo.bank].account}</div>
                  <div className="text-sm text-muted-foreground">예금주: {bankLabelMap[order.paymentInfo.bank].holder}</div>
                </div>
              ) : (
                <p className="text-muted-foreground">선택된 은행 없음</p>
              )}
              <p className="mt-2 text-primary font-medium">입금 기한: {new Date(order.createdAt).toLocaleDateString('ko-KR')} 23:59까지</p>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-3">주문 상품</h3>
              <div className="space-y-3">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">수량: {item.quantity}개</p>
                    </div>
                    <p className="font-medium">{(item.price * item.quantity).toLocaleString()}원</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-3">배송 정보</h3>
              <div className="space-y-1">
                <p>
                  <span className="text-muted-foreground">수령인:</span> {order.shippingInfo.name}
                </p>
                <p>
                  <span className="text-muted-foreground">연락처:</span> {order.shippingInfo.phone}
                </p>
                <p>
                  <span className="text-muted-foreground">주소:</span> {order.shippingInfo.address}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center font-bold text-lg">
              <span>총 결제 금액</span>
              <span>{order.totalPrice.toLocaleString()}원</span>
            </div>
            <p className="text-sm text-muted-foreground">(배송비 {order.shippingFee.toLocaleString()}원 포함)</p>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 sm:flex-row">
            <Button className="w-full" asChild>
              <Link href={isLoggedIn ? '/mypage' : `/order-lookup/details/${order._id}`}>주문 내역 확인</Link>
            </Button>
            <ContinueShoppingButton deliveryMethod={order.shippingInfo?.deliveryMethod} withStringService={order.shippingInfo?.withStringService} />
          </CardFooter>
        </Card>

        <div className="rounded-md border p-4 text-sm">
          <h3 className="font-medium mb-2">주문 안내사항</h3>
          <ul className="space-y-1 text-muted-foreground">
            <li>• 주문하신 상품의 결제 금액을 위 계좌로 입금해주세요.</li>
            <li>• 입금 확인 후 배송이 시작됩니다.</li>
            <li>• 주문 내역은 마이페이지에서 확인하실 수 있습니다.</li>
            <li>• 배송 관련 문의사항은 고객센터(02-123-4567)로 연락주세요.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
