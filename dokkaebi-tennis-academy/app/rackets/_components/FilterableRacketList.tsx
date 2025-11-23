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

  // active filter 개수
  const priceChanged = priceMin !== null || priceMax !== null;
  const activeFiltersCount = [selectedBrand, selectedCondition, submittedQuery, priceChanged].filter(Boolean).length;

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

  return (
    <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-4">
      {/* 필터 사이드바 */}
      <div className={cn(showFilters ? 'block' : 'hidden', 'lg:block', 'space-y-6 lg:col-span-1')}>
        <div className="sticky top-20 self-start">
          <RacketFilterPanel
            selectedBrand={selectedBrand}
            setSelectedBrand={setSelectedBrand}
            selectedCondition={selectedCondition}
            setSelectedCondition={setSelectedCondition}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            priceMin={priceMin}
            priceMax={priceMax}
            onChangePriceMin={setPriceMin}
            onChangePriceMax={setPriceMax}
            resetKey={resetKey}
            activeFiltersCount={activeFiltersCount}
            onReset={handleResetAll}
            isLoadingInitial={isLoading}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            brands={brands}
            onClose={() => setShowFilters(false)}
            onSearchSubmit={handleSearchSubmit}
            onClearSearch={handleClearSearch}
            onClearInput={handleClearInput}
          />
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="lg:col-span-3">
        {/* 상단 컨트롤 바 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold dark:text-white">
              총 <span className="text-blue-600 dark:text-blue-400 font-bold">{products.length}</span> 개 라켓
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters((f) => !f)} className="lg:hidden border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" aria-expanded={showFilters} aria-label="필터 열기">
              <Filter className="w-4 h-4 mr-2" />
              필터 {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {/* 뷰 모드 토글 */}
            <div className="flex items-center border border-blue-200 dark:border-blue-700 rounded-lg p-1 bg-white dark:bg-slate-800">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn('px-3', viewMode === 'grid' ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={cn('px-3', viewMode === 'list' ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* 정렬 */}
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-[160px] md:w-[180px] rounded-lg border-2 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-800">
                <SelectValue placeholder="정렬 기준" />
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
          <div className={cn('grid gap-4 md:gap-6', viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1')}>
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
            <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-800 dark:to-indigo-700 rounded-full flex items-center justify-center">
              <Search className="w-10 h-10 md:w-12 md:h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 dark:text-white">검색 결과가 없습니다</h3>
            <p className="text-muted-foreground mb-4">다른 검색어나 필터를 시도해보세요</p>
            <Button onClick={handleResetAll} variant="outline" className="border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 bg-transparent">
              필터 초기화
            </Button>
          </div>
        ) : (
          <div className={cn('grid gap-4 md:gap-6', viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1')}>
            {products.map((racket) => (
              <RacketCard key={racket.id} racket={racket} viewMode={viewMode} brandLabel={brandLabelMap[racket.brand.toLowerCase()] ?? racket.brand} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
