import type { Db, IndexDirection } from 'mongodb';
import { hasMatchingIndex } from '@/lib/indexes.utils';

type Keys = Record<string, IndexDirection>;

type IndexSpec = {
  readonly keys: Keys;
  readonly options?: Record<string, unknown>;
  readonly name: string;
};

const AUTH_INDEX_SPECS: Readonly<Record<string, readonly IndexSpec[]>> = {
  oauth_pending_signups: [
    {
      name: 'ttl_oauth_pending_expiresAt',
      keys: { expiresAt: 1 },
      options: { expireAfterSeconds: 0 },
    },
  ],
  user_sessions: [
    {
      name: 'user_sessions_user_at_desc',
      keys: { userId: 1, at: -1 },
    },
  ],
};

async function ensureCollectionIndexes(db: Db, collectionName: string, specs: readonly IndexSpec[]) {
  const col = db.collection(collectionName);
  const existing = await col.listIndexes().toArray().catch(() => [] as any[]);

  for (const spec of specs) {
    if (hasMatchingIndex(existing as any[], spec)) continue;

    await col.createIndex(spec.keys, {
      name: spec.name,
      ...(spec.options ?? {}),
    });
  }
}

export async function ensureAuthIndexes(db: Db) {
  for (const [collectionName, specs] of Object.entries(AUTH_INDEX_SPECS)) {
    await ensureCollectionIndexes(db, collectionName, specs);
  }
}

export { AUTH_INDEX_SPECS };
