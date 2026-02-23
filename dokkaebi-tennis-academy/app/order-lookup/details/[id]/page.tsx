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
import LoginGate from '@/components/system/LoginGate';

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

type GuestOrderMode = 'off' | 'legacy' | 'on';

function getGuestOrderModeClient(): GuestOrderMode {
  // 클라이언트에서는 NEXT_PUBLIC_만 접근 가능
  // env가 없으면 legacy로 기본값 처리(= 신규 비회원 주문은 막고, 기존 조회만 유지 가능)
  const raw = (process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  return raw === 'off' || raw === 'legacy' || raw === 'on' ? raw : 'legacy';
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
      return 'bg-muted text-foreground border-border';
    case '배송중':
      return 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20';
    case '배송준비중':
      return 'bg-muted text-primary border-border';
    case '주문취소':
      return 'bg-muted text-foreground border-border';
    default:
      return 'bg-muted text-foreground border-border';
  }
};

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;

  // 비회원 주문 조회(게스트) 접근 허용 여부(클라)
  const guestOrderMode = getGuestOrderModeClient();
  const allowGuestLookup = guestOrderMode !== 'off';

  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowGuestLookup) {
      setLoading(false);
      return;
    }
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
  }, [params.id, allowGuestLookup]);

  if (!allowGuestLookup) {
    return <LoginGate next="/mypage" variant="orderLookup" />;
  }

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
      <div className="min-h-full bg-background">
        {/* Hero Section */}
        <div className="relative overflow-hidden border-b border-border bg-muted/30 dark:bg-card/40">
          <div className="absolute inset-0 bg-overlay/10"></div>
          <div className="relative container mx-auto px-4 py-16">
            <div className="text-center text-foreground">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-card/20 backdrop-blur-sm rounded-full mb-6">
                <Package className="w-8 h-8 animate-pulse" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4"><span className="text-primary">주문</span> 상세 정보</h1>
              <p className="text-xl text-muted-foreground">주문 정보를 불러오는 중입니다...</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-12 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
              <CardContent className="flex justify-center items-center py-16">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
                    <div className="w-8 h-8 border-4 border-border/30 border-t-primary-foreground rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">주문 정보 로딩 중</h3>
                  <p className="text-muted-foreground">잠시만 기다려주세요...</p>
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
      <div className="min-h-full bg-background">
        {/* Hero Section */}
        <div className="relative overflow-hidden border-b border-border bg-muted/30 dark:bg-card/40">
          <div className="absolute inset-0 bg-overlay/10"></div>
          <div className="relative container mx-auto px-4 py-16">
            <div className="text-center text-foreground">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-card/20 backdrop-blur-sm rounded-full mb-6">
                <Package className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">주문 상세 정보 오류</h1>
              <p className="text-xl text-destructive">주문 정보를 불러오는 중 문제가 발생했습니다</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-12 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20 rounded-full mb-6">
                    <Package className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">오류가 발생했습니다</h3>
                  <p className="text-primary mb-8 max-w-md">{error}</p>
                  <Button onClick={handleGoBack} className="bg-primary text-primary-foreground hover:bg-primary/90">
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
    <div className="min-h-full bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border bg-muted/30 dark:bg-card/40">
        <div className="absolute inset-0 bg-overlay/10"></div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center text-foreground">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-card/20 backdrop-blur-sm rounded-full mb-6">
              <Package className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4"><span className="text-primary">주문</span> 상세 정보</h1>
            <p className="text-xl text-muted-foreground">주문번호: {order._id.slice(-8)}</p>
            <div className="mt-4">
              <span className={`inline-flex items-center gap-2 text-lg px-4 py-2 rounded-full border-2 font-semibold ${getStatusColor(order.status)} bg-card/20 backdrop-blur-sm border-border/30 text-foreground`}>
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
            <Button variant="ghost" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group" onClick={handleGoBack}>
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              주문 목록으로 돌아가기
            </Button>
          </div>

          {/* String Service Alert */}
          {order.shippingInfo?.deliveryMethod?.replace(/\s/g, '') === '방문수령' && order.shippingInfo?.withStringService && (
            <Card className="mb-8 border-2 border-border bg-card">
              <CardContent className="p-6">
                {!order.isStringServiceApplied ? (
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-primary mb-2">스트링 장착 서비스 신청 가능</h3>
                      <p className="text-primary mb-4">이 주문은 스트링 장착 서비스가 포함되어 있습니다. 아래 버튼을 클릭하여 신청해주세요.</p>
                      <Link href={`/services/apply?orderId=${order._id}`} className="inline-flex items-center px-4 py-2 bg-muted hover:bg-muted text-foreground font-semibold rounded-lg transition-colors">
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        스트링 장착 서비스 신청하기
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full border border-success/30 bg-success/10 text-success dark:bg-success/15">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold text-foreground">스트링 장착 서비스 신청 완료</h3>
                      <p className="text-foreground">이 주문의 스트링 장착 서비스 신청이 완료되었습니다.</p>
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
              <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-foreground" />
                    </div>
                    <CardTitle className="text-xl font-bold">주문 정보</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">주문일자</p>
                        <p className="font-semibold">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">주문번호</p>
                        <p className="font-mono text-sm bg-muted px-3 py-1 rounded">{order._id}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">입금 계좌</p>
                      {order.paymentInfo?.bank && bankLabelMap[order.paymentInfo.bank] ? (
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                          <div className="space-y-2">
                            <p className="font-semibold text-accent-foreground">{order.paymentInfo.method}</p>
                            <p className="font-semibold text-primary">{bankLabelMap[order.paymentInfo.bank].label}</p>
                            <p className="font-mono text-primary">{bankLabelMap[order.paymentInfo.bank].account}</p>
                            <p className="text-sm text-primary">예금주: {bankLabelMap[order.paymentInfo.bank].holder}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">선택된 은행 없음</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 배송 정보 */}
              <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-foreground" />
                    </div>
                    <CardTitle className="text-xl font-bold">배송 정보</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                        <User className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">수령인</p>
                          <p className="font-semibold">{order.shippingInfo.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                        <Phone className="w-5 h-5 text-success" />
                        <div>
                          <p className="text-sm text-muted-foreground">연락처</p>
                          <p className="font-semibold">{order.shippingInfo.phone}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-3 bg-background rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">배송지</p>
                        <p className="font-semibold">{order.shippingInfo.address}</p>
                      </div>
                      {order.trackingNumber && (
                        <div className="flex items-center gap-3 p-3 border border-primary/20 bg-primary/10 dark:bg-primary/20 rounded-lg">
                          <Truck className="w-5 h-5 text-primary" />
                          <div className="flex-1">
                            <p className="text-sm text-primary mb-1">운송장 번호</p>
                            <p className="font-mono font-semibold text-primary">{order.trackingNumber}</p>
                          </div>
                          <Button variant="link" className="text-primary hover:text-primary p-0">
                            배송 조회
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 주문 상품 */}
              <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-foreground" />
                    </div>
                    <CardTitle className="text-xl font-bold">주문 상품</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.items.map((item, index) => (
                      <div key={item.id || index} className="flex flex-col md:flex-row gap-4 p-4 border-2 border-border rounded-lg hover:border-border transition-colors">
                        <div className="flex-shrink-0 w-full md:w-24 h-24 bg-muted rounded-lg overflow-hidden">
                          <Image src={item.image || '/placeholder.svg'} alt={item.name} width={96} height={96} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground mb-1 truncate">{item.name}</h4>
                          {item.option && <p className="text-sm text-muted-foreground mb-2">{item.option}</p>}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>단가: {formatCurrency(item.price)}</span>
                              <span>수량: {item.quantity}개</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg text-primary">{formatCurrency(item.price * item.quantity)}</p>
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
              <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm sticky top-8">
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-foreground" />
                    </div>
                    <CardTitle className="text-xl font-bold">결제 정보</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">상품 금액</span>
                      <span className="font-semibold">{formatCurrency(order.totalPrice - order.shippingFee)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">배송비</span>
                      <span className="font-semibold">{order.shippingFee > 0 ? formatCurrency(order.shippingFee) : '무료'}</span>
                    </div>
                    <Separator className="my-4" />
                    <div className="flex justify-between items-center py-2">
                      <span className="text-lg font-bold text-foreground">총 결제금액</span>
                      <span className="text-xl font-bold text-primary">{formatCurrency(order.totalPrice)}</span>
                    </div>

                    {/* Benefits */}
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-primary rounded-lg border border-border">
                        <Shield className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-accent-foreground">안전한 결제</p>
                          <p className="text-xs text-primary">SSL 보안 결제 시스템</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 border border-primary/20 bg-primary/10 dark:bg-primary/20 rounded-lg">
                        <Truck className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-primary">배송 보장</p>
                          <p className="text-xs text-primary">30,000원 이상 무료배송</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-6">
                  <Button variant="outline" onClick={handleGoBack} className="w-full border-border text-primary hover:bg-primary/10 dark:hover:bg-primary/20 hover:border-border bg-transparent">
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
