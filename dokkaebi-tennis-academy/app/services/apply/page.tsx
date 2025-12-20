'use client';

import type React from 'react';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { User, CreditCard, MapPin, CheckCircle, ArrowRight, Shield, Zap, DollarSign, Wrench, ClipboardList, Ticket, Box, Store } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import PriceSummaryCard from '@/app/services/_components/PriceSummaryCard';
import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';

type CollectionMethod = 'self_ship' | 'courier_pickup' | 'visit';

// 앞으로 "라켓 1자루 + 사용할 스트링 1개"를 나타낼 라인 단위 타입
type ApplicationLine = {
  id: string; // 프론트에서 key 용으로 사용할 임시 ID (uuid 등)
  racketType: string; // 라켓 종류/모델명
  stringProductId: string; // 사용할 스트링 상품 ID ('custom' 포함)
  stringName: string; // 화면 표시용 스트링 이름
  tensionMain: string; // 메인 텐션
  tensionCross: string; // 크로스 텐션
  note: string; // 라켓별 요청사항(선택)
  mountingFee: number; // 이 라인에 대한 장착비
};

interface FormData {
  name: string;
  email: string;
  phone: string;
  racketType: string;
  stringTypes: string[];
  customStringType: string;
  stringUseCounts: Record<string, number>;
  preferredDate: string;
  preferredTime: string;
  requirements: string;
  shippingName: string;
  shippingPhone: string;
  shippingEmail: string;
  shippingAddress: string;
  shippingAddressDetail: string;
  shippingPostcode: string;
  shippingDepositor: string;
  shippingRequest: string;
  shippingBank: string;
  packageOptOut: boolean;
  collectionMethod: CollectionMethod;
  pickupDate: string;
  pickupTime: string;
  pickupNote: string;
  lines: ApplicationLine[];
  pdpMountingFee?: number; // PDP에서 넘어온 장착비 (임시)
  defaultMainTension?: string;
  defaultCrossTension?: string;
}

interface PdpMiniProduct {
  name: string;
  image: string | null;
  price?: number; // 스트링 상품 금액
}

declare global {
  interface Window {
    daum: any;
  }
}

export default function StringServiceApplyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  // PDP에서 넘어온 상품의 미니 정보(이름, 이미지)
  const [pdpProduct, setPdpProduct] = useState<PdpMiniProduct | null>(null);
  const [isLoadingPdpProduct, setIsLoadingPdpProduct] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isUserLoading, setIsUserLoading] = useState(false);

  const isOrderBased = Boolean(orderId && order);

  // PDP 연동용 (주의: orderId 기반 진입이면 PDP 파라미터는 무시한다)
  const pdpProductId = isOrderBased ? null : searchParams.get('productId');
  // null 또는 빈문자열("")이면 NaN 처리, 그 외에는 Number 변환
  const mountingFeeParam = isOrderBased ? null : searchParams.get('mountingFee');
  const pdpMountingFee = mountingFeeParam === null || mountingFeeParam.trim() === '' ? Number.NaN : Number(mountingFeeParam);

  const [fromPDP, setFromPDP] = useState<boolean>(() => Boolean(!isOrderBased && pdpProductId));

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

  // 1) 신청서 id 상태
  const [applicationId, setApplicationId] = useState<string | null>(null);

  // 2) by-order로 신청서 id 조회
  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const res = await fetch(`/api/applications/stringing/by-order/${orderId}`, {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!res.ok) return; // 404면 초안 생성 루트로 진행
        const data = await res.json();
        if (data?.found) {
          // draft면 현 페이지에서 계속 작성하되 버튼 등에서 applicationId 사용
          setApplicationId(data.applicationId);
        }
      } catch (e) {
        console.error('[apply] fetch by-order id failed:', e);
      }
    })();
  }, [orderId]);

  // PDP 상품 미니 정보 로딩 (이미지/이름/장착비)
  useEffect(() => {
    if (!pdpProductId) {
      setPdpProduct(null);
      return;
    }

    let cancelled = false;
    setIsLoadingPdpProduct(true);

    fetch(`/api/products/${pdpProductId}/mini`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.ok) return;

        if (!cancelled) {
          setPdpProduct({
            name: data.name,
            image: data.image ?? null,
            price: typeof data.price === 'number' ? data.price : undefined,
          });

          // 🔥 mountingFee를 formData에 저장
          if (typeof data.mountingFee === 'number') {
            setFormData((prev) => ({
              ...prev,
              pdpMountingFee: data.mountingFee,
            }));
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPdpProduct(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingPdpProduct(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pdpProductId]);

  // PDP에서 넘어오면 STEP2 자동 선택 + 장착비 기억 + 플래그 on
  useEffect(() => {
    if (!pdpProductId) return;

    // 주문 데이터 로딩 완료를 기다림
    if (orderId && !order) return;

    setFormData((prev) => {
      // 이미 같은 상품이 선택되어 있으면 스킵
      if (prev.stringTypes.includes(pdpProductId)) return prev;

      return {
        ...prev,
        stringTypes: [pdpProductId], // 무조건 선택
        pdpMountingFee: Number.isFinite(pdpMountingFee) ? pdpMountingFee : undefined,
      };
    });
    setFromPDP(true);
  }, [pdpProductId, pdpMountingFee, orderId, order]); // order 의존성 추가
  // 초안 보장: 주문 기반 진입 시, 진행 중 신청서(draft/received)를 "항상" 1개로 맞춘다.
  // - 이미 있으면 재사용(reused=true), 없으면 자동 생성
  // - UI에는 영향 없음(프리필/흐름 그대로), 서버/DB 일관성만 강화
  const draftBootRef = useRef(false);

  useEffect(() => {
    if (!orderId) return;
    if (draftBootRef.current) return; // StrictMode 중복 가드
    draftBootRef.current = true;
    (async () => {
      try {
        const draftUrl = orderId && orderId.trim() ? `/api/applications/stringing/drafts?orderId=${encodeURIComponent(orderId)}` : `/api/applications/stringing/drafts`;

        const resp = await fetch(draftUrl, {
          method: 'POST',
          credentials: 'include', // ← 쿠키 기반 인증 필수
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderId || undefined }), // 서버 멱등성 유지
          cache: 'no-store',
        });
        console.debug('[draft bootstrap] POST', draftUrl, 'status=', resp.status);
        // 응답 데이터(applicationId, reused 등)는 현재 화면 흐름에 직접 필요 없으므로
        // 별도 상태 저장 없이 "초안 존재"만 보장. (멱등: 여러 번 호출돼도 중복 생성 없음)
      } catch (err) {
        // 초안 생성 실패가 화면 진행을 막지는 않도록 '조용히' 로깅만
        console.error('[draft bootstrap] failed:', err);
      }

      // 초안 생성이 끝난 뒤 applicationId가 없다면 by-order 재조회
      if (!applicationId && orderId) {
        try {
          const r = await fetch(`/api/applications/stringing/by-order/${orderId}`, {
            cache: 'no-store',
            credentials: 'include',
          });
          if (r.ok) {
            const j = await r.json();
            if (j?.found) setApplicationId(j.applicationId);
          }
        } catch {}
      }
    })();
  }, [orderId]);

  // 스텝별 검증 (silent=true면 토스트 없이 true/false만 반환)
  const validateStep = (step: number, silent = false): boolean => {
    const toast = (msg: string) => {
      if (!silent) showErrorToast(msg);
    };

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
      // if (!formData.racketType.trim()) return toast('라켓 종류를 입력해주세요.'), false;
      if (formData.stringTypes.length === 0) {
        return toast('스트링 종류를 한 개 이상 선택해주세요.'), false;
      }
      if (formData.stringTypes.includes('custom') && !formData.customStringType.trim()) {
        return toast('직접 입력한 스트링명을 적어주세요.'), false;
      }

      const isVisit = normalizeCollection(formData.collectionMethod) === 'visit';
      if (isVisit) {
        if (!formData.preferredDate) {
          return toast('장착 희망일을 선택해주세요.'), false;
        }
        if (!formData.preferredTime) {
          return toast('희망 시간대를 선택해주세요.'), false;
        }
      }

      // 주문 기반(orderId) 진입이면, 이 주문에서 허용된 남은 교체 횟수(remainingSlots)를 초과 신청할 수 없음
      if (orderId && typeof orderRemainingSlots === 'number') {
        // requiredPassCount = 이번 신청에서 실제로 장착하려는 라켓 수
        if (requiredPassCount > orderRemainingSlots) {
          return toast(`이 주문에서 남은 교체 가능 횟수는 ${orderRemainingSlots}회입니다. 장착할 라켓 수를 줄여주세요.`), false;
        }
      }

      // 라켓별 세부 장착 정보 필수 검증
      if (linesForSubmit.length > 0) {
        for (let i = 0; i < linesForSubmit.length; i++) {
          const line = linesForSubmit[i];
          const racketName = (line.racketType ?? '').trim();
          const tensionMain = (line.tensionMain ?? '').trim();
          const tensionCross = (line.tensionCross ?? '').trim();

          if (!racketName || !tensionMain || !tensionCross) {
            return toast(`라켓 ${i + 1}의 이름과 메인/크로스 텐션을 모두 입력해주세요.`), false;
          }
        }
      }

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
  const isStepValid = (step: number) => {
    const ok = validateStep(step, true);
    if (!ok) return false;
    if (step === 2 && !!slotsError) return false;
    return true;
  };

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    racketType: '',
    stringTypes: [] as string[],
    customStringType: '',
    stringUseCounts: {},
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
    lines: [],
  });

  // 예약 슬롯 상태
  const [disabledTimes, setDisabledTimes] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
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

        const cap = Math.max(requiredPassCount || 1, 1);

        const res = await fetch(`/api/applications/stringing/reserved?date=${encodeURIComponent(date)}&cap=${cap}`, {
          method: 'GET',
          signal: controller.signal,
          credentials: 'include',
        });

        if (!res.ok) {
          // 30일 초과/미만 등 '정책 위반'은 서버 메시지를 그대로 노출
          if (res.status === 400) {
            const j = await res.json().catch(() => null);
            setSlotsError(j?.message ?? '현재 날짜부터 30일 이내만 예약 가능합니다. 다른 날짜를 선택해주세요.');
            // 시간대 격자는 감춤
            setTimeSlots([]);
            setDisabledTimes([]);
            // 선택된 시간도 해제
            setFormData((prev) => ({ ...prev, preferredTime: '' }));
            return;
          }

          // 그 외(500/네트워크 등)만 일반 오류로 처리
          if (!cacheHit) setDisabledTimes([]);
          setSlotsError('예약 현황을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
          return;
        }

        const data = await res.json();
        setSlotsError(null); // 성공 시 에러 초기화

        // 휴무/비영업일 처리
        if (data?.closed === true) {
          setSlotsError('해당 날짜는 휴무일입니다. 다른 날짜를 선택해주세요.');
          setTimeSlots([]);
          setDisabledTimes([]);
          setFormData((prev) => ({ ...prev, preferredTime: '' }));
          return;
        }

        // 서버 슬롯/마감 반영
        setTimeSlots(Array.isArray(data?.allTimes) ? data.allTimes : []);
        setDisabledTimes(Array.isArray(data?.reservedTimes) ? data.reservedTimes : []);

        // (선택) 현재 선택된 시간이 사용 불가면 선택 해제
        if (data?.availableTimes && !data.availableTimes.includes(formData.preferredTime)) {
          setFormData((prev) => ({ ...prev, preferredTime: '' }));
        }

        // 사용자가 로딩 중에 선택해둔 시간이 새로 "비활성"이 되면 해제
        setFormData((prev) => (prev.preferredTime && (data?.reservedTimes?.includes(prev.preferredTime) ?? false) ? { ...prev, preferredTime: '' } : prev));
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

  // 수거비 상수
  const PICKUP_FEE = 3000; // 기사 방문 수거 시 후정산 안내용

  // === 패키지 사용에 필요한 횟수 계산 ===
  // useMemo 대신 즉시 실행 함수(IIFE)로 계산 (훅 순서 꼬임 방지)
  const requiredPassCount = (() => {
    const ids = (formData.stringTypes || []).filter(Boolean);
    if (!ids.length) return 0;

    const isOrderMode = !!orderId && !!order;
    let total = 0;

    ids.forEach((id) => {
      if (id === 'custom') {
        // 직접 입력 스트링은 개수 설정이 없으면 1회
        const useQty = formData.stringUseCounts['custom'] ?? 1;
        total += useQty;
        return;
      }

      if (isOrderMode && order) {
        const item = order.items.find((it) => it.id === id);
        const orderQty = item?.quantity ?? 1;
        const useQty = formData.stringUseCounts[id] ?? orderQty;
        total += useQty;
      } else {
        // 주문 없는 단독/PDP: 스트링 1개 당 1회
        total += 1;
      }
    });

    return total;
  })();

  // 패키지 잔여 횟수 & 적용 가능 여부
  const packageRemaining = Math.max(0, packagePreview?.remaining ?? 0);

  // 패키지 자체는 있지만, "이번 신청에 필요한 횟수"만큼 남아 있는지 여부
  const canApplyPackage = !!(packagePreview?.has && requiredPassCount > 0 && packageRemaining >= requiredPassCount);

  // 실제로 이번 신청에서 패키지를 사용하는지 여부(옵트아웃까지 반영)
  const usingPackage = !!(canApplyPackage && !formData.packageOptOut);

  // 패키지가 있지만, 이번 신청에 필요한 횟수보다 적게 남은 경우
  const packageInsufficient = !!(packagePreview?.has && requiredPassCount > 0 && packageRemaining < requiredPassCount);

  // 이런 경우에는 강제적으로 "사용 안 함"으로 고정
  useEffect(() => {
    if (packageInsufficient && !formData.packageOptOut) {
      setFormData((prev) => ({ ...prev, packageOptOut: true }));
    }
  }, [packageInsufficient, formData.packageOptOut]);

  // ===== 가격 표시 계산(표시 전용) =====
  const priceView = useMemo(() => {
    // 교체비(표시용)
    // - 커스텀/보유 스트링: 15,000 (스트링 미포함 작업비)
    // - 주문(orderId) 기반: 선택한 주문 항목의 mountingFee
    // - PDP 기반: pdpMountingFee
    // - 그 외(완전 단독 신청): 35,000 fallback
    let base = 0;

    // 1) 커스텀/보유 스트링 선택 시: 항상 15,000
    if (formData.stringTypes.includes('custom')) {
      base = 15000;
    }
    // 2) 그 외 스트링 상품이 선택된 경우
    else if (formData.stringTypes.length > 0) {
      const firstId = formData.stringTypes[0];

      // 2-1) 주문(orderId)에서 넘어온 경우: 주문 항목의 mountingFee 사용
      if (orderId && order && firstId) {
        const selected = order.items.find((it) => it.id === firstId);
        if (selected?.mountingFee != null) {
          base = selected.mountingFee;
        }
      }

      // 2-2) PDP에서 넘어온 경우: pdpMountingFee 우선 사용
      if (!base && Number.isFinite((formData as any).pdpMountingFee)) {
        base = Number((formData as any).pdpMountingFee);
      }
      // 2-3) 그 외(완전 단독 신청 등): 기존 35,000 fallback 유지
      if (!base) {
        base = 35000;
      }
    }

    // 수거비(표시용)
    const pickupFee = normalizeCollection(formData.collectionMethod) === 'courier_pickup' ? PICKUP_FEE : 0;

    // 총액(표시용): 패키지 적용 시 교체비 0 (수거비는 후정산 안내로 표시만)
    const total = usingPackage ? 0 : base + pickupFee;

    return { usingPackage, base, pickupFee, total };
  }, [
    formData.stringTypes,
    formData.collectionMethod,
    (formData as any).pdpMountingFee,
    orderId,
    order,
    usingPackage, // 🔥 패키지 사용 여부 변경 시 재계산
  ]);

  // 선택된 스트링 상품 정보 (orderId 기반 진입용)
  const selectedOrderItem = useMemo(() => {
    // 주문 기반이 아니면 없음
    if (!orderId || !order) return null;
    if (!formData.stringTypes.length) return null;

    const firstId = formData.stringTypes[0];
    if (!firstId || firstId === 'custom') return null;

    // 주문 항목에서 현재 선택된 스트링 찾기
    const found = order.items.find((it) => it.id === firstId);
    return found ?? null;
  }, [orderId, order, formData.stringTypes]);

  // 이 신청에서 실제로 전송할 "라인" 목록
  const linesForSubmit: ApplicationLine[] = useMemo(() => {
    // 1) 이미 라인이 세팅되어 있으면 그대로 사용
    if (Array.isArray(formData.lines) && formData.lines.length > 0) {
      return formData.lines;
    }

    const stringIds = (formData.stringTypes || []).filter(Boolean);
    if (!stringIds.length) {
      return [];
    }

    const baseFee = priceView.base ?? 0;
    const isOrderMode = !!orderId && !!order;

    const getStringName = (prodId: string): string => {
      if (isOrderMode && order) {
        const found = order.items.find((it) => it.id === prodId);
        if (found?.name) return found.name;
      }
      if (prodId === pdpProductId && pdpProduct?.name) {
        return pdpProduct.name; // PDP 상품 이름 사용
      }
      if (prodId === 'custom') {
        return formData.customStringType || '커스텀 스트링';
      }
      return '선택한 스트링';
    };

    // 장착비 가져오는 헬퍼 함수 추가
    const getMountingFee = (prodId: string): number => {
      if (prodId === 'custom') {
        return 15000;
      }

      // 주문 아이템에서 찾기
      if (isOrderMode && order) {
        const found = order.items.find((it) => it.id === prodId);
        if (found?.mountingFee != null) {
          return found.mountingFee;
        }
      }

      // PDP에서 넘어온 경우
      if (prodId === pdpProductId && Number.isFinite(pdpMountingFee)) {
        return pdpMountingFee;
      }

      // 기본값
      return baseFee || 35000;
    };

    const lines: ApplicationLine[] = [];

    stringIds.forEach((prodId, index) => {
      const stringName = getStringName(prodId);
      const lineFee = getMountingFee(prodId);

      if (prodId === 'custom') {
        lines.push({
          id: `custom-${index}-0`,
          racketType: '',
          stringProductId: prodId,
          stringName,
          tensionMain: '',
          tensionCross: '',
          note: formData.requirements,
          mountingFee: lineFee,
        });
        return;
      }

      // 주문 기반인 경우
      if (isOrderMode && order) {
        const found = order.items.find((it) => it.id === prodId);
        const orderQty = found?.quantity ?? 1;
        const useQty = formData.stringUseCounts[prodId] ?? orderQty;

        // 주문 기반인 경우
        if (isOrderMode && order) {
          const found = order.items.find((it) => it.id === prodId);
          const orderQty = found?.quantity ?? 1;
          const useQty = formData.stringUseCounts[prodId] ?? orderQty;

          // 주문 안에서 라켓/중고라켓 하나만 있다면 그 이름을 기본값으로 사용
          let racketNameFromOrder: string | undefined;
          const items = (order as any)?.items;
          if (Array.isArray(items)) {
            const racketItems = items.filter((it: any) => it?.kind === 'racket' || it?.kind === 'used_racket');
            if (racketItems.length === 1) {
              const r = racketItems[0] as any;
              racketNameFromOrder = (r.name ?? r.productName ?? '').trim() || undefined;
            }
          }

          for (let i = 0; i < useQty; i++) {
            const alias = (formData.racketType || '').trim() || racketNameFromOrder || `라켓 ${lines.length + 1}`;

            lines.push({
              id: `${prodId}-${i}`,
              racketType: alias,
              stringProductId: prodId,
              stringName,
              tensionMain: '',
              tensionCross: '',
              note: formData.requirements,
              mountingFee: lineFee,
            });
          }
        }
      } else {
        // 단독/PDP 경로
        lines.push({
          id: `${prodId}-0`,
          racketType: formData.racketType,
          stringProductId: prodId,
          stringName,
          tensionMain: '',
          tensionCross: '',
          note: formData.requirements,
          mountingFee: lineFee,
        });
      }
    });

    return lines;
  }, [formData.lines, formData.stringTypes, formData.stringUseCounts, formData.racketType, formData.requirements, priceView.base, order, orderId, pdpProductId, pdpProduct, pdpMountingFee]);

  // 4. 디버깅을 위한 콘솔 로그 추가
  useEffect(() => {
    console.log('🔍 Debug Info:', {
      pdpProductId,
      pdpMountingFee,
      orderId,
      hasOrder: !!order,
      orderItems: order?.items?.map((i) => ({ id: i.id, name: i.name, mountingFee: i.mountingFee })),
      stringTypes: formData.stringTypes,
      linesCount: linesForSubmit.length,
      fromPDP,
    });
  }, [pdpProductId, pdpMountingFee, orderId, order, formData.stringTypes, linesForSubmit, fromPDP]);

  // 이번 신청에서 라켓/스트링 라인 개수
  const lineCount = linesForSubmit.length || (formData.stringTypes.length ? 1 : 0);

  // 라켓 금액: orderId 기반 주문에서 가져오기
  const racketPrice = useMemo(() => {
    if (!orderId || !order) return 0;

    // 없으면 items[] 중 라켓/중고라켓 합산
    const items = (order as any)?.items;
    if (Array.isArray(items)) {
      return items
        .filter((it: any) => it?.kind === 'racket' || it?.kind === 'used_racket')
        .reduce((sum: number, it: any) => {
          const unit = Number(it?.price ?? 0);
          const qty = Number(it?.quantity ?? 1);
          return sum + unit * qty;
        }, 0);
    }
    return 0;
  }, [orderId, order]);

  // 주문 내 스트링 금액: items 중 mountingFee > 0 인 품목 합산(= StringCheckboxes 기준과 동일)
  const orderStringPrice = useMemo(() => {
    if (!orderId || !order) return 0;

    const items = (order as any)?.items;
    if (!Array.isArray(items)) return 0;

    return items
      .filter((it: any) => typeof it?.mountingFee === 'number' && it.mountingFee > 0)
      .reduce((sum: number, it: any) => {
        const unit = Number(it?.price ?? 0);
        const qty = Number(it?.quantity ?? 1);
        return sum + unit * qty;
      }, 0);
  }, [orderId, order]);

  // 이미 결제된 주문 금액(정보용) - 라켓 PDP에서 넘어온 주문 기준
  const paidTotal = useMemo(() => {
    if (!orderId || !order) return undefined;

    const raw = (order as any)?.totalPrice;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return undefined;

    return n;
  }, [orderId, order]);

  // PDP 통합 모드인지 여부: orderId가 있고, PDP에서 넘어온 경우
  const isCombinedPdpMode = Boolean(orderId && fromPDP);

  // racketPrice: 주문 기반일 때만 의미가 있으니 그대로 사용(이미 0/양수로 잘 계산됨)
  const summaryRacketPrice = isOrderBased ? racketPrice : 0;

  // 라벨도 케이스별로
  const totalLabel = isOrderBased ? '이번 주문 총 결제 금액' : fromPDP ? '이번 신청 예상 결제 금액' : '이번 교체 서비스 예상 비용';

  /** PDP에서 넘어온 스트링 상품 금액 (없으면 0원) */
  const pdpStringPrice = isCombinedPdpMode && pdpProduct && typeof pdpProduct.price === 'number' ? pdpProduct.price : 0;
  // stringPrice: 주문 기반이면 주문에서, 아니면 PDP에서(기존 유지)
  const summaryStringPrice = isOrderBased ? orderStringPrice : pdpStringPrice;
  // 교체비(서비스비) 부분
  const summaryBase = price; // linesForSubmit 기반 교체비 총합

  // 패키지면 0, 아니면 교체비 그대로
  const serviceCost = priceView.usingPackage ? 0 : summaryBase;

  // 기존 그대로: 패키지면 교체비 0
  const baseTotal = serviceCost;

  // 합계: 주문 기반(or PDP 기반)일 때만 라켓/스트링을 합산
  const checkoutTotal = isOrderBased || fromPDP ? baseTotal + summaryRacketPrice + summaryStringPrice : baseTotal;

  const summaryTotal = serviceCost;

  const won = (n: number) => n.toLocaleString('ko-KR') + '원';

  // 'HH:MM' ↔ 분 단위 변환 헬퍼 (UI 표시용)
  const parseTimeToMinutes = (time: string | null | undefined) => {
    if (!time || typeof time !== 'string') return null;
    const [h, m] = time.split(':').map((v) => Number(v));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  };

  const formatMinutesToTime = (minutes: number) => {
    if (!Number.isFinite(minutes)) return '';
    // 24시간 넘어가도 안전하게 모듈로 처리
    const total = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
    return `${pad(h)}:${pad(m)}`;
  };

  // 현재 슬롯 리스트(timeSlots)에서 간격(분)을 추정
  // - /admin 설정에서 interval 을 바꿔도 자동으로 따라가도록 UI 에서도 계산
  const slotIntervalMinutes = useMemo(() => {
    if (!timeSlots || timeSlots.length < 2) return null;
    const first = parseTimeToMinutes(timeSlots[0]);
    const second = parseTimeToMinutes(timeSlots[1]);
    if (first == null || second == null) return null;
    const diff = Math.abs(second - first);
    return diff > 0 ? diff : null;
  }, [timeSlots]);

  // 이번 신청이 실제로 사용하는 슬롯 개수 (라켓 개수와 동일한 개념)
  const visitSlotCountUi = lineCount || 0;

  // 이번 방문 예상 소요 시간(분) = 슬롯 간격 × 슬롯 개수
  const visitDurationMinutesUi = useMemo(() => {
    if (!slotIntervalMinutes || !visitSlotCountUi) return null;
    return slotIntervalMinutes * visitSlotCountUi;
  }, [slotIntervalMinutes, visitSlotCountUi]);

  // 선택된 시작/종료 시간 텍스트 (예: 11:30 ~ 12:30)
  const visitTimeRange = useMemo(() => {
    if (!formData.preferredTime || !visitDurationMinutesUi) return null;
    const startMin = parseTimeToMinutes(formData.preferredTime);
    if (startMin == null) return null;
    const endMin = startMin + visitDurationMinutesUi;
    return {
      start: formData.preferredTime,
      end: formatMinutesToTime(endMin),
    };
  }, [formData.preferredTime, visitDurationMinutesUi]);

  // 이 주문에 연결된 스트링 서비스 슬롯 정보 (있을 때만 사용)
  const orderStringService = (order as any)?.stringService as
    | {
        totalSlots?: number;
        usedSlots?: number;
        remainingSlots?: number;
      }
    | undefined;

  // 남은 슬롯 (주문 기준) – 숫자가 아닐 경우 undefined 처리
  const orderRemainingSlots = typeof orderStringService?.remainingSlots === 'number' ? orderStringService.remainingSlots : undefined;
  const isOrderSlotBlocked = !!(orderId && typeof orderRemainingSlots === 'number' && orderRemainingSlots <= 0);

  // 라켓/스트링 선택 체크박스 변화 콜백
  const handleStringTypesChange = (ids: string[]) => {
    // PDP에서 넘어온 경우: 상품 상세에서 이미 스트링을 확정하고 넘어온 상황이므로 잠금
    // 단, 주문 기반(orderId) 진입이면 주문 품목에서 고르는 UX가 필요하므로 잠금 해제
    if (fromPDP && !orderId) return;

    setFormData((prev) => {
      // 기존 카운트 복사
      const nextUseCounts: Record<string, number> = { ...prev.stringUseCounts };

      // 선택되지 않은 스트링은 카운트에서 제거
      const selectedSet = new Set(ids);
      Object.keys(nextUseCounts).forEach((key) => {
        if (!selectedSet.has(key)) {
          delete nextUseCounts[key];
        }
      });

      if (orderId && order) {
        // 이 주문에서 아직 남은 전체 교체 가능 횟수
        let remaining: number | undefined = typeof orderRemainingSlots === 'number' ? orderRemainingSlots : undefined;

        ids.forEach((id) => {
          // 직접 입력 스트링
          if (id === 'custom') {
            if (nextUseCounts[id] == null) {
              // 커스텀은 기본 1자루, 단 남은 슬롯이 있으면 그 안에서만 허용
              const base = remaining != null ? Math.min(1, Math.max(remaining, 0)) : 1;
              nextUseCounts[id] = base;
              if (remaining != null) remaining -= base;
            }
            return;
          }

          const item = order.items.find((it) => it.id === id);
          const orderQty = item?.quantity ?? 1;

          const current = nextUseCounts[id];

          // 기존 값이 없거나, 주문 수량보다 큰 값은 보정
          if (current == null || current > orderQty) {
            let base = orderQty;

            // 남은 슬롯 정보가 있으면, 주문 수량과 남은 슬롯 중 더 작은 값으로 기본값 설정
            if (remaining != null) {
              const allowedForThis = Math.min(orderQty, Math.max(remaining, 0));
              base = allowedForThis;
              remaining -= allowedForThis;
            }

            nextUseCounts[id] = base;
          }
        });
      } else {
        // 주문 없는 경우(PDP/단독): 각 스트링 1개 기준
        ids.forEach((id) => {
          if (nextUseCounts[id] == null) {
            nextUseCounts[id] = 1;
          }
        });
      }

      return {
        ...prev,
        stringTypes: ids,
        stringUseCounts: nextUseCounts,
      };
    });
  };

  // 라켓/라인 에디터: 라켓별 텐션/메모 등 변경 핸들러
  const handleLineFieldChange = <K extends keyof ApplicationLine>(index: number, field: K, value: ApplicationLine[K]) => {
    setFormData((prev) => {
      const baseLines = Array.isArray(prev.lines) && prev.lines.length > 0 ? prev.lines : linesForSubmit ?? [];

      const nextLines = baseLines.map((line, i) => (i === index ? { ...line, [field]: value } : line));

      // 첫 번째 라인의 텐션을 "기본값"으로 들고 가고 싶을 때 (선택)
      let next: FormData = { ...prev, lines: nextLines };
      if (index === 0 && field === 'tensionMain') {
        next.defaultMainTension = String(value ?? '');
      }
      if (index === 0 && field === 'tensionCross') {
        next.defaultCrossTension = String(value ?? '');
      }
      return next;
    });
  };

  // 특정 스트링(productId)에 대해 "이번 신청에서 사용할 개수"를 수정하는 헬퍼
  const handleUseQtyChange = (id: string, value: number) => {
    // 지금은 주문 기반(orderId + order)일 때만 쓸 예정
    if (!orderId || !order) return;

    const raw = Number.isFinite(value) ? value : 0;
    const min = 0;

    let max: number;

    if (id === 'custom') {
      // 커스텀은 이론상 99개까지 허용 (단, 아래에서 남은 슬롯으로 다시 한번 제한)
      max = 99;
    } else {
      const item = order.items.find((it) => it.id === id);
      max = item?.quantity ?? 1; // 기본 상한 = 해당 상품 주문 수량
    }

    // 남은 슬롯 정보가 있으면, "다른 스트링에서 이미 쓴 개수"를 빼고
    //    이 스트링에 할당할 수 있는 최대치만큼으로 한 번 더 제한
    if (typeof orderRemainingSlots === 'number') {
      const otherTotal = Object.entries(formData.stringUseCounts)
        .filter(([key]) => key !== id)
        .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0);

      const remainForThis = Math.max(orderRemainingSlots - otherTotal, 0);
      max = Math.min(max, remainForThis);
    }

    const safe = Math.min(Math.max(raw, min), max);

    setFormData((prev) => ({
      ...prev,
      stringUseCounts: {
        ...prev.stringUseCounts,
        [id]: safe,
      },
    }));
  };

  const handleCustomInputChange = (val: string) => setFormData((prev) => ({ ...prev, customStringType: val }));

  useEffect(() => {
    // linesForSubmit를 기준으로 교체비 총합을 다시 계산한다.
    // - 주문 기반(orderId) + 다자루일 때: 각 라켓 라인에 mountingFee가 세팅되어 있음
    // - PDP 경로: 선택된 스트링 1자루 기준 라인에 mountingFee(pdpMountingFee 등)가 세팅됨
    // - 단독 신청: 커스텀/보유 스트링도 동일하게 1라인 1회 작업비로 표현됨
    if (!linesForSubmit.length) {
      setPrice(0);
      return;
    }

    const total = linesForSubmit.reduce((sum, line) => {
      const fee = typeof line.mountingFee === 'number' ? line.mountingFee : 0;
      return sum + fee;
    }, 0);

    setPrice(total);
  }, [linesForSubmit]);

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

        // 주문 데이터 신청자 정보 불러온 후, 수거 방식 기본값 결정
        setFormData((prev) => {
          // 1) 체크아웃에서 넘긴 servicePickupMethod가 있으면 최우선
          const spm = (orderData as any).servicePickupMethod as 'SELF_SEND' | 'COURIER_VISIT' | 'SHOP_VISIT' | undefined;

          let collectionMethod: 'self_ship' | 'courier_pickup' | 'visit' = prev.collectionMethod;

          const isVisitDelivery2 = (orderData?.shippingInfo as any)?.deliveryMethod === '방문수령' || orderData?.shippingInfo?.shippingMethod === 'visit';

          if (spm === 'SHOP_VISIT' || isVisitDelivery2) {
            collectionMethod = 'visit';
            // } else if (spm === 'COURIER_VISIT') {
            //   collectionMethod = 'courier_pickup';
          } else if (spm === 'COURIER_VISIT') {
            // 기사 방문 수거 UI는 비노출 → 안전하게 자가발송으로 치환
            collectionMethod = 'self_ship';
          } else {
            collectionMethod = 'self_ship';
          }

          return { ...prev, collectionMethod };
        });

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
    if (!window?.daum?.Postcode) {
      showErrorToast('주소 검색 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
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
  async function refetchDisabledTimesFor(date: string) {
    if (!date) return;
    try {
      const cap = Math.max(requiredPassCount || 1, 1);

      const res = await fetch(`/api/applications/stringing/reserved?date=${encodeURIComponent(date)}&cap=${cap}`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      const times: string[] = Array.isArray(data?.reservedTimes) ? data.reservedTimes : [];
      // 내부 캐시 & 상태와 동일하게 갱신
      slotsCache.current.set(date, times);
      setDisabledTimes(times);
    } catch {
      // 조용히 실패 무시
    }
  }
  const steps = [
    { id: 1, title: '신청자 정보', icon: User, description: '기본 정보를 입력해주세요' },
    { id: 2, title: '장착 정보', icon: ClipboardList, description: '라켓과 스트링 정보를 선택해주세요' },
    { id: 3, title: '결제 정보', icon: CreditCard, description: '결제 방법을 선택해주세요' },
    { id: 4, title: '추가 요청', icon: CheckCircle, description: '추가 요청사항을 입력해주세요' },
  ];
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
      lines: linesForSubmit,
    };

    try {
      const res = await fetch('/api/applications/stringing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 409) {
          const data = await res.json().catch(() => ({} as any));

          // 시간대 마감
          const message = data?.message ?? '해당 시간대가 마감되었습니다.';
          showErrorToast(message);
          setFormData((prev) => ({ ...prev, preferredTime: '' })); // 선택 시간 해제
          await refetchDisabledTimesFor(formData.preferredDate); // 비활성화 시간 재조회
          setIsSubmitting(false);
          return;
        }
        // 그 외 일반 오류
        const { message } = await res.json().catch(() => ({ message: '신청 실패' }));
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

  // 방문 수령 여부(한글/영문 데이터 모두 허용)
  const isVisitDelivery = (order?.shippingInfo as any)?.deliveryMethod === '방문수령' || order?.shippingInfo?.shippingMethod === 'visit'; // 방문이면 매장만 선택 가능
  // 주문 기반 진입 시(= orderId 존재)에는 수거 방식 전체 잠금
  const lockCollection = Boolean(orderId);

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

                {normalizeCollection(formData.collectionMethod) === 'self_ship' && applicationId && (
                  <div
                    className="
                      block cursor-pointer rounded-xl
                      border border-slate-200/80 dark:border-slate-700/60
                      bg-white/90 dark:bg-slate-800/80
                      px-4 py-3 shadow-sm
                      hover:bg-slate-50 dark:hover:bg-slate-700/80
                      transition text-sm
                      peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-900/30 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-blue-200 dark:peer-data-[state=checked]:ring-blue-800
                    "
                  >
                    <div className="font-semibold mb-1 text-slate-900 dark:text-slate-100">자가 발송 안내</div>
                    <p className="mb-3 text-slate-700 dark:text-slate-300">편의점/우체국 등으로 직접 발송하실 수 있어요. 운송장/포장 가이드는 아래 버튼에서 확인하세요.</p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          // 초안의 수거방식을 자가발송으로 저장
                          await fetch(`/api/applications/stringing/${applicationId}/shipping`, {
                            method: 'PATCH',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              shippingInfo: { collectionMethod: 'self_ship' },
                            }),
                          });
                        } catch {}
                        // 그리고 안내 페이지로 이동
                        router.push(`/services/applications/${applicationId}/shipping`);
                      }}
                      className="inline-flex items-center rounded-md bg-amber-500 px-3 py-2 text-white hover:bg-amber-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-600"
                    >
                      운송장/자가발송 안내 보기
                    </button>
                  </div>
                )}
                <RadioGroup
                  value={formData.collectionMethod}
                  onValueChange={(v) =>
                    setFormData((prev) => {
                      // 주문 연동 모드에서는 수거 방식 변경 자체를 막는다.
                      if (lockCollection) return prev;
                      const next = { ...prev, collectionMethod: v as CollectionMethod };
                      // 방문 접수 시, 날짜/시간 필드는 초기화 (기존에 선택된게 있다면)
                      if (normalizeCollection(v) === 'visit') {
                        (next as any).preferredDate = '';
                        (next as any).preferredTime = '';
                      }
                      return next;
                    })
                  }
                  className="grid gap-3 md:grid-cols-3"
                >
                  {/* 자가 발송 */}
                  <div>
                    <RadioGroupItem id="cm-self" value="self_ship" disabled={lockCollection || isVisitDelivery} className="peer sr-only" />
                    <Label
                      htmlFor="cm-self"
                      className="block cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition
                   peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-900/30 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-blue-200 dark:peer-data-[state=checked]:ring-blue-800"
                    >
                      <div className="flex items-center gap-2">
                        <Box className="h-4 w-4" />
                        <span className="font-medium">자가 발송</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">편의점/우체국 등</p>
                    </Label>
                  </div>

                  {/* 기사 방문 수거 비노출 
                  <div>
                    <RadioGroupItem id="cm-pickup" value="courier_pickup" disabled={lockVisit} className="peer sr-only" />
                    <Label
                      htmlFor="cm-pickup"
                      className="block cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition
                   peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-900/30 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-blue-200 dark:peer-data-[state=checked]:ring-blue-800"
                    >
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span className="font-medium">택배 기사 방문 수거</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">선택 시 +3,000원 (후정산)</p>
                    </Label>
                  </div> */}

                  {/* 매장 방문 접수 */}
                  <div>
                    <RadioGroupItem id="cm-visit" value="visit" disabled={lockCollection /* 방문 모드도 주문 기반이면 변경 금지 */} className="peer sr-only" />
                    <Label
                      htmlFor="cm-visit"
                      className="block cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition
                   peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-900/30 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-blue-200 dark:peer-data-[state=checked]:ring-blue-800"
                    >
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        <span className="font-medium">매장 방문 접수</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">방문 가능 시간대만 선택</p>
                    </Label>
                  </div>
                </RadioGroup>
                {lockCollection && <p className="mt-2 text-xs text-slate-500">라켓 구매 단계에서 선택한 접수 방식은 변경할 수 없습니다.</p>}

                {/* 기사 방문 수거 선택 시 추가 입력 */}
                {normalizeCollection(formData.collectionMethod) === 'courier_pickup' && (
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

                {normalizeCollection(formData.collectionMethod) === 'courier_pickup' && <p className="text-xs text-muted-foreground">※ 기사 방문 수거 선택 시 수거비 +3,000원이 발생합니다(후정산 / 결제 합산은 관리자 확정 시 반영).</p>}
              </div>
            </div>
            {/* 로딩 오버레이 */}
            {isUserLoading && (
              <div className="absolute inset-0 z-10 rounded-2xl bg-white/45 dark:bg-slate-900/40 backdrop-blur-[2px] ring-1 ring-inset ring-slate-200/60 dark:ring-slate-700/60 grid place-content-center">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 dark:border-slate-500 border-t-transparent" />
                  <span className="text-sm">회원 정보 불러오는 중…</span>
                </div>
              </div>
            )}
            {(orderId || isMember) && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800 dark:text-orange-300 mb-1">📢 안내사항</p>
                    <p className="text-orange-700 dark:text-orange-200 leading-relaxed">
                      신청자 정보는 <span className="font-semibold">주문 당시 정보</span>를 기준으로 작성됩니다. 회원정보를 수정하셨더라도 <span className="font-semibold">신청자 정보는 변경되지 않습니다.</span>
                      <br />
                      변경이 필요한 경우, <span className="text-orange-600 dark:text-orange-400 font-semibold">추가 요청사항</span>에 기재해주세요.
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
              {/* <div className="space-y-2">
                <Label htmlFor="racketType" className="text-sm font-medium">
                  라켓 종류 <span className="text-red-500">*</span>
                </Label>
                <Input id="racketType" name="racketType" value={formData.racketType} onChange={handleInputChange} placeholder="예: 윌슨 프로 스태프 97" className="focus:ring-2 focus:ring-green-500 transition-all duration-200" />
              </div> */}

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">
                    스트링 종류 <span className="text-red-500">*</span>
                  </Label>
                  <div className="mt-2 space-y-2">
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Zap className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-red-700 dark:text-red-200">
                          <p className="font-medium mb-1">⚠️ 중요 안내</p>
                          <p>• 스트링을 구매하시고 난 후 신청서를 작성하셔야 구매한 스트링 종류가 나옵니다.</p>
                          <p>• 고객님께서 보유하고 계신 스트링으로 단일 신청서를 작성하시려는 경우 "직접 입력하기" 를 클릭하여 신청해주세요.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* PDP에서 이어졌을 때 노출되는 스트링 정보 카드 */}
                {fromPDP && !orderId && Array.isArray(formData.stringTypes) && formData.stringTypes[0] === pdpProductId && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/70 p-3">
                    {isLoadingPdpProduct ? (
                      // 로딩 중에는 간단한 안내 문구만 표시
                      <div className="text-xs text-blue-700">선택한 스트링 정보를 불러오는 중입니다...</div>
                    ) : (
                      <div className="flex items-center gap-3">
                        {/* 상품 이미지 */}
                        {pdpProduct?.image && (
                          <div className="relative h-16 w-16 overflow-hidden rounded-md bg-white shadow-sm">
                            <img src={pdpProduct.image} alt={pdpProduct.name} className="h-full w-full object-cover" />
                          </div>
                        )}

                        {/* 상품 텍스트 정보 */}
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-blue-700">상품 상세에서 선택한 스트링</span>
                          <span className="text-sm font-medium text-gray-900">{pdpProduct?.name ?? '선택한 스트링으로 신청 중입니다.'}</span>
                          <span className="mt-1 text-xs text-gray-600">이 신청서는 위 스트링을 기준으로 장착 서비스가 진행됩니다.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* 주문 기반 진입 시 안내 문구 */}
                {orderId && typeof orderRemainingSlots === 'number' && (
                  <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium">이 주문에서 남은 교체 가능 횟수</span>
                      <span className="font-semibold">{orderRemainingSlots}회</span>
                      {typeof orderStringService?.totalSlots === 'number' && typeof orderStringService?.usedSlots === 'number' && (
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          (총 {orderStringService.totalSlots} / 사용 {orderStringService.usedSlots})
                        </span>
                      )}
                    </div>

                    {isOrderSlotBlocked && <p className="mt-1 text-xs text-red-600 dark:text-red-400">이 주문은 더 이상 교체 신청을 진행할 수 없습니다. 추가 스트링 구매 후 다시 시도해 주세요.</p>}
                  </div>
                )}
                {orderId && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    이번 신청서는 <span className="font-semibold">여러 자루 라켓</span>을 한 번에 접수할 수 있습니다. 장착을 원하는 스트링 상품만 체크해 주세요. 선택한 개수만큼 라켓 장착이 진행되며, 장착비는{' '}
                    <span className="font-semibold">1자루 기준 금액 × 선택한 스트링 개수</span>로 계산됩니다.
                  </p>
                )}

                <div className={fromPDP && !orderId ? 'pointer-events-none opacity-60' : ''}>
                  <StringCheckboxes
                    items={
                      orderId && order
                        ? (order?.items ?? [])
                            // 모든 상품 중 mountingFee가 있는 것만 (kind 체크 제거)
                            .filter((i: any) => typeof i.mountingFee === 'number' && i.mountingFee > 0)
                            .map((i: any) => ({
                              id: i.id,
                              name: i.name,
                              mountingFee: i.mountingFee,
                            }))
                        : [] // 주문이 없으면 빈 배열
                    }
                    stringTypes={formData.stringTypes}
                    customInput={formData.customStringType}
                    hideCustom={Boolean(orderId)}
                    onChange={handleStringTypesChange}
                    onCustomInputChange={handleCustomInputChange}
                  />
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-4 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    예상 장착 비용
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 bg-blue-50/70 dark:border-blue-700">
                      <span className="text-sm text-gray-600 dark:text-gray-300">기본 장착비</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formData.stringTypes.includes('custom') ? '15,000원' : order && lineCount > 0 ? price.toLocaleString('ko-KR') + '원' : (priceView.base * Math.max(lineCount, 1)).toLocaleString('ko-KR') + '원'}
                      </span>
                    </div>

                    {/* 주문 기반 진입 + 스트링 선택 완료 시 상세 안내 */}
                    {orderId && order && lineCount > 0 && (
                      <div className="mt-3 space-y-2 text-xs text-blue-700/90 dark:text-blue-100/90">
                        <p>
                          이번 신청에서 장착할 라켓 수: <span className="font-semibold">{lineCount}자루</span>
                        </p>

                        {/* 선택된 각 스트링별로 "구매 수량 vs 이번 신청 수량" 노출 + 수정 */}
                        <div className="space-y-1">
                          {formData.stringTypes.map((id) => {
                            if (id === 'custom') {
                              const useQty = formData.stringUseCounts['custom'] ?? 1;
                              return (
                                <div key={id} className="flex items-center justify-between gap-2">
                                  <span className="truncate">• 직접 입력 스트링</span>
                                  <div className="flex items-center gap-1">
                                    <Label htmlFor="useQty-custom" className="sr-only">
                                      사용할 개수
                                    </Label>
                                    <Input
                                      id="useQty-custom"
                                      type="number"
                                      className="h-7 w-16 px-2 py-1 text-right text-xs border-slate-300 dark:border-slate-600 rounded-md focus:ring-blue-500"
                                      min={0}
                                      max={99}
                                      value={useQty}
                                      onChange={(e) => handleUseQtyChange('custom', Number(e.target.value) || 0)}
                                    />
                                  </div>
                                </div>
                              );
                            }

                            const item = order.items.find((it) => it.id === id);
                            if (!item) return null;

                            const orderQty = item.quantity ?? 1;
                            const useQty = formData.stringUseCounts[id] ?? orderQty;

                            return (
                              <div key={id} className="flex items-center justify-between gap-2">
                                <span className="truncate">
                                  • {item.name} <span className="text-[11px] text-blue-800/80 dark:text-blue-100/80">(구매 {orderQty}개 중)</span>
                                </span>
                                <div className="flex items-center gap-1">
                                  <Label htmlFor={`useQty-${id}`} className="sr-only">
                                    사용할 개수
                                  </Label>
                                  <Input
                                    id={`useQty-${id}`}
                                    type="number"
                                    className="h-7 w-16 px-2 py-1 text-right text-xs border-slate-300 dark:border-slate-600 rounded-md focus:ring-blue-500"
                                    min={0}
                                    max={orderQty}
                                    value={useQty}
                                    onChange={(e) => handleUseQtyChange(id, Number(e.target.value) || 0)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <p>
                          이번 신청으로 추가 납부할 교체비 합계: <span className="font-semibold text-foreground">{price.toLocaleString('ko-KR')}원</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          스트링 상품 금액은 주문 결제 시 이미 지불하셨다면, 이번 신청에서는 <span className="font-semibold">교체비만 입금</span>하시면 됩니다.
                        </p>
                      </div>
                    )}

                    {/* 주문 기반 진입 + 스트링 1개만 선택 시 상세 안내 */}
                    {orderId && selectedOrderItem && lineCount === 1 && (
                      <div className="mt-1 text-[11px] text-muted-foreground space-y-1">
                        {(() => {
                          // 스트링 금액: PDP 통합모드면 pdpStringPrice 우선, 아니면 주문 item 가격 사용
                          const stringPrice = isCombinedPdpMode ? (Number.isFinite(pdpStringPrice) && pdpStringPrice > 0 ? pdpStringPrice : Number(selectedOrderItem.price ?? 0)) : Number(selectedOrderItem.price ?? 0);

                          // 합계: 통합모드면 라켓 포함
                          const total = (isCombinedPdpMode ? Number(racketPrice ?? 0) : 0) + stringPrice + Number(priceView.base ?? 0);

                          return isCombinedPdpMode ? (
                            <>
                              <p>
                                라켓 {won(Number(racketPrice ?? 0))} + 스트링 {won(stringPrice)} + 교체비 {won(Number(priceView.base ?? 0))} = 총 {won(total)} <span className="text-muted-foreground">(주문 기준 총액)</span>
                              </p>
                              <p>
                                결제 성공 페이지를 건너뛴 경우, <span className="font-semibold">위 합계가 이번 주문의 총 입금 금액</span>입니다.
                              </p>
                            </>
                          ) : (
                            <>
                              <p>
                                스트링 상품 가격(이미 결제) {won(Number(selectedOrderItem.price ?? 0))} + 교체비 {won(Number(priceView.base ?? 0))} = 총 {won(Number(selectedOrderItem.price ?? 0) + Number(priceView.base ?? 0))}{' '}
                                <span className="text-muted-foreground">(참고용)</span>
                              </p>
                              <p>
                                스트링 상품 금액은 주문 결제 시 이미 지불하셨다면, 이번 신청에서는 <span className="font-semibold">교체비만 입금</span>하시면 됩니다.
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* 패키지 요약 - 장착 정보 단계 */}
              <div className="mt-4">
                <div
                  className={
                    packagePreview?.has
                      ? canApplyPackage
                        ? 'rounded-xl border border-emerald-200 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/40 px-4 py-3'
                        : 'rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-800/60 dark:bg-amber-950/40 px-4 py-3'
                      : 'rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-950/40 px-4 py-3'
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Ticket className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    </div>
                    <div className="flex-1 text-[12px] leading-relaxed">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold tracking-tight text-slate-800 dark:text-slate-50">패키지 사용 가능 여부</span>

                        {packagePreview?.has ? (
                          canApplyPackage ? (
                            <Badge className="h-5 rounded-full border-emerald-300/60 bg-emerald-100 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100">자동 적용 대상</Badge>
                          ) : (
                            <Badge className="h-5 rounded-full border-amber-300/60 bg-amber-100 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-100">이번 구성에는 적용 불가</Badge>
                          )
                        ) : (
                          <Badge className="h-5 rounded-full border-slate-300/60 bg-slate-100 text-xs font-medium text-slate-700 dark:bg-slate-900/40 dark:text-slate-100">보유 패키지 없음</Badge>
                        )}
                      </div>

                      {packagePreview?.has ? (
                        packageInsufficient ? (
                          <p className="text-sm text-amber-800 dark:text-amber-100">
                            현재 남은 횟수는 <span className="font-semibold">{packageRemaining}회</span>이고, 이번 신청에는 <span className="font-semibold">{requiredPassCount}회</span>가 필요하여 패키지가 자동 적용되지 않습니다.
                          </p>
                        ) : (
                          <p className="text-sm text-slate-700 dark:text-slate-100">
                            이번 신청에는 패키지로 <span className="font-semibold">{requiredPassCount}회</span>가 필요합니다. 현재 남은 횟수는 <span className="font-semibold">{packageRemaining}회</span>
                            이며, 결제 단계에서 사용 여부를 선택할 수 있습니다.
                          </p>
                        )
                      ) : (
                        <p className="text-sm text-slate-600 dark:text-slate-200">현재 보유 중인 패키지가 없어 이번 신청은 일반 교체비 기준으로 결제됩니다.</p>
                      )}

                      {packagePreview?.has && (
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-200">
                          <span>필요 {requiredPassCount}회</span>
                          <span className="h-3 w-px bg-slate-300/60 dark:bg-slate-700/80" />
                          <span>잔여 {packageRemaining}회</span>
                          {packagePreview.expiresAt && (
                            <>
                              <span className="h-3 w-px bg-slate-300/60 dark:bg-slate-700/80" />
                              <span>만료일 {new Date(packagePreview.expiresAt).toLocaleDateString('ko-KR')}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* 라켓/라인 세부 입력 (선택 사항) */}
              {lineCount > 0 && (
                <Card className="border-none bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-slate-800/30 dark:to-slate-900/40 shadow-sm">
                  <CardHeader className="pb-4 space-y-1">
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">라켓별 세부 장착 정보</CardTitle>
                    <CardDescription className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      위에서 선택한 <span className="font-semibold text-blue-600 dark:text-blue-400">"사용 개수"</span> 기준으로 라인이 자동 생성되어 있습니다. 각 라켓의 이름/별칭과 텐션, 메모를 입력하면 신청서에 함께 저장됩니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {linesForSubmit.map((line, index) => (
                      <div key={line.id ?? index} className="group relative rounded-xl bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                        {/* 헤더 영역: 라켓 N, 스트링 이름 */}
                        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-700/30 dark:to-slate-800/30 border-b border-slate-200/50 dark:border-slate-700/50">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
                              <span className="text-sm font-bold text-white">{index + 1}</span>
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{line.racketType?.trim() || `라켓 ${index + 1}`}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300 truncate max-w-[200px]">{line.stringName}</span>
                          </div>
                        </div>

                        {/* 라켓 이름 + 텐션 */}
                        <div className="p-4 space-y-4">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">라켓 이름/별칭</Label>
                              <Input
                                value={line.racketType ?? ''}
                                onChange={(e) => handleLineFieldChange(index, 'racketType', e.target.value)}
                                placeholder="예: 라켓1"
                                className="h-9 text-sm border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">메인 텐션(kg)</Label>
                              <Input
                                value={line.tensionMain ?? ''}
                                onChange={(e) => handleLineFieldChange(index, 'tensionMain', e.target.value)}
                                placeholder="예: 24"
                                className="h-9 text-sm border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">크로스 텐션(kg)</Label>
                              <Input
                                value={line.tensionCross ?? ''}
                                onChange={(e) => handleLineFieldChange(index, 'tensionCross', e.target.value)}
                                placeholder="예: 23"
                                className="h-9 text-sm border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                              />
                            </div>
                          </div>

                          {/* 라켓별 메모 */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">라켓별 메모 (선택)</Label>
                            <Textarea
                              value={line.note ?? ''}
                              onChange={(e) => handleLineFieldChange(index, 'note', e.target.value)}
                              rows={2}
                              className="text-sm resize-none border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                              placeholder="요청사항을 적어 두셔도 좋습니다."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {normalizeCollection(formData.collectionMethod) === 'visit' && (
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
                    {formData.preferredDate && formData.preferredTime && visitSlotCountUi > 0 && visitDurationMinutesUi && (
                      <div className="mt-3 text-xs md:text-[13px] text-slate-700 dark:text-slate-100 bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                        <p className="font-medium">
                          이번 방문 예상 소요 시간: {visitTimeRange ? `${visitTimeRange.start} ~ ${visitTimeRange.end}` : `약 ${visitDurationMinutesUi}분`} ({visitSlotCountUi}슬롯)
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-300 leading-relaxed">선택하신 시간부터 연속으로 작업이 진행되며,&nbsp; 해당 시간대에는 다른 예약이 불가능합니다.</p>
                      </div>
                    )}
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
                      times={timeSlots}
                      disabledTimes={disabledTimes}
                      isLoading={slotsLoading && !hasCacheForDate}
                      errorMessage={slotsError}
                    />
                  </div>
                </div>
              )}
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
              <div
                className={
                  packageInsufficient
                    ? 'mt-6 rounded-2xl border border-red-200 bg-red-50/80 dark:border-red-800/60 dark:bg-red-950/40 p-5'
                    : 'mt-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:border-emerald-800/60 dark:from-emerald-950/40 dark:to-teal-950/40 p-5'
                }
              >
                <div className="flex items-start gap-4">
                  <div className={packageInsufficient ? 'h-10 w-10 shrink-0 rounded-full bg-red-500 text-white grid place-content-center shadow-sm' : 'h-10 w-10 shrink-0 rounded-full bg-emerald-600 text-white grid place-content-center shadow-sm'}>
                    <Ticket className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    {/* 헤더: 제목 + 상태 배지 */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={packageInsufficient ? 'text-sm font-semibold text-red-800 dark:text-red-100' : 'text-sm font-semibold text-emerald-900 dark:text-emerald-100'}>패키지 자동 적용</h3>
                      <Badge
                        className={
                          packageInsufficient ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-100 border border-red-200/80' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100 border border-emerald-200/80'
                        }
                      >
                        {packageInsufficient ? '적용 불가' : usingPackage ? '사용 중' : '사용 가능'}
                      </Badge>
                    </div>

                    {/* 본문 설명 */}
                    {packageInsufficient ? (
                      <p className="mt-2 text-sm text-red-800 dark:text-red-100 leading-relaxed">
                        현재 패키지 남은 횟수는 <span className="font-semibold">{packageRemaining}회</span>
                        로, 이번 교체에 필요한 횟수(
                        <span className="font-semibold">{requiredPassCount}회</span>
                        )보다 적어 자동 적용되지 않습니다.
                        <br />
                        이번 신청은 일반 교체비 결제로 진행됩니다.
                      </p>
                    ) : usingPackage ? (
                      <p className="mt-2 text-sm text-slate-800 dark:text-slate-50 leading-relaxed">
                        이번 신청에는 패키지가 자동으로 적용됩니다. <span className="font-semibold text-emerald-700 dark:text-emerald-300">교체비는 0원</span>
                        으로 처리되며, 패키지에서 <span className="font-semibold">{requiredPassCount}회</span>가 차감됩니다.
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-slate-800 dark:text-slate-50 leading-relaxed">패키지로 결제할 수 있는 상태입니다. 필요하다면 아래 옵션을 해제하여 이번 신청에도 패키지를 사용할 수 있습니다.</p>
                    )}

                    {/* 숫자 요약 뱃지들 */}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="border-emerald-300/60 text-emerald-700 dark:text-emerald-200">
                        필요 {requiredPassCount}회
                      </Badge>
                      <Badge variant="outline" className="border-emerald-300/60 text-emerald-700 dark:text-emerald-200">
                        잔여 {packagePreview.remaining}회
                      </Badge>
                      {packagePreview.expiresAt && (
                        <Badge variant="outline" className="border-emerald-300/60 text-emerald-700 dark:text-emerald-200">
                          만료일 {new Date(packagePreview.expiresAt).toLocaleDateString('ko-KR')}
                        </Badge>
                      )}
                    </div>

                    {/* 잔여 게이지 */}
                    {(() => {
                      const total = packagePreview.packageSize ?? 0;
                      const remaining = packagePreview.remaining ?? 0;
                      const used = total ? Math.max(0, total - remaining) : 0;
                      const remainPct = total ? Math.round((remaining / total) * 100) : 0;

                      if (!total) return null;

                      return (
                        <div className="mt-4">
                          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                            <span>
                              총 {total}회 중 <span className="font-medium text-slate-700">{used}</span>회 사용
                            </span>
                            <span className="tabular-nums">{remainPct}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                            <div className="h-full bg-emerald-500 dark:bg-emerald-400" style={{ width: `${remainPct}%` }} />
                          </div>
                        </div>
                      );
                    })()}

                    {/* 옵트아웃 체크박스 */}
                    <div className="mt-4 inline-flex items-center gap-2">
                      <Checkbox
                        id="package-optout"
                        checked={!!formData.packageOptOut}
                        disabled={packageInsufficient}
                        onCheckedChange={(v) => {
                          if (packageInsufficient) return; // 부족하면 변경 불가
                          setFormData({ ...formData, packageOptOut: v === true });
                        }}
                        className="h-4 w-4 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <Label htmlFor="package-optout" className={formData.packageOptOut ? 'cursor-pointer text-xs text-slate-500 dark:text-slate-400' : 'cursor-pointer text-xs text-slate-800 dark:text-slate-100'}>
                        이번 신청에는 패키지 <span className="font-medium">사용 안 함</span>
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* 패키지 없음 카드 다크모드 적용 */
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/20 p-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-slate-400/20 dark:bg-slate-600/20 grid place-content-center text-slate-500 dark:text-slate-400">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium dark:text-white">패키지가 없거나 잔여 횟수가 없습니다.</div>
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
                    className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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

                {formData.shippingBank && bankLabelMap[formData.shippingBank] ? (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-4 flex items-center">
                      <CreditCard className="h-5 w-5 mr-2" />
                      계좌 정보
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                        <span className="text-sm text-gray-600 dark:text-gray-300">은행</span>
                        <span className="font-medium text-gray-900 dark:text-white">{bankLabelMap[formData.shippingBank].label}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                        <span className="text-sm text-gray-600 dark:text-gray-300">계좌번호</span>
                        <span className="font-mono font-medium text-gray-900 dark:text-white">{bankLabelMap[formData.shippingBank].account}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                        <span className="text-sm text-gray-600 dark:text-gray-300">예금주</span>
                        <span className="font-medium text-gray-900 dark:text-white">{bankLabelMap[formData.shippingBank].holder}</span>
                      </div>
                    </div>
                  </div>
                ) : null}

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
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-700 dark:text-amber-200">
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
                  {/* 라켓 주문 프리필 배지 */}
                  {orderId && (
                    <div className="mb-6">
                      <div className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-xs text-slate-700">
                        <span className="font-medium text-slate-900">프리필</span>
                        <span className="text-slate-500">라켓 주문</span>
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">{orderId}</code>
                        <span className="text-slate-500">기준으로 고객·배송·접수 방식이 자동 채워졌습니다.</span>
                      </div>
                    </div>
                  )}
                  <form onSubmit={handleSubmit}>
                    {getCurrentStepContent()}

                    {/* 모바일/태블릿: 인라인 요금 요약 (xl 미만에서만 노출) */}
                    <div className="mt-8 xl:hidden">
                      <PriceSummaryCard
                        preferredDate={formData.preferredDate ?? undefined}
                        preferredTime={formData.preferredTime ?? undefined}
                        collectionMethod={formData.collectionMethod as CollectionMethod}
                        stringTypes={formData.stringTypes}
                        usingPackage={priceView.usingPackage}
                        base={summaryBase}
                        pickupFee={priceView.pickupFee}
                        total={checkoutTotal}
                        racketPrice={racketPrice}
                        stringPrice={summaryStringPrice}
                        totalLabel={totalLabel}
                      />
                    </div>

                    {/* 하단 네비게이션 */}
                    <div className="flex justify-between mt-12 pt-8 border-t dark:border-slate-700">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1} className="px-8 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
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
                          disabled={isSubmitting || isOrderSlotBlocked}
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
                  base={summaryBase}
                  pickupFee={priceView.pickupFee}
                  total={checkoutTotal}
                  racketPrice={racketPrice}
                  stringPrice={summaryStringPrice}
                  totalLabel={totalLabel}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
