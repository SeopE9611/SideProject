'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCcw, Send, Search } from 'lucide-react';

type Status = 'all' | 'queued' | 'failed' | 'sent';

type OutboxItem = {
  id: string;
  eventType: string;
  status: 'queued' | 'failed' | 'sent';
  channels: Array<'email' | 'slack' | 'sms'>;
  to: string | null;
  subject: string | null;
  createdAt: string;
  sentAt?: string | null;
  retries: number;
  error: string | null;
  applicationId?: string | null;
  orderId?: string | null;
};

type PageRes = { items: OutboxItem[]; total: number };

type OutboxDetail = any;

const LIMIT = 10;
const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(async (r) => {
    if (!r.ok) throw new Error((await r.text()) || '요청 실패');
    return r.json();
  });

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function formatIsoToKstShort(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d)) return String(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  // 브라우저 로컬(KST) 기준 표기
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function channelsLabel(chs: OutboxItem['channels']) {
  const arr = chs ?? [];
  if (!arr.length) return '-';
  return arr.join(', ');
}

export default function AdminNotificationsClient() {
  const router = useRouter();
  const sp = useSearchParams();

  // --- URL → 초기 필터 ---
  const initialStatus = (sp.get('status') || 'all') as Status;
  const initialQ = sp.get('q') || '';

  const [status, setStatus] = useState<Status>(['all', 'queued', 'failed', 'sent'].includes(initialStatus) ? initialStatus : 'all');
  const [qRaw, setQRaw] = useState(initialQ);
  const qDebounced = useDebounced(qRaw, 350);
  const [page, setPage] = useState(1);

  // 필터 변경 시 1페이지로
  useEffect(() => {
    setPage(1);
  }, [status, qDebounced]);

  // 필터를 URL에 반영(새로고침/공유용)
  useEffect(() => {
    const p = new URLSearchParams(sp.toString());
    if (status === 'all') p.delete('status');
    else p.set('status', status);

    const q = qRaw.trim();
    if (!q) p.delete('q');
    else p.set('q', q);

    // page는 URL에 굳이 고정하지 않음(공유 시 항상 1페이지)
    p.delete('page');

    const qs = p.toString();
    router.replace(qs ? `/admin/notifications?${qs}` : '/admin/notifications');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, qRaw]);

  const key = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (status !== 'all') p.set('status', status);
    if (qDebounced.trim()) p.set('q', qDebounced.trim());
    return `/api/admin/notifications/outbox?${p.toString()}`;
  }, [page, status, qDebounced]);

  const { data, error, isValidating, mutate } = useSWR<PageRes>(key, fetcher, { revalidateOnFocus: false });
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // --- 상세 ---
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OutboxDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailId(id);
    setDetail(null);
    try {
      setDetailLoading(true);
      const j = await fetcher(`/api/admin/notifications/outbox/${id}`);
      setDetail(j);
    } catch (e: any) {
      showErrorToast(e?.message || '상세 불러오기 실패');
    } finally {
      setDetailLoading(false);
    }
  };

  const doRetry = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/admin/notifications/outbox/${id}/retry`, { method: 'POST', credentials: 'include' });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || '재시도 실패');
        }
        showSuccessToast('재시도 요청을 처리했습니다.');
        await mutate();
      } catch (e: any) {
        showErrorToast(e?.message || '재시도 실패');
      }
    },
    [mutate]
  );

  const doForce = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/admin/notifications/outbox/${id}/force`, { method: 'POST', credentials: 'include' });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || '강제 발송 실패');
        }
        showSuccessToast('강제 발송을 시도했습니다.');
        await mutate();
      } catch (e: any) {
        showErrorToast(e?.message || '강제 발송 실패');
      }
    },
    [mutate]
  );

  // --- UI ---
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>알림 Outbox</CardTitle>
          <CardDescription>queued / failed / sent 상태의 알림 작업을 조회하고, 실패/대기 건을 재시도할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
              <TabsList>
                <TabsTrigger value="all">전체</TabsTrigger>
                <TabsTrigger value="queued">대기(queued)</TabsTrigger>
                <TabsTrigger value="failed">실패(failed)</TabsTrigger>
                <TabsTrigger value="sent">완료(sent)</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-[320px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={qRaw} onChange={(e) => setQRaw(e.target.value)} placeholder="이벤트/수신자/제목/내용 검색" className="pl-8" />
              </div>
              <Button variant="outline" onClick={() => mutate()} disabled={isValidating}>
                {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                새로고침
              </Button>
            </div>
          </div>

          {error ? <div className="text-sm text-red-600">{String((error as any)?.message || error)}</div> : null}

          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">생성</th>
                  <th className="px-3 py-2 text-left font-medium">상태</th>
                  <th className="px-3 py-2 text-left font-medium">이벤트</th>
                  <th className="px-3 py-2 text-left font-medium">수신</th>
                  <th className="px-3 py-2 text-left font-medium">채널</th>
                  <th className="px-3 py-2 text-right font-medium">retry</th>
                  <th className="px-3 py-2 text-left font-medium">오류</th>
                  <th className="px-3 py-2 text-right font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((it) => (
                    <tr key={it.id} className="border-t hover:bg-slate-50/60">
                      <td className="px-3 py-2 whitespace-nowrap">{formatIsoToKstShort(it.createdAt)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge variant={it.status === 'failed' ? 'destructive' : it.status === 'queued' ? 'secondary' : 'outline'} className={cn(it.status === 'sent' && 'text-emerald-600 border-emerald-200')}>
                          {it.status}
                        </Badge>
                        {it.sentAt ? <div className="mt-1 text-xs text-muted-foreground">sent: {formatIsoToKstShort(it.sentAt)}</div> : null}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{it.eventType}</div>
                        <div className="text-xs text-muted-foreground">{it.applicationId ? `app: ${it.applicationId}` : it.orderId ? `order: ${it.orderId}` : ''}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="truncate max-w-[220px]">{it.to ?? '-'}</div>
                        {it.subject ? <div className="truncate max-w-[220px] text-xs text-muted-foreground">{it.subject}</div> : null}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge variant="secondary" className="text-[11px]">
                          {channelsLabel(it.channels)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{it.retries}</td>
                      <td className="px-3 py-2">
                        <div className="truncate max-w-[260px] text-xs text-muted-foreground">{it.error ?? '-'}</div>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => openDetail(it.id)}>
                            상세
                          </Button>

                          {it.status === 'failed' ? (
                            <Button size="sm" variant="destructive" onClick={() => doRetry(it.id)}>
                              <RefreshCcw className="mr-2 h-4 w-4" />
                              재시도
                            </Button>
                          ) : null}

                          {it.status === 'queued' ? (
                            <Button size="sm" onClick={() => doForce(it.id)}>
                              <Send className="mr-2 h-4 w-4" />
                              강제 발송
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              총 {total}건 · {page} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                이전
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                다음
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Outbox 상세</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> 로딩 중...
            </div>
          ) : detail ? (
            <pre className="max-h-[60vh] overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
              {JSON.stringify(
                (() => {
                  // 너무 큰 HTML은 잘라서 보여줌
                  const html = detail?.rendered?.email?.html;
                  if (typeof html === 'string' && html.length > 4000) {
                    return {
                      ...detail,
                      rendered: {
                        ...detail.rendered,
                        email: {
                          ...detail.rendered.email,
                          html: html.slice(0, 4000) + `\n\n... (truncated ${html.length - 4000} chars)`,
                        },
                      },
                    };
                  }
                  return detail;
                })(),
                null,
                2
              )}
            </pre>
          ) : (
            <div className="text-sm text-muted-foreground">선택한 항목이 없습니다.</div>
          )}

          <DialogFooter className="gap-2">
            {detailId && detail?.status === 'failed' ? (
              <Button variant="destructive" onClick={() => doRetry(detailId)}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                재시도
              </Button>
            ) : null}
            {detailId && detail?.status === 'queued' ? (
              <Button onClick={() => doForce(detailId)}>
                <Send className="mr-2 h-4 w-4" />
                강제 발송
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
