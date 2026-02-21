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
import Step3PaymentInfoRentalReadonly from '@/app/services/apply/_components/steps/Step3PaymentInfoRentalReadonly';
import Step4FinalRequest from '@/app/services/apply/_components/steps/Step4FinalRequest';
import ApplyStepFooter from '@/app/services/apply/_components/steps/ApplyStepFooter';
import { useReservedSlots } from '@/app/services/apply/_hooks/useReservedSlots';
import LoginGate from '@/components/system/LoginGate';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { File, Grid2X2 } from 'lucide-react';
import { MdSportsTennis } from 'react-icons/md';
import { FullPageSpinner } from '@/components/system/PageLoading';

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
  const mode = searchParams.get('mode');
  const [loading, setLoading] = useState(true);

  // PDP에서 넘어온 상품의 미니 정보(이름, 이미지)
  const [pdpProduct, setPdpProduct] = useState<PdpMiniProduct | null>(null);
  const [isLoadingPdpProduct, setIsLoadingPdpProduct] = useState(false);

  // (비-주문 기반: PDP/대여) 수량 상한 계산에 필요한 실제 데이터
  // - lockedStringStock: 상품(스트링) 재고
  // - lockedRacketQuantity: 라켓 보유 수량(대여 기반에서 의미)
  const [lockedStringStock, setLockedStringStock] = useState<number | null>(null);
  const [lockedRacketQuantity, setLockedRacketQuantity] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [rentalAmount, setRentalAmount] = useState<null | {
    deposit?: number;
    fee?: number;
    stringPrice?: number;
    stringingFee?: number; // 대여 결제에 포함된 교체비(있으면 이 값을 우선 사용)
    total?: number;
  }>(null);

  // 대여 기반 프리필에서 '스트링 변경' CTA 링크를 만들기 위해 보관
  const [rentalRacketId, setRentalRacketId] = useState<string | null>(null);
  const [rentalDays, setRentalDays] = useState<number | null>(null);

  const [isMember, setIsMember] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isUserLoading, setIsUserLoading] = useState(false);

  // 비회원 주문/신청 차단 정책(클라)
  // - NEXT_PUBLIC_GUEST_ORDER_MODE: 'off' | 'legacy' | 'on'
  // - 'on' 일 때만 비회원 허용
  const rawGuestMode = (process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  const guestOrderMode = rawGuestMode === 'off' || rawGuestMode === 'legacy' || rawGuestMode === 'on' ? rawGuestMode : 'legacy';
  const allowGuestCheckout = guestOrderMode === 'on';

  // 로그인 여부(비회원 차단 모드에서만 의미 있음)
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const nextUrl = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `/services/apply?${qs}` : '/services/apply';
  }, [searchParams]);

  const blockedByLoginGate = !allowGuestCheckout && authChecked && !isAuthenticated;

  // 로그인 상태 체크 (비회원 차단 모드에서만 필요)
  // - 체크가 끝나기 전에는 아래 useEffect들이 (redirect/드래프트 생성/프리필 fetch)로 먼저 튀지 않도록 가드한다.
  useEffect(() => {
    if (allowGuestCheckout) {
      setAuthChecked(true);
      setIsAuthenticated(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        const user = await res.json().catch(() => ({}));
        if (cancelled) return;
        setIsAuthenticated(Boolean(user?.email));
      } catch {
        if (cancelled) return;
        setIsAuthenticated(false);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allowGuestCheckout]);

  const isOrderBased = Boolean(orderId);
  const isRentalBased = Boolean(rentalId);

  // PDP 연동용 (주의: orderId 기반 진입이면 PDP 파라미터는 무시한다)
  const pdpProductId = isOrderBased ? null : (searchParams.get('productId') ?? searchParams.get('stringId'));

  /**
   * 옵션 A: 교체 서비스 신청은 "주문(orderId)" 기반으로만 진행합니다.
   * - /services/apply?productId=... 직접 진입은 막고, 상품 상세로 되돌립니다.
   * - (이유) 스트링 금액/요금요약/성공페이지 정합성을 주문 데이터로 보장하기 위함
   */
  useEffect(() => {
    // 게스트 모드 OFF라면 인증 체크가 끝나기 전(또는 로그인 필요 상태)에는 여기 로직을 실행하지 않음
    if (!allowGuestCheckout && !authChecked) return;
    if (blockedByLoginGate) return;

    // 주문 기반(orderId)이거나, 대여 기반(rentalId)이면 "직접진입 차단"을 하지 않는다.
    if (isOrderBased || isRentalBased) return;
    if (!pdpProductId) return;

    showErrorToast('교체 서비스 신청은 결제(주문) 이후 진행됩니다. 상품 페이지로 이동합니다.');
    router.replace(`/products/${encodeURIComponent(String(pdpProductId))}`);
  }, [allowGuestCheckout, authChecked, blockedByLoginGate, isOrderBased, isRentalBased, pdpProductId, router]);

  // null 또는 빈문자열("")이면 NaN 처리, 그 외에는 Number 변환
  const mountingFeeParam = isOrderBased ? null : searchParams.get('mountingFee');
  const pdpMountingFee = mountingFeeParam === null || mountingFeeParam.trim() === '' ? Number.NaN : Number(mountingFeeParam);

  const [fromPDP, setFromPDP] = useState<boolean>(() => Boolean(!isOrderBased && !isRentalBased && pdpProductId));

  // ===== 유틸 =====
  const normalizePhone = (s: string) => (s || '').replace(/[^0-9]/g, '');
  const isValidPhone = (s: string) => /^010\d{8}$/.test(normalizePhone(s));

  /**
   * UI 표시용 연락처 포맷터
   * - 내부 검증/전송은 normalizePhone(숫자만)로 처리
   */
  const formatPhoneForDisplay = (raw: string) => {
    const digits = normalizePhone(raw).slice(0, 11); // 010 + 8자리
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  };

  const stepsRef = useRef<HTMLDivElement | null>(null);
  // 검증 실패 시 "해당 스텝으로 이동 → 첫 오류 필드 focus"를 위해 pending 상태를 보관
  const pendingFocusStepIdRef = useRef<number | null>(null);
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

  /**
   * 2-1) by-rental로 신청서(draft) id 조회
   * - 대여 기반(rentalId) 제출은 서버가 draft를 rentalId로 자동 재사용하지 않음
   * - 따라서 프론트에서 applicationId를 확보해서 submit body에 함께 실어야 "draft 승격(update)"이 됨
   */
  useEffect(() => {
    if (!rentalId) return;
    (async () => {
      try {
        const res = await fetch(`/api/applications/stringing/by-rental/${rentalId}`, {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!res.ok) return; // 404면(초안 없음) → 대여 생성 단계(2단계) 점검 필요
        const data = await res.json();
        if (data?.found) {
          setApplicationId(data.applicationId);
        }
      } catch (e) {
        console.error('[apply] fetch by-rental id failed:', e);
      }
    })();
  }, [rentalId]);

  // PDP 상품 미니 정보 로딩 (이미지/이름/장착비)
  useEffect(() => {
    // rental 기반은 아래 rental prefill 훅에서 mini를 1회만 조회하도록 통일
    if (rentalId) return;

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

          // 현재 가용 재고(관리자 설정 stock) 기억
          // - manageStock=false면 서버에서 null로 내려주도록(아래 mini API diff 참고)
          setLockedStringStock(typeof data.stock === 'number' ? data.stock : null);

          // mountingFee를 formData에 저장
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
  }, [pdpProductId, rentalId]);

  // PDP에서 넘어오면 STEP2 자동 선택 + 장착비 기억 + 플래그 on
  useEffect(() => {
    if (!pdpProductId) return;
    if (isRentalBased) return;

    // 주문 데이터 로딩 완료를 기다림
    if (orderId && !order) return;

    setFormData((prev) => {
      // 이미 같은 상품이 선택되어 있으면 스킵
      if (prev.stringTypes.includes(pdpProductId)) return prev;

      return {
        ...prev,
        stringTypes: [pdpProductId], // 무조건 선택
        stringUseCounts: { ...(prev.stringUseCounts ?? {}), [pdpProductId]: prev.stringUseCounts?.[pdpProductId] ?? 1 },
        pdpMountingFee: Number.isFinite(pdpMountingFee) ? pdpMountingFee : undefined,
      };
    });
    setFromPDP(true);
  }, [pdpProductId, pdpMountingFee, orderId, order, isRentalBased]);

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
      if (!formData.name.trim()) return (toast('신청인 이름을 입력해주세요.'), false);
      if (!formData.email.trim()) return (toast('이메일을 입력해주세요.'), false);
      if (!formData.phone.trim()) return (toast('연락처를 입력해주세요.'), false);
      if (!isValidPhone(formData.phone)) return (toast('올바른 연락처 형식(01012345678)으로 입력해주세요.'), false);

      if (!formData.shippingPostcode.trim()) return (toast('우편번호 찾기를 통해 주소를 등록해주세요.'), false);
      if (!formData.shippingAddress.trim()) return (toast('우편번호 찾기를 통해 주소를 등록해주세요.'), false);

      if (!formData.collectionMethod) return (toast('수거 방식을 선택해주세요.'), false);
      if (formData.collectionMethod === 'courier_pickup') {
        if (!formData.pickupDate) return (toast('수거 희망일을 입력해주세요.'), false);
        if (!formData.pickupTime) return (toast('수거 시간대를 입력해주세요.'), false);
      }
      return true;
    }

    if (step === 2) {
      // if (!formData.racketType.trim()) return toast('라켓 종류를 입력해주세요.'), false;
      if (formData.stringTypes.length === 0) {
        return (toast('스트링 종류를 한 개 이상 선택해주세요.'), false);
      }
      if (formData.stringTypes.includes('custom') && !formData.customStringType.trim()) {
        return (toast('직접 입력한 스트링명을 적어주세요.'), false);
      }

      const isVisit = normalizeCollection(formData.collectionMethod) === 'visit';
      if (isVisit) {
        if (!formData.preferredDate) {
          return (toast('장착 희망일을 선택해주세요.'), false);
        }
        if (!formData.preferredTime) {
          return (toast('희망 시간대를 선택해주세요.'), false);
        }
      }

      // 주문 기반(orderId) 진입이면, 이 주문에서 허용된 남은 교체 횟수(remainingSlots)를 초과 신청할 수 없음
      if (orderId && typeof orderRemainingSlots === 'number') {
        // requiredPassCount = 이번 신청에서 실제로 장착하려는 라켓 수
        if (requiredPassCount > orderRemainingSlots) {
          return (toast(`이 주문에서 남은 교체 가능 횟수는 ${orderRemainingSlots}회입니다. 장착할 라켓 수를 줄여주세요.`), false);
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
            return (toast(`라켓 ${i + 1}의 이름과 메인/크로스 텐션을 모두 입력해주세요.`), false);
          }
        }
      }

      return true;
    }

    if (step === 3) {
      // 대여 기반 신청서는 '대여 결제'에서 이미 결제가 완료됨
      // → 구매 UX처럼 결제 스텝은 유지하되, 입력 검증은 생략
      if (isRentalBased) return true;
      if (!usingPackage) {
        if (!formData.shippingBank) return (toast('은행을 선택해주세요.'), false);
        if (!formData.shippingDepositor.trim()) return (toast('입금자명을 입력해주세요.'), false);
      }
      return true;
    }

    // step 4는 자유 입력
    return true;
  };
  // ===== UX 보강: 첫 오류 필드로 focus 이동 =====
  const focusFirstInvalidField = (stepId: number) => {
    if (typeof document === 'undefined') return;

    const focusEl = (el: HTMLElement) => {
      try {
        // 일부 컴포넌트는 focusable 요소가 내부에 있을 수 있어, 일단 시도
        (el as any).focus?.();
      } catch {
        // ignore
      }
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        // ignore
      }
    };

    const focusById = (id: string) => {
      const el = document.getElementById(id) as HTMLElement | null;
      if (!el) return false;
      // 숨김/비활성 요소는 스킵
      const rects = (el as any).getClientRects?.() as DOMRectList | undefined;
      const isHidden = (el as any).offsetParent === null && (!rects || rects.length === 0);
      if (isHidden) return false;
      focusEl(el);
      return true;
    };

    const focusBySelector = (selector: string) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return false;
      focusEl(el);
      return true;
    };

    // 스텝별 "첫 오류" 위치를 validateStep과 동일한 우선순위로 판정
    const getTarget = (): { id?: string; selector?: string } | null => {
      if (stepId === 1) {
        if (!formData.name.trim()) return { id: 'name' };
        if (!formData.email.trim()) return { id: 'email' };
        if (!formData.phone.trim()) return { id: 'phone' };
        if (!isValidPhone(formData.phone)) return { id: 'phone' };

        if (!formData.shippingPostcode.trim()) return { id: 'shippingPostcode' };
        if (!formData.shippingAddress.trim()) return { id: 'shippingPostcode' };

        if (!formData.collectionMethod) return { selector: 'input[name="collectionMethod"]' };

        if (formData.collectionMethod === 'courier_pickup') {
          if (!formData.pickupDate) return { id: 'pickupDate' };
          if (!formData.pickupTime) return { id: 'pickupTime' };
        }
        return null;
      }

      if (stepId === 2) {
        if (formData.stringTypes.length === 0) {
          return { selector: 'input[type="checkbox"]' };
        }
        if (formData.stringTypes.includes('custom') && !formData.customStringType.trim()) {
          return { selector: 'input[placeholder="직접 입력한 스트링 이름"]' };
        }

        const isVisit = normalizeCollection(formData.collectionMethod) === 'visit';
        if (isVisit) {
          if (!formData.preferredDate) return { id: 'preferredDate' };
          if (!formData.preferredTime) {
            // TimeSlotSelector는 input이 아닌 버튼 리스트이므로, 첫 유효 버튼으로 focus
            return { selector: 'button[aria-pressed]:not([disabled])' };
          }
        }

        if (orderId && typeof orderRemainingSlots === 'number') {
          if (requiredPassCount > orderRemainingSlots) {
            // 수량 조절 입력(숫자)로 유도
            return { selector: 'input[type="number"]' };
          }
        }

        if (linesForSubmit.length > 0) {
          for (let i = 0; i < linesForSubmit.length; i++) {
            const line = linesForSubmit[i];
            const racketName = (line.racketType ?? '').trim();
            const tensionMain = (line.tensionMain ?? '').trim();
            const tensionCross = (line.tensionCross ?? '').trim();

            if (!racketName || !tensionMain || !tensionCross) {
              return { selector: 'input[placeholder="예: 라켓1"]' };
            }
          }
        }
        return null;
      }

      if (stepId === 3) {
        if (isRentalBased) return null;
        if (!usingPackage) {
          if (!formData.shippingBank) return { id: 'shippingBank' };
          if (!formData.shippingDepositor.trim()) return { id: 'shippingDepositor' };
        }
        return null;
      }

      return null;
    };

    const target = getTarget();
    if (!target) return;

    if (target.id && focusById(target.id)) return;
    if (target.selector) focusBySelector(target.selector);
  };

  // “다음” 버튼 disabled 계산용
  const isStepValid = (step: number) => {
    const stepId = steps[step - 1]?.id ?? step;
    const ok = validateStep(stepId, true);
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

  // ---- 이탈(탭 닫기/새로고침) 보호: 입력 중 실수로 나가는 케이스 방지 ----
  const fingerprint = useMemo(() => JSON.stringify(formData), [formData]);
  const baselineRef = useRef<string | null>(null);

  // (프리필/로딩이 끝나기 전에 baseline을 잡으면, 자동 입력 때문에 "변경됨"으로 오인될 수 있음)
  const prefillReady = useMemo(() => {
    if (blockedByLoginGate) return false;
    if (!allowGuestCheckout && !authChecked) return false;
    if (isUserLoading) return false;
    if (isLoadingPdpProduct) return false;
    if (fromPDP && pdpProductId) return formData.stringTypes.includes(pdpProductId);
    return true;
  }, [blockedByLoginGate, allowGuestCheckout, authChecked, isUserLoading, isLoadingPdpProduct, fromPDP, pdpProductId, formData.stringTypes]);

  const isDirty = useMemo(() => baselineRef.current !== null && baselineRef.current !== fingerprint, [fingerprint]);

  useEffect(() => {
    if (!prefillReady) return;
    if (baselineRef.current !== null) return;
    baselineRef.current = fingerprint;
  }, [prefillReady, fingerprint]);

  useUnsavedChangesGuard(isDirty);

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
  // ※ 대여 기반 신청서는 '대여 결제'에서 이미 결제가 완료되므로 패키지(교체권) 적용을 허용하지 않음
  const canApplyPackage = !!(!isRentalBased && packagePreview?.has && requiredPassCount > 0 && packageRemaining >= requiredPassCount);

  // 실제로 이번 신청에서 패키지를 사용하는지 여부(옵트아웃까지 반영)
  const usingPackage = !!(!isRentalBased && canApplyPackage && !formData.packageOptOut);

  // (비-주문 기반) 실제로 허용 가능한 최대 수량
  // - 기준이 2개면 min() (예: 스트링 재고 3, 라켓 수량 2 → max=2)
  const maxNonOrderQty = useMemo(() => {
    // 주문 기반이면 기존 로직(주문수량/remainingSlots)이 상한이므로 여기선 사용 X
    if (orderId && order) return null;

    const candidates: number[] = [];
    if (typeof lockedStringStock === 'number' && lockedStringStock > 0) candidates.push(lockedStringStock);
    if (isRentalBased && typeof lockedRacketQuantity === 'number' && lockedRacketQuantity > 0) candidates.push(lockedRacketQuantity);

    if (!candidates.length) return null; // 상한 정보를 못 얻으면(= manageStock false 등) 제한을 강제하지 않음
    return Math.max(1, Math.min(...candidates));
  }, [orderId, order, lockedStringStock, lockedRacketQuantity, isRentalBased]);

  // 재고/수량 정보가 로딩된 뒤, 현재 입력값이 상한을 넘으면 강제로 보정(clamp)
  useEffect(() => {
    if (orderId && order) return;
    if (typeof maxNonOrderQty !== 'number') return;

    setFormData((prev) => {
      if (!prev.stringTypes?.length) return prev;

      const next = { ...(prev.stringUseCounts ?? {}) };
      prev.stringTypes.forEach((id) => {
        const cur = typeof next[id] === 'number' ? next[id] : 1;
        next[id] = Math.min(Math.max(cur, 1), maxNonOrderQty);
      });

      return { ...prev, stringUseCounts: next };
    });
  }, [maxNonOrderQty, orderId, order]);

  // 패키지가 있지만, 이번 신청에 필요한 횟수보다 적게 남은 경우
  const packageInsufficient = !!(!isRentalBased && packagePreview?.has && requiredPassCount > 0 && packageRemaining < requiredPassCount);

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
  }, [formData, orderId, order, usingPackage]);

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

    // PDP 통합(번들) 주문도 포함해서, 실제 전송 라인은 stringUseCounts를 기준으로 만든다.
    // - 번들 주문에서 수량 잠금 여부는 Step2에서 remainingSlots를 보고 결정한다.
    //   (잠김 상태면 stringUseCounts가 주문 수량과 자동 동기화됨)
    const isBundleOrder = (() => {
      if (!isOrderMode || !order) return false;
      const items = (order as any)?.items;
      if (!Array.isArray(items)) return false;

      const hasRacket = items.some((it: any) => it?.kind === 'racket' || it?.kind === 'used_racket');
      const hasMountableString = items.some((it: any) => it?.kind === 'product' && typeof it?.mountingFee === 'number' && it.mountingFee > 0);

      return hasRacket && hasMountableString;
    })();

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

      // 단독/PDP 경로: 선택한 스트링 1개 기준 1라인
      const useQty = formData.stringUseCounts[prodId] ?? 1;

      for (let i = 0; i < useQty; i++) {
        const alias = (formData.racketType || '').trim() || `라켓 ${lines.length + 1}`;

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
    });
    return lines;
  }, [formData.lines, formData.stringTypes, formData.stringUseCounts, formData.racketType, formData.requirements, priceView.base, order, orderId, pdpProductId, pdpProduct, pdpMountingFee]);

  // 4. 디버깅 콘솔 로그 (개발 환경에서만)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    console.log('Debug Info:', {
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

  // PDP 통합(번들) 주문인지 여부: "라켓 + (장착비가 있는 스트링 상품)"이 함께 결제된 주문
  // - 이 경우 (라켓 수량 = 스트링 수량 = 신청 라인 수) 정합성이 핵심이라 Step2에서 수량을 잠그는 용도로 사용
  const isCombinedPdpMode = useMemo(() => {
    if (!orderId || !order) return false;
    const items = (order as any)?.items;
    if (!Array.isArray(items)) return false;
    const hasRacket = items.some((it: any) => it?.kind === 'racket' || it?.kind === 'used_racket');
    const hasMountableString = items.some((it: any) => it?.kind === 'product' && Number(it?.mountingFee ?? 0) > 0);
    return hasRacket && hasMountableString;
  }, [orderId, order]);

  // 대여용 계산값 1
  const rentalRacketPrice = useMemo(() => {
    if (!isRentalBased) return 0;
    const d = Number(rentalAmount?.deposit ?? 0);
    const f = Number(rentalAmount?.fee ?? 0);
    return d + f;
  }, [isRentalBased, rentalAmount]);

  // 대여용 계산값 2
  const rentalStringPrice = useMemo(() => {
    if (!isRentalBased) return 0;
    const a = Number(rentalAmount?.stringPrice ?? 0);
    if (a > 0) return a;
    // amount에 없으면 mini price로 fallback
    const p = typeof pdpProduct?.price === 'number' ? pdpProduct.price : 0;
    return Number(p ?? 0);
  }, [isRentalBased, rentalAmount, pdpProduct]);

  // 교체비(서비스비) 부분
  const summaryBase = price; // linesForSubmit 기반 교체비 총합

  // 대여 기반: 교체비(이미 결제된 값)를 우선 사용
  // - amount.stringingFee가 있으면 그 값을 신뢰(결제 당시 스냅샷)
  // - 없으면 (하위호환) 현재 apply 계산값(summaryBase)을 fallback
  const rentalStringingFee = useMemo(() => {
    if (!isRentalBased) return 0;
    const v = Number((rentalAmount as any)?.stringingFee ?? 0);
    if (Number.isFinite(v) && v > 0) return v;
    return Number.isFinite(summaryBase) ? summaryBase : 0;
  }, [isRentalBased, rentalAmount, summaryBase]);

  const rentalPaidTotal = useMemo(() => {
    if (!isRentalBased) return 0;
    return rentalRacketPrice + rentalStringPrice + rentalStringingFee;
  }, [isRentalBased, rentalRacketPrice, rentalStringPrice, rentalStringingFee]);

  // racketPrice: 주문 기반일 때만 의미가 있으니 그대로 사용(이미 0/양수로 잘 계산됨)
  const summaryRacketPrice = isOrderBased ? racketPrice : isRentalBased ? rentalRacketPrice : 0;

  // 라벨도 케이스별로
  const totalLabel = isOrderBased ? '이번 주문 총 결제 금액' : isRentalBased ? '대여 결제 완료 금액' : fromPDP ? '이번 신청 예상 결제 금액' : '이번 교체 서비스 예상 비용';

  /** PDP에서 넘어온 스트링 상품 금액 (없으면 0원) */
  const pdpStringPrice = isCombinedPdpMode && pdpProduct && typeof pdpProduct.price === 'number' ? pdpProduct.price : 0;
  // stringPrice: 주문 기반이면 주문에서, 아니면 PDP에서(기존 유지)
  const summaryStringPrice = isOrderBased ? orderStringPrice : isRentalBased ? rentalStringPrice : pdpStringPrice;

  // 요금요약 카드에 보여줄 base/total은 케이스별로 분리
  const summaryBaseForCard = isRentalBased ? rentalStringingFee : summaryBase;

  // 패키지면 0, 아니면 교체비 그대로
  const serviceCost = priceView.usingPackage ? 0 : summaryBase;

  // 기존 그대로: 패키지면 교체비 0
  const baseTotal = serviceCost;

  // 합계: 주문 기반(or PDP 기반 or 대여 기반)일 때 라켓/스트링을 합산
  const checkoutTotal = isRentalBased
    ? rentalPaidTotal // 대여 기반은 “이미 결제된 합계”로 고정
    : isOrderBased || fromPDP
      ? baseTotal + summaryRacketPrice + summaryStringPrice
      : baseTotal;
  // 스트링 포함 여부(라벨/설명용)
  const stringIncludedForCard = isOrderBased || isRentalBased;
  // 헤더 안내문(혼선 방지)
  const headerHintForCard = isRentalBased ? '대여 결제 기준으로 표시됩니다' : isOrderBased ? '주문 결제 금액 기준으로 표시됩니다' : undefined;

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
    if (fromPDP && !orderId && !rentalId) return;

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
      const baseLines = Array.isArray(prev.lines) && prev.lines.length > 0 ? prev.lines : (linesForSubmit ?? []);

      const nextLines = baseLines.map((line, i) => (i === index ? { ...line, [field]: value } : line));

      // 첫 번째 라인의 텐션을 "기본값"으로 들고 가고 싶을 때 (선택)
      const next: FormData = { ...prev, lines: nextLines };
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
    // 번들(라켓+스트링) 주문이라도 remainingSlots < 주문수량(=부분 사용/재신청)이면 수량 조절이 필요하므로 잠금하지 않는다.
    // - remainingSlots 정보가 없으면(구버전/예외) 기존처럼 잠금
    if (orderId && order && isCombinedPdpMode) {
      if (typeof orderRemainingSlots !== 'number') return;

      const ids = (formData.stringTypes ?? []).filter((t) => t && t !== 'custom');
      const sumOrderQty = ids.reduce((sum, sid) => {
        const found = order.items.find((it) => it.id === sid);
        const q = Number((found as any)?.quantity ?? 0);
        return sum + (Number.isFinite(q) ? q : 0);
      }, 0);

      // 주문 수량을 못 구하면 안전하게 잠금
      if (!Number.isFinite(sumOrderQty) || sumOrderQty <= 0) return;

      // remainingSlots가 주문 수량과 동일할 때만 잠금
      if (orderRemainingSlots === sumOrderQty) return;
    }

    const raw = Number.isFinite(value) ? value : 0;
    const min = 0;
    let max: number;

    // 1) 주문 기반
    if (orderId && order) {
      if (id === 'custom') {
        max = 99;
      } else {
        const item = order.items.find((it) => it.id === id);
        max = item?.quantity ?? 1;
      }

      if (typeof orderRemainingSlots === 'number') {
        const otherTotal = Object.entries(formData.stringUseCounts)
          .filter(([key]) => key !== id)
          .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0);
        const remainForThis = Math.max(orderRemainingSlots - otherTotal, 0);
        max = Math.min(max, remainForThis);
      }
    }
    // 2) 비-주문 기반(PDP/대여): "관리자 재고/수량" 기반 상한 적용
    else {
      if (id === 'custom') {
        max = 99; // 커스텀은 재고 개념이 없으니 기존 유지
      } else {
        // maxNonOrderQty가 있으면 그게 절대 상한
        max = typeof maxNonOrderQty === 'number' ? maxNonOrderQty : 99;
      }
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
      setRentalRacketId(null);
      setRentalDays(null);
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
      setRentalRacketId(null);
      setRentalDays(null);
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

  /**
   * 대여 기반(rentalId) 프리필
   * - /api/rentals/[id]에서 선택 스트링(stringing.stringId)을 읽어와 stringTypes를 세팅
   * - /api/products/[id]/mini로 mountingFee를 가져와 pdpMountingFee에 저장
   *   (※ apply 페이지의 기존 가격 계산 로직은 "orderId가 없을 때 pdpMountingFee"를 우선 사용하므로
   *    rental 기반에서도 교체비가 정확히 계산.)
   *
   * 주의:
   * - orderId 기반 프리필과 충돌하지 않도록 orderId가 있으면 실행X
   * - 로그인 회원은 아래 "주문서 없는 단독 신청" 훅(/api/users/me)이 이미 주소까지 채워줄 수 있으므로,
   *   rental 프리필은 필수 항목(스트링 선택/신청자 정보) 위주로만 안전하게 보완.
   */
  useEffect(() => {
    if (!rentalId) return;
    if (orderId) return; // orderId가 있으면 order 기반이 우선

    let cancelled = false;

    (async () => {
      setIsUserLoading(true);
      setRentalRacketId(null);
      setRentalDays(null);
      try {
        const res = await fetch(`/api/rentals/${encodeURIComponent(rentalId)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return;

        const rental = await res.json().catch(() => ({}) as any);
        setRentalAmount((rental as any)?.amount ?? null);

        // 대여 라켓/기간 정보는 '스트링 변경' CTA 링크에 사용
        const rid = String((rental as any)?.racketId ?? (rental as any)?.racket?._id ?? '');
        setRentalRacketId(rid && rid !== 'undefined' ? rid : null);
        const daysNum = Number((rental as any)?.days);
        setRentalDays(Number.isFinite(daysNum) && daysNum > 0 ? daysNum : null);
        if (cancelled) return;

        // 라켓 수량(대여 기반에서 수량 상한 계산용)
        // rental 응답 구조가 다를 수 있어 방어적으로 탐색
        const rq = Number((rental as any)?.racket?.quantity) || Number((rental as any)?.racketQuantity) || Number((rental as any)?.quantity) || 1;
        setLockedRacketQuantity(Number.isFinite(rq) && rq > 0 ? rq : 1);

        // 수거 방식(교체 신청서용) 프리필
        // - 대여 체크아웃에서 방문수령(매장 픽업)이면, 교체 신청서도 'visit' 기본값으로 맞춘다
        // - apply 페이지의 방문시간(step2)은 collectionMethod='visit' 일 때만 자연스럽게 열리므로, 여기서 먼저 정렬
        setFormData((prev) => {
          // 사용자가 이미 수거 방식을 바꿨다면(= 기본값이 아닌 상태), 서버/프리필로 덮어쓰지 않는다
          if (prev.collectionMethod !== 'self_ship') return prev;

          const rentalShippingMethod = String((rental as any)?.shipping?.shippingMethod ?? '');
          const rentalPickupMethod = String((rental as any)?.servicePickupMethod ?? '');

          const isVisit =
            // 대여 주문에 pickup(매장수령)로 저장된 경우
            rentalShippingMethod === 'pickup' ||
            // 일부 흐름에서 visit로 저장되는 경우까지 방어
            rentalShippingMethod === 'visit' ||
            // rental_orders.servicePickupMethod가 pickup or SHOP_VISIT로 저장된 경우까지 방어
            rentalPickupMethod === 'pickup' ||
            rentalPickupMethod === 'SHOP_VISIT';

          if (!isVisit) return prev;
          return { ...prev, collectionMethod: 'visit' };
        });

        // 라켓 타입 프리필 (대여 라켓 brand/model 기반)
        const rentalRacketType = [rental?.brand, rental?.model].filter(Boolean).join(' ').trim();
        if (rentalRacketType) {
          setFormData((prev) => (prev.racketType ? prev : { ...prev, racketType: rentalRacketType }));
        }

        // 1) 신청자 정보(가능한 범위에서만 보완)
        if (rental?.user?.email) {
          setIsMember(true);
          setFormData((prev) => ({
            ...prev,
            // 비어있을 때만 채우기(사용자 입력/기존 프리필을 덮어쓰지 않기)
            name: prev.name || rental.user.name || '',
            email: prev.email || rental.user.email || '',
            phone: prev.phone || rental.user.phone || '',
            shippingName: prev.shippingName || rental.user.name || '',
            shippingEmail: prev.shippingEmail || rental.user.email || '',
            shippingPhone: prev.shippingPhone || rental.user.phone || '',
          }));
        }

        // 2) 스트링 선택 프리필
        const sid = rental?.stringing?.requested ? rental?.stringing?.stringId : null;
        if (!sid) return;

        const stringId = String(sid);
        setFormData((prev) => {
          // 이미 선택되어 있으면 그대로 유지
          if (prev.stringTypes.includes(stringId)) return prev;
          return {
            ...prev,
            stringTypes: [stringId],
            // 수량/라인 로직은 기존 방식 유지 (기본 1회)
            stringUseCounts: { ...prev.stringUseCounts, [stringId]: prev.stringUseCounts[stringId] ?? 1 },
          };
        });

        // 3) mountingFee 확보(교체비 계산 근거) + 미니 상품 정보 세팅
        setIsLoadingPdpProduct(true);
        try {
          const miniRes = await fetch(`/api/products/${encodeURIComponent(stringId)}/mini`, { cache: 'no-store' });
          const mini = await miniRes.json().catch(() => ({}) as any);
          if (!cancelled && mini?.ok) {
            setPdpProduct({
              name: mini.name,
              image: mini.image ?? null,
              price: typeof mini.price === 'number' ? mini.price : undefined,
            });
            if (typeof mini.mountingFee === 'number') {
              setFormData((prev) => ({ ...prev, pdpMountingFee: mini.mountingFee }));
            }
            // 현재 가용 재고(관리자 설정 stock) 기억
            setLockedStringStock(typeof mini.stock === 'number' ? mini.stock : null);
          }
        } finally {
          if (!cancelled) setIsLoadingPdpProduct(false);
        }
      } catch (e) {
        console.error('[apply][rental prefill] failed:', e);
      } finally {
        if (!cancelled) setIsUserLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rentalId, orderId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    const rawValue = e.target.value;

    // 연락처는 입력 UX를 위해 자동 포맷(010 0000 0000) 적용
    const value = name === 'phone' || name === 'shippingPhone' ? formatPhoneForDisplay(rawValue) : rawValue;

    setFormData((prev) => {
      /**
       * 주의/의도:
       * - 현재 Step1 UI는 신청자(name/email/phone)만 직접 입력받고,
       *   제출 payload는 shippingInfo.name/phone/email을 별도로 사용.
       * - 비회원/비주문 기반 진입에서는 shippingName/Phone/Email이 비어갈 수 있으므로,
       *   신청자 입력값을 shippingInfo에도 동기화해서 데이터 정합성을 보장
       * - 추후 shippingName/Phone/Email을 별도 입력 UI로 분리할 경우, 이 동기화 로직은 재검토가 필요
       */
      const next: any = { ...prev, [name]: value };

      if (name === 'name') next.shippingName = value;
      if (name === 'email') next.shippingEmail = value;
      if (name === 'phone') next.shippingPhone = value;

      return next;
    });
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

  // 구매 UX와 동일한 체감: 대여 기반도 스텝 구성을 동일하게 유지(결제 스텝 포함)
  // 단, 대여 기반은 결제 입력이 아니라 '결제 완료/확인' 단계.
  const steps = useMemo(() => {
    if (!isRentalBased) return APPLY_STEPS;
    return APPLY_STEPS.map((s) => (s.id === 3 ? { ...s, description: '결제 내역을 확인해주세요' } : s));
  }, [isRentalBased]);
  const totalSteps = steps.length;
  const currentStepId = steps[currentStep - 1]?.id ?? steps[0]?.id ?? 1;

  // 스텝 이동(재검증 실패) 이후 렌더 반영이 끝나면 첫 오류 필드에 focus
  useEffect(() => {
    const pending = pendingFocusStepIdRef.current;
    if (!pending) return;
    if (pending !== currentStepId) return;

    pendingFocusStepIdRef.current = null;

    window.setTimeout(() => {
      focusFirstInvalidField(pending);
    }, 30);
  }, [currentStepId]);

  const doSubmit = async () => {
    // 마지막 단계(4단계)가 아니면 제출하지 않음
    if (currentStep !== steps.length) return;

    // 마지막 단계 직전까지 전부 재검증: 실패 스텝으로 이동
    for (let idx = 1; idx <= totalSteps - 1; idx++) {
      const stepId = steps[idx - 1]?.id ?? idx;
      if (!validateStep(stepId, false)) {
        pendingFocusStepIdRef.current = stepId;
        setCurrentStep(idx);
        return;
      }
    }

    // 연락처 정제(전송용)
    const cleanedApplicantPhone = normalizePhone(formData.phone);

    // shippingInfo 정합성 보장: 비어 있으면 신청자 정보로 fallback
    const shippingName = (formData.shippingName || formData.name || '').trim();
    const shippingEmail = (formData.shippingEmail || formData.email || '').trim();
    const shippingPhone = normalizePhone(formData.shippingPhone || formData.phone);

    setIsSubmitting(true);
    // 이하 payload 생성/POST 로직은 그대로 유지

    const payload = {
      /**
       * 중요:
       * - orderId 기반은 서버가 draft를 orderId로 찾아 승격할 수 있지만,
       * - rentalId 기반은 서버가 draft를 rentalId로 자동 탐색/재사용하지 않으므로
       *   applicationId(=draft _id)를 반드시 함께 보내야 한다.
       */
      applicationId: applicationId ?? undefined,
      name: formData.name,
      email: formData.email,
      phone: cleanedApplicantPhone,
      racketType: formData.racketType,
      stringTypes: formData.stringTypes,
      customStringName: formData.stringTypes.includes('custom') ? formData.customStringType : null,
      preferredDate: formData.preferredDate,
      preferredTime: formData.preferredTime,
      requirements: formData.requirements,
      // 대여 기반 신청서는 결제가 이미 완료되어 있어 패키지 적용을 허용하지 않음
      packageOptOut: isRentalBased ? true : !!formData.packageOptOut,
      orderId,
      rentalId,
      shippingInfo: {
        name: shippingName,
        phone: shippingPhone,
        email: shippingEmail,
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
          const data = await res.json().catch(() => ({}) as any);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void doSubmit();
  };

  const handleNext = () => {
    // 대여 모드에서도 올바른 stepId 검증
    if (!validateStep(currentStepId, false)) {
      focusFirstInvalidField(currentStepId);
      return;
    }
    setCurrentStep((s) => Math.min(totalSteps, s + 1));
  };

  // 방문 수령 여부(한글/영문 데이터 모두 허용)
  const isVisitDelivery = (order?.shippingInfo as any)?.deliveryMethod === '방문수령' || order?.shippingInfo?.shippingMethod === 'visit'; // 방문이면 매장만 선택 가능
  // 주문 기반 진입 시(= orderId 존재)에는 수거 방식 전체 잠금
  const lockCollection = Boolean(orderId || rentalId);

  const getCurrentStepContent = () => {
    switch (currentStepId) {
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
            rentalId={rentalId}
            rentalRacketId={rentalRacketId}
            rentalDays={rentalDays}
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
            lockedStringStock={lockedStringStock}
            lockedRacketQuantity={lockedRacketQuantity}
            maxNonOrderQty={maxNonOrderQty}
          />
        );

      case 3:
        return isRentalBased ? (
          <Step3PaymentInfoRentalReadonly
            won={won}
            deposit={Number(rentalAmount?.deposit ?? 0)}
            fee={Number(rentalAmount?.fee ?? 0)}
            stringPrice={Number(rentalAmount?.stringPrice ?? 0)}
            stringingFee={Number(rentalAmount?.stringingFee ?? 0)}
            total={Number(rentalAmount?.total ?? checkoutTotal)}
            // rentalId={rentalId}
          />
        ) : (
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

  // ===== 비회원 주문/신청 차단(LoginGate) =====
  // - 게스트 모드가 꺼져 있을 때: 인증 체크 완료 후 미로그인이라면 LoginGate로 진입 차단
  if (!allowGuestCheckout && !authChecked) {
    return <FullPageSpinner label="로그인 상태 확인 중..." />;
  }

  if (blockedByLoginGate) return <LoginGate next={nextUrl} variant="default" />;

  const shouldShowEntryChooser = !isOrderBased && !isRentalBased && !pdpProductId && mode !== 'single';

  if (shouldShowEntryChooser)
    return (
      <div className="min-h-full bg-card dark:bg-card bp-lg:bg-background bp-lg:from-background bp-lg:via-muted bp-lg: bp-lg:dark:from-background bp-lg:dark:via-muted bp-lg:dark:to-card">
        {/* Hero Section */}
        <ApplyHero />

        {/* Main Content */}
        <div className="px-3 bp-sm:px-4 bp-md:px-6 bp-lg:px-6 mx-auto bp-lg:max-w-[1200px] py-8 bp-sm:py-12 bp-lg:py-16">
          {/* Section Header */}
          <div className="text-center mb-8 bp-sm:mb-10">
            <h2 className="text-xl bp-sm:text-2xl font-semibold text-foreground dark:text-foreground">어떤 방식으로 진행할까요?</h2>
            <p className="mt-2 text-muted-foreground dark:text-muted-foreground text-sm bp-sm:text-base">원하는 방식을 선택해주세요</p>
          </div>

          {/* Option Cards */}
          <div className="grid grid-cols-1 bp-md:grid-cols-3 gap-4 bp-sm:gap-5 bp-lg:gap-6 max-w-5xl mx-auto">
            {/* Option 1: 스트링 구매하고 신청 */}
            <button
              type="button"
              onClick={() => router.push('/products?from=apply')}
              className="group relative bg-card dark:bg-card rounded-2xl p-5 bp-sm:p-6 text-left border border-border dark:border-border hover:border-border dark:hover:border-border transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950"
            >
              {/* Recommended Badge */}
              <div className="absolute -top-2.5 left-5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-card dark:bg-card text-foreground dark:text-foreground">추천</span>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 bp-sm:w-14 bp-sm:h-14 rounded-xl bg-background dark:bg-card flex items-center justify-center mb-4 group-hover:bg-muted dark:group-hover:bg-card transition-colors">
                <Grid2X2 className="h-8 w-8" />
              </div>

              {/* Content */}
              <h3 className="text-base bp-sm:text-lg font-semibold text-foreground dark:text-foreground mb-1.5">스트링 구매하고 신청</h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed">스트링 결제 후 신청서가 자동으로 연결돼요</p>

              {/* Arrow indicator */}
              <div className="mt-5 flex items-center text-sm font-medium text-muted-foreground dark:text-muted-foreground group-hover:text-foreground dark:group-hover:text-foreground transition-colors">
                <span>스트링 보러가기</span>
                <svg className="ml-1.5 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </button>

            {/* Option 2: 라켓 고르고 신청 */}
            <div className="relative bg-card dark:bg-card rounded-2xl p-5 bp-sm:p-6 text-left border border-border dark:border-border hover:border-border dark:hover:border-border transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50">
              {/* Recommended Badge */}
              <div className="absolute -top-2.5 left-5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-card dark:bg-card text-foreground dark:text-foreground">추천</span>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 bp-sm:w-14 bp-sm:h-14 rounded-xl bg-background dark:bg-card flex items-center justify-center mb-4">
                <MdSportsTennis className="h-9 w-9" />
              </div>

              {/* Content */}
              <h3 className="text-base bp-sm:text-lg font-semibold text-foreground dark:text-foreground mb-1.5">라켓 고르고 신청</h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed mb-5">구매·대여 후 스트링까지 함께 신청해요</p>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/rackets?from=apply')}
                  className="flex-1 px-3 py-2 bp-sm:py-2.5 text-sm font-medium rounded-lg bg-background dark:bg-card text-foreground hover:bg-muted dark:hover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:focus-visible:ring-ring"
                >
                  라켓 구매
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/rackets?from=apply&rentOnly=1')}
                  className="flex-1 px-3 py-2 bp-sm:py-2.5 text-sm font-medium rounded-lg bg-background dark:bg-card text-foreground hover:bg-muted dark:hover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:focus-visible:ring-ring"
                >
                  라켓 대여
                </button>
              </div>
            </div>

            {/* Option 3: 신청서만 작성 */}
            <button
              type="button"
              onClick={() => router.push('/services/apply?mode=single')}
              className="group relative bg-card dark:bg-card rounded-2xl p-5 bp-sm:p-6 text-left border border-border dark:border-border hover:border-border dark:hover:border-border transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950"
            >
              {/* Badge */}
              <div className="absolute -top-2.5 left-5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted dark:bg-card text-muted-foreground dark:text-muted-foreground">직접입력</span>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 bp-sm:w-14 bp-sm:h-14 rounded-xl bg-background dark:bg-card flex items-center justify-center mb-4 group-hover:bg-muted dark:group-hover:bg-card transition-colors">
                <File className="h-9 w-9" />
              </div>

              {/* Content */}
              <h3 className="text-base bp-sm:text-lg font-semibold text-foreground dark:text-foreground mb-1.5">신청서만 작성</h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed">이미 라켓·스트링이 있다면 바로 작성해요</p>
              <p className="mt-1 text-xs text-primary dark:text-primary">금액·결제정보 자동 반영 없음</p>

              {/* Arrow indicator */}
              <div className="mt-4 flex items-center text-sm font-medium text-muted-foreground dark:text-muted-foreground group-hover:text-foreground dark:group-hover:text-foreground transition-colors">
                <span>단독 신청하기</span>
                <svg className="ml-1.5 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </button>
          </div>

          {/* Info Banner */}
          <div className="mt-6 bp-sm:mt-8 max-w-5xl mx-auto">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-background dark:bg-card border border-border dark:border-border">
              <svg className="w-5 h-5 text-muted-foreground dark:text-muted-foreground flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed">
                결제(주문) 이후 신청으로 진행하면 <span className="font-medium text-foreground">금액·결제정보가 자동 반영</span>되어 실수 가능성이 줄어들어요.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="my-8 bp-sm:my-10 max-w-5xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border dark:border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background dark:bg-card px-4 text-sm text-muted-foreground dark:text-muted-foreground">또는</span>
              </div>
            </div>
          </div>

          {/* Orders/Rentals Section */}
          <div className="max-w-5xl mx-auto">
            <div className="bg-card dark:bg-card rounded-2xl p-5 bp-sm:p-6 border border-border dark:border-border">
              <div className="flex flex-col bp-sm:flex-row bp-sm:items-center bp-sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-5 h-5 text-muted-foreground dark:text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                      />
                    </svg>
                    <h3 className="text-base bp-sm:text-lg font-semibold text-foreground dark:text-foreground">내 주문/대여 내역에서 이어서</h3>
                  </div>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">마이페이지에서 주문/대여를 선택하면 신청서로 자동 연결돼요</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.push('/mypage?tab=orders')}
                    className="flex-1 bp-sm:flex-none px-4 py-2.5 text-sm font-medium rounded-lg border border-border dark:border-border text-foreground hover:bg-background dark:hover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:focus-visible:ring-ring"
                  >
                    주문 내역
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/mypage?tab=rentals')}
                    className="flex-1 bp-sm:flex-none px-4 py-2.5 text-sm font-medium rounded-lg border border-border dark:border-border text-foreground hover:bg-background dark:hover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:focus-visible:ring-ring"
                  >
                    대여 내역
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-full bg-card dark:bg-card bp-lg:bg-background bp-lg:from-background bp-lg:via-muted bp-lg: bp-lg:dark:from-background bp-lg:dark:via-muted bp-lg:dark:to-card">
      {/* Hero Section */}
      <ApplyHero />

      {/* Main */}
      <div className="container mx-auto px-4 py-8 bp-sm:py-12">
        <div className="mx-auto max-w-7xl">
          {/* Progress Steps: 폼 폭(800px)에 맞춰 중앙 정렬 */}
          <div ref={stepsRef} className="mb-6 bp-sm:mb-8">
            <ProgressSteps steps={steps} currentStep={currentStep} />
          </div>

          {/* === 폼만 '진짜' 중앙, 요금카드는 오른쪽에 겹쳐 배치 === */}
          <div className="relative">
            {/* 중앙 메인 폼 */}
            <div className="mx-auto w-full md:w-[800px]">
              <Card className="bg-card dark:bg-card bp-lg:backdrop-blur-sm bp-lg:bg-card/80 bp-lg:dark:bg-card border border-border dark:border-border bp-lg:border-0 shadow-sm bp-lg:shadow-2xl">
                <CardContent className="p-4 bp-sm:p-6 bp-lg:p-8">
                  {/* 라켓 주문 프리필 배지 */}
                  <OrderPrefillBadge orderId={orderId} rentalId={rentalId} />

                  <form onSubmit={handleSubmit}>
                    {getCurrentStepContent()}

                    {/* 모바일/태블릿: 인라인 요금 요약 (xl 미만에서만 노출) */}
                    <ApplyPriceSummaryMobile
                      preferredDate={formData.preferredDate ?? undefined}
                      preferredTime={formData.preferredTime ?? undefined}
                      collectionMethod={formData.collectionMethod as CollectionMethod}
                      stringTypes={formData.stringTypes}
                      stringIncluded={stringIncludedForCard}
                      headerHint={headerHintForCard}
                      usingPackage={isRentalBased ? false : priceView.usingPackage}
                      base={summaryBaseForCard}
                      pickupFee={priceView.pickupFee}
                      total={checkoutTotal}
                      racketPrice={isRentalBased ? 0 : summaryRacketPrice}
                      rentalDeposit={isRentalBased ? Number(rentalAmount?.deposit ?? 0) : undefined}
                      rentalFee={isRentalBased ? Number(rentalAmount?.fee ?? 0) : undefined}
                      stringPrice={summaryStringPrice}
                      totalLabel={totalLabel}
                    />

                    {/* 하단 네비게이션 */}
                    <ApplyStepFooter
                      currentStep={currentStep}
                      totalSteps={totalSteps}
                      onPrev={() => setCurrentStep(Math.max(1, currentStep - 1))}
                      onNext={handleNext}
                      isStepValid={isStepValid}
                      isSubmitting={isSubmitting}
                      isOrderSlotBlocked={isOrderSlotBlocked}
                      handleSubmit={doSubmit}
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
              stringIncluded={stringIncludedForCard}
              headerHint={headerHintForCard}
              usingPackage={isRentalBased ? false : priceView.usingPackage}
              base={summaryBaseForCard}
              pickupFee={priceView.pickupFee}
              total={checkoutTotal}
              racketPrice={isRentalBased ? 0 : summaryRacketPrice}
              rentalDeposit={isRentalBased ? Number(rentalAmount?.deposit ?? 0) : undefined}
              rentalFee={isRentalBased ? Number(rentalAmount?.fee ?? 0) : undefined}
              stringPrice={summaryStringPrice}
              totalLabel={totalLabel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
