export type ProductInventory = {
  stock?: number;
  manageStock?: boolean;
  status?: string;
  isFeatured?: boolean | string | number;
  isNew?: boolean | string | number;
  isSale?: boolean | string | number;
  salePrice?: number | string | null;
};
export type ProductFeatures = {
  power?: number;
  control?: number;
  spin?: number;
  durability?: number;
  comfort?: number;
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
  material?: string;

  mountingFee?: number;
  shippingFee?: number;

  features?: ProductFeatures;
  inventory?: ProductInventory;

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
