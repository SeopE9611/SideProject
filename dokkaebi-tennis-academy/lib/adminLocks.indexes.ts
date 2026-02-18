import type { Db } from 'mongodb';

export async function ensureAdminLocksIndexes(db: Db) {
  const col = db.collection('admin_locks');
  const existing = await col.listIndexes().toArray().catch(() => [] as any[]);

  const hasKeyUnique = existing.some((idx: any) => idx?.name === 'admin_locks_key_unique');
  if (!hasKeyUnique) {
    await col.createIndex({ key: 1 }, { name: 'admin_locks_key_unique', unique: true });
  }

  const hasTtl = existing.some((idx: any) => idx?.name === 'ttl_locked_until');
  if (!hasTtl) {
    await col.createIndex({ lockedUntil: 1 }, { name: 'ttl_locked_until', expireAfterSeconds: 0 });
  }
}
