import type { ProductListResponse } from "../types/product";
import { getJson } from "./http";

const STRINGING_PRODUCTS_PATH = "/api/products?purpose=stringing&page=1&limit=12&sort=latest";

export function getStringingProducts(signal?: AbortSignal): Promise<ProductListResponse> {
  return getJson<ProductListResponse>(STRINGING_PRODUCTS_PATH, signal);
}
