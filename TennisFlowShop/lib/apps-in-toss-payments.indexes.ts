import type { Db, IndexDirection } from "mongodb";
import { hasMatchingIndex } from "@/lib/indexes.utils";

type IndexSpec = { readonly keys: Record<string, IndexDirection>; readonly options?: Record<string, unknown>; readonly name: string };
export const APPS_IN_TOSS_PAYMENT_INDEX_SPECS: Readonly<Record<string, readonly IndexSpec[]>> = {
  apps_in_toss_payment_intents: [
    { name: "apps_in_toss_payment_intents_attemptId_unique", keys: { attemptId: 1 }, options: { unique: true } },
    { name: "apps_in_toss_payment_intents_orderNo_unique", keys: { orderNo: 1 }, options: { unique: true } },
    { name: "apps_in_toss_payment_intents_payToken_unique", keys: { payToken: 1 }, options: { unique: true, sparse: true } },
    { name: "apps_in_toss_payment_intents_finalOrderId_unique", keys: { finalOrderId: 1 }, options: { unique: true, sparse: true } },
    { name: "apps_in_toss_payment_intents_user_created_desc", keys: { userId: 1, createdAt: -1 } },
    { name: "apps_in_toss_payment_intents_state_executionLease_idx", keys: { state: 1, "execution.leaseUntil": 1 } },
    { name: "apps_in_toss_payment_intents_retentionUntil_ttl", keys: { retentionUntil: 1 }, options: { expireAfterSeconds: 0 } },
  ],
};
export async function ensureAppsInTossPaymentIndexes(db: Db) {
  for (const [collectionName, specs] of Object.entries(APPS_IN_TOSS_PAYMENT_INDEX_SPECS)) {
    const collection = db.collection(collectionName); const existing = await collection.listIndexes().toArray().catch(() => []);
    for (const spec of specs) if (!hasMatchingIndex(existing, spec)) await collection.createIndex(spec.keys, { name: spec.name, ...(spec.options ?? {}) });
  }
}
