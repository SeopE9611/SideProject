import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Eye, MessageSquare, Settings, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sanitizeHtml } from '@/lib/sanitize';
import BoardDetailActions from './BoardDetailActions';

type BoardPostDetail = {
  _id?: string;
  id?: string;
  title?: string;
  content?: string;
  type?: string;
  category?: string;
  status?: string;
  isPinned?: boolean;
  viewCount?: number;
  commentCount?: number;
  createdAt?: string | Date;
  authorName?: string;
  authorNickname?: string;
  authorEmail?: string;
  authorId?: string;
};

/**
 * 관리자 상세 페이지 파라미터 정책
 * - board 문서는 Mongo ObjectId(24자리 hex 문자열) 기준으로 식별한다.
 * - 숫자형 파싱 정책(Number.parseInt) 제거.
 */
function parseBoardObjectId(id: string) {
  const normalized = String(id ?? '').trim();
  return /^[a-fA-F0-9]{24}$/.test(normalized) ? normalized : null;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'published':
      return 'bg-green-500/20 text-green-500 hover:bg-green-500/30';
    case 'hidden':
      return 'bg-gray-500/20 text-gray-500 hover:bg-gray-500/30';
    case 'deleted':
      return 'bg-red-500/20 text-red-500 hover:bg-red-500/30';
    default:
      return 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30';
  }
}

function getStatusName(status: string) {
  switch (status) {
    case 'published':
      return '게시중';
    case 'hidden':
      return '숨김';
    case 'deleted':
      return '삭제됨';
    default:
      return status || '미정';
  }
}

function getBoardTypeColor(type: string) {
  switch (type) {
    case 'notice':
      return 'bg-primary/20 text-primary hover:bg-primary/30';
    case 'qna':
      return 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30';
    case 'community':
      return 'bg-green-500/20 text-green-500 hover:bg-green-500/30';
    case 'faq':
      return 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30';
    default:
      return 'bg-gray-500/20 text-gray-500 hover:bg-gray-500/30';
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
  const objectId = parseBoardObjectId(id);

  if (!objectId) {
    notFound();
  }

  const headersList = await headers();
  const host = headersList.get('host');
  const cookie = headersList.get('cookie') ?? '';
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}`;

  const res = await fetch(`${baseUrl}/api/boards/${objectId}`, {
    cache: 'no-store',
    headers: { cookie },
  });

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 dark:from-blue-950/20 dark:via-teal-950/20 dark:to-green-950/20">
        <div className="container py-8 px-6">
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">게시물 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
        </div>
      </div>
    );
  }

  const data = await res.json();
  const post = (data?.item ?? null) as BoardPostDetail | null;

  if (!post) {
    notFound();
  }

  const postId = String(post._id ?? objectId);
  const postStatus = String(post.status ?? 'hidden');

  /**
   * 본문 렌더링 보안 정책
   * - API 저장 시 sanitize 처리되어도 화면 단에서 한 번 더 정제한다.
   * - 렌더링은 정제된 문자열만 dangerouslySetInnerHTML에 전달한다.
   */
  const safeContent = await sanitizeHtml(String(post.content ?? ''));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 dark:from-blue-950/20 dark:via-teal-950/20 dark:to-green-950/20">
      <div className="container py-8 px-6">
        <div className="mb-6">
          <Link href="/admin/boards" className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            게시판 목록으로 돌아가기
          </Link>
        </div>

        <div className="flex flex-col space-y-8">
          <div className="bg-gradient-to-r from-blue-50 via-teal-50 to-green-50 dark:from-blue-950/20 dark:via-teal-950/20 dark:to-green-950/20 rounded-2xl p-8 border border-blue-100 dark:border-blue-800/30 shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-md">
                  <Settings className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">게시물 상세 보기</h1>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">게시물의 상세 정보를 확인하고 관리할 수 있습니다.</p>
                </div>
              </div>
              <BoardDetailActions postId={postId} currentStatus={postStatus} />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 shadow-xl bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/20 border border-blue-100 dark:border-blue-800/30">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={getBoardTypeColor(String(post.type ?? ''))}>{getBoardTypeName(String(post.type ?? ''))}</Badge>
                  <Badge className={getStatusColor(postStatus)}>{getStatusName(postStatus)}</Badge>
                  {!!post.category && <Badge variant="outline">{post.category}</Badge>}
                  {post.isPinned && <Badge variant="secondary">상단 고정</Badge>}
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">{post.title || '(제목 없음)'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-blue dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: safeContent }} />
              </CardContent>
            </Card>

            <Card className="shadow-xl bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/20 border border-blue-100 dark:border-blue-800/30">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 border-b border-blue-100 dark:border-blue-800/30">
                <CardTitle className="text-blue-800 dark:text-blue-200">게시물 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <User className="mr-3 h-4 w-4 text-blue-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-gray-900 dark:text-gray-100">{post.authorName || post.authorNickname || '작성자 미상'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{post.authorEmail || post.authorId || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Calendar className="mr-3 h-4 w-4 text-blue-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-gray-900 dark:text-gray-100">작성일</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(post.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Eye className="mr-3 h-4 w-4 text-blue-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-gray-900 dark:text-gray-100">조회수</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">{Number(post.viewCount ?? 0)}</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <MessageSquare className="mr-3 h-4 w-4 text-blue-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-gray-900 dark:text-gray-100">댓글</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">{Number(post.commentCount ?? 0)}개</p>
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
