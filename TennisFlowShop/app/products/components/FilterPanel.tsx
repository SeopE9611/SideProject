"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { STRING_MATERIALS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type PerformanceFilterConfig = {
  label: string;
  state: number | null;
  setter: (v: number | null) => void;
  featureKey: string;
};
const EXPOSURE_OPTIONS = [
  { label: "전체", value: "all" },
  { label: "추천", value: "featured" },
  { label: "신상품", value: "new" },
  { label: "할인", value: "sale" },
];

const PRICE_PRESETS: { label: string; range: [number, number] }[] = [
  { label: "전체", range: [0, 200000] },
  { label: "1만원 이하", range: [0, 10000] },
  { label: "1만원 ~ 2만원", range: [10000, 20000] },
  { label: "2만원 ~ 3만원", range: [20000, 30000] },
  { label: "3만원 이상", range: [30000, 200000] },
];

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
  exposureFilter: string;
  onExposureChange: (value: string) => void;
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
  exposureFilter,
  onExposureChange,
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
      {
        label: "반발력",
        state: selectedBounce,
        setter: setSelectedBounce,
        featureKey: "power",
      },
      {
        label: "컨트롤",
        state: selectedControl,
        setter: setSelectedControl,
        featureKey: "control",
      },
      {
        label: "스핀",
        state: selectedSpin,
        setter: setSelectedSpin,
        featureKey: "spin",
      },
      {
        label: "내구성",
        state: selectedDurability,
        setter: setSelectedDurability,
        featureKey: "durability",
      },
      {
        label: "편안함",
        state: selectedComfort,
        setter: setSelectedComfort,
        featureKey: "comfort",
      },
    ],
    [
      selectedBounce,
      selectedControl,
      selectedSpin,
      selectedDurability,
      selectedComfort,
    ],
  );

  return (
    <div
      className={cn(
        "rounded-lg bp-sm:rounded-xl border border-border bg-card p-4 bp-sm:p-6 shadow-sm",
        "bp-lg:max-h-[calc(100vh-116px)] bp-lg:overflow-y-auto bp-lg:overscroll-contain bp-lg:pr-3 bp-lg:[scrollbar-gutter:stable] bp-lg:[scrollbar-width:thin] bp-lg:[scrollbar-color:hsl(var(--muted-foreground)/0.15)_transparent] bp-lg:[&::-webkit-scrollbar]:w-1 bp-lg:[&::-webkit-scrollbar-track]:bg-transparent bp-lg:[&::-webkit-scrollbar-thumb]:rounded-full bp-lg:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/10 bp-lg:hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30",
      )}
    >
      {isLoadingInitial ? (
        <div className="space-y-4 bp-sm:space-y-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-6 w-20 rounded bg-muted" />
            <div className="h-7 w-16 rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-9 bp-sm:h-10 w-full rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-9 bp-sm:h-10 w-full rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-9 bp-sm:h-10 w-full rounded bg-muted" />
          </div>
        </div>
      ) : (
      <AnimatePresence mode="wait">
        <motion.div
          key={resetKey}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex items-center justify-between mb-2 bp-sm:mb-3">
            <div className="flex gap-2 items-center">
              <h2 className="break-keep text-lg font-bold leading-tight text-foreground bp-sm:text-xl">
                필터
              </h2>
              {onClose && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="bp-sm:hidden h-7 px-2 text-xs bg-transparent"
                >
                  닫기
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {activeFiltersCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  className="h-7 whitespace-nowrap px-2 text-xs bp-sm:h-8 bp-sm:px-3"
                >
                  초기화 ({activeFiltersCount})
                </Button>
              )}
            </div>
          </div>

          <p className="mb-3 bp-sm:mb-4 text-xs text-muted-foreground leading-relaxed break-keep">
            {onClose
              ? "선택 후 하단의 필터 적용을 누르면 결과에 반영됩니다."
              : "조건을 선택하면 목록에 바로 반영됩니다."}
          </p>

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
                    setSearchQuery("");
                    onClearInput?.();
                    const el = document.getElementById(
                      "search",
                    ) as HTMLInputElement | null;
                    el?.focus();
                  }}
                  className="absolute right-2.5 bp-sm:right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              size="sm"
              variant="default"
              className="h-9 shrink-0 whitespace-nowrap px-3 text-xs bp-sm:h-10 bp-sm:px-4 bp-sm:text-sm"
            >
              검색
            </Button>
          </form>

          <div className="mb-4 bp-sm:mb-6">
            <Label
              htmlFor="brand"
              className="mb-2 bp-sm:mb-3 block font-medium text-sm"
            >
              브랜드
            </Label>
            <Select
              onValueChange={(value) =>
                setSelectedBrand(value === "all" ? null : value)
              }
              value={selectedBrand ?? "all"}
            >
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
            <Select
              value={selectedMaterial ?? "all"}
              onValueChange={(v) => setSelectedMaterial(v === "all" ? null : v)}
            >
              <SelectTrigger className="h-9 bp-sm:h-10 text-sm">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent className="dark:bg-card dark:border-border">
                <SelectItem value="all">전체</SelectItem>
                {STRING_MATERIALS.map((material) => (
                  <SelectItem key={material.value} value={material.value}>
                    {material.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4 space-y-2 bp-sm:mb-6">
            <Label className="text-sm font-medium text-foreground">
              혜택
            </Label>
            <div className="grid grid-cols-2 gap-2 bp-sm:grid-cols-4">
              {EXPOSURE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={exposureFilter === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onExposureChange(option.value)}
                  className="h-9 whitespace-nowrap px-2 text-xs bp-sm:text-sm"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3 bp-sm:space-y-4">
            <h3 className="font-medium text-base bp-sm:text-lg">성능</h3>
            <p className="text-xs text-muted-foreground leading-relaxed break-keep">
              성능 점수는 도깨비테니스 내부 기준입니다. 100점에 가까울수록 해당 성향이 강합니다.
            </p>
            {performanceFiltersConfig.map(
              ({ label, state, setter, featureKey }) => (
                <div key={featureKey}>
                  <Label className="mb-1.5 bp-sm:mb-2 block text-xs bp-sm:text-sm font-medium">
                    {label}
                  </Label>
                  <Select
                    onValueChange={(val) =>
                      setter(val === "all" ? null : Number(val))
                    }
                    value={state !== null ? String(state) : "all"}
                  >
                    <SelectTrigger className="h-9 bp-sm:h-10 text-sm rounded-lg border-2 border-border focus:border-border dark:focus:border-border">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="90">90 이상</SelectItem>
                      <SelectItem value="80">80 이상</SelectItem>
                      <SelectItem value="70">70 이상</SelectItem>
                      <SelectItem value="60">60 이상</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ),
            )}
          </div>
          <div className="mt-4 bp-sm:mt-6 space-y-2">
            <h3 className="font-medium text-base bp-sm:text-lg">가격대</h3>
            <div className="grid grid-cols-2 gap-2 bp-sm:grid-cols-3">
                {PRICE_PRESETS.map((preset) => {
                  const isActive =
                    priceRange[0] === preset.range[0] &&
                    priceRange[1] === preset.range[1];
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setPriceRange(preset.range)}
                      className={cn(
                        "whitespace-nowrap rounded-md border px-3 py-1.5 text-xs transition-colors bp-sm:text-sm",
                        isActive
                          ? "border-primary bg-primary/15 text-primary dark:bg-primary/30 dark:text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
            </div>
          </div>
          {onClose && (
            <div className="mt-6 border-t border-border pt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 whitespace-nowrap"
                onClick={onReset}
              >
                초기화
              </Button>
              <Button type="button" className="flex-1 whitespace-nowrap" onClick={onSearchSubmit}>
                필터 적용
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      )}
    </div>
  );
});
