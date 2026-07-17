"use client";
import CheckoutButton from "@/app/checkout/CheckoutButton";
import NiceCheckoutButton from "@/app/checkout/NiceCheckoutButton";
import CheckoutStringingRuntimeBridge from "@/app/checkout/_components/CheckoutStringingRuntimeBridge";
import CheckoutBottomStickyBar from "@/components/checkout/CheckoutBottomStickyBar";
import CheckoutLoadingShell from "@/components/checkout/CheckoutLoadingShell";
import CheckoutPageHeader from "@/components/checkout/CheckoutPageHeader";
import CheckoutSection from "@/components/checkout/CheckoutSection";
import type { StringingApplicationInput } from "@/app/features/stringing-applications/api/submit-core";
import type useCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useCheckoutStringingServiceAdapter";
import {
  applyPackageToServiceFee,
  resolvePackageUsage,
  type PackageUsageResult,
} from "@/app/features/stringing-applications/lib/package-pricing";
import { useAuthStore, type User } from "@/app/store/authStore";
import { useBuyNowStore } from "@/app/store/buyNowStore";
import { CartItem, useCartStore } from "@/app/store/cartStore";
import { usePdpBundleStore } from "@/app/store/pdpBundleStore";
import SiteContainer from "@/components/layout/SiteContainer";
import { PriceSummary, SummaryCard, type PriceSummaryRow } from "@/components/public";
import LoginGate from "@/components/system/LoginGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getMyInfo } from "@/lib/auth.client";
import { bankLabelMap } from "@/lib/constants";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import { useBackNavigationGuard } from "@/lib/hooks/useBackNavigationGuard";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import { hasEnoughStringingApplicationInputForOrder } from "@/lib/checkout-stringing-guard";
import { isMountableStringByFee } from "@/lib/orders/string-mounting-policy";
import { ENABLE_STRING_STANDALONE_ORDER } from "@/lib/orders/string-standalone-policy";
import { isNicePaymentsEnabled } from "@/lib/payments/provider-flags";
import { calcOrderShippingFeeWithBundlePolicy, normalizeItemShippingFee } from "@/lib/shipping-fee";
import { cn } from "@/lib/utils";
import {
  Building2,
  Check,
  CheckCircle,
  CreditCard,
  Home,
  Info,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Shield,
  Truck,
  UserIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

const CHECKOUT_PRIMARY_PAY_BUTTON_ID = "checkout-primary-pay-button";

const CheckoutStringingSectionFallback = () => (
  <div className="space-y-4 rounded-xl border border-border/50 bg-card p-4 bp-sm:p-5">
    <Skeleton className="h-6 w-40" />
    <Skeleton className="h-4 w-72 max-w-full" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
  </div>
);

const CheckoutStringingAddonFallback = () => (
  <div className="rounded-xl border border-border/50 bg-card p-4 bp-sm:p-5">
    <Skeleton className="h-6 w-36" />
    <Skeleton className="mt-3 h-4 w-64 max-w-full" />
    <Skeleton className="mt-4 h-10 w-full" />
  </div>
);

const CheckoutStringingServiceSections = dynamic(
  () => import("@/app/checkout/_components/CheckoutStringingServiceSections"),
  { loading: () => <CheckoutStringingSectionFallback /> },
);
const CheckoutStringingPaymentAddon = dynamic(
  () => import("@/app/checkout/_components/CheckoutStringingPaymentAddon"),
  { loading: () => <CheckoutStringingAddonFallback /> },
);

declare global {
  interface Window {
    daum: any;
  }
}

const CART_CHECKOUT_SELECTION_KEY = "cart.checkout.selectedLineKeys.v1";

const getCartLineKey = (item: { id: string; selectedGauge?: string; selectedColor?: string }) =>
  `${item.id}::${item.selectedGauge ?? ""}::${item.selectedColor ?? ""}`;

type CheckoutField =
  | "name"
  | "phone"
  | "email"
  | "postalCode"
  | "address"
  | "addressDetail"
  | "depositor"
  | "bundle"
  | "items"
  | "composition";
type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>;
type CheckoutTouchedField =
  "name" | "phone" | "email" | "postalCode" | "addressDetail" | "depositor";
type CheckoutTouchedFields = Partial<Record<CheckoutTouchedField, boolean>>;
type CheckoutPrefillUser = User & {
  phone?: string | null;
  postalCode?: string | null;
  address?: string | null;
  addressDetail?: string | null;
};
type CheckoutStringingServiceAdapter = ReturnType<typeof useCheckoutStringingServiceAdapter>;

const resolveCheckoutPackageUsage = (
  withStringService: boolean,
  checkoutStringingAdapter?: CheckoutStringingServiceAdapter,
): PackageUsageResult | null => {
  if (!withStringService || !checkoutStringingAdapter) return null;
  return resolvePackageUsage({
    hasPackage: !!checkoutStringingAdapter.packagePreview?.has,
    packageRemaining: checkoutStringingAdapter.packageRemaining,
    requiredPassCount: checkoutStringingAdapter.requiredPassCount,
    packageOptOut: !!checkoutStringingAdapter.formData.packageOptOut,
  });
};

function CheckoutPointsAutoAdjust({
  user,
  isEditingPoints,
  useAllPoints,
  maxPointsToUse,
  pointsToUse,
  onChangePointsToUse,
}: {
  user: User | null;
  isEditingPoints: boolean;
  useAllPoints: boolean;
  maxPointsToUse: number;
  pointsToUse: number;
  onChangePointsToUse: (next: number) => void;
}) {
  const POINT_UNIT = 100;

  useEffect(() => {
    if (isEditingPoints) return; // 입력 중엔 강제 보정하면 타이핑이 끊김
    // 비회원이면 포인트 관련 상태는 아래 useEffect에서 0으로 초기화됨
    if (!user) return;

    const desired = useAllPoints ? maxPointsToUse : pointsToUse;
    const normalized = Math.floor((Number(desired) || 0) / POINT_UNIT) * POINT_UNIT;
    const clamped = Math.max(0, Math.min(normalized, maxPointsToUse));
    if (clamped !== pointsToUse) onChangePointsToUse(clamped);
  }, [user, useAllPoints, maxPointsToUse, pointsToUse, isEditingPoints, onChangePointsToUse]);

  return null;
}

function FinalPaymentConfirmCard({
  orderItemsCount,
  subtotal,
  regularSubtotal,
  shippingFee,
  serviceFee,
  baseServiceFee,
  packageUsage,
  withStringService,
  appliedPoints,
  totalPrice,
  payableTotalPrice,
  isShippingFeeReady,
  isMountingFeeReady,
  paymentMethod,
  selectedBank,
  depositor,
}: {
  orderItemsCount: number;
  subtotal: number;
  regularSubtotal: number;
  shippingFee: number;
  serviceFee: number;
  baseServiceFee: number;
  packageUsage: PackageUsageResult | null;
  withStringService: boolean;
  appliedPoints: number;
  totalPrice: number;
  payableTotalPrice: number;
  isShippingFeeReady: boolean;
  isMountingFeeReady: boolean;
  paymentMethod: "bank-transfer" | "nicepay";
  selectedBank: string;
  depositor: string;
}) {
  const priceSummaryRows: PriceSummaryRow[] = [
    ...(regularSubtotal > subtotal
      ? [
          {
            id: "regular-subtotal",
            label: "상품 정가 합계",
            value: `${regularSubtotal.toLocaleString()}원`,
          },
          {
            id: "product-discount",
            label: "상품 할인",
            value: `-${(regularSubtotal - subtotal).toLocaleString()}원`,
          },
        ]
      : []),
    {
      id: "subtotal",
      label: `상품 판매가 합계 (${orderItemsCount}개)`,
      value: `${subtotal.toLocaleString()}원`,
    },
    {
      id: "shipping-fee",
      label: "배송비",
      value: !isShippingFeeReady ? (
        <Skeleton className="h-5 w-16 rounded" />
      ) : shippingFee > 0 ? (
        `${shippingFee.toLocaleString()}원`
      ) : (
        <Badge variant="outline" className="border-primary/30 text-ui-caption text-primary">
          무료
        </Badge>
      ),
    },
    ...(withStringService
      ? [
          {
            id: "service-fee",
            label: "교체서비스 비용",
            value: !isMountingFeeReady ? (
              <Skeleton className="h-5 w-20 rounded" />
            ) : serviceFee > 0 ? (
              `${serviceFee.toLocaleString()}원`
            ) : (
              <Badge variant="outline" className="border-primary/30 text-ui-caption text-primary">
                패키지
              </Badge>
            ),
          },
        ]
      : []),
    ...(withStringService && packageUsage?.canApplyPackage
      ? [
          {
            id: "package-usage",
            label: "패키지권 적용",
            value: packageUsage.usingPackage ? "적용됨" : "미사용",
          },
        ]
      : []),
    ...(withStringService && packageUsage?.usingPackage && baseServiceFee > 0
      ? [
          {
            id: "package-discount",
            label: "패키지권 차감 금액",
            value: `-${baseServiceFee.toLocaleString()}원`,
          },
        ]
      : []),
    ...(appliedPoints > 0
      ? [
          {
            id: "applied-points",
            label: "포인트 사용",
            value: `-${appliedPoints.toLocaleString()}원`,
          },
        ]
      : []),
    {
      id: "total-price",
      label: "합계",
      value: !isShippingFeeReady ? (
        <Skeleton className="h-5 w-24 rounded" />
      ) : (
        `${totalPrice.toLocaleString()}원`
      ),
    },
    {
      id: "payable-total-price",
      label: "결제 예정 금액",
      value: !isShippingFeeReady ? (
        <Skeleton className="h-9 w-32 rounded" />
      ) : (
        <span className="text-ui-price-lg font-semibold tabular-nums text-primary bp-sm:text-ui-page-title">
          {payableTotalPrice.toLocaleString()}
          <span className="ml-0.5 text-ui-body-sm font-medium">원</span>
        </span>
      ),
      emphasis: true,
    },
  ];

  return (
    <SummaryCard
      title="최종 결제 확인"
      description="결제 예정 금액, 할인, 배송비를 마지막으로 확인하세요"
      contentClassName="space-y-5"
    >
      <PriceSummary rows={priceSummaryRows} />
      {withStringService && (
        <p className="border-l-2 border-border bg-muted/20 px-3 py-2 text-ui-label text-muted-foreground">
          결제 완료 후 교체서비스 신청 정보가 함께 접수됩니다.
        </p>
      )}
      {paymentMethod === "bank-transfer" && (
        <div className="space-y-2 border-l-2 border-border bg-muted/20 px-3 py-2 text-ui-label text-foreground">
          <p className="text-muted-foreground">
            입금 계좌:{" "}
            {bankLabelMap[selectedBank as keyof typeof bankLabelMap]?.account ?? selectedBank}
            <span className="mt-1 block">입금자명: {depositor.trim() || "미입력"}</span>
          </p>
        </div>
      )}
    </SummaryCard>
  );
}

// 유효성(클라 UI용) - 서버는 별도로 강제
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTAL_RE = /^\d{5}$/;
const onlyDigits = (v: string) => String(v ?? "").replace(/\D/g, "");
const DAUM_POSTCODE_SCRIPT_URL =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
let daumPostcodeScriptPromise: Promise<void> | null = null;
// 연락처는 010으로 시작하는 휴대폰 번호만 허용 (010 0000 0000)
const formatKoreanPhone010 = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
};
const isValidKoreanPhone010 = (v: string) => /^010\d{8}$/.test(onlyDigits(v));

type GuestOrderMode = "off" | "legacy" | "on";

function getGuestOrderModeClient(): GuestOrderMode {
  // 클라이언트에서는 NEXT_PUBLIC_만 접근 가능
  // env가 없으면 legacy로 기본값(= 비회원 진입점 숨김/차단) 처리해 실수 노출을 막음.
  const raw = (process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? "legacy").trim();
  return raw === "off" || raw === "legacy" || raw === "on" ? raw : "legacy";
}

export default function CheckoutPage() {
  const sp = useSearchParams();

  // 1) URL 파라미터로 최초 진입 제어
  const withServiceParam = sp.get("withService"); // '1' | '0' | null

  /**
   * 진입 시점 '서비스 포함 모드' 잠금 상태
   * - useSearchParams()는 history.replaceState만으로는 값이 갱신되지 않을 수 있으므로
   * - 따라서 최초 진입(withService=1) 여부를 state로 보관해,
   *   사용자가 '상품만 결제'로 전환했을 때 잠금을 확실히 해제할 수 있게 한다.
   */
  const [entryServiceLock, setEntryServiceLock] = useState(withServiceParam === "1");

  // PDP에서 넘어온 장착비(1자루 기준 공임)
  // const mountingFeeParam = sp.get('mountingFee');
  // const pdpMountingFee = mountingFeeParam && mountingFeeParam.trim() !== '' ? Number(mountingFeeParam) : NaN;

  // 상품ID 목록을 기준으로 mountingFee를 mini API로 가져오는 상태
  const [mountingFeeByProductId, setMountingFeeByProductId] = useState<Record<string, number>>({});
  const [mountableStringByProductId, setMountableStringByProductId] = useState<
    Record<string, boolean>
  >({});
  const [shippingFeeByProductId, setShippingFeeByProductId] = useState<Record<string, number>>({});
  const [mountingFeeLoading, setMountingFeeLoading] = useState(false);

  // 2) 기존 상태
  const [withStringService, setWithStringService] = useState(false);
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [isIntentionalSuccessNavigation, setIsIntentionalSuccessNavigation] = useState(false);
  const [showStringingValidationErrors, setShowStringingValidationErrors] = useState(false);

  // 이탈 경고/초기값 스냅샷을 위한 초기화 플래그
  const initFlagsRef = useRef({
    withServiceApplied: false,
    prefillDone: false,
  });

  const mode = sp.get("mode"); // 'buynow' | null
  const isCartSelectionSource = sp.get("source") === "cart-selection";

  // 비회원 체크아웃 노출 정책(클라)
  const guestOrderMode = getGuestOrderModeClient();
  const allowGuestCheckout = guestOrderMode === "on";

  const { items: cartItems } = useCartStore();
  const [selectedLineKeys, setSelectedLineKeys] = useState<string[] | null>(null);
  const { item: buyNowItem } = useBuyNowStore();
  const { items: pdpBundleItems } = usePdpBundleStore();

  useEffect(() => {
    if (mode === "buynow" || !isCartSelectionSource) {
      setSelectedLineKeys(null);
      return;
    }

    try {
      const raw = sessionStorage.getItem(CART_CHECKOUT_SELECTION_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setSelectedLineKeys(
        Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : [],
      );
    } catch {
      setSelectedLineKeys([]);
    }
  }, [isCartSelectionSource, mode]);

  const selectedCartItems = useMemo(() => {
    if (!isCartSelectionSource) return cartItems;
    if (!selectedLineKeys) return [];
    return cartItems.filter((item) => selectedLineKeys.includes(getCartLineKey(item)));
  }, [cartItems, isCartSelectionSource, selectedLineKeys]);

  // 장바구니 결제 vs 즉시 구매 모드 분기
  const orderItems: CartItem[] =
    mode === "buynow"
      ? pdpBundleItems.length > 0
        ? pdpBundleItems
        : buyNowItem
          ? [buyNowItem]
          : []
      : isCartSelectionSource
        ? selectedCartItems
        : cartItems;
  const orderItemsKey = orderItems
    .map(
      (it) =>
        `${it.kind}:${it.id}:${it.quantity}:${it.selectedGauge ?? ""}:${it.selectedColor ?? ""}`,
    )
    .join("|");

  // 장착비(공임)를 붙일 아이템 kind 정의
  // - products 컬렉션에서 mountingFee를 조회하므로, 여기 포함된 kind는 "products 기반"이어야 함
  const SERVICE_FEE_KINDS = new Set<string>(["product", "string"]);

  // kind가 없으면 일단 'product'로 간주 (기존 데이터 호환용)
  const isServiceFeeTarget = (it: CartItem) => {
    const kind = (it.kind as string | undefined) ?? "product";
    return SERVICE_FEE_KINDS.has(kind);
  };

  // 현재 URL 쿼리 스트링(로그인 gate next에도 사용됨)
  const queryString = sp.toString();

  // orderItems가 "결정 가능한 상태"인지(스토어 하이드레이션 전이면 빈 배열일 수 있음)
  const isOrderItemsReady = orderItems.length > 0;

  const isMountableStringOrderOnly = useMemo(
    () =>
      orderItems.length > 0 &&
      orderItems.every((it) => {
        if ((it.kind ?? "product") !== "product") return false;
        const id = String(it.id);
        if (Object.prototype.hasOwnProperty.call(mountableStringByProductId, id)) {
          return mountableStringByProductId[id] === true;
        }
        return isMountableStringByFee((it as any).mountingFee);
      }),
    [orderItemsKey, mountingFeeByProductId, mountableStringByProductId],
  );
  const isStringOnlyServiceFlow = !ENABLE_STRING_STANDALONE_ORDER && isMountableStringOrderOnly;
  const stringStandalonePausedNotice =
    "현재 스트링 단품 구매는 운영하지 않으며, 선택한 스트링은 교체서비스 신청용으로 사용됩니다.";

  // next(로그인 리디렉션)에도 URL을 그대로 유지:
  // - withService=1은 "장착 서비스 포함 결제" 의도 플래그이며,
  //   라켓이 없더라도(= 보유 라켓 교체 서비스) 정상 흐름이므로 임의로 제거하지 않는다.
  const checkoutHref = useMemo(() => {
    if (!queryString) return "/checkout";

    const params = new URLSearchParams(queryString);

    const nextQs = params.toString();
    return nextQs ? `/checkout?${nextQs}` : "/checkout";
  }, [queryString]);

  // URL withService=1 → "장착 서비스 포함"으로 최초 상태를 자동 ON
  // - 라켓 포함: 라켓 구매/대여 + 장착 서비스 번들
  // - 라켓 없음: 보유 라켓 교체 서비스(스트링 구매 + 신청)
  // - orderItems가 아직 비어있는 경우(스토어 하이드레이션 전)에는 결정을 미루고 기다림
  useEffect(() => {
    // 이미 한 번 적용했으면 이후엔 URL로 상태를 덮어쓰지 않음(사용자 토글 보호)
    if (initFlagsRef.current.withServiceApplied) return;

    // URL이 withService=1이 아니면 기본 OFF 확정
    if (withServiceParam !== "1") {
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
  const isBundleCheckout = mode === "buynow" && withServiceParam === "1" && orderItems.length >= 2;
  const bundleQty = isBundleCheckout
    ? (orderItems.find((it) => it.kind === "racket")?.quantity ?? orderItems[0]?.quantity ?? 1)
    : null;

  /**
   * "교체 서비스 포함 결제" 진입 모드 잠금
   * - withService=1로 들어온 경우는 사용자가 "서비스 포함"을 명시적으로 선택한 흐름이므로
   * - 번들(라켓+스트링) 주문은 원래부터 장착 서비스가 고정이라 isBundleCheckout로 잠긴다.
   * - 번들이 아닌 경우(= 스트링만 구매 + 보유 라켓 교체 신청)는 UX상 "모드 선택"처럼 보이게
   *   체크박스를 잠그고, 별도 링크로만 '상품만 결제' 전환을 제공하는 편이 혼란이 적음
   */
  const lockServiceMode = entryServiceLock && !isBundleCheckout;

  /**
   * 스텝퍼 Step1 문구
   * - buynow: PDP에서 특정 스트링을 골라 바로 결제(=선택 완료)
   * - 그 외: 장바구니 기반 구성 후 결제(=구성 완료)
   */
  const stepperStep1Label = mode === "buynow" ? "스트링 선택" : "장바구니 구성";

  useEffect(() => {
    if (!isStringOnlyServiceFlow) return;
    if (withStringService) return;
    setWithStringService(true);
    setEntryServiceLock(true);
    initFlagsRef.current.withServiceApplied = true;
  }, [isStringOnlyServiceFlow, withStringService]);

  useEffect(() => {
    let cancelled = false;

    async function loadMountingFees() {
      const allItemIds = Array.from(new Set(orderItems.map((it) => String(it.id))));
      const serviceTargetIds = new Set(
        orderItems.filter(isServiceFeeTarget).map((it) => String(it.id)),
      );

      if (allItemIds.length === 0) {
        setMountingFeeLoading(false);
        setMountingFeeByProductId({});
        setMountableStringByProductId({});
        setShippingFeeByProductId({});
        return;
      }

      // 서비스 ON일 때만 장착비 로딩 상태를 노출
      setMountingFeeLoading(withStringService);

      const entries = await Promise.all(
        allItemIds.map(async (id) => {
          try {
            const res = await fetch(`/api/products/${id}/mini`);
            const json = await res.json();
            const rawMounting = json?.ok ? Number(json.mountingFee ?? 0) : 0;
            const mf = Number.isFinite(rawMounting) && rawMounting > 0 ? rawMounting : 0;
            const sf = normalizeItemShippingFee(json?.shippingFee);
            return [
              id,
              {
                mountingFee: mf,
                shippingFee: sf,
                isMountableString: json?.isMountableString === true,
              },
            ] as const;
          } catch {
            return [id, { mountingFee: 0, shippingFee: 3000, isMountableString: false }] as const;
          }
        }),
      );

      if (cancelled) return;
      setMountingFeeByProductId(
        Object.fromEntries(
          entries.map(([id, fee]) => [id, serviceTargetIds.has(id) ? fee.mountingFee : 0]),
        ),
      );
      setMountableStringByProductId(
        Object.fromEntries(
          entries.map(([id, fee]) => [
            id,
            serviceTargetIds.has(id) && fee.isMountableString === true,
          ]),
        ),
      );
      setShippingFeeByProductId(
        Object.fromEntries(entries.map(([id, fee]) => [id, fee.shippingFee])),
      );
      setMountingFeeLoading(false);
    }

    loadMountingFees();
    return () => {
      cancelled = true;
    };
  }, [orderItemsKey, withStringService]);

  // 상품 금액 합계
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const regularSubtotal = orderItems.reduce((sum, item) => {
    const regularPrice =
      typeof item.regularPrice === "number" &&
      Number.isFinite(item.regularPrice) &&
      item.regularPrice > item.price
        ? item.regularPrice
        : item.price;
    return sum + regularPrice * item.quantity;
  }, 0);

  const [deliveryMethod, setDeliveryMethod] = useState<"택배수령" | "방문수령">("택배수령");

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

  // 장착 서비스 ON 시, mini API 로딩이 끝났는지(= mountingFee가 확정됐는지) 확인
  // - 이 플래그가 false인 동안에는 "구성 에러"를 띄우지 않고, 주문 버튼도 잠깐 막아 깜박임/오판/빠른 클릭 리스크를 제거한다.
  const mountingFeeIdsToResolve = useMemo(() => {
    if (!withStringService) return [];
    return Array.from(new Set(orderItems.filter(isServiceFeeTarget).map((it) => String(it.id))));
  }, [orderItemsKey, withStringService]);

  const shippingFeeIdsToResolve = useMemo(
    () => Array.from(new Set(orderItems.map((it) => String(it.id)))),
    [orderItemsKey],
  );

  const isShippingFeeReady = useMemo(() => {
    if (shippingFeeIdsToResolve.length === 0) return true;
    return shippingFeeIdsToResolve.every((id) =>
      Object.prototype.hasOwnProperty.call(shippingFeeByProductId, id),
    );
  }, [shippingFeeIdsToResolve, shippingFeeByProductId]);

  const isMountingFeeReady = useMemo(() => {
    if (!withStringService) return true;
    if (mountingFeeLoading) return false;
    // mini 호출이 끝나면 각 id에 대해 0이든 양수든 값이 "세팅"되므로 hasOwnProperty로 판단한다.
    return mountingFeeIdsToResolve.every((id) =>
      Object.prototype.hasOwnProperty.call(mountingFeeByProductId, id),
    );
  }, [withStringService, mountingFeeLoading, mountingFeeIdsToResolve, mountingFeeByProductId]);

  // 배송비
  const shippingFee = useMemo(() => {
    if (!isShippingFeeReady) return 0;
    return calcOrderShippingFeeWithBundlePolicy({
      items: orderItems.map((item) => ({
        kind: item.kind ?? "product",
        shippingFee: shippingFeeByProductId[String(item.id)],
        mountingFee: mountingFeeByProductId[String(item.id)] ?? 0,
        isMountableString: mountableStringByProductId[String(item.id)] === true,
      })),
      isVisitPickup: deliveryMethod === "방문수령",
      withStringService,
    });
  }, [
    orderItems,
    shippingFeeByProductId,
    mountingFeeByProductId,
    mountableStringByProductId,
    deliveryMethod,
    isShippingFeeReady,
    withStringService,
  ]);

  // serviceFee 계산을 “URL”이 아니라 “mountingFeeByProductId” 기반으로
  const baseServiceFee = withStringService
    ? orderItems.reduce((sum, it) => {
        if (!isServiceFeeTarget(it)) return sum;

        const mf = mountingFeeByProductId[String(it.id)] ?? 0;
        return sum + mf * it.quantity;
      }, 0)
    : 0;

  const bundleRacketId = useMemo(() => {
    if (!isBundleCheckout) return null;
    const rid = orderItems.find((it) => it.kind === "racket")?.id;
    return rid ? String(rid) : null;
  }, [isBundleCheckout, orderItemsKey]);

  // 교체서비스 ON일 때, “장착 대상 스트링”과 “라켓” 수량 불일치를 선제 차단
  // - 장착 대상 스트링: /api/products/[id]/mini 로 조회한 isMountableString=true 상품
  const serviceTargetIds = useMemo(() => {
    if (!withStringService) return [];

    const ids = orderItems
      .filter((it) => isServiceFeeTarget(it))
      .filter((it) => mountableStringByProductId[String(it.id)] === true)
      .map((it) => String(it.id));

    return Array.from(new Set(ids));
  }, [orderItemsKey, withStringService, mountableStringByProductId]);

  const bundleQtyGuard = useMemo(() => {
    if (!withStringService) return { mismatch: false, racketQty: 0, serviceQty: 0 };

    const racketQty = orderItems.reduce(
      (sum, it) => (it.kind === "racket" ? sum + (it.quantity ?? 0) : sum),
      0,
    );
    const serviceSet = new Set(serviceTargetIds);

    const serviceQty = orderItems.reduce((sum, it) => {
      if ((it.kind ?? "product") !== "product") return sum;
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
    const racketKinds = new Set(
      orderItems.filter((it) => it.kind === "racket").map((it) => String(it.id)),
    ).size;

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

  const [selectedBank, setSelectedBank] = useState("kakao");
  const [paymentMethod, setPaymentMethod] = useState<"bank-transfer" | "nicepay">("bank-transfer");
  const nicePaymentsEnabled = isNicePaymentsEnabled();

  // 장착 서비스 수거방식(신청서 Step1과 1:1 매핑)
  // (UI에서는 COURIER_VISIT 선택지를 숨김)
  type ServicePickup = "SELF_SEND" | "COURIER_VISIT" | "SHOP_VISIT";
  const [servicePickupMethod, setServicePickupMethod] = useState<ServicePickup>("SELF_SEND");

  // 동기화: 방문수령이면 SHOP_VISIT 고정, 택배면 기본 SELF_SEND
  useEffect(() => {
    if (!withStringService) return;
    if (deliveryMethod === "방문수령") {
      setServicePickupMethod("SHOP_VISIT");
    } else {
      // setServicePickupMethod((prev) => (prev === 'SELF_SEND' || prev === 'COURIER_VISIT' ? prev : 'SELF_SEND'));
      setServicePickupMethod("SELF_SEND");
    }
  }, [deliveryMethod, withStringService]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [deliveryRequest, setDeliveryRequest] = useState("");
  const [depositor, setDepositor] = useState("");
  const [touchedFields, setTouchedFields] = useState<CheckoutTouchedFields>({});

  const touchField = (field: CheckoutTouchedField) => {
    setTouchedFields((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const loadDaumPostcodeScript = () => {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.daum?.Postcode) return Promise.resolve();
    if (daumPostcodeScriptPromise) return daumPostcodeScriptPromise;

    daumPostcodeScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${DAUM_POSTCODE_SCRIPT_URL}"]`,
      );
      const script = existingScript ?? document.createElement("script");

      const handleLoad = () => resolve();
      const handleError = () => {
        daumPostcodeScriptPromise = null;
        reject(new Error("Failed to load Daum postcode script"));
      };

      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });

      if (!existingScript) {
        script.src = DAUM_POSTCODE_SCRIPT_URL;
        script.async = true;
        document.body.appendChild(script);
      } else if ((existingScript as any).readyState === "complete") {
        resolve();
      }
    });

    return daumPostcodeScriptPromise;
  };

  const handleFindPostcode = async () => {
    try {
      await loadDaumPostcodeScript();
      if (!window.daum?.Postcode) return;

      new window.daum.Postcode({
        oncomplete: (data: any) => {
          const fullAddress = data.address;
          const zonecode = data.zonecode;
          setPostalCode(zonecode);
          setAddress(fullAddress);
        },
      }).open();
    } catch {
      // noop
    }
  };

  const [saveAddress, setSaveAddress] = useState(false);
  const { logout } = useAuthStore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 포인트(적립금) 상태
  // - balance: 원장 기준 총 잔액(캐시)
  // - debt: 회수해야 하지만 이미 사용되어 "부족했던" 금액(채무)
  // - available: 실제로 지금 결제에 사용할 수 있는 포인트 = max(0, balance - debt)
  // 3차 보완: 조회 실패/미도착을 실제 0포인트로 오해하지 않도록 null 가능 상태로 관리한다.
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [pointsDebt, setPointsDebt] = useState<number | null>(null);
  const [pointsAvailable, setPointsAvailable] = useState<number | null>(null);
  const [pointsFetchError, setPointsFetchError] = useState<string | null>(null);

  const [useAllPoints, setUseAllPoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  // 포인트 입력 UX용(0333 방지, 0 자동 제거)
  const [pointsInput, setPointsInput] = useState("0");
  const [isEditingPoints, setIsEditingPoints] = useState(false);

  const POINT_UNIT = 100; // 100원 단위

  // 숫자 상태(pointsToUse) 변경 시 입력 문자열도 동기화
  useEffect(() => {
    if (isEditingPoints) return; // 입력 중엔 사용자가 타이핑한 값을 유지
    setPointsInput(pointsToUse.toLocaleString("ko-KR"));
  }, [pointsToUse, isEditingPoints]);

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);

  type CheckoutBaseline = {
    withStringService: boolean;
    selectedBank: string;
    deliveryMethod: "택배수령" | "방문수령";
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
  }, [
    loading,
    user,
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
  ]);

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
  }, [
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
  ]);

  const guardEnabled = isDirty && !isIntentionalSuccessNavigation;

  // 새로고침/탭 닫기/브라우저 뒤로가기(주소창) 등 브라우저 레벨 이탈 경고
  useUnsavedChangesGuard(guardEnabled);
  useBackNavigationGuard(guardEnabled);

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
  const needsShippingAddress = deliveryMethod === "택배수령";

  // UI용 유효성(버튼 활성/에러 메시지 노출)
  // - 서버 검증은 별도로 반드시 필요(다음 단계에서 보강)
  const fieldErrors = useMemo<CheckoutFieldErrors>(() => {
    const errors: CheckoutFieldErrors = {};

    const nameTrim = name.trim();
    if (!nameTrim) errors.name = "수령인 이름은 필수입니다.";
    else if (nameTrim.length < 2) errors.name = "수령인 이름은 2자 이상 입력해주세요.";

    if (!phone.trim()) errors.phone = "연락처는 필수입니다.";
    else if (!isValidKoreanPhone010(phone))
      errors.phone = "올바른 연락처 형식(01012345678)으로 입력해주세요.";

    const emailTrim = email.trim();
    // 게스트 주문은 이메일 필수, 로그인 주문은 선택(하지만 입력 시 형식 체크)
    if (!emailTrim) {
      if (!loading && !isLoggedIn) errors.email = "비회원 주문은 이메일이 필요합니다.";
    } else if (!EMAIL_RE.test(emailTrim)) {
      errors.email = "이메일 형식을 확인해주세요.";
    }

    // 택배수령일 때만 주소 필수
    if (needsShippingAddress) {
      if (!postalCode.trim() || !address.trim())
        errors.postalCode = "우편번호 찾기를 통해 주소를 등록해주세요.";
      else if (!POSTAL_RE.test(postalCode.trim()))
        errors.postalCode = "우편번호 형식을 확인해주세요. (5자리)";

      if (!addressDetail.trim()) errors.addressDetail = "상세 주소는 필수입니다.";
    }

    if (paymentMethod === "bank-transfer") {
      // 무통장(현 구조)에서는 입금자명 필수
      // 제출 버튼 검증(CheckoutButton)과 동일하게 2자 이상 규칙도 맞춘다.
      const depositorTrim = depositor.trim();
      if (!depositorTrim) {
        errors.depositor = "입금자명은 필수입니다.";
      } else if (depositorTrim.length < 2) {
        errors.depositor = "입금자명은 2자 이상 입력해주세요.";
      }
    }
    if (!orderItems || orderItems.length === 0) errors.items = "주문 상품이 비어있습니다.";

    if (bundleQtyGuard.mismatch) {
      errors.bundle = `라켓(${bundleQtyGuard.racketQty}개)과 스트링(${bundleQtyGuard.serviceQty}개) 수량이 일치하지 않습니다. 수량은 스트링 선택 화면에서 수정해주세요.`;
    }

    // mini 로딩 중에는 composition 경고를 띄우지 않는다
    // - 로딩이 끝나면 정상적으로 검증 결과를 반영한다.
    if (!isMountingFeeReady) {
      // do nothing
    } else if (bundleCompositionGuard.invalid) {
      const needCartHint = mode !== "buynow";
      const isRacketBundle = bundleCompositionGuard.racketKinds > 0;
      errors.composition =
        (isRacketBundle
          ? `교체/장착 서비스는 “라켓 1종 + 장착 스트링 1종”만 지원합니다. (현재: 라켓 ${bundleCompositionGuard.racketKinds}종, 장착 스트링 ${bundleCompositionGuard.mountableStringKinds}종)`
          : `보유 라켓 교체 서비스는 “장착 스트링 1종”만 지원합니다. (현재: 장착 스트링 ${bundleCompositionGuard.mountableStringKinds}종)`) +
        (needCartHint ? "\n장바구니에서 구성 정리 후 다시 시도해 주세요." : "");
    }

    return errors;
  }, [
    name,
    phone,
    email,
    postalCode,
    address,
    addressDetail,
    depositor,
    deliveryMethod,
    orderItems,
    bundleQtyGuard,
    bundleCompositionGuard,
    isLoggedIn,
    needsShippingAddress,
    mode,
    isMountingFeeReady,
    paymentMethod,
  ]);

  const showNameError = !!touchedFields.name && !!fieldErrors.name;
  const showEmailError = !!touchedFields.email && !!fieldErrors.email;
  const showPhoneError = !!touchedFields.phone && !!fieldErrors.phone;
  const showPostalCodeError = !!touchedFields.postalCode && !!fieldErrors.postalCode;
  const showAddressDetailError = !!touchedFields.addressDetail && !!fieldErrors.addressDetail;
  const showDepositorError = !!touchedFields.depositor && !!fieldErrors.depositor;

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const canSubmit =
    !loading &&
    agreeTerms &&
    agreePrivacy &&
    agreeRefund &&
    !hasFieldErrors &&
    (!withStringService || isMountingFeeReady) &&
    isShippingFeeReady;

  // 비회원 체크아웃 허용: quiet 조회 사용 (401이어도 전역 만료 금지)
  useEffect(() => {
    let cancelled = false;
    getMyInfo({ quiet: true })
      .then(({ user }) => {
        if (cancelled) return;

        setUser(user);

        if (user) {
          const prefillUser = user as CheckoutPrefillUser;
          setName(prefillUser.name || "");
          setPhone(formatKoreanPhone010(prefillUser.phone || ""));
          setEmail(prefillUser.email || "");
          setPostalCode(prefillUser.postalCode || "");
          setAddress(prefillUser.address || "");
          setAddressDetail(prefillUser.addressDetail || "");
        }

        // 로그인/비로그인 여부와 무관하게 초기 프리필 단계 완료를 표시
        initFlagsRef.current.prefillDone = true;
      })
      .catch(() => {
        /* quiet: 401은 정상. 아무 것도 하지 않음 */
        if (!cancelled) {
          initFlagsRef.current.prefillDone = true;
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 로그인 유저일 때만 포인트 잔액을 조회
  useEffect(() => {
    if (!user) {
      // 비회원/로그아웃 상태에서는 포인트 사용 불가
      setPointsBalance(null);
      setPointsDebt(null);
      setPointsAvailable(null);
      setPointsFetchError(null);
      setUseAllPoints(false);
      setPointsToUse(0);

      return;
    }

    let cancelled = false;
    // 사용자 전환/재조회 시 이전 값을 잠시 비우고 로딩 상태를 명확히 만든다.
    setPointsBalance(null);
    setPointsDebt(null);
    setPointsAvailable(null);
    setPointsFetchError(null);

    fetch("/api/points/me", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("POINTS_FETCH_FAILED");
        return res.json();
      })
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
        const available = Number.isFinite(availRaw)
          ? Math.max(0, Math.trunc(availRaw))
          : Math.max(0, bal - debt);

        setPointsBalance(bal);
        setPointsDebt(debt);
        setPointsAvailable(available);
        setPointsFetchError(null);
      })
      .catch(() => {
        if (cancelled) return;
        // 실패 상태를 0으로 덮지 않고, 화면에서 에러 상태로 분기할 수 있도록 null 유지
        setPointsBalance(null);
        setPointsDebt(null);
        setPointsAvailable(null);
        setPointsFetchError("포인트 정보를 불러오지 못했습니다.");
        setUseAllPoints(false);
        setPointsToUse(0);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const isInitialLoading = loading;
  const previewTotalPrice = subtotal + shippingFee + baseServiceFee;
  const previewPointCapBase = Math.max(0, previewTotalPrice - shippingFee);
  const previewMaxPointsByPolicy = user ? previewPointCapBase : 0;
  const previewResolvedPointsAvailable = pointsAvailable ?? 0;
  const previewMaxPointsToUseRaw = Math.min(
    previewResolvedPointsAvailable,
    previewMaxPointsByPolicy,
  );
  const previewMaxPointsToUse = Math.floor(previewMaxPointsToUseRaw / POINT_UNIT) * POINT_UNIT;
  const previewNormalizedPointsToUse =
    Math.floor((Number(pointsToUse) || 0) / POINT_UNIT) * POINT_UNIT;
  const previewAppliedPoints = Math.min(previewNormalizedPointsToUse, previewMaxPointsToUse);
  const isZeroPayableAmount = previewTotalPrice - previewAppliedPoints <= 0;

  useEffect(() => {
    if (!isZeroPayableAmount || paymentMethod !== "nicepay") return;
    setPaymentMethod("bank-transfer");
  }, [isZeroPayableAmount, paymentMethod]);

  useEffect(() => {
    if (nicePaymentsEnabled || paymentMethod !== "nicepay") return;
    setPaymentMethod("bank-transfer");
  }, [nicePaymentsEnabled, paymentMethod]);

  // 비로그인 + 비회원 주문 중단 상태이면 체크아웃 UI 자체를 막고 로그인 유도 화면을 노출
  if (!loading && !user && !allowGuestCheckout) {
    return <LoginGate next={checkoutHref} variant="checkout" />;
  }

  const renderCheckout = (checkoutStringingAdapter?: CheckoutStringingServiceAdapter) => {
    const checkoutPackageUsage = resolveCheckoutPackageUsage(
      withStringService,
      checkoutStringingAdapter,
    );
    const hasStringingLineErrors = !!(
      withStringService && checkoutStringingAdapter?.hasLineValidationErrors
    );
    const requestStringingValidationMessages = () => {
      if (!hasStringingLineErrors) return;
      setShowStringingValidationErrors(true);
    };
    const finalServiceFee = withStringService
      ? applyPackageToServiceFee(baseServiceFee, checkoutPackageUsage ?? { usingPackage: false })
      : 0;
    const totalPrice = subtotal + shippingFee + finalServiceFee;
    const pointCapBase = Math.max(0, totalPrice - shippingFee);
    const maxPointsByPolicy = user ? pointCapBase : 0;
    const resolvedPointsAvailable = pointsAvailable ?? 0;
    const resolvedPointsDebt = pointsDebt ?? 0;
    const maxPointsToUseRaw = Math.min(resolvedPointsAvailable, maxPointsByPolicy);
    const maxPointsToUse = Math.floor(maxPointsToUseRaw / POINT_UNIT) * POINT_UNIT;
    const normalizedPointsToUse = Math.floor((Number(pointsToUse) || 0) / POINT_UNIT) * POINT_UNIT;
    const appliedPoints = Math.min(normalizedPointsToUse, maxPointsToUse);
    const payableTotalPrice = totalPrice - appliedPoints;
    const stringingApplicationInput: StringingApplicationInput | undefined = (() => {
      if (!withStringService || !checkoutStringingAdapter) return undefined;

      const form = checkoutStringingAdapter.formData;
      const lines = (checkoutStringingAdapter.linesForSubmit ?? []).filter(
        (line) => line?.stringProductId,
      );
      const stringTypes = (form.stringTypes ?? []).filter(Boolean);

      if (!name.trim() || !phone.trim() || stringTypes.length === 0 || lines.length === 0) {
        return undefined;
      }

      return {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        shippingInfo: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          addressDetail: addressDetail.trim(),
          postalCode: postalCode.trim(),
          depositor: depositor.trim(),
          bank: selectedBank,
          deliveryRequest: deliveryRequest.trim(),
          collectionMethod: form.collectionMethod,
        },
        stringTypes,
        customStringName: form.customStringType?.trim() || undefined,
        preferredDate: form.preferredDate,
        preferredTime: form.preferredTime,
        requirements: form.requirements,
        packageOptOut: !!form.packageOptOut,
        lines: lines.map((line) => ({
          racketType: line.racketType,
          stringProductId: line.stringProductId,
          stringName: line.stringName,
          tensionMain: line.tensionMain,
          tensionCross: line.tensionCross,
          note: line.note,
          mountingFee: line.mountingFee,
        })),
      };
    })();

    const stringingApplicationMissing =
      withStringService && !hasEnoughStringingApplicationInputForOrder(stringingApplicationInput);
    const stringingApplicationError = stringingApplicationMissing
      ? "교체서비스 신청 정보가 누락되었습니다. 신청 정보를 다시 확인한 뒤 결제를 진행해 주세요."
      : null;
    const resolvedCanSubmit =
      canSubmit &&
      !hasStringingLineErrors &&
      !stringingApplicationMissing &&
      !checkoutStringingAdapter?.packagePreviewLoading;

    if (isInitialLoading) {
      return <CheckoutLoadingShell layout="linear" />;
    }

    return (
      <div className="min-h-full bg-background">
        <CheckoutPointsAutoAdjust
          user={user}
          isEditingPoints={isEditingPoints}
          useAllPoints={useAllPoints}
          maxPointsToUse={maxPointsToUse}
          pointsToUse={pointsToUse}
          onChangePointsToUse={setPointsToUse}
        />
        <CheckoutPageHeader
          eyebrow="CHECKOUT"
          title="주문/결제"
          description="주문 상품, 배송 정보, 결제수단을 확인한 뒤 결제를 진행하세요."
          icon={<CreditCard className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />}
        >
          {(lockServiceMode || withStringService) && (
            <nav aria-label="장착 서비스 진행 단계">
              <div className="inline-flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap rounded-control border border-border/80 bg-card p-1.5 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] bp-sm:gap-2.5 bp-sm:p-2 [&::-webkit-scrollbar]:hidden">
                <div className="flex shrink-0 items-center gap-1.5 bp-sm:gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-ui-caption font-semibold text-background bp-sm:h-8 bp-sm:w-8">
                    <CheckCircle className="h-3.5 w-3.5 bp-sm:h-4 bp-sm:w-4" />
                  </span>
                  <span className="whitespace-nowrap text-ui-label font-medium text-foreground bp-sm:text-ui-body-sm">
                    <span className="bp-sm:hidden">스트링</span>
                    <span className="hidden bp-sm:inline">{stepperStep1Label}</span>
                  </span>
                </div>

                <div className="h-[2px] w-4 shrink-0 rounded-full bg-border bp-sm:w-8" />

                <div className="flex shrink-0 items-center gap-1.5 bp-sm:gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-highlight text-ui-caption font-semibold text-brand-highlight-foreground shadow-sm bp-sm:h-8 bp-sm:w-8">
                    2
                  </span>
                  <span className="whitespace-nowrap text-ui-label font-semibold text-foreground bp-sm:text-ui-body-sm">
                    <span className="bp-sm:hidden">정보 입력</span>
                    <span className="hidden bp-sm:inline">결제·장착 정보</span>
                  </span>
                </div>

                <div className="h-[2px] w-4 shrink-0 rounded-full bg-border bp-sm:w-8" />

                <div className="flex shrink-0 items-center gap-1.5 bp-sm:gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-ui-caption font-semibold text-muted-foreground bp-sm:h-8 bp-sm:w-8">
                    3
                  </span>
                  <span className="whitespace-nowrap text-ui-label font-medium text-muted-foreground bp-sm:text-ui-body-sm">
                    <span className="bp-sm:hidden">완료</span>
                    <span className="hidden bp-sm:inline">접수 완료</span>
                  </span>
                </div>
              </div>
            </nav>
          )}
        </CheckoutPageHeader>

        <SiteContainer variant="wide" className="py-6 bp-sm:py-10">
          <div className="mx-auto w-full max-w-6xl">
            <div
              className={cn(
                "space-y-6 pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-0",
                isCheckoutSubmitting && "pointer-events-none",
              )}
              aria-busy={isCheckoutSubmitting}
            >
                <nav
                  aria-label="주문서 작성 순서"
                  className="rounded-2xl border border-border bg-card p-2.5 shadow-sm bp-sm:p-4"
                >
                  <p className="text-ui-body-sm font-medium text-foreground">주문서 작성 순서</p>
                  <div className="mt-2 flex flex-nowrap gap-1.5 overflow-x-auto whitespace-nowrap pb-1 [-ms-overflow-style:none] [scrollbar-width:none] bp-sm:gap-2 [&::-webkit-scrollbar]:hidden">
                    {[
                      { href: "#checkout-order-items", label: "주문 상품" },
                      { href: "#checkout-delivery-method", label: "수령·배송" },
                      {
                        href: "#checkout-recipient-info",
                        label: "배송·연락 정보",
                      },
                      { href: "#checkout-payment-info", label: "결제·혜택" },
                      { href: "#checkout-agreements", label: "약관 동의" },
                      { href: "#checkout-final-confirm", label: "최종 확인" },
                    ].map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        className="shrink-0 rounded-full border border-border bg-secondary/30 px-3 py-1.5 text-ui-label font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bp-sm:px-3.5 bp-sm:py-2 bp-sm:text-ui-body-sm"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </nav>

                {/* 현재 주문 성격 및 작성 안내 */}
                <section
                  aria-label="현재 주문 성격 및 작성 안내"
                  className={cn(
                    "rounded-2xl border border-border bg-card px-4 py-3 shadow-sm bp-sm:px-5",
                    withStringService ? "ring-1 ring-primary/20" : "bg-muted/30",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1",
                        withStringService
                          ? "bg-primary/10 text-primary ring-primary/20"
                          : "bg-muted/60 text-muted-foreground ring-border/60",
                      )}
                    >
                      {withStringService ? (
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <Info className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h2
                        className={cn(
                          "break-keep text-ui-body font-semibold text-foreground",
                          !withStringService && "text-ui-body-sm font-medium",
                        )}
                      >
                        {withStringService ? "교체서비스 포함 주문입니다" : "일반 상품 주문입니다"}
                      </h2>
                      {withStringService ? (
                        <div className="space-y-1 text-ui-body-sm leading-relaxed text-muted-foreground">
                          <p className="break-keep">
                            작업 정보와 수령/배송 방식을 확인하면 함께 접수됩니다.
                          </p>
                          {isStringOnlyServiceFlow && (
                            <p className="break-keep">{stringStandalonePausedNotice}</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1 text-ui-body-sm leading-relaxed text-muted-foreground">
                          <p className="break-keep">교체서비스 없이 상품만 주문합니다.</p>
                          <p className="break-keep text-ui-label text-muted-foreground/90">
                            결제 전 새로고침이나 페이지 이동은 피해주세요.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
                {/* 주문 상품 */}
                <CheckoutSection
                  id="checkout-order-items"
                  icon={<Package className="h-5 w-5" />}
                  title="주문 상품"
                  headerAction={
                    <Badge
                      variant="secondary"
                      className="shrink-0 whitespace-nowrap px-3 py-1 text-ui-caption font-medium"
                    >
                      {orderItems.length}개 상품
                    </Badge>
                  }
                >
                    {isBundleCheckout && bundleQty !== null && (
                      <div className="mb-4 border-l-2 border-primary/25 bg-muted/20 px-3 py-2.5 text-ui-body-sm text-foreground dark:bg-card/30 dark:text-foreground">
                        <p className="font-medium">번들 수량: {bundleQty}개</p>
                        <p className="mt-1 text-muted-foreground">
                          라켓/스트링 수량은 함께 적용됩니다. 변경은{" "}
                          <span className="font-medium text-foreground">스트링 선택 단계</span>
                          에서만 가능합니다.
                        </p>
                        {bundleRacketId && (
                          <div className="mt-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8"
                              asChild
                            >
                              <Link
                                href={`/rackets/${bundleRacketId}/select-string`}
                                data-no-unsaved-guard
                                onClick={onLeaveCartClick}
                              >
                                수량/스트링 변경
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="space-y-3">
                      {orderItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 border-b border-border/50 py-4 last:border-b-0 bp-sm:flex-row bp-sm:items-center bp-sm:gap-5"
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-4">
                            <div className="relative shrink-0">
                              <div className="overflow-hidden rounded-xl ring-2 ring-border/50">
                                <Image
                                  src={
                                    item.image ||
                                    "/placeholder.svg?height=80&width=80&query=tennis+product"
                                  }
                                  alt={item.name}
                                  width={80}
                                  height={80}
                                  loading="lazy"
                                  className="h-16 w-16 bp-sm:h-20 bp-sm:w-20 object-cover"
                                />
                              </div>
                              <div className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-ui-caption font-semibold text-primary-foreground shadow-sm ring-2 ring-card">
                                {item.quantity}
                              </div>
                            </div>

                            <div className="min-w-0 flex-1 space-y-1.5">
                              <h3 className="line-clamp-2 break-keep break-words text-ui-body-sm font-medium leading-relaxed text-foreground bp-sm:text-ui-body">
                                {item.name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-muted/50 px-2 py-0.5 text-ui-label text-foreground/80">
                                  수량 {item.quantity}개
                                </span>
                                {item.selectedGauge && (
                                  <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-ui-label leading-relaxed text-foreground/80">
                                    게이지(굵기) {formatGaugeLabel(item.selectedGauge)}
                                  </span>
                                )}
                                {(item.selectedColorLabel || item.selectedColor) && (
                                  <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-ui-label leading-relaxed text-foreground/80">
                                    색상
                                    {item.selectedColorHex && (
                                      <span
                                        className="h-2.5 w-2.5 rounded-full border border-border/60"
                                        style={{
                                          backgroundColor: item.selectedColorHex,
                                        }}
                                      />
                                    )}
                                    <span className="min-w-0 break-keep break-words">
                                      {item.selectedColorLabel || item.selectedColor}
                                    </span>
                                  </span>
                                )}
                                {withStringService &&
                                  serviceTargetIds.includes(String(item.id)) && (
                                    <Badge
                                      variant="outline"
                                      className="shrink-0 whitespace-nowrap border-primary/30 text-ui-caption text-primary"
                                    >
                                      교체서비스
                                    </Badge>
                                  )}
                              </div>
                            </div>
                          </div>

                          <div className="w-full bp-sm:w-auto bp-sm:min-w-[160px] bp-sm:text-right">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 bp-sm:justify-end">
                              <span className="text-ui-label font-medium text-muted-foreground">
                                {typeof item.regularPrice === "number" &&
                                item.regularPrice > item.price
                                  ? "할인가"
                                  : "판매가"}
                              </span>
                              <div className="whitespace-nowrap text-ui-price font-semibold tabular-nums text-foreground bp-sm:text-ui-price-lg">
                                {item.price.toLocaleString()}
                                <span className="ml-0.5 text-ui-label font-medium text-muted-foreground">
                                  원
                                </span>
                              </div>
                            </div>
                            {typeof item.regularPrice === "number" &&
                              Number.isFinite(item.regularPrice) &&
                              item.regularPrice > item.price && (
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ui-label">
                                  <span className="text-muted-foreground tabular-nums">
                                    정가{" "}
                                    <span className="line-through">
                                      {item.regularPrice.toLocaleString()}원
                                    </span>
                                  </span>
                                  <Badge
                                    variant="destructive"
                                    className="text-ui-micro tabular-nums"
                                  >
                                    {item.discountRate ??
                                      Math.round(
                                        ((item.regularPrice - item.price) / item.regularPrice) *
                                          100,
                                      )}
                                    % OFF
                                  </Badge>
                                </div>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 상품 금액 소계 */}
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-dashed border-border/60 pt-5">
                      <span className="break-keep text-ui-body-sm text-foreground/80">
                        상품 판매가 합계
                      </span>
                      <span className="whitespace-nowrap text-ui-price-lg font-semibold tabular-nums text-foreground">
                        {subtotal.toLocaleString()}
                        <span className="ml-0.5 text-ui-label font-medium text-muted-foreground">
                          원
                        </span>
                      </span>
                    </div>
                </CheckoutSection>

                {/* 수령 방식 및 장착 서비스 카드 */}
                <CheckoutSection
                  id="checkout-delivery-method"
                  icon={<Truck className="h-5 w-5" />}
                  title="수령/배송 방법"
                  description="수령 방식에 맞춰 배송비와 입력 항목이 달라집니다."
                  contentClassName="space-y-4 bp-sm:space-y-5"
                >
                    <RadioGroup
                      value={deliveryMethod}
                      onValueChange={(value) => setDeliveryMethod(value as "택배수령" | "방문수령")}
                      className="grid gap-3"
                    >
                      <label
                        htmlFor="택배수령"
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 transition-[background-color,border-color,box-shadow,color,opacity] duration-200 bp-sm:gap-4 bp-sm:p-4",
                          deliveryMethod === "택배수령"
                            ? "border-primary/80 bg-primary/5 shadow-sm"
                            : "border-border/60 bg-transparent hover:border-border hover:bg-muted/20",
                        )}
                      >
                        <RadioGroupItem value="택배수령" id="택배수령" className="sr-only" />
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                            deliveryMethod === "택배수령" ? "bg-primary/15" : "bg-secondary",
                          )}
                        >
                          <Truck
                            className={cn(
                              "h-6 w-6",
                              deliveryMethod === "택배수령"
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="text-ui-body-sm font-medium text-foreground bp-sm:text-ui-body">
                            택배 발송/수령
                          </div>
                          <div className="mt-0.5 text-ui-label text-muted-foreground bp-sm:text-ui-body-sm">
                            입력한 주소로 상품을 발송합니다.
                          </div>
                        </div>
                        <div
                          className={cn(
                            "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-[background-color,border-color,box-shadow,color,opacity]",
                            deliveryMethod === "택배수령"
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-transparent",
                          )}
                        >
                          {deliveryMethod === "택배수령" && (
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          )}
                        </div>
                      </label>
                      <label
                        htmlFor="방문수령"
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 transition-[background-color,border-color,box-shadow,color,opacity] duration-200 bp-sm:gap-4 bp-sm:p-4",
                          deliveryMethod === "방문수령"
                            ? "border-primary/80 bg-primary/5 shadow-sm"
                            : "border-border/60 bg-transparent hover:border-border hover:bg-muted/20",
                        )}
                      >
                        <RadioGroupItem value="방문수령" id="방문수령" className="sr-only" />
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                            deliveryMethod === "방문수령" ? "bg-primary/15" : "bg-secondary",
                          )}
                        >
                          <Building2
                            className={cn(
                              "h-6 w-6",
                              deliveryMethod === "방문수령"
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-ui-body-sm font-medium text-foreground bp-sm:text-ui-body">
                            오프라인 매장 방문
                          </div>
                          <div className="mt-0.5 text-ui-label text-muted-foreground bp-sm:text-ui-body-sm">
                            매장에서 직접 수령합니다.
                          </div>
                        </div>
                        <div
                          className={cn(
                            "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-[background-color,border-color,box-shadow,color,opacity]",
                            deliveryMethod === "방문수령"
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-transparent",
                          )}
                        >
                          {deliveryMethod === "방문수령" && (
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          )}
                        </div>
                      </label>
                    </RadioGroup>
                    {withStringService && (
                      <div className="border-l-2 border-primary/30 bg-primary/5 px-3 py-2.5 text-ui-body-sm text-muted-foreground bp-md:text-ui-body">
                        <p className="font-medium text-foreground">교체서비스 진행 안내</p>
                        <p className="mt-1 break-keep">
                          {deliveryMethod === "택배수령"
                            ? "결제 후 라켓을 포장해 발송하고, 마이페이지에서 운송장 정보를 등록하면 진행이 빨라집니다."
                            : "예약/방문 안내에 따라 매장에 방문해주세요. 방문 전 신청 상태를 마이페이지에서 확인할 수 있어요."}
                        </p>
                      </div>
                    )}
                </CheckoutSection>

                {/* 배송 정보/수령 정보 */}
                <CheckoutSection
                  id="checkout-recipient-info"
                  icon={<MapPin className="h-5 w-5" />}
                  title={needsShippingAddress ? "배송 정보" : "수령/연락 정보"}
                  description={
                    needsShippingAddress
                      ? "배송과 연락에 필요한 정보를 입력하세요."
                      : "방문 수령 안내를 받을 연락처를 입력하세요."
                  }
                >
                    <div className="w-full space-y-4 bp-sm:space-y-5">
                      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="recipient-name"
                            className="flex items-center gap-2 text-ui-label font-medium"
                          >
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            수령인 이름
                          </Label>
                          <Input
                            id="recipient-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={() => touchField("name")}
                            placeholder="수령인 이름을 입력하세요"
                            className={cn(
                              "h-11 rounded-xl border-border/50 bg-secondary/30 focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/10 transition-[background-color,border-color,box-shadow,color,opacity] duration-200",
                              showNameError &&
                                "border-destructive/50 focus:border-destructive focus:ring-destructive/10",
                            )}
                          />
                          <div className="min-h-[18px]">
                            {showNameError && (
                              <p className="text-ui-label text-destructive animate-in fade-in slide-in-from-top-1">
                                {fieldErrors.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="recipient-email"
                            className="flex items-center gap-2 text-ui-label font-medium"
                          >
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            이메일
                          </Label>
                          <Input
                            id="recipient-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => touchField("email")}
                            placeholder="example@naver.com"
                            className={cn(
                              "h-11 rounded-xl border-border/50 bg-secondary/30 focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/10 transition-[background-color,border-color,box-shadow,color,opacity] duration-200",
                              showEmailError &&
                                "border-destructive/50 focus:border-destructive focus:ring-destructive/10",
                            )}
                          />
                          <div className="min-h-[18px]">
                            {showEmailError && (
                              <p className="text-ui-label text-destructive animate-in fade-in slide-in-from-top-1">
                                {fieldErrors.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label
                            htmlFor="recipient-phone"
                            className="flex items-center gap-2 text-ui-label font-medium"
                          >
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            연락처
                          </Label>
                          <Input
                            id="recipient-phone"
                            value={phone}
                            onChange={(e) => setPhone(formatKoreanPhone010(e.target.value))}
                            onBlur={() => touchField("phone")}
                            placeholder="연락처를 입력하세요 ('-' 제외)"
                            inputMode="numeric"
                            className={cn(
                              "h-11 rounded-xl border-border/50 bg-secondary/30 focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/10 transition-[background-color,border-color,box-shadow,color,opacity] duration-200",
                              showPhoneError &&
                                "border-destructive/50 focus:border-destructive focus:ring-destructive/10",
                            )}
                          />
                          <div className="min-h-[18px]">
                            {showPhoneError && (
                              <p className="text-ui-label text-destructive animate-in fade-in slide-in-from-top-1">
                                {fieldErrors.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {needsShippingAddress && (
                        <div className="space-y-4 border-t border-border/60 pt-5">
                          <div className="space-y-2">
                            <Label
                              htmlFor="address-postal"
                              className="flex items-center gap-2 text-ui-body-sm"
                            >
                              <Home className="h-4 w-4 text-foreground" />
                              우편번호
                            </Label>

                            <div className="flex items-end gap-2">
                              <Input
                                id="address-postal"
                                readOnly
                                value={postalCode}
                                placeholder="우편번호"
                                className={cn(
                                  "h-11 min-w-0 flex-1 cursor-not-allowed border-2 bg-muted bp-sm:max-w-[180px]",
                                  showPostalCodeError && "border-destructive/30",
                                )}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  touchField("postalCode");
                                  handleFindPostcode();
                                }}
                                className="h-11 min-w-0 px-3 bp-sm:px-4"
                              >
                                <MapPin className="mr-1.5 h-4 w-4 shrink-0 bp-sm:mr-2" />
                                우편번호 검색
                              </Button>
                            </div>

                            {/* 에러 메시지 영역 */}
                            <div className="min-h-[16px]">
                              {showPostalCodeError && (
                                <p className="text-ui-label text-destructive">
                                  {fieldErrors.postalCode}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="address-main">기본 주소</Label>
                            <Input
                              id="address-main"
                              readOnly
                              value={address}
                              placeholder="기본 주소"
                              className={cn(
                                "h-11 cursor-not-allowed border-2 bg-muted",
                                showPostalCodeError && "border-destructive/30",
                              )}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="address-detail">상세 주소</Label>
                            <Input
                              id="address-detail"
                              value={addressDetail}
                              onChange={(e) => setAddressDetail(e.target.value)}
                              onBlur={() => touchField("addressDetail")}
                              placeholder="상세 주소를 입력하세요"
                              className={cn(
                                "h-11 border-2 transition-colors focus:border-border",
                                showAddressDetailError &&
                                  "border-destructive/30 focus:border-destructive/30",
                              )}
                            />
                            <div className="min-h-[16px]">
                              {showAddressDetailError && (
                                <p className="text-ui-label text-destructive">
                                  {fieldErrors.addressDetail}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor="delivery-request"
                              className="flex items-center gap-2 text-ui-body-sm"
                            >
                              <MessageSquare className="h-4 w-4 text-foreground" />
                              배송 요청사항
                            </Label>
                            <Textarea
                              id="delivery-request"
                              value={deliveryRequest}
                              onChange={(e) => setDeliveryRequest(e.target.value)}
                              placeholder="배송 요청사항만 입력하세요"
                              className="min-h-[76px] border-2 transition-colors focus:border-border"
                            />
                          </div>

                          <div className="border-l-2 border-border bg-muted/20 px-3 py-2.5">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="save-address"
                                checked={saveAddress}
                                onCheckedChange={(checked) => setSaveAddress(!!checked)}
                                disabled={!user}
                              />
                              <label
                                htmlFor="save-address"
                                className={`text-ui-label font-medium ${!user ? "text-muted-foreground" : "text-foreground"}`}
                              >
                                이 배송지 정보를 저장
                              </label>
                            </div>
                            {!user && (
                              <p className="text-ui-body-sm text-foreground/80 ml-6 mt-1">
                                로그인 후 배송지 정보를 저장할 수 있습니다.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                </CheckoutSection>

                {withStringService && checkoutStringingAdapter && (
                  <CheckoutStringingServiceSections
                    withStringService={withStringService}
                    adapter={checkoutStringingAdapter}
                    showValidationErrors={showStringingValidationErrors}
                  />
                )}

                {/* 결제 정보 */}
                <CheckoutSection
                  id="checkout-payment-info"
                  icon={<CreditCard className="h-5 w-5" />}
                  title="결제 정보"
                  description="포인트와 패키지 적용 후 결제수단을 선택하세요."
                >
                    <div className="space-y-5 bp-sm:space-y-6">
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-primary" />
                          할인 및 혜택
                        </Label>
                        <div className="space-y-3 border-l-2 border-border bg-muted/20 px-3 py-2.5 bp-sm:px-4">
                          <div className="flex justify-between items-center text-ui-body-sm">
                            <span className="text-muted-foreground">사용 가능 포인트</span>
                            <span className="font-semibold">
                              {user
                                ? pointsFetchError
                                  ? "-"
                                  : pointsAvailable === null
                                    ? "-"
                                    : `${pointsAvailable.toLocaleString()}P`
                                : "로그인 필요"}
                            </span>
                          </div>
                          {user && pointsFetchError && (
                            <p className="text-ui-label text-destructive">
                              포인트 정보를 불러오지 못했습니다.
                            </p>
                          )}
                          {user && !pointsFetchError && resolvedPointsDebt > 0 && (
                            <p className="text-ui-label text-destructive">
                              회수 예정 포인트(채무): {resolvedPointsDebt.toLocaleString()}P →
                              적립금이 먼저 상계됩니다.
                            </p>
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-ui-body-sm">
                              <Checkbox
                                id="useAllPoints"
                                checked={useAllPoints}
                                onCheckedChange={(checked) => {
                                  const nextUseAll = Boolean(checked);
                                  const nextPoints = nextUseAll ? maxPointsToUse : 0;

                                  setUseAllPoints(nextUseAll);
                                  setIsEditingPoints(false);
                                  setPointsToUse(nextPoints);
                                  setPointsInput(nextPoints.toLocaleString("ko-KR"));
                                }}
                                disabled={
                                  !isShippingFeeReady ||
                                  !user ||
                                  !!pointsFetchError ||
                                  pointsAvailable === null ||
                                  resolvedPointsAvailable <= 0 ||
                                  maxPointsToUse <= 0
                                }
                              />
                              <Label
                                htmlFor="useAllPoints"
                                className="text-ui-label font-medium cursor-pointer"
                              >
                                전액 사용
                              </Label>
                            </div>
                            <div className="flex items-center gap-2 text-ui-body-sm">
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9,]*"
                                min={0}
                                step={POINT_UNIT}
                                max={maxPointsToUse}
                                className="w-24 text-right h-9"
                                value={pointsInput}
                                disabled={
                                  !isShippingFeeReady ||
                                  !user ||
                                  !!pointsFetchError ||
                                  pointsAvailable === null ||
                                  resolvedPointsAvailable <= 0 ||
                                  maxPointsToUse <= 0 ||
                                  useAllPoints
                                }
                                onFocus={(e) => {
                                  setIsEditingPoints(true);
                                  const el = e.currentTarget;
                                  if (pointsInput === "0") setPointsInput("");
                                  setTimeout(() => {
                                    if (el && typeof el.select === "function") el.select();
                                  }, 0);
                                }}
                                onChange={(e) => {
                                  const onlyDigits = e.target.value
                                    .replace(/[^\d]/g, "")
                                    .replace(/^0+(?=\d)/, "");

                                  const raw = onlyDigits ? Number(onlyDigits) : 0;
                                  const safe = Number.isFinite(raw) ? Math.floor(raw) : 0;
                                  const clamped = Math.max(0, Math.min(safe, maxPointsToUse));

                                  setUseAllPoints(false);
                                  setPointsToUse(clamped);
                                  setPointsInput(onlyDigits ? clamped.toLocaleString("ko-KR") : "");
                                }}
                                onBlur={(e) => {
                                  setIsEditingPoints(false);
                                  const rawText = e.currentTarget.value ?? "";
                                  const onlyDigits = String(rawText).replace(/[^\d]/g, "");
                                  const raw = Number(onlyDigits || "0");
                                  const safe = Number.isFinite(raw) ? Math.floor(raw) : 0;
                                  const normalized = Math.floor(safe / POINT_UNIT) * POINT_UNIT;
                                  const clamped = Math.max(0, Math.min(normalized, maxPointsToUse));
                                  setPointsInput(clamped.toLocaleString("ko-KR"));
                                  setPointsToUse(clamped);
                                }}
                              />
                              <span className="break-keep text-ui-body-sm text-foreground/80">
                                P
                              </span>
                            </div>
                          </div>
                          <p className="break-keep text-ui-body-sm text-foreground/80">
                            배송비에는 적용되지 않습니다. 최대 {maxPointsToUse.toLocaleString()}P
                            사용 가능
                          </p>
                        </div>
                      </div>

                      {withStringService && checkoutStringingAdapter && (
                        <CheckoutStringingPaymentAddon
                          packagePreview={checkoutStringingAdapter.packagePreview}
                          packageRemaining={checkoutStringingAdapter.packageRemaining}
                          requiredPassCount={checkoutStringingAdapter.requiredPassCount}
                          canApplyPackage={checkoutStringingAdapter.canApplyPackage}
                          usingPackage={checkoutStringingAdapter.usingPackage}
                          packageInsufficient={checkoutStringingAdapter.packageInsufficient}
                          packageOptOut={!!checkoutStringingAdapter.formData.packageOptOut}
                          onPackageOptOutChange={(next) => {
                            checkoutStringingAdapter.setFormData((prev) => ({
                              ...prev,
                              packageOptOut: next,
                            }));
                          }}
                        />
                      )}

                      <div className="space-y-3">
                        <Label>결제수단</Label>
                        <RadioGroup
                          value={paymentMethod}
                          onValueChange={(v) => {
                            if (!nicePaymentsEnabled && v === "nicepay") return;
                            if (v === "nicepay" && isZeroPayableAmount) return;
                            setPaymentMethod(v as "bank-transfer" | "nicepay");
                          }}
                          className="space-y-3"
                        >
                          <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-transparent p-3 transition-colors hover:bg-muted/20 bp-sm:p-3.5">
                            <RadioGroupItem value="bank-transfer" id="bank-transfer" />
                            <Label
                              htmlFor="bank-transfer"
                              className="min-w-0 flex-1 cursor-pointer break-keep font-medium leading-relaxed"
                            >
                              무통장입금
                            </Label>
                            <Building2 className="h-5 w-5 text-foreground" />
                          </div>
                          {nicePaymentsEnabled && (
                            <div
                              className={cn(
                                "flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-transparent p-3 transition-colors hover:bg-muted/20 bp-sm:p-3.5",
                                isZeroPayableAmount && "opacity-60",
                              )}
                            >
                              <RadioGroupItem
                                value="nicepay"
                                id="nicepay"
                                disabled={isZeroPayableAmount}
                              />
                              <Label
                                htmlFor="nicepay"
                                className={cn(
                                  "min-w-0 flex-1 cursor-pointer break-keep font-medium leading-relaxed",
                                  isZeroPayableAmount && "cursor-not-allowed text-muted-foreground",
                                )}
                              >
                                카드/간편결제
                              </Label>
                              <CreditCard className="h-5 w-5 text-foreground" />
                            </div>
                          )}
                        </RadioGroup>
                        {nicePaymentsEnabled && isZeroPayableAmount && (
                          <p className="break-keep text-ui-body-sm text-foreground/80">
                            결제 예정 금액이 0원인 경우 카드/간편결제를 사용할 수 없습니다.
                          </p>
                        )}
                      </div>

                      {paymentMethod === "bank-transfer" && (
                        <>
                          <div className="space-y-3">
                            <Label htmlFor="bank-account">입금 계좌 선택</Label>
                            <Select value={selectedBank} onValueChange={setSelectedBank}>
                              <SelectTrigger className="border-2 focus:border-border">
                                <SelectValue placeholder="입금 계좌를 선택하세요" />
                              </SelectTrigger>
                              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                                <SelectItem
                                  value="kakao"
                                  className="whitespace-normal break-words leading-snug"
                                >
                                  카카오뱅크 {bankLabelMap.kakao.account} (예금주:{" "}
                                  {bankLabelMap.kakao.holder})
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
                              onBlur={() => touchField("depositor")}
                              placeholder="입금자명을 입력하세요"
                              className={cn(
                                "border-2 focus:border-border transition-colors",
                                showDepositorError &&
                                  "border-destructive/30 focus:border-destructive/30",
                              )}
                            />
                            <div className="min-h-[16px]">
                              {showDepositorError && (
                                <p className="text-ui-label text-destructive">
                                  {fieldErrors.depositor}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="border-l-2 border-border bg-muted/20 px-3 py-2.5">
                            <div className="flex items-center gap-2 mb-3">
                              <Shield className="h-5 w-5 text-primary" />
                              <p className="font-semibold text-foreground">무통장입금 안내</p>
                            </div>
                            <ul className="space-y-2 text-ui-body-sm text-foreground">
                              <li className="flex items-start gap-2 text-ui-body-sm leading-relaxed bp-sm:text-ui-body">
                                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                주문 후 24시간 이내에 입금해 주셔야 주문이 정상 처리됩니다.
                              </li>
                              <li className="flex items-start gap-2 text-ui-body-sm leading-relaxed bp-sm:text-ui-body">
                                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                입금자명이 주문자명과 다를 경우, 고객센터로 연락 부탁드립니다.
                              </li>
                              <li className="flex items-start gap-2 text-ui-body-sm leading-relaxed bp-sm:text-ui-body">
                                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                {needsShippingAddress
                                  ? "입금 확인 후 배송이 시작됩니다."
                                  : "입금 확인 후 매장 수령 준비가 시작됩니다."}
                              </li>
                            </ul>
                          </div>
                        </>
                      )}
                    </div>
                </CheckoutSection>

                {/* 주문자 동의 */}
                <CheckoutSection
                  id="checkout-agreements"
                  icon={<CheckCircle className="h-5 w-5" />}
                  title="주문자 동의"
                  description="필수 약관에 동의하면 결제를 진행할 수 있습니다."
                >
                    <div className="space-y-5">
                      <label
                        htmlFor="agree-all"
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-[background-color,border-color,box-shadow,color,opacity] duration-200 bp-sm:p-3.5",
                          agreeAll
                            ? "border-primary/80 bg-primary/5"
                            : "border-border/60 hover:border-border hover:bg-muted/20",
                        )}
                      >
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
                          className="h-5 w-5"
                        />
                        <span className="min-w-0 break-words text-ui-card-title font-semibold text-foreground bp-sm:text-ui-card-title-lg">
                          전체 동의
                        </span>
                      </label>
                      <Separator />
                      <div className="divide-y divide-border/60 border-y border-border/60">
                        {[
                          {
                            id: "agree-terms",
                            label: "이용약관 동의 (필수)",
                            state: agreeTerms,
                            setState: setAgreeTerms,
                            href: "/terms",
                          },
                          {
                            id: "agree-privacy",
                            label: "개인정보 수집 및 이용 동의 (필수)",
                            state: agreePrivacy,
                            setState: setAgreePrivacy,
                            href: "/privacy",
                          },
                          {
                            id: "agree-refund",
                            label: "환불 규정 동의 (필수)",
                            state: agreeRefund,
                            setState: setAgreeRefund,
                            href: "/refund-policy",
                          },
                        ].map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "flex min-w-0 items-center justify-between gap-2 py-3 transition-[background-color,border-color,box-shadow,color,opacity] duration-200 bp-sm:py-3.5",
                              item.state ? "bg-primary/5" : "hover:bg-muted/20",
                            )}
                          >
                            <label
                              htmlFor={item.id}
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                            >
                              <Checkbox
                                id={item.id}
                                checked={item.state}
                                onCheckedChange={(checked) => {
                                  const value = !!checked;
                                  item.setState(value);
                                  if (!value) setAgreeAll(false);
                                  else if (agreeTerms && agreePrivacy && agreeRefund)
                                    setAgreeAll(true);
                                }}
                              />
                              <span className="min-w-0 break-words text-ui-body-sm font-medium text-foreground">
                                {item.label}
                              </span>
                            </label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 shrink-0 px-2.5 text-ui-body-sm text-foreground/80 hover:text-foreground bp-sm:px-3"
                              asChild
                            >
                              <Link href={item.href} target="_blank" rel="noopener noreferrer">
                                보기
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                </CheckoutSection>

                <div id="checkout-final-confirm" className="scroll-mt-24">
                  <FinalPaymentConfirmCard
                    orderItemsCount={orderItems.length}
                    subtotal={subtotal}
                    regularSubtotal={regularSubtotal}
                    shippingFee={shippingFee}
                    serviceFee={finalServiceFee}
                    baseServiceFee={baseServiceFee}
                    packageUsage={checkoutPackageUsage}
                    withStringService={withStringService}
                    appliedPoints={appliedPoints}
                    totalPrice={totalPrice}
                    payableTotalPrice={payableTotalPrice}
                    isShippingFeeReady={isShippingFeeReady}
                    isMountingFeeReady={isMountingFeeReady}
                    paymentMethod={paymentMethod}
                    selectedBank={selectedBank}
                    depositor={depositor}
                  />
                </div>

                <CheckoutBottomStickyBar
                  amount={payableTotalPrice}
                  amountLabel="결제 예정 금액"
                  label={paymentMethod === "bank-transfer" ? "주문 완료하기" : "결제하기"}
                  disabled={!resolvedCanSubmit || isCheckoutSubmitting}
                  loading={isCheckoutSubmitting}
                  ariaLabel="하단 결제 버튼"
                  onClick={() => {
                    requestStringingValidationMessages();
                    const target = document.getElementById(CHECKOUT_PRIMARY_PAY_BUTTON_ID);
                    if (target instanceof HTMLButtonElement && !target.disabled) {
                      target.click();
                      return;
                    }
                    document.getElementById("checkout-payment-action")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                />

                <Card
                  id="checkout-payment-action"
                  className="relative border border-border bg-card shadow-sm overflow-hidden"
                >
                  <CardContent className="flex flex-col gap-4 p-4 bp-sm:p-6 shrink-0">
                    {(fieldErrors.items ||
                      fieldErrors.bundle ||
                      (isMountingFeeReady && fieldErrors.composition) ||
                      hasStringingLineErrors ||
                      stringingApplicationError) && (
                      <div className="w-full rounded-lg border border-destructive/30 bg-destructive/15 p-3 text-ui-body-sm text-destructive dark:bg-destructive/20">
                        <p className="font-semibold mb-1">확인 필요</p>
                        {fieldErrors.items && <p>• {fieldErrors.items}</p>}
                        {fieldErrors.bundle && <p>• {fieldErrors.bundle}</p>}
                        {hasStringingLineErrors && (
                          <p>• 교체서비스 라켓명과 텐션을 모두 입력해 주세요.</p>
                        )}
                        {stringingApplicationError && <p>• {stringingApplicationError}</p>}
                        {fieldErrors.composition && (
                          <p>
                            • {fieldErrors.composition}{" "}
                            {mode !== "buynow" && (
                              <Link
                                href="/cart"
                                data-no-unsaved-guard
                                onClick={onLeaveCartClick}
                                className="underline underline-offset-2"
                              >
                                (장바구니에서 정리)
                              </Link>
                            )}
                          </p>
                        )}
                        {fieldErrors.composition && mode !== "buynow" && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              href="/cart"
                              data-no-unsaved-guard
                              onClick={onLeaveCartClick}
                              className="inline-flex items-center justify-center rounded-md bg-muted/50 dark:bg-card/60 px-3 py-2 text-ui-body-sm font-medium text-foreground hover:bg-muted"
                            >
                              장바구니로 가서 정리하기
                            </Link>
                            <span className="break-keep text-ui-body-sm text-foreground/80">
                              정리 후 다시 이 페이지로 돌아와 주문을 진행해주세요.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mx-auto w-full max-w-md">
                      {paymentMethod === "bank-transfer" ? (
                        <div
                          onPointerDownCapture={requestStringingValidationMessages}
                          className="w-full"
                        >
                          <CheckoutButton
                            buttonId={CHECKOUT_PRIMARY_PAY_BUTTON_ID}
                            disabled={!resolvedCanSubmit}
                            name={name}
                            phone={phone}
                            email={email}
                            postalCode={postalCode}
                            address={address}
                            addressDetail={addressDetail}
                            depositor={depositor}
                            totalPrice={totalPrice}
                            shippingFee={shippingFee}
                            payableAmount={payableTotalPrice}
                            selectedBank={selectedBank}
                            deliveryRequest={deliveryRequest}
                            saveAddress={saveAddress}
                            deliveryMethod={deliveryMethod}
                            serviceTargetIds={serviceTargetIds}
                            withStringService={withStringService}
                            servicePickupMethod={servicePickupMethod}
                            items={orderItems}
                            serviceFee={finalServiceFee}
                            pointsToUse={appliedPoints}
                            stringingApplicationInput={stringingApplicationInput}
                            onSubmittingChange={setIsCheckoutSubmitting}
                            onBeforeSuccessNavigation={() =>
                              setIsIntentionalSuccessNavigation(true)
                            }
                            onSuccessNavigationAbort={() =>
                              setIsIntentionalSuccessNavigation(false)
                            }
                          />
                        </div>
                      ) : nicePaymentsEnabled && !isZeroPayableAmount ? (
                        <div
                          onPointerDownCapture={requestStringingValidationMessages}
                          className="w-full"
                        >
                          <NiceCheckoutButton
                            buttonId={CHECKOUT_PRIMARY_PAY_BUTTON_ID}
                            disabled={!resolvedCanSubmit}
                            onBeforeSuccessNavigation={() =>
                              setIsIntentionalSuccessNavigation(true)
                            }
                            onSuccessNavigationAbort={() =>
                              setIsIntentionalSuccessNavigation(false)
                            }
                            payableAmount={payableTotalPrice}
                            payload={{
                              items: orderItems.map((item) => ({
                                productId: item.id,
                                quantity: item.quantity,
                                kind: item.kind ?? "product",
                                selectedGauge: item.selectedGauge,
                                selectedColor: item.selectedColor,
                                selectedColorLabel: item.selectedColorLabel,
                                selectedColorHex: item.selectedColorHex,
                                selectedColorImage: item.selectedColorImage,
                              })),
                              shippingInfo: {
                                name: name.trim(),
                                phone: phone.replace(/\D/g, ""),
                                address: address.trim(),
                                addressDetail: addressDetail.trim(),
                                postalCode: postalCode.replace(/\D/g, ""),
                                depositor: "나이스결제",
                                deliveryRequest: deliveryRequest.trim(),
                                deliveryMethod,
                                withStringService,
                              },
                              paymentInfo: { method: "나이스페이" },
                              totalPrice,
                              shippingFee,
                              serviceFee: finalServiceFee,
                              pointsToUse: appliedPoints,
                              guestInfo: !user
                                ? {
                                    name: name.trim(),
                                    phone: phone.replace(/\D/g, ""),
                                    email: email.trim().toLowerCase(),
                                  }
                                : undefined,
                              isStringServiceApplied: withStringService,
                              servicePickupMethod,
                              stringingApplicationInput:
                                withStringService && stringingApplicationInput
                                  ? stringingApplicationInput
                                  : undefined,
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                    {/* <Button variant="outline" className="w-full border-2 hover:bg-background dark:hover:bg-muted bg-transparent" asChild>
                      <Link href="/cart" data-no-unsaved-guard onClick={onLeaveCartClick}>
                        장바구니로 돌아가기
                      </Link>
                    </Button> */}
                  </CardContent>
                  {isCheckoutSubmitting && (
                    <div className="absolute inset-0 z-10 cursor-wait bg-overlay/10 backdrop-blur-[2px]">
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="flex items-center gap-3 rounded-xl bg-card/90 px-4 py-3 shadow">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="text-ui-body-sm">주문을 처리하고 있어요…</span>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
            </div>
          </div>
        </SiteContainer>
      </div>
    );
  };

  if (!withStringService) return renderCheckout();

  return (
    <CheckoutStringingRuntimeBridge
      withStringService={withStringService}
      orderItems={orderItems}
      mountingFeeByProductId={mountingFeeByProductId}
      serviceTargetIds={serviceTargetIds}
      name={name}
      email={email}
      phone={phone}
      postalCode={postalCode}
      address={address}
      addressDetail={addressDetail}
      depositor={depositor}
      selectedBank={selectedBank}
      servicePickupMethod={servicePickupMethod}
      isMember={!!user}
    >
      {(checkoutStringingAdapter: CheckoutStringingServiceAdapter) =>
        renderCheckout(checkoutStringingAdapter)
      }
    </CheckoutStringingRuntimeBridge>
  );
}
