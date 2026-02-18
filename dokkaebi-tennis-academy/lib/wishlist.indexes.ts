import type { Db } from 'mongodb';
import { hasMatchingIndex } from '@/lib/indexes.utils';

export async function ensureWishlistIndexes(db: Db) {
  const col = db.collection('wishlists');
  const existing = await col.listIndexes().toArray().catch(() => [] as any[]);
  const spec = {
    name: 'wishlist_user_product_unique',
    keys: { userId: 1, productId: 1 },
    options: { unique: true },
  } as const;

  if (!hasMatchingIndex(existing as any[], spec)) {
    await col.createIndex(spec.keys, { name: spec.name, ...(spec.options ?? {}) });
  }
}
