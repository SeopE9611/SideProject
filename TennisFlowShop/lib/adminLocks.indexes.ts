import type { Db } from 'mongodb';
import { hasMatchingIndex } from '@/lib/indexes.utils';

export async function ensureAdminLocksIndexes(db: Db) {
  const col = db.collection('admin_locks');
  const existing = await col.listIndexes().toArray().catch(() => [] as any[]);

  const keyUniqueSpec = {
    name: 'admin_locks_key_unique',
    keys: { key: 1 },
    options: { unique: true },
  } as const;

  if (!hasMatchingIndex(existing as any[], keyUniqueSpec)) {
    await col.createIndex(keyUniqueSpec.keys, { name: keyUniqueSpec.name, ...(keyUniqueSpec.options ?? {}) });
  }

  const ttlSpec = {
    name: 'ttl_locked_until',
    keys: { lockedUntil: 1 },
    options: { expireAfterSeconds: 0 },
  } as const;

  if (!hasMatchingIndex(existing as any[], ttlSpec)) {
    await col.createIndex(ttlSpec.keys, { name: ttlSpec.name, ...(ttlSpec.options ?? {}) });
  }
}
