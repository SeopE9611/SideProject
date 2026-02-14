'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';

import { ArrowLeft, Copy, Loader2, RefreshCcw, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type { AdminOutboxDetailResponseDto } from '@/types/admin/notifications';

type OutboxDetailViewModel = {
  id: string;
  status?: string;
  eventType?: string;
  channels: Array<{ channel?: string; to?: string; rendered?: { subject?: string; text?: string; html?: string } }>;
  payload: Record<string, unknown>;
  meta: Record<string, unknown>;
  error: string | null;
  retries: number;
  createdAt: string | null;
  updatedAt: string | null;
  sentAt: string | null;
  lastTriedAt: string | null;
  relatedOrderId: string | null;
  relatedApplicationId: string | null;
};


function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
}

function getNestedString(root: Record<string, unknown>, path: string[]): string | null {
  let current: unknown = root;
  for (const key of path) {
    const rec = asRecord(current);
    current = rec[key];
  }
  return typeof current === 'string' && current ? current : null;
}

function mapApiToViewModel(data: AdminOutboxDetailResponseDto | undefined, id: string): OutboxDetailViewModel | null {
  if (!data) return null;

  const payload = asRecord(data.payload);
  const meta = asRecord(data.meta);
  const renderedRecord = asRecord(data.rendered);
  const emailRendered = asRecord(renderedRecord.email);

  const channels = Array.isArray(data.channels) && data.channels.length > 0
    ? data.channels
    : [
        {
          channel: data.channel ?? 'email',
          to: data.to,
          rendered: {
            subject: typeof emailRendered.subject === 'string' ? emailRendered.subject : data.subject,
            text: typeof emailRendered.text === 'string' ? emailRendered.text : undefined,
            html: typeof emailRendered.html === 'string' ? emailRendered.html : undefined,
          },
        },
      ];

  return {
    id: data.id ?? id,
    status: data.status,
    eventType: data.eventType,
    channels,
    payload,
    meta,
    error: typeof data.error === 'string' ? data.error : null,
    retries: Number(data.retries ?? 0),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    sentAt: data.sentAt ?? null,
    lastTriedAt: data.lastTriedAt ?? null,
    relatedOrderId: getNestedString(meta, ['orderId']) ?? getNestedString(payload, ['orderId']) ?? getNestedString(payload, ['data', 'orderId']),
    relatedApplicationId: getNestedString(meta, ['applicationId']) ?? getNestedString(payload, ['applicationId']) ?? getNestedString(payload, ['data', 'applicationId']),
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return res.json();
};

function safeFmt(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR');
}

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? 'unknown';
  const cls =
    s === 'failed'
      ? 'bg-red-100 text-red-800 border-red-200'
      : s === 'sent'
      ? 'bg-green-100 text-green-800 border-green-200'
      : s === 'queued'
      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
      : s === 'processing'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-muted text-muted-foreground border-border/40';

  return <Badge className={`border ${cls}`}>{s}</Badge>;
}

export default function OutboxDetailClient({ id }: { id: string }) {
  const { data, error, isLoading, mutate } = useSWR<AdminOutboxDetailResponseDto>(id ? `/api/admin/notifications/outbox/${id}` : null, fetcher, { revalidateOnFocus: false });

  const [busy, setBusy] = useState<'retry' | 'force' | null>(null);

  const vm = useMemo(() => mapApiToViewModel(data, id), [data, id]);
  const channels = vm?.channels ?? [];
  const first = channels[0];
  const firstHtml = first?.rendered?.html;
  const firstText = first?.rendered?.text;
  const firstSubject = first?.rendered?.subject;

  const relatedOrderId = vm?.relatedOrderId ?? null;
  const relatedApplicationId = vm?.relatedApplicationId ?? null;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showSuccessToast('복사 완료');
    } catch {
      showErrorToast('복사 실패 (브라우저 권한을 확인하세요)');
    }
  }

  async function post(url: string, label: string) {
    try {
      const res = await fetch(url, { method: 'POST' });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) {
        showErrorToast(json?.error || `${label} 실패`);
        return;
      }
      showSuccessToast(label);
      await mutate();
    } catch {
      showErrorToast(`${label} 실패`);
    }
  }

  async function doRetry() {
    setBusy('retry');
    await post(`/api/admin/notifications/outbox/${id}/retry`, '재시도 큐로 이동');
    setBusy(null);
  }

  async function doForce() {
    setBusy('force');
    await post(`/api/admin/notifications/outbox/${id}/force`, '강제 발송 실행');
    setBusy(null);
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6 space-y-4">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="border-border/40">
            <Link href="/admin/notifications" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              목록으로
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <StatusBadge status={vm?.status} />
            {vm?.eventType && <Badge className="border border-border/40 bg-muted text-muted-foreground">{vm.eventType}</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-border/40 gap-2" disabled={!id} onClick={() => copy(id)}>
            <Copy className="h-4 w-4" />
            ID 복사
          </Button>

          <Button className="gap-2" disabled={busy !== null || !vm || vm.status !== 'failed'} onClick={doRetry}>
            {busy === 'retry' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            재시도
          </Button>

          <Button className="gap-2" disabled={busy !== null || !vm || vm.status !== 'queued'} onClick={doForce}>
            {busy === 'force' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            강제 발송
          </Button>
        </div>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          )}

          {error && <div className="text-sm text-red-600">상세 로드 실패: {error instanceof Error ? error.message : String(error)}</div>}

          {vm && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">상태</span>
                <StatusBadge status={vm.status} />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">이벤트</span>
                <span className="font-medium">{vm.eventType ?? '-'}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">생성</span>
                <span className="font-medium">{safeFmt(vm.createdAt)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">업데이트</span>
                <span className="font-medium">{safeFmt(vm.updatedAt)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">마지막 시도</span>
                <span className="font-medium">{safeFmt(vm.lastTriedAt)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">발송 완료</span>
                <span className="font-medium">{safeFmt(vm.sentAt)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">재시도 횟수</span>
                <span className="font-medium">{vm.retries}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">수신자(첫 채널)</span>
                <span className="font-medium">{first?.to ?? '-'}</span>
              </div>

              <div className="flex items-center justify-between gap-3 md:col-span-2">
                <span className="text-muted-foreground">제목(첫 채널)</span>
                <span className="font-medium truncate">{firstSubject ?? '-'}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 연결된 대상 */}
      {(relatedOrderId || relatedApplicationId) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">연결된 대상</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            {relatedOrderId && (
              <Button asChild variant="outline" className="border-border/40">
                <Link href={`/admin/orders/${String(relatedOrderId)}`}>주문 상세로 이동 (#{String(relatedOrderId).slice(-6)})</Link>
              </Button>
            )}
            {relatedApplicationId && (
              <Button asChild variant="outline" className="border-border/40">
                <Link href={`/admin/applications/stringing/${String(relatedApplicationId)}`}>신청서 상세로 이동 (#{String(relatedApplicationId).slice(-6)})</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 실패 원인 */}
      {vm?.error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-700">실패 원인</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <pre className="whitespace-pre-wrap break-words rounded-md bg-red-50 p-3 border border-red-100">{vm.error}</pre>
          </CardContent>
        </Card>
      )}

      {/* 상세 탭 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">상세</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="rendered" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="rendered">렌더링</TabsTrigger>
              <TabsTrigger value="payload">payload</TabsTrigger>
              <TabsTrigger value="raw">raw</TabsTrigger>
            </TabsList>

            <TabsContent value="rendered" className="space-y-4">
              {channels.length === 0 ? (
                <div className="text-sm text-muted-foreground">렌더링 데이터가 없습니다.</div>
              ) : (
                channels.map((ch, idx) => {
                  const html = ch?.rendered?.html;
                  const text = ch?.rendered?.text;
                  const subject = ch?.rendered?.subject;

                  return (
                    <div key={`${idx}-${ch?.channel}-${ch?.to}`} className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className="border border-border/40 bg-muted text-muted-foreground">{ch?.channel ?? 'channel'}</Badge>
                          <span className="text-sm font-medium">{ch?.to ?? '-'}</span>
                        </div>

                        <Button size="sm" variant="outline" className="border-border/40 gap-2" onClick={() => copy(JSON.stringify(ch?.rendered ?? {}, null, 2))}>
                          <Copy className="h-4 w-4" />
                          렌더링 복사
                        </Button>
                      </div>

                      {subject && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">제목:</span> <span className="font-medium">{subject}</span>
                        </div>
                      )}

                      <Separator />

                      <div className="space-y-2">
                        <div className="text-sm font-medium">HTML</div>
                        {html ? <iframe title={`html-preview-${idx}`} srcDoc={html} sandbox="" className="h-[520px] w-full rounded-md border border-border/40 bg-white" /> : <div className="text-sm text-muted-foreground">HTML 없음</div>}
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">TEXT</div>
                        {text ? <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 border border-border/40 text-sm">{text}</pre> : <div className="text-sm text-muted-foreground">TEXT 없음</div>}
                      </div>

                      {idx < channels.length - 1 && <Separator className="my-4" />}
                    </div>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="payload" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">payload</div>
                <Button size="sm" variant="outline" className="border-border/40 gap-2" disabled={!data?.payload} onClick={() => copy(JSON.stringify(data?.payload ?? {}, null, 2))}>
                  <Copy className="h-4 w-4" />
                  payload 복사
                </Button>
              </div>

              <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 border border-border/40 text-sm">{JSON.stringify(data?.payload ?? {}, null, 2)}</pre>
            </TabsContent>

            <TabsContent value="raw" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">raw</div>
                <Button size="sm" variant="outline" className="border-border/40 gap-2" disabled={!data} onClick={() => copy(JSON.stringify(data ?? {}, null, 2))}>
                  <Copy className="h-4 w-4" />
                  raw 복사
                </Button>
              </div>

              <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 border border-border/40 text-sm">{JSON.stringify(data ?? {}, null, 2)}</pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
