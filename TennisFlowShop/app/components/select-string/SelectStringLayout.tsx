"use client";

import { useInfiniteProducts } from "@/app/products/hooks/useInfiniteProducts";
import { CatalogPrice } from "@/components/commerce/CatalogPrice";
import {
  CommerceSelectionHeader,
  SelectedRacketSummary,
  StringSelectionCardSkeleton,
  StringSelectionToolbar,
  type SelectionStep,
} from "@/components/commerce/selection";
import SiteContainer from "@/components/layout/SiteContainer";
import StickyAside from "@/components/layout/StickyAside";
import { EmptyState } from "@/components/public/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getVariantsByColor,
  getVisibleColorRows,
  hasSelectableStringStock,
  isSellableVariant,
  normalizeColorRows,
  normalizeGaugeRows,
} from "@/lib/products/string-stock";
import { cn } from "@/lib/utils";
import { ChevronDown, Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StringCard } from "./StringCard";

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
  racket: SelectedRacket;
  flowType: "purchase" | "rental";
  rentalPeriod?: 7 | 15 | 30;
  onSelectString: (params: {
    stringProduct: any;
    selectedGauge?: string;
    selectedColor?: string;
    workCount: number;
  }) => void;
  onSkipString?: () => void;
  showQuantityControls?: boolean;
  initialWorkCount?: number;
  currentStringId?: string | null;
  initialSelectedGauge?: string;
  initialSelectedColor?: string;
  isCartEditMode?: boolean;
  backLink?: string;
  ctaLabel?: string;
  ctaSubLabel?: string;
  designVariant?: "default" | "racketPurchase" | "rental";
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
  designVariant = "default",
}: SelectStringLayoutProps) {
  const [workCount, setWorkCount] = useState(initialWorkCount);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "available">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedGaugeByStringId, setSelectedGaugeByStringId] = useState<Record<string, string>>({});
  const [selectedColorByStringId, setSelectedColorByStringId] = useState<Record<string, string>>({});

  const { products, isLoadingInitial, isFetchingMore, hasMore, loadMore } = useInfiniteProducts({
    limit: 12,
    purpose: "stringing",
  });

  const maxQty = racket.maxQty ?? 99;
  const clampWorkCount = (v: number) => {
    if (!Number.isFinite(v)) return 1;
    return Math.max(1, Math.min(maxQty, Math.trunc(v)));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const filteredProducts = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase();
    return (products ?? []).filter((product: any) => {
      const haystack = [product?.name, product?.brand, product?.material]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");
      const matchesQuery = !query || haystack.includes(query);
      return matchesQuery && (stockFilter === "all" || hasSelectableStringStock(product));
    });
  }, [debouncedSearchQuery, products, stockFilter]);

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
        const firstAvailable = colorRows.find((row) => row.stock > 0 && !row.isSoldOut) ?? colorRows[0];
        if (firstAvailable?.value) {
          next[id] = firstAvailable.value;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [products]);

  useEffect(() => {
    if (!products?.length) return;
    setSelectedGaugeByStringId((prev) => {
      const next = { ...prev };
      let changed = false;
      products.forEach((product: any) => {
        const id = String(product?._id ?? "");
        if (!id) return;
        const hasVariantInventories = Array.isArray(product?.variantInventories) && product.variantInventories.length > 0;
        const selectedColor = selectedColorByStringId[id] ?? "";
        if (hasVariantInventories) {
          const variantsForColor = getVariantsByColor(product, selectedColor);
          const currentIsValid = variantsForColor.some((v) => v.gaugeValue === next[id] && isSellableVariant(v));
          if (!currentIsValid) {
            const firstSellable = variantsForColor.find((v) => isSellableVariant(v));
            const nextGauge = firstSellable?.gaugeValue ?? variantsForColor[0]?.gaugeValue ?? "";
            if ((next[id] ?? "") !== nextGauge) {
              next[id] = nextGauge;
              changed = true;
            }
          }
        } else {
          const gaugeRows = normalizeGaugeRows(product);
          if (gaugeRows.length > 0 && !next[id]) {
            const firstAvailable = gaugeRows.find((row) => !row.isSoldOut && row.stock > 0) ?? gaugeRows[0];
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

  useEffect(() => {
    if (!isCartEditMode || !currentStringId || !products?.length) return;
    const target = products.find((item: any) => String(item?._id) === currentStringId);
    if (!target) return;
    if (initialSelectedGauge) {
      const hasGauge = normalizeGaugeRows(target).some((row) => row.value === initialSelectedGauge);
      if (hasGauge) setSelectedGaugeByStringId((prev) => ({ ...prev, [currentStringId]: initialSelectedGauge }));
    }
    if (initialSelectedColor) {
      const hasColor = normalizeColorRows(target).some((row) => row.value === initialSelectedColor);
      if (hasColor) setSelectedColorByStringId((prev) => ({ ...prev, [currentStringId]: initialSelectedColor }));
    }
  }, [isCartEditMode, currentStringId, initialSelectedGauge, initialSelectedColor, products]);

  const handleSelectString = (product: any) => {
    const stringId = String(product._id);
    onSelectString({
      stringProduct: product,
      selectedGauge: selectedGaugeByStringId[stringId] || undefined,
      selectedColor: selectedColorByStringId[stringId] || undefined,
      workCount,
    });
  };

  const finalCtaLabel = ctaLabel ?? (flowType === "rental" ? "대여 계속하기" : isCartEditMode ? "이 스트링으로 변경" : "구매 계속하기");
  const finalCtaSubLabel = ctaSubLabel ?? (flowType === "rental" ? "선택 후 대여 신청 단계로 이동합니다" : "선택한 스트링은 라켓과 함께 결제됩니다");
  const selectionSteps: SelectionStep[] = [
    { id: "racket", label: "라켓 확인", shortLabel: "라켓", status: "complete" },
    { id: "string", label: "스트링 선택", shortLabel: "스트링", status: "current" },
    { id: "checkout", label: "결제·장착 정보", shortLabel: "결제", status: "upcoming" },
  ];
  const headerTitle = flowType === "rental" ? "대여 라켓에 장착할 스트링을 선택하세요" : isCartEditMode ? "라켓과 스트링 구성을 변경하세요" : "라켓에 장착할 스트링을 선택하세요";
  const headerDescription = flowType === "rental" ? "스트링을 선택하거나 스트링 없이 대여 신청 단계로 이동할 수 있습니다." : isCartEditMode ? "새 스트링과 옵션을 선택하면 장바구니 구성에 반영됩니다." : "색상과 게이지를 확인한 뒤 선택하면 결제·장착 정보 단계로 이동합니다.";
  const resultHelper = flowType === "rental" ? `${finalCtaSubLabel}.` : isCartEditMode ? "선택한 옵션을 반영한 뒤 장바구니로 돌아갑니다." : finalCtaSubLabel;

  const renderQuantityControls = () => (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-ui-body-sm font-medium text-foreground">번들 수량</span>
        <span className="text-ui-label text-muted-foreground">최대 {maxQty}개</span>
      </div>
      <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
        <p className="min-w-0 break-keep text-ui-label leading-relaxed text-muted-foreground">라켓과 스트링이 동일 수량으로 결제됩니다</p>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="outline" size="icon" className="h-10 w-10 bp-sm:h-11 bp-sm:w-11" aria-label="라켓과 스트링 수량 줄이기" onClick={() => setWorkCount((prev) => clampWorkCount(prev - 1))} disabled={workCount <= 1}>
            <Minus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Input type="number" inputMode="numeric" min={1} max={maxQty} value={workCount} aria-label="라켓과 스트링 수량" onChange={(e) => setWorkCount(clampWorkCount(Number(e.target.value)))} className="h-10 w-16 text-center text-ui-body-sm bp-sm:h-11" />
          <Button type="button" variant="outline" size="icon" className="h-10 w-10 bp-sm:h-11 bp-sm:w-11" aria-label="라켓과 스트링 수량 늘리기" onClick={() => setWorkCount((prev) => clampWorkCount(prev + 1))} disabled={workCount >= maxQty}>
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSelectedRacketSummary = () => (
    <SelectedRacketSummary
      label={flowType === "rental" ? "선택한 대여 라켓" : "선택한 라켓"}
      name={racket.name}
      image={racket.image}
      price={flowType === "purchase" && racket.price != null ? (
        <CatalogPrice regularPrice={racket.regularPrice ?? racket.price ?? 0} salePrice={racket.price != null && racket.regularPrice != null && racket.price < racket.regularPrice ? racket.price : null} size="list" />
      ) : undefined}
      meta={flowType === "rental" ? (
        <div className="space-y-1 text-ui-label text-muted-foreground">
          {rentalPeriod && <p>대여 기간 <span className="font-medium text-foreground">{rentalPeriod}일</span></p>}
          {(racket.brand || racket.model) && <p>{[racket.brand, racket.model].filter(Boolean).join(" · ")}</p>}
          {racket.condition && <p>상태 등급 <span className="font-medium text-foreground">{racket.condition}</span></p>}
        </div>
      ) : undefined}
      quantityControls={showQuantityControls ? renderQuantityControls() : undefined}
      secondaryAction={onSkipString ? <Button variant="outline" className="h-10 w-full rounded-xl" onClick={onSkipString}>스트링 없이 {flowType === "rental" ? "대여" : "구매"}하기</Button> : undefined}
      helper={<><p className="font-semibold text-foreground">다음 단계 안내</p><p className="mt-1 break-keep">{flowType === "rental" ? "선택한 대여 라켓과 스트링 옵션은 신청 단계에서 한 번 더 확인할 수 있습니다." : "선택한 라켓, 스트링 옵션, 수량은 체크아웃에서 한 번 더 확인할 수 있습니다."}</p></>}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteContainer variant="wide" className="space-y-6 py-5 bp-md:py-8">
        <CommerceSelectionHeader backHref={backLink} title={headerTitle} description={headerDescription} steps={selectionSteps} />

        <div className="grid gap-6 bp-lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-6">
            <div className="bp-lg:hidden">{renderSelectedRacketSummary()}</div>

            <StringSelectionToolbar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              onSearchClear={() => setSearchQuery("")}
              stockFilter={stockFilter}
              onStockFilterChange={setStockFilter}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              total={filteredProducts.length}
              isLoading={isLoadingInitial}
              helper={resultHelper}
            />

            {isLoadingInitial ? (
              <StringSelectionCardSkeleton viewMode={viewMode} />
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="h-12 w-12" />}
                title={products?.length === 0 ? "사용 가능한 스트링이 없습니다" : "조건에 맞는 스트링이 없습니다"}
                description={products?.length === 0 ? "스트링 상품의 장착 서비스와 재고 설정을 확인해주세요." : "검색어 또는 재고 필터를 변경해보세요."}
                action={searchQuery || stockFilter !== "all" ? <Button variant="outline" onClick={() => { setSearchQuery(""); setStockFilter("all"); }}>필터 초기화</Button> : undefined}
              />
            ) : (
              <>
                <div className={cn("grid gap-4", viewMode === "grid" ? "grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 bp-2xl:grid-cols-4" : "grid-cols-1")}>
                  {filteredProducts.map((product: any) => {
                    const stringId = String(product._id);
                    return (
                      <StringCard
                        key={stringId}
                        product={product}
                        selectedGauge={selectedGaugeByStringId[stringId] ?? ""}
                        selectedColor={selectedColorByStringId[stringId] ?? ""}
                        onGaugeChange={(value) => setSelectedGaugeByStringId((prev) => ({ ...prev, [stringId]: value }))}
                        onColorChange={(value) => setSelectedColorByStringId((prev) => ({ ...prev, [stringId]: value }))}
                        onSelect={() => handleSelectString(product)}
                        isSelected={currentStringId === stringId}
                        workCount={workCount}
                        ctaLabel={finalCtaLabel}
                        designVariant={designVariant}
                        viewMode={viewMode}
                      />
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button variant="outline" onClick={loadMore} disabled={isFetchingMore} className="min-w-[200px]" aria-label="스트링 더 불러오기">
                      {isFetchingMore ? <span className="flex items-center gap-2"><Skeleton className="h-4 w-4 rounded-full" />로딩 중...</span> : <span className="flex items-center gap-2">더 보기<ChevronDown className="h-4 w-4" aria-hidden="true" /></span>}
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>

          <div className="hidden bp-lg:block">
            <StickyAside>{renderSelectedRacketSummary()}</StickyAside>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
