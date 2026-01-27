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
import { CartItem, useCartStore } from '@/app/store/cartStore';
import { useEffect, useMemo, useState } from 'react';
import CheckoutButton from '@/app/checkout/CheckoutButton';
import { useAuthStore, type User } from '@/app/store/authStore';
import { getMyInfo } from '@/lib/auth.client';
import { CreditCard, MapPin, Truck, Shield, CheckCircle, UserIcon, Mail, Phone, Home, MessageSquare, Building2, Package, Star } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { bankLabelMap } from '@/lib/constants';
import { useBuyNowStore } from '@/app/store/buyNowStore';
import { usePdpBundleStore } from '@/app/store/pdpBundleStore';
import SiteContainer from '@/components/layout/SiteContainer';
import { cn } from '@/lib/utils';
import LoginGate from '@/components/system/LoginGate';

declare global {
  interface Window {
    daum: any;
  }
}

type CheckoutField = 'name' | 'phone' | 'email' | 'postalCode' | 'address' | 'addressDetail' | 'depositor' | 'items';
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

  //  PDP에서 넘어온 장착비(1자루 기준 공임)
  // const mountingFeeParam = sp.get('mountingFee');
  // const pdpMountingFee = mountingFeeParam && mountingFeeParam.trim() !== '' ? Number(mountingFeeParam) : NaN;

  // 상품ID 목록을 기준으로 mountingFee를 mini API로 가져오는 상태
  const [mountingFeeByProductId, setMountingFeeByProductId] = useState<Record<string, number>>({});

  // 2) 기존 상태
  const [withStringService, setWithStringService] = useState(false);

  // 3) 최초 마운트 시 URL 파라미터가 1이면 기본 ON
  useEffect(() => {
    setWithStringService(withServiceParam === '1');
  }, [withServiceParam]);
  const mode = sp.get('mode'); // 'buynow' | null

  // 비회원 체크아웃 노출 정책(클라)
  const guestOrderMode = getGuestOrderModeClient();
  const allowGuestCheckout = guestOrderMode === 'on';
  const checkoutHref = useMemo(() => (sp.toString() ? `/checkout?${sp.toString()}` : '/checkout'), [sp]);

  const { items: cartItems } = useCartStore();
  const { item: buyNowItem } = useBuyNowStore();
  const { items: pdpBundleItems } = usePdpBundleStore();

  // 장바구니 결제 vs 즉시 구매 모드 분기
  const orderItems: CartItem[] = mode === 'buynow' ? (pdpBundleItems.length > 0 ? pdpBundleItems : buyNowItem ? [buyNowItem] : []) : cartItems;
  const orderItemsKey = orderItems.map((it) => `${it.kind}:${it.id}:${it.quantity}`).join('|');

  useEffect(() => {
    let cancelled = false;

    async function loadMountingFees() {
      // 서비스 OFF면 굳이 mini API 호출하지 않음
      if (!withStringService) {
        setMountingFeeByProductId({});
        return;
      }

      // mountingFee 로딩 대상 + serviceFee 계산을 “같은 기준”으로
      const productIds = Array.from(new Set(orderItems.filter(isServiceFeeTarget).map((it) => String(it.id))));

      if (productIds.length === 0) {
        setMountingFeeByProductId({});
        return;
      }

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
    }

    loadMountingFees();
    return () => {
      cancelled = true;
    };
  }, [orderItemsKey, withStringService]);

  // 상품 금액 합계
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 배송비
  const shippingFee = subtotal >= 30000 ? 0 : 3000;

  // 교체 서비스 공임(serviceFee) 계산
  // let serviceFee = 0;

  // - 교체 서비스 플래그가 켜져 있고
  // - buy-now 모드이며
  // - PDP에서 공임이 숫자로 넘어온 경우에만 사용
  // if (withStringService && mode === 'buynow' && Number.isFinite(pdpMountingFee)) {
  //   const racketQty = orderItems.find((it) => it.kind === 'racket')?.quantity;
  //   const qty = typeof racketQty === 'number' ? racketQty : orderItems[0]?.quantity ?? 1;
  //   serviceFee = pdpMountingFee * qty;
  // }

  //  장착비(공임)를 붙일 아이템 kind 정의
  // - products 컬렉션에서 mountingFee를 조회하므로, 여기 포함된 kind는 "products 기반"이어야 함
  const SERVICE_FEE_KINDS = new Set(['product', 'string']);

  // kind가 없으면 일단 'product'로 간주 (기존 데이터 호환용)
  const isServiceFeeTarget = (it: CartItem) => SERVICE_FEE_KINDS.has((it.kind ?? 'product') as any);

  // serviceFee 계산을 “URL”이 아니라 “mountingFeeByProductId” 기반으로
  const serviceFee = withStringService
    ? orderItems.reduce((sum, it) => {
        if (!isServiceFeeTarget(it)) return sum;

        const mf = mountingFeeByProductId[String(it.id)] ?? 0;
        return sum + mf * it.quantity;
      }, 0)
    : 0;

  // 최종 결제 금액 = 상품 + 배송 + 서비스
  const total = subtotal + shippingFee + serviceFee;

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

  // 포인트(적립금) 상태
  // - balance: 원장 기준 총 잔액(캐시)
  // - debt:   회수해야 하지만 이미 사용되어 "부족했던" 금액(채무)
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

    return errors;
  }, [name, phone, email, postalCode, address, addressDetail, depositor, orderItems, isLoggedIn, needsShippingAddress, loading]);

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const canSubmit = !loading && agreeTerms && agreePrivacy && agreeRefund && !hasFieldErrors;

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
      setPhone(formatKoreanPhone010(data.phone || ''));
      setEmail(data.email || '');
      setPostalCode(data.postalCode || '');
      setAddress(data.address || '');
      setAddressDetail(data.addressDetail || '');
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

  if (loading)
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );

  // 비로그인 + 비회원 주문 중단 상태이면 체크아웃 UI 자체를 막고 로그인 유도 화면을 노출
  if (!user && !allowGuestCheckout) {
    return <LoginGate next={checkoutHref} variant="checkout" />;
  }

  return (
    <div className="min-h-full bg-white dark:bg-slate-950 bp-lg:bg-gradient-to-br bp-lg:from-slate-50 bp-lg:via-blue-50/30 bp-lg:to-purple-50/20 bp-lg:dark:from-slate-900 bp-lg:dark:via-slate-800 bp-lg:dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 text-white dark:from-blue-700 dark:via-purple-700 dark:to-teal-700">
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40"></div>
        <div className="absolute inset-0 bg-[url('/placeholder.svg?height=400&width=800')] opacity-10"></div>
        <SiteContainer variant="wide" className="relative py-6 bp-sm:py-10 bp-md:py-14">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 dark:bg-white/30 backdrop-blur-sm rounded-full">
              <CreditCard className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl bp-sm:text-4xl bp-md:text-5xl font-bold mb-2">주문/결제</h1>
              <p className="text-blue-100">고객님의 배송/수령/결제정보를 확인 후 주문을 완료하세요</p>
            </div>
          </div>

          {/* <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-green-400" />
              <span>SSL 보안 결제</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-blue-400" />
              <span>빠른 배송</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 text-yellow-400" />
              <span>30,000원 이상 무료배송</span>
            </div>
          </div> */}
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-6 bp-sm:py-8">
        <div className="grid grid-cols-1 gap-6 bp-sm:gap-8 bp-lg:grid-cols-3">
          {/* 주문 정보 입력 폼 */}
          <div className="bp-lg:col-span-2 space-y-4 bp-sm:space-y-6">
            {/* 주문 상품 */}
            <Card className="bg-white dark:bg-slate-900 bp-lg:backdrop-blur-sm bp-lg:bg-white/80 bp-lg:dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800/60 bp-lg:border-0 shadow-sm bp-lg:shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10 p-3 bp-sm:p-4 bp-lg:p-6">
                <CardTitle className="flex items-center gap-3 text-base bp-sm:text-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                  주문 상품
                </CardTitle>
                <CardDescription className="mt-2">장바구니에서 선택한 상품 목록입니다.</CardDescription>
              </div>
              <CardContent className="p-3 bp-sm:p-4 bp-lg:p-6">
                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="
      flex flex-col bp-sm:flex-row bp-sm:items-center
      gap-3 bp-sm:gap-4
      p-3 bp-sm:p-4
      bg-gradient-to-r from-slate-50/50 to-blue-50/30 dark:from-slate-700/50 dark:to-slate-600/30
      rounded-lg border border-slate-200/50 dark:border-slate-600/50
    "
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <Image
                            src={item.image || '/placeholder.svg?height=80&width=80&query=tennis+product'}
                            alt={item.name}
                            width={80}
                            height={80}
                            loading="lazy"
                            className="h-14 w-14 bp-sm:h-20 bp-sm:w-20 rounded-lg border-2 border-white shadow-lg object-cover"
                          />
                          <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">{item.quantity}</div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">{item.name}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">수량: {item.quantity}개</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bp-sm:flex-col bp-sm:items-end bp-sm:justify-center bp-sm:text-right">
                        <div className="text-xs bp-sm:text-sm text-slate-500">단가: {item.price.toLocaleString()}원</div>
                        <div className="font-bold text-base bp-sm:text-lg text-blue-600">{(item.price * item.quantity).toLocaleString()}원</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 배송 정보 */}
            <Card className="bg-white dark:bg-slate-900 bp-lg:backdrop-blur-sm bp-lg:bg-white/80 bp-lg:dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800/60 bp-lg:border-0 shadow-sm bp-lg:shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-3 bp-sm:p-4 bp-lg:p-6">
                <CardTitle className="flex items-center gap-3 text-base bp-sm:text-lg">
                  <MapPin className="h-5 w-5 text-green-600" />
                  배송 정보
                </CardTitle>
                <CardDescription className="mt-2">상품을 받으실 배송지 정보를 입력해주세요.</CardDescription>
              </div>
              <CardContent className="p-3 bp-sm:p-4 bp-lg:p-6">
                <div className="space-y-4 bp-sm:space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="recipient-name" className="flex items-center gap-2 text-sm">
                        <UserIcon className="h-4 w-4 text-blue-600" />
                        수령인 이름
                      </Label>
                      <Input
                        id="recipient-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="수령인 이름을 입력하세요"
                        className={cn('border-2 focus:border-blue-500 transition-colors', fieldErrors.name && 'border-rose-500 focus:border-rose-500')}
                      />
                      {fieldErrors.name && <p className="text-xs text-rose-600">{fieldErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipient-email" className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-purple-600" />
                        이메일
                      </Label>
                      <Input
                        id="recipient-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@naver.com"
                        className={cn('border-2 focus:border-purple-500 transition-colors', fieldErrors.email && 'border-rose-500 focus:border-rose-500')}
                      />
                      {fieldErrors.email && <p className="text-xs text-rose-600">{fieldErrors.email}</p>}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="recipient-phone" className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-teal-600" />
                        연락처
                      </Label>
                      <Input
                        id="recipient-phone"
                        value={phone}
                        onChange={(e) => setPhone(formatKoreanPhone010(e.target.value))}
                        placeholder="연락처를 입력하세요 ('-' 제외)"
                        inputMode="numeric"
                        className={cn('border-2 focus:border-teal-500 transition-colors', fieldErrors.phone && 'border-rose-500 focus:border-rose-500')}
                      />
                      {fieldErrors.phone && <p className="text-xs text-rose-600">{fieldErrors.phone}</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="address-postal" className="flex items-center gap-2 text-sm">
                        <Home className="h-4 w-4 text-orange-600" />
                        우편번호
                      </Label>
                      <Button variant="outline" size="sm" onClick={handleFindPostcode} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:from-blue-600 hover:to-purple-600">
                        우편번호 찾기
                      </Button>
                    </div>
                    <Input id="address-postal" readOnly value={postalCode} placeholder="우편번호" className={cn('bg-slate-100 dark:bg-slate-700 cursor-not-allowed max-w-[200px] border-2', fieldErrors.postalCode && 'border-rose-500')} />
                    <div className="min-h-[16px]">{fieldErrors.postalCode && <p className="text-xs text-rose-600">{fieldErrors.postalCode}</p>}</div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address-main">기본 주소</Label>
                    <Input id="address-main" readOnly value={address} placeholder="기본 주소" className={cn('bg-slate-100 dark:bg-slate-700 cursor-not-allowed border-2', fieldErrors.postalCode && 'border-rose-500')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address-detail">상세 주소</Label>
                    <Input
                      id="address-detail"
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      placeholder="상세 주소를 입력하세요"
                      className={cn('border-2 focus:border-blue-500 transition-colors', fieldErrors.addressDetail && 'border-rose-500 focus:border-rose-500')}
                    />
                    <div className="min-h-[16px]">{fieldErrors.addressDetail && <p className="text-xs text-rose-600">{fieldErrors.addressDetail}</p>}</div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delivery-request" className="flex items-center gap-2 text-sm">
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
            <Card className="bg-white dark:bg-slate-900 bp-lg:backdrop-blur-sm bp-lg:bg-white/80 bp-lg:dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800/60 bp-lg:border-0 shadow-sm bp-lg:shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-red-500/10 p-4 bp-sm:p-6">
                <CardTitle className="flex items-center gap-3 text-base bp-sm:text-lg">
                  <Truck className="h-5 w-5 text-purple-600" />
                  상품 접수 예약 방식
                </CardTitle>
                <CardDescription className="mt-2">상품을 어떻게 예약하실지 선택해주세요.</CardDescription>
              </div>
              <CardContent className="p-4 bp-sm:p-6 space-y-4">
                <RadioGroup defaultValue="택배수령" onValueChange={(value) => setDeliveryMethod(value as '택배수령' | '방문수령')}>
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <RadioGroupItem value="택배수령" id="택배수령" />
                    <Label htmlFor="택배수령" className="flex-1 cursor-pointer font-medium">
                      택배 발송/수령 (자택 또는 지정 장소로 배송)
                    </Label>
                    <Truck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <RadioGroupItem value="방문수령" id="방문수령" />
                    <Label htmlFor="방문수령" className="flex-1 cursor-pointer font-medium">
                      오프라인 매장 방문 (도깨비 테니스 샵에서 직접 수령)
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
              </CardContent>
            </Card>

            {/* 결제 정보 */}
            <Card className="bg-white dark:bg-slate-900 bp-lg:backdrop-blur-sm bp-lg:bg-white/80 bp-lg:dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800/60 bp-lg:border-0 shadow-sm bp-lg:shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-4 bp-sm:p-6">
                <CardTitle className="flex items-center gap-3 text-base bp-sm:text-lg">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  결제 정보
                </CardTitle>
                <CardDescription className="mt-2">결제 방법을 선택하고 필요한 정보를 입력해주세요.</CardDescription>
              </div>
              <CardContent className="p-3 bp-sm:p-4 bp-lg:p-6">
                <div className="space-y-4 bp-sm:space-y-6">
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
                      className={cn('border-2 focus:border-emerald-500 transition-colors', fieldErrors.depositor && 'border-rose-500 focus:border-rose-500')}
                    />
                    <div className="min-h-[16px]">{fieldErrors.depositor && <p className="text-xs text-rose-600">{fieldErrors.depositor}</p>}</div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <p className="font-semibold text-blue-700 dark:text-blue-400">무통장입금 안내</p>
                    </div>
                    <ul className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
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
            <Card className="bg-white dark:bg-slate-900 bp-lg:backdrop-blur-sm bp-lg:bg-white/80 bp-lg:dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800/60 bp-lg:border-0 shadow-sm bp-lg:shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-red-500/10 via-pink-500/10 to-rose-500/10 p-4 bp-sm:p-6">
                <CardTitle className="flex items-center gap-3 text-base bp-sm:text-lg">
                  <Shield className="h-5 w-5 text-red-600" />
                  주문자 동의
                </CardTitle>
              </div>
              <CardContent className="p-3 bp-sm:p-4 bp-lg:p-6">
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
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 p-4 bp-sm:p-6 text-white">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-white/20 rounded-full">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    주문 요약
                  </CardTitle>
                </div>
                <CardContent className="p-4 bp-sm:p-6 space-y-4 bp-sm:space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">상품 금액</span>
                      <span className="font-semibold text-lg">{subtotal.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">배송비</span>
                      <span className="font-semibold text-green-500">
                        <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">(30,000원 이상 구매 시 무료배송) </span>
                        {shippingFee > 0 ? `${shippingFee.toLocaleString()}원` : '무료'}
                      </span>
                    </div>
                    {/* 교체 서비스비 (있는 경우에만 표시) */}
                    {serviceFee > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">교체 서비스비</span>
                        <span className="font-semibold text-lg">{serviceFee.toLocaleString()}원</span>
                      </div>
                    )}
                    {/* 포인트 사용(로그인 유저만) */}
                    <div className="mt-2 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-3 bp-sm:p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">사용 가능 포인트</span>
                        <span className="font-semibold">{user ? `${pointsAvailable.toLocaleString()}P` : '로그인 필요'}</span>
                      </div>

                      {user && pointsDebt > 0 && <p className="mt-1 text-xs text-rose-600">회수 예정 포인트(채무): {pointsDebt.toLocaleString()}P → 적립금이 먼저 상계됩니다.</p>}

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
                          <span className="text-sm text-slate-500">P</span>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">배송비에는 적용되지 않습니다. 최대 {maxPointsToUse.toLocaleString()}P 사용 가능</p>
                      <p className="mt-1 text-xs text-slate-500">현재 단계에서는 UI만 반영됩니다. 다음 단계에서 주문 생성(/api/orders)까지 연결되면 실제 결제에 반영됩니다.</p>
                    </div>
                    {appliedPoints > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">포인트 사용(예정)</span>
                        <span className="font-semibold text-rose-600">-{appliedPoints.toLocaleString()}원</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>총 결제 금액</span>
                      <span className="text-blue-600">{total.toLocaleString()}원</span>
                    </div>
                    {appliedPoints > 0 && (
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span className="text-slate-600 dark:text-slate-400">포인트 적용 후 결제 예정 금액</span>
                        <span className="text-blue-600">{payableTotal.toLocaleString()}원</span>
                      </div>
                    )}
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
                <CardFooter className="flex flex-col gap-4 p-4 bp-sm:p-6 shrink-0">
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
                    withStringService={withStringService}
                    servicePickupMethod={servicePickupMethod}
                    items={orderItems}
                    serviceFee={serviceFee}
                    pointsToUse={appliedPoints}
                  />
                  <Button variant="outline" className="w-full border-2 hover:bg-slate-50 dark:hover:bg-slate-700 bg-transparent" asChild>
                    <Link href="/cart">장바구니로 돌아가기</Link>
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
