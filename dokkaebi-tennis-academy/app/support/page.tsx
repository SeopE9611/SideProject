'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Bell, LifeBuoy, ArrowRight, Plus, Eye, HelpCircle, MessagesSquare, Lock } from 'lucide-react';
import { badgeBaseOutlined, badgeSizeSm, getQnaCategoryColor, getAnswerStatusColor, getNoticeCategoryColor, noticePinColor } from '@/lib/badge-style';
import { useState } from 'react';

// ---------------------- 공통 유틸 ----------------------

type NoticeItem = {
  _id: string;
  title: string;
  createdAt: string | Date;
  viewCount?: number;
  isPinned?: boolean;
  category?: string | null;
};

type QnaItem = {
  _id: string;
  title: string;
  createdAt: string | Date;
  category?: string | null;
  authorName?: string | null;
  authorId?: string | null;
  isSecret?: boolean;
  answer?: any;
  viewCount?: number;
};

type BoardsMainRes = { ok?: boolean; notices?: NoticeItem[]; qna?: QnaItem[] };
type MeRes = { id?: string; role?: string };

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  const data = (await res.json().catch(() => null)) as any;

  if (!res.ok) {
    const message = typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : `${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return data as T;
}

async function fetcherAllow401<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { credentials: 'include' });
  const data = (await res.json().catch(() => null)) as any;

  // 비로그인(401)은 '에러'가 아니라 '로그인 안 됨' 상태로 취급
  if (res.status === 401) return null;

  if (!res.ok) {
    const message = typeof data === 'object' && data !== null && typeof (data as { error: string }).error === 'string' ? (data as { error: string }).error : `${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return data as T;
}
const fmt = (v: string | Date) => new Date(v).toLocaleDateString();

function FiveLineSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border-b border-border dark:border-border last:border-0 pb-4 last:pb-0">
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex items-center space-x-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorBox({ message = '데이터를 불러오는 중 오류가 발생했습니다.' }) {
  return <div className="rounded-md border border-destructive bg-destructive px-3 py-2 text-sm text-destructive">{message}</div>;
}

// ---------------------- 공지 카드 ----------------------

function NoticeCard({ items, isAdmin, isLoading, error }: { items: NoticeItem[]; isAdmin?: boolean; isLoading?: boolean; error?: any }) {
  return (
    <Card className="border-0 bg-card/90 dark:bg-card shadow-xl backdrop-blur-sm h-full">
      <CardHeader className="bg-gradient-to-r from-background to-card dark:from-background dark:to-card border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <span className="font-semibold">공지사항</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button asChild size="sm" variant="ghost" className="h-8 px-3 border-border dark:border-border">
                <Link href="/board/notice/write">
                  <Plus className="h-4 w-4 mr-1" />
                  공지 쓰기
                </Link>
              </Button>
            )}
            <Button asChild size="sm" variant="ghost" className="h-8 px-3">
              <Link href="/board/notice">
                전체보기
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {error ? (
            <ErrorBox message="공지 불러오기에 실패했습니다." />
          ) : isLoading ? (
            <FiveLineSkeleton />
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">등록된 공지가 없습니다.</div>
          ) : (
            items.map((notice) => (
              <div key={notice._id} className="border-b border-border dark:border-border last:border-0 pb-4 last:pb-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* 제목 줄 */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {!!notice.category && (
                          <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getNoticeCategoryColor(notice.category)} shrink-0`} title={notice.category ?? undefined}>
                            {notice.category}
                          </Badge>
                        )}

                        {notice.isPinned && (
                          <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${noticePinColor} shrink-0`}>
                            고정
                          </Badge>
                        )}

                        {/* 말줄임 제목 (부모 flex-1 + min-w-0 중요) */}
                        <Link href={`/board/notice/${notice._id}`} className="font-semibold text-foreground dark:text-white hover:text-primary dark:hover:text-primary transition-colors flex-1 min-w-0 truncate">
                          {notice.title}
                        </Link>
                      </div>
                    </div>

                    {/* 메타 정보 */}
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground dark:text-muted-foreground">
                      <span>{fmt(notice.createdAt)}</span>
                      <span className="flex items-center">
                        <Eye className="h-3 w-3 mr-1" />
                        {notice.viewCount ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------- Q&A 카드 ----------------------

function QnaCard({ items, viewerId, isAdmin, isLoading, error }: { items: QnaItem[]; viewerId?: string | null; isAdmin?: boolean; isLoading?: boolean; error?: any }) {
  const [secretBlock, setSecretBlock] = useState<{ open: boolean; item?: QnaItem }>({ open: false });

  return (
    <Card className="border-0 bg-card/90 dark:bg-card shadow-xl backdrop-blur-sm h-full">
      <CardHeader className="bg-gradient-to-r from-background to-card dark:from-background dark:to-card border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-success" />
            <span className="font-semibold">Q&amp;A</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="h-8 px-3">
              <Link href="/board/qna/write">
                <Plus className="h-4 w-4 mr-1" />
                질문하기
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-8 px-3">
              <Link href="/board/qna">
                전체보기
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Dialog open={secretBlock.open} onOpenChange={(open) => setSecretBlock((p) => ({ ...p, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                비밀글 열람 안내
              </DialogTitle>
              <DialogDescription className="space-y-2">
                <span className="block">
                  이 글은 <b>비밀글</b>로 설정되어 있어 <b>작성자와 관리자만</b> 확인할 수 있습니다.
                </span>
                <span className="block">관리자 답변이 달려도 공개되지 않습니다.</span>
                {!viewerId ? <span className="block">작성자라면 로그인 후 확인해 주세요.</span> : <span className="block">현재 계정으로는 열람 권한이 없습니다.</span>}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSecretBlock({ open: false })}>
                닫기
              </Button>
              {!viewerId && secretBlock.item?._id && (
                <Button asChild className="bg-gradient-to-r from-background to-card hover:from-background hover:to-card">
                  <Link href={`/login?next=${encodeURIComponent(`/board/qna/${secretBlock.item._id}`)}`}>로그인하고 확인</Link>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="space-y-4">
          {error ? (
            <ErrorBox message="Q&A 불러오기에 실패했습니다." />
          ) : isLoading ? (
            <FiveLineSkeleton />
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">등록된 문의가 없습니다.</div>
          ) : (
            items.map((qna) => {
              const canOpenSecret = !qna.isSecret || !!isAdmin || (viewerId && qna.authorId && viewerId === qna.authorId);

              const RowInner = (
                <div className="border-b border-border dark:border-border last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* 제목 줄 */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getQnaCategoryColor(qna.category ?? undefined)} shrink-0`} title={qna.category ?? undefined}>
                            {qna.category ?? '일반문의'}
                          </Badge>

                          {qna.isSecret && (
                            <Badge variant="secondary" className="text-xs inline-flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              비밀글
                            </Badge>
                          )}

                          <span className="font-semibold text-foreground dark:text-white flex-1 min-w-0 truncate">{qna.title}</span>
                        </div>

                        {/* 답변완료/대기 뱃지는 그대로 유지 */}
                        <div className="shrink-0">
                          <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getAnswerStatusColor(!!qna.answer)}`} title={qna.answer ? '답변 완료' : '답변 대기'}>
                            {qna.answer ? '답변 완료' : '답변 대기'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-muted-foreground dark:text-muted-foreground">
                        <span>{qna.authorName ?? '익명'}</span>
                        <span>{fmt(qna.createdAt)}</span>
                        <span className="flex items-center">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          답변 {qna.answer ? 1 : 0}개
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
              // 비밀글 + 권한 없음: 상세로 안 보내고 모달로 1차 차단
              if (qna.isSecret && !canOpenSecret) {
                return (
                  <button key={qna._id} type="button" className="block w-full text-left" onClick={() => setSecretBlock({ open: true, item: qna })}>
                    {RowInner}
                  </button>
                );
              }

              // 권한 있거나 일반글: 상세로 이동
              return (
                <Link key={qna._id} href={`/board/qna/${qna._id}`} className="block">
                  {RowInner}
                </Link>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------- 페이지 컴포넌트 ----------------------

export default function SupportPage() {
  // 공지/Q&A 묶어서 가져오는 기존 API 재사용
  const { data, error, isLoading } = useSWR<BoardsMainRes>('/api/boards/main', fetcher);
  const notices = data?.notices ?? [];
  const qnas = data?.qna ?? [];

  // 관리자 여부 확인 (공지 쓰기 버튼 제어)
  const { data: me } = useSWR<MeRes | null>('/api/users/me', fetcherAllow401, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });
  const isAdmin = me?.role === 'admin';
  const viewerId = me?.id ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-background to-card shadow-lg">
              <MessagesSquare className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground dark:text-white">고객센터</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground dark:text-muted-foreground max-w-xl mx-auto">공지사항과 문의 내역을 한 곳에서 확인하고, 궁금한 점을 남겨주세요.</p>
        </div>

        {/* 카드 2열 레이아웃 */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-start">
          <NoticeCard items={notices} isAdmin={isAdmin} isLoading={isLoading} error={error} />
          <QnaCard items={qnas} viewerId={viewerId} isAdmin={isAdmin} isLoading={isLoading} error={error} />
        </div>
      </div>
    </div>
  );
}
