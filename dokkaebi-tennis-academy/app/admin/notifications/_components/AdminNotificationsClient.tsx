'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCcw, Send, Search, Mail, Clock, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import type { AdminOutboxDetailResponseDto, AdminOutboxListItemDto, AdminOutboxListResponseDto } from '@/types/admin/notifications';

type Status = 'all' | 'queued' | 'failed' | 'sent';

type OutboxItem = AdminOutboxListItemDto;
type PageRes = AdminOutboxListResponseDto;
type OutboxDetail = AdminOutboxDetailResponseDto;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

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
  // Invalid Date 방어 (getTime()이 NaN이면 잘못된 날짜)
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  // 브라우저 로컬(KST) 기준 표기
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function channelsLabel(chs: OutboxItem['channels']) {
  const arr = chs ?? [];
  if (!arr.length) return '-';
  return arr.join(', ');
}

function getStatusIcon(status: OutboxItem['status']) {
  switch (status) {
    case 'sent':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'queued':
      return <Clock className="h-4 w-4" />;
    case 'failed':
      return <XCircle className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
}

export default function AdminNotificationsClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const spStr = sp.toString();

  const pathname = usePathname();

  const initialStatus = (sp.get('status') || 'all') as Status;
  const initialQ = sp.get('q') || '';
  const initialPage = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);

  const [status, setStatus] = useState<Status>(['all', 'queued', 'failed', 'sent'].includes(initialStatus) ? initialStatus : 'all');
  const [qRaw, setQRaw] = useState(initialQ);
  const qDebounced = useDebounced(qRaw, 350);
  const [page, setPage] = useState(initialPage);

  useEffect(() => {
    setPage(1);
  }, [status, qRaw]);

  useEffect(() => {
    const basePath = pathname || '/admin/notifications/outbox';
    const p = new URLSearchParams(sp.toString());
    if (status === 'all') p.delete('status');
    else p.set('status', status);

    const q = qRaw.trim();
    if (!q) p.delete('q');
    else p.set('q', q);

    if (page <= 1) p.delete('page');
    else p.set('page', String(page));

    const qs = p.toString();
    const nextUrl = qs ? `${basePath}?${qs}` : basePath;

    if (qs !== spStr) {
      router.replace(nextUrl);
    }
  }, [status, qRaw, page, pathname, router, spStr]);

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
    } catch (error: unknown) {
      showErrorToast(getErrorMessage(error, '상세 불러오기 실패'));
    } finally {
      setDetailLoading(false);
    }
  };

  const doRetry = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/admin/notifications/outbox/${id}/retry`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || '재시도 실패');
        }
        showSuccessToast('재시도 요청을 처리했습니다.');
        await mutate();
      } catch (error: unknown) {
        showErrorToast(getErrorMessage(error, '재시도 실패'));
      }
    },
    [mutate]
  );

  const doForce = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/admin/notifications/outbox/${id}/force`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || '강제 발송 실패');
        }
        showSuccessToast('강제 발송을 시도했습니다.');
        await mutate();
      } catch (error: unknown) {
        showErrorToast(getErrorMessage(error, '강제 발송 실패'));
      }
    },
    [mutate]
  );

  const stats = useMemo(() => {
    if (!data?.items) return { queued: 0, failed: 0, sent: 0 };
    return {
      queued: data.items.filter((item) => item.status === 'queued').length,
      failed: data.items.filter((item) => item.status === 'failed').length,
      sent: data.items.filter((item) => item.status === 'sent').length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">알림 관리</h1>
        <p className="text-sm text-muted-foreground">알림 발송 현황을 모니터링하고 실패한 알림을 재시도할 수 있습니다</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="border-border/40 bg-card/50 backdrop-blur transition-all hover:border-border/60 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">대기 중</p>
                <p className="mt-2 text-3xl font-bold">{stats.queued}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur transition-all hover:border-border/60 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">실패</p>
                <p className="mt-2 text-3xl font-bold">{stats.failed}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur transition-all hover:border-border/60 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">발송 완료</p>
                <p className="mt-2 text-3xl font-bold">{stats.sent}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>알림 Outbox</CardTitle>
              <CardDescription>알림 발송 작업 내역을 조회하고 관리합니다</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={status} onValueChange={(v) => setStatus(v as Status)} className="w-full lg:w-auto">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto">
                <TabsTrigger value="all" className="gap-2">
                  전체
                  {status === 'all' && (
                    <Badge variant="secondary" className="ml-1">
                      {total}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="queued" className="gap-2">
                  대기
                  {status === 'queued' && (
                    <Badge variant="secondary" className="ml-1">
                      {total}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="failed" className="gap-2">
                  실패
                  {status === 'failed' && (
                    <Badge variant="secondary" className="ml-1">
                      {total}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent" className="gap-2">
                  완료
                  {status === 'sent' && (
                    <Badge variant="secondary" className="ml-1">
                      {total}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <div className="relative w-full lg:w-[320px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={qRaw} onChange={(e) => setQRaw(e.target.value)} placeholder="검색..." className="pl-9 border-border/40 bg-background/50 backdrop-blur focus-visible:border-primary/40" />
              </div>
              <Button variant="outline" onClick={() => mutate()} disabled={isValidating} className="border-border/40 hover:border-border/60">
                {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-950/10 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              {getErrorMessage(error, '조회 실패')}
            </div>
          ) : null}

          <div className="space-y-3">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/40 py-12">
                <Mail className="mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">알림 데이터가 없습니다</p>
                <p className="text-xs text-muted-foreground">필터를 조정하거나 새로운 알림을 기다려주세요</p>
              </div>
            ) : (
              rows.map((it) => (
                <Card key={it.id} className="group border-border/40 bg-card/30 backdrop-blur transition-all hover:border-border/60 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      {/* Left side - Status and main info */}
                      <div className="flex flex-1 items-start gap-4">
                        {/* Status indicator */}
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                            it.status === 'sent' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                            it.status === 'queued' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                            it.status === 'failed' && 'bg-red-500/10 text-red-600 dark:text-red-400'
                          )}
                        >
                          {getStatusIcon(it.status)}
                        </div>

                        {/* Main content */}
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold">{it.eventType}</h4>
                            <Badge
                              variant={it.status === 'failed' ? 'destructive' : it.status === 'queued' ? 'secondary' : 'outline'}
                              className={cn('text-xs', it.status === 'sent' && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400')}
                            >
                              {it.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {channelsLabel(it.channels)}
                            </Badge>
                          </div>

                          <div className="grid gap-2 text-sm lg:grid-cols-2">
                            <div>
                              <span className="text-muted-foreground">수신자:</span> <span className="font-medium">{it.to ?? '-'}</span>
                            </div>
                            {it.subject && (
                              <div>
                                <span className="text-muted-foreground">제목:</span> <span className="font-medium">{it.subject}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">생성:</span> <span className="font-medium">{formatIsoToKstShort(it.createdAt)}</span>
                            </div>
                            {it.sentAt && (
                              <div>
                                <span className="text-muted-foreground">발송:</span> <span className="font-medium">{formatIsoToKstShort(it.sentAt)}</span>
                              </div>
                            )}
                            {(it.applicationId || it.orderId) && (
                              <div>
                                <span className="text-muted-foreground">연결:</span> <span className="font-medium">{it.applicationId ? `신청 #${it.applicationId}` : `주문 #${it.orderId}`}</span>
                              </div>
                            )}
                            {it.retries > 0 && (
                              <div>
                                <span className="text-muted-foreground">재시도:</span>{' '}
                                <Badge variant="secondary" className="ml-1">
                                  {it.retries}
                                </Badge>
                              </div>
                            )}
                          </div>

                          {it.error && (
                            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-600 dark:border-red-900/30 dark:bg-red-950/10 dark:text-red-400">
                              <span className="font-medium">오류:</span> {it.error}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col">
                        <Button size="sm" variant="outline" asChild className="border-border/40 hover:border-border/60">
                          <Link href={`/admin/notifications/outbox/${it.id}`}>상세 페이지</Link>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openDetail(it.id)} className="border-border/40 hover:border-border/60">
                          미리보기
                        </Button>

                        {it.status === 'failed' && (
                          <Button size="sm" variant="destructive" onClick={() => doRetry(it.id)} className="gap-2">
                            <RefreshCcw className="h-3.5 w-3.5" />
                            재시도
                          </Button>
                        )}

                        {it.status === 'queued' && (
                          <Button size="sm" onClick={() => doForce(it.id)} className="gap-2">
                            <Send className="h-3.5 w-3.5" />
                            강제 발송
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {rows.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border/40 pt-5 sm:flex-row">
              <div className="text-sm text-muted-foreground">
                총 <span className="font-semibold text-foreground">{total}</span>건 · 페이지 <span className="font-semibold text-foreground">{page}</span> / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="border-border/40 hover:border-border/60">
                  이전
                </Button>
                <div className="flex h-9 items-center rounded-md border border-border/40 bg-background/50 px-3 text-sm font-medium">{page}</div>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="border-border/40 hover:border-border/60">
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl border-border/40 bg-card/95 backdrop-blur">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              알림 상세 정보
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              로딩 중...
            </div>
          ) : detail ? (
            <div className="max-h-[60vh] overflow-auto rounded-lg border border-border/40 bg-slate-950 p-4">
              <pre className="text-xs text-slate-100">
                {JSON.stringify(
                  (() => {
                    const rendered = asRecord(detail.rendered);
                    const email = asRecord(rendered.email);
                    const html = email['html'];
                    if (typeof html === 'string' && html.length > 4000) {
                      return {
                        ...detail,
                        rendered: {
                          ...rendered,
                          email: {
                            ...email,
                            html: html.slice(0, 4000) + `

... (truncated ${html.length - 4000} chars)`,
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
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">선택한 항목이 없습니다.</div>
          )}

          <DialogFooter className="gap-2">
            {detailId && detail?.status === 'failed' && (
              <Button variant="destructive" onClick={() => doRetry(detailId)} className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                재시도
              </Button>
            )}
            {detailId && detail?.status === 'queued' && (
              <Button onClick={() => doForce(detailId)} className="gap-2">
                <Send className="h-4 w-4" />
                강제 발송
              </Button>
            )}
            {detailId && (
              <Button variant="outline" asChild className="border-border/40">
                <Link href={`/admin/notifications/outbox/${detailId}`}>상세 페이지</Link>
              </Button>
            )}

            <Button variant="outline" onClick={() => setDetailOpen(false)} className="border-border/40">
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
