import type { Db, IndexDirection } from 'mongodb';
import { hasMatchingIndex } from '@/lib/indexes.utils';

type Keys = Record<string, IndexDirection>;

type IndexSpec = {
  readonly keys: Keys;
  readonly options?: Record<string, unknown>;
  readonly name: string;
};

const USER_INDEX_SPECS: readonly IndexSpec[] = [
  {
    name: 'users_email_unique',
    keys: { email: 1 },
    options: { unique: true, background: true },
  },
  {
    name: 'users_lastLoginAt_idx',
    keys: { lastLoginAt: -1 },
  },
];

export async function ensureUserIndexes(db: Db) {
  const col = db.collection('users');
  const existing = await col.listIndexes().toArray().catch(() => [] as any[]);

  for (const spec of USER_INDEX_SPECS) {
    if (hasMatchingIndex(existing as any[], spec)) continue;

    await col.createIndex(spec.keys, {
      name: spec.name,
      ...(spec.options ?? {}),
    });
  }
}

export { USER_INDEX_SPECS };
