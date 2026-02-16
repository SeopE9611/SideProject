export type ProductInventory = {
  stock: number;
  lowStock: number;
  status: 'instock' | 'outofstock' | 'backorder';
  manageStock: boolean;
  allowBackorder: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isSale: boolean;
  salePrice: number;
};

export type ProductFeatureScores = {
  power: number;
  control: number;
  spin: number;
  durability: number;
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

export type HybridSpecUnit = { brand: string; name: string; gauge: string; color: string; role?: 'mains' | 'cross' };

export type ProductDetail = {
  name: string;
  sku: string;
  shortDescription: string;
  description: string;
  brand: string;
  material: string;
  gauge: string;
  color: string;
  length: string;
  price: number;
  mountingFee: number;
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
};

export type ProductDetailResponse = {
  product: ProductDetail;
};

export type ProductListStatus = 'all' | 'active' | 'low_stock' | 'out_of_stock';

export type ProductListSortKey = 'name' | 'brand' | 'gauge' | 'material' | 'price' | 'stock' | 'createdAt';

export interface AdminProductsListRequestDto {
  page: number;
  pageSize: number;
  q: string;
  brand: string;
  material: string;
  status: ProductListStatus;
  sortField: ProductListSortKey | null;
  sortDirection: 'asc' | 'desc';
}

export interface AdminProductCreateRequestDto {
  name: string;
  price: number;
  raw: Record<string, unknown>;
}

export interface AdminProductListItemDto extends Record<string, unknown> {
  computedStatus: Exclude<ProductListStatus, 'all'>;
}

export interface AdminProductsListResponseDto {
  items: AdminProductListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalsByStatus: Record<Exclude<ProductListStatus, 'all'>, number>;
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
  color: string;
  length: string;
  mountingFee: number;
  price: number;
  features: Record<string, unknown>;
  tags: Record<string, unknown>;
  specifications: Record<string, unknown>;
  additionalFeatures: string;
  images: string[];
  inventory: Record<string, unknown>;
  searchKeywords: string[];
}
