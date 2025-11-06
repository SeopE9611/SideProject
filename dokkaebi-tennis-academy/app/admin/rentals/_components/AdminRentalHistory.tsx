'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(async (r) => {
    try {
      return await r.json();
    } catch {
      return { ok: false, items: [] };
    }
  });

type HistoryItem = {
  _id: string;
  action: 'paid' | 'out' | 'returned';
  from: string;
  to: string;
  at: string;
  actor?: { role: 'user' | 'admin' | 'system'; id?: string };
  snapshot?: any;
};

const ACTIONS = ['all', 'paid', 'out', 'returned'] as const;
type ActionFilter = (typeof ACTIONS)[number];

function ActionBadge({ action }: { action: HistoryItem['action'] }) {
  const map: Record<HistoryItem['action'], string> = {
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    out: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    returned: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  };
  const label = action.toUpperCase();
  return <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${map[action]}`}>{label}</span>;
}

export default function AdminRentalHistory({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ActionFilter>('all');
  const pageSize = 10;

  const { data, isLoading } = useSWR<{
    ok: boolean;
    items: HistoryItem[];
    page: number;
    pageSize: number;
    total: number;
    hasPrev: boolean;
    hasNext: boolean;
  }>(`/api/rentals/${id}/history?page=${page}&pageSize=${pageSize}`, fetcher, { keepPreviousData: true });

  const items = useMemo(() => {
    const raw = data?.items ?? [];
    if (filter === 'all') return raw;
    return raw.filter((h) => h.action === filter);
  }, [data?.items, filter]);

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle>처리 이력</CardTitle>
          <div className="flex items-center gap-2">
            {/* 액션 필터 */}
            {ACTIONS.map((a) => (
              <button key={a} onClick={() => setFilter(a)} className={`px-2 py-1 rounded text-xs border ${filter === a ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-muted-foreground'}`} title={`필터: ${a}`}>
                {a.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">{data ? `총 ${data.total}건 / 페이지 ${data.page}` : '불러오는 중…'}</div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <div className="text-sm text-muted-foreground">불러오는 중…</div>}

        {items.length === 0 && !isLoading && <div className="text-sm text-muted-foreground">이력이 없습니다.</div>}

        {items.map((h) => (
          <div key={h._id} className="border rounded p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ActionBadge action={h.action} />
                <div className="font-medium">
                  <span className="text-xs text-muted-foreground">
                    ({h.from} → {h.to})
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(h.at).toLocaleString()}</div>
            </div>
            {h.actor?.role && (
              <div className="mt-1 text-xs">
                actor: {h.actor.role}
                {h.actor?.id ? ` (${h.actor.id})` : ''}
              </div>
            )}
            {/* 스냅샷이 존재할 때만 보이도록 */}
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
