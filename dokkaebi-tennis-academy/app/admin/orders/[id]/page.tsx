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
import { OrderStatusBadge } from '@/app/admin/orders/_components/OrderStatusBadge';
import OrderHistory from '@/app/admin/orders/_components/OrderHistory';
import OrderCancelButtonClient from '@/app/admin/orders/_components/OrderCancelButtonClient';
import { OrderPaymentStatus } from '@/app/admin/orders/_components/OrderPaymentStatus';

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

// 배송 카드
const shippingMethodMap: Record<string, string> = {
  standard: '일반 배송 (우체국)',
  express: '빠른 배송 (CJ 대한통운)',
  premium: '퀵 배송 (당일)',
  pickup: '매장 수령',
  visit: '방문 수령',
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const host = (await headers()).get('host');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}`;

  // ───────────────────────────────────────────
  // 1) 주문 상세 정보(fetch) — 원래 있던 부분
  const orderRes = await fetch(`${baseUrl}/api/orders/${id}`, { cache: 'no-store' });
  if (!orderRes.ok) throw new Error('주문 데이터를 불러오지 못했습니다.');
  const orderDetail = await orderRes.json();

  // ───────────────────────────────────────────
  // 2) B안: 전체 이력 개수만큼 한 번에 다 가져오기
  const totalCount = orderDetail.history?.length ?? 0; // B안: 전체 이력 수
  const historyRes = await fetch(`${baseUrl}/api/orders/${id}/history?page=1&limit=${totalCount}`, { cache: 'no-store' });
  if (!historyRes.ok) throw new Error('처리 이력 데이터를 불러오지 못했습니다.');
  const { history, total } = await historyRes.json();
  // B안: { history: [...], total: number }

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '날짜 없음';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '유효하지 않은 날짜';
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
            <p className="mt-1 text-muted-foreground">주문 ID: {id}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              주문서 다운로드
            </Button>
            <Button asChild>
              <Link href={`/admin/orders/${id}/shipping-update`}>
                <Truck className="mr-2 h-4 w-4" />
                배송 정보 업데이트
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* 주문 상태 및 요약 */}
          <Card className="md:col-span-3 border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>주문 상태</CardTitle>
                <OrderStatusBadge orderId={id} initialStatus={orderDetail.status} />
              </div>
              <CardDescription>{formatDate(orderDetail.date)}에 접수된 주문입니다.</CardDescription>
            </CardHeader>
            <CardFooter className=" pt-4">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
                {/* 주문 상태 변경 핸들러 */}
                <OrderStatusSelect orderId={String(orderDetail._id)} currentStatus={orderDetail.status} />
                <OrderCancelButtonClient orderId={String(orderDetail._id)} alreadyCancelledReason={orderDetail.cancelReason} key={'cancel-' + orderDetail.history?.length} />
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
                  <div>{shippingMethodMap[orderDetail.shippingInfo?.shippingMethod] ?? '정보 없음'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium flex items-center">
                    <Calendar className="mr-1 h-3.5 w-3.5" />
                    예상 수령일
                  </div>
                  <div>{formatDate(orderDetail.shippingInfo?.estimatedDate)}</div>
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
                    <OrderPaymentStatus orderId={String(orderDetail._id)} initialPaymentStatus={orderDetail.paymentStatus} />
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
          {/*  요청사항 */}
          <Card className="md:col-span-3 border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle>배송 요청사항</CardTitle>
              <CardDescription>사용자가 결제 시 입력한 배송 관련 요청사항입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {orderDetail.shippingInfo?.deliveryRequest ? <p className="whitespace-pre-line text-sm text-foreground">{orderDetail.shippingInfo.deliveryRequest}</p> : <p className="text-sm text-muted-foreground">요청사항이 입력되지 않았습니다.</p>}
            </CardContent>
          </Card>
          {/* 처리 이력 */}
          <OrderHistory orderId={id} />
        </div>
      </div>
    </div>
  );
}
