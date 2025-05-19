'use client';

import { Button } from '@/components/ui/button';

export function OrderCancelButton({ orderId }: { orderId: string }) {
  const handleCancelOrder = async () => {
    const confirmCancel = window.confirm('정말로 이 주문을 취소하시겠습니까?');
    if (!confirmCancel) return;

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: '취소' }),
      });

      if (!res.ok) {
        throw new Error('주문 취소 실패');
      }

      location.reload();
    } catch (err) {
      console.error(err);
      alert('주문 취소 중 오류가 발생했습니다.');
    }
  };

  return (
    <Button variant="destructive" className="sm:ml-auto" onClick={handleCancelOrder}>
      주문 취소
    </Button>
  );
}
