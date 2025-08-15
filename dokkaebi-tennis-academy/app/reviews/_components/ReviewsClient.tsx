'use client';

import useSWRInfinite from 'swr/infinite';
import { useMemo, useState, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Filter, X, MessageSquareText } from 'lucide-react';
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
      const q = [`type=${tab}`, `sort=${sort}`, rating !== 'all' ? `rating=${rating}` : '', hasPhoto ? `hasPhoto=1` : '', 'limit=10', cursor].filter(Boolean).join('&');
      return `/api/reviews?${q}`;
    },
    [tab, sort, rating, hasPhoto]
  );

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
    <div className="space-y-5">
      {/* 상단 헤더 */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">상품/서비스 리뷰를 한 곳에서 확인하세요. 별점·정렬·사진 필터를 지원합니다.</p>
      </div>

      {/* 컨트롤 바 */}
      <Card className="border border-slate-200/70 dark:border-slate-800/70 rounded-2xl">
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* 탭 */}
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="all">전체</TabsTrigger>
                <TabsTrigger value="product">상품</TabsTrigger>
                <TabsTrigger value="service">서비스</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* 정렬 */}
            <Select value={sort} onValueChange={(v) => setSort(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">최신순</SelectItem>
                <SelectItem value="helpful">도움돼요 많은순</SelectItem>
                <SelectItem value="rating">평점 높은순</SelectItem>
              </SelectContent>
            </Select>

            {/* 별점 */}
            <Select value={rating} onValueChange={(v) => setRating(v as RatingFilter)}>
              <SelectTrigger className="w-[130px]">
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

            {/* 사진만 */}
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox checked={hasPhoto} onCheckedChange={(v) => setHasPhoto(Boolean(v))} />
              사진만 보기
            </label>

            {/* 필터 요약과 리셋 버튼 */}
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 rounded-full">
                <Filter className="h-3.5 w-3.5" />
                {summary}
              </Badge>
              <Button variant="outline" size="sm" onClick={resetFilters} title="필터 초기화">
                <X className="h-4 w-4 mr-1" />
                초기화
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 로딩 스켈레톤: 모바일 1개 / md 이상 2개 */}
      {isFirstLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReviewSkeleton />
          <div className="hidden md:block">
            <ReviewSkeleton />
          </div>
        </div>
      )}

      {/* 결과 영역 */}
      {!isFirstLoading && (
        <>
          {items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((it) => (
                <ReviewCard key={it._id} item={it} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <MessageSquareText className="h-8 w-8 text-slate-400" />
              <div className="text-sm text-muted-foreground">조건에 맞는 리뷰가 없습니다.</div>
            </div>
          )}

          {/* 더보기 */}
          <div className="flex justify-center pt-2">
            {hasMore ? (
              <Button onClick={() => setSize(size + 1)} disabled={isValidating} variant="outline">
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중...
                  </>
                ) : (
                  '더 보기'
                )}
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground py-6">마지막 페이지입니다</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
