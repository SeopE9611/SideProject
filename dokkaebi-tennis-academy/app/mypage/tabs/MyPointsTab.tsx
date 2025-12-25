'use client';

import useSWR from 'swr';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { PointTransactionListItem } from '@/lib/types/points';

type PointsHistoryRes = {
  ok: boolean;
  balance: number;
  items: PointTransactionListItem[];
  total: number;
  page: number;
  limit: number;
  error?: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n);

export default function MyPointsTab() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, mutate } = useSWR<PointsHistoryRes>(`/api/points/me/history?page=${page}&limit=${limit}`, fetcher);

  const totalPages = useMemo(() => {
    const total = data?.total ?? 0;
    return Math.max(1, Math.ceil(total / limit));
  }, [data?.total]);

  // total 감소(필터/삭제 등)로 page가 범위를 벗어나면 보정
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (isLoading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>포인트</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>포인트</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">불러오기에 실패했습니다. ({data?.error ?? 'UNKNOWN'})</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>포인트</CardTitle>
        <div className="text-sm">
          보유 포인트: <span className="font-semibold">{fmt(data.balance)}P</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 내역 */}
        <div className="rounded-md">
          <div className="px-3 py-2 text-sm font-medium border-b">포인트 내역</div>

          {data.items.length === 0 ? (
            <div className="px-3 py-6 text-sm text-muted-foreground">내역이 없습니다.</div>
          ) : (
            <ul className="divide-y">
              {data.items.map((it) => (
                <li key={it.id} className="px-3 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {it.amount >= 0 ? `+${fmt(it.amount)}` : fmt(it.amount)}P
                      <span className="ml-2 text-xs text-muted-foreground">
                        {it.type} / {it.status}
                      </span>
                    </div>
                    {it.reason ? <div className="text-xs text-muted-foreground">{it.reason}</div> : null}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">{new Date(it.createdAt).toLocaleString('ko-KR')}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 페이지네이션 */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            이전
          </Button>
          <div className="text-sm tabular-nums">
            {page} / {totalPages}
          </div>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            다음
          </Button>

          <Button variant="ghost" size="sm" onClick={() => mutate()}>
            새로고침
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
