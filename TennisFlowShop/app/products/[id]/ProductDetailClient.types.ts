export type GuestOrderMode = "off" | "legacy" | "on";

export type ProductBadge = "NEW" | "추천";

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
