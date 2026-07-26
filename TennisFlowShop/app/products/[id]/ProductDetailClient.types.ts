export type GuestOrderMode = "off" | "legacy" | "on";

import type { BadgeDisplaySpec } from "@/lib/badge-style";

export type ProductBadge = BadgeDisplaySpec;

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
  gaugeValue: string;
  gaugeLabel?: string;
  colorImage?: string;
  stock: number;
  isSoldOut: boolean;
  showWhenSoldOut?: boolean | null;
};

export type DetailTab = "description" | "specifications" | "reviews" | "qna";
