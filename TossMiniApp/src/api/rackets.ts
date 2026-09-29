import type { RacketAvailability, RacketDetail, RacketsListResponse } from "../types/racket";
import { getJson } from "./http";

export type RacketListQuery = {
  page?: number;
  limit?: number;
  sort?: "latest" | "price-low" | "price-high";
  q?: string;
  brand?: string;
  cond?: "A" | "B" | "C" | "";
  rentOnly?: boolean;
};

export function getRackets(query: RacketListQuery = {}, signal?: AbortSignal) {
  const params = new URLSearchParams({
    withTotal: "1",
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 12),
    sort: query.sort ?? "latest",
  });
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.brand) params.set("brand", query.brand);
  if (query.cond) params.set("cond", query.cond);
  if (query.rentOnly) params.set("rentOnly", "1");
  return getJson<RacketsListResponse>(`/api/rackets?${params.toString()}`, signal);
}

export function getRacketDetail(racketId: string, signal?: AbortSignal) {
  return getJson<RacketDetail>(`/api/rackets/${encodeURIComponent(racketId)}`, signal);
}

export function getRacketAvailability(racketId: string, signal?: AbortSignal) {
  return getJson<RacketAvailability>(`/api/rentals/active-count/${encodeURIComponent(racketId)}`, signal);
}
