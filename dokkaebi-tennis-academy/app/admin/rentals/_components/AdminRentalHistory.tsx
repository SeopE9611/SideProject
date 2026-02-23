'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Play, RotateCcw, XCircle, Undo2, Clock } from 'lucide-react';
import { adminFetcher } from '@/lib/admin/adminFetcher';

const fetcher = (url: string) => adminFetcher<{ ok: boolean; items: HistoryItem[]; page: number; pageSize: number; total: number; hasPrev: boolean; hasNext: boolean }>(url, { cache: 'no-store' });

type HistoryItem = {
  _id: string;
  action: 'paid' | 'out' | 'returned' | 'cancel-request' | 'cancel-approved' | 'cancel-rejected' | 'cancel-withdrawn';
  from: string;
  to: string;
  at: string;
  actor?: { role: 'user' | 'admin' | 'system'; id?: string };
  snapshot?: any;
};

const ACTIONS = ['all', 'paid', 'out', 'returned', 'cancel-request', 'cancel-approved', 'cancel-rejected', 'cancel-withdrawn'] as const;

type ActionFilter = (typeof ACTIONS)[number];

const FILTER_LABELS: Record<ActionFilter, string> = {
  all: '전체',
  paid: '결제 확인',
  out: '대여 시작',
  returned: '반납 완료',
  'cancel-request': '취소 요청',
  'cancel-approved': '취소 승인',
  'cancel-rejected': '취소 거절',
  'cancel-withdrawn': '취소 철회',
};

function getActionMeta(action: HistoryItem['action']) {
  switch (action) {
    case 'paid':
      return {
        label: '결제 확인',
        Icon: CreditCard,
        wrapperClasses: 'border border-primary/20 bg-primary/10 dark:bg-primary/20',
        iconClasses: 'text-primary',
      };
    case 'out':
      return {
        label: '대여 시작',
        Icon: Play,
        wrapperClasses: 'border border-border bg-muted dark:bg-card',
        iconClasses: 'text-foreground',
      };
    case 'returned':
      return {
        label: '반납 완료',
        Icon: RotateCcw,
        wrapperClasses: 'border border-border bg-muted dark:bg-card',
        iconClasses: 'text-foreground',
      };
    case 'cancel-request':
      return {
        label: '취소 요청',
        Icon: Clock,
        wrapperClasses: 'border border-border bg-muted dark:bg-card',
        iconClasses: 'text-primary',
      };
    case 'cancel-approved':
      return {
        label: '취소 승인',
        Icon: XCircle,
        wrapperClasses: 'border border-destructive/30 bg-destructive/10 dark:bg-destructive/15',
        iconClasses: 'text-destructive',
      };
    case 'cancel-rejected':
      return {
        label: '취소 거절',
        Icon: XCircle,
        wrapperClasses: 'border border-border bg-muted dark:bg-card',
        iconClasses: 'text-foreground',
      };
    case 'cancel-withdrawn':
      return {
        label: '취소 철회',
        Icon: Undo2,
        wrapperClasses: 'border border-border bg-muted dark:bg-card',
        iconClasses: 'text-foreground',
      };
  }
}

/** 처리 주체 한글 라벨 */
function getActorLabel(actor?: HistoryItem['actor']) {
  if (!actor) return '시스템';
  if (actor.role === 'admin') return '관리자';
  if (actor.role === 'user') return '회원/고객';
  return '시스템';
}

/** 한 줄 설명 문구 생성 */
function getDescription(item: HistoryItem) {
  const actor = getActorLabel(item.actor);
  const base = `${actor}가 상태를 ${item.from} → ${item.to}로 변경했습니다.`;

  if (item.action === 'cancel-request') {
    const reason = item.snapshot?.cancelRequest?.reasonText || item.snapshot?.cancelRequest?.reasonCode || '사유 미입력';
    return `${actor}가 대여 취소를 요청했습니다. 사유: ${reason}`;
  }
  if (item.action === 'cancel-approved') {
    return `${actor}가 대여 취소 요청을 승인했습니다.`;
  }
  if (item.action === 'cancel-rejected') {
    return `${actor}가 대여 취소 요청을 거절했습니다.`;
  }
  if (item.action === 'cancel-withdrawn') {
    return `${actor}가 대여 취소 요청을 철회했습니다.`;
  }

  // paid / out / returned 등은 기본 문구 사용
  return base;
}

interface Props {
  id: string;
}

export default function AdminRentalHistory({ id }: Props) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ActionFilter>('all');
  const pageSize = 5;

  const { data, isLoading } = useSWR<{
    ok: boolean;
    items: HistoryItem[];
    page: number;
    pageSize: number;
    total: number;
    hasPrev: boolean;
    hasNext: boolean;
  }>(`/api/admin/rentals/${id}/history?page=${page}&pageSize=${pageSize}`, fetcher, {
    keepPreviousData: true,
  });

  const items = useMemo(() => {
    const raw = data?.items ?? [];
    if (filter === 'all') return raw;
    return raw.filter((h) => h.action === filter);
  }, [data?.items, filter]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Card className="mt-8 border-0 shadow-xl ring-1 ring-ring bg-gradient-to-b from-background to-card dark:from-background dark:to-card">
      <CardHeader className="bg-gradient-to-r from-background to-card dark:from-background dark:to-card border-b pb-3">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-foreground" />
          <span>처리 이력</span>
        </CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">최신 변경이 맨 위에 표시됩니다.</p>
      </CardHeader>

      <CardContent className="pt-2">
        {isLoading && <div className="py-6 text-center text-sm text-muted-foreground">불러오는 중…</div>}

        {!isLoading && items.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">아직 처리 이력이 없습니다.</div>}

        {/* 실제 이력 리스트 */}
        <div className="space-y-3">
          {items.map((h) => {
            const meta = getActionMeta(h.action);
            const dateStr = new Intl.DateTimeFormat('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date(h.at));

            return (
              <div key={h._id} className="flex space-x-4 py-3 border-b last:border-none">
                <div className={`h-10 w-10 flex items-center justify-center rounded-full border ${meta.wrapperClasses}`}>
                  <meta.Icon className={`h-6 w-6 ${meta.iconClasses}`} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold">{meta.label}</span>
                    <span className="text-xs text-muted-foreground">{dateStr}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{getDescription(h)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 페이지 이동 */}
        <div className="mt-4 flex items-center justify-between">
          <Button size="sm" variant="outline" disabled={!data?.hasPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            이전
          </Button>
          <span className="text-sm text-muted-foreground">{data ? `${page} / ${totalPages}` : '-'}</span>
          <Button size="sm" variant="outline" disabled={!data?.hasNext} onClick={() => setPage((p) => (data?.hasNext ? p + 1 : p))}>
            다음
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
