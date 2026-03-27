#!/usr/bin/env node
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tennis_academy";

if (!uri) {
  console.error("[ensure-runtime-indexes] MONGODB_URI 환경 변수가 필요합니다.");
  process.exit(1);
}

/**
 * 인덱스 키/옵션이 동일한 인덱스가 이미 있으면 생성을 건너뛴다.
 * - 이름이 달라도 같은 키/핵심 옵션이면 이미 충족된 것으로 본다.
 */
function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const obj = value;
    const keys = Object.keys(obj).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function normalizeBooleanOption(value) {
  // Mongo listIndexes 결과에서는 옵션이 꺼져 있으면 필드 자체가 빠지는 경우가 많다.
  // 그래서 undefined/null/false는 "동일한 비활성 상태"로 취급해 오판을 줄인다.
  return value === true;
}

function normalizePartialFilterExpression(value) {
  // partialFilterExpression은 객체 내부 키 순서가 달라도 의미가 같을 수 있다.
  // 안정 정렬 기반 stringify로 비교해 "키 순서 차이" 오탐을 피한다.
  if (!value || typeof value !== "object") return null;
  if (Object.keys(value).length === 0) return null;
  return stableStringify(value);
}

function hasMatchingIndex(indexes, spec) {
  const expectedKey = JSON.stringify(spec.keys);
  return indexes.some((idx) => {
    // key만 같다고 동일 인덱스가 아니다.
    // sparse / partialFilterExpression 같은 정책 옵션이 다르면 대상 문서 집합과 제약이 달라진다.
    const sameKey = JSON.stringify(idx.key) === expectedKey;
    if (!sameKey) return false;

    if (
      typeof spec.options?.unique !== "undefined" &&
      normalizeBooleanOption(idx.unique) !==
        normalizeBooleanOption(spec.options.unique)
    ) {
      return false;
    }
    if (
      typeof spec.options?.expireAfterSeconds !== "undefined" &&
      idx.expireAfterSeconds !== spec.options.expireAfterSeconds
    ) {
      return false;
    }
    if (
      typeof spec.options?.sparse !== "undefined" &&
      normalizeBooleanOption(idx.sparse) !==
        normalizeBooleanOption(spec.options.sparse)
    ) {
      return false;
    }
    if (typeof spec.options?.partialFilterExpression !== "undefined") {
      const actualPartial = normalizePartialFilterExpression(
        idx.partialFilterExpression,
      );
      const expectedPartial = normalizePartialFilterExpression(
        spec.options.partialFilterExpression,
      );
      if (actualPartial !== expectedPartial) return false;
    }

    return true;
  });
}

async function ensureCollection(db, collectionName) {
  try {
    await db.createCollection(collectionName);
  } catch {
    // 이미 있으면 무시
  }
}

async function ensureIndexes(db, collectionName, specs) {
  await ensureCollection(db, collectionName);
  const col = db.collection(collectionName);
  const existing = await col
    .listIndexes()
    .toArray()
    .catch(() => []);

  for (const spec of specs) {
    if (hasMatchingIndex(existing, spec)) {
      console.log(`✅ [SKIP] ${collectionName}.${spec.name}`);
      continue;
    }

    await col.createIndex(spec.keys, {
      name: spec.name,
      ...(spec.options ?? {}),
    });
    console.log(`✅ [ENSURED] ${collectionName}.${spec.name}`);
  }
}

/**
 * getDb() 런타임 보장 범위와 동일하게 유지해야 하는 인덱스 집합.
 *
 * 중요:
 * - production에서는 getDb()가 요청 경로에서 인덱스 완료를 기다리지 않는다.
 * - 그래서 이 스크립트가 "배포 전 선반영" 책임을 실질적으로 맡는다.
 * - 아래 범위가 getDb()의 ensure*Indexes 범위와 어긋나면,
 *   첫 요청이 인덱스 미보장 상태로 들어와 성능/정합성 리스크가 생길 수 있다.
 */
const INDEX_SPECS = {
  service_passes: [
    {
      name: "idx_pass_user_status_type",
      keys: { userId: 1, status: 1, type: 1 },
      options: {},
    },
    {
      name: "idx_pass_orderId",
      keys: { orderId: 1 },
      options: { sparse: true },
    },
  ],
  service_pass_consumptions: [
    {
      name: "uniq_pass_application",
      keys: { passId: 1, applicationId: 1 },
      options: { unique: true },
    },
    {
      name: "idx_consumption_application",
      keys: { applicationId: 1 },
      options: {},
    },
  ],
  oauth_pending_signups: [
    {
      name: "ttl_oauth_pending_expiresAt",
      keys: { expiresAt: 1 },
      options: { expireAfterSeconds: 0 },
    },
  ],
  user_sessions: [
    {
      name: "user_sessions_user_at_desc",
      keys: { userId: 1, at: -1 },
      options: {},
    },
  ],
  board_posts: [
    {
      name: "idx_board_type_status_created",
      keys: { type: 1, status: 1, createdAt: -1 },
      options: {},
    },
    {
      name: "idx_board_pinned_created",
      keys: { isPinned: -1, createdAt: -1 },
      options: {},
    },
    {
      name: "idx_board_product_created",
      keys: { "productRef.productId": 1, createdAt: -1 },
      options: {},
    },
    {
      name: "idx_board_author_created",
      keys: { authorId: 1, createdAt: -1 },
      options: {},
    },
    {
      name: "boards_list_compound",
      keys: { type: 1, status: 1, isPinned: -1, createdAt: -1 },
      options: {},
    },
    {
      name: "boards_updatedAt_desc",
      keys: { updatedAt: -1 },
      options: {},
    },
    {
      name: "boards_attachments_storagePath",
      keys: { "attachments.storagePath": 1 },
      options: {},
    },
  ],
  board_view_dedupe: [
    {
      name: "board_view_dedupe_unique",
      keys: { postId: 1, viewerKey: 1 },
      options: { unique: true },
    },
    {
      name: "board_view_dedupe_ttl_30m",
      keys: { createdAt: 1 },
      options: { expireAfterSeconds: 60 * 30 },
    },
  ],
  community_posts: [
    {
      name: "community_posts_type_category_brand_created",
      keys: { type: 1, category: 1, brand: 1, createdAt: -1 },
      options: {},
    },
    {
      name: "community_posts_market_sale_status_created",
      keys: { type: 1, category: 1, "marketMeta.saleStatus": 1, createdAt: -1 },
      options: {},
    },
    {
      name: "community_posts_market_price",
      keys: { type: 1, category: 1, "marketMeta.price": 1 },
      options: {},
    },
    {
      name: "community_posts_market_racket_grip",
      keys: { type: 1, category: 1, "marketMeta.racketSpec.gripSize": 1 },
      options: {},
    },
    {
      name: "community_posts_market_string_material",
      keys: { type: 1, category: 1, "marketMeta.stringSpec.material": 1 },
      options: {},
    },
  ],
  community_likes: [
    {
      name: "community_likes_post_user_unique",
      keys: { postId: 1, userId: 1 },
      options: { unique: true },
    },
  ],
  community_post_view_dedupe: [
    {
      name: "community_post_view_dedupe_unique",
      keys: { postId: 1, viewerKey: 1 },
      options: { unique: true },
    },
    {
      name: "community_post_view_dedupe_expire_at_ttl",
      keys: { expireAt: 1 },
      options: { expireAfterSeconds: 0 },
    },
  ],
  rental_orders: [
    {
      name: "user_status",
      keys: { userId: 1, status: 1 },
      options: {},
    },
    {
      name: "racket_status",
      keys: { racketId: 1, status: 1 },
      options: {},
    },
    {
      name: "createdAt_desc",
      keys: { createdAt: -1 },
      options: {},
    },
    {
      name: "ops_rental_orders_stringingApplicationId_idx",
      keys: { stringingApplicationId: 1 },
      options: {},
    },
  ],
  orders: [
    {
      name: "ops_orders_stringingApplicationId_idx",
      keys: { stringingApplicationId: 1 },
      options: {},
    },
    {
      name: "ops_orders_searchEmailLower_idx",
      keys: { searchEmailLower: 1 },
      options: {},
    },
  ],
  stringing_applications: [
    {
      name: "ops_apps_stringingApplicationId_idx",
      keys: { stringingApplicationId: 1 },
      options: {},
    },
    {
      name: "ops_apps_orderId_idx",
      keys: { orderId: 1 },
      options: {},
    },
    {
      name: "ops_apps_rentalId_idx",
      keys: { rentalId: 1 },
      options: {},
    },
    {
      name: "ops_apps_searchEmailLower_idx",
      keys: { searchEmailLower: 1 },
      options: {},
    },
  ],
  messages: [
    {
      name: "idx_messages_to_created",
      keys: { toUserId: 1, createdAt: -1 },
      options: {},
    },
    {
      name: "idx_messages_from_created",
      keys: { fromUserId: 1, createdAt: -1 },
      options: {},
    },
    {
      name: "idx_messages_to_readAt",
      keys: { toUserId: 1, readAt: 1 },
      options: {},
    },
    {
      name: "idx_messages_broadcastId",
      keys: { broadcastId: 1 },
      options: {},
    },
    {
      name: "ttl_messages_expiresAt",
      keys: { expiresAt: 1 },
      options: {
        expireAfterSeconds: 0,
        partialFilterExpression: { expiresAt: { $type: "date" } },
      },
    },
  ],
  points_transactions: [
    {
      name: "idx_points_user_created",
      keys: { userId: 1, createdAt: -1 },
      options: {},
    },
    {
      name: "uq_points_user_type_refKey",
      keys: { userId: 1, type: 1, refKey: 1 },
      options: {
        unique: true,
        partialFilterExpression: { refKey: { $type: "string" } },
      },
    },
    {
      name: "uq_points_refKey",
      keys: { refKey: 1 },
      options: {
        unique: true,
        partialFilterExpression: { refKey: { $type: "string" } },
      },
    },
  ],
  used_rackets: [
    {
      name: "status_1_createdAt_-1",
      keys: { status: 1, createdAt: -1 },
      options: {},
    },
    {
      name: "brand_1_status_1",
      keys: { brand: 1, status: 1 },
      options: {},
    },
    {
      name: "condition_1_status_1",
      keys: { condition: 1, status: 1 },
      options: {},
    },
    {
      name: "price_1_status_1",
      keys: { price: 1, status: 1 },
      options: {},
    },
    {
      name: "spec.headSize_1",
      keys: { "spec.headSize": 1 },
      options: {},
    },
    {
      name: "spec.weight_1",
      keys: { "spec.weight": 1 },
      options: {},
    },
    {
      name: "spec.balance_1",
      keys: { "spec.balance": 1 },
      options: {},
    },
    {
      name: "spec.lengthIn_1",
      keys: { "spec.lengthIn": 1 },
      options: {},
    },
    {
      name: "spec.stiffnessRa_1",
      keys: { "spec.stiffnessRa": 1 },
      options: {},
    },
    {
      name: "spec.swingWeight_1",
      keys: { "spec.swingWeight": 1 },
      options: {},
    },
    {
      name: "spec.pattern_1",
      keys: { "spec.pattern": 1 },
      options: {},
    },
  ],
  wishlists: [
    {
      name: "wishlist_user_product_unique",
      keys: { userId: 1, productId: 1 },
      options: { unique: true },
    },
  ],
  admin_locks: [
    {
      name: "admin_locks_key_unique",
      keys: { key: 1 },
      options: { unique: true },
    },
    {
      name: "ttl_locked_until",
      keys: { lockedUntil: 1 },
      options: { expireAfterSeconds: 0 },
    },
  ],
  users: [
    {
      name: "users_email_unique",
      keys: { email: 1 },
      options: { unique: true },
    },
    {
      name: "users_lastLoginAt_idx",
      keys: { lastLoginAt: -1 },
      options: {},
    },
  ],
  reviews: [
    {
      name: "user_product_order_unique",
      keys: { userId: 1, productId: 1, orderId: 1 },
      options: {
        unique: true,
        partialFilterExpression: {
          productId: { $exists: true },
          orderId: { $exists: true },
          isDeleted: false,
        },
      },
    },
    {
      name: "user_service_app_unique",
      keys: { userId: 1, service: 1, serviceApplicationId: 1 },
      options: {
        unique: true,
        partialFilterExpression: {
          serviceApplicationId: { $exists: true },
          isDeleted: false,
        },
      },
    },
    {
      name: "user_createdAt",
      keys: { userId: 1, createdAt: -1 },
      options: {},
    },
    {
      name: "product_list_index",
      keys: { productId: 1, status: 1, createdAt: -1 },
      options: {},
    },
    {
      name: "status_created_desc",
      keys: { status: 1, createdAt: -1, _id: -1 },
      options: {},
    },
    {
      name: "status_helpful_desc",
      keys: { status: 1, helpfulCount: -1, _id: -1 },
      options: {},
    },
    {
      name: "status_rating_desc",
      keys: { status: 1, rating: -1, _id: -1 },
      options: {},
    },
  ],
  review_votes: [
    {
      name: "review_user_unique",
      keys: { reviewId: 1, userId: 1 },
      options: { unique: true },
    },
    {
      name: "reviewId_idx",
      keys: { reviewId: 1 },
      options: {},
    },
  ],
};

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);

  // runtime 보장과 동일하게, 생성 전 필요한 데이터 정규화/레거시 정리를 수행한다.
  await db
    .collection("reviews")
    .updateMany(
      { $or: [{ isDeleted: { $exists: false } }, { isDeleted: null }] },
      { $set: { isDeleted: false } },
    );

  await db
    .collection("reviews")
    .dropIndex("uniq_user_product_active_review")
    .catch(() => {});

  // points_transactions: 기존 non-unique {refKey:1} 인덱스가 남아있으면 unique로 교체 가능하도록 제거
  const pointsCol = db.collection("points_transactions");
  const pointIndexes = await pointsCol
    .listIndexes()
    .toArray()
    .catch(() => []);
  const legacyRefKeyIndex = pointIndexes.find((idx) => {
    const key = idx?.key ?? {};
    return (
      Object.keys(key).length === 1 &&
      key.refKey === 1 &&
      idx.name !== "uq_points_refKey" &&
      idx.unique !== true
    );
  });
  if (legacyRefKeyIndex?.name) {
    await pointsCol.dropIndex(legacyRefKeyIndex.name).catch((e) => {
      console.warn(
        `[ensure-runtime-indexes] legacy refKey index drop skipped: ${legacyRefKeyIndex.name}`,
        e,
      );
    });
  }

  for (const [collectionName, specs] of Object.entries(INDEX_SPECS)) {
    await ensureIndexes(db, collectionName, specs);
  }

  // boards 런타임과 동일하게 expireAt 누락 문서를 보정한다.
  const communityViewDedupeTtlRaw = Number(
    process.env.COMMUNITY_VIEW_DEDUPE_TTL_SECONDS ?? 60 * 30,
  );
  const communityViewDedupeTtl = Number.isFinite(communityViewDedupeTtlRaw)
    ? Math.max(
        60 * 30,
        Math.min(60 * 60 * 24, Math.floor(communityViewDedupeTtlRaw)),
      )
    : 60 * 30;

  await db.collection("community_post_view_dedupe").updateMany(
    { expireAt: { $exists: false } },
    [
      {
        $set: {
          expireAt: {
            $dateAdd: {
              startDate: "$createdAt",
              unit: "second",
              amount: communityViewDedupeTtl,
            },
          },
        },
      },
    ],
  );

  console.log(
    "[ensure-runtime-indexes] getDb() 런타임 범위와 동일한 인덱스 선반영이 완료되었습니다.",
  );
} finally {
  await client.close();
}
