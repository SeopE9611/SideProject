'use client';

import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { orderStatusColors } from '@/lib/badge-style';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
