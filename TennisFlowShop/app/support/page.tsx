"use client";

import SupportFaqSearch from "@/app/support/_components/SupportFaqSearch";
import AsyncState from "@/components/system/AsyncState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { badgeBaseOutlined, badgeSizeSm, getAnswerStatusBadgeSpec, getNoticeCategoryBadgeSpec, getQnaCategoryBadgeSpec } from "@/lib/badge-style";
import { Bell, Eye, Gift, Headset, ImageIcon, Lock, MessageSquare, Paperclip, Pin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

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

type BoardsMainRes = {
  ok?: boolean;
  notices?: NoticeItem[];
  events?: NoticeItem[];
  qna?: QnaItem[];
};
type MeRes = { id?: string; role?: string };

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = (await res.json().catch(() => null)) as any;

  if (!res.ok) {
    const message = typeof data === "object" && data !== null && "error" in data && typeof (data as { error?: unknown }).error === "string" ? (data as { error: string }).error : `${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return data as T;
}

async function fetcherAllow401<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { credentials: "include" });
  const data = (await res.json().catch(() => null)) as any;

  // 비로그인(401)은 '에러'가 아니라 '로그인 안 됨' 상태로 취급
  if (res.status === 401) return null;

  if (!res.ok) {
    const message = typeof data === "object" && data !== null && typeof (data as { error: string }).error === "string" ? (data as { error: string }).error : `${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return data as T;
}
const fmt = (v: string | Date) =>
  new Date(v)
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\.\s/g, ".")
    .replace(/\.$/, "");
const supportCardHeaderClass = "flex-row items-center justify-between gap-2 space-y-0 bg-muted/30 border-b p-3 sm:p-4";
const supportCardHeaderTitleClass = "flex min-w-0 items-center gap-2";
const supportCardHeaderActionClass = "flex shrink-0 items-center gap-1";
const supportMobileTitleClampClass = "min-w-0 flex-1 line-clamp-2 text-sm font-semibold leading-snug sm:line-clamp-1 sm:text-base";
const supportMobileMetaWrapClass = "flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-muted-foreground";
const supportMobileActionBadgeWrapClass = "shrink-0 self-start";
const supportQnaInlineTitleClass = "min-w-0 flex-1 line-clamp-2 text-sm font-semibold leading-snug sm:line-clamp-1 sm:text-base";

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

function ErrorBox({ message = "데이터를 불러오는 중 오류가 발생했습니다.", onRetry }: { message?: string; onRetry?: () => void }) {
  return <AsyncState kind="error" variant="inline" title={message} onAction={onRetry} />;
}

// ---------------------- 공지 카드 ----------------------

function NoticeCard({ items, isAdmin, isLoading, error, onRetry, mode = "notice" }: { items: NoticeItem[]; isAdmin?: boolean; isLoading?: boolean; error?: any; onRetry?: () => void; mode?: "notice" | "event" }) {
  const supportQuery = "from=support&returnTo=%2Fsupport";
  const isEventMode = mode === "event";
  const basePath = isEventMode ? "/board/event" : "/board/notice";
  const writePath = isEventMode ? "/board/event/write" : "/board/notice/write";
  const cardTitle = isEventMode ? "이벤트" : "고객센터 공지사항";
  const writeLabel = isEventMode ? "글 쓰기" : "글 쓰기";
  const listLabel = "전체 보기";
  const emptyTitle = isEventMode ? "등록된 이벤트가 없습니다." : "등록된 공지가 없습니다.";
  const emptyDescription = isEventMode ? "새로운 이벤트가 등록되면 이곳에 표시됩니다." : "새 소식이 등록되면 이곳에서 바로 확인할 수 있어요.";
  const shouldShowEventHint = isEventMode && items.length > 0 && items.length < 3;
  const HeaderIcon = isEventMode ? Gift : Bell;
  const loadErrorMessage = isEventMode ? "이벤트 불러오기에 실패했습니다." : "공지 불러오기에 실패했습니다.";
  const pinnedLabel = isEventMode ? "고정 이벤트" : "고정 공지";
  return (
    <Card className="border border-border bg-card shadow-sm h-full">
      <CardHeader className={supportCardHeaderClass}>
        <CardTitle className={supportCardHeaderTitleClass}>
          <HeaderIcon className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 truncate text-base font-semibold leading-tight break-keep sm:text-lg">{cardTitle}</span>
        </CardTitle>
        <div className={supportCardHeaderActionClass}>
          {isAdmin && (
            <Button asChild size="sm" variant="ghost" className="h-8 px-2.5 text-xs border-border whitespace-nowrap">
              <Link href={writePath} aria-label={writeLabel} title={writeLabel}>
                <span className="lg:hidden" aria-hidden="true">
                  +
                </span>
                <span className="hidden lg:inline">+ {writeLabel}</span>
              </Link>
            </Button>
          )}
          <Button asChild size="sm" variant="ghost" className="h-8 px-2.5 text-xs whitespace-nowrap">
            <Link href={basePath} aria-label={listLabel} title={listLabel}>
              <span className="lg:hidden" aria-hidden="true">
                →
              </span>
              <span className="hidden lg:inline">{listLabel} →</span>
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          {error ? (
            <ErrorBox message={loadErrorMessage} onRetry={onRetry} />
          ) : isLoading ? (
            <FiveLineSkeleton />
          ) : items.length === 0 ? (
            <AsyncState kind="empty" variant="card" title={emptyTitle} description={emptyDescription} />
          ) : (
            <>
              {items.map((notice) => (
                <div key={notice._id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* 제목 줄 */}
                      <div className="mb-1 flex min-w-0 items-start gap-2">
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5 pt-0.5">
                          {!!notice.category && (
                            <Badge variant={getNoticeCategoryBadgeSpec(notice.category).variant} className={`${badgeBaseOutlined} ${badgeSizeSm}`} title={notice.category ?? undefined}>
                              {notice.category}
                            </Badge>
                          )}

                          {notice.isPinned && (
                            <Badge variant="brand" className={`${badgeBaseOutlined} ${badgeSizeSm}`} title={pinnedLabel} aria-label={pinnedLabel}>
                              <Pin className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>

                        {/* 말줄임 제목 (부모 flex-1 + min-w-0 중요) */}
                        <Link href={`${basePath}/${notice._id}?${supportQuery}`} className={`${supportMobileTitleClampClass} text-foreground transition-colors hover:text-foreground`} title={notice.title}>
                          {notice.title}
                        </Link>
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
                            {notice.hasImage && (
                              <span title="이미지 첨부" aria-label="이미지 첨부">
                                <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                              </span>
                            )}
                            {notice.hasFile && (
                              <span title="첨부파일 있음" aria-label="첨부파일 있음">
                                <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {shouldShowEventHint && <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">진행 중인 이벤트를 확인해보세요. 새로운 이벤트가 등록되면 이곳에 함께 표시됩니다.</div>}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------- Q&A 카드 ----------------------

function QnaCard({ items, viewerId, isAdmin, isLoading, error, onRetry }: { items: QnaItem[]; viewerId?: string | null; isAdmin?: boolean; isLoading?: boolean; error?: any; onRetry?: () => void }) {
  const [secretBlock, setSecretBlock] = useState<{
    open: boolean;
    item?: QnaItem;
  }>({ open: false });
  const supportQuery = "from=support&returnTo=%2Fsupport";

  return (
    <Card className="border border-border bg-card shadow-sm h-full">
      <CardHeader className={supportCardHeaderClass}>
        <CardTitle className={supportCardHeaderTitleClass}>
          <MessageSquare className="h-4 w-4 shrink-0 text-success" />
          <span className="min-w-0 truncate text-base font-semibold leading-tight break-keep sm:text-lg">Q&amp;A 문의</span>
        </CardTitle>
        <div className={supportCardHeaderActionClass}>
          <Button asChild size="sm" variant="default" className="h-8 px-2.5 text-xs whitespace-nowrap">
            <Link href="/board/qna/write" aria-label="문의하기" title="문의하기">
              <span className="lg:hidden" aria-hidden="true">
                +
              </span>
              <span className="hidden lg:inline">+ 문의하기</span>
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="h-8 px-2.5 text-xs whitespace-nowrap">
            <Link href="/board/qna" aria-label="전체 보기" title="전체 보기">
              <span className="lg:hidden" aria-hidden="true">
                →
              </span>
              <span className="hidden lg:inline">전체 보기 →</span>
            </Link>
          </Button>
        </div>
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
            <ErrorBox message="Q&A 불러오기에 실패했습니다." onRetry={onRetry} />
          ) : isLoading ? (
            <FiveLineSkeleton />
          ) : items.length === 0 ? (
            <AsyncState kind="empty" variant="card" title="등록된 문의가 없습니다." description="궁금한 점이 있다면 첫 문의를 남겨주세요." />
          ) : (
            items.map((qna) => {
              const canOpenSecret = !qna.isSecret || !!isAdmin || (viewerId && qna.authorId && viewerId === qna.authorId);

              const RowInner = (
                <div className="border-b border-border last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* 제목 줄 */}
                      <div className="mb-1 flex items-start gap-2">
                        <div className="flex min-w-0 flex-1 items-start gap-2 overflow-hidden">
                          <Badge variant={getQnaCategoryBadgeSpec(qna.category ?? undefined).variant} className={`${badgeBaseOutlined} ${badgeSizeSm} shrink-0`} title={qna.category ?? undefined}>
                            {qna.category ?? "일반문의"}
                          </Badge>

                          {qna.isSecret && (
                            <Badge variant="secondary" className="shrink-0 text-xs inline-flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              비밀글
                            </Badge>
                          )}

                          <span className={`${supportQnaInlineTitleClass} text-foreground`} title={qna.title}>
                            {qna.title}
                          </span>
                        </div>

                        <div className={supportMobileActionBadgeWrapClass}>
                          <Badge variant={getAnswerStatusBadgeSpec(!!qna.answer).variant} className={`${badgeBaseOutlined} ${badgeSizeSm}`} title={qna.answer ? "답변 완료" : "답변 대기"}>
                            {qna.answer ? "답변 완료" : "답변 대기"}
                          </Badge>
                        </div>
                      </div>

                      <div className={supportMobileMetaWrapClass}>
                        <span>{qna.authorName ?? "익명"}</span>
                        <span>{fmt(qna.createdAt)}</span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          답변 {qna.answer ? 1 : 0}개
                        </span>
                        {(qna.hasImage || qna.hasFile) && (
                          <span className="flex items-center gap-1.5" aria-label="첨부 정보">
                            {qna.hasImage && (
                              <span title="이미지 첨부" aria-label="이미지 첨부">
                                <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                              </span>
                            )}
                            {qna.hasFile && (
                              <span title="첨부파일 있음" aria-label="첨부파일 있음">
                                <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                              </span>
                            )}
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
  const { data, error, isLoading, mutate } = useSWR<BoardsMainRes>("/api/boards/main", fetcher);
  const notices = data?.notices ?? [];
  const events = data?.events ?? [];
  const qnas = data?.qna ?? [];

  // 관리자 여부 확인 (공지 쓰기 버튼 제어)
  const { data: me } = useSWR<MeRes | null>("/api/users/me", fetcherAllow401, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });
  const isAdmin = me?.role === "admin";
  const viewerId = me?.id ?? null;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-3 md:space-y-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30 shadow-lg">
              <Headset className="h-6 w-6 text-foreground" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-normal text-foreground">고객센터</h1>
          </div>
          <p className="mx-auto max-w-2xl break-keep text-sm text-muted-foreground md:text-base">서비스 이용 중 필요한 안내를 확인하고, 궁금한 내용은 Q&amp;A 문의로 남겨주세요.</p>
        </div>

        <SupportFaqSearch />

        {/* 고객센터 하단 카드: 모바일 1열, 중간 폭 2열, 넓은 화면 3열 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 items-start">
          <NoticeCard items={notices} isAdmin={isAdmin} isLoading={isLoading} error={error} onRetry={() => mutate()} />
          <NoticeCard mode="event" items={events} isAdmin={isAdmin} isLoading={isLoading} error={error} onRetry={() => mutate()} />
          <QnaCard items={qnas} viewerId={viewerId} isAdmin={isAdmin} isLoading={isLoading} error={error} onRetry={() => mutate()} />
        </div>
      </div>
    </div>
  );
}
