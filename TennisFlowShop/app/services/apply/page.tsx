'use client';

import type React from 'react';

import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';
import useStringingApplySharedState, { type ApplicationLine, type ApplyFormData, type CollectionMethod } from '@/app/features/stringing-applications/hooks/useStringingApplySharedState';
import ApplyHero from '@/app/services/apply/_components/ApplyHero';
import { ApplyPriceSummaryDesktop, ApplyPriceSummaryMobile } from '@/app/services/apply/_components/ApplyPriceSummary';
import { APPLY_STEPS } from '@/app/services/apply/_components/applySteps';
import OrderPrefillBadge from '@/app/services/apply/_components/OrderPrefillBadge';
import ProgressSteps from '@/app/services/apply/_components/ProgressSteps';
import ApplyStepFooter from '@/app/services/apply/_components/steps/ApplyStepFooter';
import Step1ApplicantInfo from '@/app/services/apply/_components/steps/Step1ApplicantInfo';
import Step2MountingInfo from '@/app/services/apply/_components/steps/Step2MountingInfo';
import Step3PaymentInfo from '@/app/services/apply/_components/steps/Step3PaymentInfo';
import Step3PaymentInfoRentalReadonly from '@/app/services/apply/_components/steps/Step3PaymentInfoRentalReadonly';
import Step4FinalRequest from '@/app/services/apply/_components/steps/Step4FinalRequest';
import { useReservedSlots } from '@/app/services/apply/_hooks/useReservedSlots';
import LoginGate from '@/components/system/LoginGate';
import { FullPageSpinner } from '@/components/system/PageLoading';
import { Card, CardContent } from '@/components/ui/card';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type { Order } from '@/lib/types/order';
import { File, Grid2X2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MdSportsTennis } from 'react-icons/md';

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
  const rawOrderId = searchParams.get('orderId');
  const rawRentalId = searchParams.get('rentalId');
  const orderId = rawOrderId && rawOrderId.trim() ? rawOrderId.trim() : null;
  const rentalId = rawRentalId && rawRentalId.trim() ? rawRentalId.trim() : null;
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
  const [entryGuardReady, setEntryGuardReady] = useState(false);

  const nextUrl = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `/services/apply?${qs}` : '/services/apply';
  }, [searchParams]);

  const blockedByLoginGate = !allowGuestCheckout && authChecked && !isAuthenticated;
  useEffect(() => {
    setEntryGuardReady(true);
  }, []);

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
  const orderUsedSlots = typeof orderStringService?.usedSlots === 'number' ? orderStringService.usedSlots : 0;
  const hasOrderApplicationHistory = orderUsedSlots > 0;
  const isOrderSlotBlocked = !!(orderId && typeof orderRemainingSlots === 'number' && orderRemainingSlots <= 0);

  // PDP 연동용 (주의: orderId 기반 진입이면 PDP 파라미터는 무시한다)
  const pdpProductId = isOrderBased ? null : (searchParams.get('productId') ?? searchParams.get('stringId'));

  /**
   * 옵션 A: 교체 서비스 신청은 "주문(orderId)" 기반으로만 진행합니다.
   * - /services/apply?productId=... 직접 진입은 막고, 상품 상세로 되돌립니다.
   * - (이유) 스트링 금액/요금요약/성공페이지 정합성을 주문 데이터로 보장하기 위함
   */
  useEffect(() => {
    if (!entryGuardReady) return;
    // 게스트 모드 OFF라면 인증 체크가 끝나기 전(또는 로그인 필요 상태)에는 여기 로직을 실행하지 않음
    if (!allowGuestCheckout && !authChecked) return;
    if (blockedByLoginGate) return;

    // 주문 기반(orderId)이거나, 대여 기반(rentalId)이면 "직접진입 차단"을 하지 않는다.
    if (isOrderBased || isRentalBased) return;
    if (!pdpProductId) return;

    console.warn('[apply] blocked direct PDP entry', {
      orderId,
      rentalId,
      pdpProductId,
      pathname: typeof window !== 'undefined' ? window.location.pathname : null,
      search: typeof window !== 'undefined' ? window.location.search : null,
    });

    showErrorToast('교체 서비스 신청은 결제(주문) 이후 진행됩니다. 상품 페이지로 이동합니다.');
    router.replace(`/products/${encodeURIComponent(String(pdpProductId))}`);
  }, [entryGuardReady, allowGuestCheckout, authChecked, blockedByLoginGate, isOrderBased, isRentalBased, pdpProductId, orderId, rentalId, router]);

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
    if (loading) return;
    if (!orderId) return;
    if (isOrderSlotBlocked) {
      setApplicationId(null);
      return;
    }

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
  }, [loading, orderId, isOrderSlotBlocked]);

  // 2-0) 주문 상세를 조회해 현재 신청 가능 상태(남은 슬롯/신청 이력)를 안내에 반영
  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          cache: 'no-store',
          credentials: 'include',
        });

        if (!res.ok) {
          if (!cancelled) setOrder(null);
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setOrder(data);
        }
      } catch (e) {
        console.error('[apply] fetch order failed:', e);
        if (!cancelled) setOrder(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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
  const draftBootOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!orderId) return;
    if (isOrderSlotBlocked) return;
    if (draftBootOrderIdRef.current === orderId) return; // StrictMode/동일 orderId 중복 가드
    draftBootOrderIdRef.current = orderId;

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
  }, [loading, orderId, isOrderSlotBlocked, applicationId]);

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

  const {
    formData,
    setFormData,
    handleInputChange,
    handleStringTypesChange,
    handleCustomInputChange,
    handleUseQtyChange,
    handleLineFieldChange,
    linesForSubmit,
    lineCount,
    visitTimeRange,
    setVisitDurationMinutesUi,
    maxNonOrderQty,
  } = useStringingApplySharedState({
    fromPDP,
    orderId,
    rentalId,
    order,
    pdpProductId,
    pdpProduct,
    pdpMountingFee,
    lockedStringStock,
    lockedRacketQuantity,
    isRentalBased,
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
  const { disabledTimes, timeSlots, slotsLoading, slotsError, hasCacheForDate, refetchDisabledTimesFor } = useReservedSlots<ApplyFormData>({
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

  useEffect(() => {
    setVisitDurationMinutesUi(visitDurationMinutesUi);
  }, [visitDurationMinutesUi, setVisitDurationMinutesUi]);


  const isSingleApplyMode = mode === 'single' && !isOrderBased && !isRentalBased;

  const entryBanner = useMemo(() => {
    if (isRentalBased) {
      return {
        title: '대여 주문에 연결된 교체 서비스 신청입니다.',
        body: '대여 결제 기준으로 신청 내용을 확인하고 접수해주세요.',
      };
    }

    if (isSingleApplyMode) {
      return {
        title: '단독 교체 서비스 신청입니다.',
        body: '주문 연결 없이 직접 신청서를 작성하는 경로입니다.',
      };
    }

    if (!orderId) {
      return {
        title: '추가/단독 교체 서비스 신청 페이지입니다.',
        body: '일반적인 서비스 포함 주문은 체크아웃에서 함께 접수되며, 이 페이지는 기존 주문 연결·추가 신청·단독 신청에 사용됩니다.',
      };
    }

    if (loading) {
      return {
        title: '주문 신청 가능 상태를 확인하고 있습니다.',
        body: '남은 신청 가능 대상을 확인한 뒤 이어서 진행해주세요.',
      };
    }

    if (hasOrderApplicationHistory && isOrderSlotBlocked) {
      return {
        title: '이 주문의 교체 서비스 신청 가능 대상은 모두 사용되었습니다.',
        body: '추가 신청은 필요하지 않습니다. 주문 상세 또는 기존 신청 내역에서 접수 상태를 확인해주세요.',
      };
    }

    if (hasOrderApplicationHistory) {
      return {
        title: '이미 일부 접수가 완료된 주문입니다.',
        body: '남은 대상에 한해 교체 서비스 추가 신청을 진행할 수 있습니다.',
      };
    }

    return {
      title: '이 주문에 연결된 교체 서비스 신청을 진행할 수 있습니다.',
      body: '주문과 연결된 대상 기준으로 신청 내용을 확인해주세요.',
    };
  }, [isRentalBased, isSingleApplyMode, orderId, loading, hasOrderApplicationHistory, isOrderSlotBlocked]);

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

    if (isOrderSlotBlocked) {
      showErrorToast('이 주문은 추가 신청 가능한 대상이 없습니다. 주문 상세에서 현재 접수 상태를 확인해주세요.');
      return;
    }

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

      if (!result?.applicationId || typeof result.applicationId !== 'string') {
        console.error('[apply submit] invalid success payload', result);
        throw new Error('applicationId missing');
      }
      console.debug('[apply submit] success', {
        applicationId: result.applicationId,
        orderId,
        rentalId,
      });

      showSuccessToast('신청이 완료되었습니다!');
      router.push(`/services/success?applicationId=${encodeURIComponent(result.applicationId)}`);
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
      <div className="min-h-full bg-card bp-lg:bg-background">
        {/* Hero Section */}
        <ApplyHero />

        {/* Main Content */}
        <div className="px-3 bp-sm:px-4 bp-md:px-6 bp-lg:px-6 mx-auto bp-lg:max-w-[1200px] py-8 bp-sm:py-12 bp-lg:py-16">
          {/* Section Header */}
          <div className="text-center mb-8 bp-sm:mb-10">
            <h2 className="text-xl bp-sm:text-2xl font-semibold text-foreground">어떤 방식으로 진행할까요?</h2>
            <p className="mt-2 text-muted-foreground text-sm bp-sm:text-base">원하는 방식을 선택해주세요</p>
          </div>

          {/* Option Cards */}
          <div className="grid grid-cols-1 bp-md:grid-cols-3 gap-4 bp-sm:gap-5 bp-lg:gap-6 max-w-5xl mx-auto">
            {/* Option 1: 스트링 구매하고 신청 */}
            <button
              type="button"
              onClick={() => router.push('/products?from=apply')}
              className="group relative bg-card rounded-2xl p-5 bp-sm:p-6 text-left border border-border hover:border-borderhover:border-border transition-all duration-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ringfocus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-backgroundfocus-visible:ring-offset-background"
            >
              {/* Recommended Badge */}
              <div className="absolute -top-2.5 left-5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-card text-foreground">추천</span>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 bp-sm:w-14 bp-sm:h-14 rounded-xl bg-backgroundbg-card flex items-center justify-center mb-4 group-hover:bg-mutedgroup-hover:bg-card transition-colors">
                <Grid2X2 className="h-8 w-8" />
              </div>

              {/* Content */}
              <h3 className="text-base bp-sm:text-lg font-semibold text-foreground mb-1.5">스트링 구매하고 신청</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">체크아웃에서 서비스 포함 주문을 완료한 뒤, 연결된 주문으로 신청을 이어갈 수 있어요</p>

              {/* Arrow indicator */}
              <div className="mt-5 flex items-center text-sm font-medium text-muted-foreground group-hover:text-foregroundgroup-hover:text-foreground transition-colors">
                <span>스트링 보러가기</span>
                <svg className="ml-1.5 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </button>

            {/* Option 2: 라켓 고르고 신청 */}
            <div className="relative bg-card rounded-2xl p-5 bp-sm:p-6 text-left border border-border hover:border-borderhover:border-border transition-all duration-200 hover:shadow-lg">
              {/* Recommended Badge */}
              <div className="absolute -top-2.5 left-5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-card text-foreground">추천</span>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 bp-sm:w-14 bp-sm:h-14 rounded-xl bg-backgroundbg-card flex items-center justify-center mb-4">
                <MdSportsTennis className="h-9 w-9" />
              </div>

              {/* Content */}
              <h3 className="text-base bp-sm:text-lg font-semibold text-foreground mb-1.5">라켓 고르고 신청</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">구매·대여 후 스트링까지 함께 신청해요</p>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/rackets?from=apply')}
                  className="flex-1 px-3 py-2 bp-sm:py-2.5 text-sm font-medium rounded-lg bg-backgroundbg-card text-foreground hover:bg-mutedhover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ringfocus-visible:ring-ring"
                >
                  라켓 구매
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/rackets?from=apply&rentOnly=1')}
                  className="flex-1 px-3 py-2 bp-sm:py-2.5 text-sm font-medium rounded-lg bg-backgroundbg-card text-foreground hover:bg-mutedhover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ringfocus-visible:ring-ring"
                >
                  라켓 대여
                </button>
              </div>
            </div>

            {/* Option 3: 신청서만 작성 */}
            <button
              type="button"
              onClick={() => router.push('/services/apply?mode=single')}
              className="group relative bg-card rounded-2xl p-5 bp-sm:p-6 text-left border border-border hover:border-borderhover:border-border transition-all duration-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ringfocus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-backgroundfocus-visible:ring-offset-background"
            >
              {/* Badge */}
              <div className="absolute -top-2.5 left-5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-mutedbg-card text-muted-foreground">직접입력</span>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 bp-sm:w-14 bp-sm:h-14 rounded-xl bg-backgroundbg-card flex items-center justify-center mb-4 group-hover:bg-mutedgroup-hover:bg-card transition-colors">
                <File className="h-9 w-9" />
              </div>

              {/* Content */}
              <h3 className="text-base bp-sm:text-lg font-semibold text-foreground mb-1.5">신청서만 작성</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">이미 라켓·스트링이 있다면 바로 작성해요</p>
              <p className="mt-1 text-xs text-primary">금액·결제정보 자동 반영 없음</p>

              {/* Arrow indicator */}
              <div className="mt-4 flex items-center text-sm font-medium text-muted-foreground group-hover:text-foregroundgroup-hover:text-foreground transition-colors">
                <span>단독 신청하기</span>
                <svg className="ml-1.5 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </button>
          </div>

          {/* Info Banner */}
          <div className="mt-6 bp-sm:mt-8 max-w-5xl mx-auto">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-backgroundbg-card border border-border">
              <svg className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <p className="text-sm text-muted-foreground leading-relaxed">일반적인 서비스 포함 주문은 체크아웃에서 함께 접수됩니다. 이 페이지는 기존 주문 연결, 남은 대상 추가 신청, 단독 신청에 사용됩니다.</p>
            </div>
          </div>

          {/* Divider */}
          <div className="my-8 bp-sm:my-10 max-w-5xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-backgroundbg-card px-4 text-sm text-muted-foreground">또는</span>
              </div>
            </div>
          </div>

          {/* Orders/Rentals Section */}
          <div className="max-w-5xl mx-auto">
            <div className="bg-card rounded-2xl p-5 bp-sm:p-6 border border-border">
              <div className="flex flex-col bp-sm:flex-row bp-sm:items-center bp-sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                      />
                    </svg>
                    <h3 className="text-base bp-sm:text-lg font-semibold text-foreground">내 주문/대여 내역에서 이어서</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">마이페이지에서 주문/대여를 선택하면 신청서로 자동 연결돼요</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.push('/mypage?tab=orders')}
                    className="flex-1 bp-sm:flex-none px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-backgroundhover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ringfocus-visible:ring-ring"
                  >
                    주문 내역
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/mypage?tab=rentals')}
                    className="flex-1 bp-sm:flex-none px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-backgroundhover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ringfocus-visible:ring-ring"
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
    <div className="min-h-full bg-card bp-lg:bg-background">
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
              <Card className="bg-card bp-lg:backdrop-blur-sm bp-lg:bg-card/80 bp-lg:dark:bg-card border border-border bp-lg:border-0 shadow-sm bp-lg:shadow-2xl">
                <CardContent className="p-4 bp-sm:p-6 bp-lg:p-8">
                  <div className={`mb-5 rounded-xl border p-4 ${isOrderSlotBlocked ? 'border-border bg-muted/40' : 'border-border bg-background/60'}`}>
                    <p className="text-sm font-semibold text-foreground">{entryBanner.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{entryBanner.body}</p>

                    {isOrderSlotBlocked ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => router.push('/mypage?tab=orders')}
                          className="px-3 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-card transition-colors"
                        >
                          주문 상세에서 확인
                        </button>
                        <span className="px-3 py-2 text-xs text-muted-foreground">신청 내역은 주문 상세에서 확인할 수 있습니다.</span>
                      </div>
                    ) : null}
                  </div>

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
