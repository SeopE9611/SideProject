'use client';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Bell, Star, Users, TrendingUp, Eye, ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { badgeBaseOutlined, badgeSizeSm, getQnaCategoryColor, getAnswerStatusColor, noticePinColor, getReviewTypeColor } from '@/lib/badge-style';
type NoticeItem = {
  _id: string;
  title: string;
  createdAt: string | Date;
  viewCount?: number;
  isPinned?: boolean;
  excerpt?: string;
};

type QnaItem = {
  _id: string;
  title: string;
  createdAt: string | Date;
  category?: string;
  authorName?: string | null;
  answer?: any; // 있으면 답변완료
  viewCount?: number;
};

type ReviewItem = {
  _id: string;
  type: 'product' | 'service';
  userName: string | null;
  productName?: string | null;
  service?: string | null;
  rating: number;
  createdAt: string | Date;
  content?: string;
};

// HTML 태그 제거 + 공백 정리
const stripHtml = (s: string) =>
  s
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// 리뷰 아이템에서 본문 후보 키(content/body/text/comment) 중 첫 번째 값 사용
function reviewExcerpt(r: ReviewItem, max = 60) {
  const raw = (r.content ?? '') as string;
  const plain = stripHtml(String(raw));
  if (plain) return plain.length > max ? plain.slice(0, max) + '…' : plain;
  // 본문이 없으면 기존 제목 대체값으로
  return r.productName || r.service || '리뷰';
}

// 데이터 fetcher
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
const fmt = (v: string | Date) => new Date(v).toLocaleDateString();

function NoticeCard({ items }: { items: NoticeItem[] }) {
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
          {items.map((notice) => (
            <div key={notice._id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Link href={`/board/notice/${notice._id}`} className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {notice.title}
                    </Link>
                    {notice.isPinned && (
                      <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${noticePinColor}`}>
                        고정
                      </Badge>
                    )}
                  </div>
                  {!!notice.excerpt && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{notice.excerpt}</p>}
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
                    <span>{fmt(notice.createdAt)}</span>
                    <span className="flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      {notice.viewCount ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="text-sm text-gray-500">등록된 공지가 없습니다.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function QnaCard({ items }: { items: QnaItem[] }) {
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
          {items.map((qna) => (
            <div key={qna._id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Link href={`/board/qna/${qna._id}`} className="font-semibold text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                      {qna.title}
                    </Link>
                    <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getQnaCategoryColor(qna.category)}`}>
                      {qna.category ?? '일반문의'}
                    </Badge>
                    <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getAnswerStatusColor(!!qna.answer)}`}>
                      {qna.answer ? '답변 완료' : '답변 대기'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
                    <span>{qna.authorName ?? '익명'}</span>
                    <span>{fmt(qna.createdAt)}</span>
                    <span className="flex items-center">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      답변 {qna.answer ? 1 : 0}개
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="text-sm text-gray-500">등록된 문의가 없습니다.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewCard() {
  // 최신 리뷰 5개만 보드에 노출
  const { data, error, isLoading } = useSWR('/api/reviews?type=all&withHidden=mask&sort=latest&limit=5', fetcher);
  const items: ReviewItem[] = data?.items ?? [];

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
          {isLoading && <div className="text-sm text-gray-500">불러오는 중…</div>}
          {error && <div className="text-sm text-red-500">리뷰 불러오기에 실패했습니다.</div>}

          {items.map((review) => (
            <div key={review._id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1 min-w-0">
                    <Link href="/reviews" className="font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex-1 min-w-0 truncate ">
                      {reviewExcerpt(review)}
                    </Link>
                    <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getReviewTypeColor(review.type)}`}>
                      {review.type === 'product' ? '상품' : review.type === 'service' ? '서비스' : '기타'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
                    <span>{review.userName ?? '익명'}</span>
                    <span>{fmt(review.createdAt)}</span>
                    <span className="flex items-center">
                      <Star className="h-3 w-3 mr-1" />
                      {review.rating}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {!isLoading && !error && items.length === 0 && <div className="text-sm text-gray-500">등록된 리뷰가 없습니다.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BoardPage() {
  // 데이터 로드
  const { data, error, isLoading } = useSWR('/api/boards/main', fetcher);
  const notices = data?.notices ?? [];
  const qnas = data?.qna ?? [];

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

        {/* 메인 게시판 카드들 */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          <NoticeCard items={notices} />
          <QnaCard items={qnas} />
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
