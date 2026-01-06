'use client';

import type React from 'react';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useSearchParams } from 'next/navigation';
import type { Order } from '@/lib/types/order';
import { ApplyPriceSummaryDesktop, ApplyPriceSummaryMobile } from '@/app/services/apply/_components/ApplyPriceSummary';
import ProgressSteps from '@/app/services/apply/_components/ProgressSteps';
import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';
import OrderPrefillBadge from '@/app/services/apply/_components/OrderPrefillBadge';
import ApplyHero from '@/app/services/apply/_components/ApplyHero';
import { APPLY_STEPS } from '@/app/services/apply/_components/applySteps';
import Step1ApplicantInfo from '@/app/services/apply/_components/steps/Step1ApplicantInfo';
import Step2MountingInfo from '@/app/services/apply/_components/steps/Step2MountingInfo';
import Step3PaymentInfo from '@/app/services/apply/_components/steps/Step3PaymentInfo';
import Step4FinalRequest from '@/app/services/apply/_components/steps/Step4FinalRequest';
import ApplyStepFooter from '@/app/services/apply/_components/steps/ApplyStepFooter';
import { useReservedSlots } from '@/app/services/apply/_hooks/useReservedSlots';

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
  const rentalId = searchParams.get('rentalId');

  // PDP에서 넘어온 상품의 미니 정보(이름, 이미지)
  const [pdpProduct, setPdpProduct] = useState<PdpMiniProduct | null>(null);
  const [isLoadingPdpProduct, setIsLoadingPdpProduct] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isUserLoading, setIsUserLoading] = useState(false);

  const isOrderBased = Boolean(orderId);
  const isRentalBased = Boolean(rentalId);

  // PDP 연동용 (주의: orderId 기반 진입이면 PDP 파라미터는 무시한다)
  const pdpProductId = isOrderBased ? null : searchParams.get('productId');

  /**
   * 옵션 A: 교체 서비스 신청은 "주문(orderId)" 기반으로만 진행합니다.
   * - /services/apply?productId=... 직접 진입은 막고, 상품 상세로 되돌립니다.
   * - (이유) 스트링 금액/요금요약/성공페이지 정합성을 주문 데이터로 보장하기 위함
   */
  useEffect(() => {
    // 주문 기반(orderId)이거나, 대여 기반(rentalId)이면 "직접진입 차단"을 하지 않는다.
    if (isOrderBased || isRentalBased) return;
    if (!pdpProductId) return;

    showErrorToast('교체 서비스 신청은 결제(주문) 이후 진행됩니다. 상품 페이지로 이동합니다.');
    router.replace(`/products/${encodeURIComponent(String(pdpProductId))}`);
  }, [isOrderBased, isRentalBased, pdpProductId, router]);

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

  // 예약 슬롯(마감 시간) 조회/캐시 로직 분리
  const { disabledTimes, timeSlots, slotsLoading, slotsError, hasCacheForDate, refetchDisabledTimesFor } = useReservedSlots<FormData>({
    preferredDate: formData.preferredDate,
    preferredTime: formData.preferredTime,
    requiredPassCount,
    setFormData,
  });

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

    // 주문 안에서 라켓/중고라켓 하나만 있다면 그 이름을 기본값으로 사용 (라인별 기본 라켓명 프리필용)
    let racketNameFromOrder: string | undefined;
    if (isOrderMode && order) {
      const items = (order as any)?.items;
      if (Array.isArray(items)) {
        const racketItems = items.filter((it: any) => it?.kind === 'racket' || it?.kind === 'used_racket');
        if (racketItems.length === 1) {
          const r = racketItems[0] as any;
          racketNameFromOrder = (r.name ?? r.productName ?? '').trim() || undefined;
        }
      }
    }

    stringIds.forEach((prodId, index) => {
      const stringName = getStringName(prodId);
      const lineFee = getMountingFee(prodId);

      if (prodId === 'custom') {
        // 커스텀 stringUseCounts['custom']만큼 라인을 만들어 requiredPassCount/예약 슬롯(cap)/패키지 검증과 일치
        const useQtyRaw = formData.stringUseCounts['custom'];
        const useQty = typeof useQtyRaw === 'number' ? useQtyRaw : 1;

        for (let i = 0; i < Math.max(useQty, 0); i++) {
          lines.push({
            id: `custom-${index}-${i}`,
            racketType: '',
            stringProductId: prodId,
            stringName,
            tensionMain: '',
            tensionCross: '',
            note: formData.requirements,
            mountingFee: lineFee,
          });
        }

        return;
      }

      // 주문 기반(orderId)인 경우: 주문 수량(or 사용자가 조절한 수량)만큼 라인을 만든다.
      if (isOrderMode && order) {
        const found = order.items.find((it) => it.id === prodId);
        const orderQty = found?.quantity ?? 1;
        const useQty = formData.stringUseCounts[prodId] ?? orderQty;

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
        return;
      }

      // 단독/PDP 경로: 선택한 스트링 1개 기준 1라인만 만든다.
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

        // 선택된 항목은 최소 1개 이상 사용하도록 보정 (0개는 검증/라인 생성 불일치의 원인이 됨)
        ids.forEach((id) => {
          const v = nextUseCounts[id];
          if (typeof v !== 'number' || v <= 0) nextUseCounts[id] = 1;
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

    setFormData((prev) => {
      // "선택된 상태에서 0개"는 requiredPassCount/라인 생성/검증 로직과 불일치가 생기기 쉬움
      //    → 0개 이하로 내려가면 해당 스트링은 "선택 해제"로 처리한다.
      if (safe <= 0) {
        const nextTypes = prev.stringTypes.filter((t) => t !== id);
        const { [id]: _removed, ...restCounts } = prev.stringUseCounts;
        return {
          ...prev,
          stringTypes: nextTypes,
          stringUseCounts: restCounts,
        };
      }

      return {
        ...prev,
        stringUseCounts: {
          ...prev.stringUseCounts,
          [id]: safe,
        },
      };
    });
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

  const steps = APPLY_STEPS;
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
          <Step1ApplicantInfo
            formData={formData}
            setFormData={setFormData}
            handleInputChange={handleInputChange}
            handleOpenPostcode={handleOpenPostcode}
            orderId={orderId}
            isMember={isMember}
            isVisitDelivery={isVisitDelivery}
            lockCollection={lockCollection}
            applicationId={applicationId}
            isUserLoading={isUserLoading}
          />
        );
      case 2:
        return (
          <Step2MountingInfo
            formData={formData}
            setFormData={setFormData}
            handleInputChange={handleInputChange}
            fromPDP={fromPDP}
            orderId={orderId}
            pdpProductId={pdpProductId}
            isLoadingPdpProduct={isLoadingPdpProduct}
            pdpProduct={pdpProduct}
            orderRemainingSlots={orderRemainingSlots}
            orderStringService={orderStringService}
            isOrderSlotBlocked={isOrderSlotBlocked}
            order={order}
            lineCount={lineCount}
            price={price}
            priceView={priceView}
            handleStringTypesChange={handleStringTypesChange}
            handleCustomInputChange={handleCustomInputChange}
            handleUseQtyChange={handleUseQtyChange}
            selectedOrderItem={selectedOrderItem}
            isCombinedPdpMode={isCombinedPdpMode}
            pdpStringPrice={pdpStringPrice}
            racketPrice={racketPrice}
            won={won}
            packagePreview={packagePreview}
            canApplyPackage={canApplyPackage}
            packageInsufficient={packageInsufficient}
            packageRemaining={packageRemaining}
            requiredPassCount={requiredPassCount}
            linesForSubmit={linesForSubmit}
            handleLineFieldChange={handleLineFieldChange}
            timeSlots={timeSlots}
            disabledTimes={disabledTimes}
            slotsLoading={slotsLoading}
            hasCacheForDate={hasCacheForDate}
            slotsError={slotsError}
            visitSlotCountUi={visitSlotCountUi}
            visitDurationMinutesUi={visitDurationMinutesUi}
            visitTimeRange={visitTimeRange}
          />
        );

      case 3:
        return (
          <Step3PaymentInfo
            formData={formData}
            setFormData={setFormData}
            handleInputChange={handleInputChange}
            usingPackage={usingPackage}
            packagePreview={packagePreview}
            packageInsufficient={packageInsufficient}
            packageRemaining={packageRemaining}
            requiredPassCount={requiredPassCount}
          />
        );

      case 4:
        return <Step4FinalRequest formData={formData} setFormData={setFormData} handleInputChange={handleInputChange} orderId={orderId} isMember={isMember} usingPackage={usingPackage} packageInsufficient={packageInsufficient} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <ApplyHero />

      {/* Main */}
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-7xl">
          {/* Progress Steps: 폼 폭(800px)에 맞춰 중앙 정렬 */}
          <div ref={stepsRef} className="mb-8">
            <ProgressSteps steps={steps} currentStep={currentStep} />
          </div>

          {/* === 폼만 '진짜' 중앙, 요금카드는 오른쪽에 겹쳐 배치 === */}
          <div className="relative">
            {/* 중앙 메인 폼 */}
            <div className="mx-auto w-full md:w-[800px]">
              <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-2xl">
                <CardContent className="p-8">
                  {/* 라켓 주문 프리필 배지 */}
                  <OrderPrefillBadge orderId={orderId} />
                  <form onSubmit={handleSubmit}>
                    {getCurrentStepContent()}

                    {/* 모바일/태블릿: 인라인 요금 요약 (xl 미만에서만 노출) */}
                    <ApplyPriceSummaryMobile
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

                    {/* 하단 네비게이션 */}
                    <ApplyStepFooter
                      currentStep={currentStep}
                      onPrev={() => setCurrentStep(Math.max(1, currentStep - 1))}
                      onNext={handleNext}
                      isStepValid={isStepValid}
                      isSubmitting={isSubmitting}
                      isOrderSlotBlocked={isOrderSlotBlocked}
                      handleSubmit={handleSubmit}
                    />
                  </form>
                </CardContent>
              </Card>
            </div>

            <ApplyPriceSummaryDesktop
              stickyTop={stickyTop}
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
  );
}
