'use client';

import { useState, useMemo, useDeferredValue, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, Grid3X3, List, Star, ShoppingCart, Eye, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

type Product = {
  _id: string;
  name: string;
  brand: string;
  price: number;
  images?: string[];
  features?: Record<string, number>;
  isNew?: boolean;
};

const keyMap = {
  power: '반발력',
  durability: '내구성',
  spin: '스핀',
  control: '컨트롤',
  comfort: '편안함',
};

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

const brandLabelMap: Record<string, string> = Object.fromEntries(brands.map(({ value, label }) => [value, label]));

export default function FilterableProductList({ products }: { products: Product[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // 정렬 / 뷰모드
  const [sortOption, setSortOption] = useState('latest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 필터 상태
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedBounce, setSelectedBounce] = useState<number | null>(null);
  const [selectedDurability, setSelectedDurability] = useState<number | null>(null);
  const [selectedSpin, setSelectedSpin] = useState<number | null>(null);
  const [selectedControl, setSelectedControl] = useState<number | null>(null);
  const [selectedComfort, setSelectedComfort] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [showFilters, setShowFilters] = useState(false);

  // deferred + 안정된 검색어
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [syncSearchQuery, setSyncSearchQuery] = useState(deferredSearchQuery);
  useEffect(() => {
    const id = setTimeout(() => {
      setSyncSearchQuery(deferredSearchQuery);
    }, 200);
    return () => clearTimeout(id);
  }, [deferredSearchQuery]);

  // 리셋 애니메이션 key
  const [resetKey, setResetKey] = useState(0);

  // 성능 필터 배열 (중복 제거)
  const performanceFiltersConfig = useMemo(
    () => [
      {
        label: '반발력',
        state: selectedBounce,
        setter: setSelectedBounce,
        featureKey: 'power' as const,
      },
      {
        label: '컨트롤',
        state: selectedControl,
        setter: setSelectedControl,
        featureKey: 'control' as const,
      },
      {
        label: '스핀',
        state: selectedSpin,
        setter: setSelectedSpin,
        featureKey: 'spin' as const,
      },
      {
        label: '내구성',
        state: selectedDurability,
        setter: setSelectedDurability,
        featureKey: 'durability' as const,
      },
      {
        label: '편안함',
        state: selectedComfort,
        setter: setSelectedComfort,
        featureKey: 'comfort' as const,
      },
    ],
    [selectedBounce, selectedControl, selectedSpin, selectedDurability, selectedComfort]
  );

  // 루프 방지용 refs
  const isInitializingRef = useRef(true);
  const lastSerializedRef = useRef('');

  // URL -> 상태 (초기/히스토리 네비게이션)
  useEffect(() => {
    if (isInitializingRef.current) {
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

      // 초기 상태 반영된 쿼리 기억해두면 바로 replace 안 함
      lastSerializedRef.current = searchParams.toString();
      isInitializingRef.current = false;
      return;
    }

    // 뒤로/앞으로 등 searchParams 변화 시 필요한 부분만 업데이트
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

  // 필터링된 상품
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const features = product.features ?? {};

      const brandMatch = selectedBrand === null ? true : (product.brand ?? '').toLowerCase() === selectedBrand;

      const performanceMatch = performanceFiltersConfig.every(({ state, featureKey }) => (state !== null ? (features[featureKey] ?? 0) >= state : true));

      const nameMatch = deferredSearchQuery === '' ? true : product.name.toLowerCase().includes(deferredSearchQuery.toLowerCase());

      const priceMatch = product.price >= priceRange[0] && product.price <= priceRange[1];

      return brandMatch && performanceMatch && nameMatch && priceMatch;
    });
  }, [products, selectedBrand, performanceFiltersConfig, deferredSearchQuery, priceRange]);

  // 정렬된 상품
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      switch (sortOption) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'popular':
          return 0;
        case 'latest':
        default:
          return b._id.localeCompare(a._id);
      }
    });
  }, [filteredProducts, sortOption]);

  const resetFilters = () => {
    setSelectedBrand(null);
    setSelectedBounce(null);
    setSelectedDurability(null);
    setSelectedSpin(null);
    setSelectedControl(null);
    setSelectedComfort(null);
    setSearchQuery('');
    setPriceRange([0, 50000]);
  };
  const handleReset = () => {
    setResetKey((k) => k + 1);
    resetFilters();
  };

  const priceChanged = priceRange[0] > 0 || priceRange[1] < 50000;
  const activeFiltersCount = [selectedBrand, selectedBounce, selectedDurability, selectedSpin, selectedControl, selectedComfort, searchQuery, priceChanged].filter(Boolean).length;

  // 상태 -> URL 반영 (중복/루프 방지)
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

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
      {/* 필터 사이드바 */}
      <div className={cn('space-y-6 lg:col-span-1', 'lg:block', showFilters ? 'block' : 'hidden')}>
        <div className="sticky top-20 self-start">
          <div className="max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm p-6 shadow-lg">
            <AnimatePresence mode="wait">
              <motion.div key={resetKey} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">필터</h2>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
                      초기화 ({activeFiltersCount})
                    </Button>
                  )}
                </div>

                {/* 검색 */}
                <div className="mb-6">
                  <Label htmlFor="search" className="mb-3 block font-medium">
                    검색
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="상품명 검색..." className="pl-10 rounded-lg border-2 focus:border-blue-500 transition-colors" />
                  </div>
                </div>

                {/* 가격 범위 */}
                <div className="mb-6">
                  <Label className="mb-3 block font-medium">가격 범위</Label>
                  <div className="space-y-4">
                    <Slider value={priceRange} onValueChange={(val) => setPriceRange([val[0] as number, val[1] as number])} min={0} max={50000} step={500} className="w-full" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span className="font-medium">₩{priceRange[0].toLocaleString()}</span>
                      <span className="font-medium">₩{priceRange[1].toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* 브랜드 */}
                <div className="mb-6">
                  <Label htmlFor="brand" className="mb-3 block font-medium">
                    브랜드
                  </Label>
                  <Select onValueChange={(value) => setSelectedBrand(value === 'all' ? null : value)} value={selectedBrand ?? 'all'}>
                    <SelectTrigger className="rounded-lg border-2 focus:border-blue-500">
                      <SelectValue placeholder="브랜드 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.value} value={brand.value}>
                          {brand.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 성능 필터 */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">성능</h3>
                  {performanceFiltersConfig.map(({ label, state, setter, featureKey }) => (
                    <div key={featureKey}>
                      <Label className="mb-2 block text-sm font-medium">{label}</Label>
                      <Select onValueChange={(val) => setter(val === 'all' ? null : Number(val))} value={state !== null ? String(state) : 'all'}>
                        <SelectTrigger className="rounded-lg border-2 focus:border-blue-500">
                          <SelectValue placeholder="선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체</SelectItem>
                          <SelectItem value="5">★★★★★</SelectItem>
                          <SelectItem value="4">★★★★☆ 이상</SelectItem>
                          <SelectItem value="3">★★★☆☆ 이상</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="lg:col-span-3">
        {/* 상단 컨트롤 바 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold">
              총 <span className="text-blue-600 font-bold">{sortedProducts.length}</span> 개 상품
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

        {/* 상품 그리드/리스트 */}
        {sortedProducts.length === 0 ? (
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
          <div className={cn('grid gap-6', viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1')}>
            {sortedProducts.map((product) => (
              <ProductCard key={product._id} product={product} viewMode={viewMode} brandLabel={brandLabelMap[product.brand.toLowerCase()] ?? product.brand} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, viewMode, brandLabel }: { product: Product; viewMode: 'grid' | 'list'; brandLabel: string }) {
  if (viewMode === 'list') {
    return (
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-2 hover:border-blue-300">
        <div className="flex">
          <div className="relative w-48 h-48 flex-shrink-0">
            <Image src={(product.images?.[0] as string) || '/placeholder.svg?height=200&width=200&query=tennis+string'} alt={product.name} fill className="object-cover" />
            {product.isNew && <Badge className="absolute right-2 top-2 bg-gradient-to-r from-red-500 to-pink-500 text-white">NEW</Badge>}
          </div>

          <div className="flex-1 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1 font-medium">{brandLabel}</div>
                <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">(128 리뷰)</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{product.price.toLocaleString()}원</div>
                <div className="text-sm text-muted-foreground line-through">{Math.round(product.price * 1.2).toLocaleString()}원</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {product.features ? (
                Object.entries(product.features as Record<string, number>).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{keyMap[key as keyof typeof keyMap] || key}:</span>
                    <span className="text-sm font-medium">
                      {'★'.repeat(value)}
                      {'☆'.repeat(5 - value)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">성능 정보 없음</div>
              )}
            </div>

            <div className="flex gap-2">
              <Link href={`/products/${product._id}`} className="flex-1">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Eye className="w-4 h-4 mr-2" />
                  상세보기
                </Button>
              </Link>
              <Button variant="outline" size="icon" className="hover:bg-red-50 hover:border-red-300 bg-transparent">
                <Heart className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="hover:bg-blue-50 hover:border-blue-300 bg-transparent">
                <ShoppingCart className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Link href={`/products/${product._id}`}>
      <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-2 hover:border-blue-300 group">
        <div className="relative">
          <Image
            src={(product.images?.[0] as string) || '/placeholder.svg?height=300&width=300&query=tennis+string'}
            alt={product.name}
            width={300}
            height={300}
            className="h-56 w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {product.isNew && <Badge className="absolute right-3 top-3 bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg">NEW</Badge>}
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-white/90 text-gray-800 shadow-lg">
              15% 할인
            </Badge>
          </div>

          {/* 호버 오버레이 */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              <Button size="sm" className="bg-white text-black hover:bg-gray-100">
                <Eye className="w-4 h-4 mr-1" />
                보기
              </Button>
              <Button size="sm" variant="outline" className="bg-white/90 hover:bg-white">
                <Heart className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="p-5">
          <div className="text-sm text-muted-foreground mb-2 font-medium">{brandLabel}</div>
          <CardTitle className="text-lg mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">{product.name}</CardTitle>

          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">(128)</span>
          </div>

          <div className="space-y-1 mb-4 text-xs">
            {product.features ? (
              Object.entries(product.features as Record<string, number>)
                .slice(0, 3)
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{keyMap[key as keyof typeof keyMap] || key}:</span>
                    <span className="font-medium">
                      {'★'.repeat(value)}
                      {'☆'.repeat(5 - value)}
                    </span>
                  </div>
                ))
            ) : (
              <div className="text-muted-foreground">성능 정보 없음</div>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-5 pt-0 flex justify-between items-center">
          <div>
            <div className="font-bold text-lg text-blue-600">{product.price.toLocaleString()}원</div>
            <div className="text-xs text-muted-foreground line-through">{Math.round(product.price * 1.2).toLocaleString()}원</div>
          </div>
          <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
            <ShoppingCart className="w-4 h-4 mr-1" />
            담기
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
