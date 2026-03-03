'use client';

import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { badgeBase, badgeSizeSm, getOrderStatusBadgeSpec } from '@/lib/badge-style';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

type Props = {
  orderId: string;
  initialStatus: string;
};

export function OrderStatusBadge({ orderId, initialStatus }: Props) {
  const { data } = useSWR<{ status: string }>(`/api/orders/${orderId}/status`, fetcher, {
    fallbackData: { status: initialStatus },
    revalidateOnMount: true, //  mount 될 때 강제 fetch
    revalidateOnFocus: false, // 탭 전환 시 re-fetch 방지
    dedupingInterval: 3000, // 동일 요청 최소 간격 3초
  });

  const spec = getOrderStatusBadgeSpec(data?.status);
  return <Badge variant={spec.variant} className={cn(badgeBase, badgeSizeSm)}>{data?.status}</Badge>;
}
