"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInfiniteProducts } from "@/app/products/hooks/useInfiniteProducts";
import { usePdpBundleStore } from "@/app/store/pdpBundleStore";
import { useCartStore } from "@/app/store/cartStore";
import { CheckCircle2, Minus, Plus, ShoppingCart } from "lucide-react";
import SiteContainer from "@/components/layout/SiteContainer";
import { Input } from "@/components/ui/input";
import { stringColorLabel } from "@/lib/constants";
import { badgeToneClass } from "@/lib/badge-style";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type RacketMini = {
  id: string;
  name: string;
  price: number;
  regularPrice?: number;
  salePrice?: number;
  discountRate?: number;
  image?: string;
  status?: string;
  maxQty?: number;
};

type GaugeInventoryRow = {
  value: string;
  label?: string;
  stock: number;
  isSoldOut: boolean;
  showWhenSoldOut?: boolean | null;
};

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

function normalizeGaugeRows(product: any): GaugeInventoryRow[] {
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

function getGaugeLabel(row: GaugeInventoryRow) {
  const raw = String(row.label || row.value || "").trim();
  return formatGaugeLabel(raw) || raw || "-";
}

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

function getColorLabel(row: ColorInventoryRow) {
  const raw = String(row.label || row.value || "").trim();
  return stringColorLabel(raw) || raw || "-";
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

function getVariantBySelection(product: any, colorValue: string, gaugeValue: string) {
  return normalizeVariantRows(product).find(
    (row) => row.colorValue === colorValue && row.gaugeValue === gaugeValue,
  );
}

export default function RacketSelectStringClient({
  racket,
}: {
  racket: RacketMini;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // cart에서 들어왔는지
  const from = searchParams.get("from");
  const isFromCart = from === "cart";

  // cart 편집 모드일 때: 기존 선택 값
  const initialQtyParam = Number(searchParams.get("qty") ?? 1);
  const initialStringId = searchParams.get("stringId"); // cart에 있던 “번들 스트링” id
  const initialSelectedGauge = searchParams.get("selectedGauge") ?? "";
  const initialSelectedColor = searchParams.get("selectedColor") ?? "";
  const returnTo = searchParams.get("returnTo") ?? "/cart";

  // buy-now 모드에서만 사용하는 store
  const setItems = usePdpBundleStore((s) => s.setItems);
  const clearBundle = usePdpBundleStore((s) => s.clear);

  // cart 편집 모드에서 사용하는 store
  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  /**
   * "번들 수량" = 라켓 구매 수량 = 스트링 구매 수량
   * - 이 값만큼 라켓/스트링이 동일 수량으로 체크아웃(또는 카트)에 담김.
   * - STEP2 라인도 이 수량 기준으로 자동 생성.
   * - 수량 변경은 이 화면에서만 하도록 UX를 묶는 것이 전제.
   */
  const [workCount, setWorkCount] = useState<number>(1);
  const [selectedGaugeByStringId, setSelectedGaugeByStringId] = useState<Record<string, string>>({});
  const [selectedColorByStringId, setSelectedColorByStringId] = useState<Record<string, string>>({});

  const clampWorkCount = (v: number, stringStock?: number) => {
    if (!Number.isFinite(v)) return 1;

    const racketMax =
      Number.isFinite(racket.maxQty) && (racket.maxQty as number) > 0
        ? (racket.maxQty as number)
        : 1;
    const stockMax =
      Number.isFinite(stringStock) && (stringStock as number) > 0
        ? (stringStock as number)
        : Infinity;
    const max = Math.min(racketMax, stockMax);

    return Math.max(1, Math.min(max, Math.trunc(v)));
  };

  // 초기 workCount 세팅: cart에서 넘어온 qty를 그대로 반영
  useEffect(() => {
    setWorkCount(clampWorkCount(initialQtyParam));
  }, [initialQtyParam, racket.maxQty]);

  // buy-now 모드에서만 bundle store clear (cart 편집 모드에서는 굳이 건드리지 않음)
  useEffect(() => {
    if (!isFromCart) clearBundle();
  }, [clearBundle, isFromCart]);

  const { products, isLoadingInitial, isFetchingMore, hasMore, loadMore } =
    useInfiniteProducts({
      limit: 6,
      purpose: "stringing", // 교체 서비스에 사용되는 "스트링"만
    });

  // cart 편집 모드에서: “현재 선택된 스트링” 표시용
  const selectedStringIdForHighlight = useMemo(
    () => (isFromCart ? initialStringId : null),
    [isFromCart, initialStringId],
  );

  useEffect(() => {
    if (!isFromCart || !initialStringId || !initialSelectedGauge || products.length === 0) return;
    const target = products.find((item: any) => String(item?._id) === initialStringId);
    if (!target) return;
    const hasGauge = normalizeGaugeRows(target).some((row) => row.value === initialSelectedGauge);
    if (!hasGauge) return;
    setSelectedGaugeByStringId((prev) =>
      prev[initialStringId] === initialSelectedGauge
        ? prev
        : { ...prev, [initialStringId]: initialSelectedGauge },
    );
  }, [initialSelectedGauge, initialStringId, isFromCart, products]);

  useEffect(() => {
    if (!products.length) return;
    setSelectedColorByStringId((prev) => {
      const next = { ...prev };
      let changed = false;
      products.forEach((product: any) => {
        const colorRows = getVisibleColorRows(product);
        if (!colorRows.length) return;
        const stringId = String(product?._id);
        if (next[stringId]) return;
        const firstAvailable = colorRows.find((row) => !isColorSoldOut(row)) ?? colorRows[0];
        if (firstAvailable?.value) {
          next[stringId] = firstAvailable.value;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [products]);

  useEffect(() => {
    if (!products.length) return;
    setSelectedGaugeByStringId((prev) => {
      const next = { ...prev };
      let changed = false;
      products.forEach((product: any) => {
        const stringId = String(product?._id);
        const hasVariantInventories =
          Array.isArray(product?.variantInventories) && product.variantInventories.length > 0;
        if (!hasVariantInventories) return;
        const colorValue = selectedColorByStringId[stringId];
        if (!colorValue) return;
        const variantsForColor = getVariantsByColor(product, colorValue);
        const keepCurrent = variantsForColor.some((row) => row.gaugeValue === next[stringId]);
        if (keepCurrent) return;
        const firstSellable = variantsForColor.find((row) => isSellableVariant(row));
        const nextGauge = firstSellable?.gaugeValue ?? variantsForColor[0]?.gaugeValue ?? "";
        if ((next[stringId] ?? "") !== nextGauge) {
          next[stringId] = nextGauge;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [products, selectedColorByStringId]);

  useEffect(() => {
    if (!isFromCart || !initialStringId || !initialSelectedColor || products.length === 0) return;
    const target = products.find((item: any) => String(item?._id) === initialStringId);
    if (!target) return;
    const hasColor = normalizeColorRows(target).some((row) => row.value === initialSelectedColor);
    if (!hasColor) return;
    setSelectedColorByStringId((prev) =>
      prev[initialStringId] === initialSelectedColor
        ? prev
        : { ...prev, [initialStringId]: initialSelectedColor },
    );
  }, [initialSelectedColor, initialStringId, isFromCart, products]);

  /**
   * cartStore에 "라켓 + 스트링" 번들을 동일 수량으로 반영
   * - 라켓 라인은 없으면 add, 있으면 updateQuantity
   * - 스트링 라인은 (cart 편집 모드인 경우) 기존 stringId가 있으면 교체 처리
   */
  const upsertCartBundle = (selectedString: any, qty: number, selectedGauge?: string, selectedColor?: string) => {
    const newStringId = String(selectedString?._id);
    const hasVariantInventories =
      Array.isArray(selectedString?.variantInventories) &&
      selectedString.variantInventories.length > 0;
    const selectedVariant = hasVariantInventories
      ? getVariantBySelection(selectedString, selectedColor ?? "", selectedGauge ?? "")
      : undefined;
    const colorRows = normalizeColorRows(selectedString);
    const selectedColorRow = colorRows.find((row) => row.value === selectedColor);
    const selectedColorPayload =
      selectedColor
        ? {
            selectedColor,
            selectedColorLabel:
              selectedVariant?.colorLabel || (selectedColorRow ? getColorLabel(selectedColorRow) : selectedColor),
            selectedColorHex: selectedVariant?.colorHex || selectedColorRow?.colorHex,
            selectedColorImage:
              selectedVariant?.colorImage ||
              selectedColorRow?.image ||
              selectedString?.images?.[0] ||
              selectedString?.imageUrl,
          }
        : {};
    const selectedStringImage =
      selectedVariant?.colorImage?.trim() ||
      selectedColorRow?.image?.trim() ||
      selectedString?.images?.[0] ||
      selectedString?.imageUrl;

    // 1) 라켓 라인: 없으면 add, 있으면 수량 update
    const hasRacket = cartItems.some(
      (it) => it.id === racket.id && (it.kind ?? "product") === "racket",
    );
    if (!hasRacket) {
      addItem({
        id: racket.id,
        name: racket.name,
        price: racket.price,
        quantity: qty,
        image: racket.image,
        kind: "racket",
        stock: racket.maxQty, // maxQty를 재고 상한으로 활용 (없으면 undefined)
      });
    } else {
      removeItem(racket.id);
      addItem({
        id: racket.id,
        name: racket.name,
        price: racket.price,
        quantity: qty,
        image: racket.image,
        kind: "racket",
        stock: racket.maxQty,
      });
    }

    // 2) 스트링 라인: cart 편집 모드(from=cart)에서만 “기존 스트링 교체”를 명시적으로 처리
    // - 같은 스트링이면 updateQuantity
    // - 다른 스트링이면 기존 제거 후 새로 add(또는 기존에 있으면 update)
    if (
      initialStringId &&
      (initialStringId !== newStringId ||
        (initialSelectedGauge || "") !== (selectedGauge || "") ||
        (initialSelectedColor || "") !== (selectedColor || ""))
    ) {
      removeItem(
        initialStringId,
        initialSelectedGauge || undefined,
        initialSelectedColor || undefined,
      );
    }

    const hasNewString = cartItems.some(
      (it) =>
        it.id === newStringId &&
        (it.kind ?? "product") === "product" &&
        (it.selectedGauge ?? "") === (selectedGauge ?? "") &&
        (it.selectedColor ?? "") === (selectedColor ?? ""),
    );

    if (hasNewString) {
      updateQuantity(newStringId, qty, selectedGauge || undefined, selectedColor || undefined);
    } else {
      const gaugeRows = normalizeGaugeRows(selectedString);
      const selectedGaugeRow = gaugeRows.find((row) => row.value === selectedGauge);
      const stringManageStock = Boolean(selectedString?.inventory?.manageStock);
      const baseStock =
        stringManageStock && typeof selectedString?.inventory?.stock === "number"
          ? selectedString.inventory.stock
          : undefined;
      const effectiveStringStock = hasVariantInventories
        ? selectedVariant?.stock
        : selectedGaugeRow
          ? selectedGaugeRow.stock
          : baseStock;
      addItem({
        id: newStringId,
        name: selectedString?.name ?? "스트링",
        price: Number(selectedString?.price ?? 0),
        quantity: qty,
        image: selectedStringImage,
        kind: "product",
        stock: effectiveStringStock,
        selectedGauge: selectedGauge || undefined,
        ...selectedColorPayload,
      });
    }
  };

  /**
   * 기존 정책:
   * - from=cart면: cartStore를 직접 수정하고 returnTo로 복귀
   * - from!=cart면: pdpBundleStore로 buy-now checkout 이동
   */
  const handleSelectString = (p: any, selectedGauge?: string, selectedColor?: string) => {
    const hasVariantInventories =
      Array.isArray(p?.variantInventories) && p.variantInventories.length > 0;
    const selectedVariant = hasVariantInventories
      ? getVariantBySelection(p, selectedColor ?? "", selectedGauge ?? "")
      : undefined;
    const gaugeRows = normalizeGaugeRows(p);
    const hasGaugeRows = gaugeRows.length > 0;
    const selectedGaugeRow = gaugeRows.find((row) => row.value === selectedGauge);
    const hideGaugeStock = p?.inventory?.hideGaugeStock === true;

    if (!hasVariantInventories && hasGaugeRows && !selectedGauge) {
      showErrorToast?.("게이지를 선택해주세요.");
      return;
    }
    if (!hasVariantInventories && hasGaugeRows && !selectedGaugeRow) {
      showErrorToast?.("선택한 게이지 정보를 찾을 수 없습니다.");
      return;
    }
    if (!hasVariantInventories && selectedGaugeRow && (selectedGaugeRow.isSoldOut || selectedGaugeRow.stock <= 0)) {
      showErrorToast?.("선택한 게이지는 품절입니다.");
      return;
    }
    if (!hasVariantInventories && selectedGaugeRow && selectedGaugeRow.stock < workCount) {
      showErrorToast?.("선택한 게이지의 구매 가능 수량을 초과했습니다.");
      return;
    }
    const colorRows = hasVariantInventories ? getVisibleColorRows(p) : normalizeColorRows(p);
    const hasColorRows = colorRows.length > 0;
    const selectedColorRow = colorRows.find((row) => row.value === selectedColor);
    if (hasColorRows && !selectedColor) {
      showErrorToast?.("색상을 선택해주세요.");
      return;
    }
    if (!hasVariantInventories && hasColorRows && selectedColor && !selectedColorRow) {
      showErrorToast?.("선택한 색상 정보를 찾을 수 없습니다.");
      return;
    }
    if (selectedColorRow && isColorSoldOut(selectedColorRow)) {
      showErrorToast?.("선택한 색상은 현재 품절입니다.");
      return;
    }
    if (selectedColorRow && selectedColorRow.stock < workCount) {
      showErrorToast?.("선택한 색상의 구매 가능 수량을 초과했습니다.");
      return;
    }
    if (hasVariantInventories) {
      if (!selectedColor) return showErrorToast?.("색상을 선택해주세요.");
      if (!selectedGauge) return showErrorToast?.("게이지를 선택해주세요.");
      if (!selectedVariant) return showErrorToast?.("선택한 색상/게이지 조합을 찾을 수 없습니다.");
      if (!isSellableVariant(selectedVariant)) {
        return showErrorToast?.("선택한 색상/게이지 조합은 품절되었습니다.");
      }
      if (selectedVariant.stock < workCount) {
        return showErrorToast?.("선택한 게이지의 구매 가능 수량을 초과했습니다.");
      }
    }
    const selectedColorPayload =
      selectedColor
        ? {
            selectedColor,
            selectedColorLabel:
              selectedVariant?.colorLabel || (selectedColorRow ? getColorLabel(selectedColorRow) : selectedColor),
            selectedColorHex: selectedVariant?.colorHex || selectedColorRow?.colorHex,
            selectedColorImage:
              selectedVariant?.colorImage ||
              selectedColorRow?.image ||
              p?.images?.[0] ||
              p?.imageUrl,
          }
        : {};
    const selectedStringImage =
      selectedVariant?.colorImage?.trim() ||
      selectedColorRow?.image?.trim() ||
      p?.images?.[0] ||
      p?.imageUrl;

    const manageStock = Boolean(p?.inventory?.manageStock);
    const baseStock =
      typeof p?.inventory?.stock === "number" ? p.inventory.stock : undefined;
    const stock = hasVariantInventories
      ? selectedVariant?.stock
      : selectedGaugeRow
        ? selectedGaugeRow.stock
        : baseStock;

    // 관리 재고가 0이면(품절) 번들 진행 자체를 막음
    if (manageStock && typeof stock === "number" && stock <= 0) {
      showErrorToast?.("선택한 스트링의 재고가 부족합니다.");
      return;
    }

    // 번들 수량(workCount)보다 재고가 적으면, checkout으로 보내지 않고 여기서 차단
    if (manageStock && typeof stock === "number" && stock < workCount) {
      showErrorToast?.(
        hideGaugeStock
          ? "선택한 게이지의 구매 가능 수량을 초과했습니다."
          : "선택한 스트링의 구매 가능 수량을 초과했습니다.",
      );
      return;
    }

    const qty = clampWorkCount(workCount, manageStock ? stock : undefined);

    // 1) cart 편집 모드: cartStore를 직접 수정하고 returnTo로 복귀
    if (isFromCart) {
      try {
        upsertCartBundle(p, qty, selectedGauge, selectedColor);
        showSuccessToast?.(
          "장바구니 번들(라켓+스트링) 수량/스트링을 수정했어요.",
        );
        router.push(returnTo);
      } catch (e) {
        showErrorToast?.(
          "장바구니 수정 중 오류가 발생했어요. 다시 시도해주세요.",
        );
      }
      return;
    }

    // 2) buy-now 모드: pdpBundleStore로 checkout 이동
    setItems([
      // stock을 같이 들고가면, 이후 화면에서도 “클램프/사전 경고”에 활용 가능
      {
        id: racket.id,
        name: racket.name,
        price: racket.price,
        quantity: qty,
        image: racket.image,
        kind: "racket",
        stock: racket.maxQty,
      },
      {
        id: String(p._id),
        name: p.name,
        price: p.price,
        quantity: qty,
        image: selectedStringImage,
        kind: "product",
        stock: manageStock ? stock : undefined,
        selectedGauge: selectedGauge || undefined,
        ...selectedColorPayload,
      },
    ]);

    router.push(`/checkout?mode=buynow&withService=1`);
  };


  return (
    <div className="min-h-screen bg-muted/30">
      <SiteContainer
        variant="wide"
        className="py-8 bp-md:py-12 space-y-8 bp-md:space-y-10"
      >
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="break-keep text-2xl font-bold leading-tight tracking-normal text-foreground bp-md:text-4xl">
            스트링 선택
          </h1>

          {isFromCart ? (
            <p className="break-keep text-sm leading-relaxed text-muted-foreground bp-md:text-base">
              <span className="font-semibold">장바구니 번들 수정 모드</span>
              입니다. 수량과 스트링을 변경한 뒤 장바구니로 돌아갑니다.
            </p>
          ) : (
            <p className="break-keep text-sm leading-relaxed text-muted-foreground bp-md:text-base">
              라켓과 함께 구매하실 스트링을 선택해주세요. 선택한 스트링은 라켓과
              함께 한 번에 결제됩니다.
            </p>
          )}
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
                        <div className="relative z-10 p-4 bp-md:p-6 flex gap-4 bp-md:gap-6 items-center">
              <div className="flex-shrink-0">
                {racket.image ? (
                  <img
                    src={racket.image || "/placeholder.svg"}
                    alt={racket.name}
                    className="w-20 h-20 bp-md:w-24 bp-md:h-24 object-cover rounded-xl shadow-md ring-2 ring-ring"
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
                    <p className="mb-1 whitespace-nowrap text-xs font-medium text-success">
                      선택된 라켓
                    </p>
                    <h3 className="mb-1 line-clamp-2 break-keep text-xl font-bold leading-snug text-foreground">
                      {racket.name}
                    </h3>
                    <div className="flex flex-wrap items-baseline gap-2 tabular-nums">
                      <span className="whitespace-nowrap text-lg font-semibold text-primary">
                        {racket.price.toLocaleString()}원
                      </span>
                      {Number(racket.discountRate ?? 0) > 0 && Number(racket.regularPrice ?? 0) > racket.price && (
                        <>
                          <span className="whitespace-nowrap text-sm text-muted-foreground line-through">
                            {Number(racket.regularPrice).toLocaleString()}원
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("shrink-0 whitespace-nowrap text-xs", badgeToneClass("danger"))}
                          >
                            {racket.discountRate}% OFF
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 번들 수량 */}
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 bp-md:p-6 shadow-sm">
            <div className="flex flex-col bp-md:flex-row bp-md:items-center bp-md:justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  번들 수량 (라켓 + 스트링)
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  이 수량만큼{" "}
                  <span className="font-medium">라켓/스트링/교체비</span>가 함께
                  계산되고, STEP2의{" "}
                  <span className="font-medium">라켓별 세부 장착 정보</span>도
                  자동 생성됩니다.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start bp-md:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-10 p-0"
                  onClick={() =>
                    setWorkCount((prev) => clampWorkCount(prev - 1))
                  }
                  aria-label="번들 수량 감소"
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={30}
                  value={workCount}
                  onChange={(e) =>
                    setWorkCount(clampWorkCount(Number(e.target.value)))
                  }
                  className="h-10 w-20 text-center"
                />

                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-10 p-0"
                  onClick={() =>
                    setWorkCount((prev) => clampWorkCount(prev + 1))
                  }
                  aria-label="번들 수량 증가"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 스트링 목록 */}
        <div className="space-y-6">
          <h2 className="break-keep text-center text-2xl font-bold leading-tight text-foreground">
            사용 가능한 스트링
          </h2>
          {isLoadingInitial ? (
            <div className="grid grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 gap-4 bp-md:gap-6 items-start">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card p-5 space-y-4"
                >
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
              <p className="text-base font-semibold text-foreground">사용 가능한 스트링이 없습니다.</p>
              <p className="mt-2 break-keep text-sm text-muted-foreground">스트링 상품의 장착 서비스 설정을 확인해주세요.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/services/apply">교체서비스 신청 화면으로 돌아가기</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 gap-4 bp-md:gap-6 items-start">
              {products.map((p: any) => {
                const stringId = String(p._id);
                const stringImage = p?.images?.[0] ?? p?.imageUrl;
                const hasVariantInventories =
                  Array.isArray(p?.variantInventories) && p.variantInventories.length > 0;
                const variantRows = hasVariantInventories ? normalizeVariantRows(p) : [];
                const gaugeRows = normalizeGaugeRows(p);
                const hasGaugeRows = gaugeRows.length > 0;
                const selectedGauge = selectedGaugeByStringId[stringId] ?? "";
                const colorRows = normalizeColorRows(p);
                const hasColorRows = colorRows.length > 0;
                const selectedColor = selectedColorByStringId[stringId] ?? "";
                const variantsForSelectedColor = hasVariantInventories
                  ? getVariantsByColor(p, selectedColor)
                  : [];
                const gaugeRowsForRender = hasVariantInventories
                  ? variantsForSelectedColor.map((row) => ({
                      value: row.gaugeValue,
                      label: row.gaugeLabel,
                      stock: row.stock,
                      isSoldOut: row.isSoldOut,
                    }))
                  : gaugeRows;
                const selectedColorRow = colorRows.find((row) => row.value === selectedColor);
                const selectedGaugeRow = gaugeRowsForRender.find((row) => row.value === selectedGauge);
                const selectedVariant = hasVariantInventories
                  ? getVariantBySelection(p, selectedColor, selectedGauge)
                  : undefined;
                const hideGaugeStock = p?.inventory?.hideGaugeStock === true;
                const manageStock = Boolean(p?.inventory?.manageStock);
                const stock =
                  typeof p?.inventory?.stock === "number"
                    ? p.inventory.stock
                    : undefined;
                const effectiveStock = hasVariantInventories
                  ? selectedVariant?.stock
                  : selectedGaugeRow
                    ? selectedGaugeRow.stock
                    : stock;
                const lowStock =
                  typeof p?.inventory?.lowStock === "number"
                    ? p.inventory.lowStock
                    : 5;
                const isGaugeSoldOut =
                  selectedGaugeRow != null &&
                  (selectedGaugeRow.isSoldOut || selectedGaugeRow.stock <= 0);
                const isGaugeShort =
                  selectedGaugeRow != null && selectedGaugeRow.stock < workCount;
                const isSoldOut =
                  hasGaugeRows
                    ? isGaugeSoldOut
                    : manageStock && typeof stock === "number" && stock <= 0;
                const isShort =
                  hasGaugeRows
                    ? selectedGaugeRow != null && effectiveStock < workCount
                    : manageStock && typeof stock === "number" && stock < workCount;
                const disabledByGauge =
                  (hasVariantInventories || hasGaugeRows) && (!selectedGauge || isGaugeSoldOut || isGaugeShort);
                const isColorSoldOutState =
                  hasVariantInventories
                    ? !variantRows.some((row) => row.colorValue === selectedColor && isSellableVariant(row))
                    : selectedColorRow != null && isColorSoldOut(selectedColorRow);
                const isColorShort =
                  selectedColorRow != null && selectedColorRow.stock < workCount;
                const disabledByColor =
                  hasColorRows && (!selectedColor || isColorSoldOutState || isColorShort);
                const canShowStockHint =
                  manageStock &&
                  typeof effectiveStock === "number" &&
                  effectiveStock > 0 &&
                  effectiveStock <= lowStock &&
                  (!hasGaugeRows || (selectedGaugeRow != null && !hideGaugeStock));

                const isCurrent =
                  Boolean(selectedStringIdForHighlight) &&
                  selectedStringIdForHighlight === stringId &&
                  isFromCart;

                return (
                  <div
                    key={stringId}
                    className={[
                      "group relative overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,box-shadow,background-color] duration-200 hover:shadow-md",
                      isCurrent
                        ? "border-border ring-2 ring-ring"
                        : "border-border hover:border-primary/30 hover:bg-muted/30",
                    ].join(" ")}
                  >
                    <div className="p-5 flex flex-col h-full">
                      <div className="mb-4 rounded-xl overflow-hidden bg-muted/30 aspect-square flex items-center justify-center">
                        {stringImage ? (
                          <img
                            src={stringImage || "/placeholder.svg"}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="text-muted-foreground">
                            <svg
                              className="w-16 h-16"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="min-w-0 line-clamp-2 break-keep font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                            {p.name}
                          </h3>
                          {isCurrent && (
                            <Badge
                              variant="brand"
                              className="shrink-0 whitespace-nowrap px-2 py-1 text-[11px] font-semibold"
                            >
                              현재 선택
                            </Badge>
                          )}
                        </div>
                        <p className="whitespace-nowrap tabular-nums text-lg font-bold text-foreground">
                          {Number(p.price ?? 0).toLocaleString()}원
                        </p>
                        {hasColorRows && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-foreground">색상 선택</p>
                            {colorRows.length === 1 ? (
                              <p className="text-xs text-muted-foreground">
                                색상: {getColorLabel(colorRows[0])}
                                {isColorSoldOut(colorRows[0]) ? " (품절)" : ""}
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                <p className="text-xs text-muted-foreground">
                                  현재 색상: {selectedColorRow ? getColorLabel(selectedColorRow) : "미선택"}
                                </p>
                                <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                                  {colorRows.map((row) => {
                                    const label = getColorLabel(row);
                                    const soldOut = hasVariantInventories
                                      ? !variantRows.some(
                                          (variant) =>
                                            variant.colorValue === row.value &&
                                            isVisibleVariant(variant) &&
                                            isSellableVariant(variant),
                                        )
                                      : isColorSoldOut(row);
                                    const isSelected = selectedColor === row.value;
                                    const colorImageFallback = hasVariantInventories
                                      ? variantRows.find(
                                          (variant) =>
                                            variant.colorValue === row.value &&
                                            variant.colorImage &&
                                            variant.colorImage.length > 0,
                                        )?.colorImage
                                      : undefined;
                                    const colorImage = row.image || colorImageFallback || stringImage || "/placeholder.svg";
                                    return (
                                      <button
                                        key={`${stringId}-color-${row.value}`}
                                        type="button"
                                        aria-pressed={isSelected}
                                        aria-label={`${label} 색상 선택`}
                                        disabled={soldOut}
                                        onClick={() => {
                                          const nextColor = row.value;
                                          if (!hasVariantInventories) {
                                            setSelectedColorByStringId((prev) => ({
                                              ...prev,
                                              [stringId]: nextColor,
                                            }));
                                            return;
                                          }
                                          const nextVariants = getVariantsByColor(p, nextColor);
                                          const keepCurrentGauge = nextVariants.find(
                                            (variant) =>
                                              variant.gaugeValue === selectedGauge &&
                                              isSellableVariant(variant),
                                          );
                                          const firstSellable = nextVariants.find((variant) => isSellableVariant(variant));
                                          setSelectedColorByStringId((prev) => ({
                                            ...prev,
                                            [stringId]: nextColor,
                                          }));
                                          setSelectedGaugeByStringId((prev) => ({
                                            ...prev,
                                            [stringId]: keepCurrentGauge?.gaugeValue ?? firstSellable?.gaugeValue ?? "",
                                          }));
                                        }}
                                        className={[
                                          "h-10 min-w-10 max-w-[6rem] shrink-0 truncate whitespace-nowrap rounded-md border px-2 text-xs transition",
                                          isSelected ? "border-ring ring-2 ring-ring/40" : "border-border",
                                          soldOut ? "opacity-50 cursor-not-allowed" : "hover:border-foreground/40",
                                        ].join(" ")}
                                      >
                                        {colorImage ? (
                                          <img src={colorImage} alt={label} className="h-6 w-6 rounded object-cover mx-auto" />
                                        ) : row.colorHex ? (
                                          <span className="mx-auto block h-5 w-5 rounded-full border" style={{ backgroundColor: row.colorHex }} />
                                        ) : (
                                          label
                                        )}
                                        {soldOut && <span className="ml-1 text-[10px] text-destructive">품절</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {(hasVariantInventories || hasGaugeRows) && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-foreground">게이지 선택</p>
                            <Select
                              value={selectedGauge}
                              onValueChange={(value) =>
                                setSelectedGaugeByStringId((prev) => ({
                                  ...prev,
                                  [stringId]: value,
                                }))
                              }
                            >
                              <SelectTrigger className="h-9 text-left text-xs [&>span]:truncate">
                                <SelectValue placeholder="게이지를 선택해주세요" />
                              </SelectTrigger>
                              <SelectContent>
                                {gaugeRowsForRender.map((row) => {
                                  const soldOut = row.isSoldOut || row.stock <= 0;
                                  const gaugeLabel = getGaugeLabel(row);
                                  const stockSuffix =
                                    soldOut
                                      ? " · 품절"
                                      : hideGaugeStock
                                        ? ""
                                        : ` · 재고 ${row.stock}개`;
                                  return (
                                    <SelectItem
                                      key={`${stringId}-${row.value}`}
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
                        {/* 재고 힌트 */}
                        {canShowStockHint && (
                            <p className="whitespace-nowrap text-xs text-warning">
                              현재 남은 수량 {effectiveStock}개
                            </p>
                          )}
                        {isShort && (
                          <p className="break-keep text-xs text-destructive">
                            {hasGaugeRows
                              ? "선택한 게이지의 구매 가능 수량을 초과했습니다."
                              : `재고 ${stock}개로 번들 수량(${workCount}개)을 충족할 수 없어요`}
                          </p>
                        )}
                        {isSoldOut && (
                          <p className="break-keep text-xs text-destructive">품절</p>
                        )}
                      </div>

                      {/* 버튼 영역 */}
                      {isFromCart ? (
                        <Button
                          variant="elevated"
                          className="mt-4 w-full whitespace-nowrap rounded-xl py-5 font-medium"
                          disabled={disabledByGauge || disabledByColor || isSoldOut || isShort}
                          onClick={() => handleSelectString(p, selectedGauge || undefined, selectedColor || undefined)}
                        >
                          <span className="flex items-center justify-center gap-2">
                            이 스트링으로 변경
                            <svg
                              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
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
                      ) : (
                        <div className="mt-4 grid grid-cols-1 gap-2">
                          <Button
                            variant="elevated"
                            className="w-full whitespace-nowrap rounded-xl py-5 font-medium transition-[background-color,box-shadow] duration-200"
                            disabled={disabledByGauge || disabledByColor || isSoldOut || isShort}
                            onClick={() => handleSelectString(p, selectedGauge || undefined, selectedColor || undefined)}
                          >
                            <span className="flex items-center justify-center gap-2">
                              이 스트링 선택하고 구매 계속하기
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
                          <p className="px-1 text-center text-xs leading-relaxed text-muted-foreground break-keep">
                            선택한 스트링은 라켓과 함께 한 번에 결제됩니다.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              onClick={loadMore}
              disabled={isFetchingMore}
              className="px-8 py-6 rounded-xl font-medium bg-card border-2 border-border text-foreground hover:border-border hover:bg-muted disabled:opacity-50 transition-[border-color,background-color,box-shadow,opacity] duration-200"
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
      </SiteContainer>
    </div>
  );
}
