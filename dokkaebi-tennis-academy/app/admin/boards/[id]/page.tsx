import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Eye, MessageSquare, Settings, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sanitizeHtml } from '@/lib/sanitize';
import { AdminFetchError, adminFetcher } from '@/lib/admin/adminFetcher';
import BoardDetailActions from './BoardDetailActions';

type BoardPostDetail = {
  id: string;
  title: string;
  content: string;
  type: string;
  category: string;
  status: 'public' | 'hidden';
  isPinned?: boolean;
  views: number;
  commentsCount: number;
  createdAt?: string | Date;
  authorNickname?: string;
  authorDisplayName?: string;
  authorId?: string;
};

/**
 * 관리자 상세 페이지 식별자 정책
 * - 게시물 식별자는 DB 저장 스키마(ObjectId | string)와 동일하게 문자열로 취급한다.
 * - 숫자 파싱(Number.parseInt)이나 ObjectId 정규식 강제 검증을 하지 않는다.
 * - URL 인코딩된 ID를 허용하기 위해 decodeURIComponent를 적용한다.
 */
function normalizeBoardIdentifier(id: string) {
  const raw = String(id ?? '').trim();
  if (!raw) return null;

  try {
    const decoded = decodeURIComponent(raw).trim();
    return decoded || null;
  } catch {
    return raw;
  }
}

function getStatusVariant(status: string): 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'public':
      return 'success';
    case 'hidden':
      return 'warning';
    default:
      return 'destructive';
  }
}

function getStatusName(status: string) {
  switch (status) {
    case 'public':
      return '게시중';
    case 'hidden':
      return '숨김';
    default:
      return status || '미정';
  }
}

function getBoardTypeColor(type: string) {
  switch (type) {
    case 'notice':
      return 'bg-primary/20 text-primary hover:bg-primary/30';
    case 'qna':
      return 'bg-primary/10 text-primary hover:bg-primary/15 dark:hover:bg-primary/25';
    case 'community':
      return 'bg-success/10 text-success hover:bg-success/10';
    case 'faq':
      return 'bg-muted text-primary hover:bg-muted';
    default:
      return 'bg-card text-muted-foreground hover:bg-card';
  }
}

function getBoardTypeName(type: string) {
  switch (type) {
    case 'notice':
      return '공지사항';
    case 'qna':
      return 'Q&A';
    case 'community':
      return '커뮤니티';
    case 'faq':
      return 'FAQ';
    default:
      return type || '기타';
  }
}

function formatDate(dateValue?: string | Date) {
  if (!dateValue) return '-';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default async function BoardPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const boardId = normalizeBoardIdentifier(id);

  if (!boardId) {
    notFound();
  }

  let data: { item?: BoardPostDetail } | null = null;
  try {
    data = await adminFetcher<{ item?: BoardPostDetail }>(`/api/admin/community/posts/${encodeURIComponent(boardId)}`, {
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof AdminFetchError && error.status === 404) {
      notFound();
    }
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container py-8 px-6">
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive dark:border-destructive/40 dark:bg-destructive/15">게시물 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
        </div>
      </div>
    );
  }

  const post = (data?.item ?? null) as BoardPostDetail | null;

  if (!post) {
    notFound();
  }

  const postId = String(post.id ?? boardId);
  const postStatus = String(post.status ?? 'hidden');

  /**
   * 본문 렌더링 보안 정책
   * - API 저장 시 sanitize 처리되어도 화면 단에서 한 번 더 정제한다.
   * - 렌더링은 정제된 문자열만 dangerouslySetInnerHTML에 전달한다.
   */
  const safeContent = await sanitizeHtml(String(post.content ?? ''));

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container py-8 px-6">
        <div className="mb-6">
          <Link href="/admin/boards" className="inline-flex items-center text-primary hover:text-primary dark:hover:text-primary hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            게시판 목록으로 돌아가기
          </Link>
        </div>

        <div className="flex flex-col space-y-8">
          <div className="bg-muted/30 rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-card rounded-full p-3 shadow-md">
                  <Settings className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">게시물 상세 보기</h1>
                  <p className="mt-1 text-muted-foreground">게시물의 상세 정보를 확인하고 관리할 수 있습니다.</p>
                </div>
              </div>
              <BoardDetailActions postId={postId} currentStatus={postStatus} />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 shadow-xl bg-muted/30 border border-border">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={getBoardTypeColor(String(post.type ?? ''))}>{getBoardTypeName(String(post.type ?? ''))}</Badge>
                  <Badge variant={getStatusVariant(postStatus)}>{getStatusName(postStatus)}</Badge>
                  {!!post.category && <Badge variant="outline">{post.category}</Badge>}
                  {post.isPinned && <Badge variant="secondary">상단 고정</Badge>}
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">{post.title || '(제목 없음)'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-blue dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: safeContent }} />
              </CardContent>
            </Card>

            <Card className="shadow-xl bg-muted/30 border border-border">
              <CardHeader className="bg-muted/30 border-b border-border">
                <CardTitle className="text-primary">게시물 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center p-3 bg-background dark:bg-card rounded-lg">
                  <User className="mr-3 h-4 w-4 text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">{post.authorDisplayName || post.authorNickname || '작성자 미상'}</p>
                    <p className="text-sm text-muted-foreground">{post.authorNickname || post.authorId || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-background dark:bg-card rounded-lg">
                  <Calendar className="mr-3 h-4 w-4 text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">작성일</p>
                    <p className="text-sm text-muted-foreground">{formatDate(post.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-background dark:bg-card rounded-lg">
                  <Eye className="mr-3 h-4 w-4 text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">조회수</p>
                    <p className="text-sm text-primary font-semibold">{Number(post.views ?? 0)}</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-background dark:bg-card rounded-lg">
                  <MessageSquare className="mr-3 h-4 w-4 text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">댓글</p>
                    <p className="text-sm text-primary font-semibold">{Number(post.commentsCount ?? 0)}개</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
