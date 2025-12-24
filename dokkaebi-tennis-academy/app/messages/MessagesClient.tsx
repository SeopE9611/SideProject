'use client';

import { useMemo, useState } from 'react';
import { mutate as globalMutate } from 'swr';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useMessageList } from '@/lib/hooks/useMessageList';
import { useMessageDetail } from '@/lib/hooks/useMessageDetail';
import MessageComposeDialog from '@/app/messages/_components/MessageComposeDialog';
import AdminBroadcastDialog from '@/app/messages/_components/AdminBroadcastDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Mail, MailOpen, Send, User, Clock, ChevronLeft, ChevronRight, Reply, Trash2, Bell } from 'lucide-react';

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

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyToUserId, setReplyToUserId] = useState<string>('');
  const [replyToName, setReplyToName] = useState<string>('');
  const [replyDefaultTitle, setReplyDefaultTitle] = useState<string>('');
  const [replyDefaultBody, setReplyDefaultBody] = useState<string>('');

  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { items, total, isLoading, mutate, key } = useMessageList(tab, page, LIMIT, true);
  const { item: detail, isLoading: detailLoading } = useMessageDetail(selectedId, true);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total]);

  async function afterOpenDetail() {
    if (key) await mutate();
    await globalMutate('/api/messages/unread-count');
  }

  async function deleteSelectedMessage() {
    if (!detail) return;

    try {
      setIsDeleting(true);

      const res = await fetch(`/api/messages/${detail.id}`, { method: 'DELETE' });
      const data = (await res.json().catch(() => null)) as any;

      if (!res.ok || !data?.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : '삭제에 실패했습니다.');
      }

      showSuccessToast('쪽지를 삭제했습니다.');
      setDeleteOpen(false);
      setSelectedId(null);

      if (key) await mutate();
      await globalMutate('/api/messages/unread-count');
      await globalMutate((k) => typeof k === 'string' && k.startsWith('/api/messages/send'));
    } catch (e: any) {
      showErrorToast(e?.message || '삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
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
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <Card className="shadow-lg border-border/40">
        <CardHeader className="border-b border-border/40 bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">쪽지함</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">메시지를 확인하고 관리하세요</p>
              </div>
            </div>

            {user.role === 'admin' && (
              <Button variant="default" onClick={() => setBroadcastOpen(true)} className="gap-2">
                <Bell className="h-4 w-4" />
                전체 공지 보내기
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
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
            <TabsList className="grid w-full max-w-md grid-cols-3 mb-6 bg-muted/50">
              <TabsTrigger value="inbox" className="gap-2">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">받은쪽지</span>
                <span className="sm:hidden">받은</span>
              </TabsTrigger>
              <TabsTrigger value="send" className="gap-2">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">보낸쪽지</span>
                <span className="sm:hidden">보낸</span>
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">관리자</span>
                <span className="sm:hidden">관리</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
                    <div className="text-sm font-medium text-muted-foreground">
                      총 <span className="text-foreground font-semibold">{total}</span>개
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {page} / {totalPages}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => {
                            setPage((p) => Math.max(1, p - 1));
                            setSelectedId(null);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() => {
                            setPage((p) => Math.min(totalPages, p + 1));
                            setSelectedId(null);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {isLoading && (
                      <>
                        <Skeleton className="h-24 w-full rounded-lg" />
                        <Skeleton className="h-24 w-full rounded-lg" />
                        <Skeleton className="h-24 w-full rounded-lg" />
                      </>
                    )}

                    {!isLoading && items.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center border border-border/30 rounded-lg bg-muted/20">
                        <Mail className="h-12 w-12 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">아직 쪽지가 없습니다.</p>
                      </div>
                    )}

                    {!isLoading &&
                      items.map((m) => {
                        const active = selectedId === m.id;
                        const counterpart = tab === 'send' ? m.toName : m.fromName;
                        const isUnread = tab !== 'send' && !m.isRead;

                        return (
                          <button
                            key={m.id}
                            className={cn('w-full text-left border border-border/30 rounded-lg p-4 transition-all hover:shadow-md hover:border-primary/30', active && 'border-primary/40 bg-primary/5 shadow-md', !active && 'hover:bg-accent/30')}
                            onClick={async () => {
                              setSelectedId(m.id);
                              setTimeout(afterOpenDetail, 250);
                            }}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className={cn('mt-0.5 shrink-0', isUnread && 'text-primary', !isUnread && 'text-muted-foreground')}>{isUnread ? <Mail className="h-5 w-5" /> : <MailOpen className="h-5 w-5" />}</div>

                                <div className="min-w-0 flex-1">
                                  <div className={cn('text-sm truncate leading-tight', isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>{m.title || '(제목 없음)'}</div>

                                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span className="truncate max-w-[100px]">{counterpart}</span>
                                    </div>
                                    <span>·</span>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span className="whitespace-nowrap">{formatKST(m.createdAt)}</span>
                                    </div>
                                  </div>

                                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{m.snippet}</p>
                                </div>
                              </div>

                              {isUnread && <span className="shrink-0 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-none px-2 py-1">NEW</span>}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="border border-border/30 rounded-lg min-h-[400px] bg-card">
                    {!selectedId && (
                      <div className="flex flex-col items-center justify-center h-[400px] text-center p-8">
                        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                          <Mail className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          왼쪽에서 쪽지를 선택하면
                          <br />
                          상세 내용을 볼 수 있습니다.
                        </p>
                      </div>
                    )}

                    {selectedId && detailLoading && (
                      <div className="p-6 space-y-4">
                        <Skeleton className="h-7 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="pt-4 border-t">
                          <Skeleton className="h-32 w-full" />
                        </div>
                      </div>
                    )}

                    {selectedId && !detailLoading && !detail && (
                      <div className="flex items-center justify-center h-[400px] text-center p-8">
                        <p className="text-sm text-muted-foreground">쪽지를 불러오지 못했습니다.</p>
                      </div>
                    )}

                    {detail && (
                      <div className="p-6">
                        <div className="pb-4 border-b border-border/40">
                          <h2 className="text-xl font-semibold text-foreground leading-tight mb-3">{detail.title || '(제목 없음)'}</h2>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{tab === 'send' ? `받는 사람: ${detail.toName}` : `보낸 사람: ${detail.fromName}`}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{formatKST(detail.createdAt)}</span>
                                {tab !== 'send' && (
                                  <>
                                    <span>·</span>
                                    <span className={cn(detail.readAt ? 'text-muted-foreground' : 'text-primary font-medium')}>{detail.readAt ? '읽음' : '미열람'}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {tab !== 'send' && (
                                <Button variant="outline" size="sm" onClick={openReply} className="gap-2 bg-transparent">
                                  <Reply className="h-4 w-4" />
                                  답장
                                </Button>
                              )}

                              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50">
                                <Trash2 className="h-4 w-4" />
                                삭제
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="pt-6">
                          <div className="prose prose-sm max-w-none">
                            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{detail.body}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <MessageComposeDialog
        open={replyOpen}
        onOpenChange={setReplyOpen}
        toUserId={replyToUserId}
        toName={replyToName}
        defaultTitle={replyDefaultTitle}
        defaultBody={replyDefaultBody}
        onSent={async () => {
          await globalMutate((k) => typeof k === 'string' && k.startsWith('/api/messages/send'));
        }}
      />

      {user.role === 'admin' && <AdminBroadcastDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} />}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>쪽지를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제한 쪽지는 현재 탭(받은/보낸/관리자)에서 보이지 않게 됩니다.
              <br />
              상대방 쪽지함에는 영향을 주지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void deleteSelectedMessage();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? '삭제 중…' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
