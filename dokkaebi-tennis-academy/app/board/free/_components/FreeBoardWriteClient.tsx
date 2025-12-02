'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowLeft, Loader2 } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function FreeBoardWriteClient() {
  const router = useRouter();

  // 폼 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 제출 상태
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 간단한 프론트 유효성 검증
  const validate = () => {
    if (!title.trim()) {
      return '제목을 입력해 주세요.';
    }
    if (!content.trim()) {
      return '내용을 입력해 주세요.';
    }
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

      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'free',
          title: title.trim(),
          content: content.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        // 백엔드에서 validation_error / unauthorized 등 내려줄 수 있음
        const detail = data?.details?.[0]?.message ?? data?.error ?? '글 작성에 실패했습니다. 잠시 후 다시 시도해 주세요.';
        setErrorMsg(detail);
        return;
      }

      // TODO: 나중에 상세 페이지 구현되면 `/board/free/${data.id}` 로 이동해도 됨
      router.push('/board/free');
      router.refresh();
    } catch (err) {
      console.error(err);
      setErrorMsg('알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 상단 헤더 영역 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* 브레드크럼: 게시판 > 자유 게시판 > 글쓰기 */}
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-teal-600 dark:text-teal-400">게시판</span>
              <span className="mx-1">›</span>
              <Link href="/board/free" className="text-gray-500 underline-offset-2 hover:underline dark:text-gray-300">
                자유 게시판
              </Link>
              <span className="mx-1">›</span>
              <span>글쓰기</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">자유 게시판 글쓰기</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 md:text-base">테니스 관련 질문, 정보 공유, 후기, 잡담 등 다양한 이야기를 자유롭게 남겨 보세요.</p>
          </div>

          {/* 우측 버튼들: 목록으로 / 게시판 홈 */}
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link href="/board/free">
                <ArrowLeft className="h-4 w-4" />
                <span>목록으로</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/board">게시판 홈</Link>
            </Button>
          </div>
        </div>

        {/* 글쓰기 카드 */}
        <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
          <CardHeader className="flex flex-row items-center gap-3 border-b bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-900/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base md:text-lg">자유 게시판 글 작성</CardTitle>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 md:text-sm">다른 이용자들이 함께 볼 수 있다는 점을 고려해, 예의를 지키는 표현을 사용해 주세요.</p>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* 제목 입력 */}
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isSubmitting} />
              </div>

              {/* 내용 입력 */}
              <div className="space-y-2">
                <Label htmlFor="content">내용</Label>
                <Textarea id="content" className="min-h-[200px] resize-y" value={content} onChange={(e) => setContent(e.target.value)} disabled={isSubmitting} />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">신청/주문 문의 등 개인 정보가 필요한 내용은 고객센터 Q&amp;A 게시판을 활용해 주세요.</p>
              </div>

              {/* 에러 메시지 */}
              {errorMsg && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/60">{errorMsg}</div>}

              {/* 버튼 영역 */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={() => router.back()}>
                  취소
                </Button>
                <Button type="submit" size="sm" className={cn('gap-2')} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>작성하기</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
