'use client';

import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Search, Filter, Grid3X3, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import useSWR from 'swr';
import RacketCard from './RacketCard';
import RacketFilterPanel from './RacketFilterPanel';
import { SkeletonProductCard } from '@/app/products/components/SkeletonProductCard';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

type RacketItem = {
  id: string;
  brand: string;
  model: string;
  price: number;
  condition: 'A' | 'B' | 'C';
  images: string[];
  status: 'available' | 'sold' | 'rented' | 'inactive';
  rental?: { enabled: boolean; deposit: number; fee: { d7: number; d15: number; d30: number } };
};

// /api/rackets 응답: 기존(배열) 또는 withTotal=1 ({ items, total })
type RacketsApiResponse = RacketItem[] | { items: RacketItem[]; total: number; page?: number; pageSize?: number };

// 브랜드 리스트
const brands = [
  { label: '요넥스', value: 'yonex' },
  { label: '윌슨', value: 'wilson' },
  { label: '바볼랏', value: 'babolat' },
  { label: '헤드', value: 'head' },
  { label: '던롭', value: 'dunlop' },
  { label: '프린스', value: 'prince' },
  { label: '테크니화이버', value: 'tecnifibre' },
];

const brandLabelMap: Record<string, string> = Object.fromEntries(brands.map(({ value, label }) => [value.toLowerCase(), label]));

type Props = {
  initialBrand?: string | null;
  initialCondition?: string | null;
};

export default function FilterableRacketList({ initialBrand = null, initialCondition = null }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // 정렬 / 뷰 모드
  const [sortOption, setSortOption] = useState('latest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [rentOnly, setRentOnly] = useState(() => searchParams.get('rentOnly') === '1');

  const isApplyFlow = searchParams.get('from') === 'apply';

  // 필터 상태들
  const [selectedBrand, setSelectedBrand] = useState<string | null>(initialBrand);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(initialCondition);
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);

  // 검색어
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  // 모바일(Sheet) 전용 임시 선택값(draft)
  // - Sheet에서 선택해도 즉시 SWR 재요청이 일어나지 않게 함
  // - "검색/적용" 버튼에서만 selectedXXX로 커밋
  const [draftBrand, setDraftBrand] = useState<string | null>(initialBrand);
  const [draftCondition, setDraftCondition] = useState<string | null>(initialCondition);
  const [draftPriceMin, setDraftPriceMin] = useState<number | null>(null);
  const [draftPriceMax, setDraftPriceMax] = useState<number | null>(null);
  const [draftSearchQuery, setDraftSearchQuery] = useState('');
  const [draftResetKey, setDraftResetKey] = useState(0);

  // 토글 (모바일용)
  const [showFilters, setShowFilters] = useState(false);

  // 애니메이션 / 리셋 key
  const [resetKey, setResetKey] = useState(0);

  // URL sync 초기화/변경 관리
  const isInitializingRef = useRef(true);
  const lastSerializedRef = useRef('');

  // 초기 URL -> 상태
  useEffect(() => {
    if (isInitializingRef.current) {
      const brand = searchParams.get('brand');
      setSelectedBrand(brand || null);

      const cond = searchParams.get('cond');
      setSelectedCondition(cond || null);

      const minPrice = searchParams.get('minPrice');
      const maxPrice = searchParams.get('maxPrice');
      setPriceMin(minPrice ? Number(minPrice) : null);
      setPriceMax(maxPrice ? Number(maxPrice) : null);
      setSortOption(searchParams.get('sort') || 'latest');

      const view = searchParams.get('view');
      setViewMode(view === 'list' ? 'list' : 'grid');

      const rent = searchParams.get('rentOnly');
      setRentOnly(rent === '1');

      const q = searchParams.get('q') || '';
      setSearchQuery(q);
      setSubmittedQuery(q);

      lastSerializedRef.current = searchParams.toString();
      isInitializingRef.current = false;
      return;
    }

    // URL 변화 동기화
    const brand = searchParams.get('brand');
    if ((brand || null) !== selectedBrand) setSelectedBrand(brand || null);

    const cond = searchParams.get('cond');
    if ((cond || null) !== selectedCondition) setSelectedCondition(cond || null);

    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const nextMin = minPrice ? Number(minPrice) : null;
    const nextMax = maxPrice ? Number(maxPrice) : null;
    if (nextMin !== priceMin) setPriceMin(nextMin);
    if (nextMax !== priceMax) setPriceMax(nextMax);
    const sort = searchParams.get('sort') || 'latest';
    if (sort !== sortOption) setSortOption(sort);

    const urlRentOnly = searchParams.get('rentOnly') === '1';
    if (urlRentOnly !== rentOnly) setRentOnly(urlRentOnly);

    const view = searchParams.get('view');
    const desiredView = view === 'list' ? 'list' : 'grid';
    if (desiredView !== viewMode) setViewMode(desiredView as 'grid' | 'list');
  }, [searchParams]);

  // API 호출
  const query = new URLSearchParams();
  query.set('withTotal', '1');
  if (rentOnly) query.set('rentOnly', '1');
  if (selectedBrand) query.set('brand', selectedBrand);
  if (selectedCondition) query.set('cond', selectedCondition);
  if (submittedQuery) query.set('q', submittedQuery);
  const key = `/api/rackets${query.toString() ? `?${query.toString()}` : ''}`;
  const { data, isLoading, isValidating, error, mutate } = useSWR<RacketsApiResponse>(key, fetcher, {
    revalidateOnFocus: false, // 탭/창 복귀 시 재요청 방지
    revalidateOnReconnect: false, // (원하면 true 유지 가능)
  });

  const [isUiTransitioning, setIsUiTransitioning] = useState(false);
  const sawLoadingRef = useRef(false);

  /**
   * 중요:
   * filterKey에는 "네트워크 재요청(SWR key 변경)"을 유발하는 값만 넣는다.
   * - 라켓 페이지는 brand/cond/q/rentOnly만 서버에 보내고,
   * - priceMin/priceMax/sortOption은 클라이언트 필터/정렬이므로 제외해야
   *   네트워크 없는 변경에서 스켈레톤이 불필요하게 켜지지 않는다.
   */
  const filterKey = useMemo(() => {
    return [selectedBrand ?? '', selectedCondition ?? '', submittedQuery ?? '', rentOnly ? '1' : '0'].join('|');
  }, [selectedBrand, selectedCondition, submittedQuery, rentOnly]);

  useLayoutEffect(() => {
    if (isInitializingRef.current) return;
    setIsUiTransitioning(true);
    sawLoadingRef.current = false;
  }, [filterKey]);

  useEffect(() => {
    if (!isUiTransitioning) return;

    const loadingNow = isLoading || isValidating; //  SWR 로딩/재검증을 함께

    if (loadingNow) {
      sawLoadingRef.current = true;
      return;
    }

    if (sawLoadingRef.current && !loadingNow) {
      setIsUiTransitioning(false);
      sawLoadingRef.current = false;
    }

    if (error) {
      setIsUiTransitioning(false);
      sawLoadingRef.current = false;
    }
  }, [isUiTransitioning, isLoading, isValidating, error]);

  // 전환 중 + 실제 로딩을 초기 로딩처럼 취급 (0개 1프레임 노출 방지)
  const isInitialLikeLoading = isLoading || isValidating || isUiTransitioning;
  const isBackgroundRefreshing = !!data && isValidating;

  // 배열/객체 응답을 rackets/total로 통일
  const { rackets, total } = useMemo(() => {
    if (!data) return { rackets: undefined as RacketItem[] | undefined, total: 0 };
    if (Array.isArray(data)) return { rackets: data, total: data.length };
    return { rackets: data.items ?? [], total: Number(data.total ?? 0) };
  }, [data]);

  // 클라이언트 필터링 및 정렬
  const racketsList = useCallback(() => {
    let list = Array.isArray(rackets) ? [...rackets] : [];

    // 가격 필터
    if (priceMin !== null) list = list.filter((r) => r.price >= priceMin);
    if (priceMax !== null) list = list.filter((r) => r.price <= priceMax);
    // 정렬
    if (sortOption === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  }, [rackets, sortOption, priceMin, priceMax]);

  const products = racketsList();

  // 검색 제출
  const handleSearchSubmit = useCallback(() => {
    setSubmittedQuery(searchQuery);
    setIsUiTransitioning(true);
    mutate();
  }, [searchQuery, mutate]);

  // 검색 초기화
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSubmittedQuery('');
    setIsUiTransitioning(true);
    mutate();
  }, [mutate]);

  // 필터 초기화
  const handleResetAll = useCallback(() => {
    setResetKey((k) => k + 1);
    setSelectedBrand(null);
    setSelectedCondition(null);
    setPriceMin(null);
    setPriceMax(null);
    setSortOption('latest');
    setViewMode('grid');
    setRentOnly(false);
    setSearchQuery('');
    setSubmittedQuery('');
    setIsUiTransitioning(true);
    mutate();
  }, [mutate]);

  const handleClearInput = useCallback(() => {
    setSearchQuery('');
  }, []);

  // draft를 현재 applied(selected) 값으로 동기화 (Sheet 열 때/취소할 때)
  const syncDraftFromApplied = useCallback(() => {
    setDraftBrand(selectedBrand);
    setDraftCondition(selectedCondition);
    setDraftPriceMin(priceMin);
    setDraftPriceMax(priceMax);
    setDraftSearchQuery(searchQuery);
  }, [selectedBrand, selectedCondition, priceMin, priceMax, searchQuery]);

  // Sheet 열기: 열릴 때마다 draft를 applied로 맞춰서 "현재 상태"를 보여줌
  const openFiltersSheet = useCallback(() => {
    syncDraftFromApplied();
    setShowFilters(true);
  }, [syncDraftFromApplied]);

  // Sheet 취소(닫기): draft를 applied로 되돌리고 닫기
  const cancelFiltersSheet = useCallback(() => {
    syncDraftFromApplied();
    setShowFilters(false);
  }, [syncDraftFromApplied]);

  // Sheet 적용(=검색): draft -> applied로 커밋 + 닫기
  const applyFiltersSheet = useCallback(() => {
    setSelectedBrand(draftBrand);
    setSelectedCondition(draftCondition);
    setPriceMin(draftPriceMin);
    setPriceMax(draftPriceMax);

    // 검색어는 submittedQuery만 서버 요청에 반영되므로 적용 시점에 커밋
    setSearchQuery(draftSearchQuery);
    setSubmittedQuery(draftSearchQuery);
    setIsUiTransitioning(true);
    setShowFilters(false);
    // key가 바뀌면 SWR이 자동으로 새로 fetch함 (mutate 강제 호출은 불필요)
  }, [draftBrand, draftCondition, draftPriceMin, draftPriceMax, draftSearchQuery]);

  // 모바일 Sheet에서만 "초기화"(draft만 초기화)
  const handleResetAllDraft = useCallback(() => {
    setDraftResetKey((k) => k + 1);
    setDraftBrand(null);
    setDraftCondition(null);
    setDraftPriceMin(null);
    setDraftPriceMax(null);
    setDraftSearchQuery('');
  }, []);

  // overlay/ESC로 닫히는 경우도 "취소"로 처리
  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (open) openFiltersSheet();
      else cancelFiltersSheet();
    },
    [openFiltersSheet, cancelFiltersSheet],
  );

  // 뷰포트가 lg(>=1024)로 커지면 Sheet는 자동으로 "취소 닫기"
  useEffect(() => {
    if (!showFilters) return;

    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) cancelFiltersSheet();
    };

    // 이미 lg 이상이면 즉시 닫기
    if (mql.matches) {
      cancelFiltersSheet();
      return;
    }

    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [showFilters, cancelFiltersSheet]);

  // active filter 개수
  const priceChanged = priceMin !== null || priceMax !== null;
  const activeFiltersCount = [selectedBrand, selectedCondition, submittedQuery, priceChanged, rentOnly].filter(Boolean).length;
  const draftPriceChanged = draftPriceMin !== null || draftPriceMax !== null;
  const activeDraftCount = [draftBrand, draftCondition, draftSearchQuery, draftPriceChanged].filter(Boolean).length;

  // 상태 -> URL 반영
  useEffect(() => {
    if (isInitializingRef.current) return;

    // 현재 URL을 기반으로 시작: from=apply 같은 "기타 쿼리"를 유지하기 위함
    const params = new URLSearchParams(searchParams.toString());

    const setOrDelete = (key: string, value: string | null) => {
      if (value && value.length > 0) params.set(key, value);
      else params.delete(key);
    };

    setOrDelete('brand', selectedBrand);
    setOrDelete('cond', selectedCondition);
    setOrDelete('q', submittedQuery ? submittedQuery : null);
    setOrDelete('sort', sortOption && sortOption !== 'latest' ? sortOption : null);
    setOrDelete('view', viewMode !== 'grid' ? viewMode : null);
    setOrDelete('minPrice', priceMin !== null ? String(priceMin) : null);
    setOrDelete('maxPrice', priceMax !== null ? String(priceMax) : null);
    setOrDelete('rentOnly', rentOnly ? '1' : null);

    const newSearch = params.toString();
    if (newSearch === lastSerializedRef.current) return;
    lastSerializedRef.current = newSearch;

    const nextUrl = `${pathname}${newSearch ? `?${newSearch}` : ''}`;
    router.replace(nextUrl, { scroll: false });
  }, [selectedBrand, selectedCondition, submittedQuery, sortOption, viewMode, priceMin, priceMax, rentOnly, router, pathname, searchParams]);

  // 데스크톱(좌측 고정 패널): 선택 즉시 반영(=기존 selected 사용)
  const desktopFilterPanelProps = {
    selectedBrand,
    setSelectedBrand,
    selectedCondition,
    setSelectedCondition,
    searchQuery,
    setSearchQuery,
    priceMin,
    priceMax,
    onChangePriceMin: setPriceMin,
    onChangePriceMax: setPriceMax,
    resetKey,
    activeFiltersCount,
    onReset: handleResetAll,
    isLoadingInitial: isLoading,
    showFilters,
    setShowFilters,
    brands,
    onClose: undefined,
    onSearchSubmit: handleSearchSubmit,
    onClearSearch: handleClearSearch,
    onClearInput: handleClearInput,
  };

  // 모바일(Sheet): draft만 변경 → "검색/적용"에서만 커밋
  const mobileFilterPanelProps = {
    selectedBrand: draftBrand,
    setSelectedBrand: setDraftBrand,
    selectedCondition: draftCondition,
    setSelectedCondition: setDraftCondition,
    searchQuery: draftSearchQuery,
    setSearchQuery: setDraftSearchQuery,
    priceMin: draftPriceMin,
    priceMax: draftPriceMax,
    onChangePriceMin: setDraftPriceMin,
    onChangePriceMax: setDraftPriceMax,
    resetKey: draftResetKey,
    activeFiltersCount: activeDraftCount,
    onReset: handleResetAllDraft,
    isLoadingInitial: isLoading,
    showFilters,
    setShowFilters,
    brands,
    onClose: cancelFiltersSheet, // X/닫기 = 취소
    onSearchSubmit: applyFiltersSheet, // "검색" = 적용+닫기
    onClearSearch: () => setDraftSearchQuery(''),
    onClearInput: () => setDraftSearchQuery(''),
  };

  return (
    <>
      <Sheet open={showFilters} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="right" className="w-full bp-sm:w-[420px] bp-md:w-[480px] max-w-none p-0 overflow-y-auto">
          <RacketFilterPanel {...mobileFilterPanelProps} />
        </SheetContent>
      </Sheet>

      <div className="grid grid-cols-1 gap-6 bp-md:gap-8 bp-lg:grid-cols-4">
        {/* 필터 사이드바 */}
        <div className={cn('hidden bp-lg:block', 'space-y-6 bp-lg:col-span-1')}>
          <div className="sticky top-20 self-start">
            <RacketFilterPanel {...desktopFilterPanelProps} />
          </div>
        </div>

        {/* 상품 목록 */}
        <div className="bp-lg:col-span-3">
          <div className="mb-6 bp-md:mb-8 space-y-3 bp-sm:space-y-0 bp-sm:flex bp-sm:items-center bp-sm:justify-between">
            <div className="flex items-center justify-between gap-3 bp-sm:justify-start">
              <div className="text-base bp-sm:text-lg font-semibold text-foreground">
                {rentOnly ? (
                  <>
                    대여 가능 총 {isInitialLikeLoading ? <Skeleton className="inline-block h-5 w-12 align-middle" /> : <span className="text-primary font-bold">{total}</span>}개 라켓
                    {isInitialLikeLoading ? <Skeleton className="inline-block h-5 w-10 align-middle" /> : <span className="ml-2 text-sm text-muted-foreground">(표시중 {products.length}개)</span>}
                  </>
                ) : (
                  <>
                    총 {isInitialLikeLoading ? <Skeleton className="inline-block h-5 w-12 align-middle" /> : <span className="text-primary font-bold">{total}</span>}개 라켓
                    {isInitialLikeLoading ? <Skeleton className="inline-block h-5 w-10 align-middle" /> : <span className="ml-2 text-sm text-muted-foreground">(표시중 {products.length}개)</span>}
                  </>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (showFilters) cancelFiltersSheet();
                  else openFiltersSheet();
                }}
                className="bp-lg:hidden h-9 px-3 border-border hover:bg-primary/10 dark:hover:bg-primary/20"
                aria-expanded={showFilters}
                aria-label="필터 열기"
              >
                <Filter className="w-4 h-4 mr-2" />
                필터{activeDraftCount > 0 && `(${activeDraftCount})`}
              </Button>
              {!isApplyFlow && (
                <Button
                  type="button"
                  variant={rentOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRentOnly((v) => !v)}
                  className={cn('h-9 px-3', rentOnly ? 'border-border' : 'border-border hover:bg-primary/10 dark:hover:bg-primary/20')}
                  aria-pressed={rentOnly}
                  aria-label="대여 가능 라켓만 보기 토글"
                >
                  대여만 보기
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center border border-border rounded-lg p-1 bg-card">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-9 p-0"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>

                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-9 p-0"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="h-9 w-[150px] bp-sm:w-[180px] rounded-lg border-2 focus:border-border dark:focus:border-border bg-card text-sm">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent className="dark:bg-card dark:border-border">
                  <SelectItem value="latest">최신순</SelectItem>
                  <SelectItem value="price-low">가격 낮은순</SelectItem>
                  <SelectItem value="price-high">가격 높은순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 콘텐츠 */}
          {isInitialLikeLoading ? (
            <div className={cn('grid gap-4 bp-md:gap-6', viewMode === 'grid' ? 'grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3' : 'grid-cols-1')}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonProductCard key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-destructive mb-2">불러오는 중 오류가 발생했습니다.</p>
              <Button onClick={() => mutate()} >
                다시 시도
              </Button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bp-md:w-24 bp-md:h-24 mx-auto mb-6 bg-muted/30 rounded-full flex items-center justify-center">
                <Search className="w-10 h-10 bp-md:w-12 bp-md:h-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">검색 결과가 없습니다</h3>
              <p className="text-muted-foreground mb-4">다른 검색어나 필터를 시도해보세요</p>
              <Button onClick={handleResetAll} variant="outline" className="border-border hover:bg-primary/10 dark:hover:bg-primary/20 bg-transparent">
                필터 초기화
              </Button>
            </div>
          ) : (
            <div className={cn('grid gap-4 bp-md:gap-6', viewMode === 'grid' ? 'grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3' : 'grid-cols-1')}>
              {products.map((racket) => (
                <RacketCard key={racket.id} racket={racket} viewMode={viewMode} brandLabel={brandLabelMap[racket.brand.toLowerCase()] ?? racket.brand} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
