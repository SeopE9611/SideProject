'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, RefreshCcw, ShieldAlert, CheckCircle2, XCircle, ExternalLink, MessageSquare, ThumbsUp, BarChart3, FileText, AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { buildAdminBoardDetailUrl, buildBoardPublicUrl } from '@/lib/board-public-url-policy';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

type PostItem = {
  id: string;
  type: string;
  postNo: number | null;
  title: string;
  nickname: string;
  status: 'public' | 'hidden';
  createdAt: string;
  views: number;
  likes: number;
  commentsCount: number;
};

type ReportItem = {
  id: string;
  targetType: 'post' | 'comment';
  boardType: string;
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  reporterNickname: string;
  reporterDisplay?: string;
  createdAt: string;
  resolvedAt: string | null;
  post: { id: string | null; title: string; postNo: number | null; status: string } | null;
  comment: { id: string | null; content: string; nickname: string; status: string } | null;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text().catch(() => 'Request failed'));
  return res.json();
};

const boardLabel: Record<string, string> = {
  notice: '공지',
  qna: 'Q&A',
  free: '자유',
  gear: '장비',
  market: '중고',
  hot: '인기',
  brand: '브랜드',
};

/**
 * 레거시 게시판 타입 별칭 맵.
 * - 서버/DB에 과거 데이터(brands)가 남아 있어도 관리자 화면 텍스트/배지가 깨지지 않도록 임시 유지한다.
 * - 신규 타입 표준은 brand이며, 필터 옵션 등 신규 입력은 brand만 노출한다.
 */
const legacyBoardTypeAlias: Record<string, string> = {
  brands: 'brand',
};

/**
 * 화면 표기 전용 게시판 타입 정규화.
 * - 관리자 목록/신고 목록 badge 라벨 조회 시 사용한다.
 * - API 전송 타입까지 강제 치환하지 않고, 표시 계층에서만 별칭 호환을 보장한다.
 */
function resolveBoardLabel(type: string) {
  const nextType = legacyBoardTypeAlias[type] ?? type;
  return boardLabel[nextType] ?? type;
}

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString('ko-KR');
  } catch {
    return dt;
  }
}

const LIMIT = 20;

function getBoardLinkBlockedReason(reason: 'missing_type_route' | 'private_post' | 'missing_identifier' | null, hasAdminFallback: boolean) {
  if (reason === 'private_post') {
    return hasAdminFallback ? '비공개/숨김 게시글은 공개 페이지로 이동할 수 없어 관리자 상세로 대체됩니다.' : '비공개/숨김 게시글은 공개 페이지로 이동할 수 없습니다.';
  }

  if (reason === 'missing_type_route') {
    return hasAdminFallback ? '게시판 타입 라우팅 규칙이 없어 관리자 상세로 대체됩니다.' : '게시판 타입 라우팅 규칙이 없어 링크를 열 수 없습니다.';
  }

  if (reason === 'missing_identifier') {
    return hasAdminFallback ? '공개 URL 식별자(postNo)가 없어 관리자 상세로 대체됩니다.' : '공개 URL 식별자(postNo)가 없어 링크를 열 수 없습니다.';
  }

  return hasAdminFallback ? '공개 URL 생성 실패로 관리자 상세로 대체됩니다.' : '링크를 생성할 수 없습니다.';
}

export default function BoardsClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const tab = sp.get('tab') === 'reports' ? 'reports' : 'posts';

  // 게시글 필터
  const [postType, setPostType] = useState<string>('all');
  const [postStatus, setPostStatus] = useState<string>('all');
  const [postQ, setPostQ] = useState<string>('');
  const [postPage, setPostPage] = useState<number>(1);

  // 신고 필터
  const [reportType, setReportType] = useState<string>('all');
  const [reportStatus, setReportStatus] = useState<string>('pending');
  const [reportQ, setReportQ] = useState<string>('');
  const [reportPage, setReportPage] = useState<number>(1);

  const postsUrl = useMemo(() => {
    const qs = new URLSearchParams({
      page: String(postPage),
      limit: String(LIMIT),
      type: postType,
      status: postStatus,
      q: postQ,
      sort: 'createdAt',
      dir: 'desc',
    });
    return `/api/admin/community/posts?${qs.toString()}`;
  }, [postPage, postType, postStatus, postQ]);

  const reportsUrl = useMemo(() => {
    const qs = new URLSearchParams({
      page: String(reportPage),
      limit: String(LIMIT),
      boardType: reportType,
      status: reportStatus,
      q: reportQ,
    });
    return `/api/admin/community/reports?${qs.toString()}`;
  }, [reportPage, reportType, reportStatus, reportQ]);

  const { data: postsData, error: postsErr, isLoading: postsLoading, mutate: mutatePosts } = useSWR(tab === 'posts' ? postsUrl : null, fetcher);

  const { data: reportsData, error: reportsErr, isLoading: reportsLoading, mutate: mutateReports } = useSWR(tab === 'reports' ? reportsUrl : null, fetcher);

  const posts: PostItem[] = (postsData?.items ?? []).map((item: any) => {
    // 서버 스키마 정합성: views/likes/commentsCount 실필드만 사용
    const views = Number(item?.views ?? 0);
    const likes = Number(item?.likes ?? 0);
    const commentsCount = Number(item?.commentsCount ?? 0);

    return {
      ...item,
      views: Number.isFinite(views) ? views : 0,
      likes: Number.isFinite(likes) ? likes : 0,
      commentsCount: Number.isFinite(commentsCount) ? commentsCount : 0,
    } as PostItem;
  });
  const postsTotal: number = postsData?.total ?? 0;
  const postsTotalPages = Math.max(1, Math.ceil(postsTotal / LIMIT));

  const reports: ReportItem[] = reportsData?.items ?? [];
  const reportsTotal: number = reportsData?.total ?? 0;
  const reportsTotalPages = Math.max(1, Math.ceil(reportsTotal / LIMIT));

  const switchTab = (next: 'posts' | 'reports') => {
    const qs = new URLSearchParams(sp.toString());
    if (next === 'reports') qs.set('tab', 'reports');
    else qs.delete('tab');
    router.replace(`/admin/boards?${qs.toString()}`);
  };

  const togglePostVisibility = async (p: PostItem) => {
    try {
      const next = p.status === 'public' ? 'hidden' : 'public';
      const res = await fetch(`/api/admin/community/posts/${p.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      showSuccessToast(next === 'hidden' ? '게시글을 숨김 처리했습니다.' : '게시글을 공개 처리했습니다.');
      mutatePosts();
    } catch (e: any) {
      showErrorToast(e?.message ?? '상태 변경 실패');
    }
  };

  const processReport = async (r: ReportItem, action: 'resolve' | 'reject' | 'resolve_hide_target') => {
    try {
      const res = await fetch(`/api/admin/community/reports/${r.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(await res.text());
      showSuccessToast('신고 처리가 완료되었습니다.');
      mutateReports();
      // 대상 숨김까지 했다면 게시글 목록도 최신화하는 게 안전
      mutatePosts();
    } catch (e: any) {
      showErrorToast(e?.message ?? '신고 처리 실패');
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
      <div className="grid gap-5 md:grid-cols-4">
        <Card className="border-border/40 bg-card/50 backdrop-blur hover:border-border/60 transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">전체 게시글</p>
                <p className="text-2xl font-bold">{postsTotal.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur hover:border-border/60 transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                <Eye className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">공개 게시글</p>
                <p className="text-2xl font-bold">{posts.filter((p) => p.status === 'public').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur hover:border-border/60 transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive">
                <AlertTriangle className="h-6 w-6 text-destructive-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">대기 중 신고</p>
                <p className="text-2xl font-bold">{reports.filter((r) => r.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur hover:border-border/60 transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <EyeOff className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">숨김 게시글</p>
                <p className="text-2xl font-bold">{posts.filter((p) => p.status === 'hidden').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 bg-card/50 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle className="text-2xl">게시판 관리</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">커뮤니티 게시글 및 신고 관리</p>
          </div>

          <Tabs value={tab} onValueChange={(v) => switchTab(v as any)}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="posts" className="gap-2">
                <FileText className="h-4 w-4" />
                게시글
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <ShieldAlert className="h-4 w-4" />
                신고
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          {tab === 'posts' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-border/40 bg-muted/30">
                <Select value={postType} onValueChange={(v) => (setPostPage(1), setPostType(v))}>
                  <SelectTrigger className="w-[140px] bg-background/50">
                    <SelectValue placeholder="게시판" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {Object.keys(boardLabel).map((k) => (
                      <SelectItem key={k} value={k}>
                        {boardLabel[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={postStatus} onValueChange={(v) => (setPostPage(1), setPostStatus(v))}>
                  <SelectTrigger className="w-[140px] bg-background/50">
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="public">공개</SelectItem>
                    <SelectItem value="hidden">숨김</SelectItem>
                  </SelectContent>
                </Select>

                <Input value={postQ} onChange={(e) => setPostQ(e.target.value)} placeholder="제목/작성자/내용 검색" className="w-[260px] bg-background/50" />

                <Button variant="outline" onClick={() => (setPostPage(1), mutatePosts())} className="gap-2">
                  <RefreshCcw className="h-4 w-4" />
                </Button>

                <div className="ml-auto text-sm font-medium">총 {postsTotal.toLocaleString()}건</div>
              </div>

              {postsLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              )}

              {postsErr && <div className="p-4 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm">게시글 목록 로드 실패: {(postsErr as any)?.message ?? 'error'}</div>}

              {!postsLoading && !postsErr && (
                <>
                  <div className="space-y-3">
                    {posts.map((p) => (
                      <Card key={p.id} className="group border-border/40 bg-background/50 backdrop-blur hover:border-border/60 hover:shadow-md transition-all duration-200">
                        <CardContent className="p-5">
                          {/**
                           * 게시글 카드 링크 생성 규칙
                           * 1) 공개 라우트 생성 시 외부 게시판 URL 사용
                           * 2) 실패 시 관리자 내부 상세(/admin/boards/[id])로 fallback
                           * 3) fallback도 없으면 링크 비활성화 + 사유 툴팁
                           */}
                          {(() => {
                            const publicLink = buildBoardPublicUrl({ type: p.type, id: p.id, postNo: p.postNo, status: p.status });
                            const fallbackLink = buildAdminBoardDetailUrl({ id: p.id });
                            const href = publicLink.ok ? publicLink.url : fallbackLink;
                            const linkBlockedReason = publicLink.ok ? null : publicLink.reason;
                            const tooltipMessage = linkBlockedReason ? getBoardLinkBlockedReason(linkBlockedReason, Boolean(fallbackLink)) : null;

                            return (
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="font-medium">
                                  {resolveBoardLabel(p.type)}
                                </Badge>
                                <span className="text-sm text-muted-foreground">#{p.postNo ?? '-'}</span>
                                {p.status === 'public' ? (
                                  <Badge className="bg-primary/10 text-primary border-border">공개</Badge>
                                ) : (
                                  <Badge className="bg-muted text-primary border-border">숨김</Badge>
                                )}
                              </div>

                                  {href ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Link href={href} className="block group/link" target="_blank" rel="noopener noreferrer">
                                          <h3 className="text-base font-semibold group-hover/link:text-primary transition-colors inline-flex items-center gap-2">
                                            {p.title}
                                            <ExternalLink className="h-4 w-4 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                          </h3>
                                        </Link>
                                      </TooltipTrigger>
                                      {tooltipMessage && <TooltipContent>{tooltipMessage}</TooltipContent>}
                                    </Tooltip>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex cursor-not-allowed items-center gap-2 text-base font-semibold text-muted-foreground/80" aria-disabled="true">
                                          {p.title}
                                          <ExternalLink className="h-4 w-4 opacity-60" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>{getBoardLinkBlockedReason(linkBlockedReason, false)}</TooltipContent>
                                    </Tooltip>
                                  )}

                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="font-medium">{p.nickname || '-'}</span>
                                <span>{fmt(p.createdAt)}</span>
                              </div>

                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1.5">
                                  <BarChart3 className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{p.views}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <ThumbsUp className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{p.likes}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <MessageSquare className="h-4 w-4 text-foreground" />
                                  <span className="font-medium">{p.commentsCount}</span>
                                </div>
                              </div>
                                </div>

                                <Button variant="outline" size="sm" onClick={() => togglePostVisibility(p)} className="gap-2 shrink-0">
                              {p.status === 'public' ? (
                                <>
                                  <EyeOff className="h-4 w-4" />
                                  숨김
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4" />
                                  공개
                                </>
                              )}
                                </Button>
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    ))}

                    {posts.length === 0 && (
                      <Card className="border-dashed border-border/40">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                          <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                          <p className="text-sm text-muted-foreground">표시할 게시글이 없습니다.</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {posts.length > 0 && (
                    <div className="flex flex-col items-center justify-between gap-3 border-t border-border/40 pt-5 sm:flex-row">
                      <div className="text-sm text-muted-foreground">
                        총 <span className="font-semibold text-foreground">{postsTotal}</span>건 · 페이지 <span className="font-semibold text-foreground">{postPage}</span> / {postsTotalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPostPage((p) => Math.max(1, p - 1))} disabled={postPage <= 1} className="border-border/40 hover:border-border/60">
                          이전
                        </Button>
                        <div className="flex h-9 items-center rounded-md border border-border/40 bg-background/50 px-3 text-sm font-medium">{postPage}</div>
                        <Button variant="outline" size="sm" onClick={() => setPostPage((p) => Math.min(postsTotalPages, p + 1))} disabled={postPage >= postsTotalPages} className="border-border/40 hover:border-border/60">
                          다음
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'reports' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-border/40 bg-muted/30">
                <Select value={reportType} onValueChange={(v) => (setReportPage(1), setReportType(v))}>
                  <SelectTrigger className="w-[140px] bg-background/50">
                    <SelectValue placeholder="게시판" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {Object.keys(boardLabel).map((k) => (
                      <SelectItem key={k} value={k}>
                        {boardLabel[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={reportStatus} onValueChange={(v) => (setReportPage(1), setReportStatus(v))}>
                  <SelectTrigger className="w-[140px] bg-background/50">
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">대기</SelectItem>
                    <SelectItem value="resolved">완료</SelectItem>
                    <SelectItem value="rejected">반려</SelectItem>
                    <SelectItem value="all">전체</SelectItem>
                  </SelectContent>
                </Select>

                <Input value={reportQ} onChange={(e) => setReportQ(e.target.value)} placeholder="사유/신고자 검색" className="w-[260px] bg-background/50" />

                <Button variant="outline" onClick={() => (setReportPage(1), mutateReports())} className="gap-2">
                  <RefreshCcw className="h-4 w-4" />
                </Button>

                <div className="ml-auto text-sm font-medium">총 {reportsTotal.toLocaleString()}건</div>
              </div>

              {reportsLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              )}

              {reportsErr && <div className="p-4 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm">신고 목록 로드 실패: {(reportsErr as any)?.message ?? 'error'}</div>}

              {!reportsLoading && !reportsErr && (
                <>
                  <div className="space-y-3">
                    {reports.map((r) => {
                      const isPending = r.status === 'pending';
                      // 신고 대상 링크는 공개 URL 우선, 실패 시 관리자 상세 fallback 규칙을 동일 적용한다.
                      const publicLink = buildBoardPublicUrl({
                        type: r.boardType,
                        id: r.post?.id,
                        postNo: r.post?.postNo,
                        status: r.post?.status,
                      });
                      const fallbackLink = buildAdminBoardDetailUrl({ id: r.post?.id });
                      const postHref = publicLink.ok ? publicLink.url : fallbackLink;
                      const postLinkReason = publicLink.ok ? null : publicLink.reason;

                      return (
                        <Card
                          key={r.id}
                          className={`group border-border/40 bg-background/50 backdrop-blur hover:border-border/60 hover:shadow-md transition-all duration-200 ${
                            isPending ? 'border-warning/50 bg-warning/10' : ''
                          }`}
                        >
                          <CardContent className="p-5">
                            <div className="space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {r.targetType === 'post' ? (
                                      <Badge className="bg-muted text-foreground border-border">게시글</Badge>
                                    ) : (
                                      <Badge className="bg-muted text-primary border-border">댓글</Badge>
                                    )}
                                    <Badge variant="outline" className="font-medium">
                                      {resolveBoardLabel(r.boardType)}
                                    </Badge>
                                    {r.status === 'pending' && <Badge variant="warning">대기</Badge>}
                                    {r.status === 'resolved' && <Badge variant="success">완료</Badge>}
                                    {r.status === 'rejected' && <Badge variant="destructive">반려</Badge>}
                                  </div>

                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">신고 사유</p>
                                    <p className="text-base font-medium">{r.reason}</p>
                                  </div>

                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">신고 대상</p>
                                    {postHref ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Link href={postHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-base hover:text-primary transition-colors group/link">
                                            {r.post?.title ?? '(제목 없음)'}
                                            <ExternalLink className="h-4 w-4 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                          </Link>
                                        </TooltipTrigger>
                                        {postLinkReason && <TooltipContent>{getBoardLinkBlockedReason(postLinkReason, Boolean(fallbackLink))}</TooltipContent>}
                                      </Tooltip>
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex cursor-not-allowed items-center gap-2 text-base text-muted-foreground" aria-disabled="true">
                                            {r.post?.title ?? '(대상 글 정보 없음)'}
                                            <ExternalLink className="h-4 w-4 opacity-60" />
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>{getBoardLinkBlockedReason(postLinkReason, false)}</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                                    <span>
                                      신고자: <span className="font-medium">{r.reporterDisplay || r.reporterNickname || '-'}</span>
                                    </span>
                                    <span>{fmt(r.createdAt)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                                <Button size="sm" variant="outline" disabled={!isPending} onClick={() => processReport(r, 'resolve')} className="gap-2">
                                  <CheckCircle2 className="h-4 w-4" />
                                  완료
                                </Button>

                                <Button size="sm" variant="outline" disabled={!isPending} onClick={() => processReport(r, 'reject')} className="gap-2">
                                  <XCircle className="h-4 w-4" />
                                  반려
                                </Button>

                                <Button size="sm" disabled={!isPending} onClick={() => processReport(r, 'resolve_hide_target')} className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                  <ShieldAlert className="h-4 w-4" />
                                  대상 숨김 + 완료
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {reports.length === 0 && (
                      <Card className="border-dashed border-border/40">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                          <ShieldAlert className="h-12 w-12 text-muted-foreground/50 mb-3" />
                          <p className="text-sm text-muted-foreground">표시할 신고가 없습니다.</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {reports.length > 0 && (
                    <div className="flex flex-col items-center justify-between gap-3 border-t border-border/40 pt-5 sm:flex-row">
                      <div className="text-sm text-muted-foreground">
                        총 <span className="font-semibold text-foreground">{reportsTotal}</span>건 · 페이지 <span className="font-semibold text-foreground">{reportPage}</span> / {reportsTotalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setReportPage((p) => Math.max(1, p - 1))} disabled={reportPage <= 1} className="border-border/40 hover:border-border/60">
                          이전
                        </Button>
                        <div className="flex h-9 items-center rounded-md border border-border/40 bg-background/50 px-3 text-sm font-medium">{reportPage}</div>
                        <Button variant="outline" size="sm" onClick={() => setReportPage((p) => Math.min(reportsTotalPages, p + 1))} disabled={reportPage >= reportsTotalPages} className="border-border/40 hover:border-border/60">
                          다음
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </TooltipProvider>
  );
}
