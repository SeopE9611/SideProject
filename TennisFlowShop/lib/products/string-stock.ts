import { stringColorLabel } from "@/lib/constants";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";

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

const normalizeStock = (value: unknown) => {
  const stockNumber = Number(value ?? 0);
  return Number.isFinite(stockNumber) && stockNumber > 0 ? stockNumber : 0;
};

export function normalizeGaugeRows(product: any): GaugeInventoryRow[] {
  if (
    Array.isArray(product?.gaugeInventories) &&
    product.gaugeInventories.length > 0
  ) {
    return product.gaugeInventories
      .map((row: any) => ({
        value: String(row?.value ?? "").trim(),
        label: typeof row?.label === "string" ? row.label.trim() : undefined,
        stock: normalizeStock(row?.stock),
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
  if (
    Array.isArray(product?.colorInventories) &&
    product.colorInventories.length > 0
  ) {
    return product.colorInventories
      .map((row: any) => ({
        value: String(row?.value ?? "").trim(),
        label: typeof row?.label === "string" ? row.label.trim() : undefined,
        colorHex:
          typeof row?.colorHex === "string" ? row.colorHex.trim() : undefined,
        image: typeof row?.image === "string" ? row.image.trim() : undefined,
        stock: normalizeStock(row?.stock),
        isSoldOut: row?.isSoldOut === true,
        showWhenSoldOut: row?.showWhenSoldOut === false ? false : true,
      }))
      .filter((row: ColorInventoryRow) => row.value.length > 0);
  }

  if (Array.isArray(product?.colorOptions) && product.colorOptions.length > 0) {
    const normalizedFallbackStock = normalizeStock(product?.inventory?.stock);
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
    const normalizedFallbackStock = normalizeStock(product?.inventory?.stock);
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
    .map((row: any) => ({
      colorValue: String(row?.colorValue ?? "").trim(),
      colorLabel:
        typeof row?.colorLabel === "string" ? row.colorLabel.trim() : undefined,
      colorHex:
        typeof row?.colorHex === "string" ? row.colorHex.trim() : undefined,
      colorImage:
        typeof row?.colorImage === "string" ? row.colorImage.trim() : undefined,
      gaugeValue: String(row?.gaugeValue ?? "").trim(),
      gaugeLabel:
        typeof row?.gaugeLabel === "string" ? row.gaugeLabel.trim() : undefined,
      stock: normalizeStock(row?.stock),
      isSoldOut: row?.isSoldOut === true,
      showWhenSoldOut: row?.showWhenSoldOut === false ? false : true,
    }))
    .filter(
      (row: VariantInventoryRow) =>
        row.colorValue.length > 0 && row.gaugeValue.length > 0,
    );
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
  return normalizeVariantRows(product).filter(
    (row) => row.colorValue === colorValue && isVisibleVariant(row),
  );
}

export function getVisibleColorRows(product: any): ColorInventoryRow[] {
  const colorRows = normalizeColorRows(product);
  const variantRows = normalizeVariantRows(product);
  if (variantRows.length === 0) return colorRows;
  const visibleVariantRows = variantRows.filter(isVisibleVariant);
  const visibleColorValues = Array.from(
    new Set(visibleVariantRows.map((row) => row.colorValue).filter(Boolean)),
  );
  const visibleColorRows = colorRows.filter((row) =>
    visibleColorValues.includes(row.value),
  );
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

export function getVariantBySelection(
  product: any,
  colorValue: string,
  gaugeValue: string,
) {
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
