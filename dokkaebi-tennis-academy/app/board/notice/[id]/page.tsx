'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowUp, Calendar, Eye, FileText, ImageIcon, Download, ExternalLink, Clock, Bell, Pin, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getNoticeCategoryColor, badgeBaseOutlined, badgeSizeSm, attachImageColor, attachFileColor, noticePinColor } from '@/lib/badge-style';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { communityFetch } from '@/lib/community/communityFetch.client';

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  type FetchError = Error & { status?: number; info?: unknown };

  function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
  }

  // /api/boards/:id가 401/403/404를 내려줄 때
  // fetcher가 에러를 던지지 않으면(SWR error 미발생) 화면이 "그냥 비어 보이는" 문제발생
  // -> res.ok / json.ok 를 확인하고, 실패면 throw 해서 error UI가 확실히 뜨게 만듬.
  const boardFetcher = async (url: string) => {
    // 조회수는 GET이 아니라 POST /api/boards/:id/view 에서만 증가
    const res = await fetch(url, { credentials: 'include' });
    const json = await res.json().catch(() => null);

    const okFalse = isRecord(json) && json['ok'] === false;
    if (!res.ok || okFalse) {
      const message = isRecord(json) && typeof json['error'] === 'string' ? json['error'] : 'request_failed';

      const err: FetchError = new Error(message);
      err.status = res.status;
      err.info = json;
      throw err;
    }

    return json;
  };

  // (me 로드는 기존처럼 "에러로 던지지 않는" fetcher 유지)
  const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/boards/${id}` : null, boardFetcher, {
    // 404/401/403 같은 “회복 불가” 에러에서 불필요한 재요청 차단
    shouldRetryOnError: false,
    onErrorRetry: () => {}, // SWR 내부 재시도 로직 자체를 강제 차단
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30_000, // 짧은 시간 중복 요청 방지
  });

  const notice = data?.item;

  // 조회수 +1은 "정석 설계"로 POST /view에서만 처리
  // - 새로고침/재진입 연타는 서버(30분 디듀프)가 막아줌
  // - 클라에서는 동일 id에서 불필요한 POST를 줄이기 위해 1회만 호출
  const viewedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!id) return;
    if (error) return;
    if (!notice?._id) return;
    if (viewedIdRef.current === String(id)) return;
    viewedIdRef.current = String(id);

    (async () => {
      const res = await fetch(`/api/boards/${id}/view`, { method: 'POST', credentials: 'include' });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok === true && typeof json.viewCount === 'number') {
        // 화면에서 조회수 숫자 즉시 반영(추가 GET 없이)
        mutate((prev: any) => (prev?.item ? { ...prev, item: { ...prev.item, viewCount: json.viewCount } } : prev), false);
      }
    })();
  }, [id, error, notice?._id, mutate]);

  // 에러 메시지를 "제목/본문"으로 분리
  const errorTitle = (() => {
    const status = (error as FetchError | undefined)?.status;
    if (status === 404) return '존재하지 않는 공지입니다';
    if (status === 401) return '로그인이 필요합니다';
    if (status === 403) return '열람 권한이 없습니다';
    return '불러오기에 실패했습니다';
  })();

  const errorBody = (() => {
    const status = (error as FetchError | undefined)?.status;
    if (status === 404) return '삭제되었거나 잘못된 주소입니다.';
    if (status === 401) return '로그인 후 다시 시도해주세요.';
    if (status === 403) return '관리자에게 문의해주세요.';
    return '페이지를 새로고침하거나 잠시 후 다시 시도해주세요.';
  })();

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

    const res = await communityFetch(`/api/boards/${notice._id}`, { method: 'DELETE' });
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
    <div className="min-h-screen bg-muted/30">
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <div className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium text-success">고객센터</span>
                <span className="mx-1">›</span>
                <span>공지사항</span>
              </div>

              {/* 공지 목록으로 돌아가기 */}
              <Link
                href="/board/notice"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-full shadow-sm hover:bg-background hover:text-foreground transition-colors dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:border-border"
              >
                <ArrowLeft className="h-4 w-4" />
                공지사항 목록으로 돌아가기
              </Link>
            </div>

            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href="/support">고객센터 홈으로</Link>
            </Button>
          </div>

          <Card className="shadow-xl border-0 bg-card backdrop-blur-sm dark:bg-card">
            <CardHeader className="border-b border-border bg-muted/30">
              <div className="space-y-4">
                {isLoading && (
                  <div className="animate-pulse space-y-3">
                    <div className="h-8 bg-muted rounded-lg w-3/4 dark:bg-card"></div>
                    <div className="h-4 bg-muted rounded w-1/2 dark:bg-card"></div>
                  </div>
                )}
                {error && (
                  <div className="text-center py-8">
                    <div className="text-destructive text-lg font-semibold">{errorTitle}</div>
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/30 shadow-lg flex-shrink-0 mt-1">
                          <Bell className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <h1 className="text-3xl font-bold text-foreground leading-tight">{notice.title}</h1>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
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
                          <span className="font-semibold text-primary">{notice.viewCount ?? 0}</span>
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
              {!isLoading && error && (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">{errorBody}</p>
                </div>
              )}
              {!isLoading && !error && notice && (
                <>
                  <div className="prose prose-lg max-w-none prose-gray dark:prose-invert">
                    <div className="whitespace-pre-line break-words leading-relaxed text-foreground">{String(notice.content || '')}</div>
                  </div>

                  {imageAtts.length > 0 && (
                    <>
                      <Separator className="my-8" />
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-5 w-5" />
                          <h2 className="text-xl font-semibold text-foreground">이미지</h2>
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
                              className="block w-full overflow-hidden rounded-xl border-2 border-border hover:border-border transition-all duration-300 shadow-lg hover:shadow-xl dark:border-border dark:hover:border-border"
                              aria-label="이미지 확대 보기"
                            >
                              <div className="relative">
                                <img
                                  src={(typeof imageAtts[0] === 'string' ? imageAtts[0] : imageAtts[0].url) as string}
                                  alt={(imageAtts[0] as any)?.name || 'image-1'}
                                  className="w-full h-auto max-h-[70vh] object-contain bg-muted/30"
                                />
                                <div className="absolute inset-0 bg-overlay/0 group-hover:bg-overlay/10 transition-colors duration-300 flex items-center justify-center">
                                  <ExternalLink className="h-8 w-8 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                                    className="relative block w-full rounded-lg overflow-hidden border-2 border-border hover:border-border transition-all duration-300 shadow-md hover:shadow-lg dark:border-border dark:hover:border-border"
                                    aria-label={`${name} 이미지 보기`}
                                  >
                                    <img src={url || '/placeholder.svg'} alt={name} className="w-full h-40 object-cover" />
                                    <div className="absolute inset-0 bg-overlay/0 group-hover:bg-overlay/20 transition-colors duration-300 flex items-center justify-center">
                                      <ExternalLink className="h-6 w-6 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                          <FileText className="h-5 w-5" />
                          <h2 className="text-xl font-semibold text-foreground">첨부파일</h2>
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
                                className="flex items-center justify-between p-4 bg-background hover:bg-background dark:bg-card dark:hover:bg-card rounded-lg border border-border transition-colors duration-200"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="flex-shrink-0 w-10 h-10 border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20 rounded-lg flex items-center justify-center">
                                    <FileText className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-foreground truncate">{name}</div>
                                    {size && <div className="text-sm text-muted-foreground">{size}</div>}
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
                                  <Button size="sm" asChild className="bg-muted/30">
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
              <div className="fixed inset-0 z-50 bg-overlay/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightbox({ open: false, src: '', alt: '' })} role="dialog" aria-modal="true">
                <div className="relative max-h-[90vh] max-w-[90vw]">
                  <img src={lightbox.src || '/placeholder.svg'} alt={lightbox.alt} className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl" />
                  <button
                    onClick={() => setLightbox({ open: false, src: '', alt: '' })}
                    className="absolute top-4 right-4 w-10 h-10 bg-overlay/50 hover:bg-overlay/70 text-primary-foreground rounded-full flex items-center justify-center transition-colors duration-200"
                    aria-label="닫기"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <CardFooter className="border-t border-border bg-muted/30 p-6">
              <div className="w-full flex justify-center">
                <Button variant="outline" size="lg" asChild className="px-8 bg-card hover:bg-card dark:hover:bg-card">
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
