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
import { MARKET_BRANDS_BY_CATEGORY } from '@/app/board/market/_components/market.constants';

// API 응답 타입
type ListResponse = {
  ok: boolean;
  items: CommunityPost[];
  total: number;
  page: number;
  limit: number;
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

const fmtDateTime = (v: string | Date) =>
  new Date(v).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

function getCategoryLabel(category?: string | null) {
  switch (category) {
    case 'racket':
      return '라켓';
    case 'string':
      return '스트링';
    case 'equipment':
      return '일반장비';
    default:
      return '분류 없음';
  }
}

function getCategoryBadgeClasses(category?: string | null) {
  switch (category) {
    case 'racket':
      return 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300';
    case 'string':
      return 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'equipment':
      return 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    default:
      return 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-gray-100 text-gray-500 dark:bg-gray-800/60 dark:text-gray-300';
  }
}

// 목록 스켈레톤 UI
function ListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4 last:border-0 dark:border-gray-700">
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

// 에러 박스
function ErrorBox({ message = '중고 거래 게시판을 불러오는 중 오류가 발생했습니다.' }) {
  return <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/60">{message}</div>;
}
export default function FreeBoardClient() {
  // 페이지 상태
  const [page, setPage] = useState(1);

  // 정렬 상태
  const [sort, setSort] = useState<'latest' | 'views' | 'likes'>('latest');

  const { user, loading } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const categoryParam: 'racket' | 'string' | 'equipment' | null = rawCategoryParam === 'racket' || rawCategoryParam === 'string' || rawCategoryParam === 'equipment' ? rawCategoryParam : null;

  // UI에서 사용할 카테고리 상태 (전체 포함)
  const [category, setCategory] = useState<'all' | 'racket' | 'string' | 'equipment'>(categoryParam ?? 'all');

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
  const handleCategoryChange = (next: 'all' | 'racket' | 'string' | 'equipment') => {
    setPage(1);
    setCategory(next);

    const sp = new URLSearchParams(searchParams.toString());
    if (next === 'all') sp.delete('category');
    else sp.set('category', next);

    // 라켓/스트링이 아니면 brand 제거
    if (next !== 'racket' && next !== 'string') sp.delete('brand');

    router.push(`/board/market?${sp.toString()}`);
  };

  // 브랜드 변경 핸들러
  const handleBrandChange = (nextBrand: string) => {
    setPage(1);
    setBrand(nextBrand);

    const sp = new URLSearchParams(searchParams.toString());

    if (!nextBrand) sp.delete('brand');
    else sp.set('brand', nextBrand);

    router.push(`/board/market?${sp.toString()}`);
  };

  // 한 페이지당 개수
  const PAGE_LIMIT = 10;

  const qs = new URLSearchParams({
    type: 'market',
    page: String(page),
    limit: String(PAGE_LIMIT),
    sort,
  });

  if (brandParam && (categoryParam === 'racket' || categoryParam === 'string')) {
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

    router.push(`/board/market?${params.toString()}`);
    setPage(1); // 검색하면 1페이지부터 다시
  };

  const handleSearchReset = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('searchType');

    router.push(`/board/market?${params.toString()}`);
    setSearchText('');
    setSearchType('title_content');
    setPage(1);
  };

  const { data, error, isLoading } = useSWR<ListResponse>(`/api/community/posts?${qs.toString()}`, fetcher);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  // 전체 페이지 수 계산
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 헤더 영역 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* 브레드크럼: 게시판 > 자유 게시판 */}
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-teal-600 dark:text-teal-400">게시판</span>
              <span className="mx-1">›</span>
              <span>중고 거래 게시판</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">중고 거래 게시판</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 md:text-base">테니스 라켓, 스트링,장비 등 거래하는 공간입니다.</p>
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
                  router.push('/login');
                  return;
                }

                router.push('/board/market/write');
              }}
            >
              <Plus className="h-4 w-4" />
              <span>글쓰기</span>
            </Button>
          </div>
        </div>

        {/* 리스트 카드 */}
        <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-900/40">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">중고 거래 게시판</CardTitle>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 md:text-sm">회원들과 자유롭게 테니스 상품을 거래 해보세요.</p>
              </div>
            </div>
            {total > 0 && (
              <Badge variant="outline" className="hidden items-center gap-1 rounded-full border-gray-300 bg-white/60 px-3 py-1 text-xs text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-100 sm:inline-flex">
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
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    총 <span className="font-semibold">{total.toLocaleString()}</span>개의 글이 있습니다.
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="hidden text-gray-500 dark:text-gray-400 sm:inline">정렬:</span>
                    <div className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
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
                            'border-r border-gray-200 last:border-r-0 dark:border-gray-700',
                            sort === opt.value ? 'bg-blue-500 text-white dark:bg-blue-500' : 'bg-transparent text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800',
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
                  <span className="text-gray-500 dark:text-gray-400">분류:</span>
                  {[
                    { value: 'all', label: '전체' },
                    { value: 'racket', label: '라켓' },
                    { value: 'string', label: '스트링' },
                    { value: 'equipment', label: '일반장비' },
                  ].map((cat) => {
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
                            ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
                        ].join(' ')}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
                {(category === 'racket' || category === 'string') && (
                  <div className="mt-3">
                    <select value={brand} onChange={(e) => handleBrandChange(e.target.value)} className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                      <option value="">브랜드 전체</option>
                      {(category === 'racket' ? MARKET_BRANDS_BY_CATEGORY.racket : MARKET_BRANDS_BY_CATEGORY.string).map((o) => (
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
                  onClick={() => router.push('/board/market')} // 쿼리 제거(해제)
                >
                  해제
                </Button>
              </div>
            )}

            {/* 로딩/에러/빈 상태 처리 */}
            {isLoading && <ListSkeleton />}
            {error && !isLoading && <ErrorBox />}

            {!isLoading && !error && items.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>아직 등록된 글이 없습니다.</p>
                <p>첫 번째 글을 작성해 보세요.</p>
                <Button asChild size="sm" className="mt-2">
                  <Link href="/board/market/write">
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
                  <div className="grid grid-cols-[60px_80px_minmax(0,1fr)_120px_140px_70px_70px_70px] items-center border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
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
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map((post) => (
                      <Link key={post.id} href={`/board/market/${post.postNo ?? post.id}`} className="grid grid-cols-[60px_80px_minmax(0,1fr)_120px_140px_70px_70px_70px] items-center px-4 py-3 text-sm hover:bg-blue-50/40 dark:hover:bg-gray-800/60">
                        {/* 번호 */}
                        <div className="text-center text-xs tabular-nums text-gray-400 dark:text-gray-500">{typeof post.postNo === 'number' ? post.postNo : '-'}</div>

                        {/* 분류 뱃지 */}
                        <div className="flex justify-center">
                          <span className={getCategoryBadgeClasses(post.category)}>{getCategoryLabel(post.category)}</span>
                        </div>

                        {/* 제목  */}
                        <div className="flex items-center gap-1">
                          <span className="line-clamp-1 text-gray-900 dark:text-gray-50">{post.title}</span>

                          {/* 댓글 수 뱃지 */}
                          {post.commentsCount ? <span className="text-xs text-blue-500">[{post.commentsCount}]</span> : null}

                          {/* 이미지 첨부 아이콘 */}
                          {post.images && post.images.length > 0 && <ImageIcon className="h-4 w-4 shrink-0 ml-1 text-emerald-500" aria-label="이미지 첨부 있음" />}

                          {/* 파일 첨부 아이콘 */}
                          {post.attachments && post.attachments.length > 0 && <Paperclip className="h-4 w-4 shrink-0 ml-0.5 text-sky-500" aria-label="파일 첨부 있음" />}
                        </div>

                        {/* 글쓴이 */}
                        <div className="truncate text-center text-xs">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="truncate text-gray-600 underline-offset-4 hover:underline dark:text-gray-300"
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
                                  router.push(`/board/market?authorId=${post.userId}&authorName=${encodeURIComponent(authorName)}`);
                                }}
                              >
                                이 작성자의 글 보기
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!post.userId) return;
                                  router.push(`/board/market/${post.postNo ?? post.id}?openProfile=1`);
                                }}
                              >
                                작성자 테니스 프로필
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* 작성일 */}
                        <div className="text-center text-xs text-gray-500 dark:text-gray-400">{fmtDateTime(post.createdAt)}</div>

                        {/* 댓글 수 */}
                        <div className="text-center text-xs text-gray-500 dark:text-gray-400">{post.commentsCount ?? 0}</div>

                        {/* 조회 수 */}
                        <div className="text-center text-xs text-gray-500 dark:text-gray-400">{post.views ?? 0}</div>

                        {/* 추천 수 */}
                        <div className="text-center text-xs text-gray-500 dark:text-gray-400">{post.likes ?? 0}</div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* 모바일: 카드형 리스트 */}
                <div className="space-y-3 md:hidden">
                  {items.map((post) => (
                    <Link
                      key={post.id}
                      href={`/board/market/${post.postNo ?? post.id}`}
                      className="block rounded-lg border border-gray-100 bg-white/90 px-3 py-2 shadow-sm hover:border-blue-200 hover:bg-blue-50/60 dark:border-gray-700 dark:bg-gray-900/80 dark:hover:border-blue-500/60"
                    >
                      {/* 1줄: 번호 + 분류 뱃지 */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">{typeof post.postNo === 'number' ? post.postNo : '-'}</span>
                        <span className={getCategoryBadgeClasses(post.category)}>{getCategoryLabel(post.category)}</span>
                      </div>

                      {/* 2줄: 제목 */}
                      <div className="mt-1 flex line-clamp-2 text-sm font-medium text-gray-900 dark:text-gray-50">
                        {post.title}

                        {/* 이미지 첨부 아이콘 */}
                        {post.images && post.images.length > 0 && (
                          <span className="flex items-center justify-center rounded-full">
                            <ImageIcon className="h-4 w-4 shrink-0 ml-1 text-emerald-500" aria-label="이미지 첨부 있음" />
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
                      <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
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
                    <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 rounded-md bg-gray-50 px-3 py-3 text-xs text-gray-700 dark:bg-gray-900/60 dark:text-gray-200 sm:flex-row sm:items-center sm:justify-between">
                      <div className="font-medium">검색</div>
                      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                        {/* 검색 타입 선택 */}
                        <select
                          value={searchType}
                          onChange={(e) => setSearchType(e.target.value as 'title' | 'author' | 'title_content')}
                          className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-xs dark:border-gray-700 dark:bg-gray-900 sm:w-32"
                        >
                          <option value="title_content">제목+내용</option>
                          <option value="title">제목</option>
                          <option value="author">글쓴이</option>
                        </select>

                        {/* 검색어 입력 */}
                        <input
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-xs dark:border-gray-700 dark:bg-gray-900"
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
                      <div className="flex items-center space-x-2">
                        {/* 이전 페이지 */}
                        <Button variant="outline" size="icon" className="bg-white dark:bg-gray-700" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} type="button">
                          <span className="sr-only">이전 페이지</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <polyline points="15 18 9 12 15 6" />
                          </svg>
                        </Button>

                        {/* 페이지 번호들: 최대 3개 정도만 노출 */}
                        {Array.from({ length: totalPages })
                          .map((_, i) => i + 1)
                          .slice(0, 3)
                          .map((pageNumber) => (
                            <Button
                              key={pageNumber}
                              variant="outline"
                              size="sm"
                              className={pageNumber === page ? 'h-10 w-10 bg-blue-600 text-white border-blue-600' : 'h-10 w-10 bg-white dark:bg-gray-700'}
                              onClick={() => setPage(pageNumber)}
                              type="button"
                            >
                              {pageNumber}
                            </Button>
                          ))}

                        {/* 다음 페이지 */}
                        <Button variant="outline" size="icon" className="bg-white dark:bg-gray-700" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} type="button">
                          <span className="sr-only">다음 페이지</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Button>
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
