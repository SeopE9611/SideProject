'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useCartStore } from '@/lib/stores/cart';
import { useEffect, useState } from 'react';
import CheckoutButton from '@/app/checkout/CheckoutButton';
import { useRouter } from 'next/navigation';
import { useAuthStore, User } from '@/lib/stores/auth-store';
import { getMyInfo } from '@/lib/auth.client';

declare global {
  interface Window {
    daum: any;
  }
}

export default function CheckoutPage() {
  const { items: orderItems } = useCartStore();

  // 주문 금액 계산
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal >= 30000 ? 0 : 3000;
  const total = subtotal + shippingFee;

  // 은행 계좌 정보 상태 추가
  const [selectedBank, setSelectedBank] = useState('shinhan'); // 기본값 신한은행

  // 은행 계좌 정보
  const bankAccounts = [
    { bank: '신한은행', account: '123-456-789012', owner: '도깨비테니스' },
    { bank: '국민은행', account: '123-45-6789-012', owner: '도깨비테니스' },
    { bank: '우리은행', account: '1234-567-890123', owner: '도깨비테니스' },
  ];

  // 배송/결제 폼 항목들에 상태 연결
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [deliveryRequest, setDeliveryRequest] = useState('');
  const [depositor, setDepositor] = useState('');

  const handleOrderSubmit = () => {
    console.log('배송 정보', { name, phone, postalCode, address, addressDetail });
    console.log('입금자명', depositor);
    console.log('주문 상품', orderItems);
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  //  우편번호 찾기 함수
  const handleFindPostcode = () => {
    new window.daum.Postcode({
      oncomplete: function (data: any) {
        const fullAddress = data.address;
        const zonecode = data.zonecode;
        setPostalCode(zonecode);
        setAddress(fullAddress);
      },
    }).open();
  };

  // 배송지 저장 상태관리
  const [saveAddress, setSaveAddress] = useState(false);
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 주문자 동의 상태관리
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    getMyInfo()
      .then(({ user }) => setUser(user))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [token, router]);

  // 로그인된 회원이면 자동으로 배송 정보 불러오기
  useEffect(() => {
    if (!user) return;

    const fetchUserInfo = async () => {
      const res = await fetch('/api/users/me', {
        headers: {
          Authorization: `Bearer ${token}`, // 토큰 직접 주입
        },
      });
      if (!res.ok) return;

      const data = await res.json();

      // 사용자 정보 상태 자동 세팅
      setName(data.name || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setPostalCode(data.postalCode || '');
      setAddress(data.address || '');
      setAddressDetail(data.addressDetail || '');
    };

    fetchUserInfo();
  }, [user]);

  if (!user) return null;

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">주문/결제</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* 주문 정보 입력 폼 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 주문 상품 */}
          <Card>
            <CardHeader>
              <CardTitle>주문 상품</CardTitle>
              <CardDescription>장바구니에서 선택한 상품 목록입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 py-2">
                    <Image src={item.image || '/placeholder.svg'} alt={item.name} width={80} height={80} className="rounded-md border" />
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">수량: {item.quantity}개</p>
                    </div>
                    <div className="font-medium text-right">{(item.price * item.quantity).toLocaleString()}원</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 배송 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>배송 정보</CardTitle>
              <CardDescription>상품을 받으실 배송지 정보를 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="recipient-name">수령인 이름</Label>
                    <Input id="recipient-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="수령인 이름을 입력하세요" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipient-email">이메일</Label>
                    <Input id="recipient-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@naver.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipient-phone">연락처</Label>
                    <Input id="recipient-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처를 입력하세요 ('-' 제외) " />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="address-postal">우편번호</Label>
                    <Button variant="outline" size="sm" onClick={handleFindPostcode}>
                      우편번호 찾기
                    </Button>
                  </div>
                  <Input id="address-postal" readOnly value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="우편번호" className=" bg-gray-100 cursor-not-allowed max-w-[200px]" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address-main">기본 주소</Label>
                  <Input id="address-main" readOnly value={address} onChange={(e) => setAddress(e.target.value)} placeholder="기본 주소" className="bg-gray-100 cursor-not-allowed" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address-detail">상세 주소</Label>
                  <Input id="address-detail" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="상세 주소" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery-request">배송 요청사항</Label>
                  <Textarea id="delivery-request" value={deliveryRequest} onChange={(e) => setDeliveryRequest(e.target.value)} placeholder="배송 시 요청사항을 입력하세요" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="save-address" checked={saveAddress} onCheckedChange={(checked) => setSaveAddress(!!checked)} disabled={!user} />
                    <label htmlFor="save-address" className={`text-sm ${!user ? 'text-gray-400' : ''}`}>
                      이 배송지 정보를 저장
                    </label>
                  </div>

                  {!user && <p className="text-xs text-muted-foreground ml-1">로그인 후 배송지 정보를 저장할 수 있습니다.</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 결제 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>결제 정보</CardTitle>
              <CardDescription>결제 방법을 선택하고 필요한 정보를 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>결제 방법</Label>
                  <RadioGroup defaultValue="bank-transfer" className="space-y-3">
                    <div className="flex items-center space-x-2 rounded-md border p-3">
                      <RadioGroupItem value="bank-transfer" id="bank-transfer" />
                      <Label htmlFor="bank-transfer" className="flex-1 cursor-pointer">
                        무통장입금
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="bank-account">입금 계좌 선택</Label>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger>
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
                  <Input id="depositor-name" value={depositor} onChange={(e) => setDepositor(e.target.value)} placeholder="입금자명을 입력하세요" />
                </div>

                <div className="rounded-md bg-muted p-4 text-sm">
                  <p className="font-medium mb-2">무통장입금 안내</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• 주문 후 24시간 이내에 입금해 주셔야 주문이 정상 처리됩니다.</li>
                    <li>• 입금자명이 주문자명과 다를 경우, 고객센터로 연락 부탁드립니다.</li>
                    <li>• 입금 확인 후 배송이 시작됩니다.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 주문자 동의 */}
          <Card>
            <CardHeader>
              <CardTitle>주문자 동의</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                  <label htmlFor="agree-all" className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    전체 동의
                  </label>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="agree-terms"
                        checked={agreeTerms}
                        onCheckedChange={(checked) => {
                          const value = !!checked;
                          setAgreeTerms(value);
                          if (!value) setAgreeAll(false);
                          else if (agreePrivacy && agreeRefund) setAgreeAll(true);
                        }}
                      />
                      <label htmlFor="agree-terms" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        이용약관 동의 (필수)
                      </label>
                    </div>
                    <Button variant="link" size="sm" className="h-auto p-0">
                      보기
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="agree-privacy"
                        checked={agreePrivacy}
                        onCheckedChange={(checked) => {
                          const value = !!checked;
                          setAgreePrivacy(value);
                          if (!value) setAgreeAll(false);
                          else if (agreeTerms && agreeRefund) setAgreeAll(true);
                        }}
                      />
                      <label htmlFor="agree-privacy" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        개인정보 수집 및 이용 동의 (필수)
                      </label>
                    </div>
                    <Button variant="link" size="sm" className="h-auto p-0">
                      보기
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="agree-refund"
                        checked={agreeRefund}
                        onCheckedChange={(checked) => {
                          const value = !!checked;
                          setAgreeRefund(value);
                          if (!value) setAgreeAll(false);
                          else if (agreeTerms && agreePrivacy) setAgreeAll(true);
                        }}
                      />
                      <label htmlFor="agree-refund" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        환불 규정 동의 (필수)
                      </label>
                    </div>
                    <Button variant="link" size="sm" className="h-auto p-0">
                      보기
                    </Button>
                  </div>
                  {/* <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="agree-marketing" />
                      <label htmlFor="agree-marketing" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        마케팅 정보 수신 동의 (선택)
                      </label>
                    </div>
                  </div> */}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 주문 요약 */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-20">
            <Card>
              <CardHeader>
                <CardTitle>주문 요약</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>상품 금액</span>
                  <span>{subtotal.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span>배송비</span>
                  <span>{shippingFee > 0 ? `${shippingFee.toLocaleString()}원` : '무료'}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>총 결제 금액</span>
                  <span>{total.toLocaleString()}원</span>
                </div>

                <div className="rounded-md bg-muted p-3 text-sm">
                  <p>주문 완료 후 입금 대기 상태로 등록됩니다.</p>
                  <p>입금 확인 후 배송이 시작됩니다.</p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
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
                />
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/cart">장바구니로 돌아가기</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
