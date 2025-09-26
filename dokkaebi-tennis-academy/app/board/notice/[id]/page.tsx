'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowUp, Calendar, Eye, FileText, ImageIcon, Download, ExternalLink, Clock, Bell, Pin, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { getNoticeCategoryColor, badgeBaseOutlined, badgeSizeSm, attachImageColor, attachFileColor, noticePinColor } from '@/lib/badge-style';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
  const { data, error, isLoading } = useSWR(id ? `/api/boards/${id}` : null, fetcher);
  const notice = data?.item;

  // 관리자 정보 로드
  const { data: me } = useSWR('/api/users/me', fetcher);
  const isAdmin = !!(me && (me.isAdmin === true || me.role === 'admin' || (Array.isArray(me.roles) && me.roles.includes('admin'))));

  const onEdit = () => {
    if (!notice?._id) return;
    router.push(`/board/notice/write?id=${notice._id}`);
  };

  const onDelete = async () => {
    if (!notice?._id) return;
    if (!confirm('정말 이 공지를 삭제하시겠습니까?')) return;

    const res = await fetch(`/api/boards/${notice._id}`, { method: 'DELETE', credentials: 'include' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      showErrorToast(json.error ?? '삭제에 실패했습니다.');
      return;
    }
    showSuccessToast('삭제되었습니다.');
    router.replace('/board/notice');
  };

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

  const fmt = (v?: string | Date) =>
    v
      ? new Date(v).toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

  const [lightbox, setLightbox] = useState<{ open: boolean; src: string; alt: string }>({
    open: false,
    src: '',
    alt: '',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              href="/board/notice"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary bg-white/80 hover:bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md dark:bg-gray-800/80 dark:hover:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
            >
              <ArrowLeft className="h-4 w-4" />
              공지사항 목록으로 돌아가기
            </Link>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/50 dark:to-teal-950/50">
              <div className="space-y-4">
                {isLoading && (
                  <div className="animate-pulse space-y-3">
                    <div className="h-8 bg-gray-200 rounded-lg w-3/4 dark:bg-gray-700"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 dark:bg-gray-700"></div>
                  </div>
                )}
                {error && (
                  <div className="text-center py-8">
                    <div className="text-red-500 text-lg font-semibold mb-2">불러오기에 실패했습니다</div>
                    <p className="text-gray-500 text-sm">페이지를 새로고침하거나 잠시 후 다시 시도해주세요.</p>
                  </div>
                )}
                {!isLoading && !error && notice && (
                  <div className="flex items-start justify-between gap-4">
                    {/* 왼쪽: 배지 · 제목 · 메타 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        {notice.isPinned && (
                          <Badge className={`${badgeBaseOutlined} ${badgeSizeSm} ${noticePinColor}`}>
                            <Pin className="h-3 w-3 mr-1" />
                            고정
                          </Badge>
                        )}
                        <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getNoticeCategoryColor(notice.category)} font-medium`}>
                          {notice.category || '일반'}
                        </Badge>
                        {imageAtts.length > 0 && (
                          <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${attachImageColor}`}>
                            <ImageIcon className="h-3 w-3 mr-1" />
                            이미지 {imageAtts.length}개
                          </Badge>
                        )}
                        {fileAtts.length > 0 && (
                          <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${attachFileColor}`}>
                            <FileText className="h-3 w-3 mr-1" />
                            첨부파일 {fileAtts.length}개
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-start gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 shadow-lg flex-shrink-0 mt-1">
                          <Bell className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">{notice.title}</h1>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">작성일</span>
                          <span>{fmt(notice.createdAt)}</span>
                        </div>
                        {notice.updatedAt && notice.updatedAt !== notice.createdAt && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">수정일</span>
                            <span>{fmt(notice.updatedAt)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          <span className="font-medium">조회수</span>
                          <span className="font-semibold text-blue-600">{notice.viewCount ?? 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* 오른쪽: 관리자 액션 */}
                    {isAdmin && (
                      <div className="shrink-0 flex flex-col gap-2">
                        <Button variant="outline" onClick={onEdit}>
                          <Pencil className="h-4 w-4 mr-1" />
                          수정
                        </Button>
                        <Button variant="destructive" onClick={onDelete}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          삭제
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-8 space-y-8">
              {!isLoading && !error && notice && (
                <>
                  <div className="prose prose-lg max-w-none prose-gray dark:prose-invert">
                    <div className="whitespace-pre-line break-words leading-relaxed text-gray-800 dark:text-gray-200">{String(notice.content || '')}</div>
                  </div>

                  {imageAtts.length > 0 && (
                    <>
                      <Separator className="my-8" />
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-5 w-5 text-blue-600" />
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">이미지</h2>
                          <Badge variant="secondary" className="ml-2">
                            {imageAtts.length}개
                          </Badge>
                        </div>

                        {imageAtts.length === 1 ? (
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() =>
                                setLightbox({
                                  open: true,
                                  src: (typeof imageAtts[0] === 'string' ? imageAtts[0] : imageAtts[0].url) as string,
                                  alt: (imageAtts[0] as any)?.name || 'image-1',
                                })
                              }
                              className="block w-full overflow-hidden rounded-xl border-2 border-gray-200 hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl dark:border-gray-700 dark:hover:border-blue-400"
                              aria-label="이미지 확대 보기"
                            >
                              <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={(typeof imageAtts[0] === 'string' ? imageAtts[0] : imageAtts[0].url) as string}
                                  alt={(imageAtts[0] as any)?.name || 'image-1'}
                                  className="w-full h-auto max-h-[70vh] object-contain bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                                  <ExternalLink className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                              </div>
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {imageAtts.map((att: any, i: number) => {
                              const url = typeof att === 'string' ? att : att?.url;
                              const name = typeof att === 'string' ? `image-${i + 1}` : att?.name || `image-${i + 1}`;
                              return (
                                <div key={`img-${i}`} className="relative group">
                                  <button
                                    type="button"
                                    onClick={() => setLightbox({ open: true, src: url, alt: name })}
                                    className="relative block w-full rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all duration-300 shadow-md hover:shadow-lg dark:border-gray-700 dark:hover:border-blue-400"
                                    aria-label={`${name} 이미지 보기`}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url || '/placeholder.svg'} alt={name} className="w-full h-40 object-cover" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                                      <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    </div>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    </>
                  )}

                  {fileAtts.length > 0 && (
                    <>
                      <Separator className="my-8" />
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">첨부파일</h2>
                          <Badge variant="secondary" className="ml-2">
                            {fileAtts.length}개
                          </Badge>
                        </div>

                        <div className="grid gap-3">
                          {fileAtts.map((att: any, i: number) => {
                            const url = typeof att === 'string' ? att : att?.url;
                            const name = typeof att === 'string' ? `attachment-${i + 1}` : att?.name || `attachment-${i + 1}`;
                            const size = att?.size ? (att.size / 1024 / 1024).toFixed(2) + ' MB' : '';
                            const mime = (att?.mime || '') as string;
                            const downloadUrl = typeof att === 'object' && att?.downloadUrl ? att.downloadUrl : `${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(name)}`;
                            const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(name);

                            return (
                              <div
                                key={`file-${i}`}
                                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-gray-900 dark:text-white truncate">{name}</div>
                                    {size && <div className="text-sm text-gray-500 dark:text-gray-400">{size}</div>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {isPdf && (
                                    <Button variant="outline" size="sm" asChild>
                                      <a href={url} target="_blank" rel="noreferrer">
                                        <ExternalLink className="h-4 w-4 mr-1" />
                                        미리보기
                                      </a>
                                    </Button>
                                  )}
                                  <Button size="sm" asChild className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700">
                                    <a href={downloadUrl}>
                                      <Download className="h-4 w-4 mr-1" />
                                      다운로드
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    </>
                  )}
                </>
              )}
            </CardContent>

            {lightbox.open && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightbox({ open: false, src: '', alt: '' })} role="dialog" aria-modal="true">
                <div className="relative max-h-[90vh] max-w-[90vw]">
                  <img src={lightbox.src || '/placeholder.svg'} alt={lightbox.alt} className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl" />
                  <button
                    onClick={() => setLightbox({ open: false, src: '', alt: '' })}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors duration-200"
                    aria-label="닫기"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <CardFooter className="border-t border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50/50 to-teal-50/50 dark:from-blue-950/20 dark:to-teal-950/20 p-6">
              <div className="w-full flex justify-center">
                <Button variant="outline" size="lg" asChild className="px-8 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800">
                  <Link href="/board/notice">
                    <ArrowUp className="mr-2 h-4 w-4" />
                    목록으로 돌아가기
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
