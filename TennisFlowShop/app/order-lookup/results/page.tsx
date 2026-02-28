'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, ChevronRight, Calendar, User, Phone, CreditCard, ArrowLeft, Package, Search, CheckCircle2, Clock, Truck, Shield } from 'lucide-react';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import LoginGate from '@/components/system/LoginGate';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const onlyDigits = (v: string) => v.replace(/\D/g, '');
const isValidKoreanPhoneDigits = (digits: string) => digits.length === 10 || digits.length === 11;

type GuestOrderMode = 'off' | 'legacy' | 'on';

function getGuestOrderModeClient(): GuestOrderMode {
  // 클라이언트에서는 NEXT_PUBLIC_만 접근 가능
  // env가 없으면 legacy로 기본값 처리(= 신규 비회원 주문은 막고, 기존 조회만 유지 가능)
  const raw = (process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  return raw === 'off' || raw === 'legacy' || raw === 'on' ? raw : 'legacy';
}

// 주문 타입 정의
interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  recipient: string;
  contactNumber: string;
  totalAmount: number;
  status: '배송준비중' | '배송중' | '배송완료' | '주문취소';
  shippingInfo?: {
    deliveryMethod?: string;
    withStringService?: boolean;
  };
  isStringServiceApplied?: boolean;
  stringingApplicationId?: string | null;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case '배송완료':
      return <CheckCircle2 className="w-4 h-4" />;
    case '배송중':
      return <Truck className="w-4 h-4" />;
    case '배송준비중':
      return <Clock className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case '배송완료':
      return 'bg-muted text-foreground border-border';
    case '배송중':
      return 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20';
    case '배송준비중':
      return 'bg-muted text-foreground border-border';
    case '주문취소':
      return 'bg-muted text-foreground border-border';
    default:
      return 'bg-muted text-foreground border-border';
  }
};

export default function OrderLookupResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  // 비회원 주문 조회(게스트) 접근 허용 여부(클라)
  const guestOrderMode = getGuestOrderModeClient();
  const allowGuestLookup = guestOrderMode !== 'off';

  // 이름과 이메일 파라미터 가져오기
  const rawName: string = searchParams.get('name') ?? '';
  const rawEmail: string = searchParams.get('email') ?? '';
  const rawPhone: string = searchParams.get('phone') ?? '';

  // 화면 표시는 trim 된 값 기준 (공백만 들어오는 케이스 방지)
  const displayName = rawName.trim();

  useEffect(() => {
    if (!allowGuestLookup) {
      setLoading(false);
      return;
    }
    const fetchOrders = async () => {
      try {
        setFieldErrors(null);

        // 1) URL 파라미터 정규화
        const name = rawName.trim();
        const email = rawEmail.trim();
        const phoneDigits = rawPhone ? onlyDigits(rawPhone) : '';

        // 2) URL 파라미터 검증 (서버와 동일 기준)
        if (!name) {
          setError('이름이 비어있습니다. 주문 조회 페이지에서 다시 입력해주세요.');
          setLoading(false);
          return;
        }

        if (name.length > 50) {
          setError('이름은 50자 이내로 입력해주세요.');
          setLoading(false);
          return;
        }
        if (!email) {
          setError('이메일이 비어있습니다. 주문 조회 페이지에서 다시 입력해주세요.');
          setLoading(false);
          return;
        }
        if (!EMAIL_RE.test(email) || email.length > 254) {
          setError('유효한 이메일 주소를 입력해주세요.');
          setLoading(false);
          return;
        }
        if (phoneDigits && !isValidKoreanPhoneDigits(phoneDigits)) {
          setError('전화번호는 숫자 10~11자리만 입력해주세요.');
          setLoading(false);
          return;
        }

        // 3) 서버로는 "정규화된 값"만 전송 (phone은 빈 값이면 제외)
        const payload: { name: string; email: string; phone?: string } = { name, email };
        if (phoneDigits) payload.phone = phoneDigits;

        const res = await fetch('/api/guest-orders/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        });

        const data = await res.json();

        // 400(유효성 실패)도 여기로 들어오므로 ok/success 기준으로 분기
        if (!res.ok || !data?.success) {
          setError(data?.error ?? '주문 조회 요청 값이 올바르지 않습니다.');
          setFieldErrors(data?.fieldErrors ?? null);
          setLoading(false);
          return;
        }

        if (data.orders.length > 0) {
          setOrders(
            data.orders.map((o: any) => ({
              id: o._id, // key로 사용할 고유 ID
              orderNumber: o._id.slice(-6), // 보기 좋게 마지막 6자리만 주문번호처럼 사용
              orderDate: new Date(o.createdAt).toLocaleDateString(),
              recipient: o.shippingInfo?.name ?? '',
              contactNumber: o.shippingInfo?.phone ?? '',
              totalAmount: o.totalPrice ?? 0,
              status: o.status ?? '배송준비중',
              shippingInfo: {
                deliveryMethod: o.shippingInfo?.deliveryMethod,
                withStringService: o.shippingInfo?.withStringService,
              },
              isStringServiceApplied: o.isStringServiceApplied,
              stringingApplicationId: o.stringingApplicationId ?? null,
            })),
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
  }, [rawName, rawEmail, rawPhone, allowGuestLookup]);

  if (!allowGuestLookup) {
    return <LoginGate next="/mypage" variant="orderLookup" />;
  }

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
      <div className="min-h-full bg-background">
        {/* Hero Section */}
        <div className="relative overflow-hidden border-b border-border bg-muted/30 dark:bg-card/40">
          <div className="absolute inset-0 bg-overlay/10"></div>
          <div className="relative container mx-auto px-4 py-16">
            <div className="text-center text-foreground">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-card/20 backdrop-blur-sm rounded-full mb-6">
                <Search className="w-8 h-8 animate-pulse" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">주문 조회 중...</h1>
              <p className="text-xl text-muted-foreground">주문 정보를 불러오고 있습니다</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-12 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
              <CardContent className="flex justify-center items-center py-16">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6 dark:bg-primary/20">
                    <div className="w-8 h-8 border-4 border-border/30 border-t-primary-foreground rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">주문 정보 조회 중</h3>
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
              <h1 className="text-4xl md:text-5xl font-bold mb-4">조회 오류</h1>
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
                  <p className="text-muted-foreground mb-8 max-w-md">{error}</p>
                  {fieldErrors && (
                    <div className="w-full max-w-md mb-8 text-left">
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 dark:bg-destructive/15 p-4 text-foreground">
                        <p className="text-sm font-semibold text-destructive mb-2">입력값 오류 상세</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {Object.entries(fieldErrors).map(([field, msgs]) =>
                            (msgs ?? []).map((msg, i) => (
                              <li key={`${field}-${i}`} className="text-sm text-destructive">
                                <span className="font-medium">{field}:</span> {msg}
                              </li>
                            )),
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                  <Button onClick={handleGoBack} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    주문 조회 페이지로 돌아가기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border bg-muted/30 dark:bg-card/40">
        <div className="absolute inset-0 bg-overlay/10"></div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center text-foreground">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-card/20 backdrop-blur-sm rounded-full mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">주문 조회 결과</h1>
            <p className="text-xl text-muted-foreground">
              {displayName}님의 주문 내역 {orders?.length || 0}건
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-12 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <div className="mb-8">
            <Link href="/order-lookup" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              이전 페이지로 돌아가기
            </Link>
          </div>

          <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-sm mb-8">
            <CardHeader className="text-center pb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4 mx-auto dark:bg-primary/20">
                <ShoppingBag className="w-6 h-6 text-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground"><span className="text-primary">주문</span> 내역</CardTitle>
              <CardDescription className="text-base">{displayName}님의 주문 내역입니다</CardDescription>
            </CardHeader>

            <Separator className="mx-6" />

            <CardContent className="pt-8">
              {orders && orders.length > 0 ? (
                <div className="space-y-6">
                  {orders.map((order, index) => {
                    const hasCompletedStringingApplication = Boolean(order.stringingApplicationId) || order.isStringServiceApplied === true;

                    return (
                    <Card key={order.id} className="overflow-hidden border-2 border-border hover:border-border transition-all duration-200 hover:shadow-lg">
                      <div className="p-6">
                        {/* Order Header */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
                          <div className="flex items-center mb-4 lg:mb-0">
                            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4 dark:bg-primary/20">
                              <span className="text-foreground font-bold">#{index + 1}</span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-foreground">주문번호: {order.orderNumber}</h3>
                              <p className="text-sm text-muted-foreground">주문일자: {order.orderDate}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border font-medium ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              {order.status}
                            </span>
                          </div>
                        </div>

                        {/* Order Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                          <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                            <User className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">수령인</p>
                              <p className="font-medium text-foreground truncate">{order.recipient}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                            <Phone className="h-5 w-5 text-success flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">연락처</p>
                              <p className="font-medium text-foreground truncate">{order.contactNumber}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                            <Calendar className="h-5 w-5 text-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">주문일자</p>
                              <p className="font-medium text-foreground">{order.orderDate}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20 dark:bg-primary/20">
                            <CreditCard className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-primary mb-1">결제금액</p>
                              <p className="font-bold text-primary">{formatCurrency(order.totalAmount)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-end">
                          <Button variant="outline" className="flex items-center gap-2 border-border text-primary hover:bg-primary/10 dark:hover:bg-primary/20 hover:border-border bg-transparent" onClick={() => handleViewDetails(order.id)}>
                            <Package className="w-4 h-4" />
                            상세보기
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>

                          {order.shippingInfo?.deliveryMethod?.replace(/\s/g, '') === '방문수령' && order.shippingInfo?.withStringService && (
                            <>
                              {!hasCompletedStringingApplication ? (
                                <Button
                                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                                  onClick={() => router.push(`/services/apply?orderId=${order.id}`)}
                                >
                                  <ShoppingBag className="w-4 h-4 mr-2" />
                                  스트링 장착 신청
                                </Button>
                              ) : (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="inline-flex h-10 items-center justify-center rounded-md border-2 border-border bg-primary/10 px-4 py-2 text-sm font-semibold text-primary cursor-default dark:bg-primary/20">
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        교체 서비스 접수 완료
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-sm">
                                      이미 신청이 완료된 주문입니다
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  )})}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-6">
                    <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground mb-4">조회된 주문이 없습니다</h3>
                  <p className="text-muted-foreground text-center mb-8 max-w-md">
                    입력하신 정보와 일치하는 주문 내역이 없습니다.
                    <br />
                    주문 시 입력한 정보를 다시 확인해주세요.
                  </p>
                  <Button onClick={handleGoBack} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    주문 조회 페이지로 돌아가기
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
