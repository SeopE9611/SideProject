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
  const existing = await col.indexes();

  for (const spec of REVENUE_REPORT_SNAPSHOT_INDEX_SPECS) {
    if (hasMatchingIndex(existing, spec)) continue;
    await col.createIndex(spec.keys, {
      name: spec.name,
      ...(spec.options ?? {}),
    });
  }
}
