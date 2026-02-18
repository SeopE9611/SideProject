import type { Db } from 'mongodb';

export async function ensureWishlistIndexes(db: Db) {
  const col = db.collection('wishlists');
  const existing = await col.listIndexes().toArray().catch(() => [] as any[]);
  const hasUniqueWishlist = existing.some((idx: any) => idx?.name === 'wishlist_user_product_unique');

  if (!hasUniqueWishlist) {
    await col.createIndex({ userId: 1, productId: 1 }, { name: 'wishlist_user_product_unique', unique: true });
  }
}
