'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, ChevronRight, Calendar, User, Phone, CreditCard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// 주문 타입 정의
interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  recipient: string;
  contactNumber: string;
  totalAmount: number;
  status: '배송준비중' | '배송중' | '배송완료' | '주문취소';
}

export default function OrderLookupResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 이름과 이메일 파라미터 가져오기
  const name: string = searchParams.get('name') ?? '';
  const email: string = searchParams.get('email') ?? '';
  const phone: string = searchParams.get('phone') ?? '';

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        if (!name || !email) {
          setError('조회에 필요한 정보가 부족합니다. 다시 시도해주세요.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/guest-orders/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone }),
          credentials: 'include',
        });

        const data = await res.json();

        if (data.success && data.orders.length > 0) {
          setOrders(
            data.orders.map((o: any) => ({
              id: o._id, // key로 사용할 고유 ID
              orderNumber: o._id.slice(-6), // 보기 좋게 마지막 6자리만 주문번호처럼 사용
              orderDate: new Date(o.createdAt).toLocaleDateString(),
              recipient: o.shippingInfo?.name ?? '',
              contactNumber: o.shippingInfo?.phone ?? '',
              totalAmount: o.totalPrice ?? 0,
              status: o.status ?? '배송준비중',
            }))
          );
        } else {
          setOrders([]);
        }

        setLoading(false);
      } catch (err) {
        console.error('주문 조회 중 오류 발생:', err);
        setError('주문 정보를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.');
        setLoading(false);
      }
    };

    fetchOrders();
  }, [name, email, phone]);

  // 상세 페이지로 이동
  const handleViewDetails = (orderId: string) => {
    router.push(`/order-lookup/details/${orderId}`);
  };

  // 주문 조회 페이지로 돌아가기
  const handleGoBack = () => {
    router.push('/order-lookup');
  };

  // 금액 포맷팅 함수
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      currencyDisplay: 'symbol',
    }).format(amount);
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">주문 조회 결과</CardTitle>
              <CardDescription className="text-center">주문 정보를 불러오는 중입니다...</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center py-12">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-gray-200 mb-4"></div>
                <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="container mx-auto py-10 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">주문 조회 오류</CardTitle>
              <CardDescription className="text-center">주문 정보를 불러오는 중 문제가 발생했습니다</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-red-500 mb-6">{error}</p>
              <Button onClick={handleGoBack}>주문 조회 페이지로 돌아가기</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/order-lookup" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            이전 페이지로 돌아가기
          </Link>
        </div>
        <Card className="shadow-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">주문 조회 결과</CardTitle>
            <CardDescription className="text-center">{name}님의 주문 내역입니다</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            {orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    <div className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                        <div className="flex items-center mb-2 md:mb-0">
                          <ShoppingBag className="h-5 w-5 mr-2 text-primary" />
                          <span className="font-medium">{order.orderNumber}</span>
                        </div>
                        <div className="flex items-center">
                          <span
                            className={`text-sm px-2 py-1 rounded-full ${
                              order.status === '배송완료' ? 'bg-green-100 text-green-800' : order.status === '배송중' ? 'bg-blue-100 text-blue-800' : order.status === '배송준비중' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm">주문일자: {order.orderDate}</span>
                        </div>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm">수령인: {order.recipient}</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm">연락처: {order.contactNumber}</span>
                        </div>
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm font-medium">결제금액: {formatCurrency(order.totalAmount)}</span>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" className="flex items-center" onClick={() => handleViewDetails(order.id)}>
                          상세보기
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-gray-100 p-3 mb-4">
                  <ShoppingBag className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">조회된 주문이 없습니다</h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  입력하신 정보와 일치하는 주문 내역이 없습니다.
                  <br />
                  주문 시 입력한 정보를 다시 확인해주세요.
                </p>
                <Button onClick={handleGoBack}>주문 조회 페이지로 돌아가기</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
