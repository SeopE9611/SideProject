import Link from 'next/link';
import { ArrowLeft, Calendar, CreditCard, Download, Mail, MapPin, Package, Phone, ShoppingCart, Truck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { headers } from 'next/headers';
import { OrderStatusBadge } from '@/app/admin/orders/_components/OrderStatusBadge';
import OrderHistory from '@/app/admin/orders/_components/OrderHistory';
import { paymentStatusColors } from '@/lib/badge-style';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import CancelOrderDialog from '@/app/mypage/orders/_components/CancelOrderDialog';

// 배송 카드
const shippingMethodMap: Record<string, string> = {
  delivery: '택배 배송',
  quick: '퀵 배송 (당일)',
  visit: '방문 수령',
};
const courierMap: Record<string, string> = {
  cj: 'CJ 대한통운',
  hanjin: '한진택배',
  logen: '로젠택배',
  post: '우체국택배',
  etc: '기타',
};

interface Props {
  orderId: string;
}

interface Props {
  orderId: string;
}

export default async function OrderDetailContent({ orderId }: Props) {
  const host = (await headers()).get('host');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}`;

  const session = await getServerSession(authConfig);

  // 주문 상세 정보(fetch) — 원래 있던 부분
  const orderRes = await fetch(`${baseUrl}/api/orders/${orderId}`, { cache: 'no-store' });
  if (!orderRes.ok) throw new Error('주문 데이터를 불러오지 못했습니다.');
  const orderDetail = await orderRes.json();

  // 전체 이력 개수만큼 한 번에 다 가져오기
  const totalCount = orderDetail.history?.length ?? 0; //전체 이력 수
  const historyRes = await fetch(`${baseUrl}/api/orders/${orderId}/history?page=1&limit=${totalCount}`, { cache: 'no-store' });
  if (!historyRes.ok) throw new Error('처리 이력 데이터를 불러오지 못했습니다.');
  const { history, total } = await historyRes.json();
  // { history: [...], total: number }

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '날짜 없음';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '유효하지 않은 날짜'; // 날짜 문자열을 포맷팅하며 null/undefined/잘못된 값도 방어 처리
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  // 금액 포맷팅 함수
  const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0원'; // 금액을 통화 형식으로 포맷팅하며 undefined/NaN도 방어 처리
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  // 데이터가 누락된 경우에 페이지 자체를 중단
  if (!orderDetail.customer) {
    return <div className="text-center text-destructive">고객 정보가 없습니다.</div>;
  }

  return (
    <div className="container">
      {/* 오른쪽 콘텐츠 영역 */}
      <div className="md:col-span-3">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            {/* 페이지 헤더 */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Button variant="outline" size="sm" className="mb-3" asChild>
                  <Link href="/mypage">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    주문 목록으로 돌아가기
                  </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">주문 상세 정보</h1>
                <p className="mt-1 text-muted-foreground">주문 ID: {orderId}</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* 주문 상태 및 요약 */}
              <Card className="md:col-span-3 rounded-xl border-gray-200 bg-white shadow-md ">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>주문 상태</CardTitle>
                    <OrderStatusBadge orderId={orderId} initialStatus={orderDetail.status} />
                  </div>
                  <CardDescription>{formatDate(orderDetail.date)}에 접수된 주문입니다.</CardDescription>
                </CardHeader>
                <CardFooter className=" pt-4">
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between"></div>
                  {['대기중', '결제완료'].includes(orderDetail.status) && <CancelOrderDialog orderId={orderDetail._id.toString()} />}
                </CardFooter>
              </Card>
              {/* 고객 정보 */}
              {orderDetail.customer ? (
                <Card className="rounded-xl border-gray-200 bg-white shadow-md px-2 py-3">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center">
                      <User className="mr-2 h-5 w-5" />내 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium">이름</div>
                        <div>{orderDetail.customer?.name ?? '이름 없음'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium flex items-center">
                          <Mail className="mr-1 h-3.5 w-3.5" />
                          이메일
                        </div>
                        <div>{orderDetail.customer?.email ?? '이메일 없음'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium flex items-center">
                          <Phone className="mr-1 h-3.5 w-3.5" />
                          전화번호
                        </div>
                        <div>{orderDetail.customer?.phone ?? '전화번호 없음'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium flex items-center">
                          <MapPin className="mr-1 h-3.5 w-3.5" />
                          주소
                        </div>
                        <div>{orderDetail.customer?.address ?? '주소 없음'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center text-sm text-destructive italic">고객 정보가 없습니다.</div>
              )}
              {/* 배송 정보 */}
              <Card className="rounded-xl border-gray-200 bg-white shadow-md px-2 py-3">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <Truck className="mr-2 h-5 w-5" />
                    배송 정보
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium">배송 방법</div>
                      <div>{shippingMethodMap[orderDetail.shippingInfo?.shippingMethod] ?? '정보 없음'}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium flex items-center">
                        <Calendar className="mr-1 h-3.5 w-3.5" />
                        예상 수령일
                      </div>
                      <div>{formatDate(orderDetail.shippingInfo?.estimatedDate)}</div>
                    </div>
                    {orderDetail.shippingInfo?.invoice?.trackingNumber && (
                      <>
                        <div>
                          <div className="text-sm font-medium">택배사</div>
                          <div>{courierMap[orderDetail.shippingInfo.invoice.courier] ?? '미지정'}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">운송장 번호</div>
                          <div>{orderDetail.shippingInfo.invoice.trackingNumber}</div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* 결제 정보 */}
              <Card className="rounded-xl border-gray-200 bg-white shadow-md px-2 py-3">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    결제 정보
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium">결제 상태</div>
                      <div>
                        <Badge className={paymentStatusColors[orderDetail.paymentStatus]}>{orderDetail.paymentStatus}</Badge>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">결제 방법</div>
                      <div>{orderDetail.paymentMethod}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">결제 금액</div>
                      <div className="text-lg font-bold">{formatCurrency(orderDetail.total)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* 주문 항목 */}
              <Card className="md:col-span-3 rounded-xl border-gray-200 bg-white shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    주문 항목
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">상품/서비스</th>
                          <th className="px-4 py-3 text-center font-medium">수량</th>
                          <th className="px-4 py-3 text-right font-medium">가격</th>
                          <th className="px-4 py-3 text-right font-medium">합계</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {orderDetail.items.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="px-4 py-3">{item.name}</td>
                            <td className="px-4 py-3 text-center">{item.quantity}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(item.price * item.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-right font-medium">
                            총 합계
                          </td>
                          <td className="px-4 py-3 text-right text-lg font-bold">{formatCurrency(orderDetail.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
              {/*  요청사항 */}
              <Card className="md:col-span-3 rounded-xl border-gray-200 bg-white shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle>배송 요청사항</CardTitle>
                  <CardDescription>사용자가 결제 시 입력한 배송 관련 요청사항입니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  {orderDetail.shippingInfo?.deliveryRequest ? (
                    <p className="whitespace-pre-line text-sm text-foreground">{orderDetail.shippingInfo.deliveryRequest}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">요청사항이 입력되지 않았습니다.</p>
                  )}
                </CardContent>
              </Card>
              {/* 처리 이력 */}
              <OrderHistory orderId={orderId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
