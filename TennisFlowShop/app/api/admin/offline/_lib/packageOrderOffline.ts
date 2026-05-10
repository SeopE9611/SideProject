import type { Document, Filter } from "mongodb";

export const OFFLINE_PACKAGE_ORDER_FILTER: Filter<Document> = {
  $or: [{ "meta.source": "offline_admin" }, { "meta.channel": "offline" }],
};

export const EXCLUDE_OFFLINE_PACKAGE_ORDERS_FILTER: Filter<Document> = {
  $and: [
    { "meta.source": { $ne: "offline_admin" } },
    { "meta.channel": { $ne: "offline" } },
  ],
};

export function isOfflinePackageOrder(order: unknown): boolean {
  const meta = (order as { meta?: Record<string, unknown> | null } | null | undefined)?.meta;
  return meta?.source === "offline_admin" || meta?.channel === "offline";
}
