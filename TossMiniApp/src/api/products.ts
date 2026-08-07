import type { ProductDetailResponse, ProductListResponse } from "../types/product";
import { getJson } from "./http";

const STRINGING_PRODUCTS_PATH = "/api/products?purpose=stringing&page=1&limit=12&sort=latest";

export function getStringingProducts(signal?: AbortSignal): Promise<ProductListResponse> {
  return getJson<ProductListResponse>(STRINGING_PRODUCTS_PATH, signal);
}

export function getProductDetail(productId: string, signal?: AbortSignal): Promise<ProductDetailResponse> {
  return getJson<ProductDetailResponse>(`/api/products/${encodeURIComponent(productId)}`, signal);
}
