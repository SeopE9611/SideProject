import { useCallback, useEffect, useMemo, useState } from "react";

import type { ColorInventory, GaugeInventory, Product, VariantInventory } from "../types/product";

type NormalizedColorRow = Required<Pick<ColorInventory, "value">> &
  Omit<ColorInventory, "value" | "stock" | "isSoldOut" | "showWhenSoldOut"> & {
    stock: number;
    isSoldOut: boolean;
    showWhenSoldOut: boolean;
  };

type NormalizedGaugeRow = Required<Pick<GaugeInventory, "value">> &
  Omit<GaugeInventory, "value" | "stock" | "isSoldOut" | "showWhenSoldOut"> & {
    stock: number;
    isSoldOut: boolean;
    showWhenSoldOut: boolean;
  };

type NormalizedVariantRow = Required<Pick<VariantInventory, "colorValue" | "gaugeValue">> &
  Omit<VariantInventory, "colorValue" | "gaugeValue" | "stock" | "isSoldOut" | "showWhenSoldOut"> & {
    stock: number;
    isSoldOut: boolean;
    showWhenSoldOut: boolean;
  };

function toStock(value: unknown) {
  const stock = Number(value ?? 0);

  return Number.isFinite(stock) && stock > 0 ? stock : 0;
}

function isSellableVariant(row?: NormalizedVariantRow) {
  return Boolean(row && row.isSoldOut !== true && row.stock > 0);
}

function normalizeColorRows(product: Product): NormalizedColorRow[] {
  if (Array.isArray(product.colorInventories) && product.colorInventories.length > 0) {
    return product.colorInventories
      .map((row) => ({
        value: String(row.value ?? "").trim(),
        label: typeof row.label === "string" ? row.label.trim() : undefined,
        colorHex: typeof row.colorHex === "string" ? row.colorHex.trim() : undefined,
        image: typeof row.image === "string" ? row.image.trim() : undefined,
        stock: toStock(row.stock),
        isSoldOut: row.isSoldOut === true,
        showWhenSoldOut: row.showWhenSoldOut === false ? false : true,
      }))
      .filter((row) => row.value.length > 0);
  }

  if (Array.isArray(product.colorOptions) && product.colorOptions.length > 0) {
    return product.colorOptions
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .map((value) => ({
        value,
        label: value,
        stock: toStock(product.inventory?.stock),
        isSoldOut: false,
        showWhenSoldOut: true,
      }));
  }

  if (typeof product.color === "string" && product.color.trim()) {
    return [
      {
        value: product.color.trim(),
        label: product.color.trim(),
        stock: toStock(product.inventory?.stock),
        isSoldOut: false,
        showWhenSoldOut: true,
      },
    ];
  }

  return [];
}

const EMPTY_PRODUCT: Product = {
  _id: "",
};

export function useProductDetailOptions(product: Product | null) {
  const currentProduct = product ?? EMPTY_PRODUCT;

  const variantRows = useMemo<NormalizedVariantRow[]>(() => {
    if (!Array.isArray(currentProduct.variantInventories) || currentProduct.variantInventories.length === 0) {
      return [];
    }

    return currentProduct.variantInventories
      .map((row) => ({
        colorValue: String(row.colorValue ?? "").trim(),
        colorLabel: typeof row.colorLabel === "string" ? row.colorLabel.trim() : undefined,
        colorHex: typeof row.colorHex === "string" ? row.colorHex.trim() : undefined,
        colorImage: typeof row.colorImage === "string" ? row.colorImage.trim() : undefined,
        gaugeValue: String(row.gaugeValue ?? "").trim(),
        gaugeLabel: typeof row.gaugeLabel === "string" ? row.gaugeLabel.trim() : undefined,
        stock: toStock(row.stock),
        isSoldOut: row.isSoldOut === true,
        showWhenSoldOut: row.showWhenSoldOut === false ? false : true,
      }))
      .filter((row) => row.colorValue.length > 0 && row.gaugeValue.length > 0);
  }, [currentProduct.variantInventories]);

  const hasVariantInventories = variantRows.length > 0;

  const visibleVariantRows = useMemo(
    () => variantRows.filter((row) => !(row.isSoldOut || row.stock <= 0) || row.showWhenSoldOut),
    [variantRows],
  );

  const getVariantsByColor = useCallback(
    (colorValue: string) => visibleVariantRows.filter((row) => row.colorValue === colorValue),
    [visibleVariantRows],
  );

  const getVariantBySelection = useCallback(
    (colorValue: string, gaugeValue: string) =>
      variantRows.find((row) => row.colorValue === colorValue && row.gaugeValue === gaugeValue),
    [variantRows],
  );

  const colorRows = useMemo(() => normalizeColorRows(currentProduct), [currentProduct]);

  const visibleColorRows = useMemo(() => {
    if (!hasVariantInventories) {
      return colorRows;
    }

    const visibleColorValues = new Set(visibleVariantRows.map((row) => row.colorValue).filter(Boolean));

    const rows = colorRows.filter((row) => visibleColorValues.has(row.value));

    const known = new Set(rows.map((row) => row.value));

    visibleVariantRows.forEach((row) => {
      if (!row.colorValue || known.has(row.colorValue)) {
        return;
      }

      rows.push({
        value: row.colorValue,
        label: row.colorLabel || row.colorValue,
        colorHex: row.colorHex,
        image: row.colorImage,
        stock: row.stock,
        isSoldOut: row.isSoldOut,
        showWhenSoldOut: row.showWhenSoldOut,
      });

      known.add(row.colorValue);
    });

    return rows;
  }, [colorRows, hasVariantInventories, visibleVariantRows]);

  const firstAvailableColor = useMemo(
    () =>
      visibleColorRows.find((row) =>
        hasVariantInventories ? getVariantsByColor(row.value).length > 0 : !(row.isSoldOut || row.stock <= 0),
      ) ?? visibleColorRows[0],
    [getVariantsByColor, hasVariantInventories, visibleColorRows],
  );

  const [selectedColor, setSelectedColor] = useState("");

  useEffect(() => {
    if (!selectedColor && firstAvailableColor?.value) {
      setSelectedColor(firstAvailableColor.value);
    }
  }, [firstAvailableColor?.value, selectedColor]);

  const selectedColorRow = visibleColorRows.find((row) => row.value === selectedColor);

  const selectedColorVariants = useMemo(
    () => (selectedColor ? getVariantsByColor(selectedColor) : []),
    [getVariantsByColor, selectedColor],
  );

  const colorImageFromVariant = selectedColorVariants.find((row) => row.colorImage)?.colorImage?.trim();

  const colorImage = selectedColorRow?.image?.trim() || colorImageFromVariant;

  const hideGaugeStock = currentProduct.inventory?.hideGaugeStock === true;

  const gaugeRows = useMemo<NormalizedGaugeRow[]>(() => {
    if (hasVariantInventories) {
      return selectedColorVariants.map((row) => ({
        value: row.gaugeValue,
        label: row.gaugeLabel,
        stock: row.stock,
        isSoldOut: row.isSoldOut,
        showWhenSoldOut: row.showWhenSoldOut,
      }));
    }

    if (Array.isArray(currentProduct.gaugeInventories) && currentProduct.gaugeInventories.length > 0) {
      return currentProduct.gaugeInventories
        .map((row) => ({
          value: String(row.value ?? "").trim(),
          label: typeof row.label === "string" ? row.label.trim() : undefined,
          stock: toStock(row.stock),
          isSoldOut: row.isSoldOut === true,
          showWhenSoldOut: row.showWhenSoldOut === false ? false : true,
        }))
        .filter((row) => row.value.length > 0);
    }

    if (Array.isArray(currentProduct.gaugeOptions) && currentProduct.gaugeOptions.length > 0) {
      return currentProduct.gaugeOptions
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
        .map((value) => ({
          value,
          stock: toStock(currentProduct.inventory?.stock),
          isSoldOut: false,
          showWhenSoldOut: true,
        }));
    }

    return [];
  }, [
    hasVariantInventories,
    currentProduct.gaugeInventories,
    currentProduct.gaugeOptions,
    currentProduct.inventory?.stock,
    selectedColorVariants,
  ]);

  const gaugeOptions = useMemo(() => gaugeRows.map((row) => row.value), [gaugeRows]);

  const [selectedGauge, setSelectedGauge] = useState("");

  useEffect(() => {
    if (gaugeOptions.length === 1) {
      setSelectedGauge(gaugeOptions[0]);
    }
  }, [gaugeOptions]);

  useEffect(() => {
    if (gaugeOptions.length === 0) {
      if (selectedGauge) {
        setSelectedGauge("");
      }

      return;
    }

    const current = selectedGauge ? gaugeRows.find((row) => row.value === selectedGauge) : undefined;

    const currentUnavailable = Boolean(current && (current.isSoldOut || current.stock <= 0));

    const currentInvalid = Boolean(selectedGauge && !current);

    if (!selectedGauge || currentInvalid || currentUnavailable) {
      const firstAvailable = gaugeRows.find((row) => !row.isSoldOut && row.stock > 0);

      setSelectedGauge(firstAvailable?.value ?? "");
    }
  }, [gaugeOptions, gaugeRows, selectedGauge]);

  useEffect(() => {
    if (!hasVariantInventories || !selectedColor) {
      return;
    }

    const current = selectedGauge ? getVariantBySelection(selectedColor, selectedGauge) : undefined;

    if (isSellableVariant(current)) {
      return;
    }

    const firstSellable = selectedColorVariants.find((row) => isSellableVariant(row));

    setSelectedGauge(firstSellable?.gaugeValue ?? "");
  }, [getVariantBySelection, hasVariantInventories, selectedColor, selectedColorVariants, selectedGauge]);

  const selectedGaugeRow = selectedGauge ? gaugeRows.find((row) => row.value === selectedGauge) : undefined;

  const selectedVariant =
    hasVariantInventories && selectedColor && selectedGauge
      ? getVariantBySelection(selectedColor, selectedGauge)
      : undefined;

  const selectedVariantSoldOut = !isSellableVariant(selectedVariant);

  const variantHasNoSellableGauge =
    hasVariantInventories && Boolean(selectedColor) && selectedColorVariants.every((row) => !isSellableVariant(row));

  const effectiveStock = hasVariantInventories
    ? isSellableVariant(selectedVariant)
      ? (selectedVariant?.stock ?? 0)
      : 0
    : selectedGaugeRow
      ? Math.max(0, selectedGaugeRow.stock)
      : Math.max(0, toStock(currentProduct.inventory?.stock));

  return {
    hasVariantInventories,
    isSellableVariant,
    getVariantsByColor,

    visibleColorRows,
    selectedColor,
    setSelectedColor,
    selectedColorRow,
    colorImage,

    hideGaugeStock,
    gaugeRows,
    gaugeOptions,
    selectedGauge,
    setSelectedGauge,
    selectedGaugeRow,

    selectedVariant,
    selectedVariantSoldOut,
    variantHasNoSellableGauge,
    effectiveStock,
  };
}
