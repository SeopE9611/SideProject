#!/usr/bin/env node
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tennis_academy";

if (!uri) {
  console.error("[check-runtime-indexes] MONGODB_URI 환경 변수가 필요합니다.");
  process.exit(1);
}

const INDEX_SPECS = [
  {
    collection: "oauth_pending_signups",
    name: "ttl_oauth_pending_expiresAt",
    keys: { expiresAt: 1 },
    options: { expireAfterSeconds: 0 },
  },
  {
    collection: "user_sessions",
    name: "user_sessions_user_at_desc",
    keys: { userId: 1, at: -1 },
    options: {},
  },
  {
    collection: "wishlists",
    name: "wishlist_user_product_unique",
    keys: { userId: 1, productId: 1 },
    options: { unique: true },
  },
  {
    collection: "users",
    name: "users_email_unique",
    keys: { email: 1 },
    options: { unique: true },
  },
  {
    collection: "users",
    name: "users_lastLoginAt_idx",
    keys: { lastLoginAt: -1 },
    options: {},
  },
  {
    collection: "admin_locks",
    name: "admin_locks_key_unique",
    keys: { key: 1 },
    options: { unique: true },
  },
  {
    collection: "admin_locks",
    name: "ttl_locked_until",
    keys: { lockedUntil: 1 },
    options: { expireAfterSeconds: 0 },
  },
  {
    collection: "review_votes",
    name: "review_user_unique",
    keys: { reviewId: 1, userId: 1 },
    options: { unique: true },
  },
  {
    collection: "review_votes",
    name: "reviewId_idx",
    keys: { reviewId: 1 },
    options: {},
  },
];

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

  for (const spec of INDEX_SPECS) {
    const indexes = await db
      .collection(spec.collection)
      .listIndexes()
      .toArray()
      .catch(() => []);
    const indexDoc = indexes.find((idx) => idx.name === spec.name);

    if (!indexDoc) {
      hasFailure = true;
      console.error(`❌ [MISSING] ${spec.collection}.${spec.name}`);
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
      console.error(`❌ [MISMATCH] ${spec.collection}.${spec.name}`);
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

    console.log(`✅ [OK] ${spec.collection}.${spec.name}`);
  }

  if (hasFailure) process.exit(2);
  console.log(
    "[check-runtime-indexes] 모든 런타임 인덱스 상태가 기대값과 일치합니다.",
  );
} finally {
  await client.close();
}
