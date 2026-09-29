import type { StringingCheckoutQuote, StringingCollectionMethod, StringingSlotSummary } from "../types/stringing";
import { getJson, postJson } from "./http";

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

export function getStringingCheckoutQuote(
  productId: string,
  collectionMethod: StringingCollectionMethod,
  signal?: AbortSignal,
): Promise<StringingCheckoutQuote> {
  return postJson<
    StringingCheckoutQuote,
    {
      productId: string;
      collectionMethod: "self_ship" | "visit";
    }
  >(
    "/api/apps-in-toss/checkout/quote",
    {
      productId,
      collectionMethod: collectionMethod === "visit" ? "visit" : "self_ship",
    },
    signal,
  );
}
