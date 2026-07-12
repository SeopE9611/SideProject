import type { CreateIndexesOptions, Db, IndexDirection } from "mongodb";
import { ObjectId } from "mongodb";
import { inspectActiveReviewDuplicates } from "./reviews/review-duplicate-diagnostics.server";
import { refreshReviewSummaryCachesForTargets, resolveAffectedReviewTargets } from "./reviews/review-summary-cache.server";

type Keys = Record<string, IndexDirection>;

/**
 * 존재하지 않는 컬렉션이면 만들고,
 * 동일 키 인덱스가 있으면 스킵,
 * 이름만 다르면 무시하고 통과.
 */
async function ensureIndex(
  db: Db,
  collectionName: string,
  keys: Keys,
  options: CreateIndexesOptions = {},
) {
  const col = db.collection(collectionName);

  // 컬렉션이 없으면 먼저 생성 시도 (있으면 no-op)
  try {
    await db.createCollection(collectionName);
  } catch (_) {
    // already exists -> 무시
  }

  let existingDefinitionMatch = false;
  try {
    const keySig = JSON.stringify(keys);
    const existing = await col.listIndexes().toArray();
    const sameName = options.name ? existing.find((ix: any) => ix.name === options.name) : null;
    const sameKey = existing.find((ix: any) => JSON.stringify(ix.key) === keySig);
    const candidate = sameName ?? sameKey;
    if (candidate) {
      const expectedPartial = JSON.stringify(options.partialFilterExpression ?? null);
      const actualPartial = JSON.stringify(candidate.partialFilterExpression ?? null);
      existingDefinitionMatch =
        JSON.stringify(candidate.key) === keySig &&
        Boolean(candidate.unique) === Boolean(options.unique) &&
        Boolean(candidate.sparse) === Boolean(options.sparse) &&
        actualPartial === expectedPartial;
      if (!existingDefinitionMatch) {
        const error = new Error("indexDefinitionMismatch") as Error & { details?: unknown };
        error.details = {
          reason: "indexDefinitionMismatch",
          collection: collectionName,
          indexName: options.name ?? candidate.name,
          expected: { key: keys, unique: Boolean(options.unique), sparse: Boolean(options.sparse), partialFilterExpression: options.partialFilterExpression ?? null },
          actual: { key: candidate.key, unique: Boolean(candidate.unique), sparse: Boolean(candidate.sparse), partialFilterExpression: candidate.partialFilterExpression ?? null },
        };
        throw error;
      }
    }
  } catch (e: any) {
    // ns not exist (26) 등 -> 바로 생성 단계로 진행
    if (e?.message === "indexDefinitionMismatch") throw e;
  }
  if (existingDefinitionMatch) return;

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
  await ensureIndex(
    db,
    "review_photo_upload_sessions",
    { expiresAt: 1 },
    { name: "review_photo_upload_sessions_ttl", expireAfterSeconds: 0 },
  );
  const duplicates = await inspectActiveReviewDuplicates(db);
  if (duplicates.totalGroups > 0) {
    const error = new Error("duplicateReviewsDetected") as Error & { details?: unknown };
    error.details = {
      reason: "duplicateReviewsDetected",
      duplicates: {
        product: duplicates.productGroups.length,
        rental: duplicates.rentalGroups.length,
        service: duplicates.serviceGroups.length,
      },
      message: "중복 후기를 먼저 확인해 주세요.",
    };
    throw error;
  }
  // reviews 컬렉션 문서에 isDeleted가 없거나 null이면 false로 정규화
  await db
    .collection("reviews")
    .updateMany(
      { $or: [{ isDeleted: { $exists: false } }, { isDeleted: null }] },
      { $set: { isDeleted: false } },
    );

  // 신정책 유니크 인덱스: (userId, productId, orderId) — 주문 단위 리뷰 1회
  await ensureIndex(
    db,
    "reviews",
    { userId: 1, productId: 1, orderId: 1 },
    {
      name: "user_product_order_unique",
      unique: true,
      // 과거 문서(orderId 없음) 제외 + 삭제 아님만 포함 (partial index는 $or 로)
      partialFilterExpression: {
        productId: { $exists: true },
        orderId: { $exists: true },
        isDeleted: false,
      },
    },
  );

  // 신정책 유니크 인덱스: (userId, service, serviceApplicationId) — 서비스 리뷰 1회
  await ensureIndex(
    db,
    "reviews",
    { userId: 1, service: 1, serviceApplicationId: 1 },
    {
      name: "user_service_app_unique",
      unique: true,
      partialFilterExpression: {
        serviceApplicationId: { $exists: true },
        isDeleted: false,
      },
    },
  );

  // 신정책 유니크 인덱스: (userId, rentalId) — 대여/대여+교체서비스 리뷰 1회
  await ensureIndex(
    db,
    "reviews",
    { userId: 1, rentalId: 1 },
    {
      name: "user_rental_unique",
      unique: true,
      partialFilterExpression: {
        rentalId: { $exists: true },
        isDeleted: false,
      },
    },
  );

  // 조회/정렬용 인덱스(중복이면 ensureIndex가 스킵)
  await ensureIndex(db, "reviews", { userId: 1, createdAt: -1 }, { name: "user_createdAt" });
  await ensureIndex(
    db,
    "reviews",
    { productId: 1, status: 1, createdAt: -1 },
    { name: "product_list_index" },
  );
  await ensureIndex(
    db,
    "reviews",
    { status: 1, createdAt: -1, _id: -1 },
    { name: "status_created_desc" },
  );
  await ensureIndex(
    db,
    "reviews",
    { status: 1, helpfulCount: -1, _id: -1 },
    { name: "status_helpful_desc" },
  );
  await ensureIndex(
    db,
    "reviews",
    { status: 1, rating: -1, _id: -1 },
    { name: "status_rating_desc" },
  );

  // 리뷰 도움돼요 토글/집계용 인덱스
  await ensureIndex(
    db,
    "review_votes",
    { reviewId: 1, userId: 1 },
    { name: "review_user_unique", unique: true },
  );
  await ensureIndex(db, "review_votes", { reviewId: 1 }, { name: "reviewId_idx" });
}

export async function dedupActiveReviews(db: Db) {
  const col = db.collection("reviews");

  // 안전모드: "동일 주문" 내 중복만 정리
  // (userId, productId, orderId) 기준으로 2건 이상이면 과거 것을 soft-delete
  const dups = await col
    .aggregate([
      {
        $match: {
          isDeleted: false,
          productId: { $exists: true },
          orderId: { $exists: true },
        },
      },
      {
        $group: {
          _id: {
            userId: "$userId",
            productId: "$productId",
            orderId: "$orderId",
          },
          docs: { $push: { _id: "$_id", createdAt: "$createdAt" } },
          cnt: { $sum: 1 },
        },
      },
      { $match: { cnt: { $gt: 1 } } },
    ])
    .toArray();

  let affected = 0;
  for (const g of dups) {
    // createdAt 오름차순 -> 가장 최신(마지막)만 보존
    const sorted = g.docs.sort(
      (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const toDelete = sorted.slice(0, -1).map((x: any) => x._id);
    if (toDelete.length) {
      const r = await col.updateMany(
        { _id: { $in: toDelete } },
        { $set: { isDeleted: true, deletedAt: new Date(), status: "hidden" } },
      );
      affected += r.modifiedCount;
    }
  }

  // orderId 없는 과거(레거시) 리뷰는 건드리지 않음
  // (구매 이력 매칭 불명확 -> 안전하게 보존)
  return { duplicatedGroups: dups.length, softDeleted: affected };
}

async function runLimited<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await worker(current);
    }
  });
  await Promise.all(workers);
}

export async function rebuildPublicReviewSummaryCaches(db: Db) {
  const products = db.collection("products");
  const rackets = db.collection("used_rackets");
  const reviews = db.collection("reviews");

  const [productsResetResult, racketsResetResult] = await Promise.all([
    products.updateMany(
      {
        $or: [
          { ratingCount: { $exists: true } },
          { ratingAvg: { $exists: true } },
          { ratingAverage: { $exists: true } },
          { reviewSummaryUpdatedAt: { $exists: true } },
        ],
      },
      { $set: { ratingAvg: 0, ratingAverage: 0, ratingCount: 0, reviewSummaryUpdatedAt: new Date() } },
    ),
    rackets.updateMany(
      {
        $or: [
          { ratingCount: { $exists: true } },
          { reviewCount: { $exists: true } },
          { ratingAvg: { $exists: true } },
          { ratingAverage: { $exists: true } },
          { reviewSummaryUpdatedAt: { $exists: true } },
        ],
      },
      { $set: { ratingAvg: 0, ratingAverage: 0, ratingCount: 0, reviewCount: 0, reviewSummaryUpdatedAt: new Date() } },
    ),
  ]);

  const productIds = new Set<string>();
  const racketIds = new Set<string>();
  let reviewsScanned = 0;
  const cursor = reviews.find(
    { status: "visible", isDeleted: { $ne: true } },
    {
      projection: {
        productId: 1,
        racketId: 1,
        relatedProductIds: 1,
        relatedRacketIds: 1,
        orderId: 1,
        rentalId: 1,
        serviceApplicationId: 1,
        applicationId: 1,
        reviewContext: 1,
        reviewType: 1,
        service: 1,
      },
    },
  );

  for await (const review of cursor) {
    reviewsScanned += 1;
    const targets = await resolveAffectedReviewTargets(db, review as Record<string, unknown>);
    targets.productIds.forEach((id) => productIds.add(id));
    targets.racketIds.forEach((id) => racketIds.add(id));
  }

  let productsUpdated = 0;
  let racketsUpdated = 0;
  await runLimited([...productIds], 6, async (productId) => {
    const result = await refreshReviewSummaryCachesForTargets(db, { productIds: [productId], racketIds: [] });
    productsUpdated += result.productsUpdated;
  });
  await runLimited([...racketIds], 6, async (racketId) => {
    const result = await refreshReviewSummaryCachesForTargets(db, { productIds: [], racketIds: [racketId] });
    racketsUpdated += result.racketsUpdated;
  });

  return {
    productsReset: productsResetResult.modifiedCount,
    racketsReset: racketsResetResult.modifiedCount,
    productTargets: productIds.size,
    racketTargets: racketIds.size,
    productsUpdated,
    racketsUpdated,
    reviewsScanned,
  };
}

export async function rebuildProductRatingSummary(db: Db) {
  return rebuildPublicReviewSummaryCaches(db);
}
