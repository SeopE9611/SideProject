import { stringColorLabel } from "@/lib/constants";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";

import type {
  ColorInventoryRow,
  GaugeInventoryRow,
  GuestOrderMode,
  ProductBadge,
} from "./ProductDetailClient.types";

export function getGuestOrderModeClient(): GuestOrderMode {
  // 클라이언트에서는 NEXT_PUBLIC_만 접근 가능
  // 기본값은 legacy(= 비회원 주문 흐름 숨김)로 두어 실수 노출을 방지
  const raw = (process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? "legacy").trim();
  return raw === "off" || raw === "legacy" || raw === "on" ? raw : "legacy";
}

export const isTruthyBadgeField = (value: unknown) =>
  value === true || value === "true" || value === 1;

export function getProductDetailBadges(product: any): ProductBadge[] {
  const inventory = product?.inventory;
  const isNew = isTruthyBadgeField(inventory?.isNew);
  const isFeatured = isTruthyBadgeField(inventory?.isFeatured);

  const badges: ProductBadge[] = [];
  if (isNew) badges.push("NEW");
  if (isFeatured) badges.push("추천");

  return badges.slice(0, 2);
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
    return product.colorOptions
      .map((value: unknown) => String(value ?? "").trim())
      .filter(Boolean)
      .map((value: string) => ({
        value,
        label: value,
        stock: Number(product?.inventory?.stock ?? 0),
        isSoldOut: false,
      }));
  }

  if (typeof product?.color === "string" && product.color.trim()) {
    return [
      {
        value: product.color.trim(),
        label: product.color.trim(),
        stock: Number(product?.inventory?.stock ?? 0),
        isSoldOut: false,
      },
    ];
  }

  return [];
}

export function getColorLabel(row: ColorInventoryRow): string {
  return stringColorLabel(String(row.label || row.value || "").trim());
}

export function isColorSoldOut(row: ColorInventoryRow): boolean {
  return row.isSoldOut === true || Number(row.stock ?? 0) <= 0;
}

export function normalizeGaugeDisplayLabel(row: GaugeInventoryRow): string {
  const rawLabel = String(row.label ?? "").trim();
  if (rawLabel) return rawLabel;
  return formatGaugeLabel(row.value);
}

export const fmtDate = (v?: string | Date) => (v ? new Date(v).toLocaleDateString() : "");
