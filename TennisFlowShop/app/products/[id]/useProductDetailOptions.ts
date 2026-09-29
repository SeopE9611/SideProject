import { useEffect, useMemo, useState } from "react";
import { isMountableStringByFee } from "@/lib/orders/string-mounting-policy";
import type { GaugeInventoryRow, VariantInventoryRow } from "./ProductDetailClient.types";
import { getColorLabel, isColorSoldOut, normalizeColorRows } from "./ProductDetailClient.utils";

type UseProductDetailOptionsParams = {
  product: any;
};

export function useProductDetailOptions({ product }: UseProductDetailOptionsParams) {
  const [quantity, setQuantity] = useState(1);
  const variantRows = useMemo<VariantInventoryRow[]>(() => {
    if (!Array.isArray(product?.variantInventories) || product.variantInventories.length === 0)
      return [];
    return product.variantInventories
      .map((row: any) => ({
        colorValue: String(row?.colorValue ?? "").trim(),
        gaugeValue: String(row?.gaugeValue ?? "").trim(),
        gaugeLabel: typeof row?.gaugeLabel === "string" ? row.gaugeLabel.trim() : undefined,
        colorImage: typeof row?.colorImage === "string" ? row.colorImage.trim() : undefined,
        stock: Math.max(0, Number(row?.stock ?? 0)),
        isSoldOut: row?.isSoldOut === true,
        showWhenSoldOut: row?.showWhenSoldOut === false ? false : true,
      }))
      .filter((row: VariantInventoryRow) => row.colorValue.length > 0 && row.gaugeValue.length > 0);
  }, [product]);
  const hasVariantInventories = variantRows.length > 0;
  const isSellableVariant = (row?: VariantInventoryRow) =>
    !!row && row.isSoldOut !== true && Number(row.stock) > 0;
  const isSoldOutVariant = (row: VariantInventoryRow) =>
    row.isSoldOut === true || Number(row.stock ?? 0) <= 0;
  const isVisibleVariant = (row: VariantInventoryRow) =>
    !(isSoldOutVariant(row) && row.showWhenSoldOut === false);
  const visibleVariantRows = useMemo(
    () => variantRows.filter((row) => isVisibleVariant(row)),
    [variantRows],
  );
  const getVariantsByColor = (colorValue: string) =>
    visibleVariantRows.filter((v) => v.colorValue === colorValue);
  const getVariantBySelection = (colorValue: string, gaugeValue: string) =>
    variantRows.find((v) => v.colorValue === colorValue && v.gaugeValue === gaugeValue);
  const getAvailableGaugesForColor = (colorValue: string) => getVariantsByColor(colorValue);
  const colorRows = useMemo(() => normalizeColorRows(product), [product]);
  const visibleColorRows = useMemo(() => {
    if (!hasVariantInventories) return colorRows;
    const visibleColorValues = new Set(
      visibleVariantRows.map((row) => row.colorValue).filter(Boolean),
    );
    const baseRows = colorRows.filter((row) => visibleColorValues.has(row.value));
    const known = new Set(baseRows.map((row) => row.value));
    visibleVariantRows.forEach((row) => {
      if (!row.colorValue || known.has(row.colorValue)) return;
      baseRows.push({
        value: row.colorValue,
        label: row.colorValue,
        image: row.colorImage,
        stock: Number(row.stock ?? 0),
        isSoldOut: row.isSoldOut === true,
        showWhenSoldOut: row.showWhenSoldOut,
      });
      known.add(row.colorValue);
    });
    return baseRows;
  }, [colorRows, hasVariantInventories, visibleVariantRows]);
  const firstAvailableColor = useMemo(
    () =>
      visibleColorRows.find((row) =>
        hasVariantInventories ? getVariantsByColor(row.value).length > 0 : !isColorSoldOut(row),
      ) ?? visibleColorRows[0],
    [visibleColorRows, hasVariantInventories],
  );
  const [selectedColor, setSelectedColor] = useState<string>("");
  useEffect(() => {
    if (!selectedColor && firstAvailableColor?.value) {
      setSelectedColor(firstAvailableColor.value);
    }
  }, [firstAvailableColor?.value, selectedColor]);
  const selectedColorRow = visibleColorRows.find((row) => row.value === selectedColor);
  const selectedColorLabel = selectedColorRow ? getColorLabel(selectedColorRow) : "";
  const selectedColorVariants = useMemo(
    () => (selectedColor ? getAvailableGaugesForColor(selectedColor) : []),
    [selectedColor, variantRows],
  );
  const colorImageFromVariant = selectedColorVariants.find((v) => v.colorImage)?.colorImage?.trim();
  const colorImage = selectedColorRow?.image?.trim() || colorImageFromVariant;
  const hideGaugeStock = product?.inventory?.hideGaugeStock === true;
  const gaugeRows = useMemo<GaugeInventoryRow[]>(() => {
    if (hasVariantInventories) {
      return selectedColorVariants.map((row) => ({
        value: row.gaugeValue,
        label: row.gaugeLabel,
        stock: Number(row.stock ?? 0),
        isSoldOut: row.isSoldOut === true,
      }));
    }
    if (Array.isArray(product?.gaugeInventories) && product.gaugeInventories.length > 0) {
      return product.gaugeInventories
        .map((row: any) => ({
          value: String(row?.value ?? "").trim(),
          label: typeof row?.label === "string" ? row.label : undefined,
          stock: Number(row?.stock ?? 0),
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
  }, [hasVariantInventories, product, selectedColorVariants]);
  const gaugeOptions = useMemo(() => gaugeRows.map((row) => row.value), [gaugeRows]);
  const gaugeRowMap = useMemo(() => new Map(gaugeRows.map((row) => [row.value, row])), [gaugeRows]);
  const isMountableStringProduct = isMountableStringByFee(product?.mountingFee);
  const isStringProduct =
    product?.category === "string" ||
    product?.category === "strings" ||
    product?.kind === "string" ||
    product?.kind === "strings" ||
    isMountableStringProduct;
  const [selectedGauge, setSelectedGauge] = useState<string>("");
  useEffect(() => {
    if (!isStringProduct || gaugeOptions.length !== 1) return;
    setSelectedGauge(gaugeOptions[0]);
  }, [isStringProduct, gaugeOptions]);

  useEffect(() => {
    if (!isStringProduct || gaugeOptions.length === 0) return;
    const current = selectedGauge ? gaugeRowMap.get(selectedGauge) : undefined;
    const isCurrentSoldOut = !!current && (current.isSoldOut || current.stock <= 0);
    const isCurrentInvalid = !!selectedGauge && !current;
    if (!selectedGauge || isCurrentInvalid || isCurrentSoldOut) {
      const firstAvailable = gaugeRows.find((row) => !row.isSoldOut && row.stock > 0);
      setSelectedGauge(firstAvailable?.value ?? "");
      setQuantity(1);
    }
  }, [gaugeOptions, gaugeRowMap, gaugeRows, isStringProduct, selectedGauge]);
  useEffect(() => {
    if (!hasVariantInventories || !isStringProduct || !selectedColor) return;
    const current = selectedGauge ? getVariantBySelection(selectedColor, selectedGauge) : undefined;
    if (isSellableVariant(current)) return;
    const firstSellable = getAvailableGaugesForColor(selectedColor).find((v) =>
      isSellableVariant(v),
    );
    setSelectedGauge(firstSellable?.gaugeValue ?? "");
    setQuantity(1);
  }, [hasVariantInventories, isStringProduct, selectedColor, selectedGauge, visibleVariantRows]);
  const stock = product.inventory?.stock ?? 0;
  const selectedGaugeRow = selectedGauge ? gaugeRowMap.get(selectedGauge) : undefined;
  const selectedVariant =
    hasVariantInventories && selectedColor && selectedGauge
      ? getVariantBySelection(selectedColor, selectedGauge)
      : undefined;
  const selectedVariantSoldOut = !isSellableVariant(selectedVariant);
  const variantHasNoSellableGauge =
    hasVariantInventories &&
    !!selectedColor &&
    getAvailableGaugesForColor(selectedColor).every((v) => !isSellableVariant(v));
  const effectiveStock = hasVariantInventories
    ? isSellableVariant(selectedVariant)
      ? Math.max(0, Number(selectedVariant?.stock ?? 0))
      : 0
    : isStringProduct && gaugeOptions.length > 0 && selectedGaugeRow
      ? Math.max(0, Number(selectedGaugeRow.stock ?? 0))
      : stock;
  useEffect(() => {
    if (quantity > effectiveStock && effectiveStock > 0) setQuantity(effectiveStock);
  }, [effectiveStock, quantity]);
  const variantPurchaseBlocked =
    hasVariantInventories &&
    (!selectedColor ||
      !selectedGauge ||
      !selectedVariant ||
      selectedVariantSoldOut ||
      quantity > effectiveStock ||
      variantHasNoSellableGauge);

  const canDec = quantity > 1;
  const canInc = quantity < effectiveStock;

  return {
    quantity,
    setQuantity,

    variantRows,
    hasVariantInventories,
    isSellableVariant,
    isSoldOutVariant,
    isVisibleVariant,
    visibleVariantRows,
    getVariantsByColor,
    getVariantBySelection,
    getAvailableGaugesForColor,

    colorRows,
    visibleColorRows,
    firstAvailableColor,
    selectedColor,
    setSelectedColor,
    selectedColorRow,
    selectedColorLabel,
    selectedColorVariants,
    colorImageFromVariant,
    colorImage,

    hideGaugeStock,
    gaugeRows,
    gaugeOptions,
    gaugeRowMap,

    isMountableStringProduct,
    isStringProduct,
    selectedGauge,
    setSelectedGauge,
    stock,
    selectedGaugeRow,
    selectedVariant,
    selectedVariantSoldOut,
    variantHasNoSellableGauge,
    effectiveStock,
    variantPurchaseBlocked,

    canDec,
    canInc,
  };
}
