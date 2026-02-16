import Link from 'next/link';
import { ArrowLeft, Calendar, Eye, MessageSquare, Pencil, Trash2, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default async function BoardPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = Number.parseInt(id);

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
              <div className="flex items-center gap-2">
                <Button variant="outline" asChild className="bg-white/60 backdrop-blur-sm border-blue-200 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-950/20">
                  <Link href={`/admin/boards/${postId}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    수정
                  </Link>
                </Button>
                <Button variant="destructive" className="bg-red-500 hover:bg-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 shadow-xl bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/20 border border-blue-100 dark:border-blue-800/30">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 border-b border-blue-100 dark:border-blue-800/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl text-blue-800 dark:text-blue-200">{post.title}</CardTitle>
                    <CardDescription>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <Badge className={getBoardTypeColor(post.boardType)} variant="outline">
                          {post.boardTypeName}
                        </Badge>
                        <Badge variant="outline" className="border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400">
                          {post.category}
                        </Badge>
                        <Badge className={getStatusColor(post.status)} variant="outline">
                          {post.statusName}
                        </Badge>
                      </div>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/*
                  sanitize 신뢰 경계(trust boundary):
                  - 관리자 페이지는 저장된 community 본문을 그대로 렌더링한다.
                  - 이 값은 API 쓰기 경계(app/api/community/**)에서 lib/sanitize.ts로 정제된 뒤 저장된 값이라는 전제를 가진다.
                  - 따라서 렌더링 시 재-sanitize는 하지 않고, 회귀 테스트에서 해당 경계를 고정한다.
                */}
                <div className="prose prose-blue dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              <Card className=" shadow-xl bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/20 border border-blue-100 dark:border-blue-800/30">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 border-b border-blue-100 dark:border-blue-800/30">
                  <CardTitle className="text-blue-800 dark:text-blue-200">게시물 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <User className="mr-3 h-4 w-4 text-blue-600" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none text-gray-900 dark:text-gray-100">{post.author}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{post.email}</p>
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
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">{post.viewCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <MessageSquare className="mr-3 h-4 w-4 text-blue-600" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none text-gray-900 dark:text-gray-100">댓글</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">{post.commentCount}개</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xl bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/20 border border-blue-100 dark:border-blue-800/30">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 border-b border-blue-100 dark:border-blue-800/30">
                  <CardTitle className="text-blue-800 dark:text-blue-200">게시물 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="pinned" className="text-gray-900 dark:text-gray-100">
                        상단 고정
                      </Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">게시물을 목록 상단에 고정합니다.</p>
                    </div>
                    <Switch id="pinned" checked={post.isPinned} className="data-[state=checked]:bg-blue-500" />
                  </div>
                  <Separator className="bg-blue-100 dark:bg-blue-800/30" />
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="comments" className="text-gray-900 dark:text-gray-100">
                        댓글 허용
                      </Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">이 게시물에 댓글 작성을 허용합니다.</p>
                    </div>
                    <Switch id="comments" checked={true} className="data-[state=checked]:bg-blue-500" />
                  </div>
                </CardContent>
                <CardFooter className="bg-blue-50/50 dark:bg-blue-950/20">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white">설정 저장</Button>
                </CardFooter>
              </Card>
            </div>
          </div>

          {post.comments && post.comments.length > 0 && (
            <Card className="shadow-xl bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/20 border border-blue-100 dark:border-blue-800/30">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 border-b border-blue-100 dark:border-blue-800/30">
                <CardTitle className="text-blue-800 dark:text-blue-200">댓글 ({post.comments.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-6">{post.comments.length === 0 ? <p className="text-center text-gray-500 dark:text-gray-400 py-8">아직 댓글이 없습니다.</p> : <div className="space-y-4">{/* 댓글 목록 렌더링 */}</div>}</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
