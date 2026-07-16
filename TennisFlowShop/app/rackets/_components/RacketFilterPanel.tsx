"use client";
import { motion, AnimatePresence } from "framer-motion";
import { CatalogFilterPanelShell } from "@/components/commerce";
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
import { cn } from "@/lib/utils";
import { SkeletonFilterDetailed } from "@/app/products/components/SkeletonProductCard";

const EXPOSURE_OPTIONS = [
  { label: "추천", value: "featured" },
  { label: "신상품", value: "new" },
  { label: "할인", value: "sale" },
];

const RACKET_PRICE_PRESETS: { label: string; range: [number, number] }[] = [
  { label: "전체", range: [0, 10000000] },
  { label: "~5만원", range: [0, 50000] },
  { label: "5~10만원", range: [50000, 100000] },
  { label: "10~15만원", range: [100000, 150000] },
  { label: "15만원~", range: [150000, 10000000] },
];

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
  rentOnly: boolean;
  setRentOnly: (v: boolean) => void;
  exposureFilter: string[];
  onExposureChange: (value: string[]) => void;
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
  rentOnly,
  setRentOnly,
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
  return (
    <CatalogFilterPanelShell
      title="라켓 필터"
      activeCount={activeFiltersCount}
      description="브랜드, 상태, 가격대와 대여 가능 여부를 선택한 뒤 하단의 필터 적용을 누르면 목록에 반영됩니다."
      onReset={onReset}
      onApply={onSearchSubmit}
      applyLabel="필터 적용"
      isLoading={isLoadingInitial}
    >
      {isLoadingInitial ? (
        <SkeletonFilterDetailed />
      ) : (
      <AnimatePresence mode="wait">
        <motion.div
          key={resetKey}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
        >
          {/* 검색 */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit();
            }}
            className="mb-5 flex items-stretch gap-2 rounded-xl border border-border bg-muted/20 p-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="라켓 모델 검색..."
                className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-10 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="검색어 지우기"
                  onClick={() => {
                    setSearchQuery("");
                    onClearInput?.();
                    const el = document.getElementById("search") as HTMLInputElement | null;
                    el?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button type="submit" size="sm" variant="default" className="h-10 px-4">
              검색
            </Button>
          </form>

          {/* 브랜드 */}
          <div className="mb-5 space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <Label htmlFor="brand" className="block text-ui-body-sm font-medium text-foreground">
              브랜드
            </Label>
            <Select
              onValueChange={(value) => setSelectedBrand(value === "all" ? null : value)}
              value={selectedBrand ?? "all"}
            >
              <SelectTrigger className="h-10 rounded-lg border border-input bg-background">
                <SelectValue placeholder="브랜드 선택" />
              </SelectTrigger>
              <SelectContent className="dark:bg-card dark:border-border">
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
          <div className="mb-5 space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <Label className="text-ui-body-sm font-medium text-foreground">상태 등급</Label>
            <p className="text-ui-label text-muted-foreground leading-relaxed break-keep">
              A는 사용감이 적은 최상급, B는 일반 사용감이 있는 양호, C는 사용감이 비교적 있는 보통
              상태입니다.
            </p>
            <Select
              value={selectedCondition ?? "all"}
              onValueChange={(v) => setSelectedCondition(v === "all" ? null : v)}
            >
              <SelectTrigger className="h-10 rounded-lg border border-input bg-background">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent className="dark:bg-card dark:border-border">
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="A">A (최상)</SelectItem>
                <SelectItem value="B">B (양호)</SelectItem>
                <SelectItem value="C">C (보통)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 이용 유형 */}
          <div className="mb-5 space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <Label className="text-ui-body-sm font-medium text-foreground">이용 유형</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRentOnly(false)}
                className={cn(
                  "rounded-md border px-3 py-2 text-ui-body-sm font-medium transition-colors",
                  !rentOnly
                    ? "border-primary bg-primary/15 text-primary dark:bg-primary/30 dark:text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setRentOnly(true)}
                className={cn(
                  "rounded-md border px-3 py-2 text-ui-body-sm font-medium transition-colors",
                  rentOnly
                    ? "border-primary bg-primary/15 text-primary dark:bg-primary/30 dark:text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                대여 가능
              </button>
            </div>
          </div>

          {/* 혜택 */}
          <div className="mb-5 space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <Label className="text-ui-body-sm font-medium text-foreground">혜택</Label>
            <div className="grid grid-cols-2 gap-2 bp-sm:grid-cols-4">
              <Button
                type="button"
                variant={exposureFilter.length === 0 ? "default" : "outline"}
                size="sm"
                onClick={() => onExposureChange([])}
                className="h-9 whitespace-nowrap px-2 text-ui-label bp-sm:text-ui-body-sm"
              >
                전체
              </Button>
              {EXPOSURE_OPTIONS.map((option) => {
                const isActive = exposureFilter.includes(option.value);
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      onExposureChange(
                        isActive
                          ? exposureFilter.filter((value) => value !== option.value)
                          : [...exposureFilter, option.value],
                      )
                    }
                    className="h-9 whitespace-nowrap px-2 text-ui-label bp-sm:text-ui-body-sm"
                    aria-pressed={isActive}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 가격대 */}
          <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <Label className="text-ui-body-sm font-medium text-foreground">가격대</Label>
            <div className="grid grid-cols-2 gap-2 bp-sm:grid-cols-3">
              {RACKET_PRICE_PRESETS.map((preset) => {
                const effectiveMin = priceMin ?? 0;
                const effectiveMax = priceMax ?? 10000000;
                const isActive =
                  effectiveMin === preset.range[0] && effectiveMax === preset.range[1];

                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      if (preset.label === "전체") {
                        onChangePriceMin(null);
                        onChangePriceMax(null);
                        return;
                      }
                      onChangePriceMin(preset.range[0]);
                      onChangePriceMax(preset.range[1]);
                    }}
                    className={cn(
                      "min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-md border px-2 py-1.5 text-ui-caption transition-colors bp-sm:text-ui-label",
                      isActive
                        ? "border-primary bg-primary/15 text-primary dark:bg-primary/30 dark:text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      )}
    </CatalogFilterPanelShell>
  );
}
