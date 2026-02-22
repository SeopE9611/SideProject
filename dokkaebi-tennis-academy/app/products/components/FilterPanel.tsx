'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
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
  selectedMaterial: string | null;
  setSelectedMaterial: (v: string | null) => void;
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
  selectedMaterial,
  setSelectedMaterial,
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
      <div className="rounded-xl bg-card/70 dark:bg-card p-4 bp-sm:p-6 shadow-lg">
        <SkeletonFilterDetailed />
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg bp-sm:rounded-xl border border-border bg-card/80 dark:bg-card backdrop-blur-sm p-4 bp-sm:p-6 shadow-xl')}>
      <AnimatePresence mode="wait">
        <motion.div key={resetKey} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>
          <div className="flex items-center justify-between mb-4 bp-sm:mb-6">
            <div className="flex gap-2 items-center">
              <h2 className="font-bold text-lg bp-sm:text-xl text-foreground">필터</h2>
              {onClose && (
                <Button variant="outline" size="sm" onClick={onClose} className="bp-sm:hidden h-7 px-2 text-xs bg-transparent">
                  닫기
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={onReset} className="text-xs h-7 bp-sm:h-8 px-2 bp-sm:px-3">
                  초기화 ({activeFiltersCount})
                </Button>
              )}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit();
            }}
            className="mb-4 bp-sm:mb-6 flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-2.5 bp-sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="상품명 검색..."
                className="pl-9 bp-sm:pl-10 pr-9 bp-sm:pr-10 h-9 bp-sm:h-10 text-sm rounded-lg border-2 border-border focus:border-border dark:focus:border-border transition-colors w-full"
              />
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
                  className="absolute right-2.5 bp-sm:right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button type="submit" size="sm" variant="default" className="h-9 bp-sm:h-10 px-3 bp-sm:px-4 text-xs bp-sm:text-sm shrink-0">
              검색
            </Button>
          </form>

          <div className="mb-4 bp-sm:mb-6">
            <Label htmlFor="brand" className="mb-2 bp-sm:mb-3 block font-medium text-sm">
              브랜드
            </Label>
            <Select onValueChange={(value) => setSelectedBrand(value === 'all' ? null : value)} value={selectedBrand ?? 'all'}>
              <SelectTrigger className="h-9 bp-sm:h-10 text-sm rounded-lg border-2 border-border focus:border-border dark:focus:border-border">
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

          <div className="space-y-1.5 mb-4 bp-sm:mb-6">
            <Label className="text-sm">재질</Label>
            <Select value={selectedMaterial ?? 'all'} onValueChange={(v) => setSelectedMaterial(v === 'all' ? null : v)}>
              <SelectTrigger className="h-9 bp-sm:h-10 text-sm">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent className="dark:bg-card dark:border-border">
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="polyester">폴리에스터</SelectItem>
                <SelectItem value="hybrid">하이브리드</SelectItem>
                <SelectItem value="multifilament">멀티필라멘트</SelectItem>
                <SelectItem value="natural_gut">천연 거트</SelectItem>
                <SelectItem value="synthetic_gut">합성 거트</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 bp-sm:space-y-4">
            <h3 className="font-medium text-base bp-sm:text-lg">성능</h3>
            {performanceFiltersConfig.map(({ label, state, setter, featureKey }) => (
              <div key={featureKey}>
                <Label className="mb-1.5 bp-sm:mb-2 block text-xs bp-sm:text-sm font-medium">{label}</Label>
                <Select onValueChange={(val) => setter(val === 'all' ? null : Number(val))} value={state !== null ? String(state) : 'all'}>
                  <SelectTrigger className="h-9 bp-sm:h-10 text-sm rounded-lg border-2 border-border focus:border-border dark:focus:border-border">
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
