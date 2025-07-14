import Link from 'next/link';
import { ArrowLeft, Calendar, Eye, MessageSquare, Pencil, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';

export default async function BoardPostDetailPage({ params }: { params: { id: string } }) {
  const postId = Number.parseInt(params.id);
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }

  // 샘플 게시물 데이터
  const post = {
    id: postId,
    title: '5월 스트링 할인 이벤트',
    author: '관리자',
    email: 'admin@dokkaebi.com',
    boardType: 'notice',
    boardTypeName: '공지사항',
    category: '이벤트',
    status: 'published',
    statusName: '게시됨',
    isPinned: true,
    commentCount: 0,
    viewCount: 245,
    createdAt: '2023-05-01T09:00:00',
    content: `
      <h3>5월 가정의 달 맞이 스트링 할인 이벤트</h3>
      <p>안녕하세요, 도깨비 테니스 아카데미입니다.</p>
      <p>5월 가정의 달을 맞이하여 전 제품 10% 할인 이벤트를 진행합니다.</p>
      <br />
      <h4>이벤트 기간</h4>
      <p>2023년 5월 1일 ~ 5월 31일</p>
      <br />
      <h4>이벤트 내용</h4>
      <ul>
        <li>전 스트링 제품 10% 할인</li>
        <li>3개 이상 구매 시 추가 5% 할인</li>
        <li>스트링 장착 서비스 20% 할인</li>
      </ul>
      <br />
      <h4>유의사항</h4>
      <p>- 본 이벤트는 기간 내 온라인 구매 시에만 적용됩니다.</p>
      <p>- 타 이벤트와 중복 적용되지 않습니다.</p>
      <p>- 일부 품목은 조기 품절될 수 있습니다.</p>
      <br />
      <p>많은 관심과 참여 부탁드립니다.</p>
      <p>감사합니다.</p>
    `,
    comments: [
      // 댓글이 있는 경우 여기에 추가
    ],
  };

  // 게시물 상태에 따른 배지 색상 가져오기
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500/20 text-green-500 hover:bg-green-500/30';
      case 'draft':
        return 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30';
      case 'hidden':
        return 'bg-gray-500/20 text-gray-500 hover:bg-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-500 hover:bg-gray-500/30';
    }
  };

  // 게시판 유형에 따른 배지 색상 가져오기
  const getBoardTypeColor = (type: string) => {
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
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/admin/boards" className="inline-flex items-center text-primary hover:underline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          게시판 목록으로 돌아가기
        </Link>
      </div>

      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">게시물 상세 보기</h1>
            <p className="text-muted-foreground">게시물의 상세 정보를 확인하고 관리할 수 있습니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/boards/${postId}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                수정
              </Link>
            </Button>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              삭제
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">{post.title}</CardTitle>
                  <CardDescription>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <Badge className={getBoardTypeColor(post.boardType)} variant="outline">
                        {post.boardTypeName}
                      </Badge>
                      <Badge variant="outline">{post.category}</Badge>
                      <Badge className={getStatusColor(post.status)} variant="outline">
                        {post.statusName}
                      </Badge>
                    </div>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>게시물 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{post.author}</p>
                    <p className="text-sm text-muted-foreground">{post.email}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">작성일</p>
                    <p className="text-sm text-muted-foreground">{formatDate(post.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">조회수</p>
                    <p className="text-sm text-muted-foreground">{post.viewCount}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">댓글</p>
                    <p className="text-sm text-muted-foreground">{post.commentCount}개</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>게시물 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pinned">상단 고정</Label>
                    <p className="text-sm text-muted-foreground">게시물을 목록 상단에 고정합니다.</p>
                  </div>
                  <Switch id="pinned" checked={post.isPinned} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="comments">댓글 허용</Label>
                    <p className="text-sm text-muted-foreground">이 게시물에 댓글 작성을 허용합니다.</p>
                  </div>
                  <Switch id="comments" checked={true} />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">설정 저장</Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {post.comments && post.comments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>댓글 ({post.comments.length})</CardTitle>
            </CardHeader>
            <CardContent>{post.comments.length === 0 ? <p className="text-center text-muted-foreground py-8">아직 댓글이 없습니다.</p> : <div className="space-y-4">{/* 댓글 목록 렌더링 */}</div>}</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
