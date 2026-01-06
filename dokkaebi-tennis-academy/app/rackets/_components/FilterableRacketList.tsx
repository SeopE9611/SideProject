'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

    const view = searchParams.get('view');
    const desiredView = view === 'list' ? 'list' : 'grid';
    if (desiredView !== viewMode) setViewMode(desiredView as 'grid' | 'list');
  }, [searchParams]);

  // API 호출
  const query = new URLSearchParams();
  if (selectedBrand) query.set('brand', selectedBrand);
  if (selectedCondition) query.set('cond', selectedCondition);
  if (submittedQuery) query.set('q', submittedQuery);
  const key = `/api/rackets${query.toString() ? `?${query.toString()}` : ''}`;
  const { data, isLoading, error, mutate } = useSWR<RacketItem[]>(key, fetcher);

  // 클라이언트 필터링 및 정렬
  const racketsList = useCallback(() => {
    let list = Array.isArray(data) ? [...data] : [];

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
  }, [data, sortOption, priceMin, priceMax]);

  const products = racketsList();

  // 검색 제출
  const handleSearchSubmit = useCallback(() => {
    setSubmittedQuery(searchQuery);
    mutate();
  }, [searchQuery, mutate]);

  // 검색 초기화
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSubmittedQuery('');
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
    setSearchQuery('');
    setSubmittedQuery('');
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
    [openFiltersSheet, cancelFiltersSheet]
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
  const activeFiltersCount = [selectedBrand, selectedCondition, submittedQuery, priceChanged].filter(Boolean).length;
  const draftPriceChanged = draftPriceMin !== null || draftPriceMax !== null;
  const activeDraftCount = [draftBrand, draftCondition, draftSearchQuery, draftPriceChanged].filter(Boolean).length;

  // 상태 -> URL 반영
  useEffect(() => {
    if (isInitializingRef.current) return;

    const params = new URLSearchParams();
    if (selectedBrand) params.set('brand', selectedBrand);
    if (selectedCondition) params.set('cond', selectedCondition);
    if (submittedQuery) params.set('q', submittedQuery);
    if (sortOption && sortOption !== 'latest') params.set('sort', sortOption);
    if (viewMode !== 'grid') params.set('view', viewMode);
    if (priceMin !== null) params.set('minPrice', String(priceMin));
    if (priceMax !== null) params.set('maxPrice', String(priceMax));

    const newSearch = params.toString();
    if (newSearch === lastSerializedRef.current) return;
    lastSerializedRef.current = newSearch;

    router.replace(`${pathname}?${newSearch}`, { scroll: false });
  }, [selectedBrand, selectedCondition, submittedQuery, sortOption, viewMode, priceMin, priceMax, router, pathname]);

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
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
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
          {/* 상단 컨트롤 바 */}
          <div className="mb-6 bp-md:mb-8 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base bp-sm:text-lg font-semibold dark:text-white">
                총 <span className="text-blue-600 dark:text-blue-400 font-bold">{products.length}</span>개 라켓
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (showFilters) cancelFiltersSheet();
                  else openFiltersSheet();
                }}
                className="bp-lg:hidden h-9 px-3 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                aria-expanded={showFilters}
                aria-label="필터 열기"
              >
                <Filter className="w-4 h-4 mr-2" />
                필터{activeDraftCount > 0 && `(${activeDraftCount})`}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center border border-blue-200 dark:border-blue-700 rounded-lg p-1 bg-white dark:bg-slate-800">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={cn('h-8 w-9 p-0', viewMode === 'grid' ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>

                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={cn('h-8 w-9 p-0', viewMode === 'list' ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="h-9 w-[150px] bp-sm:w-[180px] rounded-lg border-2 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-800 text-sm">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="latest">최신순</SelectItem>
                  <SelectItem value="price-low">가격 낮은순</SelectItem>
                  <SelectItem value="price-high">가격 높은순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 콘텐츠 */}
          {isLoading ? (
            <div className={cn('grid gap-4 bp-md:gap-6', viewMode === 'grid' ? 'grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3' : 'grid-cols-1')}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonProductCard key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-500 dark:text-red-400 mb-2">불러오는 중 오류가 발생했습니다.</p>
              <Button onClick={() => mutate()} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                다시 시도
              </Button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bp-md:w-24 bp-md:h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-800 dark:to-indigo-700 rounded-full flex items-center justify-center">
                <Search className="w-10 h-10 bp-md:w-12 bp-md:h-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 dark:text-white">검색 결과가 없습니다</h3>
              <p className="text-muted-foreground mb-4">다른 검색어나 필터를 시도해보세요</p>
              <Button onClick={handleResetAll} variant="outline" className="border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 bg-transparent">
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
