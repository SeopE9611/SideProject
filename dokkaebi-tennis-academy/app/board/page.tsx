'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Bell, Dumbbell, Eye, MessageSquare, Plus, ShoppingBag, Star } from 'lucide-react';
import useSWR from 'swr';

import SiteContainer from '@/components/layout/SiteContainer';
import { Skeleton } from '@/components/ui/skeleton';
import { attachFileColor, attachImageColor, badgeBaseOutlined, badgeSizeSm, getAnswerStatusColor, getNoticeCategoryColor, getQnaCategoryColor, getReviewTypeColor, noticePinColor } from '@/lib/badge-style';
import Link from 'next/link';
import type { ReactNode } from 'react';

type BoardKind = 'free' | 'market' | 'gear';

type CommunityListItem = {
  id: string;
  title: string;
  createdAt: string | Date;
  nickname: string;
  category?: string | null;
  views?: number;
  commentsCount?: number;
};

function getBoardCategoryLabel(kind: BoardKind, category?: string | null) {
  const c = category ?? '';

  if (kind === 'free') {
    switch (c) {
      case 'general':
        return '자유';
      case 'info':
        return '정보';
      case 'qna':
        return '질문';
      case 'tip':
        return '노하우';
      case 'etc':
        return '기타';
      default:
        return c ? c : '분류';
    }
  }

  if (kind === 'market') {
    switch (c) {
      case 'racket':
        return '라켓';
      case 'string':
        return '스트링';
      case 'equipment':
        return '일반장비';
      default:
        return c ? c : '분류';
    }
  }

  switch (c) {
    case 'racket':
      return '라켓';
    case 'string':
      return '스트링';
    case 'shoes':
      return '테니스화';
    case 'bag':
      return '가방';
    case 'apparel':
      return '의류';
    case 'grip':
      return '그립';
    case 'accessory':
      return '악세서리';
    case 'ball':
      return '테니스볼';
    case 'other':
      return '기타';
    default:
      return c ? c : '분류';
  }
}

function getBoardCategoryBadgeColor(kind: BoardKind, category?: string | null) {
  const c = category ?? '';

  // 공통 fallback
  const gray = 'bg-background text-muted-foreground dark:bg-card dark:text-muted-foreground';

  if (kind === 'free') {
    switch (c) {
      case 'general':
        return 'bg-background text-foreground dark:bg-card dark:text-foreground';
      case 'info':
        return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';
      case 'qna':
        return 'bg-success/10 text-success dark:bg-success/10 dark:text-success';
      case 'tip':
        return 'bg-muted text-primary dark:bg-muted dark:text-primary';
      case 'etc':
        return gray;
      default:
        return gray;
    }
  }

  if (kind === 'market') {
    switch (c) {
      case 'racket':
        return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';
      case 'string':
        return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';
      case 'equipment':
        return 'bg-muted text-primary dark:bg-muted dark:text-primary';
      default:
        return gray;
    }
  }

  // gear
  switch (c) {
    case 'racket':
      return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';
    case 'string':
      return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';
    case 'shoes':
      return 'bg-muted text-primary dark:bg-muted dark:text-primary';
    case 'bag':
      return 'bg-muted text-foreground dark:bg-muted dark:text-foreground';
    case 'apparel':
      return 'bg-destructive/10 text-destructive dark:bg-destructive/10 dark:text-destructive';
    case 'grip':
      return 'bg-muted text-foreground dark:bg-muted dark:text-foreground';
    case 'accessory':
      return 'bg-background text-foreground dark:bg-card dark:text-foreground';
    case 'ball':
      return 'bg-muted text-foreground dark:bg-muted dark:text-foreground';
    case 'other':
      return gray;
    default:
      return gray;
  }
}

function CommunityLatestCard({
  kind,
  title,
  icon,
  headerClassName,
  listHref,
  writeHref,
  items,
  isLoading,
  error,
  emptyText,
}: {
  kind: BoardKind;
  title: string;
  icon: ReactNode;
  headerClassName: string;
  listHref: string;
  writeHref: string;
  items: CommunityListItem[];
  isLoading?: boolean;
  error?: any;
  emptyText: string;
}) {
  return (
    <Card className="border-0 bg-card shadow-xl backdrop-blur-sm">
      <CardHeader className={`${headerClassName} border-b`}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <span>{title}</span>
          </div>
          <div className="flex space-x-2">
            <Button asChild variant="ghost" size="sm">
              <Link href={writeHref}>
                <Plus className="h-4 w-4 mr-1" />
                글쓰기
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={listHref}>
                전체보기 <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-4">
          {error ? (
            <ErrorBox message={`${title} 불러오기에 실패했습니다.`} />
          ) : isLoading ? (
            <FiveLineSkeleton />
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{emptyText}</div>
          ) : (
            items.map((post) => (
              <div key={post.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {!!post.category && (
                          <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getBoardCategoryBadgeColor(kind, post.category)} shrink-0`} title={post.category ?? undefined}>
                            {getBoardCategoryLabel(kind, post.category)}
                          </Badge>
                        )}

                        <Link href={`${listHref}/${post.id}`} className="font-semibold text-foreground hover:opacity-80 transition-colors flex-1 min-w-0 truncate">
                          {post.title}
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{post.nickname ?? '익명'}</span>
                      <span>{fmt(post.createdAt)}</span>
                      <span className="flex items-center">
                        <Eye className="h-3 w-3 mr-1" />
                        {post.views ?? 0}
                      </span>
                      <span className="flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {post.commentsCount ?? 0}
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

// 공용 스켈레톤
function FiveLineSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border-b border-border last:border-0 pb-4 last:pb-0">
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
  return <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</div>;
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
    <Card className="border-0 bg-card shadow-xl backdrop-blur-sm h-full">
      <CardHeader className="bg-muted/30 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-primary" />
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
            <div className="py-8 text-center text-sm text-muted-foreground">등록된 공지가 없습니다.</div>
          ) : (
            items.map((notice) => (
              <div key={notice._id} className="border-b border-border last:border-0 pb-4 last:pb-0">
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
                        <Link href={`/board/notice/${notice._id}`} className="font-semibold text-foreground hover:text-primary dark:hover:text-primary transition-colors flex-1 min-w-0 truncate">
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

                    {!!notice.excerpt && <p className="text-sm text-muted-foreground mb-2">{notice.excerpt}</p>}
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
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
    <Card className="border-0 bg-card shadow-xl backdrop-blur-sm h-full">
      <CardHeader className="bg-muted/30 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-success" />
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
            <div className="py-8 text-center text-sm text-muted-foreground">등록된 문의가 없습니다.</div>
          ) : (
            items.map((qna) => (
              <div key={qna._id} className="border-b border-border last:border-0 pb-4 last:pb-0">
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
                        <Link href={`/board/qna/${qna._id}`} className="font-semibold text-foreground hover:text-success dark:hover:text-success transition-colors flex-1 min-w-0 truncate">
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

                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
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
    <Card className="border-0 bg-card shadow-xl backdrop-blur-sm h-full">
      <CardHeader className="bg-muted/30 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-foreground" />
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
            <div className="py-8 text-center text-sm text-muted-foreground">등록된 리뷰가 없습니다.</div>
          ) : (
            items.map((review) => (
              <div key={review._id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1 min-w-0">
                      <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getReviewTypeColor(review.type)}`}>
                        {review.type === 'product' ? '상품' : review.type === 'service' ? '서비스' : '기타'}
                      </Badge>
                      <Link href="/reviews" className="font-semibold text-foreground hover:text-foreground dark:hover:text-foreground transition-colors flex-1 min-w-0 truncate">
                        {reviewExcerpt(review)}
                      </Link>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
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
    <Card className="border-0 bg-card shadow-xl backdrop-blur-sm">
      <CardHeader className="bg-muted/30 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-foreground" />
            <span>커뮤니티 게시판</span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-4 text-sm text-muted-foreground">
        <p>자유게시판, 중고거래, 장비 사용기, 리뷰까지 한 곳에서 빠르게 둘러볼 수 있어요.</p>

        <div className="grid gap-2 sm:grid-cols-4">
          <Button asChild variant="outline" size="sm" className="w-full justify-between">
            <Link href="/reviews">
              <span>리뷰</span>
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="w-full justify-between">
            <Link href="/board/free">
              <span>자유</span>
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="w-full justify-between">
            <Link href="/board/market">
              <span>중고</span>
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="w-full justify-between">
            <Link href="/board/gear">
              <span>사용기</span>
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>

        {/* <div className="pt-1">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="outline" size="sm" className="w-full justify-between border-dashed">
              <Link href="/board/hot">
                <span>인기글 모아보기</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm" className="w-full justify-between border-dashed">
              <Link href="/board/brands">
                <span>브랜드별 게시판</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div> */}
      </CardContent>
    </Card>
  );
}

export default function BoardPage() {
  // 리뷰 게시판 허브용 – 최신 리뷰 5개만 가져오기
  const { data: rData, error: rError, isLoading: rLoading } = useSWR('/api/reviews?type=all&withHidden=mask&sort=latest&limit=5', fetcher);

  const reviews = Array.isArray(rData?.items) ? (rData.items as ReviewItem[]) : [];
  // 자유/중고/사용기 최신글 5개
  const { data: fData, error: fError, isLoading: fLoading } = useSWR('/api/boards?kind=free&sort=latest&limit=5&page=1', fetcher);
  const { data: mData, error: mError, isLoading: mLoading } = useSWR('/api/boards?kind=market&sort=latest&limit=5&page=1', fetcher);
  const { data: gData, error: gError, isLoading: gLoading } = useSWR('/api/boards?kind=gear&sort=latest&limit=5&page=1', fetcher);

  const freePosts = Array.isArray(fData?.items) ? (fData.items as CommunityListItem[]) : [];
  const marketPosts = Array.isArray(mData?.items) ? (mData.items as CommunityListItem[]) : [];
  const gearPosts = Array.isArray(gData?.items) ? (gData.items as CommunityListItem[]) : [];

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-md:py-10 space-y-8">
        {/* 헤더 섹션 */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30 shadow-lg">
              <MessageSquare className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">게시판</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">리뷰와 커뮤니티 게시판의 최신글을 한 곳에서 확인해 보세요.</p>
        </div>

        {/* 메인 게시판 카드들 */}
        {/* 커뮤니티 허브 카드 (맨 위) */}
        <CommunityIntroCard />

        {/* 최신글 섹션 4개: 리뷰 → 자게 → 중고 → 사용기 */}
        <div className="space-y-6">
          <ReviewCard items={reviews} isLoading={rLoading} error={rError} />

          <CommunityLatestCard
            kind="free"
            title="자유게시판"
            icon={<MessageSquare className="h-5 w-5 text-foreground" />}
            headerClassName="bg-muted/50 dark:bg-card/40 border-b border-border"
            listHref="/board/free"
            writeHref="/board/free/write"
            items={freePosts}
            isLoading={fLoading}
            error={fError}
            emptyText="등록된 자유게시판 글이 없습니다."
          />

          <CommunityLatestCard
            kind="market"
            title="중고거래"
            icon={<ShoppingBag className="h-5 w-5 text-primary" />}
            headerClassName="bg-muted/50 dark:bg-card/40 border-b border-border"
            listHref="/board/market"
            writeHref="/board/market/write"
            items={marketPosts}
            isLoading={mLoading}
            error={mError}
            emptyText="등록된 중고거래 글이 없습니다."
          />

          <CommunityLatestCard
            kind="gear"
            title="장비 사용기"
            icon={<Dumbbell className="h-5 w-5 text-primary" />}
            headerClassName="bg-muted/50 dark:bg-card/40 border-b border-border"
            listHref="/board/gear"
            writeHref="/board/gear/write"
            items={gearPosts}
            isLoading={gLoading}
            error={gError}
            emptyText="등록된 장비 사용기 글이 없습니다."
          />
        </div>
      </SiteContainer>
    </div>
  );
}
