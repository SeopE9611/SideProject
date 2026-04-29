import type { Db, IndexDirection } from "mongodb";
import { hasMatchingIndex } from "@/lib/indexes.utils";

type Keys = Record<string, IndexDirection>;

type IndexSpec = {
  readonly keys: Keys;
  readonly options?: Record<string, unknown>;
  readonly name: string;
};

const ADMIN_NOTES_INDEX_SPECS: readonly IndexSpec[] = [
  {
    name: "admin_notes_target_createdAt_idx",
    keys: { targetType: 1, targetId: 1, createdAt: -1 },
  },
];

export async function ensureAdminNotesIndexes(db: Db) {
  const col = db.collection("admin_notes");
  const existing = await col
    .listIndexes()
    .toArray()
    .catch(() => [] as any[]);

  for (const spec of ADMIN_NOTES_INDEX_SPECS) {
    if (hasMatchingIndex(existing as any[], spec)) continue;
    await col.createIndex(spec.keys, {
      name: spec.name,
      ...(spec.options ?? {}),
    });
  }
}

export { ADMIN_NOTES_INDEX_SPECS };
