'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowUp, MessageCircle, Pencil, Trash2, Calendar, Eye, CheckCircle, AlertCircle, FileText, ExternalLink, MessageSquare, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { badgeBaseOutlined, badgeSizeSm, getQnaCategoryColor, getAnswerStatusColor } from '@/lib/badge-style';
import type { BoardPost } from '@/lib/types/board';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

type QnaItem = BoardPost & { type: 'qna' };

export default function QnaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/boards/${id}` : null, fetcher);
  const qna = data?.item as QnaItem | undefined;

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

  // 로그인 사용자 정보
  const meRes = useSWR(`/api/users/me`, (url: string) => fetch(url, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)));
  const me = meRes.data;
  const isAdmin = me?.role === 'admin';
  const isAuthor = me?.sub && qna?.authorId && String(me.sub) === String(qna.authorId);
  const [answerText, setAnswerText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // 답변 "작성/수정" 상태에서만 dirty 판단
  const answerBaseline = qna?.answer?.content ?? '';
  const isAnswerDirty = useMemo(() => {
    // 답변 작성(아직 답변 없음)
    if (isAdmin && qna && !qna.answer) return answerText.trim().length > 0;
    // 답변 수정(편집 모드)
    if (isAdmin && qna?.answer && isEditing) return answerText !== answerBaseline;
    return false;
  }, [answerText, isAdmin, isEditing, qna, answerBaseline]);

  useUnsavedChangesGuard(isAnswerDirty);

  const confirmLeave = (e: React.MouseEvent) => {
    if (!isAnswerDirty) return;
    if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const [lightbox, setLightbox] = useState<{ open: boolean; src: string; alt: string }>({
    open: false,
    src: '',
    alt: '',
  });

  async function handleDelete() {
    if (!qna?._id) return;
    if (!confirm('정말 삭제할까요?')) return;
    const res = await fetch(`/api/boards/${qna._id}`, { method: 'DELETE', credentials: 'include' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      alert('삭제 실패');
      return;
    }
    router.replace('/board/qna');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-teal-600 dark:text-teal-400">고객센터</span>
                <span className="mx-1">›</span>
                <span>Q&amp;A</span>
              </div>

              {/* Q&A 목록으로 돌아가기 */}
              <Link
                href="/board/qna"
                onClick={confirmLeave}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white/80 border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors dark:bg-gray-800/80 dark:text-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Q&amp;A 목록으로 돌아가기
              </Link>
            </div>

            {/* 고객센터 홈으로 이동 버튼 */}
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href="/support" onClick={confirmLeave}>
                고객센터 홈으로
              </Link>
            </Button>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/50 dark:to-cyan-950/50">
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
                {!isLoading && !error && qna && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getQnaCategoryColor(qna.category)} font-medium`}>
                          {qna.category ?? '일반문의'}
                        </Badge>
                        {qna.isSecret && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Lock className="h-3 w-3" /> 비밀글
                          </Badge>
                        )}
                        {qna.productRef?.productId && (
                          <Link href={`/products/${qna.productRef.productId}`}>
                            <Badge variant="secondary" className="hover:bg-primary/20 transition-colors duration-200">
                              상품: {qna.productRef.name ?? '상품'}
                            </Badge>
                          </Link>
                        )}
                      </div>
                      <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getAnswerStatusColor(!!qna.answer)} font-medium`}>
                        {qna.answer ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            답변 완료
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            답변 대기
                          </>
                        )}
                      </Badge>
                    </div>

                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg flex-shrink-0 mt-1">
                        <MessageSquare className="h-5 w-5 text-white" />
                      </div>
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">{qna.title}</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 border-2 border-gray-200 dark:border-gray-700">
                          <AvatarFallback className="text-xs font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">{(qna.authorName ?? '익명').slice(0, 1)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{qna.authorName ?? '익명'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">작성일</span>
                        <span>{fmt(qna.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span className="font-medium">조회수</span>
                        <span className="font-semibold text-teal-600">{qna.viewCount ?? 0}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              {!isLoading && !error && qna && (
                <>
                  <div className="prose prose-lg max-w-none prose-gray dark:prose-invert">
                    <div className="whitespace-pre-line break-words leading-relaxed text-gray-800 dark:text-gray-200">{String(qna.content || '')}</div>
                  </div>

                  {Array.isArray(qna.attachments) && qna.attachments.length > 0 && (
                    <>
                      <Separator className="my-6" />
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-teal-600" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">첨부파일</h3>
                          <Badge variant="secondary">{qna.attachments.length}개</Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {qna.attachments.map((att: any, i: number) => {
                            const url = typeof att === 'string' ? att : att?.url;
                            const name = typeof att === 'string' ? `attachment-${i}` : att?.name || `attachment-${i}`;
                            if (!url) return null;
                            const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);

                            return isImage ? (
                              <div key={i} className="relative group">
                                <button
                                  type="button"
                                  onClick={() => setLightbox({ open: true, src: url, alt: name })}
                                  className="relative block w-full rounded-lg overflow-hidden border-2 border-gray-200 hover:border-teal-500 transition-all duration-300 shadow-md hover:shadow-lg dark:border-gray-700 dark:hover:border-teal-400"
                                >
                                  <img src={url || '/placeholder.svg'} alt={name} className="w-full h-32 object-cover" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                                    <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                  </div>
                                </button>
                              </div>
                            ) : (
                              <div key={i} className="p-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200">
                                <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-500 font-medium break-all">
                                  <FileText className="h-4 w-4 flex-shrink-0" />
                                  {name}
                                </a>
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

            {(isAuthor || isAdmin) && qna && (
              <CardFooter className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 bg-gradient-to-r from-teal-50/50 to-cyan-50/50 dark:from-teal-950/20 dark:to-cyan-950/20 p-6">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/board/qna/write?id=${qna._id}`} onClick={confirmLeave}>
                    <Pencil className="mr-2 h-4 w-4" />
                    수정
                  </Link>
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </Button>
              </CardFooter>
            )}
          </Card>

          {isAdmin && qna && !qna.answer && (
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-teal-50/50 to-cyan-50/50 dark:from-teal-950/20 dark:to-cyan-950/20">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-teal-600" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">관리자 답변 작성</h2>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="답변 내용을 입력하세요"
                  className="min-h-[140px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-teal-500 focus:ring-teal-500"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={async () => {
                      const res = await fetch(`/api/boards/${qna._id}/answer`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ content: answerText }),
                      });
                      const j = await res.json().catch(() => ({}));
                      if (!res.ok || !j?.ok) return alert('등록 실패');
                      setAnswerText('');
                      await mutate();
                    }}
                    disabled={!answerText.trim()}
                    className="px-6 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                  >
                    답변 등록
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {qna?.answer && (
            <Card className="shadow-lg border-2 border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50/80 to-cyan-50/80 dark:from-teal-950/30 dark:to-cyan-950/30 backdrop-blur-sm">
              <CardHeader className="border-b border-teal-200 dark:border-teal-800 bg-gradient-to-r from-teal-100/50 to-cyan-100/50 dark:from-teal-950/50 dark:to-cyan-950/50">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center">
                        <MessageCircle className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">관리자 답변</h2>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        답변 완료
                      </Badge>
                    </div>
                    {isAdmin && !isEditing && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAnswerText(qna.answer?.content ?? '');
                            setIsEditing(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            if (!confirm('답변을 삭제할까요?')) return;
                            const res = await fetch(`/api/boards/${qna._id}/answer`, {
                              method: 'DELETE',
                              credentials: 'include',
                            });
                            const j = await res.json().catch(() => ({}));
                            if (!res.ok || !j?.ok) return alert('삭제 실패');
                            setAnswerText('');
                            setIsEditing(false);
                            await mutate();
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          삭제
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border border-teal-300 dark:border-teal-700">
                        <AvatarFallback className="text-xs font-medium bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">{(qna.answer.authorName ?? '관리자').slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{qna.answer.authorName ?? '관리자'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">답변일</span>
                      <span>{fmt(qna.answer.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {!isEditing ? (
                  <div className="prose prose-lg max-w-none prose-gray dark:prose-invert">
                    <div className="whitespace-pre-line break-words leading-relaxed text-gray-800 dark:text-gray-200">{String(qna.answer.content || '')}</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} className="min-h-[140px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-teal-500 focus:ring-teal-500" />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        취소
                      </Button>
                      <Button
                        onClick={async () => {
                          const res = await fetch(`/api/boards/${qna._id}/answer`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ content: answerText }),
                          });
                          const j = await res.json().catch(() => ({}));
                          if (!res.ok || !j?.ok) return alert('수정 실패');
                          setIsEditing(false);
                          await mutate();
                        }}
                        className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                      >
                        저장
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between items-center pt-4">
            <Button variant="outline" size="lg" asChild className="px-8 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800">
              <Link href="/board/qna" onClick={confirmLeave}>
                <ArrowUp className="mr-2 h-4 w-4" />
                목록으로 돌아가기
              </Link>
            </Button>
            <Button size="lg" asChild className="px-8 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">
              <Link href="/board/qna/write" onClick={confirmLeave}>
                <MessageCircle className="mr-2 h-4 w-4" />새 문의하기
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
