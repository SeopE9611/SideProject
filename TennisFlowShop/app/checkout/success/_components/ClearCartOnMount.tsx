"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/app/store/cartStore";
import { useBuyNowStore } from "@/app/store/buyNowStore";
import { usePdpBundleStore } from "@/app/store/pdpBundleStore";
import {
  CART_CHECKOUT_SELECTION_KEY,
  clearCartCheckoutSelectionStorage,
  removeSelectedCartItems,
  validateCartCheckoutSelection,
} from "@/app/store/cartCheckoutSelection";
import { clearCheckoutRecoveryContext } from "@/app/store/checkoutRecoveryContext";

export default function ClearCartOnMount() {
  const cartItems = useCartStore((s) => s.items);
  const clearBuyNow = useBuyNowStore((s) => s.clear);
  const clearPdpBundle = usePdpBundleStore((s) => s.clear);

  // 성공 페이지 진입 시 유효한 선택 상품만 장바구니에서 제거

  // StrictMode/리렌더로 인한 중복 호출 방지용 가드
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const selection = validateCartCheckoutSelection(
      sessionStorage.getItem(CART_CHECKOUT_SELECTION_KEY),
      cartItems,
    );
    if (selection) {
      useCartStore.setState({
        items: removeSelectedCartItems(cartItems, selection),
      });
    }
    clearCartCheckoutSelectionStorage(sessionStorage);
    clearCheckoutRecoveryContext(sessionStorage);
    clearBuyNow(); //  buy-now 임시 상태도 함께 비우기
    clearPdpBundle();
  }, [cartItems, clearBuyNow, clearPdpBundle]);

  return null;
}
