"use client";

import { type StringingApplicationInput } from "@/app/features/stringing-applications/api/submit-core";
import type useRentalCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useRentalCheckoutStringingServiceAdapter";
import RentalCheckoutStringingRuntimeBridge from "@/app/rentals/[id]/checkout/_components/RentalCheckoutStringingRuntimeBridge";
import RentalCheckoutStringingSections from "@/app/rentals/[id]/checkout/_components/RentalCheckoutStringingSections";
import RentalNiceCheckoutButton from "@/app/rentals/[id]/checkout/_components/RentalNiceCheckoutButton";
import SiteContainer from "@/components/layout/SiteContainer";
import CheckoutBottomStickyBar from "@/components/checkout/CheckoutBottomStickyBar";
import RefundBankCombobox from "@/components/refund/RefundBankCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { getMyInfo } from "@/lib/auth.client";
import { badgeToneVariant } from "@/lib/badge-style";
import { bankLabelMap, racketBrandLabel } from "@/lib/constants";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import { useBackNavigationGuard } from "@/lib/hooks/useBackNavigationGuard";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import { loadDaumPostcode } from "@/lib/loadDaumPostcode";
import { isNicePaymentsEnabled } from "@/lib/payments/provider-flags";
import { isRefundBankCode } from "@/lib/refund-bank-catalog";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  Building2,
  CheckCircle,
  CreditCard,
  Home,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Shield,
  Truck,
  Undo2,
  UserIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    daum: any;
  }
}

// 제출 직전 최종 유효성 가드
type PaymentBank = "kakao";
const RENTAL_PRIMARY_PAY_BUTTON_ID = "rental-primary-pay-button";
const RENTAL_PAYMENT_ACTION_ID = "rental-checkout-payment-action";

type PaymentMethod = "bank_transfer" | "nicepay";
const PAYMENT_BANKS = new Set<PaymentBank>(["kakao"]);
const POSTAL_RE = /^\d{5}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const onlyDigits = (v: string) => String(v ?? "").replace(/\D/g, "");
const isValidKoreanPhone = (v: string) => /^010\d{8}$/.test(onlyDigits(v));
const isValidAccountDigits = (v: string) => {
  const d = onlyDigits(v);
  return d.length >= 8 && d.length <= 20;
};

const RENTAL_IDEM_STORE_KEY = "rentals.checkout.idem.v1";
const RENTAL_IDEM_TTL_MS = 15 * 60 * 1000;

const buildRentalCheckoutSignature = (params: {
  racketId: string;
  days: number;
  requestStringing: boolean;
  selectedStringId?: string | null;
}) => {
  return [
    params.racketId,
    String(params.days),
    params.requestStringing ? "1" : "0",
    params.selectedStringId ? String(params.selectedStringId) : "",
  ].join("|");
};

const getOrCreateRentalIdemKey = (signature: string) => {
  if (typeof window === "undefined") return crypto.randomUUID();
  try {
    const raw = window.sessionStorage.getItem(RENTAL_IDEM_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        key?: string;
        signature?: string;
        ts?: number;
      };
      const fresh = typeof parsed.ts === "number" && Date.now() - parsed.ts < RENTAL_IDEM_TTL_MS;
      if (fresh && parsed.signature === signature && typeof parsed.key === "string" && parsed.key)
        return parsed.key;
    }
    const key = crypto.randomUUID();
    window.sessionStorage.setItem(
      RENTAL_IDEM_STORE_KEY,
      JSON.stringify({ key, signature, ts: Date.now() }),
    );
    return key;
  } catch {
    return crypto.randomUUID();
  }
};

const clearRentalIdemKey = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(RENTAL_IDEM_STORE_KEY);
  } catch {}
};

type RentalCheckoutStringingAdapter = ReturnType<typeof useRentalCheckoutStringingServiceAdapter>;

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
    regularPrice?: number;
    discountRate?: number;
    discountAmount?: number;
    mountingFee: number; // 상품별 교체비(장착비)
    image: string | null;
  };
  racket: {
    id: string;
    brand: string;
    model: string;
    image: string | null;
    condition: "A" | "B" | "C";
  } | null;
};

export default function RentalsCheckoutClient({
  initial,
  selectedGauge,
  selectedColor,
}: {
  initial: Initial;
  selectedGauge?: string;
  selectedColor?: string;
}) {
  const router = useRouter();
  const submitIdemKeyRef = useRef<string | null>(null);
  /**
   * 구매 플로우와 동일한 규칙
   * - "스트링 교체 신청 여부"는 체크박스 토글이 아니라 **선택된 스트링(stringId) 유무**로 결정한다.
   * - 이유:
   * 1) 사용자가 실수로 "신청 체크"만 하고 스트링을 안 고르는 케이스를 원천 차단
   * 2) URL/서버/DB 로직이 단순해지고, 구매 UX와 체감이 동일해짐
   */
  const selectedString = initial.selectedString ?? null;
  const rentalRacketName = initial.racket
    ? `${racketBrandLabel(initial.racket.brand)} ${initial.racket.model}`.trim()
    : "대여 라켓";
  const requestStringing = Boolean(selectedString?.id);
  const normalizedSelectedColor =
    typeof selectedColor === "string" && selectedColor.trim() ? selectedColor.trim() : "";
  const stringingPayload = {
    requested: !!requestStringing,
    stringId: requestStringing ? selectedString?.id : undefined,
    selectedGauge: requestStringing ? selectedGauge || undefined : undefined,
    selectedColor: requestStringing ? normalizedSelectedColor || undefined : undefined,
  };

  // --- 수령 방식(택배/방문수령) ---
  type DeliveryMethod = "택배수령" | "방문수령";
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("택배수령");
  const isVisitPickup = deliveryMethod === "방문수령";

  /**
   * 스트링 교체 신청서(/services/apply)에서 기본 수령/방문 방식을 결정하는 값
   * - SELF_SEND: 레거시 택배 수령 매핑값(대여 라켓은 매장에서 장착 후 발송)
   * - SHOP_VISIT: 매장 방문 수령(방문 시간 선택 UI가 열리는 쪽)
   */
  const servicePickupMethod = deliveryMethod === "방문수령" ? "SHOP_VISIT" : "SELF_SEND";

  // 로그인 여부/포인트 조회를 위한 최소 상태(게스트면 null 유지)
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostal] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [deliveryRequest, setRequest] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedBank, setSelectedBank] = useState<"kakao">("kakao");
  const [depositor, setDepositor] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const nicePaymentsEnabled = isNicePaymentsEnabled();

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
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [pointsDebt, setPointsDebt] = useState<number | null>(null);
  // 포인트 조회 상태를 분리해 실패/미확정을 실제 0P로 오해하지 않게 한다.
  const [pointsStatus, setPointsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const pointsAvailable =
    pointsStatus === "ready" ? Math.max(0, (pointsBalance ?? 0) - (pointsDebt ?? 0)) : 0;

  const [useAllPoints, setUseAllPoints] = useState(false);
  const [pointsInput, setPointsInput] = useState("0");
  const [pointsToUse, setPointsToUse] = useState(0);

  // 정책: 보증금(initial.deposit)에는 포인트 적용 금지 → (총액 - 보증금)까지만 가능
  const maxPointsByPolicy = Math.max(0, total - initial.deposit);
  const maxPointsToUse =
    pointsStatus === "ready" ? Math.min(pointsAvailable, maxPointsByPolicy) : 0;
  const normalizePoints = (raw: number) => Math.floor(raw / POINT_UNIT) * POINT_UNIT;
  const clampPoints = (raw: number) => {
    const normalized = normalizePoints(raw);
    const maxNormalized = normalizePoints(maxPointsToUse);
    return Math.max(0, Math.min(normalized, maxNormalized));
  };

  // 실제 적용될 포인트(게스트면 0으로 강제)
  const appliedPoints = userId && pointsStatus === "ready" ? clampPoints(pointsToUse) : 0;
  const payableTotal = Math.max(0, total - appliedPoints);

  const [refundBank, setRefundBank] = useState("");
  const [refundAccount, setRefundAccount] = useState(""); // 계좌번호
  const [refundHolder, setRefundHolder] = useState(""); // 예금주

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);

  const [prefillReady, setPrefillReady] = useState(false);
  const [stringingDirtySignature, setStringingDirtySignature] = useState<string | null>(null);
  const [isIntentionalSuccessNavigation, setIsIntentionalSuccessNavigation] = useState(false);

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
        paymentMethod,
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
        // 브릿지 내부 런타임 훅 데이터는 requestStringing=true 구간에서만 사용한다.
        stringingFormData: requestStringing ? stringingDirtySignature : null,
      }),
    [
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
      paymentMethod,
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
      requestStringing,
      stringingDirtySignature,
    ],
  );
  const baselineRef = useRef<string | null>(null);
  const isDirty = useMemo(
    () => baselineRef.current !== null && baselineRef.current !== fingerprint,
    [fingerprint],
  );

  useEffect(() => {
    if (!prefillReady) return;
    if (baselineRef.current !== null) return;
    baselineRef.current = fingerprint;
  }, [prefillReady, fingerprint]);

  const guardEnabled = isDirty && !isIntentionalSuccessNavigation;
  useUnsavedChangesGuard(guardEnabled);
  useBackNavigationGuard(guardEnabled);

  const pushIfSafe = (href: string) => {
    if (isDirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
    router.push(href);
  };

  // 회원 배송 정보 자동 채움
  useEffect(() => {
    let cancelled = false;
    getMyInfo({ quiet: true })
      .then(({ user }) => {
        if (!user || cancelled) return;
        const me = user as typeof user & {
          _id?: string;
          phone?: string | null;
          postalCode?: string | null;
          address?: string | null;
          addressDetail?: string | null;
        };
        setUserId(String(me._id ?? me.id ?? ""));
        setName(me.name || "");
        setEmail(me.email || "");
        setPhone(me.phone || "");
        setPostal(me.postalCode || "");
        setAddress(me.address || "");
        setAddressDetail(me.addressDetail || "");
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

    // 게스트면 포인트 상태를 초기화
    if (!userId) {
      setPointsStatus("idle");
      setPointsBalance(null);
      setPointsDebt(null);
      setUseAllPoints(false);
      setPointsToUse(0);
      setPointsInput("0");
      return;
    }

    setPointsStatus("loading");

    fetch("/api/points/me", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`points fetch failed: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const nextBalance = Number(data?.balance);
        const nextDebt = Number(data?.debt);
        if (!Number.isFinite(nextBalance) || !Number.isFinite(nextDebt)) {
          throw new Error("invalid points payload");
        }
        setPointsBalance(nextBalance);
        setPointsDebt(nextDebt);
        setPointsStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        // 조회 실패를 0P로 덮지 않고 오류 상태로 분리한다.
        setPointsStatus("error");
        setPointsBalance(null);
        setPointsDebt(null);
        setUseAllPoints(false);
        setPointsToUse(0);
        setPointsInput("0");
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
  }, [useAllPoints, maxPointsToUse]);

  // 총액/포인트한도 변화로 기존 입력이 한도를 넘으면 자동 clamp
  useEffect(() => {
    const v = clampPoints(pointsToUse);
    if (v !== pointsToUse) {
      setPointsToUse(v);
      setPointsInput(String(v));
    }
  }, [maxPointsToUse]);

  useEffect(() => {
    if (!nicePaymentsEnabled && paymentMethod === "nicepay") {
      setPaymentMethod("bank_transfer");
    }
  }, [nicePaymentsEnabled, paymentMethod]);

  // 우편번호 검색기
  const openPostcode = async () => {
    try {
      await loadDaumPostcode();
    } catch {
      showErrorToast("주소 검색기를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!window?.daum?.Postcode) return;
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        setPostal(String(data.zonecode || ""));
        setAddress(String(data.roadAddress || data.address || ""));
        // 기본주소/우편번호는 readOnly 정책 → 상세주소로 포커스 유도
        setTimeout(() => document.getElementById("address-detail")?.focus(), 0);
      },
    }).open();
  };

  const onPay = async (rentalStringingAdapter?: RentalCheckoutStringingAdapter) => {
    // 중복 클릭/중복 요청 방지(버튼 disabled 우회 대비)
    if (loading) return;
    if (requestStringing && !selectedString?.id) {
      showErrorToast("스트링 교체를 함께 진행하려면 먼저 스트링을 선택해주세요.");
      pushIfSafe(`/rentals/${initial.racketId}/select-string?period=${initial.period}`);
      return;
    }

    if (requestStringing && !rentalStringingAdapter) {
      showErrorToast("교체서비스 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const stringingApplicationInput: StringingApplicationInput | undefined =
      requestStringing && rentalStringingAdapter
        ? (() => {
            const form = rentalStringingAdapter.formData;
            const isVisitCollection = form.collectionMethod === "visit";
            const stringTypes = (form.stringTypes ?? []).filter(Boolean);
            const lines = (rentalStringingAdapter.linesForSubmit ?? []).filter(
              (line) => line?.stringProductId,
            );

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
                address: isVisitCollection ? "" : address.trim(),
                addressDetail: isVisitCollection ? "" : addressDetail.trim(),
                postalCode: isVisitCollection ? "" : postalCode.trim(),
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
              packageOptOut: true,
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
          })()
        : undefined;

    let success = false;
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
      const selectedBankValue = selectedBank as PaymentBank | "";
      const refundBankValue = String(refundBank ?? "").trim();
      const refundAccountDigits = onlyDigits(refundAccount);
      const refundHolderTrim = refundHolder.trim();

      // 필수 입력
      if (!nameTrim || !phoneDigits) {
        showErrorToast("필수 정보를 모두 입력해주세요.");
        return;
      }
      if (!isVisitPickup && (!postalDigits || !addressTrim)) {
        showErrorToast("택배 수령 시 주소 정보를 모두 입력해주세요.");
        return;
      }
      if (nameTrim.length < 2) {
        showErrorToast("수령인 이름은 2자 이상 입력해주세요.");
        return;
      }
      if (!isValidKoreanPhone(phoneDigits)) {
        showErrorToast("올바른 연락처 형식(01012345678)으로 입력해주세요.");
        return;
      }
      if (!isVisitPickup && !POSTAL_RE.test(postalDigits)) {
        showErrorToast("우편번호(5자리)를 확인해주세요.");
        return;
      }
      // 이메일은 선택값이지만, 입력했다면 형식은 보장
      if (emailTrim && !EMAIL_RE.test(emailTrim)) {
        showErrorToast("이메일 형식을 확인해주세요.");
        return;
      }

      // 결제(무통장) 정보
      if (!selectedBankValue || !depositorTrim) {
        showErrorToast("입금 은행과 입금자명을 입력해주세요.");
        return;
      }
      if (!PAYMENT_BANKS.has(selectedBankValue)) {
        showErrorToast("입금 은행 값이 올바르지 않습니다. 다시 선택해주세요.");
        return;
      }
      if (depositorTrim.length < 2) {
        showErrorToast("입금자명은 2자 이상 입력해주세요.");
        return;
      }

      // 환급 계좌(보증금) 정보
      if (!refundBankValue || !refundAccountDigits || !refundHolderTrim) {
        showErrorToast("보증금 환급 계좌(은행/계좌번호/예금주)를 모두 입력해주세요.");
        return;
      }
      if (!isRefundBankCode(refundBankValue)) {
        showErrorToast("환급 은행 값이 올바르지 않습니다. 다시 선택해주세요.");
        return;
      }
      if (!isValidAccountDigits(refundAccountDigits)) {
        showErrorToast("환급 계좌번호는 숫자만 8~20자리로 입력해주세요.");
        return;
      }
      if (refundHolderTrim.length < 2) {
        showErrorToast("환급 예금주는 2자 이상 입력해주세요.");
        return;
      }

      // 약관 동의
      if (!agreeTerms || !agreePrivacy || !agreeRefund) {
        showErrorToast("필수 약관에 모두 동의해주세요.");
        return;
      }

      setLoading(true);

      const submitSignature = buildRentalCheckoutSignature({
        racketId: initial.racketId,
        days: initial.period,
        requestStringing,
        selectedStringId: selectedString?.id,
      });
      const idemKey = submitIdemKeyRef.current ?? getOrCreateRentalIdemKey(submitSignature);
      submitIdemKeyRef.current = idemKey;

      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idemKey,
        },
        body: JSON.stringify({
          racketId: initial.racketId,
          days: initial.period,

          // 포인트(보증금 제외)
          pointsToUse: appliedPoints,
          servicePickupMethod,

          payment: {
            method: "bank_transfer",
            bank: selectedBankValue,
            depositor: depositorTrim,
          },
          shipping: {
            name: nameTrim,
            phone: phoneDigits,
            postalCode: isVisitPickup ? "" : postalDigits,
            address: isVisitPickup ? "" : addressTrim,
            addressDetail: isVisitPickup ? "" : addressDetailTrim,
            deliveryRequest: deliveryRequestTrim,
            shippingMethod: isVisitPickup ? "pickup" : "delivery",
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
            ...stringingPayload,
            // requestStringing이 false면 stringId는 보내지 않아 서버가 무시하도록 함
          },
          // Step 2: checkout 내 입력이 충분하면 core 제출 경로로 바로 전달
          stringingApplicationInput,
        }),
      });

      const json: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        showErrorToast(json?.message ?? "결제 처리에 실패했습니다.");
        return;
      }

      // 성공 페이지에서 안내를 위해(기존 로직 유지)
      try {
        sessionStorage.setItem("rentals-last-bank", String(selectedBankValue));
        sessionStorage.setItem("rentals-last-depositor", depositorTrim);
        sessionStorage.setItem("rentals-refund-bank", String(refundBankValue));
        sessionStorage.setItem("rentals-refund-account", refundAccountDigits);
        sessionStorage.setItem("rentals-refund-holder", refundHolderTrim);
        sessionStorage.setItem("rentals-success", "1"); // 뒤로가기 방지
      } catch {}

      const rentalId = String(json?.id ?? "");
      if (!rentalId) {
        showErrorToast("결제 완료 정보를 확인하지 못했습니다. 다시 시도해주세요.");
        return;
      }

      // 게스트 대여는 success 진입 전에 접근 토큰을 먼저 심는다.
      if (!userId) {
        const guestTokenRes = await fetch(`/api/rentals/${rentalId}/guest-token`, {
          method: "POST",
          credentials: "include",
        });
        if (!guestTokenRes.ok) {
          showErrorToast("접근 토큰 설정에 실패했습니다. 다시 시도해주세요.");
          return;
        }
      }

      clearRentalIdemKey();
      submitIdemKeyRef.current = null;

      // 성공 분기는 success 페이지에서 DB 상태를 기준으로 판단한다.
      // legacy query 플래그(withService/stringingSubmitted/stringingApplicationId)는 더 이상 전달하지 않는다.
      const qs = new URLSearchParams();
      qs.set("id", rentalId);
      success = true;
      setIsIntentionalSuccessNavigation(true);
      try {
        router.push(`/rentals/success?${qs.toString()}`);
      } catch {
        setIsIntentionalSuccessNavigation(false);
        throw new Error("success navigation failed");
      }
    } catch (e) {
      showErrorToast("결제 처리 중 오류가 발생했습니다.");
    } finally {
      if (!success) setLoading(false);
    }
  };

  const renderCheckout = (rentalStringingAdapter?: RentalCheckoutStringingAdapter) => (
    <div className="min-h-full bg-background pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-0">
      <div className="relative overflow-hidden border-b border-border bg-secondary/20 text-foreground">
        <div className="absolute inset-0 bg-cross-line-pattern opacity-10" />
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/2 rounded-full bg-primary/[0.02] blur-3xl" />
        <SiteContainer variant="wide" className="relative py-4 bp-sm:py-6 bp-md:py-7">
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 bp-sm:h-12 bp-sm:w-12">
                <CreditCard className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="break-keep text-ui-page-title font-semibold leading-tight tracking-tight text-foreground bp-sm:text-ui-page-title-lg">
                  대여 신청 정보 확인
                </h1>
                <p className="mt-1 break-keep text-ui-body-sm leading-relaxed text-muted-foreground bp-sm:text-ui-body">
                  대여 라켓, 선택한 스트링 옵션, 수령 정보와 예상 금액을 확인한 뒤 대여 신청을
                  완료하세요.
                </p>
              </div>
            </div>
            <nav aria-label="대여 신청 진행 단계">
              <div className="inline-flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap rounded-xl bg-card/75 p-1.5 ring-1 ring-border/50 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] bp-sm:gap-2.5 bp-sm:p-2.5 [&::-webkit-scrollbar]:hidden">
                <div className="flex shrink-0 items-center gap-1.5 bp-sm:gap-2.5">
                  <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-ui-label font-medium">
                    1 대여 정보
                  </Badge>
                  <div className="h-[2px] w-4 shrink-0 rounded-full bg-primary/30 bp-sm:w-8" />
                  <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-ui-label font-medium">
                    2 스트링 선택
                  </Badge>
                  <div className="h-[2px] w-4 shrink-0 rounded-full bg-primary/30 bp-sm:w-8" />
                  <Badge className="rounded-full px-3 py-1.5 text-ui-label font-medium shadow-sm">3 신청 확인</Badge>
                </div>
              </div>
            </nav>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-6 bp-sm:py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] bp-sm:gap-8">
          <div
            className={cn("space-y-5 bp-sm:space-y-6", loading && "pointer-events-none")}
            aria-busy={loading}
          >
            {/* 대여 상품 정보 */}
            <Card className="group overflow-hidden rounded-2xl border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
              <div className="border-b border-border bg-secondary/30 p-4 bp-sm:p-5">
                <CardTitle className="flex items-center gap-3 text-ui-card-title-lg">
                  <Package className="h-5 w-5 text-primary" />
                  대여 라켓 확인
                </CardTitle>
                <CardDescription className="mt-2 break-keep">
                  신청할 대여 라켓과 기간, 기본 비용을 확인하세요.
                </CardDescription>
              </div>
              <CardContent className="p-4 bp-sm:p-6">
                <div className="flex min-w-0 flex-col gap-4 border-b border-border/50 py-4 last:border-b-0 sm:flex-row sm:items-center">
                  <div className="relative shrink-0">
                    {initial.racket?.image ? (
                      <Image
                        src={initial.racket.image || "/placeholder.svg"}
                        alt="racket"
                        width={80}
                        height={80}
                        className="h-20 w-20 rounded-xl object-cover ring-2 ring-border/50"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted/40 ring-2 ring-border/50">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-ui-body-sm text-muted-foreground">대여 라켓</div>
                    <h3 className="min-w-0 break-words font-semibold text-foreground">
                      {rentalRacketName}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={badgeToneVariant("neutral")}
                        className="px-2 py-0.5 text-ui-label"
                      >
                        상태 {initial.racket?.condition}
                      </Badge>
                      <span className="text-ui-label text-foreground/75">
                        대여 기간 {initial.period}일
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-ui-body-sm text-muted-foreground bp-sm:grid-cols-2">
                      <span className="flex items-center justify-between gap-3 border-l-2 border-border bg-muted/20 px-3 py-2">
                        <span>대여료</span>
                        <span className="tabular-nums text-foreground">
                          {initial.fee.toLocaleString()}원
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-3 border-l-2 border-border bg-muted/20 px-3 py-2">
                        <span>보증금</span>
                        <span className="tabular-nums text-foreground">
                          {initial.deposit.toLocaleString()}원
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 라켓 수령 방식 및 스트링 교체 옵션 */}
            <Card className="group overflow-hidden rounded-2xl border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
              <div className="border-b border-border bg-secondary/30 p-4 bp-sm:p-5">
                <CardTitle className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-primary" />
                  라켓 수령 방식
                </CardTitle>
                <CardDescription className="mt-2">
                  라켓을 어떻게 수령하실지 선택해주세요.
                </CardDescription>
              </div>

              <CardContent className="space-y-4 p-4 bp-sm:p-6">
                <RadioGroup
                  value={deliveryMethod}
                  onValueChange={(value) => setDeliveryMethod(value as any)}
                  className="space-y-3"
                >
                  <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-transparent p-3 transition-colors hover:bg-muted/20 bp-sm:p-3.5">
                    <RadioGroupItem value="택배수령" id="rentals-delivery-courier" />
                    <Label
                      htmlFor="rentals-delivery-courier"
                      className="flex-1 cursor-pointer font-medium"
                    >
                      택배 수령 (자택 또는 지정 장소로 배송)
                      <div className="text-ui-label text-foreground/75 mt-1">
                        대여 신청 완료 후 택배 발송으로 진행됩니다.
                      </div>
                    </Label>
                    <Truck className="h-5 w-5 text-primary" />
                  </div>

                  <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-transparent p-3 transition-colors hover:bg-muted/20 bp-sm:p-3.5">
                    <RadioGroupItem value="방문수령" id="rentals-delivery-visit" />
                    <Label
                      htmlFor="rentals-delivery-visit"
                      className="flex-1 cursor-pointer font-medium"
                    >
                      오프라인 매장 방문 (도깨비테니스 샵에서 직접 수령)
                      <div className="text-ui-label text-foreground/75 mt-1">
                        스트링 교체를 함께 신청하면 방문 접수 기준으로 처리됩니다.
                      </div>
                    </Label>
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                </RadioGroup>

                {/* 구매 체크아웃과 동일하게: 수령 방식 카드 안에서 "스트링 교체 옵션"을 같이 묶어 표시 */}
                <div className="border-l-2 border-border bg-muted/20 px-3 py-3">
                  <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium text-foreground">스트링 교체 서비스 (선택)</p>
                      <p className="text-ui-body-sm text-foreground">
                        {deliveryMethod === "방문수령"
                          ? "매장에서 대여 라켓에 스트링을 장착한 뒤 방문 수령으로 준비합니다."
                          : "매장에서 대여 라켓에 스트링을 장착한 뒤 고객님께 발송합니다."}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant={selectedString ? "outline" : "default"}
                      className="w-full bp-sm:w-auto"
                      onClick={() =>
                        pushIfSafe(
                          `/rentals/${initial.racketId}/select-string?period=${initial.period}`,
                        )
                      }
                    >
                      {selectedString ? "스트링 변경" : "스트링 선택"}
                    </Button>
                  </div>

                  <div className="mt-3 border-t border-border/60 pt-3">
                    {selectedString ? (
                      <div className="space-y-1">
                        <div className="text-ui-label font-medium text-muted-foreground">
                          선택한 스트링
                        </div>
                        <div className="min-w-0 break-words font-semibold text-foreground">
                          {selectedString.name}
                        </div>
                        {selectedGauge ? (
                          <div className="text-ui-body-sm text-foreground/80">
                            게이지(굵기): {formatGaugeLabel(selectedGauge)}
                          </div>
                        ) : null}
                        {normalizedSelectedColor ? (
                          <div className="text-ui-body-sm text-foreground/80">
                            색상: {normalizedSelectedColor}
                          </div>
                        ) : null}
                        <div className="mt-2 grid gap-1 text-ui-body-sm text-foreground/80 bp-sm:grid-cols-2">
                          <span>
                            스트링{" "}
                            {selectedString.regularPrice &&
                            selectedString.regularPrice > selectedString.price
                              ? "할인가"
                              : "구매가"}
                            : {selectedString.price.toLocaleString()}원
                          </span>
                          {selectedString.regularPrice &&
                            selectedString.regularPrice > selectedString.price && (
                              <>
                                <span className="tabular-nums text-muted-foreground">
                                  정가{" "}
                                  <span className="line-through">
                                    {selectedString.regularPrice.toLocaleString()}원
                                  </span>
                                </span>
                                <Badge
                                  variant="destructive"
                                  className="w-fit text-ui-micro tabular-nums"
                                >
                                  {selectedString.discountRate}% OFF
                                </Badge>
                              </>
                            )}
                          <span>
                            교체서비스 장착비: {selectedString.mountingFee.toLocaleString()}원
                          </span>
                        </div>

                        <div className="mt-3 border-l-2 border-primary/25 bg-muted/20 px-3 py-2.5 text-ui-label text-foreground/80">
                          대여 라켓은 반납 대상이며, 선택한 스트링은 구매 상품으로 결제됩니다.
                          교체서비스 비용은 스트링 장착 작업 비용입니다.
                        </div>
                      </div>
                    ) : (
                      <div className="text-ui-body-sm text-foreground/80">
                        현재는 <b>교체서비스 미선택</b> 상태입니다. 필요하면 "스트링 선택"을 눌러
                        교체서비스를 함께 진행할 수 있습니다.
                      </div>
                    )}
                  </div>
                </div>

                {requestStringing && rentalStringingAdapter && (
                  <RentalCheckoutStringingSections
                    withStringService={requestStringing}
                    adapter={rentalStringingAdapter}
                  />
                )}
              </CardContent>
            </Card>

            {/* 배송 정보 */}
            <Card className="group overflow-hidden rounded-2xl border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
              <div className="border-b border-border bg-secondary/30 p-4 bp-sm:p-5">
                <CardTitle className="flex items-center gap-3 text-ui-card-title-lg">
                  <MapPin className="h-5 w-5 text-foreground" />
                  {isVisitPickup ? "수령/연락 정보" : "배송 정보"}
                </CardTitle>
                <CardDescription className="mt-2 break-keep">
                  {isVisitPickup
                    ? "매장 방문 수령을 위해 연락 가능한 정보를 입력해주세요."
                    : "라켓을 받으실 배송지 정보를 입력해주세요."}
                </CardDescription>
              </div>
              <CardContent className="p-4 bp-sm:p-6">
                <div className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 gap-4 bp-sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-primary" />
                        수령인 이름
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="수령인 이름을 입력하세요"
                        className="border-border focus-visible:ring-ring transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        이메일
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="예: user@example.com"
                        className="border-border focus-visible:ring-ring transition-colors"
                      />
                    </div>
                    <div className="space-y-2 bp-sm:col-span-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        연락처
                      </Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="연락처를 입력하세요 ('-' 제외)"
                        className="border-border focus-visible:ring-ring transition-colors"
                      />
                    </div>
                  </div>
                  {!isVisitPickup && (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="postal" className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-foreground" />
                            우편번호
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={openPostcode}
                            className="bg-background text-foreground border border-border hover:bg-secondary"
                          >
                            <MapPin className="h-4 w-4 mr-2" />
                            우편번호 검색
                          </Button>
                        </div>
                        <Input
                          id="postal"
                          readOnly
                          value={postalCode}
                          placeholder="우편번호"
                          className="bg-muted cursor-not-allowed max-w-[200px] border-2"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address-main">기본 주소</Label>
                        <Input
                          id="address-main"
                          readOnly
                          value={address}
                          placeholder="기본 주소"
                          className="min-w-0 bg-muted cursor-not-allowed border-2"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address-detail">상세 주소</Label>
                        <Input
                          id="address-detail"
                          value={addressDetail}
                          onChange={(e) => setAddressDetail(e.target.value)}
                          placeholder="동/호수 등"
                          className="border-border focus-visible:ring-ring transition-colors"
                        />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="request" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-foreground" />
                      {isVisitPickup ? "방문 수령 요청사항" : "배송 요청사항"}
                    </Label>
                    <Textarea
                      id="request"
                      value={deliveryRequest}
                      onChange={(e) => setRequest(e.target.value)}
                      placeholder={
                        isVisitPickup
                          ? "방문 수령 시 요청사항을 입력하세요"
                          : "배송 시 요청사항을 입력하세요"
                      }
                      className="min-h-24 border-border leading-relaxed focus-visible:ring-ring transition-colors"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* 결제 정보 */}
            <Card className="group overflow-hidden rounded-2xl border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
              <div className="border-b border-border bg-secondary/30 p-4 bp-sm:p-5">
                <CardTitle className="flex items-center gap-3 text-ui-card-title-lg">
                  <CreditCard className="h-5 w-5 text-foreground" />
                  결제/입금 안내
                </CardTitle>
                <CardDescription className="mt-2 break-keep">
                  대여 신청에 필요한 결제 방법과 입금 정보를 입력해주세요.
                </CardDescription>
              </div>
              <CardContent className="p-4 bp-sm:p-6">
                <div className="space-y-4 md:space-y-6">
                  <div className="space-y-3">
                    <Label>결제 방법</Label>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                      className="space-y-3"
                    >
                      <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-transparent p-3 transition-colors hover:bg-muted/20 bp-sm:p-3.5">
                        <RadioGroupItem value="bank_transfer" id="bank-transfer" />
                        <Label
                          htmlFor="bank-transfer"
                          className="flex-1 cursor-pointer font-medium"
                        >
                          무통장입금
                        </Label>
                        <Building2 className="h-5 w-5 text-foreground" />
                      </div>
                      {nicePaymentsEnabled && (
                        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-transparent p-3 transition-colors hover:bg-muted/20 bp-sm:p-3.5">
                          <RadioGroupItem value="nicepay" id="nicepay" />
                          <Label htmlFor="nicepay" className="flex-1 cursor-pointer font-medium">
                            카드/간편결제
                          </Label>
                          <CreditCard className="h-5 w-5 text-foreground" />
                        </div>
                      )}
                    </RadioGroup>
                  </div>

                  {paymentMethod === "bank_transfer" && (
                    <>
                      <div className="space-y-3">
                        <Label htmlFor="bank-account">입금 계좌 선택</Label>
                        <Select
                          value={selectedBank}
                          onValueChange={(v) => setSelectedBank(v as any)}
                        >
                          <SelectTrigger
                            id="bank-account"
                            className="border-border focus-visible:ring-ring"
                          >
                            <SelectValue placeholder="입금 계좌를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kakao">
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
                          placeholder="입금자명을 입력하세요"
                          className="border-border focus-visible:ring-ring transition-colors"
                        />
                      </div>

                      <div className="border-l-2 border-border bg-muted/20 px-3 py-2.5">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="h-5 w-5 text-primary" />
                          <p className="font-semibold text-foreground">무통장입금 안내</p>
                        </div>
                        <ul className="space-y-2 text-ui-body-sm text-foreground">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            대여 신청 후 24시간 이내에 입금해 주셔야 신청이 정상 처리됩니다.
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            입금자명이 신청자명과 다를 경우, 고객센터로 연락 부탁드립니다.
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            입금 확인 후 배송이 시작됩니다.
                          </li>
                        </ul>
                      </div>
                    </>
                  )}

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      공통 혜택/차감
                    </Label>
                    <div className="space-y-3 border-l-2 border-border bg-muted/20 px-3 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-ui-body-sm font-semibold text-foreground">
                          포인트 사용
                        </span>
                        <span className="text-ui-label text-foreground/75">
                          {pointsStatus === "ready"
                            ? `사용 가능 ${pointsAvailable.toLocaleString()}P`
                            : pointsStatus === "loading"
                              ? "포인트 조회 중"
                              : pointsStatus === "error"
                                ? "포인트 조회 실패"
                                : "로그인 시 조회"}
                        </span>
                      </div>

                      {!userId ? (
                        <div className="text-ui-body-sm text-foreground/80">
                          로그인 시 포인트 사용이 가능합니다.
                        </div>
                      ) : pointsStatus === "loading" ? (
                        <div className="text-ui-body-sm text-foreground/80">
                          포인트를 불러오는 중입니다.
                        </div>
                      ) : pointsStatus === "error" ? (
                        <div className="text-ui-body-sm text-destructive">
                          포인트 조회에 실패했습니다. 새로고침 후 다시 시도해주세요.
                        </div>
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
                                  setPointsInput("0");
                                }
                              }}
                            />
                            <label
                              htmlFor="use-all-points"
                              className="text-ui-body-sm text-foreground cursor-pointer"
                            >
                              전액 사용 (보증금 제외)
                            </label>
                          </div>

                          <Input
                            value={pointsInput}
                            disabled={
                              pointsStatus !== "ready" || useAllPoints || maxPointsToUse <= 0
                            }
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^\d]/g, "");
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
                            className="border-border"
                          />

                          <div className="text-ui-label text-foreground/75">
                            보증금({initial.deposit.toLocaleString()}원)에는 포인트가 적용되지
                            않습니다. (최대 {normalizePoints(maxPointsToUse).toLocaleString()}P)
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="group overflow-hidden rounded-2xl border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
              <div className="border-b border-border bg-secondary/30 p-4 bp-sm:p-5">
                <CardTitle className="flex items-center gap-3">
                  <Undo2 className="h-5 w-5 text-foreground" />
                  보증금 환급 계좌
                </CardTitle>
                <CardDescription className="mt-2">
                  반납 완료 후 보증금을 환급해 드릴 계좌 정보를 입력해주세요.
                </CardDescription>
              </div>
              <CardContent className="space-y-4 p-4 bp-sm:p-6">
                {/* 환급 은행 */}
                <div className="space-y-2">
                  <Label htmlFor="refund-bank">환급 은행</Label>
                  <RefundBankCombobox
                    value={refundBank}
                    onChange={setRefundBank}
                    placeholder="환급 받을 은행을 선택하세요"
                  />
                </div>
                {/* 계좌번호 */}
                <div className="space-y-2">
                  <Label htmlFor="refund-account">환급 계좌번호</Label>
                  <Input
                    id="refund-account"
                    value={refundAccount}
                    onChange={(e) => setRefundAccount(e.target.value)}
                    placeholder="예: 110-123-456789"
                    className="border-border focus-visible:ring-ring"
                  />
                </div>
                {/* 예금주 */}
                <div className="space-y-2">
                  <Label htmlFor="refund-holder">예금주</Label>
                  <Input
                    id="refund-holder"
                    value={refundHolder}
                    onChange={(e) => setRefundHolder(e.target.value)}
                    placeholder="예: 홍길동"
                    className="border-border focus-visible:ring-ring"
                  />
                </div>
                {/* 안내 */}
                <div className="border-l-2 border-primary/25 bg-muted/20 px-3 py-2.5">
                  <p className="text-ui-body-sm text-foreground">
                    반납 완료 후 보증금이 환급됩니다. 파손/연체 시 약관에 따라 차감될 수 있습니다.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 대여 신청 동의 */}
            <Card className="group overflow-hidden rounded-2xl border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
              <div className="border-b border-border bg-secondary/30 p-4 bp-sm:p-5">
                <CardTitle className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-destructive" />
                  대여 신청 동의
                </CardTitle>
              </div>
              <CardContent className="p-4 bp-sm:p-6">
                <div className="space-y-4">
                  <div className={cn("flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-[background-color,border-color,box-shadow,color,opacity] duration-200 bp-sm:p-3.5", agreeAll ? "border-primary/80 bg-primary/5" : "border-border/60 hover:border-border hover:bg-muted/20")}>
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
                      <label
                        htmlFor="agree-all"
                        className="font-semibold text-ui-card-title-lg text-foreground"
                      >
                        전체 동의
                      </label>
                    </div>
                  </div>
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
                        className={cn("flex min-w-0 items-center justify-between gap-2 py-3 transition-[background-color,border-color,box-shadow,color,opacity] duration-200 bp-sm:py-3.5", item.state ? "bg-primary/5" : "hover:bg-muted/20")}
                      >
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
                          <label
                            htmlFor={item.id}
                            className="text-ui-body-sm font-medium text-foreground"
                          >
                            {item.label}
                          </label>
                        </div>
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
              </CardContent>
            </Card>
          </div>

          {/* 대여 신청 요약 */}
          <aside className="lg:sticky lg:top-24">
            <div>
              <Card className="relative overflow-hidden rounded-2xl border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
                <div className="border-b border-border bg-secondary/30 p-4 text-foreground bp-sm:p-5">
                  <CardTitle className="flex items-center gap-3 text-ui-section-title">
                    <div className="rounded-full border border-border bg-card p-2">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    대여 신청 요약
                  </CardTitle>
                </div>
                <CardContent className="space-y-4 p-4 bp-sm:space-y-6 bp-sm:p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">대여료</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {initial.fee.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">보증금</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {initial.deposit.toLocaleString()}원
                      </span>
                    </div>
                    {requestStringing && selectedString && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">스트링 금액</span>
                          <span className="font-semibold tabular-nums text-foreground">
                            {selectedString.price.toLocaleString()}원
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-foreground/80">교체서비스 장착비</span>
                          <span className="font-semibold tabular-nums text-foreground">
                            {stringingFee.toLocaleString()}원
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">배송비</span>
                      <span className="font-semibold tabular-nums text-foreground">0원</span>
                    </div>

                    {/* 포인트 차감 표시 */}
                    {appliedPoints > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-foreground/80">포인트 사용</span>
                        <span className="font-semibold text-ui-card-title-lg text-destructive">
                          - {appliedPoints.toLocaleString()}P
                        </span>
                      </div>
                    )}

                    <Separator />
                    <div className="flex items-center justify-between text-ui-section-title font-semibold">
                      <span>예상 결제 금액</span>
                      <span className="text-foreground">{payableTotal.toLocaleString()}원</span>
                    </div>
                  </div>

                  <div className="border-l-2 border-border bg-muted/20 px-3 py-3">
                    <div className="flex items-center gap-2 text-foreground mb-2">
                      <Shield className="h-4 w-4" />
                      <span className="font-semibold">보증금 안내</span>
                    </div>
                    <p className="text-ui-body-sm text-foreground">
                      반납 완료 시 보증금이 환불됩니다. 연체 또는 파손 시 차감될 수 있습니다.
                    </p>
                  </div>

                  <div className="border-l-2 border-border bg-muted/20 px-3 py-3">
                    <div className="flex items-center gap-2 text-foreground mb-2">
                      <Truck className="h-4 w-4" />
                      <span className="font-semibold">대여 안내</span>
                    </div>
                    <div className="text-ui-body-sm text-foreground space-y-1">
                      <p>• 대여 기간: {initial.period}일</p>
                      <p>• 대여 신청 완료 후 배송이 시작됩니다.</p>
                      <p>• 반납 기한을 꼭 지켜주세요.</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter id={RENTAL_PAYMENT_ACTION_ID} className="flex flex-col gap-4 border-t border-border/60 p-4 bp-sm:p-6">
                  {paymentMethod === "bank_transfer" ? (
                    <Button
                      id={RENTAL_PRIMARY_PAY_BUTTON_ID}
                      onClick={() => onPay(rentalStringingAdapter)}
                      disabled={loading}
                      className={cn(
                        "h-14 w-full font-semibold break-keep bg-primary shadow-sm transition-[box-shadow,background-color,color] duration-200 hover:bg-primary/90 hover:shadow-sm",
                        loading && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      {loading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          대여 신청을 처리하고 있어요…
                        </span>
                      ) : (
                        "대여 신청하기"
                      )}
                    </Button>
                  ) : (
                    <RentalNiceCheckoutButton
                      buttonId={RENTAL_PRIMARY_PAY_BUTTON_ID}
                      disabled={loading}
                      payableAmount={payableTotal}
                      payload={{
                        racketId: initial.racketId,
                        days: initial.period,
                        pointsToUse: appliedPoints,
                        servicePickupMethod,
                        payment: { method: "nicepay" },
                        shipping: {
                          name: name.trim(),
                          phone: onlyDigits(phone),
                          postalCode: isVisitPickup ? "" : onlyDigits(postalCode).trim(),
                          address: isVisitPickup ? "" : address.trim(),
                          addressDetail: isVisitPickup ? "" : addressDetail.trim(),
                          deliveryRequest: deliveryRequest.trim(),
                          shippingMethod: isVisitPickup ? "pickup" : "delivery",
                        },
                        refundAccount: {
                          bank: refundBank,
                          account: onlyDigits(refundAccount),
                          holder: refundHolder.trim(),
                        },
                        stringing: stringingPayload,
                        stringingApplicationInput:
                          requestStringing && rentalStringingAdapter
                            ? {
                                name: name.trim(),
                                phone: phone.trim(),
                                email: email.trim(),
                                shippingInfo: {
                                  name: name.trim(),
                                  phone: phone.trim(),
                                  email: email.trim(),
                                  address: isVisitPickup ? "" : address.trim(),
                                  addressDetail: isVisitPickup ? "" : addressDetail.trim(),
                                  postalCode: isVisitPickup ? "" : postalCode.trim(),
                                  depositor: depositor.trim(),
                                  bank: selectedBank,
                                  deliveryRequest: deliveryRequest.trim(),
                                  collectionMethod:
                                    rentalStringingAdapter.formData.collectionMethod,
                                },
                                stringTypes: (
                                  rentalStringingAdapter.formData.stringTypes ?? []
                                ).filter(Boolean),
                                customStringName:
                                  rentalStringingAdapter.formData.customStringType?.trim() ||
                                  undefined,
                                preferredDate: rentalStringingAdapter.formData.preferredDate,
                                preferredTime: rentalStringingAdapter.formData.preferredTime,
                                requirements: rentalStringingAdapter.formData.requirements,
                                packageOptOut: true,
                                lines: (rentalStringingAdapter.linesForSubmit ?? [])
                                  .filter((line) => line?.stringProductId)
                                  .map((line) => ({
                                    racketType: line.racketType,
                                    stringProductId: line.stringProductId,
                                    stringName: line.stringName,
                                    tensionMain: line.tensionMain,
                                    tensionCross: line.tensionCross,
                                    note: line.note,
                                    mountingFee: line.mountingFee,
                                  })),
                              }
                            : undefined,
                      }}
                      onBeforeSuccessNavigation={() => setIsIntentionalSuccessNavigation(true)}
                      onSuccessNavigationAbort={() => setIsIntentionalSuccessNavigation(false)}
                    />
                  )}
                </CardFooter>
                {loading && (
                  <div className="absolute inset-0 z-10 cursor-wait bg-overlay/20">
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-ui-body-sm">대여 신청을 처리하고 있어요…</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </aside>
        </div>

        <CheckoutBottomStickyBar
          amount={payableTotal}
          amountLabel="예상 결제 금액"
          label={paymentMethod === "bank_transfer" ? "대여 신청하기" : "결제하기"}
          disabled={loading}
          loading={loading}
          ariaLabel="하단 대여 결제 버튼"
          onClick={() => {
            const target = document.getElementById(RENTAL_PRIMARY_PAY_BUTTON_ID);
            if (target instanceof HTMLButtonElement && !target.disabled) {
              target.click();
              return;
            }
            document.getElementById(RENTAL_PAYMENT_ACTION_ID)?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }}
        />
      </SiteContainer>
    </div>
  );

  const stringProduct = selectedString
    ? {
        id: selectedString.id,
        name: selectedString.name,
        image: selectedString.image,
        mountingFee: selectedString.mountingFee,
      }
    : null;

  if (!requestStringing) {
    return renderCheckout();
  }

  return (
    <RentalCheckoutStringingRuntimeBridge
      withStringService={requestStringing}
      rentalId={initial.racketId}
      rentalRacketId={initial.racketId}
      rentalDays={initial.period}
      rentalRacketName={rentalRacketName}
      stringProduct={stringProduct}
      name={name}
      email={email}
      phone={phone}
      postalCode={postalCode}
      address={address}
      addressDetail={addressDetail}
      deliveryRequest={deliveryRequest}
      depositor={depositor}
      selectedBank={selectedBank}
      servicePickupMethod={servicePickupMethod}
      onDirtySignatureChange={setStringingDirtySignature}
    >
      {({ adapter: rentalStringingAdapter }) => renderCheckout(rentalStringingAdapter)}
    </RentalCheckoutStringingRuntimeBridge>
  );
}
