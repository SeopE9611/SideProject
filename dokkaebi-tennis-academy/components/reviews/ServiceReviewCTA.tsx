'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Check, MessageSquarePlus } from 'lucide-react';

type Props = {
  applicationId?: string;
  status?: string;
  className?: string;
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

export default function ServiceReviewCTA({ applicationId, status, className }: Props) {
  // status가 주어지면 완료 상태에서만 호출 (UX 최적화)
  const completedSet = new Set(['교체완료', '완료', 'completed']);
  const allowFetchByStatus = status ? completedSet.has(status) : true;

  // applicationId 유무에 따라 eligibility URL 분기
  const url = applicationId ? `/api/reviews/eligibility?service=stringing&applicationId=${applicationId}` : `/api/reviews/eligibility?service=stringing`;

  const { data, isLoading } = useSWR(allowFetchByStatus ? url : null, fetcher);

  if (!allowFetchByStatus) return null;
  if (isLoading) {
    return (
      <Button size="sm" variant="outline" className={className} disabled>
        확인중…
      </Button>
    );
  }
  if (data?.reason === 'already') {
    return (
      <Button size="sm" variant="secondary" className={className} disabled>
        <Check className="mr-1 h-4 w-4" />
        작성 완료
      </Button>
    );
  }
  if (data?.eligible === false) return null;

  // 링크 만들기: applicationId 우선, 없으면 추천 ID 사용
  const href = `/reviews/write?service=stringing` + (applicationId ? `&applicationId=${applicationId}` : data?.suggestedApplicationId ? `&applicationId=${data.suggestedApplicationId}` : '');

  return (
    <Button size="sm" className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white ${className ?? ''}`} asChild>
      <Link href={href}>
        <MessageSquarePlus className="mr-1 h-4 w-4" />
        서비스 리뷰 작성하기
      </Link>
    </Button>
  );
}
