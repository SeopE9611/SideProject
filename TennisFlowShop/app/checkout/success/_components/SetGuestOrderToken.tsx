'use client';

import { useEffect } from 'react';

/** 비회원(게스트) 주문이라면, 이 컴포넌트가 마운트될 때
 *  해당 주문 접근 전용 토큰(HttpOnly 쿠키)을 서버에 요청해 심는다.
 */
export default function SetGuestOrderToken({ orderId, isGuest }: { orderId: string; isGuest: boolean }) {
  useEffect(() => {
    if (!isGuest || !orderId) return;
    (async () => {
      try {
        await fetch(`/api/orders/${orderId}/guest-token`, {
          method: 'POST',
          credentials: 'include',
        });
        // 성공해도 화면 변화는 없음. 서버 쿠키만 세팅.
      } catch (e) {
        console.error('[guest-token] failed', e);
      }
    })();
  }, [orderId, isGuest]);

  return null;
}
