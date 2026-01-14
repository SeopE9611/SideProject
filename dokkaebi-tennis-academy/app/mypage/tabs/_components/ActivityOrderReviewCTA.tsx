'use client';

import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import OrderReviewCTA from '@/components/reviews/OrderReviewCTA';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

type Props = {
  orderId: string;
  orderStatus?: string; // 예: '배송완료' | '구매확정'
  className?: string;
};

/**
 * Activity(전체내역)에서도 "리뷰 작성하기" CTA를 보여주기 위한 래퍼
 * - review-items API에서 remaining/nextProductId를 가져와 OrderReviewCTA에 그대로 주입
 */
export default function ActivityOrderReviewCTA({ orderId, orderStatus, className }: Props) {
  const completed = orderStatus === '배송완료' || orderStatus === '구매확정';
  const { data, isLoading } = useSWR(completed ? `/api/orders/${orderId}/review-items` : null, fetcher, { revalidateOnFocus: false });

  if (!completed) return null;

  // 로딩 중 placeholder(버튼 자리를 유지해 UX 안정)
  if (isLoading) {
    return (
      <Button size="sm" variant="outline" className={className} disabled>
        리뷰 확인중...
      </Button>
    );
  }

  const remaining = data?.counts?.remaining;
  const nextProductId = data?.nextProductId;
  if (typeof remaining !== 'number') return null;

  return <OrderReviewCTA orderId={orderId} orderStatus={orderStatus} showOnlyWhenCompleted reviewAllDone={remaining === 0} unreviewedCount={remaining} reviewNextTargetProductId={nextProductId} className={className} />;
}
