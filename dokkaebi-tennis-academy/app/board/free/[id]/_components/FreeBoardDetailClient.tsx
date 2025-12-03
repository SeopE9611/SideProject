'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, MessageSquare, ThumbsUp } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { CommunityPost } from '@/lib/types/community';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useState } from 'react';

type Props = {
  id: string;
};

type DetailResponse = {
  ok: boolean;
  item?: CommunityPost;
  error?: string;
};

const fetcher = async (url: string): Promise<DetailResponse> => {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) {
    // SWR의 error 에 그대로 전달
    throw data;
  }
  return data;
};

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
  switch (category) {
    case 'general':
      return 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300';
    case 'info':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'question':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case 'tip':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
    case 'etc':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200';
    default:
      return 'bg-gray-100 text-gray-500 dark:bg-gray-800/60 dark:text-gray-300';
  }
}

function DetailSkeleton() {
  return (
    <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="h-4 w-9/12" />
      </CardContent>
    </Card>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/60">{message}</div>;
}

export default function FreeBoardDetailClient({ id }: Props) {
  const router = useRouter();
  const { user } = useCurrentUser(); // 현재 로그인 사용자
  const [isDeleting, setIsDeleting] = useState(false); // 삭제 중 플래그

  const { data, error, isLoading } = useSWR<DetailResponse>(`/api/community/posts/${id}`, fetcher);

  const item = data?.item;
  const isNotFound = (error as any)?.error === 'not_found';

  const isAuthor = !!user && !!item?.userId && user.id === item.userId;

  // 삭제 핸들러
  const handleDelete = async () => {
    if (!item) return;
    if (isDeleting) return;

    const confirmed = window.confirm('정말로 이 게시글을 삭제하시겠습니까? 되돌릴 수 없습니다.');
    if (!confirmed) return;

    try {
      setIsDeleting(true);

      const res = await fetch(`/api/community/posts/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.error === 'forbidden' ? '본인이 작성한 글만 삭제할 수 있습니다.' : data?.error === 'unauthorized' ? '로그인이 필요합니다.' : '글 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.';

        alert(msg);
        return;
      }

      // 삭제 성공 - 목록으로 이동
      router.push('/board/free');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 상단 헤더 (브레드크럼 + 버튼) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-teal-600 dark:text-teal-400">게시판</span>
              <span className="mx-1">›</span>
              <Link href="/board/free" className="text-gray-500 underline-offset-2 hover:underline dark:text-gray-300">
                자유 게시판
              </Link>
              <span className="mx-1">›</span>
              <span>글 상세</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">자유 게시판 글 상세</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 md:text-base">자유 게시판에 작성된 글의 상세 내용을 확인할 수 있습니다.</p>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              <span>이전으로</span>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/board/free">목록으로</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/board">게시판 홈</Link>
            </Button>
          </div>
        </div>

        {/* 본문 카드 */}
        {isLoading && <DetailSkeleton />}

        {!isLoading && error && (
          <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
            <CardContent className="p-6 space-y-4">
              <ErrorBox message={isNotFound ? '해당 글을 찾을 수 없습니다. 삭제되었거나 주소가 잘못되었을 수 있습니다.' : '글을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'} />
              <div className="flex justify-end gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/board/free">목록으로</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/board/free/write">새 글 작성하기</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && item && (
          <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
            <CardHeader className="space-y-3 border-b bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-900/40">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <CardTitle className="text-base md:text-lg">
                    {typeof item.postNo === 'number' && <span className="mr-2 text-sm font-semibold tabular-nums text-gray-400 dark:text-gray-500">{item.postNo}</span>}

                    {/* 카테고리 뱃지 */}
                    <span
                      className={`
      mr-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5
      text-[11px] font-semibold
      ${getCategoryBadgeClasses(item.category)}
    `}
                    >
                      {getCategoryLabel(item.category)}
                    </span>

                    {item.title}
                  </CardTitle>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 md:text-sm">
                    {/* 작성자 */}
                    <span className="font-medium">{item.nickname || '회원'}</span>
                    <span>·</span>

                    {/* 조회수 */}
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      조회 {item.views ?? 0}
                    </span>
                    <span>·</span>

                    {/* 댓글 수 */}
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      댓글 {item.commentsCount ?? 0}
                    </span>
                    <span>·</span>

                    {/* 추천 수 */}
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      추천 {item.likes ?? 0}
                    </span>
                    <span>·</span>
                    {/* 작성일시 */}
                    <span>{fmtDateTime(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-100">{item.content}</div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-gray-500 dark:text-gray-400">
                <span>게시글 이용 시 커뮤니티 가이드를 준수해 주세요. 신고가 반복되는 경우 글이 숨김 처리될 수 있습니다.</span>

                <div className="flex flex-wrap items-center gap-2">
                  {isAuthor && (
                    <>
                      <Button type="button" variant="outline" size="sm" onClick={() => router.push(`/board/free/${item.id}/edit`)}>
                        수정
                      </Button>

                      <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? '삭제 중...' : '삭제'}
                      </Button>
                    </>
                  )}

                  <Button asChild variant="outline" size="sm">
                    <Link href="/board/free">목록으로</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/board/free/write">새 글 작성</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
