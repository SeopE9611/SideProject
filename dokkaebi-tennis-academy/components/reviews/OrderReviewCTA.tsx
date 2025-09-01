'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Check } from 'lucide-react';

type Props = {
  orderId: string;
  reviewAllDone?: boolean;
  unreviewedCount?: number;
  reviewNextTargetProductId?: string | null;

  // 상태 게이트용
  orderStatus?: string;
  showOnlyWhenCompleted?: boolean;

  loading?: boolean;

  size?: 'sm' | 'default';
  className?: string;
};

export default function OrderReviewCTA({ orderId, reviewAllDone, unreviewedCount, reviewNextTargetProductId, orderStatus, showOnlyWhenCompleted = false, size = 'sm', loading = false, className }: Props) {
  // 완료 상태 정의
  const completedSet = new Set(['배송완료', '완료', '구매확정']);

  // 완료 상태 게이트
  if (showOnlyWhenCompleted && !completedSet.has(orderStatus ?? '')) {
    return null;
  }

  if (loading) {
    return (
      <Button size={size} variant="outline" className={className} disabled>
        확인중…
      </Button>
    );
  }

  // 이미 모두 작성
  if (reviewAllDone) {
    return (
      <div className={`inline-flex items-center gap-2 ${className ?? ''}`}>
        <Button size={size} variant="secondary" disabled>
          <Check className="mr-1 h-4 w-4" />
          리뷰 작성완료
        </Button>
      </div>
    );
  }

  // CTA + 배지
  const Badge = unreviewedCount && unreviewedCount > 0 ? <span className="inline-flex items-center rounded-full bg-white/70 ring-1 ring-slate-200 text-slate-700 text-[11px] px-2 py-0.5">미작성 {unreviewedCount}개</span> : null;

  // 하나 바로 쓸 수 있는 대상이 있으면 곧바로 작성 페이지
  if (reviewNextTargetProductId) {
    return (
      <div className={`inline-flex items-center gap-2 ${className ?? ''}`}>
        <Button size={size} asChild className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg">
          <Link href={`/reviews/write?productId=${reviewNextTargetProductId}&orderId=${orderId}`}>
            <MessageSquarePlus className="mr-1 h-4 w-4" />
            리뷰 작성하기
          </Link>
        </Button>
        {Badge}
      </div>
    );
  }

  // 여러 개인데 바로 대상이 없으면 상세(#reviews-cta)로
  if (unreviewedCount && unreviewedCount > 0) {
    return (
      <div className={`inline-flex items-center gap-2 ${className ?? ''}`}>
        <Button size={size} variant="outline" asChild>
          <Link href={`/mypage?tab=orders&orderId=${orderId}#reviews-cta`}>리뷰 작성하기</Link>
        </Button>
        {Badge}
      </div>
    );
  }

  // 표시할 것 없음
  return null;
}
