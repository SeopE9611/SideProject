import type { ProductDetail } from '@/types/admin/products';

export const MAX_PRODUCT_IMAGE_COUNT = 4;

export type HybridMainSpec = { brand: string; name: string; gauge: string; color: string; role: 'mains' };
export type HybridCrossSpec = { brand: string; name: string; gauge: string; color: string; role: 'cross' };

export type ProductBasicInfoForm = {
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
};

export type ProductEditSnapshotInput = {
  basicInfo: ProductBasicInfoForm;
  features: ProductDetail['features'];
  tags: ProductDetail['tags'];
  inventory: { stock: number; lowStock: number; status: string; manageStock: boolean; allowBackorder: boolean; isFeatured: boolean; isNew: boolean; isSale: boolean; salePrice: number };
  searchKeywordsInput: string;
  additionalFeatures: string;
  images: string[];
  hybridMain: HybridMainSpec;
  hybridCross: HybridCrossSpec;
};

export type ProductEditHydbridState = {
  hybridMain: HybridMainSpec;
  hybridCross: HybridCrossSpec;
};

export function normalizeHybridState(product: ProductDetail): ProductEditHydbridState {
  return {
    hybridMain: product?.specifications?.hybrid
      ? {
          brand: product.specifications.hybrid.main?.brand ?? '',
          name: product.specifications.hybrid.main?.name ?? '',
          gauge: product.specifications.hybrid.main?.gauge ?? '',
          color: product.specifications.hybrid.main?.color ?? '',
          role: 'mains',
        }
      : { brand: '', name: '', gauge: '', color: '', role: 'mains' },
    hybridCross: product?.specifications?.hybrid
      ? {
          brand: product.specifications.hybrid.cross?.brand ?? '',
          name: product.specifications.hybrid.cross?.name ?? '',
          gauge: product.specifications.hybrid.cross?.gauge ?? '',
          color: product.specifications.hybrid.cross?.color ?? '',
          role: 'cross',
        }
      : { brand: '', name: '', gauge: '', color: '', role: 'cross' },
  };
}

export function buildProductEditInitialSnapshot(product: ProductDetail): string {
  const hybridState = normalizeHybridState(product);
  return buildProductEditSnapshot({
    basicInfo: {
      name: product.name,
      sku: product.sku,
      shortDescription: product.shortDescription,
      description: product.description,
      brand: product.brand,
      material: product.material,
      gauge: product.gauge,
      color: product.color,
      length: product.length,
      price: product.price,
      mountingFee: product.mountingFee,
    },
    features: product.features,
    tags: product.tags,
    inventory: {
      stock: product.inventory.stock,
      lowStock: product.inventory.lowStock,
      status: product.inventory.status,
      manageStock: product.inventory.manageStock,
      allowBackorder: product.inventory.allowBackorder,
      isFeatured: product.inventory.isFeatured,
      isNew: product.inventory.isNew,
      isSale: product.inventory.isSale,
      salePrice: product.inventory.salePrice,
    },
    searchKeywordsInput: Array.isArray(product.searchKeywords) ? product.searchKeywords.join(', ') : '',
    additionalFeatures: product.additionalFeatures,
    images: product.images,
    hybridMain: hybridState.hybridMain,
    hybridCross: hybridState.hybridCross,
  });
}

export function buildProductEditSnapshot(input: ProductEditSnapshotInput): string {
  return JSON.stringify(input);
}

export function sanitizeUploadFileName(fileName: string, timestamp = Date.now()): string {
  const extension = fileName.split('.').pop();
  const base = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '');

  return `${timestamp}-${base}.${extension}`;
}

export function reorderMainImage(images: string[], index: number): string[] {
  if (index <= 0 || index >= images.length) return images;
  const selected = images[index];
  const remaining = images.filter((_, i) => i !== index);
  return [selected, ...remaining];
}

export function removeImageByIndex(images: string[], index: number): string[] {
  if (index < 0 || index >= images.length) return images;
  return images.filter((_, i) => i !== index);
}
