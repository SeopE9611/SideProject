import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Bell, Star, Users, TrendingUp, Eye, ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';

// 더미 데이터
const noticeData = [
  {
    id: 1,
    title: '공지0',
    excerpt: '공지 내용',
    date: '2025-01-01',
    views: 999,
    isPinned: true,
  },
  {
    id: 2,
    title: '공지0',
    excerpt: '공지 내용',
    date: '2025-01-01',
    views: 999,
    isPinned: true,
  },
  {
    id: 3,
    title: '공지0',
    excerpt: '공지 내용',
    date: '2025-01-01',
    views: 999,
    isPinned: false,
  },
];

const qnaData = [
  {
    id: 1,
    title: 'QnA테스트',
    author: '이름테스트',
    date: '2025-01-01',
    answers: 2,
    category: '스트링',
    isAnswered: true,
  },
  {
    id: 2,
    title: 'QnA테스트2',
    author: '이름테스트2',
    date: '2025-01-01',
    answers: 1,
    category: '라켓',
    isAnswered: true,
  },
  {
    id: 3,
    title: 'QnA테스트3',
    author: '이름테스트3',
    date: '2025-01-01',
    answers: 0,
    category: '주문/결제',
    isAnswered: false,
  },
];

const reviewData = [
  {
    id: 1,
    title: '사용후기',
    author: '이름테스트',
    rating: 5,
    date: '2025-01-01',
    excerpt: '후기후기후기',
    product: '상품명',
  },
  {
    id: 2,
    title: '서비스후기',
    author: '이름테스트',
    rating: 4,
    date: '2025-01-01',
    excerpt: '후기후기후기',
    product: '스트링 교체 서비스',
  },
  {
    id: 3,
    title: '리뷰테스트',
    author: '이름테스트',
    rating: 5,
    date: '2025-01-01',
    excerpt: '후기데스',
    product: '상품명',
  },
];

const stats = [
  { label: '전체 게시물', value: '0', icon: MessageSquare, color: 'text-blue-600' },
  { label: '활성 사용자', value: '0', icon: Users, color: 'text-teal-600' },
  { label: '이번 주 조회수', value: '0', icon: Eye, color: 'text-purple-600' },
  { label: '참여도', value: '0', icon: TrendingUp, color: 'text-green-600' },
];

function StatCard({ stat }: { stat: (typeof stats)[0] }) {
  const Icon = stat.icon;
  return (
    <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
            <Icon className={`h-6 w-6 ${stat.color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NoticeCard() {
  return (
    <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm h-full">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <span>공지사항</span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/board/notice">
              전체보기 <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {noticeData.map((notice) => (
            <div key={notice.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Link href={`/board/notice/${notice.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {notice.title}
                    </Link>
                    {notice.isPinned && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        고정
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{notice.excerpt}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
                    <span>{notice.date}</span>
                    <span className="flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      {notice.views}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QnaCard() {
  return (
    <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm h-full">
      <CardHeader className="bg-gradient-to-r from-teal-50 to-teal-100 dark:from-teal-950/50 dark:to-teal-900/50 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-teal-600" />
            <span>Q&A</span>
          </div>
          <div className="flex space-x-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/board/qna/write">
                <Plus className="h-4 w-4 mr-1" />
                질문하기
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/board/qna">
                전체보기 <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {qnaData.map((qna) => (
            <div key={qna.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Link href={`/board/qna/${qna.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                      {qna.title}
                    </Link>
                    <Badge variant="outline" className="text-xs">
                      {qna.category}
                    </Badge>
                    {qna.isAnswered && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                        답변완료
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
                    <span>{qna.author}</span>
                    <span>{qna.date}</span>
                    <span className="flex items-center">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      답변 {qna.answers}개
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewCard() {
  return (
    <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm h-full">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-purple-600" />
            <span>리뷰</span>
          </div>
          <div className="flex space-x-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/reviews/write">
                <Plus className="h-4 w-4 mr-1" />
                리뷰쓰기
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/reviews">
                전체보기 <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {reviewData.map((review) => (
            <div key={review.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Link href={`/reviews/${review.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                      {review.title}
                    </Link>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{review.excerpt}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
                    <span>{review.author}</span>
                    <span>{review.date}</span>
                    <span className="text-blue-600 dark:text-blue-400">{review.product}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BoardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 헤더 섹션 */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 shadow-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">게시판</h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">도깨비 테니스 아카데미의 최신 소식과 정보를 확인하고, 궁금한 점을 문의하세요</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} stat={stat} />
          ))}
        </div>

        {/* 메인 게시판 카드들 */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          <NoticeCard />
          <QnaCard />
          <ReviewCard />
        </div>

        {/* 추가 링크 섹션 */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">더 많은 정보가 필요하신가요?</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white shadow-lg">
                <Link href="/board/faq">자주 묻는 질문 보기</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-white/80 dark:bg-gray-700/80 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20">
                <Link href="/contact">직접 문의하기</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
