'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(async (r) => {
    try {
      return await r.json();
    } catch {
      return { ok: false, items: [] };
    }
  });

export default function AdminRentalHistory({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data, isLoading, mutate } = useSWR<{ ok: boolean; items: any[]; page: number; pageSize: number; total: number; hasPrev: boolean; hasNext: boolean }>(`/api/rentals/${id}/history?page=${page}&pageSize=${pageSize}`, fetcher, {
    keepPreviousData: true,
  });

  const items = data?.items ?? [];

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>처리 이력</CardTitle>
          <div className="text-xs text-muted-foreground">{data ? `총 ${data.total}건 / 페이지 ${data.page}` : '불러오는 중…'}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <div className="text-sm text-muted-foreground">불러오는 중…</div>}

        {items.length === 0 && !isLoading && <div className="text-sm text-muted-foreground">이력이 없습니다.</div>}

        {/* 타임라인 형태 간단 렌더 */}
        {items.map((h) => (
          <div key={h._id} className="border rounded p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">
                {h.action.toUpperCase()}&nbsp;
                <span className="text-xs text-muted-foreground">
                  ({h.from} → {h.to})
                </span>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(h.at).toLocaleString()}</div>
            </div>
            {h.actor?.role && (
              <div className="mt-1 text-xs">
                actor: {h.actor.role}
                {h.actor?.id ? ` (${h.actor.id})` : ''}
              </div>
            )}
            {h.snapshot?.shipping?.name && (
              <div className="mt-1 text-xs text-muted-foreground">
                수령인: {h.snapshot.shipping.name} / {h.snapshot.shipping.address ?? ''} {h.snapshot.shipping.addressDetail ?? ''}
              </div>
            )}
          </div>
        ))}

        {/* 페이지 이동 */}
        <div className="flex items-center justify-between pt-2">
          <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data?.hasPrev}>
            이전
          </button>
          <div className="text-xs text-muted-foreground">{data ? `${data.page} / ${Math.max(1, Math.ceil(data.total / data.pageSize))}` : '-'}</div>
          <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPage((p) => (data?.hasNext ? p + 1 : p))} disabled={!data?.hasNext}>
            다음
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
