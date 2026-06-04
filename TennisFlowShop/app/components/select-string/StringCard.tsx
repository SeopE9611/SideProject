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
import { stringColorLabel } from "@/lib/constants";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Package } from "lucide-react";
import Image from "next/image";

// Types
export type GaugeInventoryRow = {
  value: string;
  label?: string;
  stock: number;
  isSoldOut: boolean;
  showWhenSoldOut?: boolean | null;
};

export type ColorInventoryRow = {
  value: string;
  label?: string;
  colorHex?: string;
  image?: string;
  stock: number;
  isSoldOut: boolean;
  showWhenSoldOut?: boolean | null;
};

export type VariantInventoryRow = {
  colorValue: string;
  colorLabel?: string;
  colorHex?: string;
  colorImage?: string;
  gaugeValue: string;
  gaugeLabel?: string;
  stock: number;
  isSoldOut: boolean;
  showWhenSoldOut?: boolean | null;
};

// Utility functions
export function normalizeGaugeRows(product: any): GaugeInventoryRow[] {
  if (Array.isArray(product?.gaugeInventories) && product.gaugeInventories.length > 0) {
    return product.gaugeInventories
      .map((row: any) => ({
        value: String(row?.value ?? "").trim(),
        label: typeof row?.label === "string" ? row.label.trim() : undefined,
        stock: (() => {
          const stockNumber = Number(row?.stock ?? 0);
          return Number.isFinite(stockNumber) && stockNumber > 0 ? stockNumber : 0;
        })(),
        isSoldOut: row?.isSoldOut === true,
        showWhenSoldOut: row?.showWhenSoldOut === false ? false : true,
      }))
      .filter((row: GaugeInventoryRow) => row.value.length > 0);
  }

  if (Array.isArray(product?.gaugeOptions) && product.gaugeOptions.length > 0) {
    return product.gaugeOptions
      .map((value: unknown) => String(value ?? "").trim())
      .filter(Boolean)
      .map((value: string) => ({
        value,
        stock: Number(product?.inventory?.stock ?? 0),
        isSoldOut: false,
      }));
  }

  return [];
}

export function getGaugeLabel(row: GaugeInventoryRow) {
  const raw = String(row.label || row.value || "").trim();
  return formatGaugeLabel(raw) || raw || "-";
}

export function normalizeColorRows(product: any): ColorInventoryRow[] {
  if (Array.isArray(product?.colorInventories) && product.colorInventories.length > 0) {
    return product.colorInventories
      .map((row: any) => {
        const stockNumber = Number(row?.stock ?? 0);
        return {
          value: String(row?.value ?? "").trim(),
          label: typeof row?.label === "string" ? row.label.trim() : undefined,
          colorHex: typeof row?.colorHex === "string" ? row.colorHex.trim() : undefined,
          image: typeof row?.image === "string" ? row.image.trim() : undefined,
          stock: Number.isFinite(stockNumber) && stockNumber > 0 ? stockNumber : 0,
          isSoldOut: row?.isSoldOut === true,
          showWhenSoldOut: row?.showWhenSoldOut === false ? false : true,
        };
      })
      .filter((row: ColorInventoryRow) => row.value.length > 0);
  }

  if (Array.isArray(product?.colorOptions) && product.colorOptions.length > 0) {
    const fallbackStock = Number(product?.inventory?.stock ?? 0);
    const normalizedFallbackStock =
      Number.isFinite(fallbackStock) && fallbackStock > 0 ? fallbackStock : 0;
    return product.colorOptions
      .map((value: unknown) => String(value ?? "").trim())
      .filter(Boolean)
      .map((value: string) => ({
        value,
        label: value,
        stock: normalizedFallbackStock,
        isSoldOut: false,
      }));
  }

  if (typeof product?.color === "string" && product.color.trim()) {
    const fallbackStock = Number(product?.inventory?.stock ?? 0);
    const normalizedFallbackStock =
      Number.isFinite(fallbackStock) && fallbackStock > 0 ? fallbackStock : 0;
    return [
      {
        value: product.color.trim(),
        label: product.color.trim(),
        stock: normalizedFallbackStock,
        isSoldOut: false,
      },
    ];
  }
  return [];
}

export function getColorLabel(row: ColorInventoryRow) {
  const raw = String(row.label || row.value || "").trim();
  return stringColorLabel(raw) || raw || "-";
}

export function isColorSoldOut(row: ColorInventoryRow) {
  return row.isSoldOut === true || Number(row.stock ?? 0) <= 0;
}

export function normalizeVariantRows(product: any): VariantInventoryRow[] {
  if (!Array.isArray(product?.variantInventories)) return [];
  return product.variantInventories
    .map((row: any) => {
      const stockNumber = Number(row?.stock ?? 0);
      return {
        colorValue: String(row?.colorValue ?? "").trim(),
        colorLabel: typeof row?.colorLabel === "string" ? row.colorLabel.trim() : undefined,
        colorHex: typeof row?.colorHex === "string" ? row.colorHex.trim() : undefined,
        colorImage: typeof row?.colorImage === "string" ? row.colorImage.trim() : undefined,
        gaugeValue: String(row?.gaugeValue ?? "").trim(),
        gaugeLabel: typeof row?.gaugeLabel === "string" ? row.gaugeLabel.trim() : undefined,
        stock: Number.isFinite(stockNumber) && stockNumber > 0 ? stockNumber : 0,
        isSoldOut: row?.isSoldOut === true,
        showWhenSoldOut: row?.showWhenSoldOut === false ? false : true,
      };
    })
    .filter((row: VariantInventoryRow) => row.colorValue.length > 0 && row.gaugeValue.length > 0);
}

export function isSellableVariant(row: VariantInventoryRow) {
  return row.isSoldOut !== true && Number(row.stock ?? 0) > 0;
}

export function isSoldOutVariant(row: VariantInventoryRow) {
  return row.isSoldOut === true || Number(row.stock ?? 0) <= 0;
}

export function isVisibleVariant(row: VariantInventoryRow) {
  return !(isSoldOutVariant(row) && row.showWhenSoldOut === false);
}

export function getVariantsByColor(product: any, colorValue: string) {
  return normalizeVariantRows(product).filter((row) => row.colorValue === colorValue && isVisibleVariant(row));
}

export function getVisibleColorRows(product: any): ColorInventoryRow[] {
  const colorRows = normalizeColorRows(product);
  const variantRows = normalizeVariantRows(product);
  if (variantRows.length === 0) return colorRows;
  const visibleVariantRows = variantRows.filter(isVisibleVariant);
  const visibleColorValues = Array.from(new Set(visibleVariantRows.map((row) => row.colorValue).filter(Boolean)));
  const visibleColorRows = colorRows.filter((row) => visibleColorValues.includes(row.value));
  const existingValues = new Set(visibleColorRows.map((row) => row.value));
  const fallbackRows: ColorInventoryRow[] = [];
  visibleVariantRows.forEach((row) => {
    if (!row.colorValue || existingValues.has(row.colorValue)) return;
    fallbackRows.push({
      value: row.colorValue,
      label: row.colorLabel ?? row.colorValue,
      colorHex: row.colorHex ?? undefined,
      image: row.colorImage ?? undefined,
      stock: Number(row.stock ?? 0),
      isSoldOut: row.isSoldOut === true,
      showWhenSoldOut: row.showWhenSoldOut,
    });
    existingValues.add(row.colorValue);
  });
  return [...visibleColorRows, ...fallbackRows];
}

export function getVariantBySelection(product: any, colorValue: string, gaugeValue: string) {
  return normalizeVariantRows(product).find(
    (row) => row.colorValue === colorValue && row.gaugeValue === gaugeValue,
  );
}

export function hasSelectableStringStock(product: any) {
  const variantRows = normalizeVariantRows(product);
  if (variantRows.length > 0) {
    return variantRows.some((row) => isSellableVariant(row));
  }

  const gaugeRows = normalizeGaugeRows(product);
  if (gaugeRows.length > 0) {
    return gaugeRows.some((row) => !row.isSoldOut && row.stock > 0);
  }

  const colorRows = normalizeColorRows(product);
  if (colorRows.length > 0) {
    return colorRows.some((row) => !isColorSoldOut(row));
  }

  if (product?.inventory?.manageStock === true) {
    return Number(product?.inventory?.stock ?? 0) > 0;
  }

  return true;
}

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
  ctaLabel = "이 스트링 선택",
  ctaSubLabel,
}: StringCardProps) {
  const stringId = String(product._id);
  const stringImage = product?.images?.[0] ?? product?.imageUrl;
  const hasVariantInventories =
    Array.isArray(product?.variantInventories) && product.variantInventories.length > 0;
  const variantRows = hasVariantInventories ? normalizeVariantRows(product) : [];
  const colorRows = hasVariantInventories ? getVisibleColorRows(product) : normalizeColorRows(product);
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
  const lowStock = typeof product?.inventory?.lowStock === "number" ? product.inventory.lowStock : 5;

  const isGaugeSoldOut = selectedGaugeRow != null && (selectedGaugeRow.isSoldOut || selectedGaugeRow.stock <= 0);
  const isGaugeShort = selectedGaugeRow != null && selectedGaugeRow.stock < workCount;
  const isSoldOut = hasGaugeRows
    ? isGaugeSoldOut
    : manageStock && typeof stock === "number" && stock <= 0;
  const isShort = hasGaugeRows
    ? selectedGaugeRow != null && (effectiveStock ?? 0) < workCount
    : manageStock && typeof stock === "number" && stock < workCount;
  const disabledByGauge = (hasVariantInventories || hasGaugeRows) && (!selectedGauge || isGaugeSoldOut || isGaugeShort);
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

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-200",
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-lg"
          : "border-border hover:border-primary/40 hover:shadow-md",
        isSoldOut && "opacity-60"
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
      <div className="relative aspect-square w-full overflow-hidden bg-secondary/30">
        {stringImage ? (
          <Image
            src={stringImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Badge variant="secondary" className="text-sm font-semibold">
              품절
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title & Price */}
        <div className="mb-3 space-y-1.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground bp-md:text-base">
            {product.name}
          </h3>
          {product.shortDescription && (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {product.shortDescription}
            </p>
          )}
          <p className="tabular-nums text-lg font-bold text-foreground">
            {Number(product.price ?? 0).toLocaleString()}원
          </p>
        </div>

        {/* Color Selector */}
        {hasColorRows && colorRows.length > 1 && (
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">색상</span>
              {selectedColorRow && (
                <span className="text-xs text-muted-foreground">
                  {getColorLabel(selectedColorRow)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {colorRows.slice(0, 6).map((row) => {
                const label = getColorLabel(row);
                const soldOut = hasVariantInventories
                  ? !variantRows.some(
                      (variant) => variant.colorValue === row.value && isSellableVariant(variant)
                    )
                  : isColorSoldOut(row);
                const isColorSelected = selectedColor === row.value;
                const colorImage =
                  row.image ||
                  (hasVariantInventories
                    ? variantRows.find((v) => v.colorValue === row.value && v.colorImage)?.colorImage
                    : undefined) ||
                  stringImage;

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
                      "relative h-8 w-8 overflow-hidden rounded-md border-2 transition-all",
                      isColorSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50",
                      soldOut && "cursor-not-allowed opacity-40"
                    )}
                  >
                    {colorImage ? (
                      <Image
                        src={colorImage}
                        alt={label}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    ) : row.colorHex ? (
                      <span
                        className="absolute inset-1 rounded-sm"
                        style={{ backgroundColor: row.colorHex }}
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                        {label.charAt(0)}
                      </span>
                    )}
                    {soldOut && (
                      <span className="absolute inset-0 flex items-center justify-center bg-background/60 text-[8px] font-medium text-destructive">
                        X
                      </span>
                    )}
                  </button>
                );
              })}
              {colorRows.length > 6 && (
                <span className="flex h-8 items-center px-1 text-xs text-muted-foreground">
                  +{colorRows.length - 6}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Gauge Selector */}
        {hasGaugeRows && (
          <div className="mb-3 space-y-2">
            <span className="text-xs font-medium text-foreground">게이지</span>
            <Select value={selectedGauge} onValueChange={onGaugeChange}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="게이지 선택" />
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
                    <SelectItem key={`${stringId}-gauge-${row.value}`} value={row.value} disabled={soldOut}>
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
            <p className="text-xs font-medium text-warning">
              남은 수량 {effectiveStock}개
            </p>
          )}
          {isShort && !isSoldOut && (
            <p className="text-xs text-destructive">
              구매 가능 수량 초과
            </p>
          )}
        </div>

        {/* CTA Button */}
        <Button
          className="mt-3 w-full gap-2"
          disabled={isDisabled}
          onClick={onSelect}
        >
          <span className="truncate">{ctaLabel}</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Button>
        {ctaSubLabel && (
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            {ctaSubLabel}
          </p>
        )}
      </div>
    </div>
  );
}
