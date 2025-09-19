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
          <CardContent className="p-6 space-y-6">
            {!isLoading && !error && (
              <>
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: String(notice?.content || '').replace(/\n/g, '<br/>') }} />
                {/* 첨부 이미지/문서 */}
                {Array.isArray(notice?.attachments) && notice.attachments.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {notice.attachments.map((att: any, i: number) => {
                      const url = typeof att === 'string' ? att : att?.url;
                      const name = typeof att === 'string' ? `attachment-${i}` : att?.name || `attachment-${i}`;
                      if (!url) return null;
                      const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
                      return isImage ? (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="block rounded-md overflow-hidden border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={name} className="w-full h-40 object-cover" />
                        </a>
                      ) : (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="text-sm underline break-all">
                          {name}
                        </a>
                      );
                    })}
                  </div>
                )}
              </>
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
