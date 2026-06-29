"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getEffectiveProductPrice } from "@/lib/product-pricing";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Eye, Package } from "lucide-react";
import Image from "next/image";

import Link from "next/link";
import {
  getColorLabel,
  getGaugeLabel,
  getVariantBySelection,
  getVariantsByColor,
  getVisibleColorRows,
  hasSelectableStringStock,
  isColorSoldOut,
  isSellableVariant,
  normalizeColorRows,
  normalizeGaugeRows,
  normalizeVariantRows,
} from "@/lib/products/string-stock";

export {
  getColorLabel,
  getGaugeLabel,
  getVariantBySelection,
  getVariantsByColor,
  getVisibleColorRows,
  hasSelectableStringStock,
  isColorSoldOut,
  isSellableVariant,
  normalizeColorRows,
  normalizeGaugeRows,
  normalizeVariantRows,
} from "@/lib/products/string-stock";

// Card Props
type StringCardProps = {
  product: any;
  selectedGauge: string;
  selectedColor: string;
  onGaugeChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onSelect: () => void;
  isSelected?: boolean;
  disabled?: boolean;
  workCount?: number;
  ctaLabel?: string;
  ctaSubLabel?: string;
  designVariant?: "default" | "racketPurchase" | "rental";
};

export function StringCard({
  product,
  selectedGauge,
  selectedColor,
  onGaugeChange,
  onColorChange,
  onSelect,
  isSelected = false,
  disabled = false,
  workCount = 1,
  ctaLabel = "스트링 선택",
  ctaSubLabel,
  designVariant = "default",
}: StringCardProps) {
  const isRacketPurchaseDesign = designVariant === "racketPurchase";
  const stringId = String(product._id);
  const stringImage = product?.images?.[0] ?? product?.imageUrl;
  const hasVariantInventories =
    Array.isArray(product?.variantInventories) && product.variantInventories.length > 0;
  const variantRows = hasVariantInventories ? normalizeVariantRows(product) : [];
  const colorRows = hasVariantInventories
    ? getVisibleColorRows(product)
    : normalizeColorRows(product);
  const hasColorRows = colorRows.length > 0;

  const variantsForSelectedColor = hasVariantInventories
    ? getVariantsByColor(product, selectedColor)
    : [];

  const gaugeRows = hasVariantInventories
    ? variantsForSelectedColor.map((row) => ({
        value: row.gaugeValue,
        label: row.gaugeLabel,
        stock: row.stock,
        isSoldOut: row.isSoldOut,
      }))
    : normalizeGaugeRows(product);
  const hasGaugeRows = gaugeRows.length > 0;

  const selectedColorRow = colorRows.find((row) => row.value === selectedColor);
  const selectedGaugeRow = gaugeRows.find((row) => row.value === selectedGauge);
  const selectedVariant = hasVariantInventories
    ? getVariantBySelection(product, selectedColor, selectedGauge)
    : undefined;
  const hideGaugeStock = product?.inventory?.hideGaugeStock === true;
  const manageStock = Boolean(product?.inventory?.manageStock);
  const stock = typeof product?.inventory?.stock === "number" ? product.inventory.stock : undefined;
  const effectiveStock = hasVariantInventories
    ? selectedVariant?.stock
    : selectedGaugeRow
      ? selectedGaugeRow.stock
      : stock;
  const lowStock =
    typeof product?.inventory?.lowStock === "number" ? product.inventory.lowStock : 5;

  const isGaugeSoldOut =
    selectedGaugeRow != null && (selectedGaugeRow.isSoldOut || selectedGaugeRow.stock <= 0);
  const isGaugeShort = selectedGaugeRow != null && selectedGaugeRow.stock < workCount;
  const isProductSoldOut = !hasSelectableStringStock(product);
  const isSoldOut =
    isProductSoldOut ||
    (hasGaugeRows ? isGaugeSoldOut : manageStock && typeof stock === "number" && stock <= 0);
  const isShort = hasGaugeRows
    ? selectedGaugeRow != null && (effectiveStock ?? 0) < workCount
    : manageStock && typeof stock === "number" && stock < workCount;
  const disabledByGauge =
    (hasVariantInventories || hasGaugeRows) && (!selectedGauge || isGaugeSoldOut || isGaugeShort);
  const isColorSoldOutState = hasVariantInventories
    ? !variantRows.some((row) => row.colorValue === selectedColor && isSellableVariant(row))
    : selectedColorRow != null && isColorSoldOut(selectedColorRow);
  const isColorShort = selectedColorRow != null && selectedColorRow.stock < workCount;
  const disabledByColor = hasColorRows && (!selectedColor || isColorSoldOutState || isColorShort);
  const canShowStockHint =
    manageStock &&
    typeof effectiveStock === "number" &&
    effectiveStock > 0 &&
    effectiveStock <= lowStock &&
    (!hasGaugeRows || (selectedGaugeRow != null && !hideGaugeStock));

  const isDisabled = disabled || disabledByGauge || disabledByColor || isSoldOut || isShort;
  const regularPrice = Number(product?.price ?? 0);
  const salePrice = getEffectiveProductPrice(product);
  const hasSalePrice = Number.isFinite(salePrice) && salePrice > 0 && salePrice < regularPrice;
  const discountAmount = hasSalePrice ? regularPrice - salePrice : 0;
  const discountRate =
    hasSalePrice && regularPrice > 0 ? Math.round((discountAmount / regularPrice) * 100) : 0;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200",
        isSelected
          ? cn(
              "border-primary/40 bg-primary/5",
              !isRacketPurchaseDesign && "ring-2 ring-primary/20",
            )
          : "border-border hover:border-primary/40 hover:bg-muted/20",
        isSoldOut && "opacity-60",
      )}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute right-3 top-3 z-10">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-4 w-4" />
          </div>
        </div>
      )}

      {/* Image */}
      <div
        className={cn(
          "relative w-full overflow-hidden bg-muted/20",
          isRacketPurchaseDesign ? "aspect-[4/3]" : "aspect-square",
        )}
      >
        {stringImage ? (
          <Image
            src={stringImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 "
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Badge variant="secondary" className="text-ui-body-sm font-semibold">
              품절
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn("flex flex-1 flex-col", isRacketPurchaseDesign ? "p-3 bp-md:p-4" : "p-4")}>
        {/* Title & Price */}
        <div className="mb-3 space-y-1.5">
          <h3 className="line-clamp-2 min-w-0 break-words text-ui-body-sm font-semibold leading-tight text-foreground bp-md:text-ui-body">
            {product.name}
          </h3>
          {product.shortDescription && (
            <p className="line-clamp-2 min-w-0 break-words text-ui-label text-muted-foreground">
              {product.shortDescription}
            </p>
          )}
          {hasSalePrice ? (
            <div className="space-y-1 tabular-nums">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-ui-label font-medium text-muted-foreground">할인가</span>
                <span className="text-ui-card-title-lg font-semibold text-foreground">
                  {getEffectiveProductPrice(product).toLocaleString()}원
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ui-label">
                <span className="text-muted-foreground">정가</span>
                <span className="text-muted-foreground line-through">
                  {regularPrice.toLocaleString()}원
                </span>
                <Badge variant="destructive" className="text-ui-micro">
                  {discountRate}% OFF
                </Badge>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
              <span className="text-ui-label font-medium text-muted-foreground">판매가</span>
              <span className="text-ui-card-title-lg font-semibold text-foreground">
                {getEffectiveProductPrice(product).toLocaleString()}원
              </span>
            </div>
          )}
        </div>

        {/* Color Selector */}
        {hasColorRows && (
          <div className="mb-3 space-y-2">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="text-ui-label font-medium text-foreground">색상</span>
              {selectedColorRow && (
                <span className="min-w-0 break-words text-right text-ui-label text-muted-foreground">
                  {getColorLabel(selectedColorRow)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {colorRows.slice(0, 6).map((row) => {
                const label = getColorLabel(row);
                const soldOut = hasVariantInventories
                  ? !variantRows.some(
                      (variant) => variant.colorValue === row.value && isSellableVariant(variant),
                    )
                  : isColorSoldOut(row);
                const isColorSelected = selectedColor === row.value;
                const colorImage =
                  row.image?.trim() ||
                  (hasVariantInventories
                    ? variantRows
                        .find((v) => v.colorValue === row.value && v.colorImage?.trim())
                        ?.colorImage?.trim()
                    : undefined);

                return (
                  <button
                    key={`${stringId}-color-${row.value}`}
                    type="button"
                    aria-pressed={isColorSelected}
                    aria-label={`${label} 색상 선택`}
                    disabled={soldOut}
                    onClick={() => {
                      onColorChange(row.value);
                      // Auto-select first available gauge for new color
                      if (hasVariantInventories) {
                        const nextVariants = getVariantsByColor(product, row.value);
                        const firstSellable = nextVariants.find((v) => isSellableVariant(v));
                        if (firstSellable) {
                          onGaugeChange(firstSellable.gaugeValue);
                        }
                      }
                    }}
                    className={cn(
                      "relative h-10 w-10 overflow-hidden rounded-md border-2 transition-all bp-md:h-11 bp-md:w-11",
                      isColorSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50",
                      soldOut && "cursor-not-allowed opacity-40",
                    )}
                  >
                    {colorImage ? (
                      <Image
                        src={colorImage}
                        alt={label}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : row.colorHex ? (
                      <span
                        className="absolute inset-1 rounded-sm"
                        style={{ backgroundColor: row.colorHex }}
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-ui-micro text-muted-foreground">
                        {label.charAt(0)}
                      </span>
                    )}
                    {soldOut && (
                      <span className="absolute inset-0 flex items-center justify-center bg-background/60 text-ui-micro font-medium text-destructive">
                        X
                      </span>
                    )}
                  </button>
                );
              })}
              {colorRows.length > 6 && (
                <span className="flex h-10 items-center px-1 text-ui-label text-muted-foreground bp-md:h-11">
                  +{colorRows.length - 6}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Gauge Selector */}
        {hasGaugeRows && (
          <div className="mb-3 space-y-2">
            <span className="text-ui-label font-medium text-foreground">게이지(굵기)</span>
            <Select value={selectedGauge} onValueChange={onGaugeChange}>
              <SelectTrigger className="h-10 text-ui-label">
                <SelectValue placeholder="게이지(굵기) 선택" />
              </SelectTrigger>
              <SelectContent>
                {gaugeRows.map((row) => {
                  const soldOut = row.isSoldOut || row.stock <= 0;
                  const gaugeLabel = getGaugeLabel(row);
                  const stockSuffix = soldOut
                    ? " · 품절"
                    : hideGaugeStock
                      ? ""
                      : ` · 재고 ${row.stock}개`;
                  return (
                    <SelectItem
                      key={`${stringId}-gauge-${row.value}`}
                      value={row.value}
                      disabled={soldOut}
                    >
                      {`${gaugeLabel}${stockSuffix}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Stock hints */}
        <div className="mt-auto space-y-1">
          {canShowStockHint && (
            <p className="text-ui-label font-medium text-warning">남은 수량 {effectiveStock}개</p>
          )}
          {isShort && !isSoldOut && (
            <p className="text-ui-label text-destructive">구매 가능 수량 초과</p>
          )}
        </div>

        {/* CTA Button */}
        <Button
          className="mt-3 h-10 w-full justify-center gap-2 whitespace-normal break-keep rounded-xl"
          disabled={isDisabled}
          onClick={onSelect}
        >
          <span>{ctaLabel}</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Button>
        <Button
          asChild
          variant="outline"
          className="mt-2 h-10 w-full justify-center gap-2 whitespace-normal break-keep rounded-xl"
        >
          <Link
            href={`/products/${product._id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            <Eye className="h-4 w-4" />
            상세 보기
          </Link>
        </Button>
        {ctaSubLabel && (
          <p className="mt-1.5 text-center text-ui-caption text-muted-foreground">{ctaSubLabel}</p>
        )}
      </div>
    </div>
  );
}
