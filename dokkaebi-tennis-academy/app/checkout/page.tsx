'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useCartStore } from '@/app/store/cartStore';
import { useEffect, useState } from 'react';
import CheckoutButton from '@/app/checkout/CheckoutButton';
import { useAuthStore, type User } from '@/app/store/authStore';
import { getMyInfo } from '@/lib/auth.client';
import { CreditCard, MapPin, Truck, Shield, CheckCircle, UserIcon, Mail, Phone, Home, MessageSquare, Building2, Package, Star } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    daum: any;
  }
}

export default function CheckoutPage() {
  const sp = useSearchParams();

  // 1) URL 파라미터로 최초 진입 제어
  const withServiceParam = sp.get('withService'); // '1' | '0' | null

  // 2) 기존 상태
  const [withStringService, setWithStringService] = useState(false);

  // 3) 최초 마운트 시 URL 파라미터가 1이면 기본 ON
  useEffect(() => {
    if (withServiceParam === '1') {
      setWithStringService(true);
    }
  }, [withServiceParam]);

  const { items: orderItems } = useCartStore();

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal >= 30000 ? 0 : 3000;
  const total = subtotal + shippingFee;

  const [selectedBank, setSelectedBank] = useState('shinhan');

  const bankAccounts = [
    { bank: '신한은행', account: '123-456-789012', owner: '도깨비테니스' },
    { bank: '국민은행', account: '123-45-6789-012', owner: '도깨비테니스' },
    { bank: '우리은행', account: '1234-567-890123', owner: '도깨비테니스' },
  ];

  const [deliveryMethod, setDeliveryMethod] = useState<'택배수령' | '방문수령'>('택배수령');

  // 장착 서비스 수거방식(신청서 Step1과 1:1 매핑)
  // (UI에서는 COURIER_VISIT 선택지를 숨김)
  type ServicePickup = 'SELF_SEND' | 'COURIER_VISIT' | 'SHOP_VISIT';
  const [servicePickupMethod, setServicePickupMethod] = useState<ServicePickup>('SELF_SEND');

  // 안내문구(배송 방법에 따라 분기)
  const serviceHelpText = deliveryMethod === '방문수령' ? '매장 방문 시 현장 장착으로 진행됩니다. 평균 15~20분 소요.' : '택배 수령을 선택하면 수거/반송을 통해 장착 서비스가 진행됩니다.';

  // 동기화: 방문수령이면 SHOP_VISIT 고정, 택배면 기본 SELF_SEND
  useEffect(() => {
    if (!withStringService) return;
    if (deliveryMethod === '방문수령') {
      setServicePickupMethod('SHOP_VISIT');
    } else {
      // setServicePickupMethod((prev) => (prev === 'SELF_SEND' || prev === 'COURIER_VISIT' ? prev : 'SELF_SEND'));
      setServicePickupMethod('SELF_SEND');
    }
  }, [deliveryMethod, withStringService]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [deliveryRequest, setDeliveryRequest] = useState('');
  const [depositor, setDepositor] = useState('');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleFindPostcode = () => {
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        const fullAddress = data.address;
        const zonecode = data.zonecode;
        setPostalCode(zonecode);
        setAddress(fullAddress);
      },
    }).open();
  };

  const [saveAddress, setSaveAddress] = useState(false);
  const { logout } = useAuthStore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);

  // 비회원 체크아웃 허용: quiet 조회 사용 (401이어도 전역 만료 금지)
  useEffect(() => {
    let cancelled = false;
    getMyInfo({ quiet: true })
      .then(({ user }) => {
        if (!cancelled) setUser(user);
      })
      .catch(() => {
        /* quiet: 401은 정상. 아무 것도 하지 않음 */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!user) return;

    const fetchUserInfo = async () => {
      const res = await fetch('/api/users/me', { credentials: 'include' });
      if (!res.ok) return;

      const data = await res.json();

      setName(data.name || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setPostalCode(data.postalCode || '');
      setAddress(data.address || '');
      setAddressDetail(data.addressDetail || '');
    };

    fetchUserInfo();
  }, [user]);

  if (loading)
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 text-white dark:from-blue-700 dark:via-purple-700 dark:to-teal-700">
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40"></div>
        <div className="absolute inset-0 bg-[url('/placeholder.svg?height=400&width=800')] opacity-10"></div>
        <div className="relative container py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 dark:bg-white/30 backdrop-blur-sm rounded-full">
              <CreditCard className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">주문/결제</h1>
              <p className="text-blue-100">고객님의 배송/수령/결제정보를 확인 후 주문을 완료하세요</p>
            </div>
          </div>

          {/* <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-400" />
              <span>SSL 보안 결제</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-400" />
              <span>빠른 배송</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
              <span>30,000원 이상 무료배송</span>
            </div>
          </div> */}
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* 주문 정보 입력 폼 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 주문 상품 */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10 p-6">
                <CardTitle className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  주문 상품
                </CardTitle>
                <CardDescription className="mt-2">장바구니에서 선택한 상품 목록입니다.</CardDescription>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50/50 to-blue-50/30 dark:from-slate-700/50 dark:to-slate-600/30 rounded-lg border border-slate-200/50 dark:border-slate-600/50">
                      <div className="relative">
                        <Image src={item.image || '/placeholder.svg?height=80&width=80&query=tennis+product'} alt={item.name} width={80} height={80} className="rounded-lg border-2 border-white shadow-lg" />
                        <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">{item.quantity}</div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">수량: {item.quantity}개</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-blue-600">{(item.price * item.quantity).toLocaleString()}원</div>
                        <div className="text-sm text-slate-500">단가: {item.price.toLocaleString()}원</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 배송 정보 */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-6">
                <CardTitle className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-green-600" />
                  배송 정보
                </CardTitle>
                <CardDescription className="mt-2">상품을 받으실 배송지 정보를 입력해주세요.</CardDescription>
              </div>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="recipient-name" className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-blue-600" />
                        수령인 이름
                      </Label>
                      <Input id="recipient-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="수령인 이름을 입력하세요" className="border-2 focus:border-blue-500 transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipient-email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-purple-600" />
                        이메일
                      </Label>
                      <Input id="recipient-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@naver.com" className="border-2 focus:border-purple-500 transition-colors" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="recipient-phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-teal-600" />
                        연락처
                      </Label>
                      <Input id="recipient-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처를 입력하세요 ('-' 제외)" className="border-2 focus:border-teal-500 transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="address-postal" className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-orange-600" />
                        우편번호
                      </Label>
                      <Button variant="outline" size="sm" onClick={handleFindPostcode} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:from-blue-600 hover:to-purple-600">
                        우편번호 찾기
                      </Button>
                    </div>
                    <Input id="address-postal" readOnly value={postalCode} placeholder="우편번호" className="bg-slate-100 dark:bg-slate-700 cursor-not-allowed max-w-[200px] border-2" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address-main">기본 주소</Label>
                    <Input id="address-main" readOnly value={address} placeholder="기본 주소" className="bg-slate-100 dark:bg-slate-700 cursor-not-allowed border-2" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address-detail">상세 주소</Label>
                    <Input id="address-detail" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="상세 주소를 입력하세요" className="border-2 focus:border-blue-500 transition-colors" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delivery-request" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      배송 요청사항
                    </Label>
                    <Textarea id="delivery-request" value={deliveryRequest} onChange={(e) => setDeliveryRequest(e.target.value)} placeholder="배송 시 요청사항을 입력하세요" className="border-2 focus:border-green-500 transition-colors" />
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="save-address" checked={saveAddress} onCheckedChange={(checked) => setSaveAddress(!!checked)} disabled={!user} />
                      <label htmlFor="save-address" className={`text-sm font-medium ${!user ? 'text-gray-400' : 'text-blue-700 dark:text-blue-400'}`}>
                        이 배송지 정보를 저장
                      </label>
                    </div>
                    {!user && <p className="text-xs text-slate-500 dark:text-slate-400 ml-6 mt-1">로그인 후 배송지 정보를 저장할 수 있습니다.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 수령 방식 및 장착 서비스 카드 */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-red-500/10 p-6">
                <CardTitle className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-purple-600" />
                  상품 접수 예약 방식
                </CardTitle>
                <CardDescription className="mt-2">상품을 어떻게 예약하실지 선택해주세요.</CardDescription>
              </div>
              <CardContent className="p-6 space-y-4">
                <RadioGroup defaultValue="택배수령" onValueChange={(value) => setDeliveryMethod(value as '택배수령' | '방문수령')}>
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <RadioGroupItem value="택배수령" id="택배수령" />
                    <Label htmlFor="택배수령" className="flex-1 cursor-pointer font-medium">
                      택배 수령 (자택 또는 지정 장소로 배송)
                    </Label>
                    <Truck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <RadioGroupItem value="방문수령" id="방문수령" />
                    <Label htmlFor="방문수령" className="flex-1 cursor-pointer font-medium">
                      방문 수령 (도깨비 테니스 샵에서 직접 수령)
                    </Label>
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                </RadioGroup>

                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox id="withStringService" checked={withStringService} onCheckedChange={(checked) => setWithStringService(!!checked)} />
                    <Label htmlFor="withStringService" className="font-medium text-orange-700 dark:text-orange-400">
                      스트링 장착 서비스도 함께 신청할게요
                    </Label>
                  </div>
                  <p className="text-sm text-orange-600 dark:text-orange-400 ml-6">{serviceHelpText}</p>

                  {/* 서비스 ON일 때만 세부 방식 표시 */}
                  {withStringService &&
                    (deliveryMethod === '방문수령' ? (
                      // 방문 수령: 매장 방문 접수 고정(선택 불가 안내)
                      <div className="ml-7 mt-2 text-sm">
                        <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">매장 방문 접수로 진행됩니다.</span>
                      </div>
                    ) : (
                      // 택배 수령: **선택지는 자가 발송만** 노출
                      <div className="ml-7 mt-2 grid gap-2 text-sm">
                        <label className="flex items-center gap-2">
                          <input type="radio" name="pickup" checked={servicePickupMethod === 'SELF_SEND'} onChange={() => setServicePickupMethod('SELF_SEND')} />
                          <span>자가 발송 (편의점/우체국 등 직접 발송)</span>
                        </label>
                        {/* 기사 방문 수거 옵션은 잠정 비노출
                        <label className="flex items-center gap-2">
                          <input type="radio" name="pickup" checked={servicePickupMethod === 'COURIER_VISIT'} onChange={() => setServicePickupMethod('COURIER_VISIT')} />
                          <span>택배 기사 방문 수거 (+3,000원 예상)</span>
                        </label>
                        */}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* 결제 정보 */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-6">
                <CardTitle className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  결제 정보
                </CardTitle>
                <CardDescription className="mt-2">결제 방법을 선택하고 필요한 정보를 입력해주세요.</CardDescription>
              </div>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label>결제 방법</Label>
                    <RadioGroup defaultValue="bank-transfer" className="space-y-3">
                      <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                        <RadioGroupItem value="bank-transfer" id="bank-transfer" />
                        <Label htmlFor="bank-transfer" className="flex-1 cursor-pointer font-medium">
                          무통장입금
                        </Label>
                        <Building2 className="h-5 w-5 text-green-600" />
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="bank-account">입금 계좌 선택</Label>
                    <Select value={selectedBank} onValueChange={setSelectedBank}>
                      <SelectTrigger className="border-2 focus:border-emerald-500">
                        <SelectValue placeholder="입금 계좌를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shinhan">신한은행 123-456-789012 (예금주: 도깨비테니스)</SelectItem>
                        <SelectItem value="kookmin">국민은행 123-45-6789-012 (예금주: 도깨비테니스)</SelectItem>
                        <SelectItem value="woori">우리은행 1234-567-890123 (예금주: 도깨비테니스)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="depositor-name">입금자명</Label>
                    <Input id="depositor-name" value={depositor} onChange={(e) => setDepositor(e.target.value)} placeholder="입금자명을 입력하세요" className="border-2 focus:border-emerald-500 transition-colors" />
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <p className="font-semibold text-blue-700 dark:text-blue-400">무통장입금 안내</p>
                    </div>
                    <ul className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        주문 후 24시간 이내에 입금해 주셔야 주문이 정상 처리됩니다.
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        입금자명이 주문자명과 다를 경우, 고객센터로 연락 부탁드립니다.
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        입금 확인 후 배송이 시작됩니다.
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 주문자 동의 */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-red-500/10 via-pink-500/10 to-rose-500/10 p-6">
                <CardTitle className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-red-600" />
                  주문자 동의
                </CardTitle>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="agree-all"
                        checked={agreeAll}
                        onCheckedChange={(checked) => {
                          const newValue = !!checked;
                          setAgreeAll(newValue);
                          setAgreeTerms(newValue);
                          setAgreePrivacy(newValue);
                          setAgreeRefund(newValue);
                        }}
                      />
                      <label htmlFor="agree-all" className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                        전체 동의
                      </label>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    {[
                      { id: 'agree-terms', label: '이용약관 동의 (필수)', state: agreeTerms, setState: setAgreeTerms },
                      {
                        id: 'agree-privacy',
                        label: '개인정보 수집 및 이용 동의 (필수)',
                        state: agreePrivacy,
                        setState: setAgreePrivacy,
                      },
                      {
                        id: 'agree-refund',
                        label: '환불 규정 동의 (필수)',
                        state: agreeRefund,
                        setState: setAgreeRefund,
                      },
                    ].map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50/50 to-blue-50/30 dark:from-slate-700/50 dark:to-slate-600/30 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={item.id}
                            checked={item.state}
                            onCheckedChange={(checked) => {
                              const value = !!checked;
                              item.setState(value);
                              if (!value) setAgreeAll(false);
                              else if (agreeTerms && agreePrivacy && agreeRefund) setAgreeAll(true);
                            }}
                          />
                          <label htmlFor={item.id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {item.label}
                          </label>
                        </div>
                        <Button variant="link" size="sm" className="h-auto p-0 text-blue-600 hover:text-blue-800">
                          보기
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 주문 요약 */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-20">
              <Card className="backdrop-blur-sm bg-white/90 dark:bg-slate-800/90 border-0 shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 p-6 text-white">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-white/20 rounded-full">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    주문 요약
                  </CardTitle>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">상품 금액</span>
                      <span className="font-semibold text-lg">{subtotal.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">배송비</span>
                      <span className={`font-semibold ${shippingFee === 0 ? 'text-green-600' : 'text-slate-800 dark:text-slate-200'}`}>{shippingFee > 0 ? `${shippingFee.toLocaleString()}원` : '무료'}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>총 결제 금액</span>
                      <span className="text-blue-600">{total.toLocaleString()}원</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                      <Star className="h-4 w-4" />
                      <span className="font-semibold">배송 혜택</span>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      30,000원 이상 구매 시 무료배송
                      {subtotal < 30000 && <span className="block mt-1 font-semibold">{(30000 - subtotal).toLocaleString()}원 더 구매하면 무료배송!</span>}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                      <Shield className="h-4 w-4" />
                      <span className="font-semibold">주문 안내</span>
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                      <p>• 주문 완료 후 입금 대기 상태로 등록됩니다.</p>
                      <p>• 입금 확인 후 배송이 시작됩니다.</p>
                      <p>• 24시간 이내 입금 부탁드립니다.</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 p-6">
                  <CheckoutButton
                    disabled={!(agreeTerms && agreePrivacy && agreeRefund)}
                    name={name}
                    phone={phone}
                    email={email}
                    postalCode={postalCode}
                    address={address}
                    addressDetail={addressDetail}
                    depositor={depositor}
                    totalPrice={total}
                    shippingFee={shippingFee}
                    selectedBank={selectedBank}
                    deliveryRequest={deliveryRequest}
                    saveAddress={saveAddress}
                    deliveryMethod={deliveryMethod}
                    withStringService={withStringService}
                    servicePickupMethod={servicePickupMethod}
                  />
                  <Button variant="outline" className="w-full border-2 hover:bg-slate-50 dark:hover:bg-slate-700 bg-transparent" asChild>
                    <Link href="/cart">장바구니로 돌아가기</Link>
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
