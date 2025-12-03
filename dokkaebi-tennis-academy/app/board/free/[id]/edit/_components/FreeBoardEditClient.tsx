'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowLeft, Loader2 } from 'lucide-react';
import useSWR from 'swr';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CommunityPost } from '@/lib/types/community';

type Props = {
  id: string;
};

type DetailResponse = { ok: true; item: CommunityPost } | { ok: false; error: string };

const fetcher = async (url: string): Promise<DetailResponse> => {
  const res = await fetch(url, { credentials: 'include' });
  return res.json();
};

export default function FreeBoardEditClient({ id }: Props) {
  const router = useRouter();

  // 폼 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 상태 플래그
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 기존 글 불러오기
  const { data, error, isLoading } = useSWR<DetailResponse>(`/api/community/posts/${id}`, fetcher);

  // 최초 로드 시 기존 제목/내용 세팅
  useEffect(() => {
    if (data && data.ok) {
      setTitle(data.item.title ?? '');
      setContent(data.item.content ?? '');
    }
  }, [data]);

  // 간단한 프론트 유효성 검증
  const validate = () => {
    if (!title.trim()) return '제목을 입력해 주세요.';
    if (!content.trim()) return '내용을 입력해 주세요.';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const msg = validate();
    if (msg) {
      setErrorMsg(msg);
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch(`/api/community/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          // PATCH에서는 바뀐 필드만 보내도 되지만,
          // 지금은 단순하게 제목/내용 둘 다 항상 보냄
          title: title.trim(),
          content: content.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        const detail = data?.details?.[0]?.message ?? data?.error ?? '글 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.';
        setErrorMsg(detail);
        return;
      }

      // 수정 후에는 상세 페이지로 이동
      router.push(`/board/free/${id}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setErrorMsg('알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로딩/에러 UI ----------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 space-y-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Skeleton className="h-4 w-16" />
            <span>›</span>
            <Skeleton className="h-4 w-20" />
            <span>›</span>
            <Skeleton className="h-4 w-16" />
          </div>
          <Card className="border-0 bg-white/80 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
            <CardHeader className="space-y-1">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isNotFound = data && !data.ok && data.error === 'not_found';
  if (error || isNotFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
            <CardContent className="space-y-4 p-6">
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">해당 글을 찾을 수 없습니다. 삭제되었거나 주소가 잘못되었을 수 있습니다.</div>
              <div className="flex justify-end gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/board/free">목록으로</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 실제 수정 폼 ----------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 상단 헤더 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* 브레드크럼: 게시판 > 자유 게시판 > 글 수정 */}
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-teal-600 dark:text-teal-400">게시판</span>
              <span className="mx-1">›</span>
              <Link href="/board/free" className="text-gray-500 underline-offset-2 hover:underline dark:text-gray-300">
                자유 게시판
              </Link>
              <span className="mx-1">›</span>
              <span>글 수정</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">자유 게시판 글 수정</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 md:text-base">기존에 작성한 글의 내용을 수정합니다. 제목과 내용을 확인한 뒤 저장해 주세요.</p>
          </div>

          {/* 우측 상단: 뒤로가기 */}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" className="gap-2 text-xs sm:text-sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              <span>이전으로</span>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 text-xs sm:text-sm">
              <Link href="/board/free">
                <MessageSquare className="h-4 w-4" />
                <span>목록으로</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* 본문 카드 (수정 폼) */}
        <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
          <CardHeader className="space-y-1 border-b border-gray-100 pb-4 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-50">
              <MessageSquare className="h-4 w-4 text-teal-500" />
              <span>글 내용 수정</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* 제목 */}
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isSubmitting} />
              </div>

              {/* 내용 */}
              <div className="space-y-2">
                <Label htmlFor="content">내용</Label>
                <Textarea id="content" className="min-h-[200px]" value={content} onChange={(e) => setContent(e.target.value)} disabled={isSubmitting} />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">신청/주문 문의 등 개인 정보가 필요한 내용은 고객센터 Q&amp;A 게시판을 활용해 주세요.</p>
              </div>

              {/* 에러 메시지 */}
              {errorMsg && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">{errorMsg}</div>}

              {/* 하단 버튼 */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className={cn('gap-2')} disabled={isSubmitting} onClick={() => router.push(`/board/free/${id}`)}>
                  <ArrowLeft className="h-4 w-4" />
                  <span>취소</span>
                </Button>
                <Button type="submit" size="sm" className={cn('gap-2')} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>수정하기</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
