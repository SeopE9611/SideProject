'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SkeletonFilterDetailed } from '@/app/products/components/SkeletonProductCard';

type PerformanceFilterConfig = {
  label: string;
  state: number | null;
  setter: (v: number | null) => void;
  featureKey: string;
};

type Props = {
  selectedBrand: string | null;
  setSelectedBrand: (v: string | null) => void;
  selectedBounce: number | null;
  setSelectedBounce: (v: number | null) => void;
  selectedControl: number | null;
  setSelectedControl: (v: number | null) => void;
  selectedSpin: number | null;
  setSelectedSpin: (v: number | null) => void;
  selectedDurability: number | null;
  setSelectedDurability: (v: number | null) => void;
  selectedComfort: number | null;
  setSelectedComfort: (v: number | null) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  resetKey: number;
  activeFiltersCount: number;
  onReset: () => void;
  isLoadingInitial: boolean;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  brands: { label: string; value: string }[];
  onClose?: () => void;
  onSearchSubmit: () => void;
  onClearSearch: () => void;
  onClearInput?: () => void;
};

export const FilterPanel = React.memo(function FilterPanel({
  selectedBrand,
  setSelectedBrand,
  selectedBounce,
  setSelectedBounce,
  selectedControl,
  setSelectedControl,
  selectedSpin,
  setSelectedSpin,
  selectedDurability,
  setSelectedDurability,
  selectedComfort,
  setSelectedComfort,
  searchQuery,
  setSearchQuery,
  priceRange,
  setPriceRange,
  resetKey,
  activeFiltersCount,
  onReset,
  isLoadingInitial,
  brands,
  onClose,
  onSearchSubmit,
  onClearSearch,
  onClearInput,
}: Props) {
  const performanceFiltersConfig: PerformanceFilterConfig[] = React.useMemo(
    () => [
      { label: '반발력', state: selectedBounce, setter: setSelectedBounce, featureKey: 'power' },
      { label: '컨트롤', state: selectedControl, setter: setSelectedControl, featureKey: 'control' },
      { label: '스핀', state: selectedSpin, setter: setSelectedSpin, featureKey: 'spin' },
      { label: '내구성', state: selectedDurability, setter: setSelectedDurability, featureKey: 'durability' },
      { label: '편안함', state: selectedComfort, setter: setSelectedComfort, featureKey: 'comfort' },
    ],
    [selectedBounce, selectedControl, selectedSpin, selectedDurability, selectedComfort]
  );

  if (isLoadingInitial) {
    return (
      <div className="rounded-xl border bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg">
        <SkeletonFilterDetailed />
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg')}>
      <AnimatePresence mode="wait">
        <motion.div key={resetKey} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2 items-center">
              <h2 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">필터</h2>
              {onClose && (
                <Button variant="outline" size="sm" onClick={onClose} className="sm:hidden">
                  닫기
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={onReset} className="text-xs">
                  초기화 ({activeFiltersCount})
                </Button>
              )}
            </div>
          </div>

          {/* 검색 (엔터 또는 버튼) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit();
            }}
            className="mb-6 flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input id="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="상품명 검색..." className="pl-10 pr-10 rounded-lg border-2 focus:border-blue-500 transition-colors w-full" />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="검색어 지우기"
                  onClick={() => {
                    setSearchQuery('');
                    onClearInput?.();
                    const el = document.getElementById('search') as HTMLInputElement | null;
                    el?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button type="submit" size="sm">
              검색
            </Button>
          </form>

          {/* 가격 */}
          {/* <div className="mb-6">
            <Label className="mb-3 block font-medium">가격 범위</Label>
            <div className="space-y-4">
              <Slider value={priceRange} onValueChange={(val) => setPriceRange([val[0] as number, val[1] as number])} min={0} max={50000} step={500} className="w-full" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className="font-medium">₩{priceRange[0].toLocaleString()}</span>
                <span className="font-medium">₩{priceRange[1].toLocaleString()}</span>
              </div>
            </div>
          </div> */}

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
                {brands.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
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
  );
});
