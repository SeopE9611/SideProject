#!/usr/bin/env node
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tennis_academy";

if (!uri) {
  console.error("[check-runtime-indexes] MONGODB_URI 환경 변수가 필요합니다.");
  process.exit(1);
}

/**
 * 중요: check 대상은 runtime ensure와 ensure-runtime-indexes의 합집합을 검사한다.
 *
 * 이유:
 * - 생성/보정 경로 중 하나라도 check의 검사 목록보다 넓으면,
 *   실제 운영에 중요한 인덱스가 빠져도 check가 통과하는 오판이 발생한다.
 * - 비교 기준은 key/unique/expireAfterSeconds/sparse/partialFilterExpression이며,
 *   MongoDB 버전별 의미가 약한 background 옵션은 기존 정책대로 비교하지 않는다.
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
  revenue_report_snapshots: [
    {
      name: "revenue_report_snapshots_yyyymm_unique",
      keys: { yyyymm: 1 },
      options: { unique: true },
    },
    {
      name: "revenue_report_snapshots_updatedAt_yyyymm_desc",
      keys: { updatedAt: -1, yyyymm: -1 },
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
  auth_rate_limit_windows: [
    {
      name: "ttl_auth_rate_limit_expireAt",
      keys: { expireAt: 1 },
      options: { expireAfterSeconds: 0 },
    },
    {
      name: "auth_rate_limit_lookup_route_key_window_desc",
      keys: { routeId: 1, key: 1, windowStart: -1 },
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
  user_notifications: [
    {
      name: "idx_user_notifications_user_read_created",
      keys: { userId: 1, readAt: 1, createdAt: -1 },
      options: {},
    },
    {
      name: "idx_user_notifications_user_created",
      keys: { userId: 1, createdAt: -1 },
      options: {},
    },
    {
      name: "uniq_user_notifications_dedupe_key",
      keys: { dedupeKey: 1 },
      options: {
        unique: true,
        partialFilterExpression: { dedupeKey: { $type: "string" } },
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
  cancel_refund_risk_signals: [
    {
      name: "cancel_refund_risk_subject_event_unique",
      keys: { category: 1, subjectKey: 1, eventType: 1 },
      options: { unique: true },
    },
    {
      name: "cancel_refund_risk_lastAt_desc",
      keys: { lastAt: -1 },
      options: {},
    },
    {
      name: "cancel_refund_risk_target_lastAt_desc",
      keys: { targetType: 1, targetId: 1, lastAt: -1 },
      options: {},
    },
  ],
  products: [
    {
      name: "idx_products_public_count",
      keys: { isDeleted: 1 },
      options: {},
    },
    {
      name: "idx_products_public_latest",
      keys: { isDeleted: 1, isVisible: 1, _id: -1 },
      options: {},
    },
    {
      name: "idx_products_public_brand_latest",
      keys: { isDeleted: 1, isVisible: 1, brand: 1, _id: -1 },
      options: {},
    },
    {
      name: "idx_products_public_material_latest",
      keys: { isDeleted: 1, isVisible: 1, material: 1, _id: -1 },
      options: {},
    },
    {
      name: "idx_products_public_price",
      keys: { price: 1 },
      options: {},
    },
    {
      name: "idx_products_public_price_latest",
      keys: { isDeleted: 1, isVisible: 1, price: 1, _id: -1 },
      options: {},
    },
    {
      name: "idx_products_public_featured_latest",
      keys: { isDeleted: 1, isVisible: 1, "inventory.isFeatured": 1, _id: -1 },
      options: {},
    },
    {
      name: "idx_products_public_new_latest",
      keys: { isDeleted: 1, isVisible: 1, "inventory.isNew": 1, _id: -1 },
      options: {},
    },
    {
      name: "idx_products_public_sale_latest",
      keys: { isDeleted: 1, isVisible: 1, "inventory.isSale": 1, _id: -1 },
      options: {},
    },
    {
      name: "idx_products_public_reviews",
      keys: { ratingCount: -1, ratingAvg: -1, _id: -1 },
      options: {},
    },
  ],
  used_rackets: [
    {
      name: "status_1_createdAt_-1",
      keys: { status: 1, createdAt: -1 },
      options: {},
    },
    {
      name: "idx_used_rackets_public_latest",
      keys: { createdAt: -1, _id: -1 },
      options: {},
    },
    {
      name: "idx_used_rackets_public_visible_status_latest",
      keys: { isVisible: 1, status: 1, createdAt: -1, _id: -1 },
      options: {},
    },
    {
      name: "idx_used_rackets_public_brand_latest",
      keys: { isVisible: 1, status: 1, brand: 1, createdAt: -1, _id: -1 },
      options: {},
    },
    {
      name: "idx_used_rackets_public_condition_latest",
      keys: { isVisible: 1, status: 1, condition: 1, createdAt: -1, _id: -1 },
      options: {},
    },
    {
      name: "idx_used_rackets_public_price",
      keys: { price: 1, _id: -1 },
      options: {},
    },
    {
      name: "idx_used_rackets_public_visible_status_price",
      keys: { isVisible: 1, status: 1, price: 1, _id: -1 },
      options: {},
    },
    {
      name: "idx_used_rackets_public_featured_latest",
      keys: { isVisible: 1, status: 1, "marketing.isFeatured": 1, createdAt: -1, _id: -1 },
      options: {},
    },
    {
      name: "idx_used_rackets_public_new_latest",
      keys: { isVisible: 1, status: 1, "marketing.isNew": 1, createdAt: -1, _id: -1 },
      options: {},
    },
    {
      name: "idx_used_rackets_public_sale_latest",
      keys: { isVisible: 1, status: 1, "marketing.isSale": 1, createdAt: -1, _id: -1 },
      options: {},
    },
    {
      name: "idx_used_rackets_public_reviews",
      keys: { reviewCount: -1, ratingCount: -1, createdAt: -1, _id: -1 },
      options: {},
    },
    {
      name: "idx_used_rackets_public_sales",
      keys: {
        purchaseCount: -1,
        salesCount: -1,
        orderCount: -1,
        createdAt: -1,
        _id: -1,
      },
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
  admin_notes: [
    {
      name: "admin_notes_target_createdAt_idx",
      keys: { targetType: 1, targetId: 1, createdAt: -1 },
      options: {},
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
    {
      name: "users_oauth_kakao_id_unique",
      keys: { "oauth.kakao.id": 1 },
      options: {
        unique: true,
        partialFilterExpression: {
          "oauth.kakao.id": { $exists: true, $type: "string" },
        },
      },
    },
    {
      name: "users_oauth_naver_id_unique",
      keys: { "oauth.naver.id": 1 },
      options: {
        unique: true,
        partialFilterExpression: {
          "oauth.naver.id": { $exists: true, $type: "string" },
        },
      },
    },
  ],
  offline_customers: [
    { name: "phoneNormalized_1", keys: { phoneNormalized: 1 }, options: {} },
    { name: "emailLower_1", keys: { emailLower: 1 }, options: {} },
    { name: "linkedUserId_1", keys: { linkedUserId: 1 }, options: {} },
    { name: "createdAt_-1", keys: { createdAt: -1 }, options: {} },
  ],
  offline_service_records: [
    {
      name: "offlineCustomerId_1",
      keys: { offlineCustomerId: 1 },
      options: {},
    },
    { name: "userId_1", keys: { userId: 1 }, options: {} },
    { name: "occurredAt_-1", keys: { occurredAt: -1 }, options: {} },
    { name: "status_1", keys: { status: 1 }, options: {} },
    { name: "payment.status_1", keys: { "payment.status": 1 }, options: {} },
    { name: "kind_1", keys: { kind: 1 }, options: {} },
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
  if (optionName === "unique" || optionName === "sparse") {
    return normalizeBooleanOption(indexDoc?.[optionName]) === normalizeBooleanOption(expectedValue);
  }

  if (optionName === "partialFilterExpression") {
    return (
      normalizePartialFilterExpression(indexDoc?.[optionName]) ===
      normalizePartialFilterExpression(expectedValue)
    );
  }

  return (indexDoc?.[optionName] ?? null) === (expectedValue ?? null);
}

function indexMatchesSpec(indexDoc, spec) {
  return (
    stableStringify(indexDoc.key) === stableStringify(spec.keys) &&
    checkOption(indexDoc, "unique", spec.options.unique) &&
    checkOption(indexDoc, "expireAfterSeconds", spec.options.expireAfterSeconds) &&
    checkOption(indexDoc, "sparse", spec.options.sparse) &&
    checkOption(indexDoc, "partialFilterExpression", spec.options.partialFilterExpression)
  );
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);

  let hasFailure = false;
  const summary = { OK: 0, MISSING: 0, MISMATCH: 0, NAME_MISMATCH: 0 };

  for (const [collectionName, specs] of Object.entries(INDEX_SPECS)) {
    const indexes = await db
      .collection(collectionName)
      .listIndexes()
      .toArray()
      .catch(() => []);

    for (const spec of specs) {
      const indexDoc = indexes.find((idx) => idx.name === spec.name);

      if (!indexDoc) {
        const aliasIndex = indexes.find((idx) => indexMatchesSpec(idx, spec));
        if (aliasIndex) {
          summary.NAME_MISMATCH += 1;
          console.warn(
            `⚠️ [NAME_MISMATCH] ${collectionName}.${spec.name} existsAs=${aliasIndex.name}`,
          );
          continue;
        }

        hasFailure = true;
        summary.MISSING += 1;
        console.error(`❌ [MISSING] ${collectionName}.${spec.name}`);
        continue;
      }

      // check와 생성/보정 경로의 비교 기준은 반드시 동일해야 한다.
      // 그래야 "생성/보정 도구는 불일치"인데 "검사 도구는 정상" 같은 운영 오판을 막을 수 있다.
      if (!indexMatchesSpec(indexDoc, spec)) {
        hasFailure = true;
        summary.MISMATCH += 1;
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

      summary.OK += 1;
      console.log(`✅ [OK] ${collectionName}.${spec.name}`);
    }
  }

  console.log(
    `[check-runtime-indexes] summary OK=${summary.OK} MISSING=${summary.MISSING} MISMATCH=${summary.MISMATCH} NAME_MISMATCH=${summary.NAME_MISMATCH}`,
  );
  if (hasFailure) {
    process.exitCode = 2;
    console.error("[check-runtime-indexes] MISSING 또는 MISMATCH가 있어 종료 코드 2를 반환합니다.");
  } else if (summary.NAME_MISMATCH > 0) {
    console.warn(
      "[check-runtime-indexes] 동일 key/options 인덱스가 다른 이름으로 존재합니다. NAME_MISMATCH 자체는 warning이며 종료 코드에 영향을 주지 않습니다.",
    );
  } else {
    console.log("[check-runtime-indexes] 모든 런타임 인덱스 상태가 기대값과 일치합니다.");
  }
} finally {
  await client.close();
}
