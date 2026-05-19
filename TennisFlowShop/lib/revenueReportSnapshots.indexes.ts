import type { Db, IndexDirection } from "mongodb";

import { hasMatchingIndex } from "@/lib/indexes.utils";

type IndexSpec = {
  keys: Record<string, IndexDirection>;
  name: string;
  options?: Record<string, unknown>;
};

const COLLECTION = "revenue_report_snapshots";

const REVENUE_REPORT_SNAPSHOT_INDEX_SPECS: readonly IndexSpec[] = [
  {
    name: "revenue_report_snapshots_yyyymm_unique",
    keys: { yyyymm: 1 },
    options: { unique: true },
  },
  {
    name: "revenue_report_snapshots_updatedAt_yyyymm_desc",
    keys: { updatedAt: -1, yyyymm: -1 },
    options: {},
  },
];

export async function ensureRevenueReportSnapshotIndexes(db: Db) {
  const col = db.collection(COLLECTION);
  try {
    await db.createCollection(COLLECTION);
  } catch (error) {
    if (!isNamespaceExistsError(error)) {
      throw error;
    }
  }

  let existing = [];
  try {
    existing = await col.listIndexes().toArray();
  } catch (error) {
    if (!isNamespaceNotFoundError(error)) {
      throw error;
    }
    existing = [];
  }

  for (const spec of REVENUE_REPORT_SNAPSHOT_INDEX_SPECS) {
    if (hasMatchingIndex(existing, spec)) continue;
    await col.createIndex(spec.keys, {
      name: spec.name,
      ...(spec.options ?? {}),
    });
  }
}

function isNamespaceNotFoundError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const maybeError = error as { code?: unknown; codeName?: unknown };
  return (
    maybeError.codeName === "NamespaceNotFound" || maybeError.code === 26
  );
}

function isNamespaceExistsError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const maybeError = error as { code?: unknown; codeName?: unknown };
  return maybeError.codeName === "NamespaceExists" || maybeError.code === 48;
}
