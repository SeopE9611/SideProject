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

  // 컬렉션이 없으면 먼저 생성 시도 (있으면 no-op)
  try {
    await db.createCollection(collectionName);
  } catch (_) {
    // already exists -> 무시
  }

  // 동일 키 인덱스 있는지 확인 (이름 달라도 OK)
  let existingKeyMatch = false;
  try {
    const keySig = JSON.stringify(keys);
    const existing = await col.listIndexes().toArray();
    existingKeyMatch = existing.some((ix: any) => JSON.stringify(ix.key) === keySig);
  } catch (e: any) {
    // ns not exist (26) 등 -> 바로 생성 단계로 진행
  }
  if (existingKeyMatch) return;

  // 생성 (이름 충돌/기존 다른 이름 인덱스는 무시)
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
  // 레거시 유니크 인덱스 제거: (userId, productId) — 구형 정책
  try {
    await db.collection('reviews').dropIndex('uniq_user_product_active_review');
  } catch (_) {
    // 존재하지 않으면 무시
  }

  // 신정책 유니크 인덱스: (userId, productId, orderId) — 주문 단위 리뷰 1회
  await ensureIndex(
    db,
    'reviews',
    { userId: 1, productId: 1, orderId: 1 },
    {
      name: 'user_product_order_unique',
      unique: true,
      // 과거 문서(orderId 없음)는 제외 → 새 정책과 충돌 방지
      partialFilterExpression: {
        isDeleted: { $ne: true },
        productId: { $exists: true },
        orderId: { $exists: true },
      },
    }
  );

  // 신정책 유니크 인덱스: (userId, service, serviceApplicationId) — 서비스 리뷰 1회
  await ensureIndex(
    db,
    'reviews',
    { userId: 1, service: 1, serviceApplicationId: 1 },
    {
      name: 'user_service_app_unique',
      unique: true,
      partialFilterExpression: {
        isDeleted: { $ne: true },
        serviceApplicationId: { $exists: true },
      },
    }
  );

  // 조회/정렬용 인덱스(중복이면 ensureIndex가 스킵)
  await ensureIndex(db, 'reviews', { userId: 1, createdAt: -1 }, { name: 'user_createdAt' });
  await ensureIndex(db, 'reviews', { productId: 1, status: 1, createdAt: -1 }, { name: 'product_list_index' });
  await ensureIndex(db, 'reviews', { status: 1, createdAt: -1, _id: -1 }, { name: 'status_created_desc' });
  await ensureIndex(db, 'reviews', { status: 1, helpfulCount: -1, _id: -1 }, { name: 'status_helpful_desc' });
  await ensureIndex(db, 'reviews', { status: 1, rating: -1, _id: -1 }, { name: 'status_rating_desc' });

  // 관리자 락 TTL (컬렉션 없을 수 있음 → ensureIndex가 생성까지 처리)
  await ensureIndex(db, 'admin_locks', { lockedUntil: 1 }, { name: 'ttl_locked_until', expireAfterSeconds: 0 });
}

export async function dedupActiveReviews(db: Db) {
  const col = db.collection('reviews');

  // 안전모드: "동일 주문" 내 중복만 정리
  // (userId, productId, orderId) 기준으로 2건 이상이면 과거 것을 soft-delete
  const dups = await col
    .aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          productId: { $exists: true },
          orderId: { $exists: true },
        },
      },
      {
        $group: {
          _id: { userId: '$userId', productId: '$productId', orderId: '$orderId' },
          docs: { $push: { _id: '$_id', createdAt: '$createdAt' } },
          cnt: { $sum: 1 },
        },
      },
      { $match: { cnt: { $gt: 1 } } },
    ])
    .toArray();

  let affected = 0;
  for (const g of dups) {
    // createdAt 오름차순 -> 가장 최신(마지막)만 보존
    const sorted = g.docs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const toDelete = sorted.slice(0, -1).map((x: any) => x._id);
    if (toDelete.length) {
      const r = await col.updateMany({ _id: { $in: toDelete } }, { $set: { isDeleted: true, deletedAt: new Date(), status: 'hidden' } });
      affected += r.modifiedCount;
    }
  }

  // orderId 없는 과거(레거시) 리뷰는 건드리지 않음
  // (구매 이력 매칭 불명확 -> 안전하게 보존)
  return { duplicatedGroups: dups.length, softDeleted: affected };
}
