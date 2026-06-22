"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/app/store/cartStore";
import { useBuyNowStore } from "@/app/store/buyNowStore";
import { usePdpBundleStore } from "@/app/store/pdpBundleStore";

const CART_CHECKOUT_SELECTION_KEY = "cart.checkout.selectedLineKeys.v1";

const getCartLineKey = (item: {
  id: string;
  selectedGauge?: string;
  selectedColor?: string;
}) => `${item.id}::${item.selectedGauge ?? ""}::${item.selectedColor ?? ""}`;

export default function ClearCartOnMount() {
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearBuyNow = useBuyNowStore((s) => s.clear);
  const clearPdpBundle = usePdpBundleStore((s) => s.clear);

  // 성공 페이지 진입 시 카드 비우기

  // StrictMode/리렌더로 인한 중복 호출 방지용 가드
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    try {
      const raw = sessionStorage.getItem(CART_CHECKOUT_SELECTION_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const selectedLineKeys = Array.isArray(parsed)
        ? parsed.filter((key): key is string => typeof key === "string")
        : null;

      if (selectedLineKeys && selectedLineKeys.length > 0) {
        cartItems
          .filter((item) => selectedLineKeys.includes(getCartLineKey(item)))
          .forEach((item) =>
            removeItem(item.id, item.selectedGauge, item.selectedColor),
          );
      } else {
        clearCart(); // 기존 장바구니 비우기
      }
      sessionStorage.removeItem(CART_CHECKOUT_SELECTION_KEY);
    } catch {
      clearCart();
      sessionStorage.removeItem(CART_CHECKOUT_SELECTION_KEY);
    }
    clearBuyNow(); //  buy-now 임시 상태도 함께 비우기
    clearPdpBundle();
  }, [cartItems, clearCart, clearBuyNow, clearPdpBundle, removeItem]);

  return null;
}
