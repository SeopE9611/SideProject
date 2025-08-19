import type { CreateIndexesOptions, Db, IndexDirection } from 'mongodb';
import { ObjectId } from 'mongodb';

type Keys = Record<string, IndexDirection>;

/**
 * 존재하지 않는 컬렉션이면 만들고,
 * 동일 키 인덱스가 있으면 스킵,
 * 이름만 다르면 무시하고 통과.
 */
async function ensureIndex(db: Db, collectionName: string, keys: Keys, options: CreateIndexesOptions = {}) {
  const col = db.collection(collectionName);

  // 0) 컬렉션이 없으면 먼저 생성 시도 (있으면 no-op)
  try {
    await db.createCollection(collectionName);
  } catch (_) {
    // already exists -> 무시
  }

  // 1) 동일 키 인덱스 있는지 확인 (이름 달라도 OK)
  let existingKeyMatch = false;
  try {
    const keySig = JSON.stringify(keys);
    const existing = await col.listIndexes().toArray();
    existingKeyMatch = existing.some((ix: any) => JSON.stringify(ix.key) === keySig);
  } catch (e: any) {
    // ns not exist (26) 등 -> 바로 생성 단계로 진행
  }
  if (existingKeyMatch) return;

  // 2) 생성 (이름 충돌/기존 다른 이름 인덱스는 무시)
  try {
    await col.createIndex(keys, options);
  } catch (e: any) {
    // 85: "Index already exists with a different name"
    if (e?.code === 85 || /already exists with a different name/i.test(e?.message)) {
      return;
    }
    // 드물게 ns not exist가 또 나오면 한 번 더 생성 시도
    if (e?.code === 26 || /ns does not exist/i.test(e?.message)) {
      await db.createCollection(collectionName).catch(() => {});
      await col.createIndex(keys, options);
      return;
    }
    throw e;
  }
}

export async function ensureReviewIndexes(db: Db) {
  // reviews 인덱스
  await ensureIndex(db, 'reviews', { userId: 1, createdAt: -1 }, { name: 'user_createdAt' });
  await ensureIndex(db, 'reviews', { productId: 1, status: 1, createdAt: -1 }, { name: 'product_list_index' });
  await ensureIndex(db, 'reviews', { status: 1, createdAt: -1 }, { name: 'status_createdAt' });

  // 중복 리뷰 방지(소프트삭제 제외)
  await ensureIndex(
    db,
    'reviews',
    { userId: 1, productId: 1 },
    {
      name: 'uniq_user_product_active_review',
      unique: true,
      partialFilterExpression: { isDeleted: { $ne: true }, productId: { $exists: true } },
    }
  );

  // 관리자 락 TTL (컬렉션 없을 수 있음 → ensureIndex가 생성까지 처리)
  await ensureIndex(db, 'admin_locks', { lockedUntil: 1 }, { name: 'ttl_locked_until', expireAfterSeconds: 0 });
}

export async function dedupActiveReviews(db: any) {
  const col = db.collection('reviews');
  const dups = await col
    .aggregate([{ $match: { isDeleted: { $ne: true }, productId: { $exists: true } } }, { $group: { _id: { userId: '$userId', productId: '$productId' }, ids: { $push: '$_id' }, cnt: { $sum: 1 } } }, { $match: { cnt: { $gt: 1 } } }])
    .toArray();

  let affected = 0;
  for (const g of dups) {
    const ids: ObjectId[] = g.ids;
    // 최신 것만 남기고 나머지 소프트 삭제(원하면 createdAt 기준 정렬)
    const toDelete = ids.slice(0, -1);
    if (toDelete.length) {
      const r = await col.updateMany({ _id: { $in: toDelete } }, { $set: { isDeleted: true, deletedAt: new Date(), status: 'hidden' } });
      affected += r.modifiedCount;
    }
  }
  return { duplicatedGroups: dups.length, softDeleted: affected };
}

export async function rebuildProductRatingSummary(db: any) {
  const reviews = db.collection('reviews');
  const products = db.collection('products');

  const pids = await reviews.distinct('productId', { productId: { $exists: true } });
  let updated = 0;

  for (const pid of pids) {
    const agg = await reviews.aggregate([{ $match: { productId: new ObjectId(String(pid)), status: 'visible', isDeleted: { $ne: true } } }, { $group: { _id: null, avg: { $avg: '$rating' }, cnt: { $sum: 1 } } }]).next();

    const r = await products.updateOne({ _id: new ObjectId(String(pid)) }, { $set: { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg ? agg.cnt : 0 } });
    updated += r.modifiedCount;
  }
  return { productsUpdated: updated, totalProducts: pids.length };
}
