"use client";

import type { CartItem } from "@/app/store/cartStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import {
  getColorLabel,
  getGaugeLabel,
  getVariantBySelection,
  getVariantsByColor,
  getVisibleColorRows,
  isSellableVariant,
  isSoldOutVariant,
  normalizeColorRows,
  normalizeGaugeRows,
  normalizeVariantRows,
} from "@/lib/products/string-stock";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const formatKRW = (n: number) => n.toLocaleString("ko-KR");
const PLACEHOLDER_IMAGE = "/placeholder.svg?height=96&width=96";

type ApplyOptionPayload = {
  selectedGauge?: string;
  selectedColor?: string;
  selectedColorLabel?: string;
  selectedColorHex?: string;
  selectedColorImage?: string;
  image?: string;
  stock?: number;
};
type Props = {
  open: boolean;
  item: CartItem | null;
  mountingFee?: number;
  onOpenChange: (open: boolean) => void;
  onApply: (item: CartItem, nextOption: ApplyOptionPayload) => void;
};

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return isMobile;
}

function CartOptionChangeContent({
  item,
  mountingFee = 0,
  onCancel,
  onApply,
}: {
  item: CartItem;
  mountingFee?: number;
  onCancel: () => void;
  onApply: Props["onApply"];
}) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(item.selectedColor ?? "");
  const [selectedGauge, setSelectedGauge] = useState(item.selectedGauge ?? "");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProduct(null);
    setSelectedColor(item.selectedColor ?? "");
    setSelectedGauge(item.selectedGauge ?? "");
    fetch(`/api/products/${item.id}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setProduct(json?.product ?? json ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("옵션 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item]);

  const optionState = useMemo(() => {
    if (!product)
      return {
        colorRows: [],
        gaugeRows: [],
        variantRows: [],
        selectedVariant: undefined,
        selectedColorRow: undefined,
        stock: item.stock,
      };
    const variantRows = normalizeVariantRows(product);
    const colorRows = getVisibleColorRows(product);
    const gaugeRows =
      selectedColor && variantRows.length > 0
        ? getVariantsByColor(product, selectedColor).map((row) => ({
            value: row.gaugeValue,
            label: row.gaugeLabel,
            stock: row.stock,
            isSoldOut: row.isSoldOut,
            showWhenSoldOut: row.showWhenSoldOut,
          }))
        : normalizeGaugeRows(product);
    const selectedVariant =
      selectedColor && selectedGauge
        ? getVariantBySelection(product, selectedColor, selectedGauge)
        : undefined;
    const selectedColorRow = [...colorRows, ...normalizeColorRows(product)].find(
      (row) => row.value === selectedColor,
    );
    const selectedGaugeRow = gaugeRows.find((row) => row.value === selectedGauge);
    const stock = selectedVariant
      ? Number(selectedVariant.stock ?? 0)
      : selectedGaugeRow
        ? Number(selectedGaugeRow.stock ?? 0)
        : selectedColorRow
          ? Number(selectedColorRow.stock ?? 0)
          : Number(product?.inventory?.stock ?? item.stock ?? 0);
    return {
      colorRows,
      gaugeRows,
      variantRows,
      selectedVariant,
      selectedColorRow,
      stock,
    };
  }, [product, selectedColor, selectedGauge, item.stock]);

  const { colorRows, gaugeRows, variantRows, selectedVariant, selectedColorRow, stock } =
    optionState;
  const hasColorOptions = colorRows.length > 0;
  const hasGaugeOptions = gaugeRows.length > 0;
  const isSoldOut =
    variantRows.length > 0 && selectedVariant
      ? isSoldOutVariant(selectedVariant)
      : Number(stock ?? 0) <= 0;
  const isApplyDisabled =
    loading ||
    !!error ||
    (hasColorOptions && !selectedColor) ||
    (hasGaugeOptions && !selectedGauge) ||
    (variantRows.length > 0 && (!selectedVariant || isSoldOut)) ||
    Number(stock ?? 0) < item.quantity;

  const handleApply = () => {
    if (!product) return;
    const optionImage = selectedVariant?.colorImage ?? selectedColorRow?.image;
    onApply(item, {
      selectedGauge: selectedGauge || undefined,
      selectedColor: selectedColor || undefined,
      selectedColorLabel:
        selectedVariant?.colorLabel ??
        (selectedColorRow ? getColorLabel(selectedColorRow) : undefined),
      selectedColorHex: selectedVariant?.colorHex ?? selectedColorRow?.colorHex,
      selectedColorImage: optionImage,
      image: optionImage ?? item.image ?? PLACEHOLDER_IMAGE,
      stock,
    });
  };

  return (
    <div className="flex max-h-[inherit] flex-col">
      <div className="space-y-5 px-5 pb-4 pt-5 bp-sm:px-6">
        <div className="flex gap-3 rounded-panel border border-border bg-muted/20 p-3">
          <Image
            src={item.image || PLACEHOLDER_IMAGE}
            alt={item.name}
            width={72}
            height={72}
            className="h-[72px] w-[72px] rounded-control border border-border object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-medium text-foreground">{item.name}</p>
            <p className="mt-1 text-ui-body-sm text-muted-foreground">
              판매가{" "}
              <span className="font-semibold text-foreground">{formatKRW(item.price)}원</span>
            </p>
            {mountingFee > 0 && (
              <p className="mt-0.5 text-ui-label text-muted-foreground">
                교체서비스 {formatKRW(mountingFee)}원 / 개
              </p>
            )}
          </div>
        </div>
        <div className="rounded-panel border border-border bg-muted/20 p-3 text-ui-body-sm text-muted-foreground">
          현재 옵션:{" "}
          {item.selectedGauge ? `게이지(굵기) ${formatGaugeLabel(item.selectedGauge)}` : ""}
          {item.selectedGauge && (item.selectedColorLabel || item.selectedColor) ? " · " : ""}
          {item.selectedColorLabel ||
            item.selectedColor ||
            (!item.selectedGauge ? "기본 옵션" : "")}
        </div>
        {loading && (
          <p className="text-ui-body-sm text-muted-foreground">옵션 정보를 불러오는 중...</p>
        )}
        {error && (
          <p className="rounded-lg bg-destructive/10 p-3 text-ui-body-sm text-destructive">
            {error}
          </p>
        )}
        {!loading && !error && product && (
          <>
            {hasColorOptions && (
              <section className="space-y-2">
                <h3 className="text-ui-body-sm font-semibold text-foreground">색상 선택</h3>
                <div className="flex flex-wrap gap-2">
                  {colorRows.map((row) => {
                    const variantsForColor = getVariantsByColor(product, row.value);
                    const hasSellableVariantForColor =
                      variantRows.length > 0
                        ? variantsForColor.some((variant) => isSellableVariant(variant))
                        : row.isSoldOut !== true && Number(row.stock ?? 0) > 0;
                    const isColorDisabled = !hasSellableVariantForColor;
                    return (
                      <Button
                        key={row.value}
                        type="button"
                        variant={selectedColor === row.value ? "highlight_soft" : "outline"}
                        size="sm"
                        className="h-9 rounded-control disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isColorDisabled}
                        onClick={() => {
                          setSelectedColor(row.value);
                          if (variantRows.length > 0 && row.value !== selectedColor)
                            setSelectedGauge("");
                        }}
                      >
                        {row.colorHex && (
                          <span
                            className="h-3 w-3 rounded-full border border-border/70"
                            style={{ backgroundColor: row.colorHex }}
                          />
                        )}
                        {getColorLabel(row)}
                        {isColorDisabled && <span className="ml-1 text-ui-micro">품절</span>}
                      </Button>
                    );
                  })}
                </div>
              </section>
            )}
            {hasGaugeOptions && (
              <section className="space-y-2">
                <h3 className="text-ui-body-sm font-semibold text-foreground">게이지(굵기) 선택</h3>
                <div className="flex flex-wrap gap-2">
                  {gaugeRows.map((row) => {
                    const disabled =
                      variantRows.length > 0
                        ? !isSellableVariant({
                            colorValue: selectedColor,
                            gaugeValue: row.value,
                            stock: row.stock,
                            isSoldOut: row.isSoldOut,
                          })
                        : row.isSoldOut === true || Number(row.stock ?? 0) <= 0;
                    return (
                      <Button
                        key={row.value}
                        type="button"
                        variant={selectedGauge === row.value ? "highlight_soft" : "outline"}
                        size="sm"
                        className="h-9 rounded-control disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={disabled}
                        onClick={() => setSelectedGauge(row.value)}
                      >
                        {getGaugeLabel(row)}
                        {disabled && <span className="ml-1 text-ui-micro">품절</span>}
                      </Button>
                    );
                  })}
                </div>
              </section>
            )}
            <div
              className={`rounded-xl p-3 text-ui-body-sm ${Number(stock ?? 0) < item.quantity || isSoldOut ? "bg-destructive/10 text-destructive" : "border border-border bg-muted/20 text-muted-foreground"}`}
            >
              선택 조합 재고: <span className="font-semibold">{Number(stock ?? 0)}개</span>
              {Number(stock ?? 0) < item.quantity && (
                <span className="block pt-1">
                  현재 장바구니 수량({item.quantity}개)보다 재고가 부족합니다.
                </span>
              )}
            </div>
          </>
        )}
      </div>
      <div className="sticky bottom-0 flex gap-2 border-t border-border bg-card p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          취소
        </Button>
        <Button type="button" className="flex-1" disabled={isApplyDisabled} onClick={handleApply}>
          변경 적용
        </Button>
      </div>
    </div>
  );
}

export default function CartOptionChangeOverlay({
  open,
  item,
  mountingFee,
  onOpenChange,
  onApply,
}: Props) {
  const isMobile = useIsMobileViewport();
  if (!item) return null;
  const content = (
    <CartOptionChangeContent
      item={item}
      mountingFee={mountingFee}
      onCancel={() => onOpenChange(false)}
      onApply={onApply}
    />
  );
  if (isMobile)
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          data-kakao-widget-hide="1"
          className="max-h-[88dvh] overflow-y-auto rounded-t-panel p-0"
        >
          <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          <div className="px-5 pb-1 pt-4">
            <h2 className="text-ui-card-title-lg font-semibold">옵션 변경</h2>
            <p className="mt-1 text-ui-body-sm text-muted-foreground">
              변경할 색상과 게이지(굵기)를 선택해주세요.
            </p>
          </div>
          {content}
        </SheetContent>
      </Sheet>
    );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-panel p-0">
        <DialogHeader className="px-6 pb-1 pt-6">
          <DialogTitle>옵션 변경</DialogTitle>
          <DialogDescription>변경할 색상과 게이지(굵기)를 선택해주세요.</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
