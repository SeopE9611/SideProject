"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { racketBrandLabel } from "@/lib/constants";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import { useInfiniteProducts } from "@/app/products/hooks/useInfiniteProducts";
import SiteContainer from "@/components/layout/SiteContainer";

import { CheckCircle2, ShoppingCart } from "lucide-react";

type RacketMini = {
  id: string;
  brand: string;
  model: string;
  condition: "A" | "B" | "C";
  image: string | null;
};

type GaugeInventoryRow = {
  value: string;
  label?: string;
  stock: number;
  isSoldOut: boolean;
  showWhenSoldOut?: boolean | null;
};

function normalizeGaugeRows(product: any): GaugeInventoryRow[] {
  if (Array.isArray(product?.gaugeInventories) && product.gaugeInventories.length > 0) {
    return product.gaugeInventories
      .map((row: any) => {
        const stockNumber = Number(row?.stock ?? 0);
        return {
          value: String(row?.value ?? "").trim(),
          label: typeof row?.label === "string" ? row.label.trim() : undefined,
          stock: Number.isFinite(stockNumber) && stockNumber > 0 ? stockNumber : 0,
          isSoldOut: row?.isSoldOut === true,
        showWhenSoldOut: row?.showWhenSoldOut === false ? false : true,
        };
      })
      .filter((row: GaugeInventoryRow) => row.value.length > 0);
  }
  if (Array.isArray(product?.gaugeOptions) && product.gaugeOptions.length > 0) {
    const fallbackStock = Number(product?.inventory?.stock ?? 0);
    const normalizedFallbackStock = Number.isFinite(fallbackStock) && fallbackStock > 0 ? fallbackStock : 0;
    return product.gaugeOptions
      .map((value: unknown) => String(value ?? "").trim())
      .filter(Boolean)
      .map((value: string) => ({ value, stock: normalizedFallbackStock, isSoldOut: false }));
  }
  return [];
}

function getGaugeLabel(row: GaugeInventoryRow) {
  const rawLabel = String(row.label ?? "").trim();
  return rawLabel || formatGaugeLabel(row.value);
}


type ColorInventoryRow = {
  value: string;
  label?: string;
  colorHex?: string;
  image?: string;
  stock: number;
  isSoldOut: boolean;
  showWhenSoldOut?: boolean | null;
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

function normalizeColorRows(product: any): ColorInventoryRow[] {
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
    const normalizedFallbackStock = Number.isFinite(fallbackStock) && fallbackStock > 0 ? fallbackStock : 0;
    return product.colorOptions
      .map((value: unknown) => String(value ?? "").trim())
      .filter(Boolean)
      .map((value: string) => ({ value, label: value, stock: normalizedFallbackStock, isSoldOut: false }));
  }
  if (typeof product?.color === "string" && product.color.trim()) {
    const fallbackStock = Number(product?.inventory?.stock ?? 0);
    const normalizedFallbackStock = Number.isFinite(fallbackStock) && fallbackStock > 0 ? fallbackStock : 0;
    return [{ value: product.color.trim(), label: product.color.trim(), stock: normalizedFallbackStock, isSoldOut: false }];
  }
  return [];
}

function getColorLabel(row: ColorInventoryRow) {
  return String(row.label || row.value || "").trim();
}

function isColorSoldOut(row: ColorInventoryRow) {
  return row.isSoldOut === true || Number(row.stock ?? 0) <= 0;
}

function normalizeVariantRows(product: any): VariantInventoryRow[] {
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

function isSellableVariant(row: VariantInventoryRow) {
  return row.isSoldOut !== true && Number(row.stock ?? 0) > 0;
}
function isSoldOutVariant(row: VariantInventoryRow) {
  return row.isSoldOut === true || Number(row.stock ?? 0) <= 0;
}
function isVisibleVariant(row: VariantInventoryRow) {
  return !(isSoldOutVariant(row) && row.showWhenSoldOut === false);
}

function getVariantsByColor(product: any, colorValue: string) {
  return normalizeVariantRows(product).filter((row) => row.colorValue === colorValue && isVisibleVariant(row));
}
function getVisibleColorRows(product: any): ColorInventoryRow[] {
  const colorRows = normalizeColorRows(product);
  const variants = normalizeVariantRows(product);
  if (!variants.length) return colorRows;
  const visibleVariants = variants.filter(isVisibleVariant);
  const visibleColorValues = new Set(visibleVariants.map((v) => v.colorValue).filter(Boolean));
  const baseRows = colorRows.filter((row) => visibleColorValues.has(row.value));
  const known = new Set(baseRows.map((row) => row.value));
  visibleVariants.forEach((v) => {
    if (!v.colorValue || known.has(v.colorValue)) return;
    baseRows.push({
      value: v.colorValue,
      label: v.colorLabel ?? v.colorValue,
      colorHex: v.colorHex ?? undefined,
      image: v.colorImage ?? undefined,
      stock: Number(v.stock ?? 0),
      isSoldOut: v.isSoldOut === true,
      showWhenSoldOut: v.showWhenSoldOut,
    });
    known.add(v.colorValue);
  });
  return baseRows;
}

function getVariantBySelection(product: any, colorValue: string, gaugeValue: string) {
  return normalizeVariantRows(product).find(
    (row) => row.colorValue === colorValue && row.gaugeValue === gaugeValue,
  );
}

export default function RentalSelectStringClient({
  racket,
  period,
}: {
  racket: RacketMini;
  period: 7 | 15 | 30;
}) {
  const router = useRouter();
  const [selectedGaugeByStringId, setSelectedGaugeByStringId] = useState<Record<string, string>>({});
  const [selectedColorByStringId, setSelectedColorByStringId] = useState<Record<string, string>>({});

  const { products, isLoadingInitial, isFetchingMore, hasMore, loadMore } =
    useInfiniteProducts({
      limit: 6,
      purpose: "stringing",
    });

  const title = useMemo(() => {
    const brand = racketBrandLabel(racket.brand) ?? racket.brand;
    const condition = racket.condition ? `상태 ${racket.condition}` : "";
    return `${brand} ${racket.model}${condition ? ` · ${condition}` : ""}`;
  }, [racket.brand, racket.model, racket.condition]);

  useEffect(() => {
    setSelectedColorByStringId((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const product of products ?? []) {
        const id = String((product as any)?._id ?? "");
        if (!id || next[id]) continue;
        const hasVariantInventories =
          Array.isArray((product as any)?.variantInventories) &&
          (product as any).variantInventories.length > 0;
        const firstAvailable = hasVariantInventories
          ? (() => {
              const variantRows = normalizeVariantRows(product).filter(isVisibleVariant);
              if (variantRows.length <= 0) return null;
              const firstSellable = variantRows.find((row) => isSellableVariant(row)) ?? variantRows[0];
              return firstSellable ? { value: firstSellable.colorValue } : null;
            })()
          : (() => {
              const colorRows = getVisibleColorRows(product);
              if (colorRows.length <= 0) return null;
              return colorRows.find((row) => !isColorSoldOut(row)) ?? colorRows[0];
            })();
        if (firstAvailable?.value) {
          next[id] = firstAvailable.value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [products]);

  useEffect(() => {
    setSelectedGaugeByStringId((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const product of products ?? []) {
        const id = String((product as any)?._id ?? "");
        if (!id) continue;
        const currentColor = selectedColorByStringId[id] ?? "";
        const hasVariantInventories =
          Array.isArray((product as any)?.variantInventories) &&
          (product as any).variantInventories.length > 0;
        if (hasVariantInventories) {
          const currentGauge = next[id] ?? "";
          const currentVariant = getVariantBySelection(product, currentColor, currentGauge);
          if (currentGauge && currentVariant && isSellableVariant(currentVariant)) continue;
          const visibleRows = getVariantsByColor(product, currentColor);
          const firstSellable = visibleRows.find((row) => isSellableVariant(row));
          const nextGauge = firstSellable?.gaugeValue ?? visibleRows[0]?.gaugeValue ?? "";
          if ((next[id] ?? "") !== nextGauge) {
            next[id] = nextGauge;
            changed = true;
          }
          continue;
        }
        const gaugeRows = normalizeGaugeRows(product);
        if (gaugeRows.length <= 0) continue;
        if (next[id]) continue;
        const firstAvailable = gaugeRows.find((row) => !row.isSoldOut && row.stock > 0) ?? gaugeRows[0];
        if (firstAvailable?.value) {
          next[id] = firstAvailable.value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [products, selectedColorByStringId]);

  const goCheckout = (stringId?: string, selectedGauge?: string, selectedColor?: string) => {
    const base = `/rentals/${encodeURIComponent(racket.id)}/checkout?period=${period}`;
    const params = new URLSearchParams(`period=${period}`);
    if (stringId) params.set("stringId", stringId);
    if (selectedGauge) params.set("selectedGauge", selectedGauge);
    if (selectedColor) params.set("selectedColor", selectedColor);
    const url = `/rentals/${encodeURIComponent(racket.id)}/checkout?${params.toString()}`;
    router.push(url);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteContainer
        variant="wide"
        className="py-8 bp-md:py-12 space-y-8 bp-md:space-y-10"
      >
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="break-keep text-2xl font-bold leading-tight tracking-normal text-foreground bp-md:text-4xl">
            스트링 선택
          </h1>
          <p className="break-keep text-sm leading-relaxed text-muted-foreground bp-md:text-base">
            대여 라켓에 장착할 스트링을 선택해주세요. 선택한 스트링은 대여
            결제에 포함됩니다.
          </p>
        </div>

        {/* Selected Racket Summary (구매 select-string과 동일 골격) */}
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-muted/30 rounded-full blur-3xl opacity-50 -z-0" />

            <div className="relative z-10 p-4 bp-md:p-6 flex gap-4 bp-md:gap-6 items-center">
              <div className="flex-shrink-0">
                {racket.image ? (
                  <img
                    src={racket.image || "/placeholder.svg"}
                    alt={title}
                    className="w-20 h-20 bp-md:w-24 bp-md:h-24 object-cover rounded-xl shadow-md ring-2 ring-border/60"
                  />
                ) : (
                  <div className="w-20 h-20 bp-md:w-24 bp-md:h-24 rounded-xl bg-muted/30 flex items-center justify-center shadow-md">
                    <ShoppingCart className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-success mb-1">
                      선택된 라켓 (대여)
                    </p>
                    <h3 className="mb-1 line-clamp-2 break-keep text-xl font-bold leading-snug text-foreground">
                      {title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      대여 기간:{" "}
                      <span className="font-semibold text-foreground">
                        {period}일
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Skip CTA (대여 전용) */}
              <div className="hidden bp-md:block flex-shrink-0">
                <Button
                  variant="outline"
                  className="h-11 whitespace-nowrap"
                  onClick={() => goCheckout()}
                >
                  스트링 없이 결제하기
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Skip CTA */}
          <div className="bp-md:hidden flex justify-center">
            <Button
              variant="outline"
              className="h-11 w-full max-w-xs whitespace-nowrap"
              onClick={() => goCheckout()}
            >
              스트링 없이 결제하기
            </Button>
          </div>
        </div>

        {/* Strings */}
        <div className="space-y-6">
          <h2 className="break-keep text-center text-2xl font-bold leading-tight text-foreground">
            사용 가능한 스트링
          </h2>

          {isLoadingInitial ? (
            <div className="grid grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 gap-4 bp-md:gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card p-5 space-y-4"
                >
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : (products ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
              <p className="text-base font-semibold text-foreground">사용 가능한 스트링이 없습니다.</p>
              <p className="mt-2 break-keep text-sm text-muted-foreground">스트링 상품의 장착 서비스 설정을 확인해주세요.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/services/apply">교체서비스 신청 화면으로 돌아가기</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 gap-4 bp-md:gap-6">
              {(products ?? []).map((p: any) => {
                const stringImage = p?.images?.[0] ?? p?.imageUrl;
                const id = String(p?._id ?? "");
                const hasVariantInventories =
                  Array.isArray(p?.variantInventories) &&
                  p.variantInventories.length > 0;
                const colorRows = hasVariantInventories ? getVisibleColorRows(p) : normalizeColorRows(p);
                const variantRows = hasVariantInventories ? normalizeVariantRows(p) : [];
                const variantColorValues = hasVariantInventories
                  ? Array.from(new Set(variantRows.map((row) => row.colorValue)))
                  : [];
                const selectedColor = selectedColorByStringId[id] ?? "";
                const selectedColorRow = colorRows.find((row) => row.value === selectedColor) ?? null;
                const variantsForSelectedColor = hasVariantInventories
                  ? getVariantsByColor(p, selectedColor)
                  : [];
                const selectedGauge = selectedGaugeByStringId[id] ?? "";
                const selectedVariant = hasVariantInventories
                  ? getVariantBySelection(p, selectedColor, selectedGauge) ?? null
                  : null;
                const gaugeRows = hasVariantInventories
                  ? variantsForSelectedColor.map((row) => ({
                      value: row.gaugeValue,
                      label: row.gaugeLabel,
                      stock: row.stock,
                      isSoldOut: row.isSoldOut,
                    }))
                  : normalizeGaugeRows(p);
                const selectedGaugeRow = gaugeRows.find((row) => row.value === selectedGauge) ?? null;
                const hideGaugeStock = p?.inventory?.hideGaugeStock === true;
                const isColorRequired = colorRows.length > 0;
                const selectedColorSellableInVariant = hasVariantInventories
                  ? variantRows.some(
                      (row) => row.colorValue === selectedColor && isSellableVariant(row),
                    )
                  : false;
                const isColorOut = hasVariantInventories
                  ? !selectedColorSellableInVariant
                  : selectedColorRow
                    ? isColorSoldOut(selectedColorRow)
                    : false;
                const hasColorStockIssue = selectedColorRow ? selectedColorRow.stock < 1 : false;
                const isGaugeRequired = gaugeRows.length > 0;
                const isGaugeSoldOut = selectedGaugeRow ? selectedGaugeRow.isSoldOut || selectedGaugeRow.stock <= 0 : false;
                const hasGaugeStockIssue = selectedGaugeRow ? selectedGaugeRow.stock < 1 : false;

                return (
                  <div
                    key={id}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/30 hover:bg-muted/30 hover:shadow-md"
                  >
                    <div className="p-5 flex flex-col h-full">
                      {/* String Image */}
                      <div className="mb-4 rounded-xl overflow-hidden bg-muted/30 aspect-square flex items-center justify-center">
                        {stringImage ? (
                          <img
                            src={stringImage || "/placeholder.svg"}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                            이미지 없음
                          </div>
                        )}
                      </div>

                      {/* String Info */}
                      <div className="flex-1">
                        <h3 className="mb-2 line-clamp-2 break-keep text-lg font-semibold leading-snug text-foreground">
                          {p.name}
                        </h3>
                        {p.shortDescription ? (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {p.shortDescription}
                          </p>
                        ) : null}
                        <p className="whitespace-nowrap tabular-nums text-xl font-bold text-foreground">
                          {Number(p.price ?? 0).toLocaleString()}원
                        </p>

                        {isGaugeRequired ? (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm font-medium text-foreground">게이지 선택</p>
                            <Select
                              value={selectedGauge}
                              onValueChange={(value) =>
                                setSelectedGaugeByStringId((prev) => ({ ...prev, [id]: value }))
                              }
                            >
                              <SelectTrigger className="w-full [&>span]:truncate">
                                <SelectValue placeholder="게이지를 선택해주세요" />
                              </SelectTrigger>
                              <SelectContent>
                                {gaugeRows.map((row) => {
                                  const soldOut = row.isSoldOut || row.stock <= 0;
                                  const stockSuffix = soldOut
                                    ? " · 품절"
                                    : hideGaugeStock
                                      ? ""
                                      : ` · 재고 ${row.stock}개`;
                                  return (
                                    <SelectItem key={row.value} value={row.value} disabled={soldOut}>
                                      {`${getGaugeLabel(row)}${stockSuffix}`}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                      </div>


                        {colorRows.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm font-medium text-foreground">색상 선택</p>
                            {colorRows.length === 1 ? (
                              <p className="text-sm text-muted-foreground">색상: {getColorLabel(colorRows[0])}</p>
                            ) : (
                              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                                {colorRows.map((row) => {
                                  const variantFallbackImage = hasVariantInventories
                                    ? variantRows.find(
                                        (variantRow) =>
                                          variantRow.colorValue === row.value &&
                                          variantRow.colorImage,
                                      )?.colorImage
                                    : undefined;
                                  const colorImage =
                                    row.image ||
                                    variantFallbackImage ||
                                    p?.images?.[0] ||
                                    "/placeholder.svg";
                                  const soldOut = hasVariantInventories
                                    ? !variantRows.some(
                                        (variantRow) =>
                                          variantRow.colorValue === row.value &&
                                          isSellableVariant(variantRow),
                                      )
                                    : isColorSoldOut(row);
                                  const selected = selectedColor === row.value;
                                  return (
                                    <button
                                      key={row.value}
                                      type="button"
                                      disabled={soldOut}
                                      onClick={() => setSelectedColorByStringId((prev) => ({ ...prev, [id]: row.value }))}
                                      className={`inline-flex max-w-[9rem] shrink-0 items-center gap-2 truncate whitespace-nowrap rounded-lg border px-3 py-2 text-xs transition ${selected ? "border-primary ring-2 ring-primary/40" : "border-border"} ${soldOut ? "opacity-50 cursor-not-allowed" : "hover:border-primary/60"}`}
                                    >
                                      {colorImage ? <img src={colorImage} alt={getColorLabel(row)} className="h-5 w-5 rounded object-cover" /> : row.colorHex ? <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: row.colorHex }} /> : null}
                                      <span>{getColorLabel(row)}</span>
                                      {soldOut ? <span>품절</span> : null}
                                    </button>
                                  );
                                })}
                                {hasVariantInventories
                                  ? variantColorValues
                                      .filter((value) => !colorRows.some((row) => row.value === value))
                                      .map((value) => {
                                        const fallbackVariant = variantRows.find((row) => row.colorValue === value);
                                        if (!fallbackVariant) return null;
                                        const soldOut = !variantRows.some(
                                          (variantRow) =>
                                            variantRow.colorValue === value &&
                                            isSellableVariant(variantRow),
                                        );
                                        const selected = selectedColor === value;
                                        const colorImage =
                                          fallbackVariant.colorImage ||
                                          p?.images?.[0] ||
                                          "/placeholder.svg";
                                        const colorLabel = fallbackVariant.colorLabel || value;
                                        return (
                                          <button
                                            key={value}
                                            type="button"
                                            disabled={soldOut}
                                            onClick={() => setSelectedColorByStringId((prev) => ({ ...prev, [id]: value }))}
                                            className={`inline-flex max-w-[9rem] shrink-0 items-center gap-2 truncate whitespace-nowrap rounded-lg border px-3 py-2 text-xs transition ${selected ? "border-primary ring-2 ring-primary/40" : "border-border"} ${soldOut ? "opacity-50 cursor-not-allowed" : "hover:border-primary/60"}`}
                                          >
                                            <img src={colorImage} alt={colorLabel} className="h-5 w-5 rounded object-cover" />
                                            <span>{colorLabel}</span>
                                            {soldOut ? <span>품절</span> : null}
                                          </button>
                                        );
                                      })
                                  : null}
                              </div>
                            )}
                          </div>
                        ) : null}

                      {/* Select Button */}
                      <Button
                        className="mt-4 w-full whitespace-nowrap bg-primary py-5 font-medium text-primary-foreground transition-[background-color,box-shadow] duration-200 hover:bg-primary/90"
                        disabled={(isGaugeRequired && (!selectedGauge || isGaugeSoldOut || hasGaugeStockIssue)) || (isColorRequired && (!selectedColor || isColorOut || hasColorStockIssue))}
                        onClick={() => {
                          if (hasVariantInventories && !selectedColor) return alert("색상을 선택해주세요.");
                          if (hasVariantInventories && !selectedGauge) return alert("게이지를 선택해주세요.");
                          if (hasVariantInventories && (!selectedVariant || selectedVariant.colorValue !== selectedColor || selectedVariant.gaugeValue !== selectedGauge)) {
                            return alert("선택한 색상/게이지 조합을 찾을 수 없습니다.");
                          }
                          if (hasVariantInventories && selectedVariant && !isSellableVariant(selectedVariant)) {
                            return alert("선택한 색상/게이지 조합은 품절되었습니다.");
                          }
                          if (isGaugeRequired && !selectedGauge) return alert("게이지를 선택해주세요.");
                          if (isGaugeSoldOut) return alert("선택한 게이지는 현재 품절입니다.");
                          if (hasGaugeStockIssue) return alert("선택한 게이지의 구매 가능 수량을 초과했습니다.");
                          if (isColorRequired && !selectedColor) return alert("색상을 선택해주세요.");
                          if (isColorRequired && !selectedColorRow) return alert("선택한 색상 정보를 찾을 수 없습니다.");
                          if (isColorOut) return alert("선택한 색상은 현재 품절입니다.");
                          if (hasColorStockIssue) return alert("선택한 색상의 구매 가능 수량을 초과했습니다.");
                          if (hasVariantInventories && selectedVariant) {
                            const selectedColorLabel = selectedVariant.colorLabel ?? selectedColorRow?.label ?? selectedColor;
                            const selectedColorHex = selectedVariant.colorHex ?? selectedColorRow?.colorHex ?? "";
                            const selectedColorImage =
                              selectedVariant.colorImage ??
                              selectedColorRow?.image ??
                              p?.images?.[0] ??
                              "";
                            const selectedGaugeLabel =
                              selectedVariant.gaugeLabel ??
                              selectedGaugeRow?.label ??
                              getGaugeLabel(selectedGaugeRow ?? { value: selectedGauge, stock: 0, isSoldOut: false });
                            const params = new URLSearchParams(`period=${period}`);
                            params.set("stringId", id);
                            params.set("selectedGauge", selectedGauge);
                            params.set("selectedColor", selectedColor);
                            if (selectedColorLabel) params.set("selectedColorLabel", selectedColorLabel);
                            if (selectedColorHex) params.set("selectedColorHex", selectedColorHex);
                            if (selectedColorImage) params.set("selectedColorImage", selectedColorImage);
                            if (selectedGaugeLabel) params.set("selectedGaugeLabel", selectedGaugeLabel);
                            router.push(`/rentals/${encodeURIComponent(racket.id)}/checkout?${params.toString()}`);
                            return;
                          }
                          goCheckout(id, selectedGauge || undefined, selectedColor || undefined);
                        }}
                      >
                        <span className="flex items-center justify-center gap-2">
                          대여 계속하기
                          <svg
                            className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </span>
                      </Button>
                      <p className="mt-2 px-1 text-center text-xs leading-relaxed text-muted-foreground break-keep">
                        선택 후 장착 정보 입력 단계로 이어집니다.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                className="mx-auto h-11 w-full max-w-xs whitespace-nowrap border-border hover:bg-muted/60"
                onClick={loadMore}
                disabled={isFetchingMore}
              >
                {isFetchingMore ? (
                  <span className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    더 보기
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                )}
              </Button>
            </div>
          )}

          {!hasMore && (products ?? []).length > 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              마지막 상품입니다
            </p>
          ) : null}
        </div>
      </SiteContainer>
    </div>
  );
}
