'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import SiteContainer from '@/components/layout/SiteContainer';
import { showErrorToast } from '@/lib/toast';

declare global {
  interface Window {
    daum: any;
  }
}

// 제출 직전 최종 유효성 가드
type Bank = 'shinhan' | 'kookmin' | 'woori';
const ALLOWED_BANKS = new Set<Bank>(['shinhan', 'kookmin', 'woori']);
const POSTAL_RE = /^\d{5}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const onlyDigits = (v: string) => String(v ?? '').replace(/\D/g, '');
const isValidKoreanPhone = (v: string) => {
  const d = onlyDigits(v);
  return d.length === 10 || d.length === 11;
};
const isValidAccountDigits = (v: string) => {
  const d = onlyDigits(v);
  return d.length >= 8 && d.length <= 20;
};

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
  /**
   * 구매 플로우와 동일한 규칙
   * - "스트링 교체 신청 여부"는 체크박스 토글이 아니라 **선택된 스트링(stringId) 유무**로 결정한다.
   * - 이유:
   *   1) 사용자가 실수로 "신청 체크"만 하고 스트링을 안 고르는 케이스를 원천 차단
   *   2) URL/서버/DB 로직이 단순해지고, 구매 UX와 체감이 동일해짐
   */
  const selectedString = initial.selectedString ?? null;
  const requestStringing = Boolean(selectedString?.id);

  // --- 수령 방식(택배/방문수령) ---
  type DeliveryMethod = '택배수령' | '방문수령';
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('택배수령');

  /**
   * 스트링 교체 신청서(/services/apply)에서 기본 수거/방문 방식을 결정하는 값
   * - SELF_SEND: 택배로 보내기(자가 발송)
   * - SHOP_VISIT: 매장 방문(방문 시간 선택 UI가 열리는 쪽)
   */
  const servicePickupMethod = deliveryMethod === '방문수령' ? 'SHOP_VISIT' : 'SELF_SEND';

  // 로그인 여부/포인트 조회를 위한 최소 상태(게스트면 null 유지)
  const [userId, setUserId] = useState<string | null>(null);

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
  const stringPrice = requestStringing ? (selectedString?.price ?? 0) : 0;
  const stringingFee = requestStringing ? (selectedString?.mountingFee ?? 0) : 0;

  // 총 결제 금액 = 대여수수료 + 보증금 + 스트링 + 교체비
  const total = initial.fee + initial.deposit + stringPrice + stringingFee;

  // --- 포인트(보증금 제외) ---
  const POINT_UNIT = 100; // 구매 체크아웃과 동일: 100P 단위
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsDebt, setPointsDebt] = useState(0);
  const pointsAvailable = Math.max(0, pointsBalance - pointsDebt);

  const [useAllPoints, setUseAllPoints] = useState(false);
  const [pointsInput, setPointsInput] = useState('0');
  const [pointsToUse, setPointsToUse] = useState(0);

  // 정책: 보증금(initial.deposit)에는 포인트 적용 금지 → (총액 - 보증금)까지만 가능
  const maxPointsByPolicy = Math.max(0, total - initial.deposit);
  const maxPointsToUse = Math.min(pointsAvailable, maxPointsByPolicy);
  const normalizePoints = (raw: number) => Math.floor(raw / POINT_UNIT) * POINT_UNIT;
  const clampPoints = (raw: number) => {
    const normalized = normalizePoints(raw);
    const maxNormalized = normalizePoints(maxPointsToUse);
    return Math.max(0, Math.min(normalized, maxNormalized));
  };

  // 실제 적용될 포인트(게스트면 0으로 강제)
  const appliedPoints = userId ? clampPoints(pointsToUse) : 0;
  const payableTotal = Math.max(0, total - appliedPoints);

  const [refundBank, setRefundBank] = useState<'shinhan' | 'kookmin' | 'woori' | ''>('');
  const [refundAccount, setRefundAccount] = useState(''); // 계좌번호
  const [refundHolder, setRefundHolder] = useState(''); // 예금주

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);

  const [prefillReady, setPrefillReady] = useState(false);

  const confirmLeaveMessage = '이 페이지를 벗어날 경우 입력한 정보는 초기화됩니다.';
  const fingerprint = useMemo(
    () =>
      JSON.stringify({
        deliveryMethod,
        name,
        phone,
        email,
        postalCode,
        address,
        addressDetail,
        deliveryRequest,
        depositor,
        selectedBank,
        pointsInput,
        pointsToUse,
        useAllPoints,
        refundBank,
        refundAccount,
        refundHolder,
        agreeAll,
        agreeTerms,
        agreePrivacy,
        agreeRefund,
      }),
    [deliveryMethod, name, phone, email, postalCode, address, addressDetail, deliveryRequest, depositor, selectedBank, pointsInput, pointsToUse, useAllPoints, refundBank, refundAccount, refundHolder, agreeAll, agreeTerms, agreePrivacy, agreeRefund],
  );
  const baselineRef = useRef<string | null>(null);
  const isDirty = useMemo(() => baselineRef.current !== null && baselineRef.current !== fingerprint, [fingerprint]);

  useEffect(() => {
    if (!prefillReady) return;
    if (baselineRef.current !== null) return;
    baselineRef.current = fingerprint;
  }, [prefillReady, fingerprint]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const pushIfSafe = (href: string) => {
    if (isDirty && !window.confirm(confirmLeaveMessage)) return;
    router.push(href);
  };

  // 회원 배송 정보 자동 채움
  useEffect(() => {
    let cancelled = false;
    getMyInfo({ quiet: true })
      .then(async ({ user }) => {
        if (!user || cancelled) return;
        setUserId(String((user as any)?._id ?? (user as any)?.id ?? ''));
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
      })
      .finally(() => {
        if (!cancelled) setPrefillReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 포인트 조회(로그인한 경우에만)
  useEffect(() => {
    let cancelled = false;

    // 게스트면 포인트 0으로 정리
    if (!userId) {
      setPointsBalance(0);
      setPointsDebt(0);
      setUseAllPoints(false);
      setPointsToUse(0);
      setPointsInput('0');
      return;
    }

    fetch('/api/points/me', { credentials: 'include' })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || cancelled) return;
        setPointsBalance(Number(data.balance ?? 0));
        setPointsDebt(Number(data.debt ?? 0));
      })
      .catch(() => {
        /* 포인트 조회 실패해도 결제 자체는 진행 가능 */
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 전액 사용 체크 시: 가능한 최대치로 자동 세팅
  useEffect(() => {
    if (!useAllPoints) return;
    const v = clampPoints(maxPointsToUse);
    setPointsToUse(v);
    setPointsInput(String(v));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useAllPoints, maxPointsToUse]);

  // 총액/포인트한도 변화로 기존 입력이 한도를 넘으면 자동 clamp
  useEffect(() => {
    const v = clampPoints(pointsToUse);
    if (v !== pointsToUse) {
      setPointsToUse(v);
      setPointsInput(String(v));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxPointsToUse]);

  // 우편번호 검색기
  const openPostcode = () => {
    if (!window?.daum?.Postcode) {
      showErrorToast('주소 검색기를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
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
    // 중복 클릭/중복 요청 방지(버튼 disabled 우회 대비)
    if (loading) return;
    if (requestStringing && !selectedString?.id) {
      showErrorToast('스트링 교체를 함께 진행하려면 먼저 스트링을 선택해주세요.');
      pushIfSafe(`/rentals/${initial.racketId}/select-string?period=${initial.period}`);
      return;
    }

    try {
      // 제출 직전 최종 검증 + 정규화
      const nameTrim = name.trim();
      const emailTrim = email.trim().toLowerCase();
      const phoneDigits = onlyDigits(phone);
      const postalDigits = onlyDigits(postalCode).trim();
      const addressTrim = address.trim();
      const addressDetailTrim = addressDetail.trim();
      const deliveryRequestTrim = deliveryRequest.trim();
      const depositorTrim = depositor.trim();
      const selectedBankValue = selectedBank as Bank | '';
      const refundBankValue = refundBank as Bank | '';
      const refundAccountDigits = onlyDigits(refundAccount);
      const refundHolderTrim = refundHolder.trim();

      // 필수 입력
      if (!nameTrim || !phoneDigits || !postalDigits || !addressTrim) {
        showErrorToast('필수 정보를 모두 입력해주세요.');
        return;
      }
      if (nameTrim.length < 2) {
        showErrorToast('수령인 이름은 2자 이상 입력해주세요.');
        return;
      }
      if (!isValidKoreanPhone(phoneDigits)) {
        showErrorToast('연락처는 숫자 10~11자리로 입력해주세요.');
        return;
      }
      if (!POSTAL_RE.test(postalDigits)) {
        showErrorToast('우편번호(5자리)를 확인해주세요.');
        return;
      }
      // 이메일은 선택값이지만, 입력했다면 형식은 보장
      if (emailTrim && !EMAIL_RE.test(emailTrim)) {
        showErrorToast('이메일 형식을 확인해주세요.');
        return;
      }

      // 결제(무통장) 정보
      if (!selectedBankValue || !depositorTrim) {
        showErrorToast('입금 은행과 입금자명을 입력해주세요.');
        return;
      }
      if (!ALLOWED_BANKS.has(selectedBankValue)) {
        showErrorToast('입금 은행 값이 올바르지 않습니다. 다시 선택해주세요.');
        return;
      }
      if (depositorTrim.length < 2) {
        showErrorToast('입금자명은 2자 이상 입력해주세요.');
        return;
      }

      // 환급 계좌(보증금) 정보
      if (!refundBankValue || !refundAccountDigits || !refundHolderTrim) {
        showErrorToast('보증금 환급 계좌(은행/계좌번호/예금주)를 모두 입력해주세요.');
        return;
      }
      if (!ALLOWED_BANKS.has(refundBankValue)) {
        showErrorToast('환급 은행 값이 올바르지 않습니다. 다시 선택해주세요.');
        return;
      }
      if (!isValidAccountDigits(refundAccountDigits)) {
        showErrorToast('환급 계좌번호는 숫자만 8~20자리로 입력해주세요.');
        return;
      }
      if (refundHolderTrim.length < 2) {
        showErrorToast('환급 예금주는 2자 이상 입력해주세요.');
        return;
      }

      // 약관 동의
      if (!agreeTerms || !agreePrivacy || !agreeRefund) {
        showErrorToast('필수 약관에 모두 동의해주세요.');
        return;
      }

      setLoading(true);

      const res = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          racketId: initial.racketId,
          days: initial.period,

          // 포인트(보증금 제외)
          pointsToUse: appliedPoints,
          servicePickupMethod,

          payment: {
            method: 'bank_transfer',
            bank: selectedBankValue,
            depositor: depositorTrim,
          },
          shipping: {
            name: nameTrim,
            phone: phoneDigits,
            postalCode: postalDigits,
            address: addressTrim,
            addressDetail: addressDetailTrim,
            deliveryRequest: deliveryRequestTrim,
            shippingMethod: deliveryMethod === '방문수령' ? 'pickup' : 'delivery',
          },
          refundAccount: {
            bank: refundBankValue,
            account: refundAccountDigits,
            holder: refundHolderTrim,
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
        showErrorToast(json?.message ?? '결제 처리에 실패했습니다.');
        return;
      }

      // 성공 페이지에서 안내를 위해(기존 로직 유지)
      try {
        sessionStorage.setItem('rentals-last-bank', String(selectedBankValue));
        sessionStorage.setItem('rentals-last-depositor', depositorTrim);
        sessionStorage.setItem('rentals-refund-bank', String(refundBankValue));
        sessionStorage.setItem('rentals-refund-account', refundAccountDigits);
        sessionStorage.setItem('rentals-refund-holder', refundHolderTrim);
        sessionStorage.setItem('rentals-success', '1'); // 뒤로가기 방지
      } catch {}

      const rentalId = String(json?.id ?? '');

      /**
       * 구매 UX와 동일한 흐름
       * 1) 결제(대여 신청) 완료 → 항상 대여 성공 페이지로 이동
       * 2) 스트링이 선택되어 있었다면(success 페이지에서) 신청서 작성(/services/apply?rentalId=...)로 자연스럽게 이어주 ...
       */
      const qs = new URLSearchParams();
      qs.set('id', rentalId);
      if (requestStringing) qs.set('withService', '1');
      router.push(`/rentals/success?${qs.toString()}`);
    } catch (e) {
      showErrorToast('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 text-white dark:from-blue-700 dark:via-purple-700 dark:to-teal-700">
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40"></div>
        <SiteContainer variant="wide" className="relative py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 dark:bg-white/30 backdrop-blur-sm rounded-full">
              <CreditCard className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">라켓 대여 결제</h1>
              <p className="text-blue-100">배송 정보를 입력하고 대여를 완료하세요</p>
            </div>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-8">
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

            {/* 라켓 수령 방식 및 스트링 교체 옵션 */}
            <Card className="bg-white dark:bg-slate-900 bp-lg:backdrop-blur-sm bp-lg:bg-white/80 bp-lg:dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800/60 bp-lg:border-0 shadow-sm bp-lg:shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-red-500/10 p-6">
                <CardTitle className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-purple-600" />
                  라켓 수령 방식
                </CardTitle>
                <CardDescription className="mt-2">라켓을 어떻게 수령하실지 선택해주세요.</CardDescription>
              </div>

              <CardContent className="p-6 space-y-4">
                <RadioGroup value={deliveryMethod} onValueChange={(value) => setDeliveryMethod(value as any)} className="space-y-3">
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <RadioGroupItem value="택배수령" id="rentals-delivery-courier" />
                    <Label htmlFor="rentals-delivery-courier" className="flex-1 cursor-pointer font-medium">
                      택배 수령 (자택 또는 지정 장소로 배송)
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">결제 완료 후 택배 발송으로 진행됩니다.</div>
                    </Label>
                    <Truck className="h-5 w-5 text-blue-600" />
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <RadioGroupItem value="방문수령" id="rentals-delivery-visit" />
                    <Label htmlFor="rentals-delivery-visit" className="flex-1 cursor-pointer font-medium">
                      오프라인 매장 방문 (도깨비 테니스 샵에서 직접 수령)
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">스트링 교체 신청 시 신청서에서 "방문 시간" 선택 흐름으로 이어집니다.</div>
                    </Label>
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                </RadioGroup>

                {/* 구매 체크아웃과 동일하게: 수령 방식 카드 안에서 "스트링 교체 옵션"을 같이 묶어 표시 */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-orange-700 dark:text-orange-400">스트링 교체 서비스 (선택)</p>
                      <p className="text-sm text-orange-600 dark:text-orange-400">
                        {deliveryMethod === '방문수령' ? '방문 수령을 선택하면 매장 방문 접수로 교체가 진행됩니다. (신청서에서 방문 시간 선택)' : '택배 수령을 선택하면 자가 발송(편의점/우체국 등) 방식으로 교체가 진행됩니다.'}
                      </p>
                    </div>

                    <Button type="button" variant={selectedString ? 'outline' : 'default'} onClick={() => pushIfSafe(`/rentals/${initial.racketId}/select-string?period=${initial.period}`)}>
                      {selectedString ? '스트링 변경' : '스트링 선택'}
                    </Button>
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-200/60 dark:border-slate-600/60 p-4 bg-white/60 dark:bg-slate-800/40">
                    {selectedString ? (
                      <div className="space-y-1">
                        <div className="text-xs text-slate-500 dark:text-slate-400">선택된 스트링</div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedString.name}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          {selectedString.price.toLocaleString()}원 + 교체 {selectedString.mountingFee.toLocaleString()}원
                        </div>

                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">* 대여 결제 완료 후, 스트링 교체 신청서(/services/apply) 초안이 자동 생성되어 이어집니다.</div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        현재는 <b>교체 서비스 미선택</b> 상태입니다. 필요하면 "스트링 선택"을 눌러 교체 서비스를 함께 진행할 수 있습니다.
                      </div>
                    )}
                  </div>
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
                    {requestStringing && selectedString && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400">스트링 금액</span>
                          <span className="font-semibold text-lg">{selectedString.price.toLocaleString()}원</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400">교체 서비스비</span>
                          <span className="font-semibold text-lg">{stringingFee.toLocaleString()}원</span>
                        </div>
                      </>
                    )}

                    {/* 포인트 차감 표시 */}
                    {appliedPoints > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">포인트 사용</span>
                        <span className="font-semibold text-lg text-rose-600">- {appliedPoints.toLocaleString()}P</span>
                      </div>
                    )}

                    {/* 포인트 입력 UI (보증금 제외) */}
                    <div className="rounded-lg border border-slate-200/60 dark:border-slate-600/60 p-4 bg-slate-50/40 dark:bg-slate-700/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">포인트 사용</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">사용 가능 {pointsAvailable.toLocaleString()}P</span>
                      </div>

                      {!userId ? (
                        <div className="text-sm text-slate-500 dark:text-slate-400">로그인 시 포인트 사용이 가능합니다.</div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="use-all-points"
                              checked={useAllPoints}
                              onCheckedChange={(v) => {
                                const checked = !!v;
                                setUseAllPoints(checked);
                                if (!checked) {
                                  setPointsToUse(0);
                                  setPointsInput('0');
                                }
                              }}
                            />
                            <label htmlFor="use-all-points" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                              전액 사용 (보증금 제외)
                            </label>
                          </div>

                          <Input
                            value={pointsInput}
                            disabled={useAllPoints || maxPointsToUse <= 0}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^\d]/g, '');
                              setPointsInput(raw);
                              setUseAllPoints(false);
                              setPointsToUse(Number(raw || 0));
                            }}
                            onBlur={() => {
                              const v = clampPoints(Number(pointsInput || 0));
                              setPointsToUse(v);
                              setPointsInput(String(v));
                            }}
                            placeholder="0"
                            className="border-2"
                          />

                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            보증금({initial.deposit.toLocaleString()}원)에는 포인트가 적용되지 않습니다. (최대 {normalizePoints(maxPointsToUse).toLocaleString()}P)
                          </div>
                        </>
                      )}
                    </div>

                    <Separator />
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>총 결제 금액</span>
                      <span className="text-blue-600">{payableTotal.toLocaleString()}원</span>
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
                      loading && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {loading ? '처리 중...' : '결제하기'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
