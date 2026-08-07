import type { StringingSlotSummary } from "../types/stringing";
import { getJson } from "./http";

export function getStringingReservedSlots(
  date: string,
  requiredPassCount = 1,
  signal?: AbortSignal,
): Promise<StringingSlotSummary> {
  const cap = Math.max(1, Math.floor(requiredPassCount || 1));

  const query = new URLSearchParams({
    date,
    cap: String(cap),
  });

  return getJson<StringingSlotSummary>(`/api/applications/stringing/reserved?${query.toString()}`, signal);
}
