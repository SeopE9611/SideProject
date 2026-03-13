'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { authenticatedSWRFetcher } from '@/lib/fetchers/authenticatedSWRFetcher';
import { getApplicationStatusBadgeSpec, getOrderStatusBadgeSpec, getRentalStatusBadgeSpec } from '@/lib/badge-style';
import { getMypageUserStatusLabel } from '@/app/mypage/_lib/status-label';
import { ArrowRight, Link2, Package } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';

type FlowDetailType = 'order' | 'application' | 'rental';
type FlowType = 'order_only' | 'order_plus_stringing' | 'rental_only' | 'rental_plus_stringing' | 'application_only';

type ActivityApplicationSummary = {
  id: string;
  status: string;
  hasTracking: boolean;
  needsInboundTracking?: boolean;
};

type ActivityGroup = {
  key: string;
  kind: 'order' | 'application' | 'rental';
  sortAt: string;
  flowType: FlowType;
  flowLabel: string;
  detailTarget: { type: FlowDetailType; id: string };
  order?: {
    status: string;
    totalPrice: number;
    linkedApplicationCount: number;
  };
  rental?: {
    status: string;
    totalAmount?: number;
    linkedApplicationCount: number;
  };
  application?: ActivityApplicationSummary;
};

type ActivityResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: ActivityGroup[];
};

const LIMIT = 5;
const fetcher = (url: string) => authenticatedSWRFetcher<ActivityResponse>(url);

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

const formatAmount = (amount?: number | null) => {
  if (typeof amount !== 'number') return '-';
  return `${amount.toLocaleString()}원`;
};

const FLOW_TYPE_LABEL: Record<FlowType, string> = {
  order_only: '주문 단독',
  order_plus_stringing: '주문 + 교체서비스',
  rental_only: '대여 단독',
  rental_plus_stringing: '대여 + 교체서비스',
  application_only: '교체서비스 단독',
};


const FLOW_TYPE_META_LABEL: Record<FlowType, string> = {
  order_only: '주문',
  order_plus_stringing: '주문 + 교체서비스',
  rental_only: '대여',
  rental_plus_stringing: '대여 + 교체서비스',
  application_only: '교체서비스',
};

const getStatusBadgeSpec = (group: ActivityGroup, label: string) => {
  if (group.kind === 'order') return getOrderStatusBadgeSpec(label);
  if (group.kind === 'rental') return getRentalStatusBadgeSpec(label);

  const normalized = label.trim();
  if (normalized === '승인') return getApplicationStatusBadgeSpec('접수완료');
  if (normalized === '거절') return getApplicationStatusBadgeSpec('취소');
  if (normalized === '환불') return getApplicationStatusBadgeSpec('취소');
  if (normalized === '반납완료') return getApplicationStatusBadgeSpec('교체완료');
  return getApplicationStatusBadgeSpec(label);
};

function FlowListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <Card key={idx} className="border-0 bg-card">
          <CardContent className="space-y-3 p-4 bp-sm:p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-4 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TransactionFlowList() {
  const getKey = (pageIndex: number, previousPageData: ActivityResponse | null) => {
    if (previousPageData && previousPageData.items && previousPageData.items.length < LIMIT) return null;
    const page = pageIndex + 1;
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(LIMIT));
    return `/api/mypage/activity?${params.toString()}`;
  };

  const { data, size, setSize, isValidating, error } = useSWRInfinite<ActivityResponse>(getKey, fetcher, {
    revalidateFirstPage: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const items = useMemo(() => (data ? data.flatMap((d) => d.items) : []), [data]);
  const hasMore = useMemo(() => {
    if (!data || data.length === 0) return false;
    const last = data[data.length - 1];
    return (last?.items?.length ?? 0) === LIMIT;
  }, [data]);

  if (!data && isValidating) {
    return <FlowListSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-0 bg-card">
        <CardContent className="p-8 text-center text-sm text-destructive">거래 흐름을 불러오는 중 오류가 발생했습니다.</CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-0 bg-card">
        <CardContent className="p-8 text-center">
          <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">표시할 거래 흐름이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((g) => {
        const status = g.kind === 'order' ? g.order?.status : g.kind === 'rental' ? g.rental?.status : g.application?.status;
        const userStatusLabel = getMypageUserStatusLabel(status);
        const statusBadgeSpec = getStatusBadgeSpec(g, userStatusLabel);
        const amount = g.kind === 'order' ? g.order?.totalPrice : g.kind === 'rental' ? g.rental?.totalAmount : null;
        const linkedCount = g.kind === 'order' ? g.order?.linkedApplicationCount ?? 0 : g.kind === 'rental' ? g.rental?.linkedApplicationCount ?? 0 : 0;
        const needsTrackingAction = Boolean(g.application?.needsInboundTracking && !g.application?.hasTracking);

        return (
          <Card key={g.key} className="border-0 bg-card">
            <CardContent className="space-y-4 p-4 bp-sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-foreground">{g.flowLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{FLOW_TYPE_META_LABEL[g.flowType]} · 최근 업데이트 {formatDate(g.sortAt)}</p>
                </div>
                <Badge variant={statusBadgeSpec.variant}>{userStatusLabel}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{FLOW_TYPE_LABEL[g.flowType]}</Badge>
                {g.flowType !== 'application_only' ? <Badge variant="outline">결제/주문 금액 {formatAmount(amount)}</Badge> : null}
                {g.flowType !== 'application_only' ? (
                  linkedCount > 0 ? (
                    <Badge variant="secondary" className="gap-1">
                      <Link2 className="h-3 w-3" /> 연결 신청 {linkedCount}건
                    </Badge>
                  ) : (
                    <Badge variant="outline">연결 신청 없음</Badge>
                  )
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="default">
                  <Link href={`/mypage?tab=orders&flowType=${g.detailTarget.type}&flowId=${g.detailTarget.id}&from=orders`}>
                    상세 보기 <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>

                {needsTrackingAction ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/mypage?tab=orders&flowType=application&flowId=${g.application?.id}&from=orders`}>신청서 확인</Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating}>
            {isValidating ? '불러오는 중...' : '더 보기'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
