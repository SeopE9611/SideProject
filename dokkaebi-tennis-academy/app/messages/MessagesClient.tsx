'use client';

import { useMemo, useState } from 'react';
import { mutate as globalMutate } from 'swr';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { showErrorToast } from '@/lib/toast';
import { useMessageList } from '@/lib/hooks/useMessageList';
import { useMessageDetail } from '@/lib/hooks/useMessageDetail';
import MessageComposeDialog from '@/app/messages/_components/MessageComposeDialog';
import AdminBroadcastDialog from '@/app/messages/_components/AdminBroadcastDialog';

type SafeUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin' | string;
};

const LIMIT = 20;

function formatKST(iso: string) {
  try {
    return new Date(iso).toLocaleString('ko-KR');
  } catch {
    return iso;
  }
}

function buildReplyTitle(title: string) {
  const t = (title ?? '').trim();
  if (!t) return 'RE:';
  if (t.toLowerCase().startsWith('re:')) return t;
  return `RE: ${t}`;
}

function buildQuotedBody(opts: { createdAt: string; fromName: string; toName: string; body: string }) {
  const { createdAt, fromName, toName, body } = opts;

  return ['', '', '---', `[원문] ${formatKST(createdAt)} · ${fromName} → ${toName}`, body ?? ''].join('\n');
}

export default function MessagesClient({ user }: { user: SafeUser }) {
  const [tab, setTab] = useState<'inbox' | 'send' | 'admin'>('inbox');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 답장 모달
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyToUserId, setReplyToUserId] = useState<string>('');
  const [replyToName, setReplyToName] = useState<string>('');
  const [replyDefaultTitle, setReplyDefaultTitle] = useState<string>('');
  const [replyDefaultBody, setReplyDefaultBody] = useState<string>('');

  // 관리자 전체발송 모달
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const { items, total, isLoading, mutate, key } = useMessageList(tab, page, LIMIT, true);
  const { item: detail, isLoading: detailLoading } = useMessageDetail(selectedId, true);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total]);

  // 상세를 열면 GET /api/messages/[id]에서 readAt이 세팅될 수 있으므로
  // - 현재 탭 목록 갱신
  // - 상단 unread-count도 갱신
  async function afterOpenDetail() {
    if (key) await mutate(); // 현재 목록 리프레시
    await globalMutate('/api/messages/unread-count'); // 상단 N 뱃지 갱신
  }

  function openReply() {
    if (!detail) return;

    const toUserId = tab === 'send' ? detail.toUserId : detail.fromUserId;
    const toName = tab === 'send' ? detail.toName : detail.fromName;

    if (!toUserId) return showErrorToast('답장할 수 없는 쪽지입니다.');

    setReplyToUserId(String(toUserId));
    setReplyToName(String(toName ?? '회원'));
    setReplyDefaultTitle(buildReplyTitle(detail.title));
    setReplyDefaultBody(
      buildQuotedBody({
        createdAt: detail.createdAt,
        fromName: detail.fromName,
        toName: detail.toName,
        body: detail.body,
      })
    );

    setReplyOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">쪽지함</CardTitle>

          {user.role === 'admin' && (
            <Button variant="outline" onClick={() => setBroadcastOpen(true)}>
              전체 공지 보내기
            </Button>
          )}
        </CardHeader>

        <CardContent>
          <Tabs
            value={tab}
            onValueChange={(v) => {
              const next = v as typeof tab;
              setTab(next);
              setPage(1);
              setSelectedId(null);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inbox">받은쪽지</TabsTrigger>
              <TabsTrigger value="send">보낸쪽지</TabsTrigger>
              <TabsTrigger value="admin">관리자쪽지</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* 왼쪽: 목록 */}
                <div className="md:col-span-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-muted-foreground">
                      총 {total}개 · {page}/{totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => {
                          setPage((p) => Math.max(1, p - 1));
                          setSelectedId(null);
                        }}
                      >
                        이전
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => {
                          setPage((p) => Math.min(totalPages, p + 1));
                          setSelectedId(null);
                        }}
                      >
                        다음
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {isLoading && (
                      <>
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </>
                    )}

                    {!isLoading && items.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center border rounded-md">아직 쪽지가 없습니다.</div>}

                    {!isLoading &&
                      items.map((m) => {
                        const active = selectedId === m.id;
                        const counterpart = tab === 'send' ? m.toName : m.fromName;

                        return (
                          <button
                            key={m.id}
                            className={cn('w-full text-left border rounded-md p-3 hover:bg-accent/40 transition', active && 'border-primary bg-accent/40')}
                            onClick={async () => {
                              setSelectedId(m.id);
                              // 상세 열기 직후(읽음 처리 가능) 후처리
                              // detail fetch는 SWR이 자동으로 돌지만, unread-count 갱신은 우리가 해줌
                              setTimeout(afterOpenDetail, 250);
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className={cn('text-sm truncate', !m.isRead && tab !== 'send' && 'font-semibold')}>{m.title || '(제목 없음)'}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {counterpart} · {formatKST(m.createdAt)}
                                </div>
                              </div>

                              {/* 미열람 표시(받은/관리자 탭에서만 의미 있음) */}
                              {tab !== 'send' && !m.isRead && <span className="shrink-0 rounded-full bg-red-500 text-white text-[10px] leading-none px-2 py-[2px]">N</span>}
                            </div>

                            <div className="mt-2 text-xs text-muted-foreground line-clamp-2">{m.snippet}</div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* 오른쪽: 상세 */}
                <div className="md:col-span-7">
                  <div className="border rounded-md p-4 min-h-[240px]">
                    {!selectedId && <div className="text-sm text-muted-foreground text-center py-10">왼쪽에서 쪽지를 선택하면 상세 내용을 볼 수 있습니다.</div>}

                    {selectedId && detailLoading && (
                      <div className="space-y-3">
                        <Skeleton className="h-6 w-2/3" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-24 w-full" />
                      </div>
                    )}

                    {selectedId && !detailLoading && !detail && <div className="text-sm text-muted-foreground text-center py-10">쪽지를 불러오지 못했습니다.</div>}

                    {detail && (
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-base font-semibold break-words">{detail.title || '(제목 없음)'}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {tab === 'send' ? `받는 사람: ${detail.toName}` : `보낸 사람: ${detail.fromName}`}
                              {' · '}
                              {formatKST(detail.createdAt)}
                              {tab !== 'send' && (
                                <>
                                  {' · '}
                                  {detail.readAt ? '읽음' : '미열람'}
                                </>
                              )}
                            </div>
                          </div>

                          {/* 다시 보내기 버튼을 만들지 전달버튼을 만들지 고민 */}
                          {/* <Button variant="outline" size="sm" onClick={openReply}>
                            답장
                          </Button> */}
                        </div>

                        <div className="whitespace-pre-wrap text-sm leading-6">{detail.body}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 답장 모달 */}
      <MessageComposeDialog
        open={replyOpen}
        onOpenChange={setReplyOpen}
        toUserId={replyToUserId}
        toName={replyToName}
        defaultTitle={replyDefaultTitle}
        defaultBody={replyDefaultBody}
        onSent={async () => {
          // 답장 전송 후 - 보낸쪽지함 갱신(현재 탭과 무관하게 최신 반영)
          await globalMutate((k) => typeof k === 'string' && k.startsWith('/api/messages/send'));
        }}
      />

      {/* 관리자 전체발송 모달 */}
      {user.role === 'admin' && <AdminBroadcastDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} />}
    </div>
  );
}
