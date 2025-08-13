'use client';

import { useEffect, useRef } from 'react';
import { useCartStore } from '@/app/store/cartStore';

export default function ClearCartOnMount() {
  const clearCart = useCartStore((s) => s.clearCart);

  // 성공 페이지 진입 시 카드 비우기

  // StrictMode/리렌더로 인한 중복 호출 방지용 가드
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    clearCart();
  }, [clearCart]);
  return null;
}
