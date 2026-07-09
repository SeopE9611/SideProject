"use client";

import useSWRInfinite from "swr/infinite";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/public";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, MessageSquareText, Target } from "lucide-react";
import ReviewCard from "./ReviewCard";
import ReviewSkeleton from "./ReviewSkeleton";
import { getAuxiliaryMetaBadgeSpec } from "@/lib/badge-style";

/** UI 상태 타입 명시 (실수 예방) */
type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";

/** 서버 아이템 타입(표시용) */
type Item = {
  _id: string;
  type: "product" | "service" | "rental";
  productId?: string;
  productName?: string;
  productImage?: string;
  service?: string;
  serviceApplicationId?: string;
  serviceTitle?: string;
  serviceTargetName?: string;
  userName: string;
  rating: number;
  content: string;
  photos?: string[];
  helpfulCount: number;
  createdAt: string;
  votedByMe?: boolean;
};

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json());

export default function ReviewsClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  /* 컨트롤 상태 */
  const [tab, setTab] = useState<"product" | "service" | "rental" | "all">(
    initialTab === "product" || initialTab === "service" || initialTab === "rental"
      ? initialTab
      : "all",
  );
  const [sort, setSort] = useState<"latest" | "helpful" | "rating">("latest");
  const [rating, setRating] = useState<RatingFilter>("all");
  const [hasPhoto, setHasPhoto] = useState<boolean>(false);

  /* SWR Infinite 키 생성: 서버 API 쿼리와 1:1 매칭 (디버깅/유지보수 쉬움) */
  const getKey = useCallback(
    (pageIndex: number, prev: any) => {
      if (prev && !prev.nextCursor) return null;
      const cursor = pageIndex === 0 ? "" : `&cursor=${encodeURIComponent(prev.nextCursor)}`;
      const q = [
        `type=${tab}`,
        "withHidden=mask",
        `sort=${sort}`,
        rating !== "all" ? `rating=${rating}` : "",
        hasPhoto ? `hasPhoto=1` : "",
        "limit=10",
        cursor,
      ]
        .filter(Boolean)
        .join("&");
      return `/api/reviews?${q}`;
    },
    [tab, sort, rating, hasPhoto],
  );

  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => r.json())
      .then((u) => {
        const flag =
          u?.role === "admin" ||
          u?.role === "ADMIN" ||
          u?.isAdmin === true ||
          (Array.isArray(u?.roles) && u.roles.includes("admin"));
        setIsAdmin(Boolean(flag));
        setIsLoggedIn(!!u && !u?.error); // 로그인 여부
      })
      .catch(() => {
        setIsAdmin(false);
        setIsLoggedIn(false);
      });
  }, []);
  const { data, size, setSize, isValidating, mutate } = useSWRInfinite(getKey, fetcher, {
    revalidateFirstPage: false,
    persistSize: true,
  });

  /* 파생 상태 */
  const items = useMemo<Item[]>(
    () => (data ? data.flatMap((d: any) => d.items as Item[]) : []),
    [data],
  );
  const hasMore = useMemo(() => (data ? Boolean(data[data.length - 1]?.nextCursor) : true), [data]);
  const isFirstLoading = !data && isValidating;

  /* 필터 요약 칩 표시용 텍스트 */
  const summary = [
    tab === "all" ? "전체" : tab === "product" ? "상품" : tab === "service" ? "교체서비스" : "대여",
    sort === "latest" ? "최신순" : sort === "helpful" ? "도움순" : "평점순",
    rating !== "all" ? `${rating}점만` : null,
    hasPhoto ? "사진만" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  /* 모든 필터 리셋 */
  const resetFilters = () => {
    setTab("all");
    setSort("latest");
    setRating("all");
    setHasPhoto(false);
    // 첫 페이지부터 다시 로드
    mutate([], { revalidate: true });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 md:space-y-6">
      {/* Control panel */}
      <Card className="overflow-hidden border-border bg-card shadow-sm">
        <div className="h-px bg-border" />
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
            {/* Tabs with tennis court styling */}
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full lg:w-auto">
              <TabsList className="grid w-full grid-cols-4 bg-secondary p-1 lg:w-auto">
                <TabsTrigger
                  value="all"
                  className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  전체
                </TabsTrigger>
                <TabsTrigger
                  value="product"
                  className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  상품 후기
                </TabsTrigger>
                <TabsTrigger
                  value="service"
                  className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  교체서비스 후기
                </TabsTrigger>
                <TabsTrigger
                  value="rental"
                  className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  대여 후기
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Sort dropdown */}
            <Select value={sort} onValueChange={(v) => setSort(v as any)}>
              <SelectTrigger className="h-9 w-full border-border bg-background sm:w-[150px]">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">최신순</SelectItem>
                <SelectItem value="helpful">도움돼요 많은순</SelectItem>
                <SelectItem value="rating">평점 높은순</SelectItem>
              </SelectContent>
            </Select>

            {/* Rating filter */}
            <Select value={rating} onValueChange={(v) => setRating(v as RatingFilter)}>
              <SelectTrigger className="h-9 w-full border-border bg-background sm:w-[130px]">
                <SelectValue placeholder="전체 별점" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 별점</SelectItem>
                <SelectItem value="5">★ 5점만</SelectItem>
                <SelectItem value="4">★ 4점만</SelectItem>
                <SelectItem value="3">★ 3점만</SelectItem>
                <SelectItem value="2">★ 2점만</SelectItem>
                <SelectItem value="1">★ 1점만</SelectItem>
              </SelectContent>
            </Select>

            {/* Photo filter checkbox */}
            <label className="inline-flex items-center gap-2 text-ui-body-sm font-medium text-foreground">
              <Checkbox
                checked={hasPhoto}
                onCheckedChange={(v) => setHasPhoto(Boolean(v))}
                className="rounded border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              사진만 보기
            </label>

            {/* Filter summary and reset */}
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:ml-auto lg:w-auto">
              <Badge
                variant={getAuxiliaryMetaBadgeSpec("attached").variant}
                className="gap-2 rounded-full px-3 py-1"
              >
                <Target className="h-3.5 w-3.5" />
                {summary}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="h-9 w-full overflow-hidden whitespace-nowrap rounded-full border-border bg-transparent hover:bg-muted sm:w-auto dark:border-border dark:hover:bg-muted"
                title="필터 초기화"
              >
                <X className="h-4 w-4 mr-1" />
                초기화
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {isFirstLoading && (
        <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
          <ReviewSkeleton />
          <div className="hidden lg:block">
            <ReviewSkeleton />
          </div>
        </div>
      )}

      {/* Results area */}
      {!isFirstLoading && (
        <>
          {items.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
              {items.map((it) => (
                <ReviewCard
                  key={it._id}
                  item={it}
                  isAdmin={isAdmin}
                  isLoggedIn={isLoggedIn}
                  onMutate={() => mutate()}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<MessageSquareText className="h-8 w-8" />}
              title="리뷰가 없습니다"
              description="조건에 맞는 리뷰를 찾을 수 없습니다."
            />
          )}

          {/* Load more button */}
          <div className="flex justify-center pt-4">
            {hasMore ? (
              <Button
                onClick={() => setSize(size + 1)}
                disabled={isValidating}
                variant="outline"
                className="rounded-full border-border bg-background px-6 py-2 md:px-8 hover:bg-card"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <Skeleton aria-hidden className="h-4 w-16 rounded-full" />
                    <span className="sr-only">리뷰를 불러오는 중입니다</span>
                  </>
                ) : (
                  "더 보기"
                )}
              </Button>
            ) : (
              <div className="text-ui-body-sm text-muted-foreground py-6 text-center">
                마지막 페이지입니다
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
