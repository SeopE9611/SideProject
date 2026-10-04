"use client";

import { PaymentFailureResult } from "@/components/checkout/PaymentFailureResult";
import { useBuyNowStore } from "@/app/store/buyNowStore";
import { useCartStore } from "@/app/store/cartStore";
import {
  CART_CHECKOUT_SELECTION_KEY,
  validateCartCheckoutSelection,
} from "@/app/store/cartCheckoutSelection";
import { isCheckoutIntentExpired } from "@/app/store/checkoutIntentPersistence";
import {
  clearCheckoutRecoveryContext,
  readCheckoutRecoveryContext,
} from "@/app/store/checkoutRecoveryContext";
import { usePdpBundleStore } from "@/app/store/pdpBundleStore";
import { useEffect, useState } from "react";

type FailureGuide = {
  title: string;
  description: string[];
  accent?: "default" | "warning";
};

export default function NiceCheckoutFailResult({
  guide,
  code,
  message,
  requiresPaymentCheck,
}: {
  guide: FailureGuide;
  code: string;
  message: string;
  requiresPaymentCheck: boolean;
}) {
  const cartItems = useCartStore((state) => state.items);
  const { item: buyNowItem, expiresAt: buyNowExpiresAt, hasHydrated: hasBuyNowHydrated } =
    useBuyNowStore();
  const {
    items: pdpBundleItems,
    expiresAt: pdpBundleExpiresAt,
    hasHydrated: hasPdpBundleHydrated,
  } = usePdpBundleStore();
  const [recoveryHref, setRecoveryHref] = useState("/cart");

  useEffect(() => {
    if (requiresPaymentCheck || !hasBuyNowHydrated || !hasPdpBundleHydrated) return;

    const context = readCheckoutRecoveryContext(sessionStorage);
    if (!context) return;
    const url = new URL(context.href, window.location.origin);
    const isCartSelection = url.searchParams.get("source") === "cart-selection";
    const hasValidIntent = isCartSelection
      ? !!validateCartCheckoutSelection(
          sessionStorage.getItem(CART_CHECKOUT_SELECTION_KEY),
          cartItems,
        )
      : (!!buyNowItem && !isCheckoutIntentExpired(buyNowExpiresAt)) ||
        (pdpBundleItems.length > 0 && !isCheckoutIntentExpired(pdpBundleExpiresAt));

    if (hasValidIntent) {
      setRecoveryHref(context.href);
      return;
    }
    clearCheckoutRecoveryContext(sessionStorage);
  }, [
    buyNowExpiresAt,
    buyNowItem,
    cartItems,
    hasBuyNowHydrated,
    hasPdpBundleHydrated,
    pdpBundleExpiresAt,
    pdpBundleItems,
    requiresPaymentCheck,
  ]);

  return (
    <PaymentFailureResult
      guide={guide}
      code={code}
      message={message}
      primaryAction={
        requiresPaymentCheck
          ? { label: "주문 내역 확인", href: "/mypage?tab=orders" }
          : recoveryHref === "/cart"
            ? { label: "장바구니에서 다시 선택하기", href: "/cart" }
            : { label: "체크아웃으로 돌아가기", href: recoveryHref }
      }
      secondaryAction={
        requiresPaymentCheck
          ? { label: "고객센터로 이동", href: "/support" }
          : recoveryHref === "/cart"
            ? undefined
            : { label: "장바구니로 이동", href: "/cart" }
      }
      warningMessage="결제 승인이 완료됐을 가능성이 있으니 같은 상품을 바로 반복 결제하지 마시고, 먼저 주문 내역 또는 고객센터에서 상태를 확인해주세요."
    />
  );
}
