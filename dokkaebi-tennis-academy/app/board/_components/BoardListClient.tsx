'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { MessageSquare, Plus, Eye, ThumbsUp, ImageIcon, Paperclip } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { CommunityPost } from '@/lib/types/community';
import { attachImageColor, badgeBaseOutlined, badgeSizeSm } from '@/lib/badge-style';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useRouter, useSearchParams } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { showErrorToast } from '@/lib/toast';
import MessageComposeDialog from '@/app/messages/_components/MessageComposeDialog';
import { getCategoryBadgeClass, getCategoryBadgeText } from '@/app/board/_components/board-config';
import type { BoardTypeConfig } from '@/app/board/_components/board-config';
import { boardFetcher, parseApiError } from '@/lib/fetchers/boardFetcher';
import ErrorBox from '@/app/board/_components/ErrorBox';

// API 응답 타입
type ListResponse = {
  ok: boolean;
  version?: string;
  items: CommunityPost[];
  total: number;
  page: number;
  limit: number;
};

const fmtDateTime = (v: string | Date) =>
  new Date(v).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

// 목록 스켈레톤 UI
function ListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="flex items-start justify-between gap-3 border-b border-border pb-4 last:border-0">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BoardListClient({ config }: { config: BoardTypeConfig }) {
  // 페이지 상태
  const [page, setPage] = useState(1);
  const [pageJump, setPageJump] = useState('');

  // 정렬 상태
  const [sort, setSort] = useState<'latest' | 'views' | 'likes'>('latest');

  const { user, loading } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 모달 핸들러
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState<{ id: string; name: string } | null>(null);

  const openCompose = (toUserId: string, toName?: string | null) => {
    if (!user) {
      showErrorToast('로그인 후 이용할 수 있습니다.');
      const redirectTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : config.routePrefix;
      router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
      return;
    }

    const safeName = (toName ?? '').trim() || '회원';

    setComposeTo({ id: toUserId, name: safeName });
    setComposeOpen(true);
  };

  const rawBrandParam = searchParams.get('brand');
  const brandParam = typeof rawBrandParam === 'string' ? rawBrandParam : null;

  const [brand, setBrand] = useState<string>(brandParam ?? '');

  useEffect(() => {
    setBrand(brandParam ?? '');
    setPage(1);
  }, [brandParam]);

  // 사용자의 게시물 검색
  const authorId = searchParams.get('authorId');
  const authorName = searchParams.get('authorName');

  // 검색어 & 검색 타입 (URL 기준)
  const qParam = searchParams.get('q') ?? '';
  const rawSearchType = searchParams.get('searchType');
  const searchTypeParam: 'title' | 'author' | 'title_content' = rawSearchType === 'title' || rawSearchType === 'author' || rawSearchType === 'title_content' ? rawSearchType : 'title_content'; // 기본값: 제목+내용

  // 검색 입력 상태 (폼에서 사용하는 값)
  const [searchText, setSearchText] = useState(qParam);
  const [searchType, setSearchType] = useState<'title' | 'author' | 'title_content'>(searchTypeParam);

  // 카테고리 (URL 기준)
  const rawCategoryParam = searchParams.get('category');
  const categoryParam = rawCategoryParam && config.categoryMap[rawCategoryParam] ? rawCategoryParam : null;

  // UI에서 사용할 카테고리 상태 (전체 포함)
  const [category, setCategory] = useState<string>(categoryParam ?? 'all');

  // authorId 바뀌면 페이지는 1로
  useEffect(() => {
    setPage(1);
  }, [authorId]);

  // URL의 category가 바뀌면 상태도 동기화
  useEffect(() => {
    if (categoryParam) {
      setCategory(categoryParam);
    } else {
      setCategory('all');
    }
    setPage(1);
  }, [categoryParam]);

  // URL 쿼리가 바뀌면 검색 입력값도 동기화
  useEffect(() => {
    setSearchText(qParam);
    setSearchType(searchTypeParam);
  }, [qParam, searchTypeParam]);

  // 카테고리 선택 시 URL 바꾸는 핸들러
  const handleCategoryChange = (next: string) => {
    setPage(1);
    setCategory(next);

    const sp = new URLSearchParams(searchParams.toString());
    if (next === 'all') sp.delete('category');
    else sp.set('category', next);

    // 라켓/스트링이 아니면 brand 제거
    if (!config.brandOptionsByCategory || !config.brandOptionsByCategory[next]) sp.delete('brand');

    router.push(`${config.routePrefix}?${sp.toString()}`);
  };

  // 브랜드 변경 핸들러
  const handleBrandChange = (nextBrand: string) => {
    setPage(1);
    setBrand(nextBrand);

    const sp = new URLSearchParams(searchParams.toString());

    if (!nextBrand) sp.delete('brand');
    else sp.set('brand', nextBrand);

    router.push(`${config.routePrefix}?${sp.toString()}`);
  };

  // 한 페이지당 개수
  const PAGE_LIMIT = 10;

  const qs = new URLSearchParams({
    kind: config.boardType,
    type: config.boardType,
    page: String(page),
    limit: String(PAGE_LIMIT),
    sort,
  });

  if (brandParam && categoryParam && config.brandOptionsByCategory?.[categoryParam]) {
    qs.set('brand', brandParam);
  }

  if (authorId) {
    qs.set('authorId', authorId);
  }

  // 카테고리 필터
  if (categoryParam) {
    qs.set('category', categoryParam);
  }

  // 검색 쿼리 반영
  if (qParam) {
    qs.set('q', qParam);
    qs.set('searchType', searchTypeParam);
  }
  const handleSearchSubmit = (e: any) => {
    e.preventDefault();

    // 현재 URL 쿼리 기준으로 새 파라미터 구성
    const params = new URLSearchParams(searchParams.toString());

    if (searchText.trim()) {
      params.set('q', searchText.trim());
      params.set('searchType', searchType);
    } else {
      // 빈 검색어면 검색 관련 파라미터 제거
      params.delete('q');
      params.delete('searchType');
    }

    router.push(`${config.routePrefix}?${params.toString()}`);
    setPage(1); // 검색하면 1페이지부터 다시
  };

  const handleSearchReset = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('searchType');

    router.push(`${config.routePrefix}?${params.toString()}`);
    setSearchText('');
    setSearchType('title_content');
    setPage(1);
  };

  const { data, error, isLoading } = useSWR<ListResponse>(`/api/boards?${qs.toString()}`, (url: string) => boardFetcher<ListResponse>(url));
  const listError = parseApiError(error, config.errorMessage);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  // 전체 페이지 수 계산
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const pageStart = Math.max(1, Math.min(page - 1, totalPages - 2));
  const pageEnd = Math.min(totalPages, pageStart + 2);
  const visiblePages = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);

  const movePage = (nextPage: number) => {
    setPage(Math.max(1, Math.min(totalPages, nextPage)));
  };

  const handlePageJump = (e: any) => {
    e.preventDefault();
    const parsed = Number.parseInt(pageJump, 10);
    if (Number.isNaN(parsed)) return;
    movePage(parsed);
    setPageJump('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <MessageComposeDialog
        open={composeOpen}
        onOpenChange={(v) => {
          setComposeOpen(v);
          if (!v) setComposeTo(null);
        }}
        toUserId={composeTo?.id ?? ''}
        toName={composeTo?.name}
      />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 헤더 영역 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* 브레드크럼: 게시판 > 자유 게시판 */}
            <div className="mb-1 text-sm text-muted-foreground">
              <span className="font-medium text-teal-600 dark:text-teal-400">게시판</span>
              <span className="mx-1">›</span>
              <span>{config.boardTitle}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{config.boardTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">{config.boardDescription}</p>
          </div>

          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/board">게시판 홈으로</Link>
            </Button>

            <Button
              type="button"
              size="sm"
              className="gap-1"
              disabled={loading}
              onClick={() => {
                if (!user) {
                  // 비회원: 로그인 페이지로 이동
                  const redirectTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : config.routePrefix;
                  router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
                  return;
                }

                router.push(`${config.routePrefix}/write`);
              }}
            >
              <Plus className="h-4 w-4" />
              <span>글쓰기</span>
            </Button>
          </div>
        </div>

        {/* 리스트 카드 */}
        <Card className="border-0 bg-card shadow-xl backdrop-blur-sm dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">{config.boardTitle}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground md:text-sm">{config.cardDescription}</p>
              </div>
            </div>
            {total > 0 && (
              <Badge variant="outline" className="hidden items-center gap-1 rounded-full border-border bg-background/60 px-3 py-1 text-xs text-foreground shadow-sm sm:inline-flex">
                전체
                <span className="font-semibold">{total}</span>건
              </Badge>
            )}
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {/* 상단: 총 글 수 + 정렬 옵션 + 카테고리 필터 */}
            {!error && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    총 <span className="font-semibold">{total.toLocaleString()}</span>개의 글이 있습니다.
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="hidden text-muted-foreground sm:inline">정렬:</span>
                    <div className="inline-flex overflow-hidden rounded-md border border-border bg-background">
                      {[
                        { value: 'latest', label: '최신순' },
                        { value: 'views', label: '조회순' },
                        { value: 'likes', label: '추천순' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSort(opt.value as 'latest' | 'views' | 'likes');
                            setPage(1);
                          }}
                          className={[
                            'px-3 py-1.5 text-xs sm:text-[13px]',
                            'transition-colors',
                            'border-r border-border last:border-r-0',
                            sort === opt.value ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                          ].join(' ')}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 카테고리 필터 */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">분류:</span>
                  {[{ value: 'all', label: '전체' }, ...config.categories].map((cat) => {
                    const active = category === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => handleCategoryChange(cat.value as any)}
                        className={[
                          'rounded-full border px-3 py-1',
                          'transition-colors',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                        ].join(' ')}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
                {config.brandOptionsByCategory?.[category] && (
                  <div className="mt-3">
                    <select value={brand} onChange={(e) => handleBrandChange(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:border-border">
                      <option value="">브랜드 전체</option>
                      {config.brandOptionsByCategory[category].map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
            {authorId && (
              <div className="flex items-center gap-2 text-sm">
                <span>현재: {authorName ? `${authorName}님의 글` : '특정 작성자 글'} 보는 중</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(config.routePrefix)} // 쿼리 제거(해제)
                >
                  해제
                </Button>
              </div>
            )}

            {/* 로딩/에러/빈 상태 처리 */}
            {isLoading && <ListSkeleton />}
            {error && !isLoading && <ErrorBox message={listError.message} status={listError.status} fallbackMessage={config.errorMessage} />}

            {!isLoading && !error && items.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-muted-foreground">
                <p>아직 등록된 글이 없습니다.</p>
                <p>{config.emptyDescription}</p>
                <Button asChild size="sm" className="mt-2">
                  <Link href={`${config.routePrefix}/write`}>
                    <Plus className="mr-1 h-4 w-4" />첫 글 작성하기
                  </Link>
                </Button>
              </div>
            )}

            {!isLoading && !error && items.length > 0 && (
              <>
                {/* 데스크탑: 테이블형 리스트 */}
                <div className="hidden text-sm md:block">
                  {/* 헤더 행 */}
                  <div className="grid grid-cols-[60px_80px_minmax(0,1fr)_120px_140px_70px_70px_70px] items-center border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                    <div className="text-center">번호</div>
                    <div className="text-center">분류</div>
                    <div>제목</div>
                    <div className="text-center">글쓴이</div>
                    <div className="text-center">작성일</div>
                    <div className="text-center">댓글</div>
                    <div className="text-center">조회</div>
                    <div className="text-center">추천</div>
                  </div>

                  {/* 데이터 행들 */}
                  <div className="divide-y divide-border">
                    {items.map((post) => (
                      <Link key={post.id} href={`${config.routePrefix}/${post.postNo ?? post.id}`} className="grid grid-cols-[60px_80px_minmax(0,1fr)_120px_140px_70px_70px_70px] items-center px-4 py-3 text-sm hover:bg-accent/40">
                        {/* 번호 */}
                        <div className="text-center text-xs tabular-nums text-muted-foreground/80">{typeof post.postNo === 'number' ? post.postNo : '-'}</div>

                        {/* 분류 뱃지 */}
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className={getCategoryBadgeClass(config.categoryMap[post.category ?? '']?.badgePreset ?? config.defaultCategoryBadgePreset)}>
                            {config.categoryMap[post.category ?? ''] ? getCategoryBadgeText(config.categoryMap[post.category ?? '']) : '분류 없음'}
                          </span>

                          {config.brandOptionsByCategory?.[post.category ?? ''] && post.brand ? <span className="text-[11px] text-muted-foreground">{config.brandLabelMap?.[post.brand] ?? post.brand}</span> : null}
                        </div>

                        {/* 제목  */}
                        <div className="flex items-center gap-1">
                          <span className="line-clamp-1 text-foreground">{post.title}</span>

                          {/* 댓글 수 뱃지 */}
                          {post.commentsCount ? <span className="text-xs text-accent">[{post.commentsCount}]</span> : null}

                          {/* 이미지 첨부 아이콘 */}
                          {post.images && post.images.length > 0 && <ImageIcon className="h-4 w-4 shrink-0 ml-1 text-primary" aria-label="이미지 첨부 있음" />}

                          {/* 파일 첨부 아이콘 */}
                          {post.attachments && post.attachments.length > 0 && <Paperclip className="h-4 w-4 shrink-0 ml-0.5 text-sky-500" aria-label="파일 첨부 있음" />}
                        </div>

                        {/* 글쓴이 */}
                        <div className="truncate text-center text-xs">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="truncate text-muted-foreground underline-offset-4 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              >
                                {post.nickname || '회원'}
                              </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="start" className="w-44">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!post.userId) return;
                                  const authorName = post.nickname ?? '';
                                  router.push(`${config.routePrefix}?authorId=${post.userId}&authorName=${encodeURIComponent(authorName)}`);
                                }}
                              >
                                이 작성자의 글 보기
                              </DropdownMenuItem>

                              {/* 쪽지 보내기: 본인 제외 + 로그인 필요 */}
                              {post.userId && post.userId !== user?.id && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    if (!user) {
                                      const redirectTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : config.routePrefix;
                                      router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
                                      return;
                                    }

                                    const toUserId = post.userId;
                                    if (!toUserId) return;

                                    openCompose(toUserId, post.nickname);
                                  }}
                                >
                                  쪽지 보내기
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!post.userId) return;
                                  router.push(`${config.routePrefix}/${post.postNo ?? post.id}?openProfile=1`);
                                }}
                              >
                                작성자 테니스 프로필
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* 작성일 */}
                        <div className="text-center text-xs text-muted-foreground">{fmtDateTime(post.createdAt)}</div>

                        {/* 댓글 수 */}
                        <div className="text-center text-xs text-muted-foreground">{post.commentsCount ?? 0}</div>

                        {/* 조회 수 */}
                        <div className="text-center text-xs text-muted-foreground">{post.views ?? 0}</div>

                        {/* 추천 수 */}
                        <div className="text-center text-xs text-muted-foreground">{post.likes ?? 0}</div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* 모바일: 카드형 리스트 */}
                <div className="space-y-3 md:hidden">
                  {items.map((post) => (
                    <Link
                      key={post.id}
                      href={`${config.routePrefix}/${post.postNo ?? post.id}`}
                      className="block rounded-lg border border-border bg-background/90 px-3 py-2 shadow-sm hover:border-primary/40 hover:bg-accent/40"
                    >
                      {/* 1줄: 번호 + 분류 뱃지 */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="text-[11px] tabular-nums text-muted-foreground/80">{typeof post.postNo === 'number' ? post.postNo : '-'}</span>
                        <span className={getCategoryBadgeClass(config.categoryMap[post.category ?? '']?.badgePreset ?? config.defaultCategoryBadgePreset)}>
                          {config.categoryMap[post.category ?? ''] ? getCategoryBadgeText(config.categoryMap[post.category ?? '']) : '분류 없음'}
                        </span>
                      </div>

                      {/* 2줄: 제목 */}
                      <div className="mt-1 flex line-clamp-2 text-sm font-medium text-foreground">
                        {post.title}

                        {/* 이미지 첨부 아이콘 */}
                        {post.images && post.images.length > 0 && (
                          <span className="flex items-center justify-center rounded-full">
                            <ImageIcon className="h-4 w-4 shrink-0 ml-1 text-primary" aria-label="이미지 첨부 있음" />
                          </span>
                        )}

                        {/* 파일 첨부 아이콘 */}
                        {post.attachments && post.attachments.length > 0 && (
                          <span className="flex items-center justify-center rounded-full">
                            <Paperclip className="h-4 w-4 shrink-0 ml-0.5 text-sky-500" aria-label="파일 첨부 있음" />
                          </span>
                        )}
                      </div>

                      {/* 3줄: 작성자/날짜 + 카운트들(댓글/조회/추천) */}
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span>{post.nickname || '회원'}</span>
                          <span>·</span>
                          <span>{fmtDateTime(post.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {post.commentsCount ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {post.views ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {post.likes ?? 0}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {/* 하단: 검색 + 페이지네이션 */}
                {total > 0 && (
                  <div className="mt-8 space-y-4">
                    {/* 검색 폼: 제목 / 제목+내용 / 글쓴이 */}
                    <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 rounded-md bg-muted/50 px-3 py-3 text-xs text-foreground sm:flex-row sm:items-center sm:justify-between">
                      <div className="font-medium">검색</div>
                      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                        {/* 검색 타입 선택 */}
                        <select
                          value={searchType}
                          onChange={(e) => setSearchType(e.target.value as 'title' | 'author' | 'title_content')}
                          className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs focus:ring-2 focus:ring-ring focus:border-border sm:w-32"
                        >
                          <option value="title_content">제목+내용</option>
                          <option value="title">제목</option>
                          <option value="author">글쓴이</option>
                        </select>

                        {/* 검색어 입력 */}
                        <input
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs focus:ring-2 focus:ring-ring focus:border-border"
                          placeholder="검색어를 입력하세요"
                        />

                        {/* 버튼들 */}
                        <div className="flex shrink-0 items-center gap-2">
                          <Button type="submit" size="sm" className="px-3">
                            검색
                          </Button>
                          {qParam && (
                            <Button type="button" variant="outline" size="sm" className="px-3" onClick={handleSearchReset}>
                              초기화
                            </Button>
                          )}
                        </div>
                      </div>
                    </form>

                    <div className="flex items-center justify-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => movePage(1)} disabled={page <= 1} type="button">
                          <span className="sr-only">첫 페이지</span>
                          «
                        </Button>
                        {/* 이전 페이지 */}
                        <Button variant="outline" size="icon" onClick={() => movePage(page - 1)} disabled={page <= 1} type="button">
                          <span className="sr-only">이전 페이지</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <polyline points="15 18 9 12 15 6" />
                          </svg>
                        </Button>

                        {/* 페이지 번호들: 현재 페이지 중심 3개 노출 */}
                        {visiblePages.map((pageNumber) => (
                          <Button
                            key={pageNumber}
                            variant={pageNumber === page ? 'default' : 'outline'}
                            size="sm"
                            className="h-10 w-10"
                            onClick={() => movePage(pageNumber)}
                            type="button"
                          >
                            {pageNumber}
                          </Button>
                        ))}

                        {/* 다음 페이지 */}
                        <Button variant="outline" size="icon" onClick={() => movePage(page + 1)} disabled={page >= totalPages} type="button">
                          <span className="sr-only">다음 페이지</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => movePage(totalPages)} disabled={page >= totalPages} type="button">
                          <span className="sr-only">마지막 페이지</span>
                          »
                        </Button>

                        <form onSubmit={handlePageJump} className="ml-1 flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={pageJump}
                            onChange={(e) => setPageJump(e.target.value)}
                            placeholder="페이지"
                            className="h-10 w-20 rounded-md border border-border bg-background px-2 text-xs focus:ring-2 focus:ring-ring focus:border-border"
                          />
                          <Button type="submit" variant="outline" size="sm" className="h-10 px-2">
                            이동
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
