'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, MessageSquare, ThumbsUp, FileText } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { CommunityComment, CommunityPost } from '@/lib/types/community';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';

type Props = {
  id: string;
};

type DetailResponse = { ok: true; item: CommunityPost } | { ok: false; error: string };

// 댓글 목록 응답 타입
type CommentsResponse = { ok: true; items: CommunityComment[]; total: number; page: number; limit: number } | { ok: false; error: string };

// 제네릭 없이 공용으로 쓰는 fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) {
    // SWR의 error 에 그대로 전달
    throw data;
  }
  return data;
};

const fmtDateTime = (v: string | Date) =>
  new Date(v).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

function getCategoryLabel(category?: string | null) {
  switch (category) {
    case 'general':
      return '자유';
    case 'info':
      return '정보';
    case 'question':
      return '질문';
    case 'tip':
      return '노하우';
    case 'etc':
      return '기타';
    default:
      return '분류 없음';
  }
}
function getCategoryBadgeClasses(category?: string | null) {
  switch (category) {
    case 'general':
      return 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300';
    case 'info':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'question':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case 'tip':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
    case 'etc':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200';
    default:
      return 'bg-gray-100 text-gray-500 dark:bg-gray-800/60 dark:text-gray-300';
  }
}

function DetailSkeleton() {
  return (
    <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="h-4 w-9/12" />
      </CardContent>
    </Card>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/60">{message}</div>;
}

export default function FreeBoardDetailClient({ id }: Props) {
  const router = useRouter();
  const { user } = useCurrentUser(); // 현재 로그인 사용자
  const [isDeleting, setIsDeleting] = useState(false); // 삭제 중 플래그
  const [isLiking, setIsLiking] = useState(false); // 추천(좋아요) 처리 중 플래그

  // 리폿
  const [openReport, setOpenReport] = useState(false);
  const [reason, setReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // 조회수 중복 방지 TTL (24시간)
  const VIEW_TTL_MS = 1000 * 60 * 60 * 24;

  const { data, error, isLoading, mutate } = useSWR<DetailResponse>(`/api/community/posts/${id}`, fetcher);

  const item = data && data.ok ? data.item : null;

  // 첨부파일 (자유게시판은 현재 파일만 저장되지만, 타입이 배열인지 한 번 더 안전하게 체크)
  const attachments = Array.isArray(item?.attachments) ? item!.attachments : [];

  // 조회수 처리: 비로그인 = localStorage TTL, 로그인 = 서버(userId 기준)에서 중복 방지
  useEffect(() => {
    if (!item) return;
    if (typeof window === 'undefined') return;

    const isLoggedIn = !!user; // useCurrentUser()에서 가져온 user

    const now = Date.now();

    // 1) 비로그인 사용자: 브라우저(localStorage) 기준 24시간 1회
    if (!isLoggedIn) {
      const key = `viewed_post_${item.id}`;

      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as { ts: number };
            if (parsed && typeof parsed.ts === 'number') {
              if (now - parsed.ts < VIEW_TTL_MS) {
                // TTL 이내면 /view 호출 없이 종료
                return;
              }
            }
          } catch {
            // JSON 파싱 실패 시에는 아래에서 새로 기록
          }
        }

        // TTL이 지났거나 기록이 없으면 /view 호출
        (async () => {
          try {
            const res = await fetch(`/api/community/posts/${item.id}/view`, {
              method: 'POST',
              credentials: 'include',
            });

            const json = await res.json().catch(() => null);

            if (res.ok && json && typeof json.views === 'number') {
              // 조회수 증가 성공 시, localStorage에 시간 기록
              window.localStorage.setItem(key, JSON.stringify({ ts: now }));

              // SWR 캐시도 같이 업데이트해서 화면에 즉시 반영
              mutate((prev) => {
                if (!prev || !prev.ok || !prev.item) return prev;

                return {
                  ...prev,
                  item: {
                    ...prev.item,
                    views: json.views,
                  },
                };
              }, false);
            }
          } catch (err) {
            console.error('failed to increase view (guest)', err);
          }
        })();
      } catch (err) {
        console.error('localStorage error', err);
      }

      return;
    }

    // 2) 로그인 사용자: localStorage는 쓰지 않고,
    //    항상 /view 호출 → 서버에서 userId 기준으로 중복 방지
    (async () => {
      try {
        const res = await fetch(`/api/community/posts/${item.id}/view`, {
          method: 'POST',
          credentials: 'include',
        });

        const json = await res.json().catch(() => null);

        // 서버가 views 를 돌려주면, 화면에도 즉시 반영
        if (res.ok && json && typeof json.views === 'number') {
          mutate((prev) => {
            if (!prev || !prev.ok || !prev.item) return prev;
            return {
              ...prev,
              item: {
                ...prev.item,
                views: json.views,
              },
            };
          }, false);
        }
      } catch (err) {
        console.error('failed to increase view (member)', err);
      }
    })();
  }, [item?.id, user, mutate, VIEW_TTL_MS]);

  const isNotFound = (error as any)?.error === 'not_found';

  const isAuthor = !!user && !!item?.userId && user.id === item.userId;

  // 댓글 입력 폼 상태
  const [commentContent, setCommentContent] = useState('');
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // 댓글 목록 SWR (게시글이 로드된 후에만 요청)
  const { data: commentsData, isLoading: isCommentsLoading, mutate: mutateComments } = useSWR<CommentsResponse>(item ? `/api/community/posts/${id}/comments` : null, fetcher);

  const comments = commentsData && commentsData.ok ? commentsData.items : [];

  const totalComments = commentsData && commentsData.ok ? commentsData.total : item?.commentsCount ?? 0;

  // 댓글 작성 핸들러
  const handleSubmitComment = async () => {
    if (!item) return;

    if (!user) {
      alert('로그인 후 댓글을 작성할 수 있습니다.');
      return;
    }

    if (!commentContent.trim()) {
      setCommentError('댓글 내용을 입력해 주세요.');
      return;
    }

    try {
      setIsCommentSubmitting(true);
      setCommentError(null);

      const res = await fetch(`/api/community/posts/${item.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: commentContent.trim() }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        const msg = json?.details?.[0]?.message ?? json?.error ?? '댓글 작성에 실패했습니다. 잠시 후 다시 시도해 주세요.';
        setCommentError(msg);
        return;
      }

      // 입력창 초기화
      setCommentContent('');

      // 댓글 목록만 재검증하면 충분
      await mutateComments();
    } catch (err) {
      console.error(err);
      setCommentError('알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  // 댓글 수정 모드 진입
  const startEditComment = (commentId: string, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditingContent(currentContent);
    setCommentError(null);
  };

  // 댓글 수정 모드 취소
  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  // 댓글 수정 저장
  const handleUpdateComment = async (commentId: string) => {
    if (!editingContent.trim()) {
      setCommentError('댓글 내용을 입력해 주세요.');
      return;
    }

    try {
      setIsCommentSubmitting(true);
      setCommentError(null);

      const res = await fetch(`/api/community/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: editingContent.trim() }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        const msg = json?.details?.[0]?.message ?? json?.error ?? '댓글 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.';
        setCommentError(msg);
        return;
      }

      // 수정 모드 종료
      setEditingCommentId(null);
      setEditingContent('');

      // 댓글 목록만 재검증 (게시글 메타는 그대로)
      await mutateComments();
    } catch (err) {
      console.error(err);
      setCommentError('알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('이 댓글을 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      setIsCommentSubmitting(true);
      setCommentError(null);

      const res = await fetch(`/api/community/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        const msg = json?.error ?? '댓글 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.';
        setCommentError(msg);
        return;
      }

      // 댓글 목록만 재검증하면 충분
      await mutateComments();
    } catch (err) {
      console.error(err);
      setCommentError('알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    if (!item) return;
    if (isDeleting) return;

    const confirmed = window.confirm('정말로 이 게시글을 삭제하시겠습니까? 되돌릴 수 없습니다.');
    if (!confirmed) return;

    try {
      setIsDeleting(true);

      const res = await fetch(`/api/community/posts/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.error === 'forbidden' ? '본인이 작성한 글만 삭제할 수 있습니다.' : data?.error === 'unauthorized' ? '로그인이 필요합니다.' : '글 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.';

        alert(msg);
        return;
      }

      // 삭제 성공 - 목록으로 이동
      router.push('/board/free');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 추천(좋아요) 토글 핸들러
  const handleToggleLike = async () => {
    if (!item) return;

    // 비회원이면 알림 후 종료
    if (!user) {
      alert('로그인 후에 추천할 수 있습니다.');
      return;
    }

    // 중복 클릭 방지
    if (isLiking) return;

    try {
      setIsLiking(true);

      const res = await fetch(`/api/community/posts/${item.id}/like`, {
        method: 'POST',
        credentials: 'include',
      });

      const json = (await res.json().catch(() => null)) as { ok: true; liked: boolean; likes: number } | { ok: false; error?: string } | null;

      if (!res.ok || !json || !('ok' in json) || !json.ok) {
        const msg = (json as any)?.error ?? '추천 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';
        alert(msg);
        return;
      }

      // SWR 캐시 갱신 (likes, likedByMe만 업데이트)
      await mutate(
        (prev) => {
          if (!prev || !prev.ok) return prev;
          return {
            ...prev,
            item: {
              ...prev.item,
              likes: json.likes,
              likedByMe: json.liked,
            },
          };
        },
        false // 재요청 없이 로컬 캐시만 갱신
      );
    } catch (err) {
      console.error(err);
      alert('알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLiking(false);
    }
  };

  // 리폿 핸들러
  async function handleSubmitReport() {
    // 게시글이 아직 로드 안 된 경우 방어
    if (!item) return;

    if (reason.trim().length < 10) {
      showErrorToast('신고 사유는 최소 10자 이상 입력해야 합니다.');
      return;
    }

    try {
      setIsReporting(true);

      const res = await fetch(`/api/community/posts/${item.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          showErrorToast('이미 최근에 신고한 게시글입니다.');
        } else {
          showErrorToast('신고 처리 중 오류가 발생했습니다.');
        }
        return;
      }

      showSuccessToast('신고가 접수되었습니다.');
      setReason('');
      setOpenReport(false);
    } catch (error) {
      console.error(error);
      showErrorToast('신고 처리 중 오류가 발생했습니다.');
    } finally {
      setIsReporting(false);
    }
  }
  // 첨부파일 강제 다운로드 핸들러
  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('다운로드 요청이 실패했습니다.');
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'attachment';
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert('파일 다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 상단 헤더 (브레드크럼 + 버튼) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-teal-600 dark:text-teal-400">게시판</span>
              <span className="mx-1">›</span>
              <Link href="/board/free" className="text-gray-500 underline-offset-2 hover:underline dark:text-gray-300">
                자유 게시판
              </Link>
              <span className="mx-1">›</span>
              <span>글 상세</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">자유 게시판 글 상세</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 md:text-base">자유 게시판에 작성된 글의 상세 내용을 확인할 수 있습니다.</p>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              <span>이전으로</span>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/board/free">목록으로</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/board">게시판 홈</Link>
            </Button>
          </div>
        </div>

        {/* 본문 카드 */}
        {isLoading && <DetailSkeleton />}

        {!isLoading && error && (
          <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
            <CardContent className="p-6 space-y-4">
              <ErrorBox message={isNotFound ? '해당 글을 찾을 수 없습니다. 삭제되었거나 주소가 잘못되었을 수 있습니다.' : '글을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'} />
              <div className="flex justify-end gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/board/free">목록으로</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/board/free/write">새 글 작성하기</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && item && (
          <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
            <CardHeader className="space-y-3 border-b bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-900/40">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <CardTitle className="text-base md:text-lg">
                    {typeof item.postNo === 'number' && <span className="mr-2 text-sm font-semibold tabular-nums text-gray-400 dark:text-gray-500">{item.postNo}</span>}

                    {/* 카테고리 뱃지 */}
                    <span
                      className={`
      mr-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5
      text-[11px] font-semibold
      ${getCategoryBadgeClasses(item.category)}
    `}
                    >
                      {getCategoryLabel(item.category)}
                    </span>

                    {item.title}
                  </CardTitle>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 md:text-sm">
                    {/* 작성자 */}
                    <span className="font-medium">{item.nickname || '회원'}</span>
                    <span>·</span>

                    {/* 조회수 */}
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      조회 {item.views ?? 0}
                    </span>
                    <span>·</span>

                    {/* 댓글 수 */}
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      댓글 {item.commentsCount ?? 0}
                    </span>
                    <span>·</span>

                    {/* 추천 수 */}
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      추천 {item.likes ?? 0}
                    </span>
                    <span>·</span>
                    {/* 작성일시 */}
                    <span>{fmtDateTime(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* 이미지 영역 - 인라인 표시 + 클릭 시 새창에서 원본 보기 */}
              {item.images && item.images.length > 0 && (
                <div className="mb-6 space-y-4">
                  {item.images.map((url, idx) => (
                    <div key={url + idx} className="flex justify-center">
                      <button type="button" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')} className="relative block w-full max-w-3xl overflow-hidden rounded-xl bg-white dark:bg-neutral-900 hover:bg-white transition">
                        <Image src={url} alt={`첨부 이미지 ${idx + 1}`} width={1200} height={800} className="w-full h-auto max-h-[560px] object-contain bg-white dark:bg-neutral-900" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 본문 */}
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-100">{item.content}</div>

              {/* 첨부파일 */}
              {attachments.length > 0 && (
                <div className="mt-8 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">첨부파일</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{attachments.length}개</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {attachments.map((att, index) => {
                      const url = typeof att === 'string' ? att : att.url;
                      const name = typeof att === 'string' ? `attachment-${index + 1}` : att.name || `attachment-${index + 1}`;
                      const size = typeof att === 'object' && att.size ? `${(att.size / 1024 / 1024).toFixed(2)} MB` : '';

                      if (!url) return null;

                      return (
                        <div key={`${url}-${index}`} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-900/30">
                              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-gray-900 dark:text-gray-50" title={name}>
                                {name}
                              </div>
                              {size && <div className="text-[11px] text-gray-500 dark:text-gray-400">{size}</div>}
                            </div>
                          </div>

                          <Button type="button" variant="outline" size="sm" className="ml-3 flex-shrink-0" onClick={() => handleDownload(url, name)}>
                            다운로드
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-gray-500 dark:text-gray-400">
                <span>게시글 이용 시 커뮤니티 가이드를 준수해 주세요. 신고가 반복되는 경우 글이 숨김 처리될 수 있습니다.</span>

                <div className="flex flex-wrap items-center gap-2">
                  {item && (
                    <Button type="button" variant={item.likedByMe ? 'default' : 'outline'} size="sm" onClick={handleToggleLike} disabled={isLiking} className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {isLiking ? '처리 중...' : item.likedByMe ? `추천 취소 (${item.likes ?? 0})` : `추천 (${item.likes ?? 0})`}
                    </Button>
                  )}

                  <Dialog open={openReport} onOpenChange={setOpenReport}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                        신고하기
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>이 게시글을 신고하시겠습니까?</DialogTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400">허위 신고 또는 악의적 신고는 이용 제한 대상이 될 수 있습니다.</p>
                      </DialogHeader>

                      <Textarea placeholder="신고 사유를 구체적으로 작성해주세요. (최소 10자)" value={reason} onChange={(e) => setReason(e.target.value)} className="h-32" disabled={isReporting} />

                      <DialogFooter className="gap-2 sm:justify-end">
                        <Button type="button" variant="outline" onClick={() => setOpenReport(false)} disabled={isReporting}>
                          취소
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleSubmitReport} disabled={isReporting}>
                          {isReporting ? '신고 중...' : '신고하기'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  {isAuthor && (
                    <>
                      <Button type="button" variant="outline" size="sm" onClick={() => router.push(`/board/free/${item.id}/edit`)}>
                        수정
                      </Button>

                      <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? '삭제 중...' : '삭제'}
                      </Button>
                    </>
                  )}

                  <Button asChild variant="outline" size="sm">
                    <Link href="/board/free">목록으로</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/board/free/write">새 글 작성</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* ================== 댓글 카드 시작 ================== */}
        {!isLoading && !error && item && (
          <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
            <CardHeader className="space-y-1 border-b border-gray-100 pb-4 dark:border-gray-800">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-50">
                <MessageSquare className="h-4 w-4 text-teal-500" />
                <span>댓글</span>
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{totalComments}개</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              {/* 댓글 입력 영역 */}
              <div className="space-y-2">
                <Label htmlFor="comment">댓글 쓰기</Label>
                {user ? (
                  <>
                    <Textarea id="comment" className="min-h-[80px]" placeholder="예의 있는 댓글 문화를 지켜주세요." value={commentContent} onChange={(e) => setCommentContent(e.target.value)} disabled={isCommentSubmitting} />
                    {commentError && <p className="mt-1 text-xs text-red-600 dark:text-red-300">{commentError}</p>}
                    <div className="mt-2 flex justify-end">
                      <Button type="button" size="sm" className="gap-2" disabled={isCommentSubmitting} onClick={handleSubmitComment}>
                        {isCommentSubmitting && <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />}
                        <span>등록</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">로그인 후 댓글을 작성할 수 있습니다.</div>
                )}
              </div>

              {/* 구분선 */}
              <div className="h-px bg-gray-100 dark:bg-gray-800" />

              {/* 댓글 리스트 영역 */}
              <div className="space-y-4">
                {isCommentsLoading && (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                )}

                {!isCommentsLoading && comments.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">아직 등록된 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>}

                {!isCommentsLoading && comments.length > 0 && (
                  <ul className="space-y-4">
                    {comments.map((c) => {
                      const isCommentAuthor = !!user && !!c.userId && user.id === c.userId;

                      const isEditing = editingCommentId === c.id;

                      return (
                        <li key={c.id} className="space-y-1 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900/60">
                          <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-medium text-gray-700 dark:text-gray-200">{c.nickname ?? '회원'}</span>
                            <div className="flex items-center gap-2">
                              <span>
                                {new Date(c.createdAt).toLocaleString('ko-KR', {
                                  year: '2-digit',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {isCommentAuthor && (
                                <div className="flex items-center gap-1">
                                  {!isEditing && (
                                    <>
                                      <button type="button" className="text-[11px] text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100" onClick={() => startEditComment(c.id, c.content)}>
                                        수정
                                      </button>
                                      <span className="text-gray-300">|</span>
                                      <button type="button" className="text-[11px] text-red-500 hover:text-red-600" onClick={() => handleDeleteComment(c.id)}>
                                        삭제
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 내용 영역: 편집 중이면 Textarea, 아니면 그냥 텍스트 */}
                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea className="min-h-[60px]" value={editingContent} onChange={(e) => setEditingContent(e.target.value)} disabled={isCommentSubmitting} />
                              <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={cancelEditComment} disabled={isCommentSubmitting}>
                                  취소
                                </Button>
                                <Button type="button" size="sm" onClick={() => handleUpdateComment(c.id)} disabled={isCommentSubmitting}>
                                  저장
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100">{c.content}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
