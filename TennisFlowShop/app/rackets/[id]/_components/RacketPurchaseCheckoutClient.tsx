"use client";

import TossPaymentWidget from "@/app/checkout/TossPaymentWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBackNavigationGuard } from "@/lib/hooks/useBackNavigationGuard";
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import { isNicePaymentsEnabled, isTossPaymentsEnabled } from "@/lib/payments/provider-flags";
import { racketBrandLabel, racketStatusLabel } from "@/lib/constants";
import { normalizeItemShippingFee } from "@/lib/shipping-fee";
import { showErrorToast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import RacketNiceCheckoutButton from "./RacketNiceCheckoutButton";
import RacketTossCheckoutButton from "./RacketTossCheckoutButton";

type RacketView = {
  id: string;
  brand: string;
  model: string;
  price: number;
  shippingFee?: number;
  images: string[];
  status: "available" | "sold" | "rented" | "inactive";
};

type PickupMethod = "courier" | "visit";
type Bank = "shinhan" | "kookmin" | "woori";
type PaymentMethod = "bank_transfer" | "nicepay" | "tosspayments";

const POSTAL_RE = /^\d{5}$/;
const onlyDigits = (v: string) => String(v ?? "").replace(/\D/g, "");
const isValidKoreanPhone = (v: string) => /^010\d{8}$/.test(onlyDigits(v));
const ALLOWED_BANKS = new Set<Bank>(["shinhan", "kookmin", "woori"]);
const ALLOWED_PICKUP = new Set<PickupMethod>(["courier", "visit"]);

const IDEM_STORE_KEY = "racket-checkout.idem.v1";
const IDEM_TTL_MS = 15 * 60 * 1000;
const fnv1a32 = (str: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
};
const getOrCreateIdemKey = (sig: string) => {
  try {
    const raw = window.sessionStorage.getItem(IDEM_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        key?: string;
        sig?: string;
        ts?: number;
      };
      const fresh = typeof parsed.ts === "number" && Date.now() - parsed.ts < IDEM_TTL_MS;
      if (fresh && parsed.sig === sig && parsed.key) return parsed.key;
    }
    const key = crypto.randomUUID();
    window.sessionStorage.setItem(IDEM_STORE_KEY, JSON.stringify({ key, sig, ts: Date.now() }));
    return key;
  } catch {
    return crypto.randomUUID();
  }
};
const clearIdemKey = () => {
  try {
    window.sessionStorage.removeItem(IDEM_STORE_KEY);
  } catch {}
};

export default function RacketPurchaseCheckoutClient({ racket }: { racket: RacketView }) {
  const router = useRouter();
  const racketId = String(racket.id ?? "").trim();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [depositor, setDepositor] = useState("");
  const [deliveryRequest, setDeliveryRequest] = useState("");

  const [pickupMethod, setPickupMethod] = useState<PickupMethod>("courier");
  const [bank, setBank] = useState<Bank>("shinhan");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const nicePaymentsEnabled = isNicePaymentsEnabled();
  const tossPaymentsEnabled = isTossPaymentsEnabled();
  const isVisitPickup = pickupMethod === "visit";
  const needsShippingAddress = !isVisitPickup;

  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isIntentionalSuccessNavigation, setIsIntentionalSuccessNavigation] = useState(false);
  const [tossWidgetReady, setTossWidgetReady] = useState(false);
  const [tossWidgetLoadError, setTossWidgetLoadError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (
      (nicePaymentsEnabled && paymentMethod === "tosspayments") ||
      (!nicePaymentsEnabled && paymentMethod === "nicepay") ||
      (!tossPaymentsEnabled && paymentMethod === "tosspayments")
    ) {
      setPaymentMethod("bank_transfer");
      return;
    }
  }, [nicePaymentsEnabled, tossPaymentsEnabled, paymentMethod]);

  const shippingFee = useMemo(() => {
    if (pickupMethod === "visit") return 0;
    return normalizeItemShippingFee(racket.shippingFee);
  }, [pickupMethod, racket.shippingFee]);
  const totalPrice = useMemo(() => racket.price + shippingFee, [racket.price, shippingFee]);

  const canSubmitBase =
    racket.status === "available" &&
    agree &&
    !submitting &&
    Boolean(
      name.trim() &&
      phone.trim() &&
      (!needsShippingAddress || (address.trim() && postalCode.trim())),
    );

  const canSubmitBank = canSubmitBase && Boolean(depositor.trim());

  const isDirty = useMemo(() => {
    const hasText =
      Boolean(name) ||
      Boolean(phone) ||
      Boolean(address) ||
      Boolean(addressDetail) ||
      Boolean(postalCode) ||
      Boolean(depositor) ||
      Boolean(deliveryRequest);
    const hasNonDefault =
      pickupMethod !== "courier" ||
      bank !== "shinhan" ||
      agree !== false ||
      paymentMethod !== "bank_transfer";
    return hasText || hasNonDefault;
  }, [
    name,
    phone,
    address,
    addressDetail,
    postalCode,
    depositor,
    deliveryRequest,
    pickupMethod,
    bank,
    agree,
    paymentMethod,
  ]);

  const guardEnabled = isDirty && !isIntentionalSuccessNavigation;
  useUnsavedChangesGuard(guardEnabled);
  useBackNavigationGuard(guardEnabled);

  const validateCommon = () => {
    const nameTrim = name.trim();
    const phoneDigits = onlyDigits(phone);
    const postalTrim = onlyDigits(postalCode).trim();
    const addressTrim = address.trim();

    if (racket.status !== "available") {
      showErrorToast("현재 판매 가능한 라켓이 아닙니다.");
      return null;
    }
    if (nameTrim.length < 2) {
      showErrorToast("수령인 이름은 2자 이상 입력해주세요.");
      return null;
    }
    if (!isValidKoreanPhone(phoneDigits)) {
      showErrorToast("올바른 연락처 형식(01012345678)으로 입력해주세요.");
      return null;
    }
    if (needsShippingAddress) {
      if (!POSTAL_RE.test(postalTrim)) {
        showErrorToast("우편번호(5자리)를 확인해주세요.");
        return null;
      }
      if (!addressTrim) {
        showErrorToast("주소를 입력해주세요.");
        return null;
      }
    }
    if (!ALLOWED_PICKUP.has(pickupMethod)) {
      showErrorToast("접수 방식 값이 올바르지 않습니다. 다시 선택해주세요.");
      return null;
    }

    return {
      nameTrim,
      phoneDigits,
      postalTrim,
      addressTrim,
      addressDetailTrim: addressDetail.trim(),
      deliveryRequestTrim: deliveryRequest.trim(),
    };
  };

  async function onSubmitBankTransfer() {
    if (submittingRef.current || submitting) return;

    if (!canSubmitBank) {
      showErrorToast("필수 입력값/동의 항목을 확인해주세요.");
      return;
    }

    const common = validateCommon();
    if (!common) return;

    const depositorTrim = depositor.trim();
    if (depositorTrim.length < 2) {
      showErrorToast("입금자명은 2자 이상 입력해주세요.");
      return;
    }

    if (!ALLOWED_BANKS.has(bank)) {
      showErrorToast("은행 선택 값이 올바르지 않습니다. 다시 선택해주세요.");
      return;
    }

    let success = false;

    try {
      submittingRef.current = true;
      setSubmitting(true);

      const payload = {
        items: [{ productId: racket.id, quantity: 1, kind: "racket" as const }],
        shippingInfo: {
          name: common.nameTrim,
          phone: common.phoneDigits,
          address: common.addressTrim,
          addressDetail: common.addressDetailTrim,
          postalCode: common.postalTrim,
          depositor: depositorTrim,
          deliveryRequest: common.deliveryRequestTrim,
          shippingMethod: pickupMethod === "visit" ? "visit" : "courier",
        },
        totalPrice,
        shippingFee,
        paymentInfo: { bank },
        servicePickupMethod: pickupMethod,
      };

      const sig = `v1:${fnv1a32(JSON.stringify(payload))}`;
      const idemKey = getOrCreateIdemKey(sig);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idemKey,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.orderId) {
        showErrorToast(json?.error ?? "주문 생성 실패");
        return;
      }

      clearIdemKey();

      success = true;
      setIsIntentionalSuccessNavigation(true);
      try {
        router.push(`/racket-orders/${json.orderId}/select-string`);
      } catch {
        setIsIntentionalSuccessNavigation(false);
        throw new Error("success navigation failed");
      }
    } catch {
      showErrorToast("주문 처리 중 오류가 발생했습니다.");
    } finally {
      if (!success) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  }

  const paymentPayload = {
    racketId: racket.id,
    shippingInfo: {
      name: name.trim(),
      phone: onlyDigits(phone),
      address: address.trim(),
      addressDetail: addressDetail.trim(),
      postalCode: onlyDigits(postalCode).trim(),
      deliveryRequest: deliveryRequest.trim(),
      shippingMethod: pickupMethod,
    },
    servicePickupMethod: pickupMethod,
    totalPrice,
    shippingFee,
    paymentInfo: { bank },
  };

  const racketName = `${racketBrandLabel(racket.brand)} ${racket.model}`.trim();
  const primaryImage = racket.images?.[0];
  const pickupLabel = isVisitPickup ? "매장 방문 수령" : "택배 발송/수령";
  const paymentLabel =
    paymentMethod === "bank_transfer"
      ? "무통장입금"
      : paymentMethod === "tosspayments"
        ? "카드/간편결제 (토스)"
        : "카드/간편결제";

  return (
    <div className="bg-background py-6 md:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-ui-label font-medium text-muted-foreground">
                  라켓 구매 checkout
                </span>
                <span className="rounded-full border border-border bg-card px-3 py-1 text-ui-label font-medium text-muted-foreground">
                  정보 입력 · 결제 확인
                </span>
              </div>
              <div className="space-y-2">
                <h1 className="break-keep text-ui-page-title font-semibold tracking-tight text-foreground md:text-ui-page-title-lg">
                  라켓 구매 정보를 확인해주세요
                </h1>
                <p className="max-w-3xl break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
                  수령 방식과 결제 정보를 입력한 뒤 최종 금액을 확인하세요. 라켓과 스트링을 함께
                  선택하는 새 구매 흐름도 계속 이용할 수 있습니다.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full shrink-0 break-keep sm:w-auto"
              disabled={!racketId}
              onClick={() => router.push(`/rackets/${racketId}/select-string`)}
            >
              스트링 선택 후 구매로 이동
            </Button>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30 sm:h-32 sm:w-32 sm:shrink-0">
                  {primaryImage ? (
                    <img
                      src={primaryImage}
                      alt={racketName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="px-4 text-center text-ui-label text-muted-foreground">
                      이미지 준비 중
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="space-y-1">
                    <p className="text-ui-label font-medium uppercase tracking-wide text-muted-foreground">
                      구매 라켓
                    </p>
                    <h2 className="min-w-0 break-keep text-ui-section-title font-semibold text-foreground">
                      <span className="break-words">{racket.model}</span>
                    </h2>
                    <p className="break-words text-ui-body-sm text-muted-foreground">
                      {racketBrandLabel(racket.brand)}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <p className="text-ui-label text-muted-foreground">상품 금액</p>
                      <p className="mt-1 text-ui-body font-semibold tabular-nums text-foreground">
                        {racket.price.toLocaleString()}원
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <p className="text-ui-label text-muted-foreground">판매 상태</p>
                      <p className="mt-1 break-keep text-ui-body font-semibold text-foreground">
                        {racketStatusLabel(racket.status)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
              <div className="space-y-1">
                <h2 className="text-ui-card-title-lg font-semibold text-foreground">수령 방식</h2>
                <p className="text-ui-body-sm text-muted-foreground">
                  배송비와 입력 항목은 선택한 수령 방식에 맞춰 적용됩니다.
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-ui-body-sm transition-colors hover:bg-muted/50">
                  <input
                    type="radio"
                    name="pickup"
                    checked={pickupMethod === "courier"}
                    onChange={() => setPickupMethod("courier")}
                    className="mt-1 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">택배 발송/수령</span>
                    <span className="mt-1 block break-keep text-ui-label leading-relaxed text-muted-foreground">
                      주소지로 라켓을 받아보는 기본 수령 방식입니다.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-ui-body-sm transition-colors hover:bg-muted/50">
                  <input
                    type="radio"
                    name="pickup"
                    checked={pickupMethod === "visit"}
                    onChange={() => setPickupMethod("visit")}
                    className="mt-1 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">오프라인 매장 방문</span>
                    <span className="mt-1 block break-keep text-ui-label leading-relaxed text-muted-foreground">
                      매장에서 직접 수령하며 배송비가 제외됩니다.
                    </span>
                  </span>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
              <div className="space-y-1">
                <h2 className="text-ui-card-title-lg font-semibold text-foreground">
                  {isVisitPickup ? "수령/연락 정보" : "배송/연락 정보"}
                </h2>
                <p className="text-ui-body-sm text-muted-foreground">
                  주문 확인과 수령 안내에 필요한 정보를 정확히 입력해주세요.
                </p>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  className="w-full text-ui-body-sm"
                  placeholder="수령인"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  className="w-full text-ui-body-sm"
                  placeholder="연락처"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {needsShippingAddress && (
                  <>
                    <Input
                      className="w-full text-ui-body-sm"
                      placeholder="우편번호"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                    <Input
                      className="w-full text-ui-body-sm sm:col-span-2"
                      placeholder="주소"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                    <Input
                      className="w-full text-ui-body-sm sm:col-span-2"
                      placeholder="상세주소(선택)"
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                    />
                    <Input
                      className="w-full text-ui-body-sm sm:col-span-2"
                      placeholder="배송 요청사항(선택)"
                      value={deliveryRequest}
                      onChange={(e) => setDeliveryRequest(e.target.value)}
                    />
                  </>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
              <div className="space-y-1">
                <h2 className="text-ui-card-title-lg font-semibold text-foreground">
                  결제수단 및 동의
                </h2>
                <p className="text-ui-body-sm text-muted-foreground">
                  결제수단을 선택하고 주문/결제에 필요한 동의 항목을 확인해주세요.
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-ui-body-sm transition-colors hover:bg-muted/50">
                  <input
                    type="radio"
                    name="payment-method"
                    checked={paymentMethod === "bank_transfer"}
                    onChange={() => setPaymentMethod("bank_transfer")}
                    className="mt-1 shrink-0"
                  />
                  <span className="font-medium text-foreground">무통장입금</span>
                </label>
                {tossPaymentsEnabled && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-ui-body-sm transition-colors hover:bg-muted/50">
                    <input
                      type="radio"
                      name="payment-method"
                      checked={paymentMethod === "tosspayments"}
                      onChange={() => setPaymentMethod("tosspayments")}
                      disabled={!Number.isFinite(totalPrice) || totalPrice <= 0}
                      className="mt-1 shrink-0"
                    />
                    <span className="font-medium text-foreground">카드/간편결제 (토스)</span>
                  </label>
                )}
                {nicePaymentsEnabled && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-ui-body-sm transition-colors hover:bg-muted/50">
                    <input
                      type="radio"
                      name="payment-method"
                      checked={paymentMethod === "nicepay"}
                      onChange={() => setPaymentMethod("nicepay")}
                      disabled={!Number.isFinite(totalPrice) || totalPrice <= 0}
                      className="mt-1 shrink-0"
                    />
                    <span className="font-medium text-foreground">카드/간편결제</span>
                  </label>
                )}
              </div>

              <div className="mt-4 space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                {paymentMethod === "bank_transfer" ? (
                  <>
                    <label className="block text-ui-body-sm font-medium text-foreground">
                      은행 선택
                      <Select value={bank} onValueChange={(value) => setBank(value as Bank)}>
                        <SelectTrigger className="mt-2 w-full text-ui-body-sm">
                          <SelectValue placeholder="은행 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shinhan">신한</SelectItem>
                          <SelectItem value="kookmin">국민</SelectItem>
                          <SelectItem value="woori">우리</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>

                    <Input
                      className="w-full text-ui-body-sm"
                      placeholder="입금자명"
                      value={depositor}
                      onChange={(e) => setDepositor(e.target.value)}
                    />
                  </>
                ) : paymentMethod === "tosspayments" && tossPaymentsEnabled ? (
                  <TossPaymentWidget
                    amount={totalPrice}
                    customerKey={`${racket.id}:${onlyDigits(phone) || "guest"}`}
                    onStatusChange={({ ready, loadError }) => {
                      setTossWidgetReady(ready);
                      setTossWidgetLoadError(loadError);
                    }}
                  />
                ) : null}

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 text-ui-body-sm transition-colors hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-1 shrink-0"
                  />
                  <span className="break-keep leading-relaxed text-foreground">
                    주문/결제/개인정보 제공에 동의합니다.
                  </span>
                </label>
              </div>
            </section>
          </div>

          <aside className="min-w-0 lg:sticky lg:top-6">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
              <div className="space-y-1">
                <p className="text-ui-label font-medium uppercase tracking-wide text-muted-foreground">
                  Order summary
                </p>
                <h2 className="text-ui-card-title-lg font-semibold text-foreground">구매 요약</h2>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="break-keep text-ui-body-sm font-semibold text-foreground">
                    {racket.model}
                  </p>
                  <p className="mt-1 break-words text-ui-label text-muted-foreground">
                    {racketBrandLabel(racket.brand)}
                  </p>
                </div>

                <div className="space-y-3 text-ui-body-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">상품 금액</span>
                    <span className="text-right font-medium tabular-nums text-foreground">
                      {racket.price.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">배송비</span>
                    <span className="text-right font-medium tabular-nums text-foreground">
                      {shippingFee.toLocaleString()}원
                    </span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex items-end justify-between gap-4">
                      <span className="font-semibold text-foreground">총 결제 금액</span>
                      <span className="text-right text-ui-section-title font-semibold tabular-nums text-foreground">
                        {totalPrice.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-4 text-ui-body-sm">
                  <div className="flex items-start justify-between gap-4">
                    <span className="shrink-0 text-muted-foreground">수령 방식</span>
                    <span className="break-keep text-right font-medium text-foreground">
                      {pickupLabel}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="shrink-0 text-muted-foreground">결제수단</span>
                    <span className="break-keep text-right font-medium text-foreground">
                      {paymentLabel}
                    </span>
                  </div>
                </div>

                {paymentMethod === "bank_transfer" ? (
                  <Button
                    className="w-full break-keep text-ui-body-sm"
                    variant="default"
                    disabled={!canSubmitBank || submitting}
                    onClick={onSubmitBankTransfer}
                  >
                    {submitting ? "처리 중..." : "스트링 선택으로 이동"}
                  </Button>
                ) : paymentMethod === "tosspayments" && tossPaymentsEnabled ? (
                  <RacketTossCheckoutButton
                    disabled={!canSubmitBase || submitting}
                    widgetReady={tossWidgetReady}
                    widgetLoadError={tossWidgetLoadError}
                    payableAmount={totalPrice}
                    payload={paymentPayload}
                    onBeforeSuccessNavigation={() => setIsIntentionalSuccessNavigation(true)}
                    onSuccessNavigationAbort={() => setIsIntentionalSuccessNavigation(false)}
                  />
                ) : paymentMethod === "nicepay" && nicePaymentsEnabled ? (
                  <RacketNiceCheckoutButton
                    disabled={!canSubmitBase || submitting}
                    payableAmount={totalPrice}
                    payload={paymentPayload}
                    onBeforeSuccessNavigation={() => setIsIntentionalSuccessNavigation(true)}
                    onSuccessNavigationAbort={() => setIsIntentionalSuccessNavigation(false)}
                  />
                ) : null}

                {racket.status !== "available" && (
                  <div className="rounded-xl border border-border bg-muted/30 p-3 text-ui-body-sm text-destructive">
                    현재 판매 가능한 라켓이 아닙니다. (상태: {racketStatusLabel(racket.status)})
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
