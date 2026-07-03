"use client";

import SelectStringLayout from "@/app/components/select-string/SelectStringLayout";
import { useCartStore } from "@/app/store/cartStore";
import { usePdpBundleStore } from "@/app/store/pdpBundleStore";
import {
  buildPriceDisplayMeta,
  getEffectiveProductPrice,
  getProductPriceDisplayMeta,
} from "@/lib/product-pricing";
import {
  getColorLabel,
  getVariantBySelection,
  getVisibleColorRows,
  isSellableVariant,
  normalizeColorRows,
  normalizeGaugeRows,
} from "@/lib/products/string-stock";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

export default function RacketSelectStringClient({ racket }: { racket: RacketMini }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Cart edit mode detection
  const from = searchParams.get("from");
  const isFromCart = from === "cart";

  // Cart edit mode params
  const initialQtyParam = Number(searchParams.get("qty") ?? 1);
  const initialStringId = searchParams.get("stringId");
  const initialSelectedGauge = searchParams.get("selectedGauge") ?? "";
  const initialSelectedColor = searchParams.get("selectedColor") ?? "";
  const returnTo = searchParams.get("returnTo") ?? "/cart";

  // Stores
  const setItems = usePdpBundleStore((s) => s.setItems);
  const clearBundle = usePdpBundleStore((s) => s.clear);
  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  // State
  const [workCount, setWorkCount] = useState(1);

  // Clamp work count
  const clampWorkCount = (v: number, stringStock?: number) => {
    if (!Number.isFinite(v)) return 1;
    const racketMax =
      Number.isFinite(racket.maxQty) && (racket.maxQty as number) > 0
        ? (racket.maxQty as number)
        : 99;
    const stockMax =
      Number.isFinite(stringStock) && (stringStock as number) > 0
        ? (stringStock as number)
        : Infinity;
    const max = Math.min(racketMax, stockMax);
    return Math.max(1, Math.min(max, Math.trunc(v)));
  };

  // Initialize work count from cart
  useEffect(() => {
    setWorkCount(clampWorkCount(initialQtyParam));
  }, [initialQtyParam, racket.maxQty]);

  // Clear bundle store for buy-now mode
  useEffect(() => {
    if (!isFromCart) clearBundle();
  }, [clearBundle, isFromCart]);

  // Calculate display price
  const displayPrice = useMemo(() => {
    if (
      racket.salePrice &&
      racket.salePrice > 0 &&
      racket.salePrice < (racket.regularPrice ?? racket.price)
    ) {
      return racket.salePrice;
    }
    return racket.price;
  }, [racket.price, racket.salePrice, racket.regularPrice]);

  // Upsert cart bundle helper
  const upsertCartBundle = (
    selectedString: any,
    qty: number,
    selectedGauge?: string,
    selectedColor?: string,
  ) => {
    const newStringId = String(selectedString?._id);
    const hasVariantInventories =
      Array.isArray(selectedString?.variantInventories) &&
      selectedString.variantInventories.length > 0;
    const selectedVariant = hasVariantInventories
      ? getVariantBySelection(selectedString, selectedColor ?? "", selectedGauge ?? "")
      : undefined;
    const colorRows = normalizeColorRows(selectedString);
    const selectedColorRow = colorRows.find((row) => row.value === selectedColor);
    const selectedColorPayload = selectedColor
      ? {
          selectedColor,
          selectedColorLabel:
            selectedVariant?.colorLabel ||
            (selectedColorRow ? getColorLabel(selectedColorRow) : selectedColor),
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

    // Update racket in cart
    const hasRacket = cartItems.some(
      (it) => it.id === racket.id && (it.kind ?? "product") === "racket",
    );
    if (!hasRacket) {
      addItem({
        id: racket.id,
        name: racket.name,
        price: displayPrice,
        ...buildPriceDisplayMeta(racket.regularPrice, displayPrice),
        quantity: qty,
        image: racket.image,
        kind: "racket",
        stock: racket.maxQty,
      });
    } else {
      removeItem(racket.id);
      addItem({
        id: racket.id,
        name: racket.name,
        price: displayPrice,
        ...buildPriceDisplayMeta(racket.regularPrice, displayPrice),
        quantity: qty,
        image: racket.image,
        kind: "racket",
        stock: racket.maxQty,
      });
    }

    // Remove old string if different
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

    // Add new string
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
        price: getEffectiveProductPrice(selectedString),
        ...getProductPriceDisplayMeta(selectedString),
        quantity: qty,
        image: selectedStringImage,
        kind: "product",
        stock: effectiveStringStock,
        selectedGauge: selectedGauge || undefined,
        ...selectedColorPayload,
      });
    }
  };

  // Handle string selection
  const handleSelectString = ({
    stringProduct,
    selectedGauge,
    selectedColor,
    workCount: qty,
  }: {
    stringProduct: any;
    selectedGauge?: string;
    selectedColor?: string;
    workCount: number;
  }) => {
    const p = stringProduct;
    const hasVariantInventories =
      Array.isArray(p?.variantInventories) && p.variantInventories.length > 0;
    const selectedVariant = hasVariantInventories
      ? getVariantBySelection(p, selectedColor ?? "", selectedGauge ?? "")
      : undefined;
    const gaugeRows = normalizeGaugeRows(p);
    const hasGaugeRows = gaugeRows.length > 0;
    const selectedGaugeRow = gaugeRows.find((row) => row.value === selectedGauge);
    const hideGaugeStock = p?.inventory?.hideGaugeStock === true;

    // Validation
    if (!hasVariantInventories && hasGaugeRows && !selectedGauge) {
      showErrorToast?.("스트링 게이지(굵기)를 선택해주세요.");
      return;
    }
    if (!hasVariantInventories && hasGaugeRows && !selectedGaugeRow) {
      showErrorToast?.("선택한 게이지(굵기) 정보를 찾을 수 없습니다.");
      return;
    }
    if (
      !hasVariantInventories &&
      selectedGaugeRow &&
      (selectedGaugeRow.isSoldOut || selectedGaugeRow.stock <= 0)
    ) {
      showErrorToast?.("선택한 게이지(굵기)는 품절입니다.");
      return;
    }
    if (!hasVariantInventories && selectedGaugeRow && selectedGaugeRow.stock < qty) {
      showErrorToast?.("선택한 게이지(굵기)의 구매 가능 수량을 초과했습니다.");
      return;
    }

    const colorRows = hasVariantInventories ? getVisibleColorRows(p) : normalizeColorRows(p);
    const hasColorRows = colorRows.length > 0;
    const selectedColorRow = colorRows.find((row) => row.value === selectedColor);

    if (hasColorRows && !selectedColor) {
      showErrorToast?.("스트링 색상을 선택해주세요.");
      return;
    }
    if (!hasVariantInventories && hasColorRows && selectedColor && !selectedColorRow) {
      showErrorToast?.("선택한 스트링 색상 정보를 찾을 수 없습니다.");
      return;
    }
    if (selectedColorRow && selectedColorRow.isSoldOut) {
      showErrorToast?.("선택한 스트링 색상은 현재 품절입니다.");
      return;
    }
    if (selectedColorRow && selectedColorRow.stock < qty) {
      showErrorToast?.("선택한 색상의 구매 가능 수량을 초과했습니다.");
      return;
    }

    if (hasVariantInventories) {
      if (!selectedColor) return showErrorToast?.("스트링 색상을 선택해주세요.");
      if (!selectedGauge) return showErrorToast?.("스트링 게이지(굵기)를 선택해주세요.");
      if (!selectedVariant) return showErrorToast?.("선택한 색상과 게이지(굵기) 조합을 찾을 수 없습니다.");
      if (!isSellableVariant(selectedVariant)) {
        return showErrorToast?.("선택한 색상과 게이지(굵기) 조합은 품절되었습니다.");
      }
      if (selectedVariant.stock < qty) {
        return showErrorToast?.("선택한 게이지(굵기)의 구매 가능 수량을 초과했습니다.");
      }
    }

    // Prepare color payload
    const selectedColorPayload = selectedColor
      ? {
          selectedColor,
          selectedColorLabel:
            selectedVariant?.colorLabel ||
            (selectedColorRow ? getColorLabel(selectedColorRow) : selectedColor),
          selectedColorHex: selectedVariant?.colorHex || selectedColorRow?.colorHex,
          selectedColorImage:
            selectedVariant?.colorImage || selectedColorRow?.image || p?.images?.[0] || p?.imageUrl,
        }
      : {};
    const selectedStringImage =
      selectedVariant?.colorImage?.trim() ||
      selectedColorRow?.image?.trim() ||
      p?.images?.[0] ||
      p?.imageUrl;

    const manageStock = Boolean(p?.inventory?.manageStock);
    const baseStock = typeof p?.inventory?.stock === "number" ? p.inventory.stock : undefined;
    const stock = hasVariantInventories
      ? selectedVariant?.stock
      : selectedGaugeRow
        ? selectedGaugeRow.stock
        : baseStock;

    if (manageStock && typeof stock === "number" && stock <= 0) {
      showErrorToast?.("선택한 스트링의 재고가 부족합니다.");
      return;
    }
    if (manageStock && typeof stock === "number" && stock < qty) {
      showErrorToast?.(
        hideGaugeStock
          ? "선택한 게이지(굵기)의 구매 가능 수량을 초과했습니다."
          : "선택한 스트링의 구매 가능 수량을 초과했습니다.",
      );
      return;
    }

    const finalQty = clampWorkCount(qty, manageStock ? stock : undefined);

    // Cart edit mode
    if (isFromCart) {
      try {
        upsertCartBundle(p, finalQty, selectedGauge, selectedColor);
        showSuccessToast?.("장바구니의 라켓+스트링 구성을 수정했어요.");
        router.push(returnTo);
      } catch (e) {
        showErrorToast?.("장바구니 수정 중 오류가 발생했어요. 다시 시도해주세요.");
      }
      return;
    }

    // Buy-now mode
    setItems([
      {
        id: racket.id,
        name: racket.name,
        price: displayPrice,
        ...buildPriceDisplayMeta(racket.regularPrice, displayPrice),
        quantity: finalQty,
        image: racket.image,
        kind: "racket",
        stock: racket.maxQty,
      },
      {
        id: String(p._id),
        name: p.name,
        price: getEffectiveProductPrice(p),
        ...getProductPriceDisplayMeta(p),
        quantity: finalQty,
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
    <SelectStringLayout
      racket={{
        id: racket.id,
        name: racket.name,
        image: racket.image,
        price: displayPrice,
        regularPrice: racket.regularPrice,
        discountRate: racket.discountRate,
        maxQty: racket.maxQty,
      }}
      flowType="purchase"
      onSelectString={handleSelectString}
      showQuantityControls={true}
      initialWorkCount={isFromCart ? initialQtyParam : 1}
      currentStringId={isFromCart ? initialStringId : null}
      initialSelectedGauge={initialSelectedGauge}
      initialSelectedColor={initialSelectedColor}
      isCartEditMode={isFromCart}
      ctaLabel={isFromCart ? "선택 변경하기" : "선택 후 결제"}
      ctaSubLabel={isFromCart ? "장바구니로 돌아갑니다" : "선택한 스트링은 라켓과 함께 결제됩니다"}
      designVariant="racketPurchase"
    />
  );
}
