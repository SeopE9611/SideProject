'use client';
import Link from 'next/link';
import Image from 'next/image';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CartItem, useCartStore } from '@/app/store/cartStore';
import { useEffect, useMemo, useRef, useState } from 'react';
import CheckoutButton from '@/app/checkout/CheckoutButton';
import { useAuthStore, type User } from '@/app/store/authStore';
import { getMyInfo } from '@/lib/auth.client';
import { CreditCard, MapPin, Truck, Shield, CheckCircle, UserIcon, Mail, Phone, Home, MessageSquare, Building2, Package, Star, AlertTriangle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { bankLabelMap } from '@/lib/constants';
import { useBuyNowStore } from '@/app/store/buyNowStore';
import { usePdpBundleStore } from '@/app/store/pdpBundleStore';
import SiteContainer from '@/components/layout/SiteContainer';
import { cn } from '@/lib/utils';
import LoginGate from '@/components/system/LoginGate';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { FullPageSpinner } from '@/components/system/PageLoading';
import { calcShippingFee } from '@/lib/shipping-fee';

declare global {
  interface Window {
    daum: any;
  }
}

type CheckoutField = 'name' | 'phone' | 'email' | 'postalCode' | 'address' | 'addressDetail' | 'depositor' | 'bundle' | 'items' | 'composition';
type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>;

// 유효성(클라 UI용) - 서버는 별도로 강제
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTAL_RE = /^\d{5}$/;
const onlyDigits = (v: string) => String(v ?? '').replace(/\D/g, '');
// 연락처는 010으로 시작하는 휴대폰 번호만 허용 (010 0000 0000)
const formatKoreanPhone010 = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
};
const isValidKoreanPhone010 = (v: string) => /^010\d{8}$/.test(onlyDigits(v));

type GuestOrderMode = 'off' | 'legacy' | 'on';

function getGuestOrderModeClient(): GuestOrderMode {
  // 클라이언트에서는 NEXT_PUBLIC_만 접근 가능
  // env가 없으면 legacy로 기본값(= 비회원 진입점 숨김/차단) 처리해 실수 노출을 막음.
  const raw = (process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  return raw === 'off' || raw === 'legacy' || raw === 'on' ? raw : 'legacy';
}

export default function CheckoutPage() {
  const sp = useSearchParams();

  // 1) URL 파라미터로 최초 진입 제어
  const withServiceParam = sp.get('withService'); // '1' | '0' | null

  /**
   * 진입 시점 '서비스 포함 모드' 잠금 상태
   * - useSearchParams()는 history.replaceState만으로는 값이 갱신되지 않을 수 있으므로
   * - 따라서 최초 진입(withService=1) 여부를 state로 보관해,
   *   사용자가 '상품만 결제'로 전환했을 때 잠금을 확실히 해제할 수 있게 한다.
   */
  const [entryServiceLock, setEntryServiceLock] = useState(withServiceParam === '1');

  // PDP에서 넘어온 장착비(1자루 기준 공임)
  // const mountingFeeParam = sp.get('mountingFee');
  // const pdpMountingFee = mountingFeeParam && mountingFeeParam.trim() !== '' ? Number(mountingFeeParam) : NaN;

  // 상품ID 목록을 기준으로 mountingFee를 mini API로 가져오는 상태
  const [mountingFeeByProductId, setMountingFeeByProductId] = useState<Record<string, number>>({});
  const [mountingFeeLoading, setMountingFeeLoading] = useState(false);

  // 2) 기존 상태
  const [withStringService, setWithStringService] = useState(false);

  // 이탈 경고/초기값 스냅샷을 위한 초기화 플래그
  const initFlagsRef = useRef({ withServiceApplied: false, prefillDone: false });

  const mode = sp.get('mode'); // 'buynow' | null

  // 비회원 체크아웃 노출 정책(클라)
  const guestOrderMode = getGuestOrderModeClient();
  const allowGuestCheckout = guestOrderMode === 'on';

  const { items: cartItems } = useCartStore();
  const { item: buyNowItem } = useBuyNowStore();
  const { items: pdpBundleItems } = usePdpBundleStore();

  // 장바구니 결제 vs 즉시 구매 모드 분기
  const orderItems: CartItem[] = mode === 'buynow' ? (pdpBundleItems.length > 0 ? pdpBundleItems : buyNowItem ? [buyNowItem] : []) : cartItems;
  const orderItemsKey = orderItems.map((it) => `${it.kind}:${it.id}:${it.quantity}`).join('|');

  // 현재 URL 쿼리 스트링(로그인 gate next에도 사용됨)
  const queryString = sp.toString();

  // orderItems가 "결정 가능한 상태"인지(스토어 하이드레이션 전이면 빈 배열일 수 있음)
  const isOrderItemsReady = orderItems.length > 0;

  // 현재 주문 구성에 라켓이 실제로 포함되어 있는지
  const hasRacketInOrder = useMemo(() => orderItems.some((it) => it.kind === 'racket'), [orderItemsKey]);

  // next(로그인 리디렉션)에도 URL을 그대로 유지:
  // - withService=1은 "장착 서비스 포함 결제" 의도 플래그이며,
  //   라켓이 없더라도(= 보유 라켓 교체 서비스) 정상 흐름이므로 임의로 제거하지 않는다.
  const checkoutHref = useMemo(() => {
    if (!queryString) return '/checkout';

    const params = new URLSearchParams(queryString);

    const nextQs = params.toString();
    return nextQs ? `/checkout?${nextQs}` : '/checkout';
  }, [queryString]);

  // URL withService=1 → "장착 서비스 포함"으로 최초 상태를 자동 ON
  // - 라켓 포함: 라켓 구매/대여 + 장착 서비스 번들
  // - 라켓 없음: 보유 라켓 교체 서비스(스트링 구매 + 신청)
  // - orderItems가 아직 비어있는 경우(스토어 하이드레이션 전)에는 결정을 미루고 기다림
  useEffect(() => {
    // 이미 한 번 적용했으면 이후엔 URL로 상태를 덮어쓰지 않음(사용자 토글 보호)
    if (initFlagsRef.current.withServiceApplied) return;

    // URL이 withService=1이 아니면 기본 OFF 확정
    if (withServiceParam !== '1') {
      setWithStringService(false);
      initFlagsRef.current.withServiceApplied = true;
      return;
    }

    // withService=1인 경우: 아이템이 로드되기 전이면 기다림
    if (!isOrderItemsReady) return;

    // 라켓 유무와 무관하게 "서비스 포함" 의도를 유지한다.
    setWithStringService(true);

    initFlagsRef.current.withServiceApplied = true;
  }, [withServiceParam, isOrderItemsReady]);

  // 번들(라켓+스트링) 모드: 수량은 1곳(스트링 선택 페이지)에서만 제어한다
  // - 체크아웃에서는 안내만 하고, 서버에서 최종 검증을 수행한다
  const isBundleCheckout = mode === 'buynow' && withServiceParam === '1' && orderItems.length >= 2;
  const bundleQty = isBundleCheckout ? (orderItems.find((it) => it.kind === 'racket')?.quantity ?? orderItems[0]?.quantity ?? 1) : null;

  /**
   * "교체 서비스 포함 결제" 진입 모드 잠금
   * - withService=1로 들어온 경우는 사용자가 "서비스 포함"을 명시적으로 선택한 흐름이므로
   * - 번들(라켓+스트링) 주문은 원래부터 장착 서비스가 고정이라 isBundleCheckout로 잠긴다.
   * - 번들이 아닌 경우(= 스트링만 구매 + 보유 라켓 교체 신청)는 UX상 "모드 선택"처럼 보이게
   *   체크박스를 잠그고, 별도 링크로만 '상품만 결제' 전환을 제공하는 편이 혼란이 적음
   */
  const lockServiceMode = entryServiceLock && !isBundleCheckout;

  /**
   *  체크박스 라벨 문구를 "상태"에 맞게 조정
   * - lockServiceMode / isBundleCheckout에서 체크박스는 비활성화(=고정) 상태라
   *   라벨도 "선택" 뉘앙스가 아니라 "고정" 뉘앙스로 맞춤
   */
  const withStringServiceLabel = isBundleCheckout ? '장착 서비스 포함 · 번들' : lockServiceMode ? '교체 서비스 포함 · 자동 신청' : '교체 서비스도 같이 신청';

  /**
   * 스텝퍼 Step1 문구
   * - buynow: PDP에서 특정 스트링을 골라 바로 결제(=선택 완료)
   * - 그 외: 장바구니 기반 구성 후 결제(=구성 완료)
   */
  const stepperStep1Label = mode === 'buynow' ? '스트링 선택' : '장바구니 구성';

  /**
   * '상품만 결제'로 전환 (서비스 모드 해제)
   * - 초기 withService=1 자동 적용(useEffect)이 다시 켜지지 않도록 플래그를 확정하고,
   * - URL에서 withService를 제거해 뒤로/새로고침에서도 "상품만 결제" 상태를 유지한다.
   */
  const switchToProductOnly = () => {
    // 1) UI 상태: 서비스 OFF
    setWithStringService(false);
    // 1-1) '서비스 포함 모드 잠금'도 해제(체크박스 다시 조작 가능)
    setEntryServiceLock(false);

    // 2) URL 기반 초기 자동 적용(useEffect)이 다시 켜지지 않도록 확정
    initFlagsRef.current.withServiceApplied = true;

    // 3) URL에서 withService 제거(새로고침/뒤로가기에도 유지)
    const url = new URL(window.location.href);
    url.searchParams.delete('withService');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadMountingFees() {
      // 서비스 OFF면 굳이 mini API 호출하지 않음
      if (!withStringService) {
        setMountingFeeLoading(false);
        setMountingFeeByProductId({});
        return;
      }

      // mountingFee 로딩 대상 + serviceFee 계산을 “같은 기준”으로
      const productIds = Array.from(new Set(orderItems.filter(isServiceFeeTarget).map((it) => String(it.id))));

      if (productIds.length === 0) {
        setMountingFeeLoading(false);
        setMountingFeeByProductId({});
        return;
      }

      // mini API 로딩 중
      setMountingFeeLoading(true);

      const entries = await Promise.all(
        productIds.map(async (id) => {
          try {
            const res = await fetch(`/api/products/${id}/mini`);
            const json = await res.json();
            const raw = json?.ok ? Number(json.mountingFee ?? 0) : 0;
            const mf = Number.isFinite(raw) && raw > 0 ? raw : 0;
            return [id, mf] as const;
          } catch {
            return [id, 0] as const;
          }
        }),
      );

      if (cancelled) return;
      setMountingFeeByProductId(Object.fromEntries(entries));
      setMountingFeeLoading(false);
    }

    loadMountingFees();
    return () => {
      cancelled = true;
    };
  }, [orderItemsKey, withStringService]);

  // 상품 금액 합계
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const [deliveryMethod, setDeliveryMethod] = useState<'택배수령' | '방문수령'>('택배수령');

  // 배송비
  const shippingFee = calcShippingFee({
    subtotal,
    isVisitPickup: deliveryMethod === '방문수령',
  });

  // 교체 서비스 공임(serviceFee) 계산
  // let serviceFee = 0;

  // - 교체 서비스 플래그가 켜져 있고
  // - buy-now 모드이며
  // - PDP에서 공임이 숫자로 넘어온 경우에만 사용
  // if (withStringService && mode === 'buynow' && Number.isFinite(pdpMountingFee)) {
  // const racketQty = orderItems.find((it) => it.kind === 'racket')?.quantity;
  // const qty = typeof racketQty === 'number' ? racketQty : orderItems[0]?.quantity ?? 1;
  // serviceFee = pdpMountingFee * qty;
  // }

  // 장착비(공임)를 붙일 아이템 kind 정의
  // - products 컬렉션에서 mountingFee를 조회하므로, 여기 포함된 kind는 "products 기반"이어야 함
  const SERVICE_FEE_KINDS = new Set(['product', 'string']);

  // kind가 없으면 일단 'product'로 간주 (기존 데이터 호환용)
  const isServiceFeeTarget = (it: CartItem) => SERVICE_FEE_KINDS.has((it.kind ?? 'product') as any);

  // 장착 서비스 ON 시, mini API 로딩이 끝났는지(= mountingFee가 확정됐는지) 확인
  // - 이 플래그가 false인 동안에는 "구성 에러"를 띄우지 않고, 주문 버튼도 잠깐 막아 깜박임/오판/빠른 클릭 리스크를 제거한다.
  const mountingFeeIdsToResolve = useMemo(() => {
    if (!withStringService) return [];
    return Array.from(new Set(orderItems.filter(isServiceFeeTarget).map((it) => String(it.id))));
  }, [orderItemsKey, withStringService]);

  const isMountingFeeReady = useMemo(() => {
    if (!withStringService) return true;
    if (mountingFeeLoading) return false;
    // mini 호출이 끝나면 각 id에 대해 0이든 양수든 값이 "세팅"되므로 hasOwnProperty로 판단한다.
    return mountingFeeIdsToResolve.every((id) => Object.prototype.hasOwnProperty.call(mountingFeeByProductId, id));
  }, [withStringService, mountingFeeLoading, mountingFeeIdsToResolve, mountingFeeByProductId]);

  // serviceFee 계산을 “URL”이 아니라 “mountingFeeByProductId” 기반으로
  const serviceFee = withStringService
    ? orderItems.reduce((sum, it) => {
        if (!isServiceFeeTarget(it)) return sum;

        const mf = mountingFeeByProductId[String(it.id)] ?? 0;
        return sum + mf * it.quantity;
      }, 0)
    : 0;

  const bundleRacketId = useMemo(() => {
    if (!isBundleCheckout) return null;
    const rid = orderItems.find((it) => it.kind === 'racket')?.id;
    return rid ? String(rid) : null;
  }, [isBundleCheckout, orderItemsKey]);

  // 교체서비스 ON일 때, “장착비 대상 스트링”과 “라켓” 수량 불일치를 선제 차단
  // - 장착비 대상 스트링: /api/products/[id]/mini 로 조회한 mountingFee가 0보다 큰 상품
  const serviceTargetIds = useMemo(() => {
    if (!withStringService) return [];

    const ids = orderItems
      .filter((it) => isServiceFeeTarget(it))
      .filter((it) => (mountingFeeByProductId[String(it.id)] ?? 0) > 0)
      .map((it) => String(it.id));

    return Array.from(new Set(ids));
  }, [orderItemsKey, withStringService, mountingFeeByProductId]);

  const bundleQtyGuard = useMemo(() => {
    if (!withStringService) return { mismatch: false, racketQty: 0, serviceQty: 0 };

    const racketQty = orderItems.reduce((sum, it) => (it.kind === 'racket' ? sum + (it.quantity ?? 0) : sum), 0);
    const serviceSet = new Set(serviceTargetIds);

    const serviceQty = orderItems.reduce((sum, it) => {
      if ((it.kind ?? 'product') !== 'product') return sum;
      const id = String(it.id);
      if (!serviceSet.has(id)) return sum;
      return sum + (it.quantity ?? 0);
    }, 0);

    return {
      mismatch: racketQty > 0 && serviceQty > 0 && racketQty !== serviceQty,
      racketQty,
      serviceQty,
    };
  }, [orderItemsKey, withStringService, serviceTargetIds]);

  // Checkout 최종 방어선: 장착 서비스 구성 규칙
  // - 라켓이 주문에 포함된 경우(= 라켓 구매/대여 + 장착 서비스): "라켓 1종 + 장착 스트링 1종"만 허용
  // - 라켓이 주문에 없는 경우(= 보유 라켓 교체 서비스): "장착 스트링 1종"만 허용
  // (서버도 동일하게 "라켓이 있을 때만" 라켓-스트링 번들 규칙을 강제함)
  const bundleCompositionGuard = useMemo(() => {
    // 교체/장착 서비스를 선택하지 않았다면 구성 검증은 스킵
    if (!withStringService) return { invalid: false, racketKinds: 0, mountableStringKinds: 0 };

    // 라켓은 "종(라인)" 기준으로 1개만 허용 (서로 다른 라켓 2종이면 매칭 불가)
    const racketKinds = new Set(orderItems.filter((it) => it.kind === 'racket').map((it) => String(it.id))).size;

    // 장착 대상 스트링도 "종(라인)" 기준으로 1개만 허용
    // (serviceTargetIds는 mountingFee>0 인 “장착 가능 스트링” id 목록)
    const mountableStringKinds = serviceTargetIds.length;

    /**
     * - mountableStringKinds는 항상 1이어야 함(장착 대상 스트링이 0개/2개 이상이면 매핑 불가능)
     * - racketKinds는:
     * - 0이면 "보유 라켓 교체 서비스"로 간주 → 허용
     * - 1이면 "라켓 포함 번들" → 허용
     * - 2 이상이면 매핑 불가 → 차단
     */
    const invalid = mountableStringKinds !== 1 || (racketKinds > 0 && racketKinds !== 1);
    return { invalid, racketKinds, mountableStringKinds };
  }, [orderItemsKey, withStringService, serviceTargetIds]);

  // 최종 결제 금액 = 상품 + 배송 + 서비스
  const total = subtotal + shippingFee + serviceFee;

  const [selectedBank, setSelectedBank] = useState('shinhan');

  // 장착 서비스 수거방식(신청서 Step1과 1:1 매핑)
  // (UI에서는 COURIER_VISIT 선택지를 숨김)
  type ServicePickup = 'SELF_SEND' | 'COURIER_VISIT' | 'SHOP_VISIT';
  const [servicePickupMethod, setServicePickupMethod] = useState<ServicePickup>('SELF_SEND');

  // 안내문구(배송 방법에 따라 분기)
  const serviceHelpText = deliveryMethod === '방문수령' ? '매장 방문 시 현장에서 바로 진행돼요. 보통 15~20분 정도 걸려요.' : '택배로 받으시면, 수거/반송 방식으로 장착 서비스를 진행해요.';

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

  // 포인트(적립금) 상태
  // - balance: 원장 기준 총 잔액(캐시)
  // - debt: 회수해야 하지만 이미 사용되어 "부족했던" 금액(채무)
  // - available: 실제로 지금 결제에 사용할 수 있는 포인트 = max(0, balance - debt)
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsDebt, setPointsDebt] = useState(0);
  const [pointsAvailable, setPointsAvailable] = useState(0);

  const [useAllPoints, setUseAllPoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  // 포인트 입력 UX용(0333 방지, 0 자동 제거)
  const [pointsInput, setPointsInput] = useState('0');
  const [isEditingPoints, setIsEditingPoints] = useState(false);

  // 포인트 사용 정책(1차): 배송비 제외 금액까지만 사용 가능
  // - 총액(total)에서 배송비(shippingFee)를 제외한 금액까지만 차감 허용
  // - 로그인 유저만 사용 가능(비회원은 0으로 고정)
  const POINT_UNIT = 100; // 100원 단위
  const maxPointsByPolicy = user ? Math.max(0, total - shippingFee) : 0;

  // debt 방식에서는 "사용 가능 포인트" 기준으로 제한해야 함
  const maxPointsToUseRaw = Math.min(pointsAvailable, maxPointsByPolicy);
  const maxPointsToUse = Math.floor(maxPointsToUseRaw / POINT_UNIT) * POINT_UNIT;

  const normalizedPointsToUse = Math.floor((Number(pointsToUse) || 0) / POINT_UNIT) * POINT_UNIT;
  const appliedPoints = Math.min(normalizedPointsToUse, maxPointsToUse);
  const payableTotal = total - appliedPoints;

  // 포인트 입력값 보정(유저 잔액/정책/전액사용 토글에 따라 자동 보정)
  useEffect(() => {
    if (isEditingPoints) return; // 입력 중엔 강제 보정하면 타이핑이 끊김
    // 비회원이면 포인트 관련 상태는 아래 useEffect에서 0으로 초기화됨
    if (!user) return;

    const desired = useAllPoints ? maxPointsToUse : pointsToUse;
    const normalized = Math.floor((Number(desired) || 0) / POINT_UNIT) * POINT_UNIT;
    const clamped = Math.max(0, Math.min(normalized, maxPointsToUse));
    if (clamped !== pointsToUse) setPointsToUse(clamped);
  }, [user, useAllPoints, maxPointsToUse, pointsToUse, isEditingPoints]);

  // 숫자 상태(pointsToUse) 변경 시 입력 문자열도 동기화
  useEffect(() => {
    if (isEditingPoints) return; // 입력 중엔 사용자가 타이핑한 값을 유지
    setPointsInput(String(pointsToUse));
  }, [pointsToUse, isEditingPoints]);

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);

  type CheckoutBaseline = {
    withStringService: boolean;
    selectedBank: string;
    deliveryMethod: '택배수령' | '방문수령';
    servicePickupMethod: ServicePickup;
    name: string;
    phone: string;
    email: string;
    postalCode: string;
    address: string;
    addressDetail: string;
    deliveryRequest: string;
    depositor: string;
    pointsToUse: number;
    agreeTerms: boolean;
    agreePrivacy: boolean;
    agreeRefund: boolean;
  };

  const baselineRef = useRef<CheckoutBaseline | null>(null);

  // 초기값(프리필/URL 파라미터 적용이 끝난 시점)을 1회 스냅샷으로 저장
  useEffect(() => {
    if (baselineRef.current) return;
    if (loading) return;
    if (!initFlagsRef.current.withServiceApplied) return;

    // 로그인 유저라면 /api/users/me 프리필이 끝난 뒤에 스냅샷을 잡아야 "아무 것도 안 했는데 경고"가 뜨지 않음
    if (user && !initFlagsRef.current.prefillDone) return;

    baselineRef.current = {
      withStringService,
      selectedBank,
      deliveryMethod,
      servicePickupMethod,
      name,
      phone,
      email,
      postalCode,
      address,
      addressDetail,
      deliveryRequest,
      depositor,
      pointsToUse,
      agreeTerms,
      agreePrivacy,
      agreeRefund,
    };
  }, [loading, user, withStringService, selectedBank, deliveryMethod, servicePickupMethod, name, phone, email, postalCode, address, addressDetail, deliveryRequest, depositor, pointsToUse, agreeTerms, agreePrivacy, agreeRefund]);

  const isDirty = useMemo(() => {
    const b = baselineRef.current;
    if (!b) return false;

    return (
      b.withStringService !== withStringService ||
      b.selectedBank !== selectedBank ||
      b.deliveryMethod !== deliveryMethod ||
      b.servicePickupMethod !== servicePickupMethod ||
      b.name !== name ||
      b.phone !== phone ||
      b.email !== email ||
      b.postalCode !== postalCode ||
      b.address !== address ||
      b.addressDetail !== addressDetail ||
      b.deliveryRequest !== deliveryRequest ||
      b.depositor !== depositor ||
      b.pointsToUse !== pointsToUse ||
      b.agreeTerms !== agreeTerms ||
      b.agreePrivacy !== agreePrivacy ||
      b.agreeRefund !== agreeRefund
    );
  }, [withStringService, selectedBank, deliveryMethod, servicePickupMethod, name, phone, email, postalCode, address, addressDetail, deliveryRequest, depositor, pointsToUse, agreeTerms, agreePrivacy, agreeRefund]);

  // 새로고침/탭 닫기/브라우저 뒤로가기(주소창) 등 브라우저 레벨 이탈 경고
  useUnsavedChangesGuard(isDirty);

  // 내부 링크(예: 장바구니로 돌아가기) 클릭 시 confirm 경고
  const onLeaveCartClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!isDirty) return;

    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
    if (!ok) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const isLoggedIn = !!user;
  const needsShippingAddress = deliveryMethod === '택배수령';

  // UI용 유효성(버튼 활성/에러 메시지 노출)
  // - 서버 검증은 별도로 반드시 필요(다음 단계에서 보강)
  const fieldErrors = useMemo<CheckoutFieldErrors>(() => {
    const errors: CheckoutFieldErrors = {};

    if (!name.trim()) errors.name = '수령인 이름은 필수입니다.';
    if (!phone.trim()) errors.phone = '연락처는 필수입니다.';
    else if (!isValidKoreanPhone010(phone)) errors.phone = '올바른 연락처 형식(01012345678)으로 입력해주세요.';

    const emailTrim = email.trim();
    // 게스트 주문은 이메일 필수, 로그인 주문은 선택(하지만 입력 시 형식 체크)
    if (!emailTrim) {
      if (!loading && !isLoggedIn) errors.email = '비회원 주문은 이메일이 필요합니다.';
    } else if (!EMAIL_RE.test(emailTrim)) {
      errors.email = '이메일 형식을 확인해주세요.';
    }

    // 택배수령일 때만 주소 필수
    if (needsShippingAddress) {
      if (!postalCode.trim() || !address.trim()) errors.postalCode = '우편번호 찾기를 통해 주소를 등록해주세요.';
      else if (!POSTAL_RE.test(postalCode.trim())) errors.postalCode = '우편번호 형식을 확인해주세요. (5자리)';

      if (!addressDetail.trim()) errors.addressDetail = '상세 주소는 필수입니다.';
    }

    // 무통장(현 구조)에서는 입금자명 필수
    if (!depositor.trim()) errors.depositor = '입금자명은 필수입니다.';

    if (!orderItems || orderItems.length === 0) errors.items = '주문 상품이 비어있습니다.';

    if (bundleQtyGuard.mismatch) {
      errors.bundle = `라켓(${bundleQtyGuard.racketQty}개)과 스트링(${bundleQtyGuard.serviceQty}개) 수량이 일치하지 않습니다. 수량은 스트링 선택 화면에서 수정해주세요.`;
    }

    // mini 로딩 중에는 composition 경고를 띄우지 않는다
    // - 로딩이 끝나면 정상적으로 검증 결과를 반영한다.
    if (!isMountingFeeReady) {
      // do nothing
    } else if (bundleCompositionGuard.invalid) {
      const needCartHint = mode !== 'buynow';
      const isRacketBundle = bundleCompositionGuard.racketKinds > 0;
      errors.composition =
        (isRacketBundle
          ? `교체/장착 서비스는 “라켓 1종 + 장착 스트링 1종”만 지원합니다. (현재: 라켓 ${bundleCompositionGuard.racketKinds}종, 장착 스트링 ${bundleCompositionGuard.mountableStringKinds}종)`
          : `보유 라켓 교체 서비스는 “장착 스트링 1종”만 지원합니다. (현재: 장착 스트링 ${bundleCompositionGuard.mountableStringKinds}종)`) + (needCartHint ? '\n장바구니에서 구성 정리 후 다시 시도해 주세요.' : '');
    }

    return errors;
  }, [name, phone, email, postalCode, address, addressDetail, depositor, deliveryMethod, orderItems, bundleQtyGuard, bundleCompositionGuard, isLoggedIn, needsShippingAddress, mode, isMountingFeeReady]);

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const canSubmit = !loading && agreeTerms && agreePrivacy && agreeRefund && !hasFieldErrors && (!withStringService || isMountingFeeReady);

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
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        if (!res.ok) return;

        const data = await res.json();

        setName(data.name || '');
        setPhone(formatKoreanPhone010(data.phone || ''));
        setEmail(data.email || '');
        setPostalCode(data.postalCode || '');
        setAddress(data.address || '');
        setAddressDetail(data.addressDetail || '');
      } finally {
        // 프로필 프리필이 성공/실패하더라도 "초기값 스냅샷" 단계로 넘어갈 수 있게 플래그를 올림
        initFlagsRef.current.prefillDone = true;
      }
    };

    fetchUserInfo();
  }, [user]);

  // 로그인 유저일 때만 포인트 잔액을 조회
  useEffect(() => {
    if (!user) {
      // 비회원/로그아웃 상태에서는 포인트 사용 불가
      setPointsBalance(0);
      setPointsDebt(0);
      setPointsAvailable(0);
      setUseAllPoints(false);
      setPointsToUse(0);

      return;
    }

    let cancelled = false;
    fetch('/api/points/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;

        // 1) 신규 스키마: { balance, debt, available }
        const balRaw = data?.ok ? Number(data.balance ?? 0) : 0;
        const debtRaw = data?.ok ? Number(data.debt ?? 0) : 0;
        const availRaw = data?.ok ? Number(data.available ?? 0) : NaN;

        const bal = Number.isFinite(balRaw) ? Math.max(0, Math.trunc(balRaw)) : 0;
        const debt = Number.isFinite(debtRaw) ? Math.max(0, Math.trunc(debtRaw)) : 0;

        // available이 내려오면 그걸 최우선 사용
        // (혹시 아직 API가 안 바뀐 상태면 fallback으로 balance - debt 계산)
        const available = Number.isFinite(availRaw) ? Math.max(0, Math.trunc(availRaw)) : Math.max(0, bal - debt);

        setPointsBalance(bal);
        setPointsDebt(debt);
        setPointsAvailable(available);
      })
      .catch(() => {
        if (cancelled) return;
        setPointsBalance(0);
        setPointsDebt(0);
        setPointsAvailable(0);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) return <FullPageSpinner label="결제 정보 불러오는 중..." />;

  // 비로그인 + 비회원 주문 중단 상태이면 체크아웃 UI 자체를 막고 로그인 유도 화면을 노출
  if (!user && !allowGuestCheckout) {
    return <LoginGate next={checkoutHref} variant="checkout" />;
  }

  return (
    <div className="min-h-full bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-muted/30 dark:bg-card/40 text-foreground border-b border-border">
        <div className="absolute inset-0 bg-muted/50 dark:bg-card/60"></div>
        <SiteContainer variant="wide" className="relative py-6 bp-sm:py-10 bp-md:py-14">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-card/20 dark:bg-card/30 backdrop-blur-sm rounded-full">
              <CreditCard className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl bp-sm:text-4xl bp-md:text-5xl font-bold mb-2">주문/결제</h1>
              <p className="text-muted-foreground">고객님의 배송/수령/결제정보를 확인 후 주문을 완료하세요</p>
            </div>
          </div>
          {/**
           *  서비스 신청 흐름용
           * - 목적: '교체 서비스 포함 결제'가 단순 체크박스가 아니라 '흐름'임을 시각적으로 전달
           * - 안전성: UI만 추가(상태/결제 로직에 영향 없음)
           * - 노출 조건:
           *   1) lockServiceMode: 작업의뢰/교체 포함 결제로 진입한 경우(모드 잠금)
           *   2) withStringService: 사용자가 서비스 포함을 선택한 경우
           */}
          {(lockServiceMode || withStringService) && (
            <nav aria-label="장착 서비스 진행 단계" className="mt-4">
              <ol className="flex flex-wrap items-center gap-2 text-xs bp-sm:text-sm text-muted-foreground">
                {/* 1) 스트링 선택: 이미 완료된 단계 */}
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">1</span>
                  <span className="font-medium text-foreground">{stepperStep1Label}</span>
                </li>

                <li className="text-muted-foreground">→</li>

                {/* 2) 결제: 현재 페이지(현재 단계) */}
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-foreground text-xs font-semibold">2</span>
                  <span className="font-medium text-foreground">결제</span>
                </li>

                <li className="text-muted-foreground">→</li>

                {/* 3) 신청서 자동 이동: 결제 완료 후 success 페이지에서 자동 이동 */}
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground text-xs font-semibold">3</span>
                  <span className="font-medium">신청서</span>
                </li>
              </ol>

              <p className="mt-2 text-xs text-muted-foreground">결제 후 신청서로 바로 넘어가요.</p>
            </nav>
          )}

          {/* <div className="flex items-center gap-6 text-sm">
 <div className="flex items-center gap-2 text-sm">
 <Shield className="h-4 w-4 text-foreground" />
 <span>SSL 보안 결제</span>
 </div>
 <div className="flex items-center gap-2 text-sm">
 <Truck className="h-4 w-4 text-primary" />
 <span>빠른 배송</span>
 </div>
 <div className="flex items-center gap-2 text-sm">
 <Star className="h-4 w-4 text-foreground" />
 <span>30,000원 이상 무료배송</span>
 </div>
 </div> */}
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-6 bp-sm:py-8">
        <div className="grid grid-cols-1 gap-6 bp-sm:gap-8 bp-lg:grid-cols-3">
          {/* 주문 정보 입력 폼 */}
          <div className="bp-lg:col-span-2 space-y-4 bp-sm:space-y-6">
            {/* 이탈 경고(고정 노출) */}
            <div className="flex items-start gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground dark:border-border dark:bg-muted dark:text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <p className="leading-relaxed">
                <span className="font-semibold">주의:</span> 작성 중에 다른 페이지로 이동하거나 새로고침하면 입력한 내용이 <span className="font-semibold">초기화될 수 있습니다.</span>
              </p>
            </div>
            {/* 주문 상품 */}
            <Card className="bg-card bp-lg:backdrop-blur-sm bp-lg:bg-card/80 bp-lg:dark:bg-card/80 border border-border bp-lg:border-0 shadow-sm bp-lg:shadow-xl overflow-hidden">
              <div className="bg-muted border-b border-border p-3 bp-sm:p-4 bp-lg:p-6">
                <CardTitle className="flex items-center gap-3 text-base bp-sm:text-lg">
                  <Package className="h-5 w-5 text-primary" />
                  주문 상품
                </CardTitle>
                <CardDescription className="mt-2">장바구니에서 선택한 상품 목록입니다.</CardDescription>
              </div>
              <CardContent className="p-3 bp-sm:p-4 bp-lg:p-6">
                {isBundleCheckout && bundleQty !== null && (
                  <div className="mb-4 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground dark:border-border dark:bg-card/60 dark:text-foreground">
                    <p className="font-semibold">번들 수량: {bundleQty}개</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      라켓/스트링 수량은 동일하게 묶여 있으며, 수량 변경은 <span className="font-medium">스트링 선택 단계</span>에서만 가능합니다.
                    </p>
                    {bundleRacketId && (
                      <div className="mt-3">
                        <Button type="button" variant="outline" size="sm" className="h-8" asChild>
                          <Link href={`/rackets/${bundleRacketId}/select-string`}>수량/스트링 변경</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col bp-sm:flex-row bp-sm:items-center gap-3 bp-sm:gap-4 p-3 bp-sm:p-4 bg-muted/50 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <Image
                            src={item.image || '/placeholder.svg?height=80&width=80&query=tennis+product'}
                            alt={item.name}
                            width={80}
                            height={80}
                            loading="lazy"
                            className="h-14 w-14 bp-sm:h-20 bp-sm:w-20 rounded-lg border-2 border-border shadow-lg object-cover"
                          />
                          <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">{item.quantity}</div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground line-clamp-2">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">수량: {item.quantity}개</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bp-sm:flex-col bp-sm:items-end bp-sm:justify-center bp-sm:text-right">
                        <div className="text-xs bp-sm:text-sm text-muted-foreground">단가: {item.price.toLocaleString()}원</div>
                        <div className="font-bold text-base bp-sm:text-lg text-primary">{(item.price * item.quantity).toLocaleString()}원</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 수령 방식 및 장착 서비스 카드 */}
            <Card className="bg-card bp-lg:backdrop-blur-sm bp-lg:bg-card/80 bp-lg:dark:bg-card/80 border border-border bp-lg:border-0 shadow-sm bp-lg:shadow-xl overflow-hidden">
              <div className="bg-muted border-b border-border p-4 bp-sm:p-6">
                <CardTitle className="flex items-center gap-3 text-base bp-sm:text-lg">
                  <Truck className="h-5 w-5 text-primary" />
                  상품 접수 예약 방식
                </CardTitle>
                <CardDescription className="mt-2">상품을 어떻게 예약하실지 선택해주세요.</CardDescription>
              </div>
              <CardContent className="p-4 bp-sm:p-6 space-y-4">
                <RadioGroup defaultValue="택배수령" onValueChange={(value) => setDeliveryMethod(value as '택배수령' | '방문수령')}>
                  <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg border border-border">
                    <RadioGroupItem value="택배수령" id="택배수령" />
                    <Label htmlFor="택배수령" className="flex-1 cursor-pointer font-medium">
                      택배 발송/수령 (자택 또는 지정 장소로 배송)
                    </Label>
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg border border-border">
                    <RadioGroupItem value="방문수령" id="방문수령" />
                    <Label htmlFor="방문수령" className="flex-1 cursor-pointer font-medium">
                      오프라인 매장 방문 (도깨비 테니스 샵에서 직접 수령)
                    </Label>
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                </RadioGroup>

                <div className="bg-muted p-4 rounded-lg border border-primary/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id="withStringService"
                      checked={withStringService}
                      disabled={isBundleCheckout || lockServiceMode}
                      onCheckedChange={(checked) => {
                        if (isBundleCheckout || lockServiceMode) return;
                        const next = !!checked;
                        setWithStringService(next);

                        // 사용자가 OFF로 내리면 URL에서 withService 제거
                        if (!next) {
                          const url = new URL(window.location.href);
                          url.searchParams.delete('withService');
                          window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
                        }
                      }}
                    />
                    <Label htmlFor="withStringService" className="font-medium text-foreground">
                      {withStringServiceLabel}
                    </Label>
                  </div>
                  <p className="text-sm text-foreground ml-6">{serviceHelpText}</p>
                  {lockServiceMode && (
                    <div className="ml-6 mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        지금은 <span className="font-semibold text-foreground">교체 서비스 포함</span> 모드예요. 결제하면 신청서로 바로 넘어가요.
                      </span>

                      {/* '상품만 결제'로 바꾸고 싶을 때의 명시적 전환 버튼 */}
                      <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={switchToProductOnly}>
                        상품만 결제할래요
                      </button>
                    </div>
                  )}
                  {isBundleCheckout && (
                    <p className="text-sm text-foreground ml-6 mt-1">
                      번들 주문은 장착 서비스 포함이 <span className="font-semibold">고정</span>이며, 번들 수량은 <span className="font-semibold">{bundleQty}개</span>로 <span className="font-semibold">고정</span>됩니다. 수량 변경은{' '}
                      <span className="font-semibold">스트링 선택 단계</span>에서만 가능합니다.
                    </p>
                  )}
                  {/* 서비스 ON일 때만 세부 방식 표시 */}
                  <div className={cn('transition-all duration-300 ease-in-out overflow-hidden', withStringService ? 'opacity-100 max-h-[300px] mt-3' : 'opacity-0 max-h-0')}>
                    {withStringService &&
                      (deliveryMethod === '방문수령' ? (
                        // 방문 수령: 매장 방문 접수 고정(선택 불가 안내)
                        <div className="ml-7 mt-2 text-sm">
                          <span className="px-2 py-1 rounded bg-primary text-primary-foreground">매장 방문 접수로 진행됩니다.</span>
                        </div>
                      ) : (
                        // 택배 수령: **선택지는 자가 발송만** 노출
                        <div className="ml-7 mt-2 grid gap-2 text-sm">
                          <label className="flex items-center gap-2 text-base bp-sm:text-lg">
                            <input type="radio" name="pickup" checked={servicePickupMethod === 'SELF_SEND'} onChange={() => setServicePickupMethod('SELF_SEND')} />
                            <span>자가 발송 (편의점/우체국 등 직접 발송)</span>
                          </label>
                          {/* 기사 방문 수거 옵션은 잠정 비노출
 <label className="flex items-center gap-2 text-base bp-sm:text-lg">
 <input type="radio" name="pickup" checked={servicePickupMethod === 'COURIER_VISIT'} onChange={() => setServicePickupMethod('COURIER_VISIT')} />
 <span>택배 기사 방문 수거 (+3,000원 예상)</span>
 </label>
 */}
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 배송 정보 */}
            <Card className="bg-card bp-lg:backdrop-blur-sm bp-lg:bg-card/80 bp-lg:dark:bg-card/80 border border-border bp-lg:border-0 shadow-sm bp-lg:shadow-xl overflow-hidden">
              <div className="bg-card p-3 bp-sm:p-4 bp-lg:p-6">
                <CardTitle className="flex items-center gap-3 text-base bp-sm:text-lg">
                  <MapPin className="h-5 w-5 text-foreground" />
                  배송 정보
                </CardTitle>
                <CardDescription className="mt-2">상품을 받으실 배송지 정보를 입력해주세요.</CardDescription>
              </div>
              <CardContent className="p-3 bp-sm:p-4 bp-lg:p-6">
                <div className="space-y-4 bp-sm:space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="recipient-name" className="flex items-center gap-2 text-sm">
                        <UserIcon className="h-4 w-4 text-primary" />
                        수령인 이름
                      </Label>
                      <Input
                        id="recipient-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="수령인 이름을 입력하세요"
                        className={cn('border-2 focus:border-border transition-colors', fieldErrors.name && 'border-destructive/30 focus:border-destructive/30')}
                      />
                      {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipient-email" className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-primary" />
                        이메일
                      </Label>
                      <Input
                        id="recipient-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@naver.com"
                        className={cn('border-2 focus:border-border transition-colors', fieldErrors.email && 'border-destructive/30 focus:border-destructive/30')}
                      />
                      {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="recipient-phone" className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-primary" />
                        연락처
                      </Label>
                      <Input
                        id="recipient-phone"
                        value={phone}
                        onChange={(e) => setPhone(formatKoreanPhone010(e.target.value))}
                        placeholder="연락처를 입력하세요 ('-' 제외)"
                        inputMode="numeric"
                        className={cn('border-2 focus:border-primary transition-colors', fieldErrors.phone && 'border-destructive/30 focus:border-destructive/30')}
                      />
                      {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="address-postal" className="flex items-center gap-2 text-sm">
                        <Home className="h-4 w-4 text-foreground" />
                        우편번호
                      </Label>
                      <Button variant="outline" size="sm" onClick={handleFindPostcode} className="bg-primary text-primary-foreground border-0 hover:bg-primary/90">
                        우편번호 찾기
                      </Button>
                    </div>
                    <Input id="address-postal" readOnly value={postalCode} placeholder="우편번호" className={cn('bg-muted cursor-not-allowed max-w-[200px] border-2', fieldErrors.postalCode && 'border-destructive/30')} />
                    <div className="min-h-[16px]">{fieldErrors.postalCode && <p className="text-xs text-destructive">{fieldErrors.postalCode}</p>}</div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address-main">기본 주소</Label>
                    <Input id="address-main" readOnly value={address} placeholder="기본 주소" className={cn('bg-muted cursor-not-allowed border-2', fieldErrors.postalCode && 'border-destructive/30')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address-detail">상세 주소</Label>
                    <Input
                      id="address-detail"
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      placeholder="상세 주소를 입력하세요"
                      className={cn('border-2 focus:border-border transition-colors', fieldErrors.addressDetail && 'border-destructive/30 focus:border-destructive/30')}
                    />
                    <div className="min-h-[16px]">{fieldErrors.addressDetail && <p className="text-xs text-destructive">{fieldErrors.addressDetail}</p>}</div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delivery-request" className="flex items-center gap-2 text-sm">
                      <MessageSquare className="h-4 w-4 text-foreground" />
                      배송 요청사항
                    </Label>
                    <Textarea id="delivery-request" value={deliveryRequest} onChange={(e) => setDeliveryRequest(e.target.value)} placeholder="배송 시 요청사항을 입력하세요" className="border-2 focus:border-border transition-colors" />
                  </div>

                  <div className="bg-muted p-4 rounded-lg border border-border">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="save-address" checked={saveAddress} onCheckedChange={(checked) => setSaveAddress(!!checked)} disabled={!user} />
                      <label htmlFor="save-address" className={`text-sm font-medium ${!user ? 'text-muted-foreground' : 'text-foreground'}`}>
                        이 배송지 정보를 저장
                      </label>
                    </div>
                    {!user && <p className="text-xs text-muted-foreground ml-6 mt-1">로그인 후 배송지 정보를 저장할 수 있습니다.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 결제 정보 */}
            <Card className="bg-card bp-lg:backdrop-blur-sm bp-lg:bg-card/80 bp-lg:dark:bg-card/80 border border-border bp-lg:border-0 shadow-sm bp-lg:shadow-xl overflow-hidden">
              <div className="bg-card p-4 bp-sm:p-6">
                <CardTitle className="flex items-center gap-3 text-base bp-sm:text-lg">
                  <CreditCard className="h-5 w-5 text-foreground" />
                  결제 정보
                </CardTitle>
                <CardDescription className="mt-2">결제 방법을 선택하고 필요한 정보를 입력해주세요.</CardDescription>
              </div>
              <CardContent className="p-3 bp-sm:p-4 bp-lg:p-6">
                <div className="space-y-4 bp-sm:space-y-6">
                  <div className="space-y-3">
                    <Label>결제 방법</Label>
                    <RadioGroup defaultValue="bank-transfer" className="space-y-3">
                      <div className="flex items-center space-x-3 p-4 bg-background rounded-lg border-2 border-border">
                        <RadioGroupItem value="bank-transfer" id="bank-transfer" />
                        <Label htmlFor="bank-transfer" className="flex-1 cursor-pointer font-medium">
                          무통장입금
                        </Label>
                        <Building2 className="h-5 w-5 text-foreground" />
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="bank-account">입금 계좌 선택</Label>
                    <Select value={selectedBank} onValueChange={setSelectedBank}>
                      <SelectTrigger className="border-2 focus:border-border">
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
                    <Input
                      id="depositor-name"
                      value={depositor}
                      onChange={(e) => setDepositor(e.target.value)}
                      placeholder="입금자명을 입력하세요"
                      className={cn('border-2 focus:border-border transition-colors', fieldErrors.depositor && 'border-destructive/30 focus:border-destructive/30')}
                    />
                    <div className="min-h-[16px]">{fieldErrors.depositor && <p className="text-xs text-destructive">{fieldErrors.depositor}</p>}</div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-5 w-5 text-primary" />
                      <p className="font-semibold text-foreground">무통장입금 안내</p>
                    </div>
                    <ul className="space-y-2 text-sm text-foreground">
                      <li className="flex items-center gap-2 text-base bp-sm:text-lg">
                        <CheckCircle className="h-4 w-4" />
                        주문 후 24시간 이내에 입금해 주셔야 주문이 정상 처리됩니다.
                      </li>
                      <li className="flex items-center gap-2 text-base bp-sm:text-lg">
                        <CheckCircle className="h-4 w-4" />
                        입금자명이 주문자명과 다를 경우, 고객센터로 연락 부탁드립니다.
                      </li>
                      <li className="flex items-center gap-2 text-base bp-sm:text-lg">
                        <CheckCircle className="h-4 w-4" />
                        입금 확인 후 배송이 시작됩니다.
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 주문자 동의 */}
            <Card className="bg-card bp-lg:backdrop-blur-sm bp-lg:bg-card/80 bp-lg:dark:bg-card/80 border border-border bp-lg:border-0 shadow-sm bp-lg:shadow-xl overflow-hidden">
              <div className="bg-card p-4 bp-sm:p-6">
                <CardTitle className="flex items-center gap-3 text-base bp-sm:text-lg">
                  <Shield className="h-5 w-5 text-destructive" />
                  주문자 동의
                </CardTitle>
              </div>
              <CardContent className="p-3 bp-sm:p-4 bp-lg:p-6">
                <div className="space-y-4">
                  <div className="bg-background p-4 rounded-lg">
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
                      <label htmlFor="agree-all" className="font-semibold text-lg text-foreground">
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
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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
                          <label htmlFor={item.id} className="text-sm font-medium text-foreground">
                            {item.label}
                          </label>
                        </div>
                        <Button variant="link" size="sm" className="h-auto p-0 text-foreground hover:text-foreground">
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
              <Card className="backdrop-blur-sm bg-card/90 dark:bg-card/90 border-0 shadow-2xl overflow-hidden">
                <div className="bg-card p-4 bp-sm:p-6 text-foreground border border-primary/20">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-card/20 rounded-full">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    주문 요약
                  </CardTitle>
                </div>
                <CardContent className="p-4 bp-sm:p-6 space-y-4 bp-sm:space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">상품 금액</span>
                      <span className="font-semibold text-lg">{subtotal.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">배송비</span>
                      <span className="font-semibold text-foreground">
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(30,000원 이상 구매 시 무료배송) </span>
                        {shippingFee > 0 ? `${shippingFee.toLocaleString()}원` : '무료'}
                      </span>
                    </div>
                    {/* 교체 서비스비 */}
                    {withStringService && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">교체 서비스비</span>

                        {!isMountingFeeReady ? (
                          <div className="h-6 w-24 rounded-md bg-muted relative overflow-hidden">
                            <div className="absolute inset-0 animate-shimmer bg-foreground/10" />
                          </div>
                        ) : serviceFee > 0 ? (
                          <span className="font-semibold text-lg">{serviceFee.toLocaleString()}원</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">해당 없음</span>
                        )}
                      </div>
                    )}

                    {/* 포인트 사용(로그인 유저만) */}
                    <div className="mt-2 bg-background p-3 bp-sm:p-4 rounded-lg border border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">사용 가능 포인트</span>
                        <span className="font-semibold">{user ? `${pointsAvailable.toLocaleString()}P` : '로그인 필요'}</span>
                      </div>

                      {user && pointsDebt > 0 && <p className="mt-1 text-xs text-destructive">회수 예정 포인트(채무): {pointsDebt.toLocaleString()}P → 적립금이 먼저 상계됩니다.</p>}

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Checkbox id="useAllPoints" checked={useAllPoints} onCheckedChange={(checked) => setUseAllPoints(Boolean(checked))} disabled={!user || pointsAvailable <= 0 || maxPointsToUse <= 0} />
                          <Label htmlFor="useAllPoints" className="text-sm font-medium">
                            전액 사용
                          </Label>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min={0}
                            step={POINT_UNIT}
                            max={maxPointsToUse}
                            className="w-28 text-right"
                            value={pointsInput}
                            disabled={!user || pointsAvailable <= 0 || maxPointsToUse <= 0 || useAllPoints}
                            onFocus={(e) => {
                              setIsEditingPoints(true);
                              const el = e.currentTarget;

                              if (pointsInput === '0') setPointsInput('');

                              setTimeout(() => {
                                if (el && typeof el.select === 'function') el.select();
                              }, 0);
                            }}
                            onChange={(e) => {
                              // 숫자만 허용
                              const onlyDigits = e.target.value.replace(/[^\d]/g, '');
                              setPointsInput(onlyDigits);
                              setUseAllPoints(false);
                              const n = Number(onlyDigits);
                              setPointsToUse(Number.isFinite(n) ? Math.floor(n) : 0);
                            }}
                            onBlur={(e) => {
                              setIsEditingPoints(false);

                              // blur 시점에 최종 보정: 숫자만 → 정수 → 100P 단위 → 최대치(clamp)
                              const rawText = e.currentTarget.value ?? '';
                              const onlyDigits = String(rawText).replace(/[^\d]/g, '');
                              const raw = Number(onlyDigits || '0');
                              const safe = Number.isFinite(raw) ? Math.floor(raw) : 0;

                              const normalized = Math.floor(safe / POINT_UNIT) * POINT_UNIT;
                              const clamped = Math.max(0, Math.min(normalized, maxPointsToUse));

                              setPointsInput(String(clamped));
                              setPointsToUse(clamped);
                            }}
                          />
                          <span className="text-sm text-muted-foreground">P</span>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">배송비에는 적용되지 않습니다. 최대 {maxPointsToUse.toLocaleString()}P 사용 가능</p>
                    </div>
                    {appliedPoints > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">포인트 사용(예정)</span>
                        <span className="font-semibold text-destructive">-{appliedPoints.toLocaleString()}원</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>총 결제 금액</span>
                      <span className="text-foreground">{total.toLocaleString()}원</span>
                    </div>
                    {appliedPoints > 0 && (
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span className="text-muted-foreground">포인트 적용 후 결제 예정 금액</span>
                        <span className="text-foreground">{payableTotal.toLocaleString()}원</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-muted p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2 text-foreground mb-2">
                      <Shield className="h-4 w-4" />
                      <span className="font-semibold">주문 안내</span>
                    </div>
                    <div className="text-sm text-foreground space-y-1">
                      <p>• 주문 완료 후 입금 대기 상태로 등록됩니다.</p>
                      <p>• 입금 확인 후 배송이 시작됩니다.</p>
                      <p>• 24시간 이내 입금 부탁드립니다.</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 p-4 bp-sm:p-6 shrink-0">
                  {(fieldErrors.items || fieldErrors.bundle || (isMountingFeeReady && fieldErrors.composition)) && (
                    <div className="w-full rounded-lg border border-destructive/30 bg-destructive/15 p-3 text-sm text-destructive">
                      <p className="font-semibold mb-1">확인 필요</p>
                      {fieldErrors.items && <p>• {fieldErrors.items}</p>}
                      {fieldErrors.bundle && <p>• {fieldErrors.bundle}</p>}
                      {fieldErrors.composition && (
                        <p>
                          • {fieldErrors.composition}{' '}
                          {mode !== 'buynow' && (
                            <Link href="/cart" data-no-unsaved-guard onClick={onLeaveCartClick} className="underline underline-offset-2">
                              (장바구니에서 정리)
                            </Link>
                          )}
                        </p>
                      )}
                      {/* CTA 강화: composition 에러면 "장바구니로 가서 정리하기"를 버튼으로도 제공
 - 단, 즉시구매(buynow) 흐름에서는 장바구니에 담기지 않을 수 있어 CTA를 숨긴다.
 */}
                      {fieldErrors.composition && mode !== 'buynow' && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            href="/cart"
                            data-no-unsaved-guard
                            onClick={onLeaveCartClick}
                            className="inline-flex items-center justify-center rounded-md bg-muted/50 dark:bg-card/60 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                          >
                            장바구니로 가서 정리하기
                          </Link>
                          <span className="text-xs text-muted-foreground">정리 후 다시 이 페이지로 돌아와 주문을 진행해주세요.</span>
                        </div>
                      )}
                    </div>
                  )}
                  <CheckoutButton
                    disabled={!canSubmit}
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
                    serviceTargetIds={serviceTargetIds}
                    withStringService={withStringService}
                    servicePickupMethod={servicePickupMethod}
                    items={orderItems}
                    serviceFee={serviceFee}
                    pointsToUse={appliedPoints}
                  />
                  <Button variant="outline" className="w-full border-2 hover:bg-background dark:hover:bg-muted bg-transparent" asChild>
                    <Link href="/cart" data-no-unsaved-guard onClick={onLeaveCartClick}>
                      장바구니로 돌아가기
                    </Link>
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
