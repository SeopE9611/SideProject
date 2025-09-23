'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowUp, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { badgeBaseOutlined, badgeSizeSm, getQnaCategoryColor, getAnswerStatusColor } from '@/lib/badge-style';
import type { BoardPost } from '@/lib/types/board';

type QnaItem = BoardPost & { type: 'qna' };

export default function QnaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/boards/${id}` : null, fetcher);
  const qna = data?.item as QnaItem | undefined;
  const fmt = (v?: string | Date) => (v ? new Date(v).toLocaleString() : '');

  // 로그인 사용자 정보
  const meRes = useSWR(`/api/users/me`, (url: string) => fetch(url, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)));
  const me = meRes.data;
  const isAdmin = me?.role === 'admin';
  const isAuthor = me?.sub && qna?.authorId && String(me.sub) === String(qna.authorId);
  const [answerText, setAnswerText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [lightbox, setLightbox] = useState<{ open: boolean; src: string; alt: string }>({ open: false, src: '', alt: '' });

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
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link href="/board/qna" className="inline-flex items-center text-primary hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Q&A 목록으로 돌아가기
          </Link>
        </div>

        {/* 질문 카드 */}
        <Card className="mb-6">
          <CardHeader className="border-b p-6">
            <div className="space-y-2">
              {isLoading && <h1 className="text-2xl font-bold">불러오는 중…</h1>}
              {error && <h1 className="text-2xl font-bold text-red-500">불러오기에 실패했습니다</h1>}
              {!isLoading && !error && qna && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getQnaCategoryColor(qna.category)}`}>
                        {qna.category ?? '일반문의'}
                      </Badge>
                      {qna.productRef?.productId && (
                        <Link href={`/products/${qna.productRef.productId}`}>
                          <Badge variant="secondary">상품: {qna.productRef.name ?? '상품'}</Badge>
                        </Link>
                      )}
                    </div>
                    <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getAnswerStatusColor(!!qna.answer)}`}>
                      {qna.answer ? '답변 완료' : '답변 대기'}
                    </Badge>
                  </div>
                  <h1 className="text-2xl font-bold">{qna.title}</h1>
                  <div className="flex flex-wrap items-center gap-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>{(qna.authorName ?? '익명').slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <span>{qna.authorName ?? '익명'}</span>
                    </div>
                    <div>작성일: {fmt(qna.createdAt)}</div>
                    <div>조회수: {qna.viewCount ?? 0}</div>
                  </div>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {!isLoading && !error && (
              <>
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: String(qna?.content || '').replace(/\n/g, '<br/>') }} />

                {/* 첨부 그리드 */}
                {Array.isArray(qna?.attachments) && qna.attachments.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {qna.attachments.map((att: any, i: number) => {
                      const url = typeof att === 'string' ? att : att?.url;
                      const name = typeof att === 'string' ? `attachment-${i}` : att?.name || `attachment-${i}`;
                      if (!url) return null;
                      const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
                      return isImage ? (
                        <button key={i} type="button" onClick={() => setLightbox({ open: true, src: url, alt: name })} className="block rounded-md overflow-hidden border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={name} className="w-full h-40 object-cover" />
                        </button>
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
          {lightbox.open && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setLightbox({ open: false, src: '', alt: '' })} role="dialog" aria-modal="true">
              <img src={lightbox.src} alt={lightbox.alt} className="max-h-[85vh] max-w-[90vw] object-contain rounded" />
            </div>
          )}
          {(isAuthor || isAdmin) && qna && (
            <CardFooter className="flex justify-end gap-2 border-t p-6">
              {/* 수정 라우트가 준비되면 href 교체 */}
              <Button variant="outline" size="sm" asChild>
                <Link href={`/board/qna/write?id=${qna._id}`}>
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

        {/* 관리자 답변 전용 카드(답변 없는 경우에만 등록용 에디터 노출) */}
        {isAdmin && qna && !qna.answer && (
          <Card className="mb-6">
            <CardHeader className="border-b p-6">
              <div className="text-lg font-semibold">관리자 답변</div>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <Textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} placeholder="답변 내용을 입력하세요" className="min-h-[140px] bg-white dark:bg-gray-700" />
              <div className="flex gap-2">
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
                >
                  등록
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 답변 카드 */}
        {qna?.answer && (
          <Card className="mb-6 border-primary">
            <CardHeader className="border-b p-6 bg-primary/5">
              <div className="space-y-2">
                <div className="flex items-center">
                  <MessageCircle className="mr-2 h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">답변</h2>
                  <div className="ml-auto flex items-center gap-2">
                    {isAdmin && !isEditing && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setAnswerText(qna.answer?.content ?? '');
                            setIsEditing(true);
                          }}
                        >
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            if (!confirm('답변을 삭제할까요?')) return;
                            const res = await fetch(`/api/boards/${qna._id}/answer`, { method: 'DELETE', credentials: 'include' });
                            const j = await res.json().catch(() => ({}));
                            if (!res.ok || !j?.ok) return alert('삭제 실패');
                            setAnswerText('');
                            setIsEditing(false);
                            await mutate();
                          }}
                        >
                          삭제
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>{(qna.answer.authorName ?? '관리자').slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <span>{qna.answer.authorName ?? '관리자'}</span>
                  </div>
                  <div>작성일: {fmt(qna.answer.createdAt)}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {!isEditing ? (
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: qna.answer.content }} />
              ) : (
                <div className="space-y-3">
                  <Textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} className="min-h-[140px] bg-white dark:bg-gray-700" />
                  <div className="flex gap-2">
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
                    >
                      저장
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      취소
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 하단 버튼 */}
        <div className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/board/qna">
              <ArrowUp className="mr-2 h-4 w-4" />
              목록
            </Link>
          </Button>
          <Button asChild>
            <Link href="/board/qna/write">문의하기</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
