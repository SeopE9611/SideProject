'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { MessageSquare, Plus, Eye } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { CommunityPost } from '@/lib/types/community';

// API 응답 타입
type ListResponse = {
  ok: boolean;
  items: CommunityPost[];
  total: number;
  page: number;
  limit: number;
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

const fmtDate = (v: string | Date) =>
  new Date(v).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

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
  const [page] = useState(1); // 추후 페이지네이션 추가 여지
  const { data, error, isLoading } = useSWR<ListResponse>(`/api/community/posts?type=free&page=${page}&limit=20`, fetcher);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

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

          {/* 우측: 글쓰기 / 게시판 홈 */}
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/board">게시판 홈으로</Link>
            </Button>
            <Button asChild size="sm" className="gap-1">
              <Link href="/board/free/write">
                <Plus className="h-4 w-4" />
                <span>글쓰기</span>
              </Link>
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
              <div className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
                {items.map((post) => (
                  <div key={post.id} className="flex items-start justify-between gap-3 py-4">
                    {/* 제목/작성자/날짜 */}
                    <div className="min-w-0 flex-1">
                      <Link href={`/board/free/${post.id}`} className="line-clamp-1 text-sm font-medium text-gray-900 hover:text-blue-600 dark:text-gray-50 dark:hover:text-blue-400">
                        {post.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">{post.nickname || '회원'}</span>
                        <span>·</span>
                        <span>{fmtDate(post.createdAt)}</span>
                      </div>
                    </div>

                    {/* 조회수 */}
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <Eye className="h-3 w-3" />
                      <span>{post.views ?? 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
