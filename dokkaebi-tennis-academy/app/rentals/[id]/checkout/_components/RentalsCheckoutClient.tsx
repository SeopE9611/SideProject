'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { CreditCard, MapPin, Package, UserIcon, Phone, Home, MessageSquare, Shield, Truck, Building2, Undo2, Search, Mail, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { bankLabelMap, racketBrandLabel } from '@/lib/constants';
import { getMyInfo } from '@/lib/auth.client';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

declare global {
  interface Window {
    daum: any;
  }
}

type Initial = {
  racketId: string;
  period: 7 | 15 | 30;
  fee: number;
  deposit: number;
  requestStringing?: boolean;
  selectedString?: {
    id: string;
    name: string;
    price: number;
    mountingFee: number; //  상품별 교체비(장착비)
    image: string | null;
  };
  racket: {
    id: string;
    brand: string;
    model: string;
    image: string | null;
    condition: 'A' | 'B' | 'C';
  } | null;
};

export default function RentalsCheckoutClient({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [requestStringing, setRequestStringing] = useState(Boolean(initial.requestStringing));
  const selectedString = initial.selectedString ?? null;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostal] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [deliveryRequest, setRequest] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedBank, setSelectedBank] = useState<'shinhan' | 'kookmin' | 'woori' | ''>('');
  const [depositor, setDepositor] = useState('');

  /**
   * 스트링 교체 신청 시 결제에 포함될 금액
   * - stringPrice: 선택한 스트링 상품 가격
   * - stringingFee: 선택한 스트링 상품의 mountingFee(장착비/교체비)
   */
  const stringPrice = requestStringing ? selectedString?.price ?? 0 : 0;
  const stringingFee = requestStringing ? selectedString?.mountingFee ?? 0 : 0;

  // 총 결제 금액 = 대여수수료 + 보증금 + 스트링 + 교체비
  const total = initial.fee + initial.deposit + stringPrice + stringingFee;

  const [refundBank, setRefundBank] = useState<'shinhan' | 'kookmin' | 'woori' | ''>('');
  const [refundAccount, setRefundAccount] = useState(''); // 계좌번호
  const [refundHolder, setRefundHolder] = useState(''); // 예금주

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);

  // 회원 배송 정보 자동 채움
  useEffect(() => {
    let cancelled = false;
    getMyInfo({ quiet: true })
      .then(async ({ user }) => {
        if (!user || cancelled) return;
        const res = await fetch('/api/users/me', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setPostal(data.postalCode || '');
        setAddress(data.address || '');
        setAddressDetail(data.addressDetail || '');
      })
      .catch(() => {
        /* 게스트/401은 정상, 아무 것도 안 함 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 우편번호 검색기
  const openPostcode = () => {
    if (!window?.daum?.Postcode) {
      alert('주소 검색기를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        setPostal(String(data.zonecode || ''));
        setAddress(String(data.roadAddress || data.address || ''));
        // 기본주소/우편번호는 readOnly 정책 → 상세주소로 포커스 유도
        setTimeout(() => document.getElementById('address-detail')?.focus(), 0);
      },
    }).open();
  };

  const onPay = async () => {
    if (requestStringing && !selectedString?.id) {
      alert('스트링 교체를 함께 진행하려면 먼저 스트링을 선택해주세요.');
      router.push(`/rentals/${initial.racketId}/select-string?period=${initial.period}`);
      return;
    }

    if (!name || !phone || !postalCode || !address) {
      alert('필수 정보를 모두 입력해주세요.');
      return;
    }

    if (!selectedBank || !depositor) {
      alert('입금 은행과 입금자명을 입력해주세요.');
      return;
    }

    if (!refundBank || !refundAccount || !refundHolder) {
      alert('보증금 환급 계좌(은행/계좌번호/예금주)를 모두 입력해주세요.');
      return;
    }

    if (!agreeTerms || !agreePrivacy || !agreeRefund) {
      alert('필수 약관에 모두 동의해주세요.');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          racketId: initial.racketId,
          days: initial.period,
          payment: {
            method: 'bank_transfer',
            bank: selectedBank,
            depositor,
          },
          shipping: {
            name,
            phone,
            postalCode,
            address,
            addressDetail,
            deliveryRequest,
          },
          refundAccount: {
            bank: refundBank,
            account: refundAccount,
            holder: refundHolder,
          },
          // --- 스트링 교체 요청 ---
          // 결제금액(대여료/보증금)은 그대로 두고,
          // "요청 여부 + 선택 스트링"만 서버/DB에 저장.
          stringing: {
            requested: !!requestStringing,
            // requestStringing이 false면 stringId는 보내지 않아 서버가 무시하도록 함
            stringId: requestStringing ? selectedString?.id : undefined,
          },
        }),
      });

      const json: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(json?.message ?? '결제 처리에 실패했습니다.');
        return;
      }

      // 성공 페이지에서 안내를 위해(기존 로직 유지)
      try {
        sessionStorage.setItem('rentals-last-bank', selectedBank);
        sessionStorage.setItem('rentals-last-depositor', depositor);
        sessionStorage.setItem('rentals-refund-bank', refundBank);
        sessionStorage.setItem('rentals-refund-account', refundAccount);
        sessionStorage.setItem('rentals-refund-holder', refundHolder);
        sessionStorage.setItem('rentals-success', '1'); // 뒤로가기 방지
      } catch {}

      const rentalId = String(json?.id ?? '');

      //  스트링 교체 신청을 체크했다면: 결제 완료 후 바로 신청서 작성 흐름으로 연결
      if (requestStringing) {
        const qs = new URLSearchParams();
        qs.set('rentalId', String(json.id));

        // 라켓 정보도 전달 → apply에서 라켓 타입 프리필
        if (initial.racket?.brand) qs.set('racketBrand', String(initial.racket.brand));
        if (initial.racket?.model) qs.set('racketModel', String(initial.racket.model));

        // stringId/productId는 "선택된 스트링 상품 id"만
        if (selectedString?.id) {
          qs.set('stringId', selectedString.id);
          qs.set('productId', selectedString.id);
        }

        router.push(`/services/apply?${qs.toString()}`);
        return;
      }

      // 기본: 대여 성공 페이지
      router.push(`/rentals/success?id=${json.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 text-white dark:from-blue-700 dark:via-purple-700 dark:to-teal-700">
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40"></div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 dark:bg-white/30 backdrop-blur-sm rounded-full">
              <CreditCard className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">라켓 대여 결제</h1>
              <p className="text-blue-100">배송 정보를 입력하고 대여를 완료하세요</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 bp-lg:grid-cols-3">
          <div className="bp-lg:col-span-2 space-y-6">
            {/* 대여 상품 정보 */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10 p-6">
                <CardTitle className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  대여 상품
                </CardTitle>
                <CardDescription className="mt-2">선택하신 라켓 정보입니다.</CardDescription>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50/50 to-blue-50/30 dark:from-slate-700/50 dark:to-slate-600/30 rounded-lg border border-slate-200/50 dark:border-slate-600/50">
                  <div className="relative">
                    {initial.racket?.image ? (
                      <Image src={initial.racket.image || '/placeholder.svg'} alt="racket" width={80} height={80} className="rounded-lg border-2 border-white shadow-lg object-cover" />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
                        <Package className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-500 dark:text-slate-400">중고 라켓</div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">{initial.racket ? `${racketBrandLabel(initial.racket.brand)} ${initial.racket.model}` : ''}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">상태 {initial.racket?.condition}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">대여 기간 {initial.period}일</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 스트링 교체 옵션 */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-fuchsia-500/10 p-6">
                <CardTitle className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-indigo-600" />
                  스트링 교체 옵션
                </CardTitle>
                <CardDescription className="mt-2">대여 결제(보증금 포함) 후, 교체 신청서를 작성해 스트링 작업을 진행할 수 있어요.</CardDescription>
              </div>

              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="request-stringing" checked={requestStringing} onCheckedChange={(v) => setRequestStringing(!!v)} />
                  <label htmlFor="request-stringing" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    스트링 교체 신청도 함께 진행할게요
                  </label>
                </div>

                <div className="rounded-lg border border-slate-200/60 dark:border-slate-600/60 p-4 bg-slate-50/40 dark:bg-slate-700/30">
                  {selectedString ? (
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">선택된 스트링</div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedString.name}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">{selectedString.price.toLocaleString()}원</div>
                      </div>

                      <Button type="button" variant="outline" onClick={() => router.push(`/rentals/${initial.racketId}/select-string?period=${initial.period}`)}>
                        스트링 변경
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm text-slate-600 dark:text-slate-300">아직 스트링이 선택되지 않았습니다.</div>
                      <Button type="button" onClick={() => router.push(`/rentals/${initial.racketId}/select-string?period=${initial.period}`)}>
                        스트링 선택
                      </Button>
                    </div>
                  )}
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
                <CardDescription className="mt-2">라켓을 받으실 배송지 정보를 입력해주세요.</CardDescription>
              </div>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 bp-sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-blue-600" />
                        수령인 이름
                      </Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="수령인 이름을 입력하세요" className="border-2 focus:border-blue-500 transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-purple-600" />
                        이메일
                      </Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="예: user@example.com" className="border-2 focus:border-blue-500 transition-colors" />
                    </div>
                    <div className="space-y-2 bp-sm:col-span-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-teal-600" />
                        연락처
                      </Label>
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처를 입력하세요 ('-' 제외)" className="border-2 focus:border-teal-500 transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="postal" className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-orange-600" />
                        우편번호
                      </Label>
                      <Button variant="outline" size="sm" onClick={openPostcode} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:from-blue-600 hover:to-purple-600">
                        우편번호 찾기
                      </Button>
                    </div>
                    <Input id="postal" readOnly value={postalCode} placeholder="우편번호" className="bg-slate-100 dark:bg-slate-700 cursor-not-allowed max-w-[200px] border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address-main">기본 주소</Label>
                    <Input id="address-main" readOnly value={address} placeholder="기본 주소" className="bg-slate-100 dark:bg-slate-700 cursor-not-allowed border-2" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address-detail">상세 주소</Label>
                    <Input id="address-detail" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="동/호수 등" className="border-2 focus:border-blue-500 transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="request" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      배송 요청사항
                    </Label>
                    <Textarea id="request" value={deliveryRequest} onChange={(e) => setRequest(e.target.value)} placeholder="배송 시 요청사항을 입력하세요" className="border-2 focus:border-green-500 transition-colors" />
                  </div>
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
                    <Select value={selectedBank} onValueChange={(v) => setSelectedBank(v as any)}>
                      <SelectTrigger id="bank-account" className="border-2 focus:border-emerald-500">
                        <SelectValue placeholder="입금 계좌를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shinhan">
                          신한은행 {bankLabelMap.shinhan.account} (예금주: {bankLabelMap.shinhan.holder})
                        </SelectItem>
                        <SelectItem value="kookmin">
                          국민은행 {bankLabelMap.kookmin.account} (예금주: {bankLabelMap.kookmin.holder})
                        </SelectItem>
                        <SelectItem value="woori">
                          우리은행 {bankLabelMap.woori.account} (예금주: {bankLabelMap.woori.holder})
                        </SelectItem>
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
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 p-6">
                <CardTitle className="flex items-center gap-3">
                  <Undo2 className="h-5 w-5 text-amber-600" />
                  보증금 환급 계좌
                </CardTitle>
                <CardDescription className="mt-2">반납 완료 후 보증금을 환급해 드릴 계좌 정보를 입력해주세요.</CardDescription>
              </div>
              <CardContent className="p-6 space-y-4">
                {/* 환급 은행 */}
                <div className="space-y-2">
                  <Label htmlFor="refund-bank">환급 은행</Label>
                  <Select value={refundBank} onValueChange={(v) => setRefundBank(v as any)}>
                    <SelectTrigger id="refund-bank" className="border-2 focus:border-amber-500">
                      <SelectValue placeholder="환급 받을 은행을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shinhan">신한은행</SelectItem>
                      <SelectItem value="kookmin">국민은행</SelectItem>
                      <SelectItem value="woori">우리은행</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* 계좌번호 */}
                <div className="space-y-2">
                  <Label htmlFor="refund-account">환급 계좌번호</Label>
                  <Input id="refund-account" value={refundAccount} onChange={(e) => setRefundAccount(e.target.value)} placeholder="예: 110-123-456789" className="border-2 focus:border-amber-500" />
                </div>
                {/* 예금주 */}
                <div className="space-y-2">
                  <Label htmlFor="refund-holder">예금주</Label>
                  <Input id="refund-holder" value={refundHolder} onChange={(e) => setRefundHolder(e.target.value)} placeholder="예: 홍길동" className="border-2 focus:border-amber-500" />
                </div>
                {/* 안내 */}
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300">반납 완료 후 보증금이 환급됩니다. 파손/연체 시 약관에 따라 차감될 수 있습니다.</p>
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
          <div className="bp-lg:col-span-1">
            <div className="bp-lg:sticky bp-lg:top-20">
              <Card className="backdrop-blur-sm bg-white/90 dark:bg-slate-800/90 border-0 shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 p-6 text-white">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-white/20 rounded-full">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    결제 요약
                  </CardTitle>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">대여 수수료</span>
                      <span className="font-semibold text-lg">{initial.fee.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">보증금</span>
                      <span className="font-semibold text-lg">{initial.deposit.toLocaleString()}원</span>
                    </div>
                    {requestStringing && initial.selectedString && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400">스트링 금액</span>
                          <span className="font-semibold text-lg">{initial.selectedString.price.toLocaleString()}원</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400">교체 서비스비</span>
                          <span className="font-semibold text-lg">{stringingFee.toLocaleString()}원</span>
                        </div>
                      </>
                    )}

                    <Separator />
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>총 결제 금액</span>
                      <span className="text-blue-600">{total.toLocaleString()}원</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-2">
                      <Shield className="h-4 w-4" />
                      <span className="font-semibold">보증금 안내</span>
                    </div>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">반납 완료 시 보증금이 환불됩니다. 연체 또는 파손 시 차감될 수 있습니다.</p>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                      <Truck className="h-4 w-4" />
                      <span className="font-semibold">대여 안내</span>
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                      <p>• 대여 기간: {initial.period}일</p>
                      <p>• 결제 완료 후 배송이 시작됩니다.</p>
                      <p>• 반납 기한을 꼭 지켜주세요.</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 p-6">
                  <Button
                    onClick={onPay}
                    disabled={loading}
                    className={cn(
                      'w-full h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 hover:from-blue-700 hover:via-purple-700 hover:to-teal-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300',
                      loading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {loading ? '처리 중...' : '결제하기'}
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
