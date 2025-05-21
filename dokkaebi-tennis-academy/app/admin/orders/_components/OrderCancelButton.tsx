'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const CANCEL_REASONS = ['상품 품절', '고객 요청', '배송 지연', '결제 오류', '기타'];

type Props = {
  orderId: string;
  alreadyCancelledReason?: string | null; // 취소된 경우 이미 등록된 사유
};

export function OrderCancelButton({ orderId, alreadyCancelledReason }: Props) {
  const [showSelect, setShowSelect] = useState(false);
  const [reason, setReason] = useState('');

  //  실시간 상태 fetch
  const { data } = useSWR<{ status: string; reason?: string }>(`/api/orders/${orderId}/status`, fetcher, {
    fallbackData: { status: '대기중' },
    revalidateOnMount: true,
  });

  const status = data?.status;
  const reasonFromSWR = data?.reason;
  const isCancelled = status === '취소';

  if (isCancelled) {
    return (
      <div className="text-sm text-muted-foreground italic">
        이미 취소된 주문입니다.
        {(reasonFromSWR || alreadyCancelledReason) && <div className="mt-1 text-destructive">사유: {reasonFromSWR ?? alreadyCancelledReason}</div>}
      </div>
    );
  }
  const handleCancel = async () => {
    if (!reason) {
      toast.error('취소 사유를 선택해주세요');
      return;
    }

    const confirm = window.confirm(`정말로 이 주문을 취소하시겠습니까?\n한 번 취소하면 다시는 변경할 수 없습니다.\n사유: ${reason}`);
    if (!confirm) return;

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: '취소', reason }),
      });

      if (!res.ok) throw new Error('주문 취소 실패');

      //  상태/이력 갱신
      await mutate(`/api/orders/${orderId}/status`, undefined, { revalidate: true });
      await mutate(`/api/orders/${orderId}/history`, undefined, { revalidate: true });

      toast.success('주문이 취소되었습니다');
    } catch (err) {
      console.error(err);
      toast.error('주문 취소 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      {showSelect ? (
        <>
          <Select onValueChange={setReason}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="취소 사유 선택" />
            </SelectTrigger>
            <SelectContent>
              {CANCEL_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="destructive" onClick={handleCancel} disabled={!reason}>
            취소 확정
          </Button>
        </>
      ) : (
        <Button variant="destructive" onClick={() => setShowSelect(true)}>
          주문 취소
        </Button>
      )}
    </div>
  );
}
