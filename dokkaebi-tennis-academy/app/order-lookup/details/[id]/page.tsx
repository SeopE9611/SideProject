'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Calendar, CreditCard, ShoppingBag, CheckCircle, Package, User, Phone, Truck, Clock, Shield } from 'lucide-react';
import Link from 'next/link';
import { bankLabelMap } from '@/lib/constants';
import Image from 'next/image';

// 주문 상세 타입 정의
interface OrderDetail {
  _id: string;
  createdAt: string;
  shippingInfo: {
    name: string;
    phone: string;
    address: string;
    deliveryMethod?: string;
    withStringService?: boolean;
  };
  isStringServiceApplied?: boolean;
  paymentInfo?: {
    method: string;
    bank?: 'shinhan' | 'kookmin' | 'woori';
  };
  totalPrice: number;
  shippingFee: number;
  status: string;
  paymentMethod?: string;
  trackingNumber?: string;
  items: {
    id?: string;
    name: string;
    option?: string;
    price: number;
    quantity: number;
    image?: string;
  }[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case '배송완료':
      return <CheckCircle className="w-5 h-5" />;
    case '배송중':
      return <Truck className="w-5 h-5" />;
    case '배송준비중':
      return <Clock className="w-5 h-5" />;
    default:
      return <Package className="w-5 h-5" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case '배송완료':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case '배송중':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case '배송준비중':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case '주문취소':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetail = async () => {
      try {
        const res = await fetch(`/api/guest-orders/${orderId}`, { credentials: 'include' });
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative container mx-auto px-4 py-16">
            <div className="text-center text-white">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-6">
                <Package className="w-8 h-8 animate-pulse" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">주문 상세 정보</h1>
              <p className="text-xl text-emerald-100">주문 정보를 불러오는 중입니다...</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-12 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="flex justify-center items-center py-16">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mb-6">
                    <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">주문 정보 로딩 중</h3>
                  <p className="text-gray-600">잠시만 기다려주세요...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-rose-600 to-pink-600">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative container mx-auto px-4 py-16">
            <div className="text-center text-white">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-6">
                <Package className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">주문 상세 정보 오류</h1>
              <p className="text-xl text-red-100">주문 정보를 불러오는 중 문제가 발생했습니다</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-12 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                    <Package className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">오류가 발생했습니다</h3>
                  <p className="text-red-600 mb-8 max-w-md">{error}</p>
                  <Button onClick={handleGoBack} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    이전 페이지로 돌아가기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center text-white">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <Package className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">주문 상세 정보</h1>
            <p className="text-xl text-emerald-100">주문번호: {order._id.slice(-8)}</p>
            <div className="mt-4">
              <span className={`inline-flex items-center gap-2 text-lg px-4 py-2 rounded-full border-2 font-semibold ${getStatusColor(order.status)} bg-white/20 backdrop-blur-sm border-white/30 text-white`}>
                {getStatusIcon(order.status)}
                {order.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-12 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <div className="mb-8">
            <Button variant="ghost" className="inline-flex items-center text-sm text-muted-foreground hover:text-emerald-600 transition-colors group" onClick={handleGoBack}>
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              주문 목록으로 돌아가기
            </Button>
          </div>

          {/* String Service Alert */}
          {order.shippingInfo?.deliveryMethod?.replace(/\s/g, '') === '방문수령' && order.shippingInfo?.withStringService && (
            <Card className="mb-8 border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <CardContent className="p-6">
                {!order.isStringServiceApplied ? (
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-amber-800 mb-2">스트링 장착 서비스 신청 가능</h3>
                      <p className="text-amber-700 mb-4">이 주문은 스트링 장착 서비스가 포함되어 있습니다. 아래 버튼을 클릭하여 신청해주세요.</p>
                      <Link href={`/services/apply?orderId=${order._id}`} className="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors">
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        스트링 장착 서비스 신청하기
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-emerald-800 mb-1">스트링 장착 서비스 신청 완료</h3>
                      <p className="text-emerald-700">이 주문의 스트링 장착 서비스 신청이 완료되었습니다.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* 주문 정보 */}
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">주문 정보</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">주문일자</p>
                        <p className="font-semibold">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">주문번호</p>
                        <p className="font-mono text-sm bg-gray-100 px-3 py-1 rounded">{order._id}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-2">입금 계좌</p>
                      {order.paymentInfo?.bank && bankLabelMap[order.paymentInfo.bank] ? (
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
                          <div className="space-y-2">
                            <p className="font-semibold text-emerald-800">{order.paymentInfo.method}</p>
                            <p className="font-semibold text-emerald-700">{bankLabelMap[order.paymentInfo.bank].label}</p>
                            <p className="font-mono text-emerald-600">{bankLabelMap[order.paymentInfo.bank].account}</p>
                            <p className="text-sm text-emerald-600">예금주: {bankLabelMap[order.paymentInfo.bank].holder}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">선택된 은행 없음</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 배송 정보 */}
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">배송 정보</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <User className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="text-sm text-gray-500">수령인</p>
                          <p className="font-semibold">{order.shippingInfo.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="w-5 h-5 text-teal-600" />
                        <div>
                          <p className="text-sm text-gray-500">연락처</p>
                          <p className="font-semibold">{order.shippingInfo.phone}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">배송지</p>
                        <p className="font-semibold">{order.shippingInfo.address}</p>
                      </div>
                      {order.trackingNumber && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <Truck className="w-5 h-5 text-blue-600" />
                          <div className="flex-1">
                            <p className="text-sm text-blue-600 mb-1">운송장 번호</p>
                            <p className="font-mono font-semibold text-blue-800">{order.trackingNumber}</p>
                          </div>
                          <Button variant="link" className="text-blue-600 hover:text-blue-700 p-0">
                            배송 조회
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 주문 상품 */}
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">주문 상품</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.items.map((item, index) => (
                      <div key={item.id || index} className="flex flex-col md:flex-row gap-4 p-4 border-2 border-gray-100 rounded-lg hover:border-emerald-200 transition-colors">
                        <div className="flex-shrink-0 w-full md:w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                          <Image src={item.image || '/placeholder.svg'} alt={item.name} width={96} height={96} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1 truncate">{item.name}</h4>
                          {item.option && <p className="text-sm text-gray-600 mb-2">{item.option}</p>}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>단가: {formatCurrency(item.price)}</span>
                              <span>수량: {item.quantity}개</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg text-emerald-600">{formatCurrency(item.price * item.quantity)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - 결제 정보 */}
            <div className="lg:col-span-1">
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm sticky top-8">
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">결제 정보</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">상품 금액</span>
                      <span className="font-semibold">{formatCurrency(order.totalPrice - order.shippingFee)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">배송비</span>
                      <span className="font-semibold">{order.shippingFee > 0 ? formatCurrency(order.shippingFee) : '무료'}</span>
                    </div>
                    <Separator className="my-4" />
                    <div className="flex justify-between items-center py-2">
                      <span className="text-lg font-bold text-gray-900">총 결제금액</span>
                      <span className="text-xl font-bold text-emerald-600">{formatCurrency(order.totalPrice)}</span>
                    </div>

                    {/* Benefits */}
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <Shield className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="text-sm font-medium text-emerald-800">안전한 결제</p>
                          <p className="text-xs text-emerald-600">SSL 보안 결제 시스템</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Truck className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">배송 보장</p>
                          <p className="text-xs text-blue-600">30,000원 이상 무료배송</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-6">
                  <Button variant="outline" onClick={handleGoBack} className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 bg-transparent">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    주문 목록으로 돌아가기
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
