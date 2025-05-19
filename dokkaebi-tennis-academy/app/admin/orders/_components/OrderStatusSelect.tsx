'use client';

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useTransition } from 'react';
import { toast } from 'sonner';

export function OrderStatusSelect({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('업데이트 실패');

      toast?.success('주문 상태가 변경되었습니다.');
      startTransition(() => location.reload());
    } catch (err) {
      console.error(err);
      toast?.error('상태 변경 중 오류 발생');
    }
  };

  return (
    <Select defaultValue={currentStatus} onValueChange={handleStatusChange}>
      <SelectTrigger className="w-full sm:w-[200px]" disabled={isPending}>
        <SelectValue placeholder="주문 상태 변경" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="입금대기">입금대기</SelectItem>
        <SelectItem value="결제완료">결제완료</SelectItem>
        <SelectItem value="배송중">배송중</SelectItem>
        <SelectItem value="배송완료">배송완료</SelectItem>
        {/* <SelectItem value="취소">취소</SelectItem> */}
        <SelectItem value="환불">환불</SelectItem>
      </SelectContent>
    </Select>
  );
}
