'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Bell, LifeBuoy, ArrowRight, Plus, Eye, HelpCircle, MessagesSquare, Lock, ImageIcon, Paperclip, Pin } from 'lucide-react';
import { badgeBaseOutlined, badgeSizeSm, getQnaCategoryBadgeSpec, getAnswerStatusBadgeSpec, getNoticeCategoryBadgeSpec } from '@/lib/badge-style';
import { useState } from 'react';

// ---------------------- 공통 유틸 ----------------------

type NoticeItem = {
  _id: string;
  title: string;
  createdAt: string | Date;
  viewCount?: number;
  isPinned?: boolean;
  category?: string | null;
  hasImage?: boolean;
  hasFile?: boolean;
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
  hasImage?: boolean;
  hasFile?: boolean;
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
const fmt = (v: string | Date) =>
  new Date(v)
    .toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\.\s/g, '.')
    .replace(/\.$/, '');
const supportMobileTitleClampClass = 'flex-1 min-w-0 line-clamp-2 text-sm font-semibold leading-snug sm:line-clamp-1 sm:text-base';
const supportMobileMetaWrapClass = 'flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-muted-foreground';
const supportMobileActionBadgeWrapClass = 'w-full shrink-0 sm:w-auto';

function FiveLineSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border-b border-border last:border-0 pb-4 last:pb-0">
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
  return <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:bg-destructive/15">{message}</div>;
}

// ---------------------- 공지 카드 ----------------------

function NoticeCard({ items, isAdmin, isLoading, error }: { items: NoticeItem[]; isAdmin?: boolean; isLoading?: boolean; error?: any }) {
  const supportQuery = 'from=support&returnTo=%2Fsupport';
  return (
    <Card className="border-0 bg-card/90 dark:bg-card shadow-xl backdrop-blur-sm h-full">
      <CardHeader className="bg-muted/30 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <span className="font-semibold">공지사항</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Button asChild size="sm" variant="ghost" className="h-8 px-3 border-border">
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
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          {error ? (
            <ErrorBox message="공지 불러오기에 실패했습니다." />
          ) : isLoading ? (
            <FiveLineSkeleton />
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">등록된 공지가 없습니다.</p>
              <p className="mt-1 text-xs text-muted-foreground">새 소식이 등록되면 이곳에서 바로 확인할 수 있어요.</p>
              <div className="mt-3">
                <Button asChild variant="outline" size="sm">
                  <Link href="/board/notice">공지 전체보기</Link>
                </Button>
              </div>
            </div>
          ) : (
            items.map((notice) => (
              <div key={notice._id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* 제목 줄 */}
                    <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {!!notice.category && (
                          <Badge variant={getNoticeCategoryBadgeSpec(notice.category).variant} className={`${badgeBaseOutlined} ${badgeSizeSm} shrink-0`} title={notice.category ?? undefined}>
                            {notice.category}
                          </Badge>
                        )}

                        {notice.isPinned && (
                          <Badge variant="brand" className={`${badgeBaseOutlined} ${badgeSizeSm} shrink-0`} title="고정 공지" aria-label="고정 공지">
                            <Pin className="h-3 w-3" />
                          </Badge>
                        )}

                        {/* 말줄임 제목 (부모 flex-1 + min-w-0 중요) */}
                        <Link href={`/board/notice/${notice._id}?${supportQuery}`} className={`${supportMobileTitleClampClass} text-foreground transition-colors hover:text-primary dark:hover:text-primary`}>
                          {notice.title}
                        </Link>
                      </div>
                    </div>

                    {/* 메타 정보 */}
                    <div className={supportMobileMetaWrapClass}>
                      <span>{fmt(notice.createdAt)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {notice.viewCount ?? 0}
                      </span>
                      {(notice.hasImage || notice.hasFile) && (
                        <span className="flex items-center gap-1.5" aria-label="첨부 정보">
                          {notice.hasImage && (<span title="이미지 첨부" aria-label="이미지 첨부"><ImageIcon className="h-3.5 w-3.5" aria-hidden="true" /></span>)}
                          {notice.hasFile && (<span title="첨부파일 있음" aria-label="첨부파일 있음"><Paperclip className="h-3.5 w-3.5" aria-hidden="true" /></span>)}
                        </span>
                      )}
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
  const supportQuery = 'from=support&returnTo=%2Fsupport';

  return (
    <Card className="border-0 bg-card/90 dark:bg-card shadow-xl backdrop-blur-sm h-full">
      <CardHeader className="bg-muted/30 border-b">
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
      <CardContent className="p-4 md:p-6">
        <Dialog open={secretBlock.open} onOpenChange={(open) => setSecretBlock((p) => ({ ...p, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                비밀글 열람 안내
              </DialogTitle>
              <DialogDescription className="space-y-2">
                <span className="block">
                  이 문의는 <b>비밀글</b>로 등록되어 <b>작성자와 관리자만</b> 확인할 수 있습니다.
                </span>
                {!viewerId ? <span className="block">작성자 계정이라면 로그인 후 다시 확인해 주세요.</span> : <span className="block">현재 계정으로는 이 문의를 열람할 수 없습니다.</span>}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-wrap gap-2 sm:justify-end">
              <Button variant="outline" asChild>
                <Link href="/board/qna">목록으로 돌아가기</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/support">고객센터 홈</Link>
              </Button>
              {!viewerId && secretBlock.item?._id && (
                <Button asChild>
                  <Link href={`/login?next=${encodeURIComponent(`/board/qna/${secretBlock.item._id}?${supportQuery}`)}`}>로그인하고 확인</Link>
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
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">등록된 문의가 없습니다.</p>
              <p className="mt-1 text-xs text-muted-foreground">궁금한 점이 있다면 첫 문의를 남겨주세요.</p>
              <div className="mt-3">
                <Button asChild size="sm">
                  <Link href="/board/qna/write">문의하기</Link>
                </Button>
              </div>
            </div>
          ) : (
            items.map((qna) => {
              const canOpenSecret = !qna.isSecret || !!isAdmin || (viewerId && qna.authorId && viewerId === qna.authorId);

              const RowInner = (
                <div className="border-b border-border last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* 제목 줄 */}
                      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <Badge variant={getQnaCategoryBadgeSpec(qna.category ?? undefined).variant} className={`${badgeBaseOutlined} ${badgeSizeSm} shrink-0`} title={qna.category ?? undefined}>
                            {qna.category ?? '일반문의'}
                          </Badge>

                          {qna.isSecret && (
                            <Badge variant="secondary" className="text-xs inline-flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              비밀글
                            </Badge>
                          )}

                          <span className={`${supportMobileTitleClampClass} text-foreground`}>{qna.title}</span>
                        </div>

                        {/* 답변완료/대기 뱃지는 그대로 유지 */}
                        <div className={supportMobileActionBadgeWrapClass}>
                          <Badge variant={getAnswerStatusBadgeSpec(!!qna.answer).variant} className={`${badgeBaseOutlined} ${badgeSizeSm}`} title={qna.answer ? '답변 완료' : '답변 대기'}>
                            {qna.answer ? '답변 완료' : '답변 대기'}
                          </Badge>
                        </div>
                      </div>

                      <div className={supportMobileMetaWrapClass}>
                        <span>{qna.authorName ?? '익명'}</span>
                        <span>{fmt(qna.createdAt)}</span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          답변 {qna.answer ? 1 : 0}개
                        </span>
                        {(qna.hasImage || qna.hasFile) && (
                          <span className="flex items-center gap-1.5" aria-label="첨부 정보">
                            {qna.hasImage && (<span title="이미지 첨부" aria-label="이미지 첨부"><ImageIcon className="h-3.5 w-3.5" aria-hidden="true" /></span>)}
                            {qna.hasFile && (<span title="첨부파일 있음" aria-label="첨부파일 있음"><Paperclip className="h-3.5 w-3.5" aria-hidden="true" /></span>)}
                          </span>
                        )}
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
                <Link key={qna._id} href={`/board/qna/${qna._id}?${supportQuery}`} className="block">
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
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-3 md:space-y-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30 shadow-lg">
              <MessagesSquare className="h-6 w-6 text-foreground" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">고객센터</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">공지사항과 문의 내역을 한 곳에서 확인하고, 궁금한 점을 남겨주세요.</p>
        </div>

        {/* 카드 2열 레이아웃 */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-8 items-start">
          <NoticeCard items={notices} isAdmin={isAdmin} isLoading={isLoading} error={error} />
          <QnaCard items={qnas} viewerId={viewerId} isAdmin={isAdmin} isLoading={isLoading} error={error} />
        </div>
      </div>
    </div>
  );
}
