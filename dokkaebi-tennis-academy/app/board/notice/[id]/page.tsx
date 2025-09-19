'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import useSWR from 'swr';
import { useParams } from 'next/navigation';

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
  const { data, error, isLoading } = useSWR(id ? `/api/boards/${id}` : null, fetcher);
  const notice = data?.item;
  const fmt = (v?: string | Date) => (v ? new Date(v).toLocaleString() : '');

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link href="/board/notice" className="inline-flex items-center text-primary hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            공지사항 목록으로 돌아가기
          </Link>
        </div>

        <Card>
          <CardHeader className="border-b p-6">
            <div className="space-y-2">
              {isLoading && <h1 className="text-2xl font-bold">불러오는 중…</h1>}
              {error && <h1 className="text-2xl font-bold text-red-500">불러오기에 실패했습니다</h1>}
              {!isLoading && !error && (
                <>
                  <h1 className="text-2xl font-bold">{notice?.title}</h1>
                  <div className="flex flex-wrap items-center gap-x-6 text-sm text-muted-foreground">
                    <div>작성일: {fmt(notice?.createdAt)}</div>
                    <div>조회수: {notice?.viewCount ?? 0}</div>
                  </div>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {!isLoading && !error && (
              <div
                className="prose max-w-none"
                // 공지는 비밀글 개념 없음. 서버가 문자열을 그대로 내려주므로 HTML/텍스트 모두 표시 가능
                dangerouslySetInnerHTML={{ __html: String(notice?.content ?? '') }}
              />
            )}
          </CardContent>
          <CardFooter className="flex flex-col border-t p-6">
            <div className="mt-6 flex justify-between w-full">
              <Button variant="outline" asChild>
                <Link href="/board/notice">
                  <ArrowUp className="mr-2 h-4 w-4" />
                  목록
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
