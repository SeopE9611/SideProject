'use client';

import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const orderStatusColors = {
  대기중: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
  처리중: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
  완료: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  취소: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
  환불: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
};

type Props = {
  orderId: string;
  initialStatus: string;
};

export function OrderStatusBadge({ orderId, initialStatus }: Props) {
  console.log('[OrderStatusBadge] SWR key:', `/api/orders/${orderId}/status`);
  const { data } = useSWR<{ status: string }>(`/api/orders/${orderId}/status`, fetcher, {
    fallbackData: { status: initialStatus },
    revalidateOnMount: true, //  mount 될 때 강제 fetch
    revalidateOnFocus: false, // 탭 전환 시 re-fetch 방지
    dedupingInterval: 3000, // 동일 요청 최소 간격 3초
  });

  const badgeClass = orderStatusColors[data?.status as keyof typeof orderStatusColors] ?? 'bg-muted';

  return <Badge className={badgeClass}>{data?.status}</Badge>;
}
