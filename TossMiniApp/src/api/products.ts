import type { ProductDetailResponse, ProductListResponse } from "../types/product";
import { getJson } from "./http";

export type StringingProductsQuery = { page?: number; limit?: number; q?: string };

export function getStringingProducts(
  signal?: AbortSignal,
  query: StringingProductsQuery = {},
): Promise<ProductListResponse> {
  const params = new URLSearchParams({
    purpose: "stringing",
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 12),
    sort: "latest",
  });
  if (query.q?.trim()) params.set("q", query.q.trim());
  return getJson<ProductListResponse>(`/api/products?${params.toString()}`, signal);
}

export function getProductDetail(productId: string, signal?: AbortSignal): Promise<ProductDetailResponse> {
  return getJson<ProductDetailResponse>(`/api/products/${encodeURIComponent(productId)}`, signal);
}
