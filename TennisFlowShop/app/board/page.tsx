"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Bell,
  Eye,
  MessageSquare,
  Plus,
  Star,
  Pin,
  Megaphone,
} from "lucide-react";
import useSWR from "swr";

import SiteContainer from "@/components/layout/SiteContainer";
import AsyncState from "@/components/system/AsyncState";
import { Skeleton } from "@/components/ui/skeleton";
import { COMMUNITY_BOARDS_ENABLED } from "@/lib/community/community-board-flags";
import {
  badgeBaseOutlined,
  badgeSizeSm,
  getAnswerStatusBadgeSpec,
  getNoticeCategoryBadgeSpec,
  getQnaCategoryBadgeSpec,
  getReviewTypeBadgeSpec,
} from "@/lib/badge-style";
import Link from "next/link";
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

function ErrorBox({
  message = "데이터를 불러오는 중 오류가 발생했습니다.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return <AsyncState kind="error" variant="inline" title={message} onAction={onRetry} />;
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
  type: "product" | "service";
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
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

// 제목/텍스트를 글자 수 기준으로 잘라서 항상 … 처리
function truncateText(text: string, max: number) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

// 리뷰 아이템에서 본문 후보 키(content/body/text/comment) 중 첫 번째 값 사용
function reviewExcerpt(r: ReviewItem, max = 60) {
  const raw = (r.content ?? "") as string;
  const plain = stripHtml(String(raw));
  if (plain) return plain.length > max ? plain.slice(0, max) + "…" : plain;
  // 본문이 없으면 기존 제목 대체값으로
  return r.productName || r.service || "리뷰";
}

// 데이터 fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return data;
};
const fmt = (v: string | Date) => new Date(v).toLocaleDateString();

function NoticeCard({
  items,
  isAdmin,
  isLoading,
  error,
  onRetry,
}: {
  items: NoticeItem[];
  isAdmin?: boolean;
  isLoading?: boolean;
  error?: any;
  onRetry?: () => void;
}) {
  return (
    <Card className="border border-border bg-card shadow-sm h-full">
      <CardHeader className="bg-muted/30 border-b p-4 sm:p-5 md:p-6">
        <CardTitle className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Megaphone className="h-5 w-5 text-primary" />
            <span className="text-ui-card-title-lg sm:text-ui-section-title md:text-ui-page-title font-semibold leading-tight break-keep">
              공지사항
            </span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {isAdmin && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/board/notice/write">
                  <Plus className="h-4 w-4 mr-1" />글 쓰기
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
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          {error ? (
            <ErrorBox message="공지 불러오기에 실패했습니다." onRetry={onRetry} />
          ) : isLoading ? (
            <FiveLineSkeleton />
          ) : items.length === 0 ? (
            <AsyncState
              kind="empty"
              variant="card"
              title="등록된 공지가 없습니다."
              description="새 소식이 등록되면 이곳에서 확인하실 수 있습니다."
            />
          ) : (
            items.map((notice) => (
              <div key={notice._id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {/* 카테고리 */}
                        {!!notice.category && (
                          <Badge
                            variant={getNoticeCategoryBadgeSpec(notice.category).variant}
                            className={`${badgeBaseOutlined} ${badgeSizeSm} shrink-0`}
                            title={notice.category ?? undefined}
                          >
                            {notice.category}
                          </Badge>
                        )}

                        {/* 고정 */}
                        {notice.isPinned && (
                          <Badge
                            variant="brand"
                            className={`${badgeBaseOutlined} ${badgeSizeSm} shrink-0`}
                            title="고정 공지"
                            aria-label="고정 공지"
                          >
                            <Pin className="h-3 w-3" />
                          </Badge>
                        )}

                        {/* 제목 (1줄 말줄임) */}
                        <Link
                          href={`/board/notice/${notice._id}`}
                          className="font-semibold text-foreground hover:text-primary dark:hover:text-primary transition-colors flex-1 min-w-0 truncate"
                        >
                          {notice.title}
                        </Link>
                      </div>

                      {/* 오른쪽: 첨부 뱃지들 */}
                      <div className="flex items-center gap-1 shrink-0">
                        {notice.hasImage && (
                          <Badge
                            variant="info"
                            className={`${badgeBaseOutlined} ${badgeSizeSm}`}
                            title={
                              typeof notice.imagesCount === "number"
                                ? `이미지 ${notice.imagesCount}개`
                                : "이미지 첨부"
                            }
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <rect x="3" y="3" width="18" height="14" rx="2" />
                              <path d="M3 13l4-4 5 5 3-3 6 6" />
                              <circle cx="8.5" cy="7.5" r="1.5" />
                            </svg>
                          </Badge>
                        )}
                        {notice.hasFile && (
                          <Badge
                            variant="neutral"
                            className={`${badgeBaseOutlined} ${badgeSizeSm}`}
                            title={
                              typeof notice.filesCount === "number"
                                ? `파일 ${notice.filesCount}개`
                                : "파일 첨부"
                            }
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.88 17.05a2 2 0 01-2.83-2.83l8.48-8.48" />
                            </svg>
                          </Badge>
                        )}
                      </div>
                    </div>

                    {!!notice.excerpt && (
                      <p className="text-ui-body-sm text-muted-foreground mb-2">{notice.excerpt}</p>
                    )}
                    <div className="flex items-center space-x-4 text-ui-label text-muted-foreground">
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

function QnaCard({
  items,
  isLoading,
  error,
  onRetry,
}: {
  items: QnaItem[];
  isLoading?: boolean;
  error?: any;
  onRetry?: () => void;
}) {
  return (
    <Card className="border border-border bg-card shadow-sm h-full">
      <CardHeader className="bg-muted/30 border-b p-4 sm:p-5 md:p-6">
        <CardTitle className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <MessageSquare className="h-5 w-5 text-success" />
            <span className="text-ui-card-title-lg sm:text-ui-section-title md:text-ui-page-title font-semibold leading-tight break-keep">
              Q&amp;A
            </span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/board/qna/write">
                <Plus className="h-4 w-4 mr-1" />
                문의하기
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
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          {error ? (
            <ErrorBox message="Q&A 불러오기에 실패했습니다." onRetry={onRetry} />
          ) : isLoading ? (
            <FiveLineSkeleton />
          ) : items.length === 0 ? (
            <AsyncState
              kind="empty"
              variant="card"
              title="등록된 문의가 없습니다."
              description="궁금한 점이 있다면 첫 문의를 남겨 주세요."
            />
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
                        <Badge
                          variant={getQnaCategoryBadgeSpec(qna.category).variant}
                          className={`${badgeBaseOutlined} ${badgeSizeSm} shrink-0`}
                          title={qna.category ?? undefined}
                        >
                          {qna.category ?? "일반문의"}
                        </Badge>

                        {/* 제목 (마지막, 잘림 처리) */}
                        <Link
                          href={`/board/qna/${qna._id}`}
                          className="font-semibold text-foreground hover:text-success dark:hover:text-success transition-colors flex-1 min-w-0 truncate"
                        >
                          {qna.title}
                        </Link>
                      </div>

                      {/* 오른쪽: 답변 상태 */}
                      <div className="shrink-0">
                        <Badge
                          variant={getAnswerStatusBadgeSpec(!!qna.answer).variant}
                          className={`${badgeBaseOutlined} ${badgeSizeSm}`}
                          title={qna.answer ? "답변 완료" : "답변 대기"}
                        >
                          {qna.answer ? "답변 완료" : "답변 대기"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-ui-label text-muted-foreground">
                      <span>{qna.authorName ?? "익명"}</span>
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

function ReviewCard({
  items,
  isLoading,
  error,
  onRetry,
}: {
  items: ReviewItem[];
  isLoading?: boolean;
  error?: any;
  onRetry?: () => void;
}) {
  return (
    <Card className="border border-border bg-card shadow-sm h-full">
      <CardHeader className="bg-muted/30 border-b p-4 sm:p-5 md:p-6">
        <CardTitle className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Star className="h-5 w-5 text-foreground" />
            <span className="text-ui-card-title-lg sm:text-ui-section-title md:text-ui-page-title font-semibold leading-tight break-keep">
              리뷰
            </span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/reviews/write">
                <Plus className="h-4 w-4 mr-1" />
                후기 작성
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
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          {error ? (
            <ErrorBox message="리뷰 불러오기에 실패했습니다." onRetry={onRetry} />
          ) : isLoading ? (
            <FiveLineSkeleton />
          ) : items.length === 0 ? (
            <div className="py-6 md:py-8 text-center text-ui-body-sm text-muted-foreground">
              등록된 리뷰가 없습니다.
            </div>
          ) : (
            items.map((review) => (
              <div key={review._id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1 min-w-0">
                      <Badge
                        variant={getReviewTypeBadgeSpec(review.type).variant}
                        className={`${badgeBaseOutlined} ${badgeSizeSm}`}
                      >
                        {review.type === "product"
                          ? "상품"
                          : review.type === "service"
                            ? "서비스"
                            : "기타"}
                      </Badge>
                      <Link
                        href="/reviews"
                        className="font-semibold text-foreground hover:text-foreground dark:hover:text-foreground transition-colors flex-1 min-w-0 truncate"
                      >
                        {reviewExcerpt(review)}
                      </Link>
                    </div>
                    <div className="flex items-center space-x-4 text-ui-label text-muted-foreground">
                      <span>{review.userName ?? "익명"}</span>
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
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="bg-muted/30 border-b p-4 sm:p-5 md:p-6">
        <CardTitle className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <MessageSquare className="h-5 w-5 text-foreground" />
            <span className="text-ui-card-title-lg sm:text-ui-section-title md:text-ui-page-title font-semibold leading-tight break-keep">
              커뮤니티 게시판
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 md:p-6 space-y-4 text-ui-body-sm text-muted-foreground">
        <p>공지사항, Q&A, 구매·서비스 후기를 한 곳에서 둘러볼 수 있어요.</p>
        {!COMMUNITY_BOARDS_ENABLED && (
          <p className="text-ui-label text-muted-foreground/80">
            커뮤니티 게시판은 운영 정책 변경으로 일시 중단되었습니다.
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-3">
          {COMMUNITY_BOARDS_ENABLED && (
            <>
              <Button asChild variant="outline" size="sm" className="w-full justify-between">
                <Link href="/board/free">
                  <span>자유게시판</span>
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-between">
                <Link href="/board/market">
                  <span>중고거래</span>
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-between">
                <Link href="/board/gear">
                  <span>장비 사용기</span>
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </>
          )}
          <Button asChild variant="outline" size="sm" className="w-full justify-between">
            <Link href="/reviews">
              <span>구매·서비스 후기</span>
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}

export default function BoardPage() {
  // 리뷰 게시판 허브용 – 최신 리뷰 5개만 가져오기
  const {
    data: rData,
    error: rError,
    isLoading: rLoading,
    mutate: mutateReviews,
  } = useSWR("/api/reviews?type=all&withHidden=mask&sort=latest&limit=5", fetcher);

  const reviews = Array.isArray(rData?.items) ? (rData.items as ReviewItem[]) : [];
  return (
    <div className="min-h-screen bg-muted/30">
      <SiteContainer
        variant="wide"
        className="py-6 bp-sm:py-8 bp-md:py-10 space-y-6 bp-md:space-y-8"
      >
        {/* 헤더 섹션 */}
        <div className="text-center space-y-3 bp-md:space-y-4">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h1 className="text-ui-page-title-lg md:text-ui-page-title-lg font-semibold tracking-normal text-foreground">
              커뮤니티
            </h1>
          </div>
          <p className="text-ui-card-title-lg text-muted-foreground max-w-2xl mx-auto">
            공지사항, Q&A, 리뷰를 한 곳에서 확인할 수 있습니다. 주문/서비스 문의는 고객센터를
            이용해주세요.
          </p>
        </div>

        {/* 메인 게시판 카드들 */}
        {/* 커뮤니티 허브 카드 (맨 위) */}
        <CommunityIntroCard />

        {/* 최신 리뷰 섹션 */}
        <div className="space-y-5 bp-md:space-y-6">
          <ReviewCard
            items={reviews}
            isLoading={rLoading}
            error={rError}
            onRetry={() => mutateReviews()}
          />
        </div>
      </SiteContainer>
    </div>
  );
}
