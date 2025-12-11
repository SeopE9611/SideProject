'use client';

import { useState } from 'react';
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
import { useRouter } from 'next/navigation';

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
    case 'general':
      return '자유';
    case 'info':
      return '정보';
    case 'question':
      return '질문';
    case 'tip':
      return '노하우';
    case 'etc':
      return '기타';
    default:
      return '분류 없음';
  }
}

function getCategoryBadgeClasses(category?: string | null) {
  // 카테고리별 배경/글자색 분리
  switch (category) {
    case 'general': // 자유
      return 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300';
    case 'info': // 정보
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'question': // 질문
      return 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case 'tip': // 노하우
      return 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
    case 'etc': // 기타
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200';
    default: // 분류 없음
      return 'bg-gray-100 text-gray-500 dark:bg-gray-800/60 dark:text-gray-300';
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
function ErrorBox({ message = '자유 게시판을 불러오는 중 오류가 발생했습니다.' }) {
  return <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/60">{message}</div>;
}
export default function FreeBoardClient() {
  // 페이지 상태
  const [page, setPage] = useState(1);

  // 정렬 상태
  const [sort, setSort] = useState<'latest' | 'views' | 'likes'>('latest');

  const { user, loading } = useCurrentUser();
  const router = useRouter();

  // 한 페이지당 개수
  const PAGE_LIMIT = 10;

  // API 호출: PAGE_LIMIT 사용
  const { data, error, isLoading } = useSWR<ListResponse>(`/api/community/posts?type=free&page=${page}&limit=${PAGE_LIMIT}&sort=${sort}`, fetcher);

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
              <span>자유 게시판</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">자유 게시판</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 md:text-base">테니스 관련 질문, 정보 공유, 일상 이야기를 자유롭게 나눌 수 있는 공간입니다.</p>
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

                router.push('/board/free/write');
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
                <CardTitle className="text-base md:text-lg">자유 게시판</CardTitle>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 md:text-sm">질문, 정보 공유, 후기, 잡담 등 다양한 이야기를 자유롭게 남겨 보세요.</p>
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
            {/* 상단: 총 글 수 + 정렬 옵션 */}
            {!error && (
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
            )}

            {/* 로딩/에러/빈 상태 처리 */}
            {isLoading && <ListSkeleton />}
            {error && !isLoading && <ErrorBox />}

            {!isLoading && !error && items.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>아직 등록된 글이 없습니다.</p>
                <p>자유 게시판의 첫 번째 글을 작성해 보세요.</p>
                <Button asChild size="sm" className="mt-2">
                  <Link href="/board/free/write">
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
                      <Link key={post.id} href={`/board/free/${post.postNo ?? post.id}`} className="grid grid-cols-[60px_80px_minmax(0,1fr)_120px_140px_70px_70px_70px] items-center px-4 py-3 text-sm hover:bg-blue-50/40 dark:hover:bg-gray-800/60">
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
                        <div className="truncate text-center text-xs text-gray-600 dark:text-gray-300">{post.nickname || '회원'}</div>

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
                      href={`/board/free/${post.postNo ?? post.id}`}
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
                {/* 페이지네이션: 공지 목록과 동일 스타일 */}
                {!isLoading && !error && total > 0 && (
                  <div className="mt-8 flex items-center justify-center">
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
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
