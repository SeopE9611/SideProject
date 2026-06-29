"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useInfiniteProducts } from "@/app/products/hooks/useInfiniteProducts";
import { EmptyState } from "@/components/public/EmptyState";
import { ResultState } from "@/components/public/ResultState";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { stringColorLabel } from "@/lib/constants";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Package, RotateCcw } from "lucide-react";

type GaugeInventoryRow = {
  value: string;
  label?: string;
  stock: number;
  isSoldOut: boolean;
};
type ColorInventoryRow = {
  value: string;
  label?: string;
  colorHex?: string;
  image?: string;
  stock: number;
  isSoldOut: boolean;
};
type VariantInventoryRow = {
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

type SelectableStringProduct = {
  _id: string;
  name?: string;
  price?: number;
  mountingFee?: number;
  gaugeOptions?: string[];
  gaugeInventories?: GaugeInventoryRow[];
  colorOptions?: string[];
  colorInventories?: ColorInventoryRow[];
  color?: string;
  images?: string[];
  inventory?: { stock?: number; hideGaugeStock?: boolean };
};

const PLACEHOLDER_IMAGE = "https://placehold.co/40x40?text=%20";

function normalizeGaugeRows(product: SelectableStringProduct): GaugeInventoryRow[] {
  if (Array.isArray(product.gaugeInventories) && product.gaugeInventories.length > 0)
    return product.gaugeInventories
      .map((row) => ({
        value: String(row?.value ?? "").trim(),
        label: typeof row?.label === "string" ? row.label.trim() : undefined,
        stock: Math.max(0, Number(row?.stock ?? 0) || 0),
        isSoldOut: row?.isSoldOut === true,
      }))
      .filter((row) => row.value);
  if (Array.isArray(product.gaugeOptions) && product.gaugeOptions.length > 0) {
    const fallbackStock = Math.max(0, Number(product.inventory?.stock ?? 0) || 0);
    return product.gaugeOptions
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .map((value) => ({ value, stock: fallbackStock, isSoldOut: false }));
  }
  return [];
}
function normalizeColorRows(product: SelectableStringProduct): ColorInventoryRow[] {
  if (Array.isArray(product.colorInventories) && product.colorInventories.length > 0)
    return product.colorInventories
      .map((row) => ({
        value: String(row?.value ?? "").trim(),
        label: typeof row?.label === "string" ? row.label.trim() : undefined,
        colorHex: typeof row?.colorHex === "string" ? row.colorHex.trim() : undefined,
        image: typeof row?.image === "string" ? row.image.trim() : undefined,
        stock: Math.max(0, Number(row?.stock ?? 0) || 0),
        isSoldOut: row?.isSoldOut === true,
      }))
      .filter((row) => row.value);
  if (Array.isArray(product.colorOptions) && product.colorOptions.length > 0) {
    const fallbackStock = Math.max(0, Number(product.inventory?.stock ?? 0) || 0);
    return product.colorOptions
      .map((value: unknown) => String(value ?? "").trim())
      .filter(Boolean)
      .map((value) => ({
        value,
        label: value,
        stock: fallbackStock,
        isSoldOut: false,
      }));
  }
  if (typeof product.color === "string" && product.color.trim()) {
    const fallbackStock = Math.max(0, Number(product.inventory?.stock ?? 0) || 0);
    return [
      {
        value: product.color.trim(),
        label: product.color.trim(),
        stock: fallbackStock,
        isSoldOut: false,
      },
    ];
  }
  return [];
}
function normalizeVariantRows(product: SelectableStringProduct): VariantInventoryRow[] {
  if (!Array.isArray((product as any)?.variantInventories)) return [];
  return (product as any).variantInventories
    .map((row: any) => ({
      colorValue: String(row?.colorValue ?? "").trim(),
      colorLabel: typeof row?.colorLabel === "string" ? row.colorLabel.trim() : undefined,
      colorHex: typeof row?.colorHex === "string" ? row.colorHex.trim() : undefined,
      colorImage: typeof row?.colorImage === "string" ? row.colorImage.trim() : undefined,
      gaugeValue: String(row?.gaugeValue ?? "").trim(),
      gaugeLabel: typeof row?.gaugeLabel === "string" ? row.gaugeLabel.trim() : undefined,
      stock: Math.max(0, Number(row?.stock ?? 0) || 0),
      isSoldOut: row?.isSoldOut === true,
      showWhenSoldOut: row?.showWhenSoldOut ?? null,
    }))
    .filter((row: VariantInventoryRow) => row.colorValue && row.gaugeValue);
}

const isSellableVariant = (row: VariantInventoryRow) => row.isSoldOut !== true && row.stock > 0;
const isSoldOutVariant = (row: VariantInventoryRow) =>
  row.isSoldOut === true || Number(row.stock ?? 0) <= 0;
const isHiddenSoldOutVariant = (row: VariantInventoryRow) =>
  isSoldOutVariant(row) && row.showWhenSoldOut === false;
const isVisibleVariant = (row: VariantInventoryRow) => !isHiddenSoldOutVariant(row);
const getVariantsByColor = (product: SelectableStringProduct, colorValue: string) =>
  normalizeVariantRows(product).filter((row) => row.colorValue === colorValue);
const getVariantBySelection = (
  product: SelectableStringProduct,
  colorValue: string,
  gaugeValue: string,
) =>
  normalizeVariantRows(product).find(
    (row) => row.colorValue === colorValue && row.gaugeValue === gaugeValue,
  );
const getGaugeLabel = (row: GaugeInventoryRow) => {
  const raw = String(row.label || row.value || "").trim();
  return formatGaugeLabel(raw) || raw || "-";
};
const getColorLabel = (row: ColorInventoryRow) => {
  const raw = String(row.label || row.value || "").trim();
  return stringColorLabel(raw) || raw || "-";
};
const isColorSoldOut = (row: ColorInventoryRow) => row.isSoldOut === true || row.stock <= 0;

export default function SelectStringClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [selectedGaugeByProductId, setSelectedGaugeByProductId] = useState<Record<string, string>>(
    {},
  );
  const [selectedColorByProductId, setSelectedColorByProductId] = useState<Record<string, string>>(
    {},
  );
  const { products, isLoadingInitial, isFetchingMore, hasMore, loadMore, error } =
    useInfiniteProducts({ limit: 6, purpose: "stringing" });
  const mountableProducts = products.filter(
    (product) =>
      typeof (product as SelectableStringProduct).mountingFee === "number" &&
      Number((product as SelectableStringProduct).mountingFee) >= 0,
  );

  useEffect(() => {
    setSelectedColorByProductId((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const p of mountableProducts as SelectableStringProduct[]) {
        const variants = normalizeVariantRows(p);
        const hasVariantInventories = variants.length > 0;
        if (hasVariantInventories) {
          const visibleVariantRows = variants.filter(isVisibleVariant);
          const colorRows = normalizeColorRows(p);
          const visibleVariantColorValues = Array.from(
            new Set(visibleVariantRows.map((v) => v.colorValue).filter(Boolean)),
          );
          const visibleColorRows = colorRows.filter((row) =>
            visibleVariantColorValues.includes(row.value),
          );
          const visibleColorValueSet = new Set(visibleColorRows.map((row) => row.value));
          const variantOnlyVisibleColorRows = visibleVariantRows
            .filter(
              (variant) => variant.colorValue && !visibleColorValueSet.has(variant.colorValue),
            )
            .map((variant) => ({
              value: variant.colorValue,
              label: variant.colorLabel ?? variant.colorValue,
              colorHex: variant.colorHex,
              image: variant.colorImage,
            }));
          const dedupedVariantOnlyRows = Array.from(
            new Map(variantOnlyVisibleColorRows.map((row) => [row.value, row])).values(),
          );
          const effectiveColorRows = [...visibleColorRows, ...dedupedVariantOnlyRows];
          const current = next[p._id] ?? "";
          if (!effectiveColorRows.length) {
            if (current !== "") {
              next[p._id] = "";
              changed = true;
            }
            continue;
          }
          const hasSelectedVisibleColor = effectiveColorRows.some(
            (color) => color.value === current,
          );
          if (!hasSelectedVisibleColor) {
            next[p._id] = effectiveColorRows[0]?.value ?? "";
            changed = true;
          }
          continue;
        }

        if (next[p._id]) continue;
        const rows = normalizeColorRows(p);
        const first = rows.find((r) => !isColorSoldOut(r)) ?? rows[0];
        if (first?.value) {
          next[p._id] = first.value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [mountableProducts]);

  useEffect(() => {
    setSelectedGaugeByProductId((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const p of mountableProducts as SelectableStringProduct[]) {
        const variants = normalizeVariantRows(p);
        if (variants.length === 0) continue;
        const visibleVariantRows = variants.filter(isVisibleVariant);
        const color = selectedColorByProductId[p._id] ?? "";
        const variantsForSelectedColor = visibleVariantRows.filter(
          (row) => row.colorValue === color,
        );
        const current = next[p._id] ?? "";
        const keep = variantsForSelectedColor.some((row) => row.gaugeValue === current);
        const fallback =
          variantsForSelectedColor.find(isSellableVariant)?.gaugeValue ??
          variantsForSelectedColor[0]?.gaugeValue ??
          "";
        const result = keep ? current : fallback;
        if ((next[p._id] ?? "") !== result) {
          next[p._id] = result;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [mountableProducts, selectedColorByProductId]);

  const handleSelectString = async (
    product: SelectableStringProduct,
    selectedGauge?: string,
    selectedColor?: string,
  ) => {
    if (addingProductId) return;
    setAddingProductId(product._id);
    const normalizedGauge = String(selectedGauge ?? "").trim();
    const normalizedColor = String(selectedColor ?? "").trim();
    const colorRows = normalizeColorRows(product);
    const gaugeRows = normalizeGaugeRows(product);
    const variantRows = normalizeVariantRows(product);
    const hasVariantInventories = variantRows.length > 0;

    if (hasVariantInventories) {
      if (!normalizedColor) {
        showErrorToast("스트링 색상을 선택해주세요.");
        setAddingProductId(null);
        return;
      }
      if (!normalizedGauge) {
        showErrorToast("게이지(굵기)를 선택해주세요.");
        setAddingProductId(null);
        return;
      }
      const selectedVariant = getVariantBySelection(product, normalizedColor, normalizedGauge);
      if (!selectedVariant || !isVisibleVariant(selectedVariant)) {
        showErrorToast("선택한 색상/게이지(굵기) 조합을 찾을 수 없습니다.");
        setAddingProductId(null);
        return;
      }
      if (!isSellableVariant(selectedVariant)) {
        showErrorToast("선택한 색상/게이지(굵기) 조합은 품절되었습니다.");
        setAddingProductId(null);
        return;
      }
    } else {
      if (gaugeRows.length > 0 && !normalizedGauge) {
        showErrorToast("게이지(굵기)를 선택해주세요.");
        setAddingProductId(null);
        return;
      }
      if (colorRows.length > 0 && !normalizedColor) {
        showErrorToast("스트링 색상을 선택해주세요.");
        setAddingProductId(null);
        return;
      }
    }

    const params = new URLSearchParams();
    params.set("orderId", orderId);
    params.set("productId", product._id);
    if (normalizedGauge) params.set("selectedGauge", normalizedGauge);
    if (normalizedColor) params.set("selectedColor", normalizedColor);
    router.push(`/services/apply?${params.toString()}`);
    setAddingProductId(null);
  };

  if (isLoadingInitial)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  if (error)
    return (
      <ResultState
        status="error"
        title="스트링 목록을 불러오지 못했습니다"
        description={`잠시 후 다시 시도해주세요. ${error}`}
        className="rounded-2xl border border-border bg-card shadow-sm"
      />
    );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-ui-body font-semibold text-foreground">장착할 스트링 선택</h2>
            <p className="break-keep text-ui-body-sm text-muted-foreground">
              색상과 게이지(굵기)를 확인한 뒤 원하는 스트링으로 다음 단계에 진행하세요.
            </p>
          </div>
          <p className="text-ui-body-sm text-muted-foreground">
            총{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {mountableProducts.length}
            </span>
            개
          </p>
        </div>
      </div>
      {mountableProducts.length === 0 ? (
        <EmptyState
          icon={<Package className="h-10 w-10" />}
          title="선택 가능한 스트링이 없습니다"
          description="현재 장착 서비스로 선택할 수 있는 스트링 상품이 없습니다."
          className="rounded-2xl bg-card shadow-sm"
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mountableProducts.map((p: SelectableStringProduct) => {
          const variants = normalizeVariantRows(p);
          const hasVariantInventories = variants.length > 0;
          const visibleVariantRows = variants.filter(isVisibleVariant);
          const colorRows = normalizeColorRows(p);
          const visibleVariantColorValues = Array.from(
            new Set(visibleVariantRows.map((v) => v.colorValue).filter(Boolean)),
          );
          const visibleColorRows = colorRows.filter((row) =>
            visibleVariantColorValues.includes(row.value),
          );
          const visibleColorValueSet = new Set(visibleColorRows.map((row) => row.value));
          const variantOnlyVisibleColorRows = visibleVariantRows
            .filter(
              (variant) => variant.colorValue && !visibleColorValueSet.has(variant.colorValue),
            )
            .map((variant) => ({
              value: variant.colorValue,
              label: variant.colorLabel ?? variant.colorValue,
              colorHex: variant.colorHex,
              image: variant.colorImage,
              stock: variant.stock,
              isSoldOut: variant.isSoldOut,
            }));
          const dedupedVariantOnlyRows = Array.from(
            new Map(variantOnlyVisibleColorRows.map((row) => [row.value, row])).values(),
          );
          const effectiveColorRows = hasVariantInventories
            ? [...visibleColorRows, ...dedupedVariantOnlyRows]
            : colorRows;
          const selectedColor = selectedColorByProductId[p._id] ?? "";
          const gaugeRows = hasVariantInventories
            ? visibleVariantRows
                .filter((v) => v.colorValue === selectedColor)
                .map((v) => ({
                  value: v.gaugeValue,
                  label: v.gaugeLabel,
                  stock: v.stock,
                  isSoldOut: v.isSoldOut,
                }))
            : normalizeGaugeRows(p);
          const selectedGauge = selectedGaugeByProductId[p._id] ?? "";
          const selectedVariant = hasVariantInventories
            ? visibleVariantRows.find(
                (row) => row.colorValue === selectedColor && row.gaugeValue === selectedGauge,
              )
            : undefined;
          const variantBlocked =
            hasVariantInventories &&
            (!selectedColor ||
              !selectedGauge ||
              !selectedVariant ||
              !isSellableVariant(selectedVariant));
          const legacyColorBlocked =
            !hasVariantInventories && colorRows.length > 0 && !selectedColor;
          const legacyGaugeBlocked =
            !hasVariantInventories && gaugeRows.length > 0 && !selectedGauge;
          const disableSelectButton =
            !!addingProductId || variantBlocked || legacyColorBlocked || legacyGaugeBlocked;
          const selectedColorLabel =
            effectiveColorRows.find((row) => row.value === selectedColor)?.label ?? selectedColor;
          const selectedGaugeLabel =
            gaugeRows.find((row) => row.value === selectedGauge)?.label ?? selectedGauge;
          return (
            <div
              key={p._id}
              className="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/20"
            >
              <div className="space-y-1.5">
                <h3 className="line-clamp-2 break-keep text-ui-body font-semibold leading-tight text-foreground">
                  {p.name}
                </h3>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-ui-body-sm">
                  <span className="text-ui-label font-medium text-muted-foreground">스트링 금액</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {typeof p.price === "number"
                      ? `${p.price.toLocaleString()}원`
                      : "가격 정보 없음"}
                  </span>
                </div>
                {typeof p.mountingFee === "number" && (
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-ui-label text-muted-foreground">
                    <span>장착비</span>
                    <span className="tabular-nums">{p.mountingFee.toLocaleString()}원</span>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-ui-label font-medium">색상</div>
                  {selectedColor ? (
                    <div className="truncate text-ui-label text-muted-foreground">
                      {selectedColorLabel}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(hasVariantInventories
                    ? effectiveColorRows.map((colorRow) => {
                        const colorValue = colorRow.value;
                        const variantImage = visibleVariantRows.find(
                          (v) => v.colorValue === colorValue && v.colorImage,
                        )?.colorImage;
                        const image =
                          colorRow.image || variantImage || p.images?.[0] || PLACEHOLDER_IMAGE;
                        const sellable = visibleVariantRows.some(
                          (v) => v.colorValue === colorValue && isSellableVariant(v),
                        );
                        const label =
                          stringColorLabel(
                            colorRow.label ||
                              visibleVariantRows.find((v) => v.colorValue === colorValue)
                                ?.colorLabel ||
                              colorValue,
                          ) || colorValue;
                        const colorHex =
                          colorRow.colorHex ||
                          visibleVariantRows.find((v) => v.colorValue === colorValue)?.colorHex;
                        return {
                          value: colorValue,
                          label,
                          image,
                          colorHex,
                          disabled: !sellable,
                        };
                      })
                    : colorRows.map((row) => ({
                        value: row.value,
                        label: getColorLabel(row),
                        image: row.image || p.images?.[0] || PLACEHOLDER_IMAGE,
                        colorHex: row.colorHex,
                        disabled: isColorSoldOut(row),
                      }))
                  ).map((row) => (
                    <button
                      key={`${p._id}-${row.value}`}
                      type="button"
                      disabled={row.disabled}
                      onClick={() =>
                        setSelectedColorByProductId((prev) => ({
                          ...prev,
                          [p._id]: row.value,
                        }))
                      }
                      className={cn(
                        "flex min-h-9 max-w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 text-ui-label transition-colors",
                        selectedColor === row.value
                          ? "border-primary/40 bg-primary/5 text-foreground"
                          : "border-border bg-card hover:border-primary/50",
                        row.disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {row.image ? (
                        <img
                          src={row.image}
                          alt={row.label}
                          className="h-5 w-5 rounded object-cover"
                        />
                      ) : row.colorHex ? (
                        <span
                          className="h-4 w-4 rounded-full border"
                          style={{ backgroundColor: row.colorHex }}
                        />
                      ) : null}
                      <span>{row.label}</span>
                      {row.disabled ? <span className="text-destructive">품절</span> : null}
                    </button>
                  ))}
                </div>
              </div>
              {gaugeRows.length > 0 && (
                <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-ui-label font-medium">게이지(굵기)</div>
                    {selectedGauge ? (
                      <div className="truncate text-ui-label text-muted-foreground">
                        {selectedGaugeLabel}
                      </div>
                    ) : null}
                  </div>
                  <Select
                    value={selectedGauge}
                    onValueChange={(value) =>
                      setSelectedGaugeByProductId((prev) => ({
                        ...prev,
                        [p._id]: value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-10 w-full rounded-xl text-ui-label">
                      <SelectValue placeholder="게이지(굵기)를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {gaugeRows.map((row) => {
                        const soldOut = row.isSoldOut || row.stock <= 0;
                        const suffix = soldOut
                          ? " · 품절"
                          : p.inventory?.hideGaugeStock === true
                            ? ""
                            : ` · 재고 ${row.stock}개`;
                        return (
                          <SelectItem
                            key={`${p._id}-${row.value}`}
                            value={row.value}
                            disabled={soldOut}
                            className="text-ui-label"
                          >{`${getGaugeLabel(row)}${suffix}`}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="mt-3 rounded-xl border border-border bg-muted/20 px-3 py-2 text-ui-label text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>선택한 옵션</span>
                  <span className="min-w-0 truncate text-right text-foreground">
                    {[selectedColorLabel, selectedGaugeLabel].filter(Boolean).join(" · ") ||
                      "옵션 선택 필요"}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                className="mt-4 h-10 w-full rounded-xl break-keep"
                disabled={disableSelectButton}
                onClick={() => handleSelectString(p, selectedGauge, selectedColor)}
              >
                {addingProductId === p._id ? "이동 중…" : "이 스트링 선택하고 신청 계속하기"}
              </Button>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <Button
          type="button"
          variant="outline"
          onClick={loadMore}
          disabled={isFetchingMore || !!addingProductId}
          className="h-10 w-full rounded-xl"
        >
          {isFetchingMore ? (
            "로딩 중..."
          ) : (
            <span className="inline-flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />더 보기
            </span>
          )}
        </Button>
      )}
    </div>
  );
}
