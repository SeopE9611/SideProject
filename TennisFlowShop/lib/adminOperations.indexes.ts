import type { Db, IndexDirection } from "mongodb";
import { hasMatchingIndex } from "@/lib/indexes.utils";

type Keys = Record<string, IndexDirection>;

type IndexSpec = {
  readonly keys: Keys;
  readonly options?: Record<string, unknown>;
  readonly name: string;
};

/**
 * 운영통합센터(/admin/operations) 검색의 exact/prefix 경로를 위한 최소 인덱스.
 * - contains 자유검색(title 등)은 범위 밖이므로 포함하지 않는다.
 * - stringingApplicationId / orderId / rentalId 같은 식별자성 필드만 우선 보장한다.
 */
const ADMIN_OPERATIONS_INDEX_SPECS: Readonly<Record<string, readonly IndexSpec[]>> =
  {
    orders: [
      {
        name: "ops_orders_stringingApplicationId_idx",
        keys: { stringingApplicationId: 1 },
      },
    ],
    rental_orders: [
      {
        name: "ops_rental_orders_stringingApplicationId_idx",
        keys: { stringingApplicationId: 1 },
      },
    ],
    stringing_applications: [
      {
        name: "ops_apps_stringingApplicationId_idx",
        keys: { stringingApplicationId: 1 },
      },
      {
        name: "ops_apps_orderId_idx",
        keys: { orderId: 1 },
      },
      {
        name: "ops_apps_rentalId_idx",
        keys: { rentalId: 1 },
      },
    ],
  };

async function ensureCollectionIndexes(
  db: Db,
  collectionName: string,
  specs: readonly IndexSpec[],
) {
  const col = db.collection(collectionName);
  const existing = await col
    .listIndexes()
    .toArray()
    .catch(() => [] as any[]);

  for (const spec of specs) {
    if (hasMatchingIndex(existing as any[], spec)) continue;
    await col.createIndex(spec.keys, {
      name: spec.name,
      ...(spec.options ?? {}),
    });
  }
}

export async function ensureAdminOperationsIndexes(db: Db) {
  for (const [collectionName, specs] of Object.entries(
    ADMIN_OPERATIONS_INDEX_SPECS,
  )) {
    await ensureCollectionIndexes(db, collectionName, specs);
  }
}

export { ADMIN_OPERATIONS_INDEX_SPECS };
