'use client';

import useSWRInfinite from 'swr/infinite';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, MessageSquareText, Trophy, Target } from 'lucide-react';
import ReviewCard from './ReviewCard';
import ReviewSkeleton from './ReviewSkeleton';

/** UI 상태 타입 명시 (실수 예방) */
type RatingFilter = 'all' | '5' | '4' | '3' | '2' | '1';

/** 서버 아이템 타입(표시용) */
type Item = {
  _id: string;
  type: 'product' | 'service';
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

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

export default function ReviewsClient() {
  /* 컨트롤 상태 */
  const [tab, setTab] = useState<'product' | 'service' | 'all'>('all');
  const [sort, setSort] = useState<'latest' | 'helpful' | 'rating'>('latest');
  const [rating, setRating] = useState<RatingFilter>('all');
  const [hasPhoto, setHasPhoto] = useState<boolean>(false);

  /* SWR Infinite 키 생성: 서버 API 쿼리와 1:1 매칭 (디버깅/유지보수 쉬움) */
  const getKey = useCallback(
    (pageIndex: number, prev: any) => {
      if (prev && !prev.nextCursor) return null;
      const cursor = pageIndex === 0 ? '' : `&cursor=${encodeURIComponent(prev.nextCursor)}`;
      const q = [`type=${tab}`, 'withHidden=mask', `sort=${sort}`, rating !== 'all' ? `rating=${rating}` : '', hasPhoto ? `hasPhoto=1` : '', 'limit=10', cursor].filter(Boolean).join('&');
      return `/api/reviews?${q}`;
    },
    [tab, sort, rating, hasPhoto]
  );

  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch('/api/users/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((u) => {
        const flag = u?.role === 'admin' || u?.role === 'ADMIN' || u?.isAdmin === true || (Array.isArray(u?.roles) && u.roles.includes('admin'));
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
  const items = useMemo<Item[]>(() => (data ? data.flatMap((d: any) => d.items as Item[]) : []), [data]);
  const hasMore = useMemo(() => (data ? Boolean(data[data.length - 1]?.nextCursor) : true), [data]);
  const isFirstLoading = !data && isValidating;

  /* 필터 요약 칩 표시용 텍스트 */
  const summary = [tab === 'all' ? '전체' : tab === 'product' ? '상품' : '서비스', sort === 'latest' ? '최신순' : sort === 'helpful' ? '도움순' : '평점순', rating !== 'all' ? `${rating}점만` : null, hasPhoto ? '사진만' : null]
    .filter(Boolean)
    .join(' · ');

  /* 모든 필터 리셋 */
  const resetFilters = () => {
    setTab('all');
    setSort('latest');
    setRating('all');
    setHasPhoto(false);
    // 첫 페이지부터 다시 로드
    mutate([], { revalidate: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card dark:from-background dark:via-muted dark:to-card relative">
      {/* Tennis court background pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.01] bg-tennis-court-pattern-review" />

      <div className="relative z-10 container mx-auto px-4 py-8 space-y-6">
        {/* Header with tennis theme */}
        <div className="text-center space-y-4 mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-background to-card flex items-center justify-center">
              <Trophy className="h-6 w-6 text-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">고객 리뷰</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">전문가와 고객들의 솔직한 후기를 확인하세요. 최고의 테니스 장비와 서비스 경험을 공유합니다.</p>
        </div>

        {/* Control panel with tennis court styling */}
        <Card className="border-0 bg-card/80 dark:bg-card backdrop-blur-sm shadow-lg rounded-3xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-background via-muted to-card" />
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Tabs with tennis court styling */}
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="bg-muted rounded-full p-1">
                  <TabsTrigger value="all" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    전체
                  </TabsTrigger>
                  <TabsTrigger value="product" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    상품
                  </TabsTrigger>
                  <TabsTrigger value="service" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    서비스
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Sort dropdown */}
              <Select value={sort} onValueChange={(v) => setSort(v as any)}>
                <SelectTrigger className="w-[150px] rounded-full border-border">
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
                <SelectTrigger className="w-[130px] rounded-full border-border">
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
              <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <Checkbox checked={hasPhoto} onCheckedChange={(v) => setHasPhoto(Boolean(v))} className="rounded border-border data-[state=checked]:bg-primary data-[state=checked]:border-border" />
                사진만 보기
              </label>

              {/* Filter summary and reset */}
              <div className="ml-auto flex items-center gap-3">
                <Badge variant="secondary" className="gap-2 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary px-3 py-1">
                  <Target className="h-3.5 w-3.5" />
                  {summary}
                </Badge>
                <Button variant="outline" size="sm" onClick={resetFilters} className="rounded-full border-border hover:bg-muted dark:border-border dark:hover:bg-muted bg-transparent" title="필터 초기화">
                  <X className="h-4 w-4 mr-1" />
                  초기화
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading skeleton */}
        {isFirstLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {items.map((it) => (
                  <ReviewCard key={it._id} item={it} isAdmin={isAdmin} isLoggedIn={isLoggedIn} onMutate={() => mutate()} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-background to-card dark:from-background dark:to-card flex items-center justify-center">
                  <MessageSquareText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">리뷰가 없습니다</h3>
                  <p className="text-sm text-muted-foreground">조건에 맞는 리뷰를 찾을 수 없습니다.</p>
                </div>
              </div>
            )}

            {/* Load more button */}
            <div className="flex justify-center pt-4">
              {hasMore ? (
                <Button
                  onClick={() => setSize(size + 1)}
                  disabled={isValidating}
                  variant="outline"
                  className="rounded-full px-8 py-2 bg-card/80 dark:bg-card backdrop-blur-sm border-border hover:bg-primary dark:hover:bg-muted"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중...
                    </>
                  ) : (
                    '더 보기'
                  )}
                </Button>
              ) : (
                <div className="text-sm text-muted-foreground py-6 text-center">마지막 페이지입니다</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
