'use client';

import { ArrowLeft, Eye, FileText, MessageSquare, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';

import type { BoardTypeConfig } from '@/app/board/_components/board-config';
import { getCategoryBadgeText } from '@/app/board/_components/board-config';
import ErrorBox from '@/app/board/_components/ErrorBox';
import MessageComposeDialog from '@/app/messages/_components/MessageComposeDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { badgeSizeSm, getBoardCategoryTone } from '@/lib/badge-style';
import { communityFetch } from '@/lib/community/communityFetch.client';
import { boardFetcher, parseApiError } from '@/lib/fetchers/boardFetcher';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type { CommunityComment, CommunityPost } from '@/lib/types/community';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';

// 한글 매핑 작업
const LEVEL_LABEL: Record<string, string> = {
  beginner: '초보자',
  intermediate: '중급자',
  advanced: '상급자',
  pro: '준프로 / 프로',
};
const HAND_LABEL: Record<string, string> = { right: '오른손', left: '왼손', both: '양손' };
const STYLE_LABEL: Record<string, string> = {
  baseline: '베이스라이너',
  all_court: '올코트',
  serve_and_volley: '서브&발리',
  counter_puncher: '공격적',
  other: '기타',
};
// 작성하지 않은 프로필 정보 - 처리
const v = (x: any) => (x === null || x === undefined || String(x).trim() === '' ? '-' : String(x));
const label = (map: Record<string, string>, v?: string) => (v ? (map[v] ?? v) : '-');

type Props = {
  id: string;
};

type DetailResponse = { ok: true; item: CommunityPost } | { ok: false; error: string };

// 작성자 프로필 모달 상태
type AuthorOverview = {
  firstActivityAt: string | null;
  stats: { posts: number; comments: number };
  recentPosts: { id: string; title: string; createdAt: string; views: number; likes: number; commentsCount: number }[];
  tennisProfile: null | {
    level: string;
    hand: string;
    playStyle: string;
    mainRacket: Record<string, any>;
    mainString: Record<string, any>;
    note: string;
    updatedAt: string | null;
  };
};

// 댓글 목록 응답 타입
type CommentsResponse =
  | {
      ok: true;
      items: CommunityComment[];
      total: number; // 전체 댓글 수(루트 + 대댓글)
      rootTotal?: number; // 루트 댓글 수(서버에서 내려줌, 없으면 total로 fallback)
      page: number;
      limit: number;
    }
  | { ok: false; error: string };

const COMMENT_LIMIT = 10; // 댓글 1페이지당 10개

const fmtDateTime = (v: string | Date) =>
  new Date(v).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

function DetailSkeleton() {
  return (
    <Card className="border-0 bg-card/90 shadow-xl backdrop-blur-sm">
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-lg dark:bg-primary/20">
            <MessageSquare className="h-5 w-5" />
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
export default function BoardDetailClient({ id, config }: Props & { config: BoardTypeConfig }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user } = useCurrentUser(); // 현재 로그인 사용자
  const [isDeleting, setIsDeleting] = useState(false); // 삭제 중 플래그
  const [isLiking, setIsLiking] = useState(false); // 추천(좋아요) 처리 중 플래그

  // 작성자 프로필
  const [isAuthorProfileOpen, setIsAuthorProfileOpen] = useState(false);
  const [authorOverview, setAuthorOverview] = useState<AuthorOverview | null>(null);
  const [isAuthorLoading, setIsAuthorLoading] = useState(false);
  const [authorTarget, setAuthorTarget] = useState<{ userId: string | null; nickname: string } | null>(null);

  // 모달 핸들러
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState<{ id: string; name: string } | null>(null);

  const openCompose = (toUserId: string, toName?: string | null) => {
    if (!user) {
      showErrorToast('로그인 후 이용할 수 있습니다.');
      // 입력 중인 내용이 있으면 로그인 이동 전에 한 번 더 확인
      if (!confirmLeaveIfDirty()) return;
      const redirectTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : `${config.routePrefix}/${id}`;
      router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
      return;
    }

    const safeName = (toName ?? '').trim() || '회원';

    setComposeTo({ id: toUserId, name: safeName });
    setComposeOpen(true);
  };

  async function handleOpenAuthorProfile(target?: { userId?: string | null; nickname?: string | null }) {
    // 게시글 데이터가 없으면 방어
    if (!item) return;

    const targetUserId = target?.userId ?? item.userId ?? null;
    const targetNickname = (target?.nickname ?? item.nickname ?? '회원').trim() || '회원';

    // 모달 상단/링크 등에 사용할 '대상 작성자'를 고정
    setAuthorTarget({ userId: targetUserId, nickname: targetNickname });

    // 비회원/익명 글인 경우: 활동량 집계할 userId가 없음
    if (!targetUserId) {
      setAuthorOverview(null);
      setIsAuthorProfileOpen(true);
      return;
    }

    setIsAuthorProfileOpen(true);
    setIsAuthorLoading(true);

    try {
      const res = await fetch(`/api/community/authors/${targetUserId}/overview`, {
        credentials: 'include',
      });

      if (!res.ok) {
        showErrorToast('작성자 정보를 불러오지 못했습니다.');
        return;
      }

      const data = await res.json();
      setAuthorOverview(data);
    } catch (err) {
      console.error(err);
      showErrorToast('작성자 정보를 불러오지 못했습니다.');
    } finally {
      setIsAuthorLoading(false);
    }
  }

  // 리폿
  const [openReport, setOpenReport] = useState(false);
  const [reason, setReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // 댓글 리폿
  const [openCommentReport, setOpenCommentReport] = useState(false); // 모달 오픈 여부
  const [commentReportReason, setCommentReportReason] = useState(''); // 신고 사유
  const [isCommentReporting, setIsCommentReporting] = useState(false); // 처리 중 플래그
  const [targetComment, setTargetComment] = useState<CommunityComment | null>(null); // 신고 대상 댓글

  // 댓글 신고 닫기(입력 유실 방지)
  const closeCommentReport = () => {
    if (commentReportReason.trim() && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
    setOpenCommentReport(false);
    setTargetComment(null);
    setCommentReportReason('');
  };

  // 조회수 중복 방지 TTL (24시간)
  const VIEW_TTL_MS = 1000 * 60 * 60 * 24;

  const { data, error, isLoading, mutate } = useSWR<DetailResponse>(`/api/community/posts/${id}?type=${config.boardType}`, (url: string) => boardFetcher<DetailResponse>(url), {
    revalidateOnMount: true,
    revalidateIfStale: true,
    dedupingInterval: 0,
  });

  const item = data && data.ok ? data.item : null;
  const detailError = parseApiError(error, '글을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');

  // 목록에서 프로필 오픈하면 상세에서 쿼리 감지하여 모달 자동 오픈
  useEffect(() => {
    if (!item) return;
    const openProfile = searchParams.get('openProfile');
    if (openProfile === '1') {
      handleOpenAuthorProfile();
    }
  }, [item?.id]);

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
            const res = await communityFetch(`/api/community/posts/${item.id}/view`, {
              method: 'POST',
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
    // 항상 /view 호출 → 서버에서 userId 기준으로 중복 방지
    (async () => {
      try {
        const res = await communityFetch(`/api/community/posts/${item.id}/view`, {
          method: 'POST',
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

  // 댓글 수정 입력값(unsaved changes 감지용)
  const [editDrafts, setEditDrafts] = useState<Record<string, string>>({});

  // 대댓글 입력 상태
  // - replyingToId: 현재 어느 댓글에 답글 폼이 열려 있는지
  // - replyDrafts: 각 댓글별로 입력 중인 답글 내용을 보관 (IME 안정성을 위해 commentId별로 분리)
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // 루트 댓글별 전체 답글 펼침 상태
  const [expandedRootIds, setExpandedRootIds] = useState<Set<string>>(new Set());
  // 특정 루트 댓글의 답글 접기/펼치기 토글
  const toggleRootReplies = (commentId: string) => {
    setExpandedRootIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  // 댓글 페이지 상태
  const [commentPage, setCommentPage] = useState(1);

  // 댓글 목록 SWR (게시글이 로드된 후에만 요청)
  const commentsKey = item ? `/api/community/posts/${item.id}/comments?page=${commentPage}&limit=${COMMENT_LIMIT}` : null;
  const { data: commentsData, isLoading: isCommentsLoading, mutate: mutateComments } = useSWR<CommentsResponse>(commentsKey, (url: string) => boardFetcher<CommentsResponse>(url));
  const comments = commentsData && commentsData.ok ? commentsData.items : [];

  // 전체 댓글 수(루트 + 대댓글) → 상단 뱃지 표시용
  const totalComments = commentsData && commentsData.ok ? commentsData.total : (item?.commentsCount ?? 0);

  // 루트 댓글 수 → 실제 페이지 수 계산용
  const totalRootComments =
    commentsData && commentsData.ok
      ? (commentsData.rootTotal ?? totalComments) // rootTotal 없으면 total로 fallback
      : totalComments;

  const totalCommentPages = Math.max(1, Math.ceil(totalRootComments / COMMENT_LIMIT));

  // 루트 댓글과 대댓글 분리
  const rootComments = comments.filter((c) => !c.parentId);

  const repliesByParentId = comments.reduce<Record<string, CommunityComment[]>>((acc, c) => {
    if (c.parentId) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {});

  const originalEditingContent = useMemo(() => {
    if (!editingCommentId) return '';
    return comments.find((c) => c.id === editingCommentId)?.content ?? '';
  }, [comments, editingCommentId]);

  const isDirtyAny = useMemo(() => {
    const hasCommentDraft = commentContent.trim().length > 0;
    const hasReplyDraft = Object.values(replyDrafts).some((v) => v.trim().length > 0);

    const hasEditDraft = (() => {
      if (!editingCommentId) return false;
      const cur = (editDrafts[editingCommentId] ?? originalEditingContent).trim();
      return cur !== originalEditingContent.trim();
    })();

    const hasPostReportDraft = reason.trim().length > 0;
    const hasCommentReportDraft = commentReportReason.trim().length > 0;

    return hasCommentDraft || hasReplyDraft || hasEditDraft || hasPostReportDraft || hasCommentReportDraft;
  }, [commentContent, replyDrafts, editingCommentId, editDrafts, originalEditingContent, reason, commentReportReason]);

  const isBusyAny = isCommentSubmitting || isReplySubmitting || isDeleting || isLiking || isReporting || isCommentReporting;

  // 뒤로가기/탭닫기 등 브라우저 이탈 방지
  useUnsavedChangesGuard(isDirtyAny && !isBusyAny);

  function confirmLeaveIfDirty() {
    if (!isDirtyAny || isBusyAny) return true;
    return window.confirm(UNSAVED_CHANGES_MESSAGE);
  }

  // <Link> 이동 시 입력값 보호
  const onNavLinkClick = (e: any) => {
    if (confirmLeaveIfDirty()) return;
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    // 로딩 끝, 2페이지 이상인데, 컨텐츠는 없고, 루트 댓글 수는 0이 아님 → 한 페이지 뒤로 밀기
    if (!isCommentsLoading && commentPage > 1 && comments.length === 0 && totalRootComments > 0) {
      setCommentPage((prev) => Math.max(1, prev - 1));
    }
  }, [isCommentsLoading, commentPage, comments.length, totalRootComments]);

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

      await boardFetcher(`/api/community/posts/${item.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentContent.trim() }),
      });

      // 입력창 초기화
      setCommentContent('');

      // 댓글 목록만 재검증하면 충분
      await mutateComments();
    } catch (err) {
      console.error(err);
      setCommentError(parseApiError(err, '댓글 작성에 실패했습니다. 잠시 후 다시 시도해 주세요.').message);
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  // 대댓글 작성 핸들러
  const handleSubmitReply = async (parentId: string) => {
    if (!item) return;

    if (!user) {
      alert('로그인 후 답글을 작성할 수 있습니다.');
      return;
    }

    const raw = replyDrafts[parentId] ?? '';
    const trimmed = raw.trim();
    if (!trimmed) {
      setReplyError('답글 내용을 입력해 주세요.');
      return;
    }

    try {
      setIsReplySubmitting(true);
      setReplyError(null);

      await boardFetcher(`/api/community/posts/${item.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, parentId }),
      });

      // 입력값/상태 초기화 (해당 parentId만 제거)
      setReplyDrafts((prev) => {
        const next = { ...prev };
        delete next[parentId];
        return next;
      });
      setReplyingToId(null);

      // 댓글 목록 재요청
      await mutateComments();
    } catch (err) {
      console.error(err);
      setReplyError(parseApiError(err, '답글 작성에 실패했습니다. 잠시 후 다시 시도해 주세요.').message);
    } finally {
      setIsReplySubmitting(false);
    }
  };

  // 어떤 댓글에 답글을 달지 시작할 때 호출
  const handleStartReply = (commentId: string, nickname: string) => {
    // 하나의 댓글에만 폼이 열리도록 replyingToId만 교체
    setReplyingToId(commentId);

    // 이미 입력 중이던 값이 있다면 유지, 없으면 빈 문자열로 초기화
    setReplyDrafts((prev) => ({
      ...prev,
      [commentId]: prev[commentId] ?? '',
    }));

    setReplyError(null);
  };

  // 댓글 수정 모드 진입
  const startEditComment = (commentId: string) => {
    setEditingCommentId(commentId);
    const original = comments.find((c) => c.id === commentId)?.content ?? '';
    setEditDrafts((prev) => ({
      ...prev,
      [commentId]: prev[commentId] ?? original,
    }));
    setCommentError(null);
  };

  // 댓글 수정 모드 취소
  const cancelEditComment = () => {
    setEditDrafts((prev) => {
      if (!editingCommentId) return prev;
      const next = { ...prev };
      delete next[editingCommentId];
      return next;
    });
    setEditingCommentId(null);
  };
  // 댓글 수정 저장
  const handleUpdateComment = async (commentId: string, newContent: string) => {
    const trimmed = newContent.trim();
    if (!trimmed) {
      setCommentError('댓글 내용을 입력해 주세요.');
      return;
    }

    try {
      setIsCommentSubmitting(true);
      setCommentError(null);

      await boardFetcher(`/api/community/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });

      // 수정 모드 종료 + draft 정리
      setEditDrafts((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
      setEditingCommentId(null);

      // 댓글 목록만 재검증
      await mutateComments();
    } catch (err) {
      console.error(err);
      setCommentError(parseApiError(err, '댓글 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.').message);
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

      await boardFetcher(`/api/community/comments/${commentId}`, {
        method: 'DELETE',
      });

      // 댓글 목록만 재검증하면 충분
      await mutateComments();
    } catch (err) {
      console.error(err);
      setCommentError(parseApiError(err, '댓글 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.').message);
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

      await boardFetcher(`/api/community/posts/${item.id}`, {
        method: 'DELETE',
      });

      // 삭제 성공 - 목록으로 이동
      router.push(config.routePrefix);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(parseApiError(err, '글 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.').message);
    } finally {
      setIsDeleting(false);
    }
  };

  // 추천(좋아요) 토글 핸들러
  const handleToggleLike = async () => {
    if (!item) return;

    // 비회원이면 알림 후 종료
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 중복 클릭 방지
    if (isLiking) return;

    try {
      setIsLiking(true);

      const res = await communityFetch(`/api/community/posts/${item.id}/like`, {
        method: 'POST',
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
        false, // 재요청 없이 로컬 캐시만 갱신
      );
    } catch (err) {
      console.error(err);
      alert(parseApiError(err, '추천 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.').message);
    } finally {
      setIsLiking(false);
    }
  };

  async function handleSubmitReport() {
    if (!item) return;

    if (reason.trim().length < 10) {
      showErrorToast('신고 사유는 최소 10자 이상 입력해야 합니다.');
      return;
    }

    try {
      setIsReporting(true);

      const res = await communityFetch(`/api/community/posts/${item.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);

        // 비로그인
        if (res.status === 401 || data?.error === 'unauthorized') {
          showErrorToast('로그인이 필요 합니다.');
          return;
        }

        // 자기 글 신고
        if (res.status === 400 && data?.error === 'cannot_report_own_post') {
          showErrorToast('본인이 작성한 글은 신고할 수 없습니다.');
          return;
        }

        // 5분 이내 중복 신고
        if (res.status === 429 || data?.error === 'too_many_requests') {
          showErrorToast('이미 최근에 신고한 게시글입니다.');
          return;
        }

        // 그 외
        showErrorToast('신고 처리 중 오류가 발생했습니다.');
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

  // 댓글 리폿 핸들러
  const openCommentReportDialog = (comment: CommunityComment) => {
    if (!user) {
      showErrorToast('로그인이 필요 합니다.');
      return;
    }
    if (comment.status === 'deleted') {
      showErrorToast('삭제된 댓글은 신고할 수 없습니다.');
      return;
    }

    setTargetComment(comment);
    setCommentReportReason('');
    setOpenCommentReport(true);
  };

  async function handleSubmitCommentReport() {
    if (!targetComment) return;

    if (commentReportReason.trim().length < 10) {
      showErrorToast('신고 사유는 최소 10자 이상 입력해야 합니다.');
      return;
    }

    try {
      setIsCommentReporting(true);

      const res = await communityFetch(`/api/community/comments/${targetComment.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: commentReportReason }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          showErrorToast('로그인이 필요 합니다.');
          return;
        }
        if (res.status === 429) {
          showErrorToast('이미 최근에 신고한 댓글입니다. 잠시 후 다시 시도해 주세요.');
          return;
        }

        if (res.status === 404) {
          showErrorToast('댓글을 찾을 수 없습니다.');
          return;
        }

        showErrorToast('알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      showSuccessToast('댓글 신고가 접수되었습니다.');
      setOpenCommentReport(false);
      setCommentReportReason('');
      setTargetComment(null);
    } catch (error) {
      console.error(error);
      showErrorToast('신고 처리 중 오류가 발생했습니다.');
    } finally {
      setIsCommentReporting(false);
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

  // 댓글 아이템 컴포넌트
  const CommentItem = ({ comment, isReply = false }: { comment: CommunityComment; isReply?: boolean }) => {
    const isCommentAuthor = !!user && !!comment.userId && user.id === comment.userId;
    const isEditing = editingCommentId === comment.id;
    const isDeleted = comment.status === 'deleted';

    // 대댓글 입력을 위한 로컬 ref (controlled가 아닌 uncontrolled로)
    const replyInputRef = useRef<HTMLTextAreaElement>(null);
    const editInputRef = useRef<HTMLTextAreaElement>(null);

    return (
      <div
        className={`group relative rounded-xl transition-all ${isReply ? 'ml-10 border-l-2 border-border bg-muted/50 pl-4 py-3 dark:border-border ' : 'border border-border bg-card p-5 hover:border-border hover:shadow-sm dark:hover:border-border'}`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
              {comment.status === 'deleted' ? (
                <span className="text-sm font-semibold text-muted-foreground">{comment.nickname ?? '회원'}</span>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="text-left text-sm font-semibold text-foreground underline-offset-4 hover:underline dark:text-foreground">
                      {comment.nickname ?? '회원'}
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="start" className="w-44">
                    <DropdownMenuItem
                      onClick={() => {
                        if (!confirmLeaveIfDirty()) return;
                        if (!comment.userId) return;
                        router.push(`${config.routePrefix}?authorId=${comment.userId}&authorName=${encodeURIComponent(comment.nickname ?? '회원')}`);
                      }}
                    >
                      이 작성자의 글 보기
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      disabled={!comment.userId || comment.userId === user?.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!comment.userId) return;
                        openCompose(comment.userId, comment.nickname);
                      }}
                    >
                      쪽지 보내기
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => {
                        handleOpenAuthorProfile({ userId: comment.userId ?? null, nickname: comment.nickname ?? '회원' });
                      }}
                    >
                      작성자 테니스 프로필
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <span className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleString('ko-KR', {
                  year: '2-digit',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {!isDeleted && (
            <div className="flex items-center gap-1 opacity-100">
              {isCommentAuthor && !isEditing && (
                <>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted dark:hover:text-foreground"
                    onClick={() => startEditComment(comment.id)}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive dark:text-muted-foreground dark:hover:bg-destructive/20 dark:hover:text-destructive"
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    삭제
                  </button>
                </>
              )}

              {!isCommentAuthor && (
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted dark:hover:text-muted-foreground"
                  onClick={() => openCommentReportDialog(comment)}
                >
                  신고
                </button>
              )}
            </div>
          )}
        </div>

        {/* 본문 / 수정 모드 */}
        {isDeleted ? (
          <p className="text-sm italic text-muted-foreground">삭제된 댓글입니다.</p>
        ) : isEditing ? (
          <div className="space-y-2.5">
            <Textarea
              ref={editInputRef}
              className="min-h-[80px] resize-none border-border text-sm focus-visible:ring-1 focus-visible:ring-ring dark:border-border dark:focus-visible:ring-ring"
              defaultValue={comment.content} // 초기값만 세팅, 이후는 브라우저가 관리
              onChange={(e) => {
                const v = e.currentTarget.value;
                setEditDrafts((prev) => ({ ...prev, [comment.id]: v }));
              }}
              disabled={isCommentSubmitting}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={cancelEditComment} disabled={isCommentSubmitting} className="h-8 px-4 text-xs bg-transparent">
                취소
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isCommentSubmitting}
                className="h-8 bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  const content = editInputRef.current?.value ?? '';
                  // 빈 내용 방어
                  if (!content.trim()) {
                    setCommentError('댓글 내용을 입력해 주세요.');
                    return;
                  }
                  void handleUpdateComment(comment.id, content);
                }}
              >
                저장
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">{comment.content}</p>
        )}

        {!isEditing && !isReply && !isDeleted && (
          <div className="mt-3">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted dark:hover:text-foreground"
              onClick={() => handleStartReply(comment.id, comment.nickname ?? '회원')}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              답글
            </button>
          </div>
        )}

        {replyingToId === comment.id && (
          <form
            className="mt-3 space-y-2.5 rounded-lg border border-border bg-muted/50 p-4 dark:border-border"
            onSubmit={(e) => {
              e.preventDefault();
              const content = replyInputRef.current?.value || '';
              if (!content.trim()) {
                setReplyError('답글 내용을 입력해 주세요.');
                return;
              }
              void handleSubmitReply(comment.id);
            }}
          >
            <Textarea
              ref={replyInputRef}
              className="min-h-[70px] resize-none border-border bg-card text-sm focus-visible:ring-1 focus-visible:ring-ring dark:border-border dark:focus-visible:ring-ring"
              defaultValue={replyDrafts[comment.id] ?? ''}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setReplyDrafts((prev) => ({ ...prev, [comment.id]: v }));
              }}
              disabled={isReplySubmitting}
              placeholder={`@${comment.nickname ?? '회원'} 님께 답글을 남겨 보세요.`}
              autoFocus
            />
            {replyError && <p className="text-xs text-destructive">{replyError}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (replyInputRef.current) {
                    replyInputRef.current.value = '';
                  }
                  setReplyDrafts((prev) => {
                    const next = { ...prev };
                    delete next[comment.id];
                    return next;
                  });
                  setReplyingToId(null);
                  setReplyError(null);
                }}
                disabled={isReplySubmitting}
                className="h-8 px-4 text-xs"
              >
                취소
              </Button>
              <Button type="submit" size="sm" disabled={isReplySubmitting} className="h-8 bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
                {isReplySubmitting ? '작성 중...' : '등록'}
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <MessageComposeDialog
        open={composeOpen}
        onOpenChange={(v) => {
          setComposeOpen(v);
          if (!v) setComposeTo(null);
        }}
        toUserId={composeTo?.id ?? ''}
        toName={composeTo?.name}
      />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 상단 헤더 (브레드크럼 + 버튼) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 text-sm text-muted-foreground">
              <span className="font-medium text-success">게시판</span>
              <span className="mx-1">›</span>
              <Link href={config.routePrefix} className="text-muted-foreground underline-offset-2 hover:underline">
                {config.boardTitle}
              </Link>
              <span className="mx-1">›</span>
              <span>글 상세</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{config.boardTitle} 글 상세</h1>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">{config.boardTitle}에 작성된 글의 상세 내용을 확인할 수 있습니다.</p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 bg-transparent"
              onClick={() => {
                if (!confirmLeaveIfDirty()) return;
                router.push(config.routePrefix);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>이전으로</span>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={config.routePrefix}>목록으로</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/board">게시판 홈</Link>
            </Button>
          </div>
        </div>

        {/* 본문 카드 */}
        {isLoading && <DetailSkeleton />}

        {!isLoading && error && (
          <Card className="border-0 bg-card/90 shadow-xl backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <ErrorBox
                message={isNotFound ? '해당 글을 찾을 수 없습니다. 삭제되었거나 주소가 잘못되었을 수 있습니다.' : detailError.message}
                status={detailError.status}
                fallbackMessage="글을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
              />
              <div className="flex justify-end gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={config.routePrefix}>목록으로</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={`${config.routePrefix}/write`}>새 글 작성하기</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && item && (
          <Card className="border-0 bg-card/90 shadow-xl backdrop-blur-sm">
            <CardHeader className="space-y-3 border-b bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <CardTitle className="text-base md:text-lg">
                    {typeof item.postNo === 'number' && <span className="mr-2 text-sm font-semibold tabular-nums text-muted-foreground">{item.postNo}</span>}

                    {/* 카테고리 뱃지 */}
                    <Badge variant={getBoardCategoryTone(config.boardType, item.category)} className={`mr-2 ${badgeSizeSm}`}>
                      {config.categoryMap[item.category ?? ''] ? getCategoryBadgeText(config.categoryMap[item.category ?? '']) : '분류 없음'}
                    </Badge>

                    {config.brandOptionsByCategory?.[item.category ?? ''] && item.brand ? (
                      <span className="mr-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground dark:text-muted">{config.brandLabelMap?.[item.brand] ?? item.brand}</span>
                    ) : null}

                    {item.title}
                  </CardTitle>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:text-sm">
                    {/* 작성자 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="font-medium underline-offset-4 hover:underline">
                          {item.nickname || '회원'}
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="start" className="w-44">
                        <DropdownMenuItem
                          onClick={() => {
                            // 비회원/익명 글은 userId가 없을 수 있음
                            if (!item.userId) return;
                            if (!confirmLeaveIfDirty()) return;
                            const authorName = item.nickname ?? '';
                            router.push(`${config.routePrefix}?authorId=${item.userId}&authorName=${encodeURIComponent(authorName)}`);
                          }}
                        >
                          이 작성자의 글 보기
                        </DropdownMenuItem>

                        {item.userId && item.userId !== user?.id && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              if (!user) {
                                const redirectTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : `${config.routePrefix}/${id}`;
                                if (!confirmLeaveIfDirty()) return;
                                router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
                                return;
                              }

                              const toUserId = item.userId;
                              if (!toUserId) return;

                              openCompose(toUserId, item.nickname);
                            }}
                          >
                            쪽지 보내기
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          onClick={() => {
                            handleOpenAuthorProfile({ userId: item.userId, nickname: item.nickname });
                          }}
                        >
                          작성자 테니스 프로필
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

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
                      <button type="button" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')} className="relative block w-full max-w-3xl overflow-hidden rounded-xl bg-card dark:bg-muted hover:bg-card transition">
                        <Image src={url || '/placeholder.svg'} alt={`첨부 이미지 ${idx + 1}`} width={1200} height={800} className="w-full h-auto max-h-[560px] object-contain bg-card dark:bg-muted" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 본문 */}
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.content}</div>

              {/* 첨부파일 */}
              {attachments.length > 0 && (
                <div className="mt-8 space-y-3 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">첨부파일</span>
                    <span className="text-xs text-muted-foreground">{attachments.length}개</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {attachments.map((att, index) => {
                      const url = typeof att === 'string' ? att : att.url;
                      const name = typeof att === 'string' ? `attachment-${index + 1}` : att.name || `attachment-${index + 1}`;
                      const size = typeof att === 'object' && att.size ? `${(att.size / 1024 / 1024).toFixed(2)} MB` : '';

                      if (!url) return null;

                      return (
                        <div key={`${url}-${index}`} className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs shadow-sm dark:border-border">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 dark:bg-primary/20">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-foreground" title={name}>
                                {name}
                              </div>
                              {size && <div className="text-[11px] text-muted-foreground">{size}</div>}
                            </div>
                          </div>

                          <Button type="button" variant="outline" size="sm" className="ml-3 flex-shrink-0 bg-transparent" onClick={() => handleDownload(url, name)}>
                            다운로드
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
                <span>게시글 이용 시 커뮤니티 가이드를 준수해 주세요. 신고가 반복되는 경우 글이 숨김 처리될 수 있습니다.</span>

                <div className="flex flex-wrap items-center gap-2">
                  {item && (
                    <Button type="button" variant={item.likedByMe ? 'default' : 'outline'} size="sm" onClick={handleToggleLike} disabled={isLiking} className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {isLiking ? '처리 중...' : item.likedByMe ? `추천 취소 (${item.likes ?? 0})` : `추천 (${item.likes ?? 0})`}
                    </Button>
                  )}

                  <Dialog
                    open={openReport}
                    onOpenChange={(next) => {
                      if (next && !user) {
                        showErrorToast('로그인이 필요 합니다.');
                        return;
                      }
                      setOpenReport(next);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/15">
                        신고하기
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>이 게시글을 신고하시겠습니까?</DialogTitle>
                        <p className="text-sm text-muted-foreground">허위 신고 또는 악의적 신고는 이용 제한 대상이 될 수 있습니다.</p>
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

                  <Dialog
                    open={openCommentReport}
                    onOpenChange={(next) => {
                      if (!next) {
                        if (!next) closeCommentReport();
                        return;
                      }

                      // 열 때는 버튼에서만 열리므로 여기서 user 체크는 생략 가능
                    }}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>댓글 신고하기</DialogTitle>
                        <DialogDescription>신고 사유를 자세히 작성해 주세요. 운영자가 검토 후 필요한 조치를 진행합니다.</DialogDescription>
                      </DialogHeader>

                      <div className="space-y-2">
                        {targetComment && (
                          <div className="rounded-md border bg-muted px-3 py-2 text-xs text-muted-foreground">
                            <div className="font-medium mb-1">신고 대상: {targetComment.nickname ?? '회원'}</div>
                            <div className="line-clamp-2 whitespace-pre-wrap">{targetComment.content}</div>
                          </div>
                        )}

                        <Label htmlFor="comment-report-reason">신고 사유</Label>
                        <Textarea
                          id="comment-report-reason"
                          className="min-h-[100px]"
                          value={commentReportReason}
                          onChange={(e) => setCommentReportReason(e.target.value)}
                          disabled={isCommentReporting}
                          placeholder="신고 사유를 10자 이상 입력해 주세요."
                        />
                      </div>

                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={closeCommentReport}>
                          취소
                        </Button>
                        <Button type="button" onClick={handleSubmitCommentReport} disabled={isCommentReporting}>
                          {isCommentReporting ? '신고 중...' : '신고하기'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {isAuthor && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!confirmLeaveIfDirty()) return;
                          router.push(`${config.routePrefix}/${item.id}/edit`);
                        }}
                      >
                        수정
                      </Button>

                      <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? '삭제 중...' : '삭제'}
                      </Button>
                    </>
                  )}

                  <Button asChild variant="outline" size="sm">
                    <Link href={config.routePrefix}>목록으로</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`${config.routePrefix}/write`}>새 글 작성</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* ================== 댓글 카드 시작 ================== */}
        {!isLoading && !error && item && (
          <Card className="overflow-hidden border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border bg-muted/50 px-6 py-4">
              <CardTitle className="flex items-center gap-3 text-base font-semibold text-foreground">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <span>댓글</span>
                <span className="flex h-6 min-w-[28px] items-center justify-center rounded-full bg-primary px-2.5 text-sm font-medium text-primary-foreground">{totalComments}</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              <div className="space-y-3">
                {user ? (
                  <>
                    <Textarea
                      id="comment"
                      className="min-h-[100px] resize-none border-border text-sm focus-visible:ring-1 focus-visible:ring-ring dark:border-border dark:focus-visible:ring-ring"
                      placeholder="댓글을 입력하세요."
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      disabled={isCommentSubmitting}
                    />
                    {commentError && <p className="text-xs text-destructive">{commentError}</p>}
                    <div className="flex justify-end">
                      <Button type="button" size="sm" className="h-9 bg-primary px-5 text-sm text-primary-foreground hover:bg-primary/90" disabled={isCommentSubmitting} onClick={handleSubmitComment}>
                        {isCommentSubmitting && <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-border border-t-transparent dark:border-border dark:border-t-transparent" />}
                        <span>등록</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3.5 dark:border-border">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">로그인 후 댓글을 작성할 수 있습니다.</p>
                  </div>
                )}
              </div>

              <div className="h-px bg-muted" />

              {/* 댓글 리스트 영역 */}
              <div className="space-y-3">
                {isCommentsLoading && (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-5">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-2.5 w-24" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                )}

                {!isCommentsLoading && comments.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">첫 댓글을 남겨보세요</p>
                  </div>
                )}

                {!isCommentsLoading && comments.length > 0 && (
                  <ul className="space-y-3">
                    {rootComments.map((c) => {
                      const replies = repliesByParentId[c.id] || [];
                      const isExpanded = expandedRootIds.has(c.id);

                      const MAX_COLLAPSED_REPLIES = 3;
                      const totalReplies = replies.length;

                      const visibleReplies = isExpanded ? replies : replies.slice(0, MAX_COLLAPSED_REPLIES);

                      const hiddenCount = isExpanded ? 0 : Math.max(0, totalReplies - MAX_COLLAPSED_REPLIES);

                      return (
                        <li key={c.id} className="space-y-2.5">
                          <CommentItem comment={c} />

                          {visibleReplies.length > 0 && (
                            <ul className="space-y-2.5">
                              {visibleReplies.map((reply) => (
                                <li key={reply.id}>
                                  <CommentItem comment={reply} isReply />
                                </li>
                              ))}
                            </ul>
                          )}

                          {totalReplies > MAX_COLLAPSED_REPLIES && (
                            <button
                              type="button"
                              onClick={() => toggleRootReplies(c.id)}
                              className="ml-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted dark:text-muted-foreground dark:hover:bg-muted"
                            >
                              {isExpanded ? (
                                <span>답글 접기</span>
                              ) : (
                                <>
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  <span>답글 {hiddenCount}개 더보기</span>
                                </>
                              )}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {!isCommentsLoading && totalCommentPages > 1 && (
                  <div className="flex items-center justify-between rounded-lg border-t border-border bg-muted/50 px-4 py-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {commentPage} / {totalCommentPages}
                    </span>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" disabled={commentPage <= 1} onClick={() => setCommentPage((p) => Math.max(1, p - 1))} className="h-8 px-4 text-xs">
                        이전
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={commentPage >= totalCommentPages} onClick={() => setCommentPage((p) => Math.min(totalCommentPages, p + 1))} className="h-8 px-4 text-xs">
                        다음
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 작성자 프로필 모달 */}
        {item && (
          <Dialog
            open={isAuthorProfileOpen}
            onOpenChange={(open) => {
              setIsAuthorProfileOpen(open);
              if (!open) setAuthorTarget(null);
            }}
          >
            <DialogContent className="max-w-5xl max-h-screen overflow-y-auto">
              <DialogHeader className="pb-4 border-b border-border">
                <DialogTitle className="text-lg font-semibold text-foreground">작성자 프로필</DialogTitle>
                {authorTarget?.nickname ? `${authorTarget.nickname}님의 커뮤니티 활동 정보입니다.` : '작성자 정보'}
              </DialogHeader>

              {isAuthorLoading && <div className="py-8 text-sm text-muted-foreground text-center">작성자 정보를 불러오는 중입니다...</div>}

              {!isAuthorLoading && (
                <Tabs defaultValue="community" className="w-full mt-2">
                  <TabsList className="grid w-full grid-cols-2 h-10">
                    <TabsTrigger value="community" className="text-sm">
                      작성자 프로필
                    </TabsTrigger>
                    <TabsTrigger value="tennis" className="text-sm">
                      테니스 프로필
                    </TabsTrigger>
                  </TabsList>

                  {/* 작성자(커뮤니티) 탭 */}
                  <TabsContent value="community" className="mt-6 space-y-6">
                    {/* 기본 정보 */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground pb-2 border-b border-border">기본 정보</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-20">이름</span>
                          <span className="text-sm font-medium">{authorTarget?.nickname ?? '회원'}</span>
                        </div>
                        {authorOverview?.firstActivityAt && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-20">첫 활동일</span>
                            <span className="text-foreground">{new Date(authorOverview.firstActivityAt).toLocaleDateString('ko-KR')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 활동량 */}
                    {authorOverview && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground pb-2 border-b border-border">커뮤니티 활동</h3>
                        <div className="flex gap-6">
                          <div className="flex-1 rounded-lg border border-border bg-muted/50 dark:bg-background/40 p-4">
                            <div className="text-xs text-muted-foreground mb-1">작성 글</div>
                            <div className="text-2xl font-semibold text-foreground">{authorOverview.stats.posts}</div>
                          </div>
                          <div className="flex-1 rounded-lg border border-border bg-muted/50 dark:bg-background/40 p-4">
                            <div className="text-xs text-muted-foreground mb-1">작성댓글</div>
                            <div className="text-2xl font-semibold text-foreground">{authorOverview.stats.comments}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 최근 작성 글 */}
                    {authorOverview?.recentPosts?.length ? (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground pb-2 border-b border-border">최근 작성 글</h3>
                        <ul className="space-y-2">
                          {authorOverview.recentPosts.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-3 text-sm hover:bg-muted/50 dark:hover:bg-background/40 rounded-md p-2 -mx-2 transition-colors">
                              <Link href={`${config.routePrefix}/${p.id}`} className="truncate text-foreground hover:text-muted-foreground dark:hover:text-muted-foreground flex-1">
                                {p.title || '(제목 없음)'}
                              </Link>
                              <span className="shrink-0 text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('ko-KR')}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">아직 활동 기록이 없거나, 공개 게시글이 없습니다.</p>
                    )}
                  </TabsContent>

                  {/* 테니스 탭 */}
                  <TabsContent value="tennis" className="mt-6">
                    {!authorOverview?.tennisProfile ? (
                      <div className="text-sm text-muted-foreground text-center py-8">작성자가 테니스 프로필을 공개하지 않았습니다.</div>
                    ) : (
                      <div className="space-y-6">
                        {/* 기본 정보 */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-foreground pb-2 border-b border-border">플레이어 정보</h3>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="rounded-lg border border-border bg-muted/50 dark:bg-background/40 p-3">
                              <div className="text-xs text-muted-foreground mb-1">실력</div>
                              <div className="text-sm font-medium text-foreground">{label(LEVEL_LABEL, authorOverview.tennisProfile.level)}</div>
                            </div>
                            <div className="rounded-lg border border-border bg-muted/50 dark:bg-background/40 p-3">
                              <div className="text-xs text-muted-foreground mb-1">사용 손</div>
                              <div className="text-sm font-medium text-foreground">{label(HAND_LABEL, authorOverview.tennisProfile.hand)}</div>
                            </div>
                            <div className="rounded-lg border border-border bg-muted/50 dark:bg-background/40 p-3">
                              <div className="text-xs text-muted-foreground mb-1">스타일</div>
                              <div className="text-sm font-medium text-foreground">{label(STYLE_LABEL, authorOverview.tennisProfile.playStyle)}</div>
                            </div>
                          </div>
                        </div>

                        {/* 라켓 */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-foreground pb-2 border-b border-border">메인 라켓</h3>
                          <div className="rounded-lg border border-border p-4">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-16">브랜드</span>
                                <span className="text-foreground font-medium">{v(authorOverview.tennisProfile.mainRacket?.brand)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-16">모델</span>
                                <span className="text-foreground font-medium">{v(authorOverview.tennisProfile.mainRacket?.model)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-16">무게</span>
                                <span className="text-foreground">{v(authorOverview.tennisProfile.mainRacket?.weight)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-16">밸런스</span>
                                <span className="text-foreground">{v(authorOverview.tennisProfile.mainRacket?.balance)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 스트링 */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-foreground pb-2 border-b border-border">메인 스트링</h3>
                          <div className="rounded-lg border border-border p-4">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-20">브랜드</span>
                                <span className="text-foreground font-medium">{v(authorOverview.tennisProfile.mainString?.brand)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-20">모델</span>
                                <span className="text-foreground font-medium">{v(authorOverview.tennisProfile.mainString?.model)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-20">게이지</span>
                                <span className="text-foreground">{v(authorOverview.tennisProfile.mainString?.gauge)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-20">재질</span>
                                <span className="text-foreground">{v(authorOverview.tennisProfile.mainString?.material)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-20">메인 텐션</span>
                                <span className="text-foreground">{v(authorOverview.tennisProfile.mainString?.tensionMain)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-20">크로스 텐션</span>
                                <span className="text-foreground">{v(authorOverview.tennisProfile.mainString?.tensionCross)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 소개 */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-foreground pb-2 border-b border-border">소개</h3>
                          <div className="rounded-lg border border-border bg-muted/50 dark:bg-background/40 p-4">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{authorOverview.tennisProfile.note?.trim() ? authorOverview.tennisProfile.note : '소개를 입력하지 않았습니다.'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
                    <Button variant="outline" size="sm" asChild disabled={!item} className="h-9 bg-transparent">
                      <Link href={authorTarget?.userId ? `${config.routePrefix}?authorId=${authorTarget.userId}&authorName=${encodeURIComponent(authorTarget.nickname ?? '')}` : '#'}>이 작성자의 글 보기</Link>
                    </Button>

                    <Button variant="ghost" size="sm" onClick={() => setIsAuthorProfileOpen(false)} className="h-9">
                      닫기
                    </Button>
                  </div>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
