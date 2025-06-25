'use client';

import useSWR, { mutate } from 'swr';
import useSWRInfinite from 'swr/infinite';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

const LIMIT = 5; // 한 페이지에 보여줄 이력 개수

// fetcher 함수: API 호출 후 JSON 파싱
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

// useSWRInfinite용 getKey: pageIndex와 이전 페이지 데이터를 이용해 API 경로 반환
const getHistoryKey = (orderId: string) => (pageIndex: number, previousPageData: HistoryResponse | null) => {
  // 이전 페이지에 데이터가 없으면 더 이상 페치하지 않음
  if (previousPageData && previousPageData.history.length === 0) return null;
  return `/api/orders/${orderId}/history?page=${pageIndex + 1}&limit=${LIMIT}`;
};

// 서버로부터 받는 상태 정보 타입
interface StatusResponse {
  status: string;
}
// 서버로부터 받는 이력 타입
interface HistoryItem {
  status: string;
  date: string;
  description: string;
}
interface HistoryResponse {
  history: HistoryItem[];
  total: number;
}

interface Props {
  orderId: string;
  currentStatus: string;
}

export function OrderStatusSelect({ orderId, currentStatus }: Props) {
  // 상태 전용 키
  const { data: statusData, mutate: mutateStatus } = useSWR<StatusResponse>(`/api/orders/${orderId}/status`, fetcher, { fallbackData: { status: currentStatus } });
  // 주문 전체 객체 키
  const { mutate: mutateOrderDetail } = useSWR(`/api/orders/${orderId}`, fetcher);
  // 이력용 SWRInfinite 훅
  const { mutate: mutateHistory } = useSWRInfinite(getHistoryKey(orderId), fetcher);

  const current = statusData?.status || currentStatus;
  const isCancelled = current === '취소';

  const handleChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('변경 실패');

      // 사태 전용 키 재검증
      await mutateStatus();
      // 주문 전체 객체 재검증
      await mutateOrderDetail();
      // 처리 이력 전체 재검증
      await mutateHistory();
      // 주문 목록 전체 갱신
      await mutate('/api/orders');

      toast.success(`주문 상태가 '${newStatus}'로 변경되었습니다.`);
    } catch (err: any) {
      console.error(err);
      toast.error(`상태 변경 실패: ${err.message}`);
    }
  };

  return (
    <div className="w-[200px]">
      {isCancelled ? (
        <div className="px-3 py-2 border rounded-md bg-muted text-muted-foreground text-sm italic">취소됨 (변경 불가)</div>
      ) : (
        <Select value={current} onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue placeholder="주문 상태 선택" />
          </SelectTrigger>
          <SelectContent>
            {['대기중', '결제완료', '배송중', '배송완료', '환불', '취소'].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {/* {isCancelled && <p className="mt-1 text-sm text-muted-foreground italic">이미 취소된 주문은 상태 변경이 불가능합니다.</p>} */}
    </div>
  );
}
