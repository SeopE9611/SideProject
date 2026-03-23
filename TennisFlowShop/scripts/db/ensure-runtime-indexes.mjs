#!/usr/bin/env node
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tennis_academy";

if (!uri) {
  console.error("[ensure-runtime-indexes] MONGODB_URI 환경 변수가 필요합니다.");
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

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);

  for (const spec of INDEX_SPECS) {
    await db.collection(spec.collection).createIndex(spec.keys, {
      ...spec.options,
      name: spec.name,
    });
    console.log(`✅ [ENSURED] ${spec.collection}.${spec.name}`);
  }

  console.log(
    "[ensure-runtime-indexes] 런타임 인덱스 선반영이 완료되었습니다.",
  );
} finally {
  await client.close();
}
