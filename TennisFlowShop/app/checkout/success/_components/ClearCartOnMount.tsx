'use client';

import { useEffect, useRef } from 'react';
import { useCartStore } from '@/app/store/cartStore';
import { useBuyNowStore } from '@/app/store/buyNowStore';
import { usePdpBundleStore } from '@/app/store/pdpBundleStore';

export default function ClearCartOnMount() {
  const clearCart = useCartStore((s) => s.clearCart);
  const clearBuyNow = useBuyNowStore((s) => s.clear);
  const clearPdpBundle = usePdpBundleStore((s) => s.clear);

  // 성공 페이지 진입 시 카드 비우기

  // StrictMode/리렌더로 인한 중복 호출 방지용 가드
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    clearCart(); // 기존 장바구니 비우기
    clearBuyNow(); //  buy-now 임시 상태도 함께 비우기
    clearPdpBundle();
  }, [clearCart, clearBuyNow, clearPdpBundle]);

  return null;
}
