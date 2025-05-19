import Link from 'next/link';
import { ArrowLeft, Calendar, CreditCard, Download, Mail, MapPin, Package, Phone, ShoppingCart, Truck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { headers } from 'next/headers';
import { OrderStatusSelect } from '../_components/OrderStatusSelect';
import { OrderCancelButton } from '@/app/admin/orders/_components/OrderCancelButton';

// 주문 상태에 따른 배지 색상 정의
const orderStatusColors = {
  대기중: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
  처리중: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
  완료: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  취소: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
  환불: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
};

// 결제 상태에 따른 배지 색상 정의
const paymentStatusColors = {
  결제완료: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  결제대기: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
  결제실패: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
};

// 주문 유형에 따른 배지 색상 정의
const orderTypeColors = {
  상품: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
  서비스: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
  클래스: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20',
};

export default async function OrderDetailPage(context: { params: { id: string } }) {
  const { params } = context;
  const host = (await headers()).get('host');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}`;
  const res = await fetch(`${baseUrl}/api/orders/${params.id}`, { cache: 'no-store' });

  if (!res.ok) {
    throw new Error('주문 데이터를 불러오지 못했습니다.');
  }

  const orderDetail = await res.json();

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '날짜 없음';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '유효하지 않은 날짜';
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // 금액 포맷팅 함수
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  // 데이터가 누락된 경우에 페이지 자체를 중단
  if (!orderDetail.customer) {
    return <div className="text-center text-destructive">고객 정보가 없습니다.</div>;
  }

  // 주문 취소 핸들러
  const handleCancelOrder = async () => {
    const confirmCancel = window.confirm('정말로 이 주문을 취소하시겠습니까?');
    if (!confirmCancel) return;

    try {
      const res = await fetch(`/api/orders/${orderDetail._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: '취소' }),
      });

      if (!res.ok) {
        throw new Error('주문 취소 실패');
      }

      location.reload();
    } catch (error) {
      console.error('주문 취소 중 오류:', error);
      alert('주문 취소 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl">
        {/* 페이지 헤더 */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button variant="outline" size="sm" className="mb-3" asChild>
              <Link href="/admin/orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                주문 목록으로 돌아가기
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">주문 상세 정보</h1>
            <p className="mt-1 text-muted-foreground">주문 ID: {params.id}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              주문서 다운로드
            </Button>
            <Button>
              <Truck className="mr-2 h-4 w-4" />
              배송 정보 업데이트
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* 주문 상태 및 요약 */}
          <Card className="md:col-span-3 border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>주문 상태</CardTitle>
                <Badge className={orderStatusColors[orderDetail.status as keyof typeof orderStatusColors]}>{orderDetail.status}</Badge>
              </div>
              <CardDescription>{formatDate(orderDetail.date)}에 접수된 주문입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center">
                  <Badge className={paymentStatusColors[orderDetail.paymentStatus as keyof typeof paymentStatusColors]}>{orderDetail.paymentStatus}</Badge>
                  <span className="ml-2 text-sm text-muted-foreground">{orderDetail.paymentMethod}</span>
                </div>
                <div className="flex items-center">
                  <Badge className={orderTypeColors[orderDetail.type as keyof typeof orderTypeColors]}>{orderDetail.type}</Badge>
                </div>
                <div className="ml-auto text-xl font-bold">{formatCurrency(orderDetail.total)}</div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
                {/* 주문 상태 변경 핸들러 */}
                <OrderStatusSelect orderId={String(orderDetail._id)} currentStatus={orderDetail.status} />
                <OrderCancelButton orderId={String(orderDetail._id)} />
              </div>
            </CardFooter>
          </Card>

          {/* 고객 정보 */}
          <Card className="border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                고객 정보
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

          {/* 배송 정보 */}
          <Card className="border-border/40 bg-card/60 backdrop-blur">
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
                  <div>{orderDetail.shipping.method}</div>
                </div>
                {orderDetail.shipping.trackingNumber && (
                  <div>
                    <div className="text-sm font-medium">운송장 번호</div>
                    <div>{orderDetail.shipping.trackingNumber}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium flex items-center">
                    <Calendar className="mr-1 h-3.5 w-3.5" />
                    예상 수령일
                  </div>
                  <div>{formatDate(orderDetail.shipping.estimatedDelivery)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 결제 정보 */}
          <Card className="border-border/40 bg-card/60 backdrop-blur">
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
                    <Badge className={paymentStatusColors[orderDetail.paymentStatus as keyof typeof paymentStatusColors]}>{orderDetail.paymentStatus}</Badge>
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
          <Card className="md:col-span-3 border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5" />
                주문 항목
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium">상품/서비스</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">수량</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">가격</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderDetail.items.map((item: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.name}</div>
                          {item.description && <div className="text-sm text-muted-foreground">{item.description}</div>}
                        </td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-b">
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

          {/* 주문 메모 */}
          <Card className="md:col-span-3 border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle>주문 메모</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea defaultValue={orderDetail.notes} placeholder="주문에 대한 메모가 없습니다." className="min-h-[100px]" />
              <Button className="mt-3">메모 저장</Button>
            </CardContent>
          </Card>

          {/* 주문 이력 */}
          <Card className="md:col-span-3 border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle>주문 이력</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(orderDetail.history) &&
                  orderDetail.history.map((event: any, index: number) => (
                    <div key={index} className="flex">
                      <div className="mr-4 flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-background bg-primary">
                          <Package className="h-5 w-5 text-primary-foreground" />
                        </div>
                        {index < orderDetail.history.length - 1 && <div className="h-full w-px bg-border" />}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="flex items-baseline justify-between">
                          <div className="text-lg font-semibold">{event.status}</div>
                          <div className="text-sm text-muted-foreground">{formatDate(event.date)}</div>
                        </div>
                        <p className="mt-1 text-sm">{event.description}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
