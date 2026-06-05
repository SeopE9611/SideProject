"use client";

// Redesigned Select String Layout
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import SiteContainer from "@/components/layout/SiteContainer";
import { useInfiniteProducts } from "@/app/products/hooks/useInfiniteProducts";
import { StringCard } from "./StringCard";
import {
  getVisibleColorRows,
  getVariantsByColor,
  hasSelectableStringStock,
  isSellableVariant,
  normalizeColorRows,
  normalizeGaugeRows,
} from "@/lib/products/string-stock";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Filter,
  Grid3X3,
  List,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

// Types for the selected racket/rental
export type SelectedRacket = {
  id: string;
  name: string;
  image?: string | null;
  price?: number;
  regularPrice?: number;
  discountRate?: number;
  maxQty?: number;
  condition?: "A" | "B" | "C";
  brand?: string;
  model?: string;
};

type SelectStringLayoutProps = {
  /** The selected racket or rental item */
  racket: SelectedRacket;
  /** Type of flow: "purchase" for buying racket, "rental" for renting */
  flowType: "purchase" | "rental";
  /** Rental period in days (only for rental flow) */
  rentalPeriod?: 7 | 15 | 30;
  /** Callback when user selects a string and wants to proceed */
  onSelectString: (params: {
    stringProduct: any;
    selectedGauge?: string;
    selectedColor?: string;
    workCount: number;
  }) => void;
  /** Callback when user wants to skip string selection */
  onSkipString?: () => void;
  /** Whether to show quantity controls (for purchase flow) */
  showQuantityControls?: boolean;
  /** Initial work count */
  initialWorkCount?: number;
  /** Currently selected string ID (for cart edit mode) */
  currentStringId?: string | null;
  /** Initial selected gauge (for cart edit mode) */
  initialSelectedGauge?: string;
  /** Initial selected color (for cart edit mode) */
  initialSelectedColor?: string;
  /** Whether this is cart edit mode */
  isCartEditMode?: boolean;
  /** Back link URL */
  backLink?: string;
  /** CTA button label */
  ctaLabel?: string;
  /** CTA sub label */
  ctaSubLabel?: string;
};

export default function SelectStringLayout({
  racket,
  flowType,
  rentalPeriod,
  onSelectString,
  onSkipString,
  showQuantityControls = true,
  initialWorkCount = 1,
  currentStringId = null,
  initialSelectedGauge = "",
  initialSelectedColor = "",
  isCartEditMode = false,
  backLink,
  ctaLabel,
  ctaSubLabel,
}: SelectStringLayoutProps) {
  // State
  const [workCount, setWorkCount] = useState(initialWorkCount);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "available">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedGaugeByStringId, setSelectedGaugeByStringId] = useState<
    Record<string, string>
  >({});
  const [selectedColorByStringId, setSelectedColorByStringId] = useState<
    Record<string, string>
  >({});

  // Fetch strings
  const { products, isLoadingInitial, isFetchingMore, hasMore, loadMore } =
    useInfiniteProducts({
      limit: 12,
      purpose: "stringing",
    });

  // Max quantity based on racket
  const maxQty = racket.maxQty ?? 99;

  const clampWorkCount = (v: number) => {
    if (!Number.isFinite(v)) return 1;
    return Math.max(1, Math.min(maxQty, Math.trunc(v)));
  };

  // Debounced search
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // Filter products
  const filteredProducts = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase();
    return (products ?? []).filter((product: any) => {
      const haystack = [product?.name, product?.brand, product?.material]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");
      const matchesQuery = !query || haystack.includes(query);
      return (
        matchesQuery &&
        (stockFilter === "all" || hasSelectableStringStock(product))
      );
    });
  }, [debouncedSearchQuery, products, stockFilter]);

  // Initialize color selections when products load
  useEffect(() => {
    if (!products?.length) return;
    setSelectedColorByStringId((prev) => {
      const next = { ...prev };
      let changed = false;
      products.forEach((product: any) => {
        const id = String(product?._id ?? "");
        if (!id || next[id]) return;
        const colorRows = getVisibleColorRows(product);
        if (!colorRows.length) return;
        const firstAvailable =
          colorRows.find((row) => row.stock > 0 && !row.isSoldOut) ??
          colorRows[0];
        if (firstAvailable?.value) {
          next[id] = firstAvailable.value;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [products]);

  // Initialize gauge selections when products or colors change
  useEffect(() => {
    if (!products?.length) return;
    setSelectedGaugeByStringId((prev) => {
      const next = { ...prev };
      let changed = false;
      products.forEach((product: any) => {
        const id = String(product?._id ?? "");
        if (!id) return;
        const hasVariantInventories =
          Array.isArray(product?.variantInventories) &&
          product.variantInventories.length > 0;
        const selectedColor = selectedColorByStringId[id] ?? "";

        if (hasVariantInventories) {
          const variantsForColor = getVariantsByColor(product, selectedColor);
          const currentIsValid = variantsForColor.some(
            (v) => v.gaugeValue === next[id] && isSellableVariant(v),
          );
          if (!currentIsValid) {
            const firstSellable = variantsForColor.find((v) =>
              isSellableVariant(v),
            );
            const nextGauge =
              firstSellable?.gaugeValue ??
              variantsForColor[0]?.gaugeValue ??
              "";
            if ((next[id] ?? "") !== nextGauge) {
              next[id] = nextGauge;
              changed = true;
            }
          }
        } else {
          const gaugeRows = normalizeGaugeRows(product);
          if (gaugeRows.length > 0 && !next[id]) {
            const firstAvailable =
              gaugeRows.find((row) => !row.isSoldOut && row.stock > 0) ??
              gaugeRows[0];
            if (firstAvailable?.value) {
              next[id] = firstAvailable.value;
              changed = true;
            }
          }
        }
      });
      return changed ? next : prev;
    });
  }, [products, selectedColorByStringId]);

  // Initialize from cart edit mode
  useEffect(() => {
    if (!isCartEditMode || !currentStringId || !products?.length) return;
    const target = products.find(
      (item: any) => String(item?._id) === currentStringId,
    );
    if (!target) return;

    if (initialSelectedGauge) {
      const hasGauge = normalizeGaugeRows(target).some(
        (row) => row.value === initialSelectedGauge,
      );
      if (hasGauge) {
        setSelectedGaugeByStringId((prev) => ({
          ...prev,
          [currentStringId]: initialSelectedGauge,
        }));
      }
    }
    if (initialSelectedColor) {
      const hasColor = normalizeColorRows(target).some(
        (row) => row.value === initialSelectedColor,
      );
      if (hasColor) {
        setSelectedColorByStringId((prev) => ({
          ...prev,
          [currentStringId]: initialSelectedColor,
        }));
      }
    }
  }, [
    isCartEditMode,
    currentStringId,
    initialSelectedGauge,
    initialSelectedColor,
    products,
  ]);

  // Handle string selection
  const handleSelectString = (product: any) => {
    const stringId = String(product._id);
    const selectedGauge = selectedGaugeByStringId[stringId] ?? "";
    const selectedColor = selectedColorByStringId[stringId] ?? "";
    onSelectString({
      stringProduct: product,
      selectedGauge: selectedGauge || undefined,
      selectedColor: selectedColor || undefined,
      workCount,
    });
  };

  // Determine CTA labels
  const finalCtaLabel =
    ctaLabel ??
    (flowType === "rental"
      ? "대여 계속하기"
      : isCartEditMode
        ? "이 스트링으로 변경"
        : "구매 계속하기");
  const finalCtaSubLabel =
    ctaSubLabel ??
    (flowType === "rental"
      ? "선택 후 장착 정보 입력 단계로 이동합니다"
      : "선택한 스트링은 라켓과 함께 결제됩니다");

  const renderSelectedRacketSummary = () => (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="border-b border-border bg-secondary/30 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            {flowType === "rental" ? "선택된 라켓 (대여)" : "선택된 라켓"}
          </span>
        </div>
      </div>

      {/* Racket Info */}
      <div className="p-5">
        <div className="flex gap-4">
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-secondary/50">
            {racket.image ? (
              <Image
                src={racket.image}
                alt={racket.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
              {racket.name}
            </h3>
            {flowType === "rental" && rentalPeriod && (
              <p className="mt-1 text-xs text-muted-foreground">
                대여 기간:{" "}
                <span className="font-medium text-foreground">
                  {rentalPeriod}일
                </span>
              </p>
            )}
            {flowType === "purchase" && racket.price != null && (
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="tabular-nums text-base font-bold text-foreground">
                  {racket.price.toLocaleString()}원
                </span>
                {racket.regularPrice && racket.regularPrice > racket.price && (
                  <span className="text-xs text-muted-foreground line-through">
                    {racket.regularPrice.toLocaleString()}원
                  </span>
                )}
                {racket.discountRate && racket.discountRate > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {racket.discountRate}% OFF
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quantity Controls */}
        {showQuantityControls && (
          <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                번들 수량
              </span>
              <span className="text-xs text-muted-foreground">
                최대 {maxQty}개
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                라켓과 스트링이 동일 수량으로 결제됩니다
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setWorkCount((prev) => clampWorkCount(prev - 1))
                  }
                  disabled={workCount <= 1}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={maxQty}
                  value={workCount}
                  onChange={(e) =>
                    setWorkCount(clampWorkCount(Number(e.target.value)))
                  }
                  className="h-8 w-14 text-center text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setWorkCount((prev) => clampWorkCount(prev + 1))
                  }
                  disabled={workCount >= maxQty}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Skip Button */}
        {onSkipString && (
          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={onSkipString}
          >
            스트링 없이 {flowType === "rental" ? "대여" : "구매"}하기
          </Button>
        )}

        {/* Info Text */}
        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          스트링별 재고 현황은 실시간으로 변동될 수 있습니다
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteContainer variant="wide" className="py-6 bp-md:py-10">
        {/* Header */}
        <div className="mb-8 space-y-4">
          {backLink && (
            <Link
              href={backLink}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>뒤로 가기</span>
            </Link>
          )}

          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground bp-md:text-3xl bp-lg:text-4xl">
              스트링 선택
            </h1>
            <p className="mt-2 text-sm text-muted-foreground bp-md:text-base">
              {flowType === "rental"
                ? "대여 라켓에 장착할 스트링을 선택해주세요"
                : isCartEditMode
                  ? "장바구니 번들의 스트링을 변경합니다"
                  : "라켓과 함께 구매하실 스트링을 선택해주세요"}
            </p>
          </div>
        </div>

        <div className="grid gap-6 bp-lg:grid-cols-[1fr_340px] bp-lg:gap-8">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Search & Filter Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm bp-sm:flex-row bp-sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="스트링명 또는 브랜드 검색"
                  className="h-10 pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex w-full items-center gap-2 bp-sm:w-auto">
                <Select
                  value={stockFilter}
                  onValueChange={(v) =>
                    setStockFilter(v as "all" | "available")
                  }
                >
                  <SelectTrigger className="h-10 w-full bp-sm:w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 스트링</SelectItem>
                    <SelectItem value="available">재고 있음</SelectItem>
                  </SelectContent>
                </Select>

                <div className="hidden items-center gap-1 rounded-lg border border-border p-1 bp-md:flex">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      viewMode === "grid"
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-label="그리드 뷰"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      viewMode === "list"
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-label="리스트 뷰"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bp-lg:hidden">{renderSelectedRacketSummary()}</div>

            {/* Product Count */}
            <div className="text-sm text-muted-foreground">
              {isLoadingInitial ? (
                <Skeleton className="inline-block h-4 w-24" />
              ) : (
                <>
                  총{" "}
                  <span className="font-semibold text-foreground">
                    {filteredProducts.length}
                  </span>
                  개의 스트링
                </>
              )}
            </div>

            {/* Product Grid/List */}
            {isLoadingInitial ? (
              <div
                className={cn(
                  "grid gap-4",
                  viewMode === "grid"
                    ? "grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 bp-xl:grid-cols-4"
                    : "grid-cols-1",
                )}
              >
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <Skeleton className="aspect-square w-full rounded-xl" />
                    <Skeleton className="mt-4 h-4 w-3/4" />
                    <Skeleton className="mt-2 h-4 w-1/2" />
                    <Skeleton className="mt-4 h-9 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
                <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-lg font-semibold text-foreground">
                  {products?.length === 0
                    ? "사용 가능한 스트링이 없습니다"
                    : "조건에 맞는 스트링이 없습니다"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {products?.length === 0
                    ? "스트링 상품의 장착 서비스 설정을 확인해주세요"
                    : "검색어 또는 필터를 변경해보세요"}
                </p>
                {searchQuery || stockFilter !== "all" ? (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery("");
                      setStockFilter("all");
                    }}
                  >
                    필터 초기화
                  </Button>
                ) : null}
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "grid gap-4",
                    viewMode === "grid"
                      ? "grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 bp-xl:grid-cols-4"
                      : "grid-cols-1 bp-md:grid-cols-2",
                  )}
                >
                  {filteredProducts.map((product: any) => {
                    const stringId = String(product._id);
                    return (
                      <StringCard
                        key={stringId}
                        product={product}
                        selectedGauge={selectedGaugeByStringId[stringId] ?? ""}
                        selectedColor={selectedColorByStringId[stringId] ?? ""}
                        onGaugeChange={(value) =>
                          setSelectedGaugeByStringId((prev) => ({
                            ...prev,
                            [stringId]: value,
                          }))
                        }
                        onColorChange={(value) =>
                          setSelectedColorByStringId((prev) => ({
                            ...prev,
                            [stringId]: value,
                          }))
                        }
                        onSelect={() => handleSelectString(product)}
                        isSelected={currentStringId === stringId}
                        workCount={workCount}
                        ctaLabel={finalCtaLabel}
                        ctaSubLabel={finalCtaSubLabel}
                      />
                    );
                  })}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={isFetchingMore}
                      className="min-w-[200px]"
                    >
                      {isFetchingMore ? (
                        <span className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4 rounded-full" />
                          로딩 중...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          더 보기
                          <ChevronDown className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar - Selected Racket Summary */}
          <div className="hidden bp-lg:block bp-lg:sticky bp-lg:top-24 bp-lg:h-fit">
            {renderSelectedRacketSummary()}
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
