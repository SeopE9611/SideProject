#!/usr/bin/env node
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tennis_academy";

if (!uri) {
  console.error("[check-runtime-indexes] MONGODB_URI 환경 변수가 필요합니다.");
  process.exit(1);
}

/**
 * 중요: check 대상 인덱스 범위는 ensure-runtime-indexes와 동일해야 한다.
 *
 * 이유:
 * - ensure가 생성/보정하는 목록보다 check의 검사 목록이 좁으면,
 *   실제 운영에 중요한 인덱스가 빠져도 check가 통과하는 오판이 발생한다.
 * - 이번 단계의 목적은 "비교 방식 강화"가 아니라 "검사 대상 범위 정합화"다.
 *   (비교 기준: key/unique/expireAfterSeconds/sparse/partialFilterExpression 은 기존 로직 유지)
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

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function normalizeBooleanOption(value) {
  // listIndexes 결과는 false/undefined/null이 섞여 올 수 있어
  // "옵션 비활성"을 동일 의미로 정규화한다.
  return value === true;
}

function normalizePartialFilterExpression(value) {
  // partialFilterExpression은 키 순서가 달라도 같은 조건일 수 있다.
  // 안정 정렬 stringify로 비교해 순서 차이로 인한 오탐을 방지한다.
  if (!value || typeof value !== "object") return null;
  if (Object.keys(value).length === 0) return null;
  return stableStringify(value);
}

function checkOption(indexDoc, optionName, expectedValue) {
  if (typeof expectedValue === "undefined") return true;

  if (optionName === "unique" || optionName === "sparse") {
    return (
      normalizeBooleanOption(indexDoc?.[optionName]) ===
      normalizeBooleanOption(expectedValue)
    );
  }

  if (optionName === "partialFilterExpression") {
    return (
      normalizePartialFilterExpression(indexDoc?.[optionName]) ===
      normalizePartialFilterExpression(expectedValue)
    );
  }

  return indexDoc?.[optionName] === expectedValue;
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);

  let hasFailure = false;

  for (const [collectionName, specs] of Object.entries(INDEX_SPECS)) {
    for (const spec of specs) {
      const indexes = await db
        .collection(collectionName)
        .listIndexes()
        .toArray()
        .catch(() => []);
      const indexDoc = indexes.find((idx) => idx.name === spec.name);

      if (!indexDoc) {
        hasFailure = true;
        console.error(`❌ [MISSING] ${collectionName}.${spec.name}`);
        continue;
      }

      // check와 ensure의 비교 기준은 반드시 동일해야 한다.
      // 그래야 "생성/보정 도구는 불일치"인데 "검사 도구는 정상" 같은 운영 오판을 막을 수 있다.
      const keyMatched = stableStringify(indexDoc.key) === stableStringify(spec.keys);
      const uniqueMatched = checkOption(indexDoc, "unique", spec.options.unique);
      const ttlMatched = checkOption(
        indexDoc,
        "expireAfterSeconds",
        spec.options.expireAfterSeconds,
      );
      // sparse는 "인덱싱 대상 문서 집합" 자체를 바꾸므로 동일 키라도 다른 인덱스로 봐야 한다.
      const sparseMatched = checkOption(indexDoc, "sparse", spec.options.sparse);
      // partialFilterExpression은 인덱스가 적용되는 조건식을 바꾼다.
      // 이 값이 다르면 실행계획/유니크 제약 적용 범위가 달라질 수 있다.
      const partialMatched = checkOption(
        indexDoc,
        "partialFilterExpression",
        spec.options.partialFilterExpression,
      );

      if (!keyMatched || !uniqueMatched || !ttlMatched || !sparseMatched || !partialMatched) {
        hasFailure = true;
        console.error(`❌ [MISMATCH] ${collectionName}.${spec.name}`);
        console.error("   - actual keys:", JSON.stringify(indexDoc.key));
        console.error("   - expected keys:", JSON.stringify(spec.keys));
        if (typeof spec.options.unique !== "undefined") {
          console.error(
            `   - unique(actual/expected): ${String(indexDoc.unique)} / ${String(spec.options.unique)}`,
          );
        }
        if (typeof spec.options.expireAfterSeconds !== "undefined") {
          console.error(
            `   - expireAfterSeconds(actual/expected): ${String(indexDoc.expireAfterSeconds)} / ${String(spec.options.expireAfterSeconds)}`,
          );
        }
        if (typeof spec.options.sparse !== "undefined") {
          console.error(
            `   - sparse(actual/expected): ${String(indexDoc.sparse)} / ${String(spec.options.sparse)}`,
          );
        }
        if (typeof spec.options.partialFilterExpression !== "undefined") {
          console.error(
            `   - partialFilterExpression(actual/expected): ${normalizePartialFilterExpression(indexDoc.partialFilterExpression)} / ${normalizePartialFilterExpression(spec.options.partialFilterExpression)}`,
          );
        }
        continue;
      }

      console.log(`✅ [OK] ${collectionName}.${spec.name}`);
    }
  }

  if (hasFailure) process.exit(2);
  console.log(
    "[check-runtime-indexes] 모든 런타임 인덱스 상태가 기대값과 일치합니다.",
  );
} finally {
  await client.close();
}
