'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { useState } from 'react';

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
  const { data, error, isLoading } = useSWR(id ? `/api/boards/${id}` : null, fetcher);
  const notice = data?.item;

  // 첨부를 이미지와 파일로 분리
  const attachments = Array.isArray(notice?.attachments) ? notice!.attachments : [];
  const imageAtts = attachments.filter((att: any) => {
    const url = typeof att === 'string' ? att : att?.url;
    const mime = (att?.mime || '') as string;
    return !!url && (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url));
  });
  const fileAtts = attachments.filter((att: any) => {
    const url = typeof att === 'string' ? att : att?.url;
    const mime = (att?.mime || '') as string;
    const isImg = !!url && (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url));
    return !!url && !isImg;
  });

  const fmt = (v?: string | Date) => (v ? new Date(v).toLocaleString() : '');
  const [lightbox, setLightbox] = useState<{ open: boolean; src: string; alt: string }>({ open: false, src: '', alt: '' });

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
                    {notice?.category && <div>카테고리: {notice.category}</div>}
                  </div>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {!isLoading && !error && (
              <>
                {/* 본문 */}
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: String(notice?.content || '').replace(/\n/g, '<br/>') }} />

                {/* 첨부파일 섹션 */}
                {/* 이미지가 있으면 큰 갤러리 먼저 */}
                {imageAtts.length > 0 && (
                  <section className="mt-8">
                    <h2 className="mb-3 text-base font-semibold">이미지</h2>

                    {/* 한 장이면 넓게, 여러 장이면 그리드 */}
                    {imageAtts.length === 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLightbox({
                            open: true,
                            src: (typeof imageAtts[0] === 'string' ? imageAtts[0] : imageAtts[0].url) as string,
                            alt: (imageAtts[0] as any)?.name || 'image-1',
                          })
                        }
                        className="block overflow-hidden rounded-md border"
                        aria-label="이미지 확대 보기"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={(typeof imageAtts[0] === 'string' ? imageAtts[0] : imageAtts[0].url) as string} alt={(imageAtts[0] as any)?.name || 'image-1'} className="w-full h-auto max-h-[70vh] object-contain bg-black/5" />
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {imageAtts.map((att: any, i: number) => {
                          const url = typeof att === 'string' ? att : att?.url;
                          const name = typeof att === 'string' ? `image-${i + 1}` : att?.name || `image-${i + 1}`;
                          return (
                            <button
                              key={`img-${i}`}
                              type="button"
                              onClick={() => setLightbox({ open: true, src: url, alt: name })}
                              className="relative block rounded-md overflow-hidden border hover:ring-2 hover:ring-blue-400 transition"
                              aria-label={`${name} 이미지 보기`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={name} className="w-full h-40 object-cover" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                )}

                {/* 파일(문서)만 별도 목록 */}
                {fileAtts.length > 0 && (
                  <section className="mt-8">
                    <h2 className="mb-3 text-base font-semibold">첨부파일</h2>
                    <ul className="divide-y rounded-md border bg-white">
                      {fileAtts.map((att: any, i: number) => {
                        const url = typeof att === 'string' ? att : att?.url;
                        const name = typeof att === 'string' ? `attachment-${i + 1}` : att?.name || `attachment-${i + 1}`;
                        const size = att?.size ? (att.size / 1024 / 1024).toFixed(2) + ' MB' : '';
                        const mime = (att?.mime || '') as string;

                        // 글쓰기에서 내려준 downloadUrl 우선 → 없으면 쿼리스트링 방식으로 강제 다운로드
                        const downloadUrl = typeof att === 'object' && att?.downloadUrl ? att.downloadUrl : `${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(name)}`;

                        const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(name);

                        return (
                          <li key={`file-${i}`} className="flex items-center justify-between px-3 py-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{name}</div>
                              {size && <div className="text-xs text-muted-foreground">{size}</div>}
                            </div>
                            <div className="flex items-center gap-2">
                              {isPdf && (
                                <a href={url} target="_blank" rel="noreferrer" className="text-sm underline">
                                  미리보기
                                </a>
                              )}
                              <a href={downloadUrl} className="text-sm rounded-full px-3 py-1 bg-black/80 text-white hover:bg-black">
                                다운로드
                              </a>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
              </>
            )}
          </CardContent>
          {lightbox.open && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setLightbox({ open: false, src: '', alt: '' })} role="dialog" aria-modal="true">
              <img src={lightbox.src} alt={lightbox.alt} className="max-h-[85vh] max-w-[90vw] object-contain rounded" />
            </div>
          )}
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
