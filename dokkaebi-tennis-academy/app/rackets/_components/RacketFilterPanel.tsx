'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SkeletonFilterDetailed } from '@/app/products/components/SkeletonProductCard';

type Props = {
  selectedBrand: string | null;
  setSelectedBrand: (v: string | null) => void;
  selectedCondition: string | null;
  setSelectedCondition: (v: string | null) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  priceMin: number | null;
  priceMax: number | null;
  onChangePriceMin: (v: number | null) => void;
  onChangePriceMax: (v: number | null) => void;
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

export default function RacketFilterPanel({
  selectedBrand,
  setSelectedBrand,
  selectedCondition,
  setSelectedCondition,
  searchQuery,
  setSearchQuery,
  priceMin,
  priceMax,
  onChangePriceMin,
  onChangePriceMax,
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
  if (isLoadingInitial) {
    return (
      <div className="rounded-xl border bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg">
        <SkeletonFilterDetailed />
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 shadow-xl')}>
      <AnimatePresence mode="wait">
        <motion.div key={resetKey} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2 items-center">
              <h2 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">필터</h2>
              {onClose && (
                <Button variant="outline" size="sm" onClick={onClose} className="sm:hidden bg-transparent">
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

          {/* 검색 */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit();
            }}
            className="mb-6 flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="라켓 모델 검색..."
                className="pl-10 pr-10 rounded-lg border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors w-full"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button type="submit" size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
              검색
            </Button>
          </form>

          {/* 브랜드 */}
          <div className="mb-6">
            <Label htmlFor="brand" className="mb-3 block font-medium">
              브랜드
            </Label>
            <Select onValueChange={(value) => setSelectedBrand(value === 'all' ? null : value)} value={selectedBrand ?? 'all'}>
              <SelectTrigger className="rounded-lg border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400">
                <SelectValue placeholder="브랜드 선택" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="all">전체</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 상태 등급 */}
          <div className="space-y-1.5 mb-6">
            <Label>상태 등급</Label>
            <Select value={selectedCondition ?? 'all'} onValueChange={(v) => setSelectedCondition(v === 'all' ? null : v)}>
              <SelectTrigger className="rounded-lg border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="A">A (최상)</SelectItem>
                <SelectItem value="B">B (양호)</SelectItem>
                <SelectItem value="C">C (보통)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 가격 범위 */}
          <div className="space-y-1.5">
            <Label>가격 범위</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={priceMin ?? ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  onChangePriceMin(raw === '' ? null : Number(raw));
                }}
                placeholder="최소"
                className="rounded-lg border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
              />
              <span className="text-muted-foreground">~</span>
              <Input
                type="number"
                value={priceMax ?? ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  onChangePriceMax(raw === '' ? null : Number(raw));
                }}
                placeholder="최대"
                className="rounded-lg border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{priceMin !== null ? `₩${priceMin.toLocaleString()}` : '최소 미설정'}</span>
              <span>{priceMax !== null ? `₩${priceMax.toLocaleString()}` : '최대 미설정'}</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
