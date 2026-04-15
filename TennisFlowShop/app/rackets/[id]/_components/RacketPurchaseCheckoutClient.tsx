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
import { isTossPaymentsEnabled } from "@/lib/payments/provider-flags";
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import { calcShippingFee } from "@/lib/shipping-fee";
import { showErrorToast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import RacketTossCheckoutButton from "./RacketTossCheckoutButton";

type RacketView = {
  id: string;
  brand: string;
  model: string;
  price: number;
  images: string[];
  status: "available" | "sold" | "rented" | "inactive";
};

type PickupMethod = "courier" | "visit";
type Bank = "shinhan" | "kookmin" | "woori";
type PaymentMethod = "bank_transfer" | "tosspayments";

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
      const fresh =
        typeof parsed.ts === "number" && Date.now() - parsed.ts < IDEM_TTL_MS;
      if (fresh && parsed.sig === sig && parsed.key) return parsed.key;
    }
    const key = crypto.randomUUID();
    window.sessionStorage.setItem(
      IDEM_STORE_KEY,
      JSON.stringify({ key, sig, ts: Date.now() }),
    );
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

export default function RacketPurchaseCheckoutClient({
  racket,
}: {
  racket: RacketView;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [depositor, setDepositor] = useState("");
  const [deliveryRequest, setDeliveryRequest] = useState("");

  const [pickupMethod, setPickupMethod] = useState<PickupMethod>("courier");
  const [bank, setBank] = useState<Bank>("shinhan");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("bank_transfer");
  const tossPaymentsEnabled = isTossPaymentsEnabled();
  const isVisitPickup = pickupMethod === "visit";
  const needsShippingAddress = !isVisitPickup;

  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isIntentionalSuccessNavigation, setIsIntentionalSuccessNavigation] =
    useState(false);
  const [tossWidgetReady, setTossWidgetReady] = useState(false);
  const [tossWidgetLoadError, setTossWidgetLoadError] = useState<string | null>(
    null,
  );
  const submittingRef = useRef(false);

  useEffect(() => {
    if (tossPaymentsEnabled || paymentMethod !== "tosspayments") return;
    setPaymentMethod("bank_transfer");
  }, [tossPaymentsEnabled, paymentMethod]);

  const shippingFee = useMemo(() => {
    return calcShippingFee({
      subtotal: racket.price,
      isVisitPickup: pickupMethod === "visit",
    });
  }, [pickupMethod, racket.price]);
  const totalPrice = useMemo(
    () => racket.price + shippingFee,
    [racket.price, shippingFee],
  );

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

  const tossPayload = {
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
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="rounded-lg border p-4">
        <div className="text-lg font-semibold">라켓 구매</div>
        <div className="mt-2 text-sm text-muted-foreground">
          {racket.brand} {racket.model}
        </div>
        <div className="mt-1 text-sm">가격: {racket.price.toLocaleString()}원</div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="font-semibold">라켓 접수 방식</div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="pickup"
            checked={pickupMethod === "courier"}
            onChange={() => setPickupMethod("courier")}
          />
          택배 발송/수령
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="pickup"
            checked={pickupMethod === "visit"}
            onChange={() => setPickupMethod("visit")}
          />
          오프라인 매장 방문
        </label>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="font-semibold">{isVisitPickup ? "수령/연락 정보" : "배송 정보"}</div>

        <Input className="w-full text-sm" placeholder="수령인" value={name} onChange={(e) => setName(e.target.value)} />
        <Input className="w-full text-sm" placeholder="연락처" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {needsShippingAddress && (
          <>
            <Input className="w-full text-sm" placeholder="우편번호" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            <Input className="w-full text-sm" placeholder="주소" value={address} onChange={(e) => setAddress(e.target.value)} />
            <Input className="w-full text-sm" placeholder="상세주소(선택)" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} />
            <Input className="w-full text-sm" placeholder="배송 요청사항(선택)" value={deliveryRequest} onChange={(e) => setDeliveryRequest(e.target.value)} />
          </>
        )}
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="font-semibold">결제 정보</div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="payment-method"
              checked={paymentMethod === "bank_transfer"}
              onChange={() => setPaymentMethod("bank_transfer")}
            />
            무통장입금
          </label>
          {tossPaymentsEnabled && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="payment-method"
                checked={paymentMethod === "tosspayments"}
                onChange={() => setPaymentMethod("tosspayments")}
                disabled={!Number.isFinite(totalPrice) || totalPrice <= 0}
              />
              카드/간편결제 (토스)
            </label>
          )}
        </div>

        {paymentMethod === "bank_transfer" ? (
          <>
            <label className="block text-sm">
              은행 선택
              <Select value={bank} onValueChange={(value) => setBank(value as Bank)}>
                <SelectTrigger className="mt-1 w-full text-sm">
                  <SelectValue placeholder="은행 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shinhan">신한</SelectItem>
                  <SelectItem value="kookmin">국민</SelectItem>
                  <SelectItem value="woori">우리</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <Input className="w-full text-sm" placeholder="입금자명" value={depositor} onChange={(e) => setDepositor(e.target.value)} />
          </>
        ) : tossPaymentsEnabled ? (
          <TossPaymentWidget
            amount={totalPrice}
            customerKey={`${racket.id}:${onlyDigits(phone) || "guest"}`}
            onStatusChange={({ ready, loadError }) => {
              setTossWidgetReady(ready);
              setTossWidgetLoadError(loadError);
            }}
          />
        ) : null}

        <div className="text-sm">
          결제 금액: <span className="font-semibold">{totalPrice.toLocaleString()}원</span>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          주문/결제/개인정보 제공에 동의합니다.
        </label>

        {paymentMethod === "bank_transfer" ? (
          <Button className="w-full text-sm" variant="default" disabled={!canSubmitBank || submitting} onClick={onSubmitBankTransfer}>
            {submitting ? "처리 중..." : "스트링 선택으로 이동"}
          </Button>
        ) : tossPaymentsEnabled ? (
          <RacketTossCheckoutButton
            disabled={!canSubmitBase || submitting}
            widgetReady={tossWidgetReady}
            widgetLoadError={tossWidgetLoadError}
            payableAmount={totalPrice}
            payload={tossPayload}
            onBeforeSuccessNavigation={() => setIsIntentionalSuccessNavigation(true)}
            onSuccessNavigationAbort={() => setIsIntentionalSuccessNavigation(false)}
          />
        ) : null}

        {racket.status !== "available" && (
          <div className="text-sm text-destructive">
            현재 판매 가능한 라켓이 아닙니다. (status: {racket.status})
          </div>
        )}
      </div>
    </div>
  );
}
