export type ProductInventory = {
  stock: number;
  lowStock: number;
  status: "instock" | "outofstock" | "backorder";
  manageStock: boolean;
  allowBackorder: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isSale: boolean;
  salePrice: number;
  hideGaugeStock?: boolean;
};
export type ProductGaugeInventory = {
  value: string;
  label?: string;
  stock: number;
  isSoldOut: boolean;
  showWhenSoldOut?: boolean | null;
};
export type ProductColorInventory = {
  value: string;
  label?: string;
  colorHex?: string;
  image?: string;
  stock: number;
  isSoldOut: boolean;
  showWhenSoldOut?: boolean | null;
};
export type ProductVariantInventory = {
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

export type ProductFeatureScores = {
  /** 1~100 */
  power: number;
  /** 1~100 */
  control: number;
  /** 1~100 */
  spin: number;
  /** 1~100 */
  durability: number;
  /** 1~100 */
  comfort: number;
};

export type ProductTags = {
  beginner: boolean;
  intermediate: boolean;
  advanced: boolean;
  baseline: boolean;
  serveVolley: boolean;
  allCourt: boolean;
  power: boolean;
};

export type HybridSpecUnit = {
  brand: string;
  name: string;
  gauge: string;
  gaugeOptions?: string[];
  gaugeInventories?: ProductGaugeInventory[];
  color: string;
  role?: "mains" | "cross";
};

export type ProductDetail = {
  name: string;
  sku: string;
  shortDescription: string;
  description: string;
  brand: string;
  material: string;
  gauge: string;
  gaugeOptions?: string[];
  gaugeInventories?: ProductGaugeInventory[];
  color: string;
  colorOptions?: string[];
  colorInventories?: ProductColorInventory[];
  variantInventories?: ProductVariantInventory[];
  length: string;
  price: number;
  mountingFee: number;
  shippingFee: number;
  searchKeywords?: string[];
  specifications?: {
    hybrid?: {
      main?: Partial<HybridSpecUnit>;
      cross?: Partial<HybridSpecUnit>;
    };
  };
  features: ProductFeatureScores;
  tags: ProductTags;
  inventory: ProductInventory;
  additionalFeatures: string;
  images: string[];
  isVisible?: boolean;
};

export type ProductDetailResponse = {
  product: ProductDetail;
};

export type ProductListStatus = "all" | "active" | "low_stock" | "out_of_stock";
export type ProductExposureFilter = "all" | "featured" | "new" | "sale";

export type ProductListSortKey =
  "name" | "brand" | "gauge" | "material" | "price" | "stock" | "createdAt";

export interface AdminProductsListRequestDto {
  page: number;
  pageSize: number;
  q: string;
  brand: string;
  material: string;
  status: ProductListStatus;
  exposure: ProductExposureFilter;
  sortField: ProductListSortKey | null;
  sortDirection: "asc" | "desc";
}

export interface AdminProductCreateRequestDto {
  name: string;
  price: number;
  shippingFee: number;
  raw: Record<string, unknown>;
  isVisible?: boolean;
}

export interface AdminProductListItemDto extends Record<string, unknown> {
  computedStatus: Exclude<ProductListStatus, "all">;
}

export interface AdminProductsListResponseDto {
  items: AdminProductListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalsByStatus: Record<Exclude<ProductListStatus, "all">, number>;
}

export interface AdminProductMutationResponseDto {
  message: string;
  id?: string;
}

export interface AdminProductUpdateRequestDto {
  name: string;
  sku: string;
  shortDescription: string;
  description: string;
  brand: string;
  material: string;
  gauge: string;
  gaugeOptions?: string[];
  gaugeInventories?: ProductGaugeInventory[];
  color: string;
  colorOptions?: string[];
  colorInventories?: ProductColorInventory[];
  variantInventories?: ProductVariantInventory[];
  length: string;
  mountingFee: number;
  price: number;
  shippingFee: number;
  isVisible?: boolean;
  features: Record<string, unknown>;
  tags: Record<string, unknown>;
  specifications: Record<string, unknown>;
  additionalFeatures: string;
  images: string[];
  inventory: Record<string, unknown>;
  searchKeywords: string[];
}
