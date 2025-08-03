'use client';

import { useState, useDeferredValue, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Search, Filter, Grid3X3, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInfiniteProducts } from '@/app/products/hooks/useInfiniteProducts';
import { FilterPanel } from '@/app/products/components/FilterPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkeletonProductCard } from '@/app/products/components/SkeletonProductCard';
import ProductCard from '@/app/products/components/ProductCard';

// 브랜드 리스트 (필터패널에 내려줌)
const brands = [
  { label: '루키론', value: 'lookielon' },
  { label: '테크니파이버', value: 'technifibre' },
  { label: '윌슨', value: 'wilson' },
  { label: '바볼랏', value: 'babolat' },
  { label: '헤드', value: 'head' },
  { label: '요넥스', value: 'yonex' },
  { label: '소링크', value: 'solinco' },
  { label: '던롭', value: 'dunlop' },
  { label: '감마', value: 'gamma' },
  { label: '프린스', value: 'prince' },
  { label: '키르쉬바움', value: 'kirschbaum' },
  { label: '고센', value: 'gosen' },
];

// 브랜드 라벨 매핑 (소문자 key)
const brandLabelMap: Record<string, string> = Object.fromEntries(brands.map(({ value, label }) => [value, label]));

/**
 * 필터 가능한 상품 리스트 (infinite scroll 포함)
 */
export default function FilterableProductList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // 정렬/뷰 모드
  const [sortOption, setSortOption] = useState('latest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 필터 상태들
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedBounce, setSelectedBounce] = useState<number | null>(null);
  const [selectedDurability, setSelectedDurability] = useState<number | null>(null);
  const [selectedSpin, setSelectedSpin] = useState<number | null>(null);
  const [selectedControl, setSelectedControl] = useState<number | null>(null);
  const [selectedComfort, setSelectedComfort] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [showFilters, setShowFilters] = useState(false);

  // 디바운스된 안정된 검색어 (검색어 입력 과도한 요청 방지)
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [syncSearchQuery, setSyncSearchQuery] = useState(deferredSearchQuery);
  useEffect(() => {
    const id = setTimeout(() => {
      setSyncSearchQuery(deferredSearchQuery);
    }, 200);
    return () => clearTimeout(id);
  }, [deferredSearchQuery]);

  // 애니메이션 / 리셋 key
  const [resetKey, setResetKey] = useState(0);

  // URL sync 초기화/변경 관리 (루프 방지)
  const isInitializingRef = useRef(true);
  const lastSerializedRef = useRef('');

  useEffect(() => {
    if (isInitializingRef.current) {
      // URL -> 상태 초기 반영
      const brand = searchParams.get('brand');
      setSelectedBrand(brand || null);

      const bounce = searchParams.get('power');
      setSelectedBounce(bounce ? Number(bounce) : null);

      const control = searchParams.get('control');
      setSelectedControl(control ? Number(control) : null);

      const spin = searchParams.get('spin');
      setSelectedSpin(spin ? Number(spin) : null);

      const durability = searchParams.get('durability');
      setSelectedDurability(durability ? Number(durability) : null);

      const comfort = searchParams.get('comfort');
      setSelectedComfort(comfort ? Number(comfort) : null);

      setSearchQuery(searchParams.get('q') || '');
      setSortOption(searchParams.get('sort') || 'latest');

      const view = searchParams.get('view');
      setViewMode(view === 'list' ? 'list' : 'grid');

      const minPrice = searchParams.get('minPrice');
      const maxPrice = searchParams.get('maxPrice');
      setPriceRange([minPrice ? Number(minPrice) : 0, maxPrice ? Number(maxPrice) : 50000]);

      lastSerializedRef.current = searchParams.toString();
      isInitializingRef.current = false;
      return;
    }

    // history/navigation 변화 시 필요한 state만 업데이트
    const brand = searchParams.get('brand');
    if ((brand || null) !== selectedBrand) setSelectedBrand(brand || null);

    const bounce = searchParams.get('power');
    const bounceVal = bounce ? Number(bounce) : null;
    if (bounceVal !== selectedBounce) setSelectedBounce(bounceVal);

    const control = searchParams.get('control');
    const controlVal = control ? Number(control) : null;
    if (controlVal !== selectedControl) setSelectedControl(controlVal);

    const spin = searchParams.get('spin');
    const spinVal = spin ? Number(spin) : null;
    if (spinVal !== selectedSpin) setSelectedSpin(spinVal);

    const durability = searchParams.get('durability');
    const durabilityVal = durability ? Number(durability) : null;
    if (durabilityVal !== selectedDurability) setSelectedDurability(durabilityVal);

    const comfort = searchParams.get('comfort');
    const comfortVal = comfort ? Number(comfort) : null;
    if (comfortVal !== selectedComfort) setSelectedComfort(comfortVal);

    const q = searchParams.get('q') || '';
    if (q !== searchQuery) setSearchQuery(q);

    const sort = searchParams.get('sort') || 'latest';
    if (sort !== sortOption) setSortOption(sort);

    const view = searchParams.get('view');
    const desiredView = view === 'list' ? 'list' : 'grid';
    if (desiredView !== viewMode) setViewMode(desiredView as 'grid' | 'list');

    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const pr: [number, number] = [minPrice ? Number(minPrice) : 0, maxPrice ? Number(maxPrice) : 50000];
    if (pr[0] !== priceRange[0] || pr[1] !== priceRange[1]) setPriceRange(pr);
  }, [searchParams]);

  // 서버 필터링 + 무한 스크롤
  const {
    products: productsList,
    isLoadingInitial,
    isFetchingMore,
    error,
    hasMore,
    loadMore,
    reset: resetInfinite,
  } = useInfiniteProducts({
    brand: selectedBrand ?? undefined,
    power: selectedBounce ?? undefined,
    control: selectedControl ?? undefined,
    spin: selectedSpin ?? undefined,
    durability: selectedDurability ?? undefined,
    comfort: selectedComfort ?? undefined,
    q: syncSearchQuery,
    sort: sortOption,
    limit: 6,
  });

  // 필터 초기화 / 리셋 (참조 고정 위해 useCallback)
  const handleReset = useCallback(() => {
    setResetKey((k) => k + 1);
    setSelectedBrand(null);
    setSelectedBounce(null);
    setSelectedDurability(null);
    setSelectedSpin(null);
    setSelectedControl(null);
    setSelectedComfort(null);
    setSearchQuery('');
    setPriceRange([0, 50000]);
    setSortOption('latest');
    setViewMode('grid');
    resetInfinite();
  }, [resetInfinite]);

  // active filter 개수 계산
  const priceChanged = priceRange[0] > 0 || priceRange[1] < 50000;
  const activeFiltersCount = [selectedBrand, selectedBounce, selectedDurability, selectedSpin, selectedControl, selectedComfort, syncSearchQuery, priceChanged].filter(Boolean).length;

  // 상태 -> URL (중복/루프 방지)
  useEffect(() => {
    if (isInitializingRef.current) return;

    const params = new URLSearchParams();

    if (selectedBrand) params.set('brand', selectedBrand);
    if (selectedBounce !== null) params.set('power', String(selectedBounce));
    if (selectedControl !== null) params.set('control', String(selectedControl));
    if (selectedSpin !== null) params.set('spin', String(selectedSpin));
    if (selectedDurability !== null) params.set('durability', String(selectedDurability));
    if (selectedComfort !== null) params.set('comfort', String(selectedComfort));
    if (syncSearchQuery) params.set('q', syncSearchQuery);
    if (sortOption && sortOption !== 'latest') params.set('sort', sortOption);
    if (viewMode !== 'grid') params.set('view', viewMode);
    if (priceRange[0] > 0) params.set('minPrice', String(priceRange[0]));
    if (priceRange[1] < 50000) params.set('maxPrice', String(priceRange[1]));

    const newSearch = params.toString();
    if (newSearch === lastSerializedRef.current) return;
    lastSerializedRef.current = newSearch;

    router.replace(`${pathname}?${newSearch}`, { scroll: false });
  }, [selectedBrand, selectedBounce, selectedControl, selectedSpin, selectedDurability, selectedComfort, syncSearchQuery, sortOption, viewMode, priceRange, router, pathname]);

  // infinite scroll 관찰자
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastProductRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingMore) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingMore, hasMore, loadMore]
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
      {/* 필터 사이드바 */}
      <div className={cn('space-y-6 lg:col-span-1', showFilters ? 'block' : 'hidden', 'lg:block')}>
        <div className="sticky top-20 self-start">
          <FilterPanel
            selectedBrand={selectedBrand}
            setSelectedBrand={setSelectedBrand}
            selectedBounce={selectedBounce}
            setSelectedBounce={setSelectedBounce}
            selectedControl={selectedControl}
            setSelectedControl={setSelectedControl}
            selectedSpin={selectedSpin}
            setSelectedSpin={setSelectedSpin}
            selectedDurability={selectedDurability}
            setSelectedDurability={setSelectedDurability}
            selectedComfort={selectedComfort}
            setSelectedComfort={setSelectedComfort}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            resetKey={resetKey}
            activeFiltersCount={activeFiltersCount}
            onReset={handleReset}
            isLoadingInitial={isLoadingInitial}
            brands={brands}
            onClose={() => setShowFilters(false)}
          />
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="lg:col-span-3">
        {/* 상단 컨트롤 바 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold">
              총 <span className="text-blue-600 font-bold">{(productsList ?? []).length}</span> 개 상품
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters((f) => !f)} className="lg:hidden" aria-expanded={showFilters} aria-label="필터 열기">
              <Filter className="w-4 h-4 mr-2" />
              필터 {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {/* 뷰 모드 토글 */}
            <div className="flex items-center border rounded-lg p-1">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="px-3">
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="px-3">
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* 정렬 */}
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-[180px] rounded-lg border-2 focus:border-blue-500">
                <SelectValue placeholder="정렬 기준" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">최신순</SelectItem>
                <SelectItem value="popular">인기순</SelectItem>
                <SelectItem value="price-low">가격 낮은순</SelectItem>
                <SelectItem value="price-high">가격 높은순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 콘텐츠 */}
        {isLoadingInitial ? (
          // 초기 로딩: 카드 스켈레톤
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonProductCard key={i} />
            ))}
          </div>
        ) : error ? (
          // 에러
          <div className="text-center py-16">
            <p className="text-red-500 mb-2">불러오는 중 오류가 발생했습니다.</p>
            <Button onClick={() => loadMore()}>다시 시도</Button>
          </div>
        ) : (productsList ?? []).length === 0 ? (
          // 빈 상태
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">검색 결과가 없습니다</h3>
            <p className="text-muted-foreground mb-4">다른 검색어나 필터를 시도해보세요</p>
            <Button onClick={handleReset} variant="outline">
              필터 초기화
            </Button>
          </div>
        ) : (
          // 정상 리스트
          <>
            <div className={cn('grid gap-6', viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1')}>
              {productsList.map((product, i) => {
                const isLast = i === productsList.length - 1;
                return (
                  <div key={product._id} ref={isLast ? lastProductRef : undefined}>
                    <ProductCard product={product} viewMode={viewMode} brandLabel={brandLabelMap[product.brand.toLowerCase()] ?? product.brand} />
                  </div>
                );
              })}
            </div>

            {/* 추가 로딩 표시 */}
            {isFetchingMore && (
              <div aria-live="polite" className="text-center py-4 flex justify-center items-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin" />
                <span>더 불러오는 중...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
