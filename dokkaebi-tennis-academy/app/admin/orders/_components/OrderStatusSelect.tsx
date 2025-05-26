'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { mutate as mutateLegacy } from 'swr';

const ORDER_STATUSES = ['대기중', '결제완료', '배송중', '배송완료', '환불'];
const LIMIT = 5; // 한 페이지에 몇 개씩 보여줄지

interface Props {
  orderId: string;
  currentStatus: string;
  totalHistoryCount: number;
}

// 2) 함수 시그니처에 Props 적용
export function OrderStatusSelect({ orderId, currentStatus, totalHistoryCount }: Props) {
  // SWR 훅으로 현재 상태를 읽고 관리
  const { data, mutate } = useSWR<{ status: string }>(`/api/orders/${orderId}/status`, (url) => fetch(url).then((res) => res.json()), { fallbackData: { status: currentStatus } });
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

      await mutate();

      // 2) B안: 전체 이력 키 한 번만 무효화 → OrderHistory의 useSWR이 재검증
      await mutateLegacy(`/api/orders/${orderId}/history?page=1&limit=${totalHistoryCount}`);
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
