'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { mutate as mutateLegacy } from 'swr';
const ORDER_STATUSES = ['대기중', '결제완료', '배송중', '배송완료', '환불'];

export function OrderStatusSelect({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  // SWR 훅으로 현재 상태를 읽고 관리
  const { data, mutate } = useSWR<{ status: string }>(`/api/orders/${orderId}/status`, (url) => fetch(url).then((res) => res.json()), { fallbackData: { status: currentStatus } });
  // data가 undefined여도 currentStatus를 사용하도록
  const status = data?.status ?? currentStatus;
  const isCancelled = status === '취소';

  const handleChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('상태 변경 실패');

      // SWR 캐시 강제 갱신
      // SWR 캐시만 무효화 → 이 컴포넌트가 자동 리렌더됨
      await mutate();
      // 처리 이력도 같은 방식으로 갱신하려면,
      await mutateLegacy(`/api/orders/${orderId}/history`);

      toast.success(`주문 상태가 '${newStatus}'(으)로 변경되었습니다`);
    } catch (err) {
      console.error(err);
      toast.error('주문 상태 변경 중 오류 발생');
    }
  };

  return (
    <div className="w-[200px]">
      {isCancelled ? (
        <div className="w-[200px] px-3 py-2 border rounded-md bg-muted text-muted-foreground text-sm italic">취소됨 (변경 불가)</div>
      ) : (
        <Select value={status} onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue placeholder="주문 상태 선택" />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {isCancelled && <p className="mt-1 text-sm text-muted-foreground italic">이미 취소된 주문은 상태 변경이 불가능합니다.</p>}
    </div>
  );
}
