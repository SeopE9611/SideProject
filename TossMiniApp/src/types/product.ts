export type ProductInventory = {
  stock?: number;
  manageStock?: boolean;
  status?: string;
  allowBackorder?: boolean;
  isFeatured?: boolean | string | number;
  isNew?: boolean | string | number;
  isSale?: boolean | string | number;
  salePrice?: number | string | null;
  hideGaugeStock?: boolean;
};

export type ProductFeatures = {
  power?: number;
  control?: number;
  spin?: number;
  durability?: number;
  comfort?: number;
};

export type GaugeInventory = {
  value: string;
  label?: string;
  stock?: number;
  isSoldOut?: boolean;
  showWhenSoldOut?: boolean;
};

export type ColorInventory = {
  value: string;
  label?: string;
  colorHex?: string;
  image?: string;
  stock?: number;
  isSoldOut?: boolean;
  showWhenSoldOut?: boolean;
};

export type VariantInventory = {
  colorValue: string;
  colorLabel?: string;
  colorHex?: string;
  colorImage?: string;
  gaugeValue: string;
  gaugeLabel?: string;
  stock?: number;
  isSoldOut?: boolean;
  showWhenSoldOut?: boolean;
};

export type ProductTags = {
  beginner?: boolean;
  intermediate?: boolean;
  advanced?: boolean;
  baseline?: boolean;
  serveVolley?: boolean;
  allCourt?: boolean;
  power?: boolean;
  powerHitter?: boolean;
};

export type Product = {
  _id: string;
  name?: string;
  brand?: string;
  price?: number;

  images?: string[];
  image?: string;
  imageUrl?: string;
  thumbnail?: string;

  shortDescription?: string;
  description?: string;
  additionalFeatures?: string;
  material?: string;
  category?: string;
  kind?: string;

  gauge?: string;
  gaugeOptions?: string[];
  gaugeInventories?: GaugeInventory[];

  color?: string;
  colorOptions?: string[];
  colorInventories?: ColorInventory[];

  variantInventories?: VariantInventory[];

  mountingFee?: number;
  shippingFee?: number;

  features?: ProductFeatures;
  inventory?: ProductInventory;
  tags?: ProductTags;

  isNew?: boolean | string | number;

  ratingCount?: number;
  ratingAvg?: number;
  ratingAverage?: number;
};

export type ProductPagination = {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type ProductListResponse = {
  products: Product[];
  pagination: ProductPagination;
};

export type ProductDetailResponse = {
  product: Product;
};
