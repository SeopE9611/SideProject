'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Calendar, CreditCard, ShoppingBag } from 'lucide-react';

// 주문 상세 타입 정의
interface OrderDetail {
  _id: string;
  createdAt: string;
  shippingInfo: {
    name: string;
    phone: string;
    address: string;
  };
  paymentInfo?: {
    method: string;
    bank?: 'shinhan' | 'kookmin' | 'woori';
  };
  totalPrice: number;
  shippingFee: number;
  status: string;
  paymentMethod?: string; //  선택적 필드로 추가
  trackingNumber?: string; // 선택적 필드로 추가
  items: {
    id?: string; //  선택적 필드로 추가
    name: string;
    option?: string; // 선택적 필드로 추가
    price: number;
    quantity: number;
    image?: string;
  }[];
}

export default function OrderDetailPage() {
  const bankLabelMap = {
    shinhan: '신한은행 123-456-789012 (예금주: 도깨비테니스)',
    kookmin: '국민은행 123-45-6789-012 (예금주: 도깨비테니스)',
    woori: '우리은행 1234-567-890123 (예금주: 도깨비테니스)',
  };

  const params = useParams();
  const orderId = params?.id as string;

  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetail = async () => {
      try {
        const res = await fetch(`/api/guest-orders/${orderId}`);
        const data = await res.json();

        if (data.success && data.order) {
          setOrder(data.order);
        } else {
          setError('해당 주문을 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('주문 상세 정보 조회 중 오류 발생:', err);
        setError('주문 정보를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [params.id]);

  // 주문 목록으로 돌아가기
  const handleGoBack = () => {
    router.back();
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
              <CardTitle className="text-2xl font-bold text-center">주문 상세 정보</CardTitle>
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
              <CardTitle className="text-2xl font-bold text-center">주문 상세 정보 오류</CardTitle>
              <CardDescription className="text-center">주문 정보를 불러오는 중 문제가 발생했습니다</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-red-500 mb-6">{error}</p>
              <Button onClick={handleGoBack}>이전 페이지로 돌아가기</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" className="mb-4 pl-0 flex items-center" onClick={handleGoBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          주문 목록으로 돌아가기
        </Button>

        <Card className="shadow-md mb-6">
          <CardHeader className="space-y-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">주문 상세 정보</CardTitle>
                <CardDescription className="mt-1">주문번호: {order._id}</CardDescription>
              </div>
              <div className="mt-2 md:mt-0">
                <span
                  className={`text-sm px-3 py-1 rounded-full ${
                    order.status === '배송완료' ? 'bg-green-100 text-green-800' : order.status === '배송중' ? 'bg-blue-100 text-blue-800' : order.status === '배송준비중' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {order.status}
                </span>
              </div>
            </div>
          </CardHeader>
          <Separator />

          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* 주문 정보 */}
              <div>
                <h3 className="text-lg font-medium flex items-center mb-3">
                  <Calendar className="mr-2 h-5 w-5 text-primary" />
                  주문 정보
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-muted-foreground">주문일자</dt>
                      <dd>{new Date(order.createdAt).toLocaleDateString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">입금 계좌</dt>
                      <dd>{order.paymentInfo?.bank ? bankLabelMap[order.paymentInfo.bank] : '선택된 은행 없음'}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* 배송 정보 */}
              <div>
                <h3 className="text-lg font-medium flex items-center mb-3">
                  <MapPin className="mr-2 h-5 w-5 text-primary" />
                  배송 정보
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-muted-foreground">수령인</dt>
                      <dd>{order.shippingInfo.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">연락처</dt>
                      <dd>{order.shippingInfo.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">배송지</dt>
                      <dd>{order.shippingInfo.address}</dd>
                    </div>
                    {order.trackingNumber && (
                      <div>
                        <dt className="text-sm text-muted-foreground">운송장 번호</dt>
                        <dd className="flex items-center">
                          {order.trackingNumber}
                          <Button variant="link" className="h-auto p-0 ml-2 text-primary">
                            배송 조회
                          </Button>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {/* 주문 상품 */}
              <div>
                <h3 className="text-lg font-medium flex items-center mb-3">
                  <ShoppingBag className="mr-2 h-5 w-5 text-primary" />
                  주문 상품
                </h3>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex flex-col md:flex-row border rounded-lg p-4">
                      <div className="flex-shrink-0 w-full md:w-auto flex justify-center md:justify-start mb-4 md:mb-0">
                        <img src={item.image || '/placeholder.svg'} alt={item.name} className="w-20 h-20 object-cover rounded" />
                      </div>
                      <div className="flex-grow md:ml-4">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{item.option}</p>
                        <div className="flex flex-col md:flex-row md:items-center justify-between mt-2">
                          <p className="text-sm">
                            {formatCurrency(item.price)} × {item.quantity}개
                          </p>
                          <p className="font-medium mt-1 md:mt-0">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 결제 정보 */}
              <div>
                <h3 className="text-lg font-medium flex items-center mb-3">
                  <CreditCard className="mr-2 h-5 w-5 text-primary" />
                  결제 정보
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt>상품 금액</dt>
                      <dd>{formatCurrency(order.totalPrice - order.shippingFee)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>배송비</dt>
                      <dd>{formatCurrency(order.shippingFee)}</dd>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-medium">
                      <dt>총 결제금액</dt>
                      <dd className="text-primary">{formatCurrency(order.totalPrice)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-center pt-2 pb-6">
            <Button variant="outline" onClick={handleGoBack}>
              주문 목록으로 돌아가기
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
