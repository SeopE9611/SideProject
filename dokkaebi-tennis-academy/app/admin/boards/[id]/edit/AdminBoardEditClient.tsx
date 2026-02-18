'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { adminFetcher, adminMutator, ensureAdminMutationSucceeded, getAdminErrorMessage } from '@/lib/admin/adminFetcher';

type AdminEditItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  type: string;
};

type AdminEditResponse = {
  ok: boolean;
  item: AdminEditItem;
};

/**
 * 관리자 게시글 수정 클라이언트
 * - 조회/수정 모두 관리자 API를 통해 수행한다.
 * - 저장 성공 시 상세 페이지로 이동해 운영 동선을 단순화한다.
 */
export default function AdminBoardEditClient({ postId }: { postId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [statusText, setStatusText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const payload = await adminFetcher<AdminEditResponse>(`/api/admin/community/posts/${encodeURIComponent(postId)}`);
        if (!alive) return;

        ensureAdminMutationSucceeded(payload, '게시물을 불러오지 못했습니다.');
        setTitle(payload.item.title ?? '');
        setContent(payload.item.content ?? '');
        setCategory(payload.item.category ?? '');
        setStatusText(`${payload.item.type} / ${payload.item.status}`);
      } catch (error) {
        if (!alive) return;
        toast.error(getAdminErrorMessage(error));
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [postId]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const payload = await adminMutator<{ ok?: boolean }>(`/api/admin/community/posts/${encodeURIComponent(postId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content, category }),
      });
      ensureAdminMutationSucceeded(payload, '게시물 수정에 실패했습니다.');

      toast.success('게시물을 수정했습니다.');
      router.push(`/admin/boards/${postId}`);
      router.refresh();
    } catch (error) {
      toast.error(getAdminErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl">관리자 게시글 수정</CardTitle>
            <p className="text-sm text-muted-foreground">상태: {statusText || '-'}</p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/admin/boards/${postId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              상세로 돌아가기
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            게시물을 불러오는 중입니다...
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="예: general" maxLength={40} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">내용</Label>
              <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[320px]" required />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSubmitting ? '저장 중...' : '저장하기'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
