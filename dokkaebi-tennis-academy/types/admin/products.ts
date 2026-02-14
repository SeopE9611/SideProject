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
