'use client';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Bell, Star, ArrowRight, Plus, Eye } from 'lucide-react';
import Link from 'next/link';
import { badgeBaseOutlined, badgeSizeSm, getQnaCategoryColor, getAnswerStatusColor, getReviewTypeColor, noticePinColor, getNoticeCategoryColor, attachImageColor, attachFileColor } from '@/lib/badge-style';
import { Skeleton } from '@/components/ui/skeleton';

// 공용 스켈레톤
function FiveLineSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex items-center space-x-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorBox({ message = '데이터를 불러오는 중 오류가 발생했습니다.' }) {
  return <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{message}</div>;
}

type NoticeItem = {
  _id: string;
  title: string;
  createdAt: string | Date;
  viewCount?: number;
  isPinned?: boolean;
  excerpt?: string;
  category?: string | null;
  hasImage?: boolean;
  hasFile?: boolean;
  imagesCount?: number;
  filesCount?: number;
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

// 제목/텍스트를 글자 수 기준으로 잘라서 항상 … 처리
function truncateText(text: string, max: number) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

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

function NoticeCard({ items, isAdmin, isLoading, error }: { items: NoticeItem[]; isAdmin?: boolean; isLoading?: boolean; error?: any }) {
  return (
    <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm h-full">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <span>공지사항</span>
          </div>
          <div className="flex space-x-2">
            {isAdmin && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/board/notice/write">
                  <Plus className="h-4 w-4 mr-1" />
                  공지 쓰기
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href="/board/notice">
                전체보기 <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {error ? (
            <ErrorBox message="공지 불러오기에 실패했습니다." />
          ) : isLoading ? (
            <FiveLineSkeleton />
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">등록된 공지가 없습니다.</div>
          ) : (
            items.map((notice) => (
              <div key={notice._id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {/* 카테고리 */}
                        {!!notice.category && (
                          <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getNoticeCategoryColor(notice.category)} shrink-0`} title={notice.category ?? undefined}>
                            {notice.category}
                          </Badge>
                        )}

                        {/* 고정 */}
                        {notice.isPinned && (
                          <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${noticePinColor} shrink-0`}>
                            고정
                          </Badge>
                        )}

                        {/* 제목 (1줄 말줄임) */}
                        <Link href={`/board/notice/${notice._id}`} className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-1 min-w-0 truncate">
                          {notice.title}
                        </Link>
                      </div>

                      {/* 오른쪽: 첨부 뱃지들 */}
                      <div className="flex items-center gap-1 shrink-0">
                        {notice.hasImage && (
                          <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${attachImageColor}`} title={typeof notice.imagesCount === 'number' ? `이미지 ${notice.imagesCount}개` : '이미지 첨부'}>
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="14" rx="2" />
                              <path d="M3 13l4-4 5 5 3-3 6 6" />
                              <circle cx="8.5" cy="7.5" r="1.5" />
                            </svg>
                          </Badge>
                        )}
                        {notice.hasFile && (
                          <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${attachFileColor}`} title={typeof notice.filesCount === 'number' ? `파일 ${notice.filesCount}개` : '파일 첨부'}>
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.88 17.05a2 2 0 01-2.83-2.83l8.48-8.48" />
                            </svg>
                          </Badge>
                        )}
                      </div>
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QnaCard({ items, isLoading, error }: { items: QnaItem[]; isLoading?: boolean; error?: any }) {
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
          {error ? (
            <ErrorBox message="Q&A 불러오기에 실패했습니다." />
          ) : isLoading ? (
            <FiveLineSkeleton />
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">등록된 문의가 없습니다.</div>
          ) : (
            items.map((qna) => (
              <div key={qna._id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* 제목 줄: 왼쪽(카테고리/제목) · 오른쪽(답변상태) */}
                    <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                      {/* 왼쪽 */}
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {/* 카테고리 먼저 */}
                        <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getQnaCategoryColor(qna.category)} shrink-0`} title={qna.category ?? undefined}>
                          {qna.category ?? '일반문의'}
                        </Badge>

                        {/* 제목 (마지막, 잘림 처리) */}
                        <Link href={`/board/qna/${qna._id}`} className="font-semibold text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex-1 min-w-0 truncate">
                          {qna.title}
                        </Link>
                      </div>

                      {/* 오른쪽: 답변 상태 */}
                      <div className="shrink-0">
                        <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getAnswerStatusColor(!!qna.answer)}`} title={qna.answer ? '답변 완료' : '답변 대기'}>
                          {qna.answer ? '답변 완료' : '답변 대기'}
                        </Badge>
                      </div>
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewCard({ items, isLoading, error }: { items: ReviewItem[]; isLoading?: boolean; error?: any }) {
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
          {error ? (
            <ErrorBox message="리뷰 불러오기에 실패했습니다." />
          ) : isLoading ? (
            <FiveLineSkeleton />
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">등록된 리뷰가 없습니다.</div>
          ) : (
            items.map((review) => (
              <div key={review._id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1 min-w-0">
                      <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getReviewTypeColor(review.type)}`}>
                        {review.type === 'product' ? '상품' : review.type === 'service' ? '서비스' : '기타'}
                      </Badge>
                      <Link href="/reviews" className="font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex-1 min-w-0 truncate ">
                        {reviewExcerpt(review)}
                      </Link>
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CommunityIntroCard() {
  return (
    <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm h-full">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-100 dark:from-indigo-950/50 dark:to-purple-900/50 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            <span>커뮤니티 게시판</span>
          </div>
          <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} shrink-0`}>
            준비중
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-3 text-sm text-gray-600 dark:text-gray-300">
        <p>앞으로 이곳에서 자유 게시판, 브랜드별 게시판, 인기글 모아보기 등 다양한 커뮤니티 기능을 제공할 예정입니다.</p>
        <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm">
          <li>자유 게시판 – 질문, 정보 공유, 일상 이야기</li>
          <li>브랜드별 게시판 – 라켓/스트링 브랜드별 사용 후기</li>
          <li>인기글 모아보기 – 조회수/댓글 기준 하이라이트</li>
        </ul>
        <div className="pt-2">
          <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
            <Link href="/reviews">지금은 리뷰 게시판 둘러보기</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BoardPage() {
  // 리뷰 게시판 허브용 – 최신 리뷰 5개만 가져오기
  const { data: rData, error: rError, isLoading: rLoading } = useSWR('/api/reviews?type=all&withHidden=mask&sort=latest&limit=5', fetcher);

  const reviews = Array.isArray(rData?.items) ? (rData.items as ReviewItem[]) : [];

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
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">회원들의 생생한 후기와 앞으로 추가될 커뮤니티 게시판을 한 곳에서 만나보세요.</p>
        </div>

        {/* 메인 게시판 카드들 */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          <ReviewCard items={reviews} isLoading={rLoading} error={rError} />
          <CommunityIntroCard />
        </div>

        {/* 추가 링크 섹션 */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">더 많은 후기와 이야기를 보고 싶으신가요?</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white shadow-lg">
                <Link href="/reviews">리뷰 게시판 전체 보기</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-white/80 dark:bg-gray-700/80 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20">
                <Link href="/support">고객센터로 이동</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
