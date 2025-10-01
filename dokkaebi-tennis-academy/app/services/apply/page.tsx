'use client';

import type React from 'react';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useSearchParams } from 'next/navigation';
import type { Order } from '@/lib/types/order';
import TimeSlotSelector from '@/app/services/_components/TimeSlotSelector';
import { bankLabelMap } from '@/lib/constants';
import StringCheckboxes from '@/app/services/_components/StringCheckboxes';
import { User, RatIcon as Racquet, CreditCard, MapPin, Clock, CheckCircle, ArrowRight, Shield, Award, Zap, DollarSign, SlidersHorizontal, Settings2, Wrench, PanelTopClose, FormInput, ClipboardList, Ticket, Box, Truck, Store } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import PriceSummaryCard from '@/app/services/_components/PriceSummaryCard';

declare global {
  interface Window {
    daum: any;
  }
}

export default function StringServiceApplyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isUserLoading, setIsUserLoading] = useState(false);

  // ===== 유틸 =====
  const normalizePhone = (s: string) => (s || '').replace(/[^0-9]/g, '');
  const isValidPhone = (s: string) => /^010\d{8}$/.test(normalizePhone(s));
  const stepsRef = useRef<HTMLDivElement | null>(null);
  const [stickyTop, setStickyTop] = useState<number>(24);

  useEffect(() => {
    const calc = () => {
      const h = stepsRef.current?.offsetHeight ?? 0;
      // Progress Steps 높이 + 여백(24px)
      setStickyTop(h + 24);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  // 초안 보장: 주문 기반 진입 시, 진행 중 신청서(draft/received)를 "항상" 1개로 맞춘다.
  // - 이미 있으면 재사용(reused=true), 없으면 자동 생성
  // - UI에는 영향 없음(프리필/흐름 그대로), 서버/DB 일관성만 강화
  useEffect(() => {
    if (!orderId) return;

    (async () => {
      try {
        await fetch('/api/applications/stringing/drafts', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        // 응답 데이터(applicationId, reused 등)는 현재 화면 흐름에 직접 필요 없으므로
        // 별도 상태 저장 없이 "초안 존재"만 보장. (멱등: 여러 번 호출돼도 중복 생성 없음)
      } catch (err) {
        // 초안 생성 실패가 화면 진행을 막지는 않도록 '조용히' 로깅만
        console.error('[draft bootstrap] failed:', err);
      }
    })();
  }, [orderId]);

  // ===== 스텝별 검증 (silent=true면 토스트 없이 true/false만 반환) =====
  const validateStep = (step: number, silent = false): boolean => {
    const toast = (msg: string) => {
      if (!silent) showErrorToast(msg);
    };
    const usingPackage = !!(packagePreview?.has && !formData.packageOptOut);

    if (step === 1) {
      if (!formData.name.trim()) return toast('신청인 이름을 입력해주세요.'), false;
      if (!formData.email.trim()) return toast('이메일을 입력해주세요.'), false;
      if (!formData.phone.trim()) return toast('연락처를 입력해주세요.'), false;
      if (!isValidPhone(formData.phone)) return toast('연락처는 010으로 시작하는 11자리입니다.'), false;

      if (!formData.shippingPostcode.trim()) return toast('우편번호를 입력해주세요.'), false;
      if (!formData.shippingAddress.trim()) return toast('주소를 입력해주세요.'), false;

      if (!formData.collectionMethod) return toast('수거 방식을 선택해주세요.'), false;
      if (formData.collectionMethod === 'courier_pickup') {
        if (!formData.pickupDate) return toast('수거 희망일을 입력해주세요.'), false;
        if (!formData.pickupTime) return toast('수거 시간대를 입력해주세요.'), false;
      }
      return true;
    }

    if (step === 2) {
      if (!formData.racketType.trim()) return toast('라켓 종류를 입력해주세요.'), false;
      if (formData.stringTypes.length === 0) return toast('스트링 종류를 한 개 이상 선택해주세요.'), false;
      if (formData.stringTypes.includes('custom') && !formData.customStringType.trim()) return toast('직접 입력한 스트링명을 적어주세요.'), false;

      if (!formData.preferredDate) return toast('장착 희망일을 선택해주세요.'), false;
      if (!formData.preferredTime) return toast('희망 시간대를 선택해주세요.'), false;
      return true;
    }

    if (step === 3) {
      if (!usingPackage) {
        if (!formData.shippingBank) return toast('은행을 선택해주세요.'), false;
        if (!formData.shippingDepositor.trim()) return toast('입금자명을 입력해주세요.'), false;
      }
      return true;
    }

    // step 4는 자유 입력
    return true;
  };

  // “다음” 버튼 disabled 계산용
  const isStepValid = (step: number) => validateStep(step, true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    racketType: '',
    stringTypes: [] as string[],
    customStringType: '',
    preferredDate: '',
    preferredTime: '',
    requirements: '',
    shippingName: '',
    shippingPhone: '',
    shippingEmail: '',
    shippingAddress: '',
    shippingAddressDetail: '',
    shippingPostcode: '',
    shippingDepositor: '',
    shippingRequest: '',
    shippingBank: '',
    packageOptOut: false,
    collectionMethod: 'self_ship', // 'self_ship' | 'courier_pickup' | 'visit'
    pickupDate: '',
    pickupTime: '',
    pickupNote: '',
  });

  // 예약 슬롯 상태
  const [disabledTimes, setDisabledTimes] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const slotsCache = useRef<Map<string, string[]>>(new Map());

  // 추가 상태: 캐시 히트 여부 (로딩 중 버튼 비활성화 여부 판단에 사용)
  const [hasCacheForDate, setHasCacheForDate] = useState(false);

  useEffect(() => {
    const date = formData.preferredDate;
    if (!date) {
      setDisabledTimes([]);
      setSlotsError(null);
      setHasCacheForDate(false);
      return;
    }

    // 캐시 확인: 있으면 즉시 사용(플리커 방지)
    const cached = slotsCache.current.get(date);
    const cacheHit = Array.isArray(cached);
    setHasCacheForDate(!!cacheHit);
    if (cacheHit) {
      setDisabledTimes(cached!);
      setSlotsError(null);
      // 캐시가 있으면 버튼 비활성화 없이 조용히 갱신만 진행
    }

    const controller = new AbortController();

    // 짧은 로딩은 숨기는 디바운스(120ms)
    let loadingTimer: ReturnType<typeof setTimeout> | null = null;
    if (!cacheHit) {
      loadingTimer = setTimeout(() => setSlotsLoading(true), 120);
    }

    (async () => {
      try {
        setSlotsError(null);

        const res = await fetch(`/api/applications/stringing/reserved?date=${encodeURIComponent(date)}&cap=1`, { method: 'GET', signal: controller.signal });

        if (!res.ok) {
          if (!cacheHit) setDisabledTimes([]);
          setSlotsError('예약 현황을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
          return;
        }

        const data = await res.json();
        const times = Array.isArray(data?.reservedTimes) ? data.reservedTimes : [];

        // 캐시에 저장 + 상태 갱신
        slotsCache.current.set(date, times);
        setDisabledTimes(times);

        // 사용자가 로딩 중에 선택해둔 시간이 새로 "비활성"이 되면 해제
        setFormData((prev) => (prev.preferredTime && times.includes(prev.preferredTime) ? { ...prev, preferredTime: '' } : prev));
      } catch {
        if (!cacheHit) {
          setDisabledTimes([]);
          setSlotsError('예약 현황을 불러오지 못했습니다. 네트워크 상태를 확인해주세요.');
        }
      } finally {
        if (loadingTimer) clearTimeout(loadingTimer);
        setSlotsLoading(false);
      }
    })();

    return () => {
      if (loadingTimer) clearTimeout(loadingTimer);
      controller.abort();
    };
  }, [formData.preferredDate]);

  // 사용자가 이미 비활성화된 시간을 선택해 둔 경우 자동 해제
  useEffect(() => {
    if (formData.preferredTime && disabledTimes.includes(formData.preferredTime)) {
      setFormData((prev) => ({ ...prev, preferredTime: '' }));
    }
  }, [disabledTimes]);

  // 날짜 바꾸면 시간 자동 초기화
  useEffect(() => {
    if (!formData.preferredDate) return;
    // 날짜 변경 시 선택된 시간 초기화
    setFormData((prev) => (prev.preferredTime ? { ...prev, preferredTime: '' } : prev));
    // 캐시에 같은 날짜가 있어도 초기화는 고정 동작
  }, [formData.preferredDate]);

  // 패키지 미리보기 상태 + 패스조회
  const [packagePreview, setPackagePreview] = useState<null | {
    has: boolean;
    remaining?: number;
    expiresAt?: string;
    passId?: string;
    packageSize?: number;
  }>(null);

  // 패키지 사용 여부(자동 적용 + 미옵트아웃)
  const usingPackage = !!(packagePreview?.has && !formData.packageOptOut);

  // 로그인 여부와 관계 없이 시도 (401이면 무시)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/passes/me', { credentials: 'include' });
        if (!res.ok) return; // 비로그인 등
        const data = await res.json();
        const items = (data?.items ?? []).filter((p: any) => p.status === 'active' && p.remainingCount > 0 && new Date(p.expiresAt).getTime() >= Date.now());
        items.sort((a: any, b: any) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
        if (items.length > 0) {
          const p = items[0];
          setPackagePreview({
            has: true,
            remaining: p.remainingCount,
            expiresAt: p.expiresAt,
            passId: p.id,
            packageSize: p.packageSize,
          });
        } else {
          setPackagePreview({ has: false });
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // 가격 상태 추가 및 표시
  const [price, setPrice] = useState<number>(0);

  // ===== 가격 표시 계산(표시 전용) =====
  const PICKUP_FEE = 3000; // 기사 방문 수거 시 후정산 안내용

  const priceView = useMemo(() => {
    // 패키지 적용 여부(프로젝트 정책에 맞게 보던 값 유지)
    const usingPackage = !!(packagePreview?.has && !formData.packageOptOut);

    // 교체비(표시용): 커스텀/보유 스트링(미포함) 15,000, 상품 선택(포함) 35,000
    // 서버의 lib/stringing-prices.ts와 동일하게 맞춤
    let base = 0;
    if (formData.stringTypes.includes('custom')) base = 15000;
    else if (formData.stringTypes.length > 0) base = 35000;

    // 수거비(표시용)
    const pickupFee = formData.collectionMethod === 'courier_pickup' ? PICKUP_FEE : 0;

    // 총액(표시용): 패키지 적용 시 교체비 0 (수거비는 후정산 안내로 표시만)
    const total = usingPackage ? 0 : base + pickupFee;

    return { usingPackage, base, pickupFee, total };
  }, [formData.stringTypes, formData.collectionMethod, formData.packageOptOut, packagePreview]);

  // 통화 포메터
  const won = (n: number) => n.toLocaleString('ko-KR') + '원';

  // 체크박스 변화 콜백
  const handleStringTypesChange = (ids: string[]) => setFormData((prev) => ({ ...prev, stringTypes: ids }));
  const handleCustomInputChange = (val: string) => setFormData((prev) => ({ ...prev, customStringType: val }));

  useEffect(() => {
    if (!order) return;
    let total = 0;
    formData.stringTypes.forEach((id) => {
      if (id === 'custom') {
        // custom 선택 개수만큼 기본 수수료 곱하기 (보통 1개만 사용)
        total += 15000;
      } else {
        const item = order.items.find((it) => it.id === id);
        total += item?.mountingFee ?? 0;
      }
    });
    setPrice(total);
  }, [formData.stringTypes, order]);

  // 주문서 없는 단독 신청일 경우만 실행
  useEffect(() => {
    if (orderId) return;

    const checkUser = async () => {
      setIsUserLoading(true);
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        const user = await res.json();

        if (user?.email) {
          setIsMember(true);
          setFormData((prev) => ({
            ...prev,
            name: user.name ?? '',
            email: user.email ?? '',
            phone: user.phone ?? '',
            shippingName: user.name ?? '',
            shippingEmail: user.email ?? '',
            shippingPhone: user.phone ?? '',
            shippingAddress: user.address ?? '',
            shippingAddressDetail: user.addressDetail ?? '',
            shippingPostcode: user.postalCode ?? '',
          }));
        } else {
          setIsMember(false);
        }
      } catch {
        setIsMember(false);
      } finally {
        setIsUserLoading(false);
      }
    };

    checkUser();
  }, [orderId]);

  // 주문 데이터 신청자 정보 불러오기
  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      setIsUserLoading(true);
      try {
        const orderRes = await fetch(`/api/orders/${orderId}`, { credentials: 'include' });
        const orderData = await orderRes.json();
        setOrder(orderData);

        // accessToken 꺼내기
        const userRes = await fetch('/api/users/me', { credentials: 'include' });
        const userData = await userRes.json();

        setFormData((prev) => ({
          ...prev,
          name: orderData.shippingInfo?.name ?? '',
          phone: orderData.shippingInfo?.phone ?? '',
          email: userData?.email ?? orderData?.guestInfo?.email ?? '',
          shippingName: orderData.shippingInfo?.name ?? '',
          shippingPhone: orderData.shippingInfo?.phone ?? '',
          shippingEmail: userData?.email ?? orderData?.guestInfo?.email ?? '',
          shippingAddress: orderData.shippingInfo?.address ?? '',
          shippingAddressDetail: orderData.shippingInfo?.addressDetail ?? '',
          shippingPostcode: orderData.shippingInfo?.postalCode ?? '',
          shippingDepositor: orderData.shippingInfo?.depositor ?? '',
          shippingBank: orderData.paymentInfo?.bank ?? '',
          shippingRequest: orderData.shippingInfo?.deliveryRequest ?? '',
        }));
      } catch (err) {
        console.error('정보 fetch 실패:', err);
      } finally {
        setIsUserLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOpenPostcode = () => {
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        setFormData((prev) => ({
          ...prev,
          shippingAddress: data.roadAddress,
          shippingPostcode: data.zonecode,
        }));
      },
    }).open();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 마지막 단계(4단계)가 아니면 제출하지 않음
    if (currentStep !== steps.length) return;

    // 1~3 스텝 전부 재검증: 실패 스텝으로 이동 + 토스트
    for (let s = 1; s <= 3; s++) {
      if (!validateStep(s, false)) {
        setCurrentStep(s);
        return;
      }
    }

    // 연락처 정제(전송용)
    const cleaned = formData.phone.replace(/[^0-9]/g, '');

    setIsSubmitting(true);
    // 이하 payload 생성/POST 로직은 그대로 유지

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: cleaned,
      racketType: formData.racketType,
      stringTypes: formData.stringTypes,
      customStringName: formData.stringTypes.includes('custom') ? formData.customStringType : null,
      preferredDate: formData.preferredDate,
      preferredTime: formData.preferredTime,
      requirements: formData.requirements,
      packageOptOut: !!formData.packageOptOut,
      orderId,
      shippingInfo: {
        name: formData.shippingName,
        phone: formData.shippingPhone,
        email: formData.shippingEmail,
        address: formData.shippingAddress,
        addressDetail: formData.shippingAddressDetail,
        postalCode: formData.shippingPostcode,
        depositor: usingPackage ? undefined : formData.shippingDepositor,
        bank: usingPackage ? undefined : formData.shippingBank,
        deliveryRequest: formData.shippingRequest,
        collectionMethod: formData.collectionMethod, // 'self_ship' | 'courier_pickup' | 'visit'
        pickup:
          formData.collectionMethod === 'courier_pickup'
            ? {
                date: formData.pickupDate,
                time: formData.pickupTime,
                note: formData.pickupNote || undefined,
              }
            : undefined,
      },
    };

    try {
      const res = await fetch('/api/applications/stringing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || '신청 실패');
      }

      const result = await res.json();

      showSuccessToast('신청이 완료되었습니다!');
      router.push(`/services/success?applicationId=${result.applicationId}`);
    } catch (error) {
      showErrorToast('신청서 제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep, false)) return; // 실패 시 토스트 + 스텝 유지
    setCurrentStep((s) => Math.min(4, s + 1));
  };

  const steps = [
    { id: 1, title: '신청자 정보', icon: User, description: '기본 정보를 입력해주세요' },
    { id: 2, title: '장착 정보', icon: ClipboardList, description: '라켓과 스트링 정보를 선택해주세요' },
    { id: 3, title: '결제 정보', icon: CreditCard, description: '결제 방법을 선택해주세요' },
    { id: 4, title: '추가 요청', icon: CheckCircle, description: '추가 요청사항을 입력해주세요' },
  ];

  const getCurrentStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="relative space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 mb-4">
                <User className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">신청자 정보</h2>
              <p className="text-muted-foreground">정확한 정보를 입력해주세요</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  신청인 이름 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  readOnly={!!(orderId || isMember)}
                  className={`transition-all duration-200 ${orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                  placeholder="이름을 입력해주세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  이메일 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  readOnly={!!(orderId || isMember)}
                  className={`transition-all duration-200 ${orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                  placeholder="이메일을 입력해주세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  연락처 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  readOnly={!!(orderId || isMember)}
                  className={`transition-all duration-200 ${orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                  placeholder="01012345678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingPostcode" className="text-sm font-medium">
                  우편번호 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="shippingPostcode"
                  name="shippingPostcode"
                  value={formData.shippingPostcode}
                  onChange={handleInputChange}
                  readOnly={!!(orderId || isMember)}
                  className={`transition-all duration-200 ${orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                  placeholder="우편번호"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shippingAddress" className="text-sm font-medium">
                  주소 <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="shippingAddress"
                    name="shippingAddress"
                    value={formData.shippingAddress}
                    onChange={handleInputChange}
                    readOnly={!!(orderId || isMember)}
                    className={`flex-1 transition-all duration-200 ${orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                    placeholder="주소를 입력해주세요"
                  />
                  {!orderId && !isMember && (
                    <Button type="button" variant="outline" onClick={handleOpenPostcode} className="whitespace-nowrap hover:bg-blue-50 hover:border-blue-300 transition-colors duration-200 bg-transparent">
                      <MapPin className="h-4 w-4 mr-2" />
                      주소 검색
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingAddressDetail" className="text-sm font-medium">
                  상세 주소
                </Label>
                <Input
                  id="shippingAddressDetail"
                  name="shippingAddressDetail"
                  value={formData.shippingAddressDetail}
                  onChange={handleInputChange}
                  readOnly={!!(orderId || isMember)}
                  className={`transition-all duration-200 ${orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                  placeholder="상세 주소를 입력해주세요"
                />
              </div>
              {/* === 수거 방식 선택 (카드 버튼형) === */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  수거 방식 <span className="text-red-500">*</span>
                </Label>

                <RadioGroup value={formData.collectionMethod} onValueChange={(v) => setFormData((prev) => ({ ...prev, collectionMethod: v as any }))} className="grid gap-3 md:grid-cols-3">
                  {/* 자가 발송 */}
                  <div>
                    <RadioGroupItem id="cm-self" value="self_ship" className="peer sr-only" />
                    <Label
                      htmlFor="cm-self"
                      className="block cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:bg-slate-50 transition
                   peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-blue-200"
                    >
                      <div className="flex items-center gap-2">
                        <Box className="h-4 w-4" />
                        <span className="font-medium">자가 발송</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">편의점/우체국 등</p>
                    </Label>
                  </div>

                  {/* 기사 방문 수거 */}
                  <div>
                    <RadioGroupItem id="cm-pickup" value="courier_pickup" className="peer sr-only" />
                    <Label
                      htmlFor="cm-pickup"
                      className="block cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:bg-slate-50 transition
                   peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-blue-200"
                    >
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span className="font-medium">택배 기사 방문 수거</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">선택 시 +3,000원 (후정산)</p>
                    </Label>
                  </div>

                  {/* 매장 방문 접수 */}
                  <div>
                    <RadioGroupItem id="cm-visit" value="visit" className="peer sr-only" />
                    <Label
                      htmlFor="cm-visit"
                      className="block cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:bg-slate-50 transition
                   peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-blue-200"
                    >
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        <span className="font-medium">매장 방문 접수</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">방문 가능 시간대만 선택</p>
                    </Label>
                  </div>
                </RadioGroup>

                {/* 기사 방문 수거 선택 시 추가 입력 */}
                {formData.collectionMethod === 'courier_pickup' && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label htmlFor="pickupDate" className="text-sm font-medium">
                        수거 희망일
                      </Label>
                      <Input id="pickupDate" name="pickupDate" type="date" value={formData.pickupDate} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="pickupTime" className="text-sm font-medium">
                        수거 시간대
                      </Label>
                      <Input id="pickupTime" name="pickupTime" placeholder="예: 10:00~13:00" value={formData.pickupTime} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="pickupNote" className="text-sm font-medium">
                        기사 메모(선택)
                      </Label>
                      <Input id="pickupNote" name="pickupNote" placeholder="공동현관 비번/경비실 맡김 등" value={formData.pickupNote} onChange={handleInputChange} />
                    </div>
                  </div>
                )}

                {formData.collectionMethod === 'courier_pickup' && <p className="text-xs text-muted-foreground">※ 기사 방문 수거 선택 시 수거비 +3,000원이 발생합니다(후정산 / 결제 합산은 관리자 확정 시 반영).</p>}
              </div>
            </div>
            {/* 로딩 오버레이 */}
            {isUserLoading && (
              <div className="absolute inset-0 z-10 rounded-2xl bg-white/45 dark:bg-slate-900/40 backdrop-blur-[2px] ring-1 ring-inset ring-slate-200/60 grid place-content-center">
                <div className="flex items-center gap-3 text-slate-700">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                  <span className="text-sm">회원 정보 불러오는 중…</span>
                </div>
              </div>
            )}
            {(orderId || isMember) && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800 mb-1">📢 안내사항</p>
                    <p className="text-orange-700 leading-relaxed">
                      신청자 정보는 <span className="font-semibold">주문 당시 정보</span>를 기준으로 작성됩니다. 회원정보를 수정하셨더라도 <span className="font-semibold">신청자 정보는 변경되지 않습니다.</span>
                      <br />
                      변경이 필요한 경우, <span className="text-orange-600 font-semibold">추가 요청사항</span>에 기재해주세요.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-blue-600 mb-4">
                <ClipboardList className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">장착 정보</h2>
              <p className="text-muted-foreground">라켓과 스트링 정보를 선택해주세요</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="racketType" className="text-sm font-medium">
                  라켓 종류 <span className="text-red-500">*</span>
                </Label>
                <Input id="racketType" name="racketType" value={formData.racketType} onChange={handleInputChange} placeholder="예: 윌슨 프로 스태프 97" className="focus:ring-2 focus:ring-green-500 transition-all duration-200" />
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">
                    스트링 종류 <span className="text-red-500">*</span>
                  </Label>
                  <div className="mt-2 space-y-2">
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Zap className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-red-700">
                          <p className="font-medium mb-1">⚠️ 중요 안내</p>
                          <p>• 스트링을 구매하시고 난 후 신청서를 작성하셔야 구매한 스트링 종류가 나옵니다.</p>
                          <p>• 고객님께서 보유하고 계신 스트링으로 단일 신청서를 작성하시려는 경우 "직접 입력하기" 를 클릭하여 신청해주세요.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <StringCheckboxes
                  items={(order?.items ?? [])
                    .filter((i) => i.mountingFee !== undefined)
                    .map((i) => ({
                      id: i.id,
                      name: i.name,
                      mountingFee: i.mountingFee!,
                    }))}
                  stringTypes={formData.stringTypes}
                  customInput={formData.customStringType}
                  onChange={handleStringTypesChange}
                  onCustomInputChange={handleCustomInputChange}
                />

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className="text-sm">
                      {formData.stringTypes.includes('custom') ? (
                        <div className="text-blue-700">
                          <p className="font-medium">💡 가격은 접수 후 안내됩니다.</p>
                          <p className="text-xs text-blue-600 mt-1">기본 장착 금액: 15,000원</p>
                        </div>
                      ) : (
                        <p className="font-medium text-blue-700">총 장착 금액: {price.toLocaleString()}원</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="preferredDate" className="text-sm font-medium">
                    장착 희망일 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="preferredDate"
                    name="preferredDate"
                    type="date"
                    value={formData.preferredDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="focus:ring-2 focus:ring-green-500 transition-all duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    희망 시간대<span className="text-red-500">*</span>
                  </Label>
                  <TimeSlotSelector
                    selected={formData.preferredTime}
                    selectedDate={formData.preferredDate}
                    onSelect={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        preferredTime: prev.preferredTime === value ? '' : value,
                      }))
                    }
                    disabledTimes={disabledTimes}
                    isLoading={slotsLoading && !hasCacheForDate}
                    errorMessage={slotsError}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 mb-4">
                <CreditCard className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">결제 정보</h2>
              <p className="text-muted-foreground">결제 방법을 선택해주세요</p>
            </div>

            {/* 패키지 자동 적용 안내/옵트아웃 */}
            {packagePreview?.has ? (
              <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-600 text-white grid place-content-center shadow-sm">
                    <Ticket className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">패키지 자동 적용</h3>
                      <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">활성</Badge>
                    </div>

                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                      교체비는 <span className="font-semibold text-emerald-700 dark:text-emerald-300">0원</span>으로 처리됩니다.
                    </p>

                    {/* 잔여/만료 pill */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-emerald-300/60 text-emerald-700 dark:text-emerald-300">
                        잔여 {packagePreview.remaining}회
                      </Badge>
                      <Badge variant="outline" className="border-emerald-300/60 text-emerald-700 dark:text-emerald-300">
                        만료일 {packagePreview.expiresAt ? new Date(packagePreview.expiresAt).toLocaleDateString('ko-KR') : '-'}
                      </Badge>
                    </div>

                    {/* 잔여 게이지 */}
                    {(() => {
                      const total = packagePreview?.packageSize ?? 0;
                      const remaining = packagePreview?.remaining ?? 0;
                      const used = total ? Math.max(0, total - remaining) : 0;
                      const remainPct = total ? Math.round((remaining / total) * 100) : 0;

                      return (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>
                              총 {total}회 중 <span className="font-medium text-slate-700">{used}</span>회 사용
                            </span>
                            <span className="tabular-nums">{remainPct}%</span>
                          </div>
                          <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${remainPct}%` }} />
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            잔여 <span className="font-medium text-emerald-700">{remaining}</span>회
                          </div>
                        </div>
                      );
                    })()}

                    {/* 옵트아웃 체크박스 */}
                    <div className="mt-4 inline-flex items-center gap-2">
                      <Checkbox
                        id="package-optout"
                        checked={!!formData.packageOptOut}
                        onCheckedChange={(v) => setFormData({ ...formData, packageOptOut: v === true })}
                        className="h-4 w-4 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <Label htmlFor="package-optout" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                        이번 신청에는 패키지 <span className="font-medium">사용 안 함</span>
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-900/20 p-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-slate-400/20 grid place-content-center text-slate-500">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">패키지가 없거나 잔여 횟수가 없습니다.</div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">패키지를 보유하면 교체비가 0원으로 처리됩니다. (배송/추가옵션비 제외)</p>
                  </div>
                </div>
              </div>
            )}

            {!usingPackage && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="shippingBank" className="text-sm font-medium">
                    은행 선택 <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="shippingBank"
                    name="shippingBank"
                    value={formData.shippingBank}
                    onChange={(e) => setFormData({ ...formData, shippingBank: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="" disabled hidden>
                      입금하실 은행을 선택해주세요.
                    </option>
                    {Object.entries(bankLabelMap).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.shippingBank && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                      <CreditCard className="h-5 w-5 mr-2" />
                      계좌 정보
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="text-sm text-gray-600">은행</span>
                        <span className="font-medium text-gray-900">{bankLabelMap[formData.shippingBank].label}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="text-sm text-gray-600">계좌번호</span>
                        <span className="font-mono font-medium text-gray-900">{bankLabelMap[formData.shippingBank].account}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="text-sm text-gray-600">예금주</span>
                        <span className="font-medium text-gray-900">{bankLabelMap[formData.shippingBank].holder}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="shippingDepositor" className="text-sm font-medium">
                    입금자명 <span className="text-red-500">*</span>
                  </Label>
                  <Input id="shippingDepositor" name="shippingDepositor" value={formData.shippingDepositor} onChange={handleInputChange} placeholder="입금자명을 입력하세요" className="focus:ring-2 focus:ring-purple-500 transition-all duration-200" />
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-teal-600 mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">추가 요청사항</h2>
              <p className="text-muted-foreground">특별한 요청사항이 있으시면 입력해주세요</p>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium mb-1">안내사항</p>
                    <p>스트링 교체 및 장착 요청 내용을 아래에 자세히 적어주세요.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements" className="text-sm font-medium">
                  요청사항
                </Label>
                <Textarea
                  id="requirements"
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  placeholder="예: 첫 번째 라켓에는 RPM Blast, 두 번째 라켓에는 Xcel 장착 요청"
                  rows={6}
                  className="resize-none focus:ring-2 focus:ring-green-500 transition-all duration-200"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 py-16">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative container mx-auto px-4 text-center text-white">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-6">
            <Wrench className="h-10 w-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">스트링 장착 서비스 신청</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">전문가가 직접 라켓에 스트링을 장착해드립니다</p>
        </div>
      </div>

      {/* Main */}
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-7xl">
          {/* Progress Steps: 폼 폭(800px)에 맞춰 중앙 정렬 */}
          <div ref={stepsRef} className="mb-8">
            <div className="max-w-[800px] mx-auto">
              <div className="flex items-center justify-between mb-8">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                          currentStep >= step.id ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-transparent text-white' : 'border-gray-300 text-gray-400 bg-white'
                        }`}
                      >
                        <step.icon className="h-6 w-6" />
                      </div>
                      <div className="mt-2 text-center">
                        <p className={`text-sm font-medium ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'}`}>{step.title}</p>
                        <p className="text-xs text-gray-500 mt-1 hidden sm:block">{step.description}</p>
                      </div>
                    </div>
                    {index < steps.length - 1 && <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${currentStep > step.id ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-300'}`} />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* === 폼만 '진짜' 중앙, 요금카드는 오른쪽에 겹쳐 배치 === */}
          <div className="relative">
            {/* 중앙 메인 폼 */}
            <div className="mx-auto w-full md:w-[800px]">
              <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-2xl">
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit}>
                    {getCurrentStepContent()}

                    {/* 모바일/태블릿: 인라인 요금 요약 (xl 미만에서만 노출) */}
                    <div className="mt-8 xl:hidden">
                      <PriceSummaryCard
                        preferredDate={formData.preferredDate}
                        preferredTime={formData.preferredTime}
                        collectionMethod={formData.collectionMethod as any}
                        stringTypes={formData.stringTypes}
                        usingPackage={priceView.usingPackage}
                        base={priceView.base}
                        pickupFee={priceView.pickupFee}
                        total={priceView.total}
                      />
                    </div>

                    {/* 하단 네비게이션 */}
                    <div className="flex justify-between mt-12 pt-8 border-t">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1} className="px-8 py-3 hover:bg-gray-50 transition-colors duration-200">
                        이전
                      </Button>

                      {currentStep < 4 ? (
                        <Button
                          type="button"
                          onClick={handleNext}
                          disabled={!isStepValid(currentStep)}
                          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transition-all duration-200 disabled:opacity-50"
                        >
                          다음
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          disabled={isSubmitting}
                          onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
                          className="px-8 py-3 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white transition-all duration-200 disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              신청서 제출 중...
                            </>
                          ) : (
                            <>
                              신청서 제출하기
                              <CheckCircle className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* 하단 3개 카드(소개) */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-white/20">
                  <Shield className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">정품 보장</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">100% 정품 스트링만 사용합니다</p>
                </div>
                <div className="text-center p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-white/20">
                  <Clock className="h-8 w-8 text-green-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">당일 완료</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">빠르고 정확한 장착 서비스</p>
                </div>
                <div className="text-center p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-white/20">
                  <Award className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">전문가 상담</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">15년 경력의 전문가가 직접</p>
                </div>
              </div>
            </div>

            <div
              className="hidden xl:block"
              style={{
                position: 'absolute',
                width: '320px',
                left: 'calc(50% + 400px + 24px)',
                top: 0,
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              <div className="sticky pointer-events-auto" style={{ top: stickyTop }}>
                <PriceSummaryCard
                  preferredDate={formData.preferredDate}
                  preferredTime={formData.preferredTime}
                  collectionMethod={formData.collectionMethod as any}
                  stringTypes={formData.stringTypes}
                  usingPackage={priceView.usingPackage}
                  base={priceView.base}
                  pickupFee={priceView.pickupFee}
                  total={priceView.total}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
