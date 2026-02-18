#!/usr/bin/env node
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'tennis_academy';

if (!uri) {
  console.error('[check-runtime-indexes] MONGODB_URI 환경 변수가 필요합니다.');
  process.exit(1);
}

const INDEX_SPECS = [
  {
    collection: 'oauth_pending_signups',
    name: 'ttl_oauth_pending_expiresAt',
    keys: { expiresAt: 1 },
    options: { expireAfterSeconds: 0 },
  },
  {
    collection: 'user_sessions',
    name: 'user_sessions_user_at_desc',
    keys: { userId: 1, at: -1 },
    options: {},
  },
  {
    collection: 'wishlists',
    name: 'wishlist_user_product_unique',
    keys: { userId: 1, productId: 1 },
    options: { unique: true },
  },
  {
    collection: 'users',
    name: 'users_email_unique',
    keys: { email: 1 },
    options: { unique: true },
  },
  {
    collection: 'users',
    name: 'users_lastLoginAt_idx',
    keys: { lastLoginAt: -1 },
    options: {},
  },
  {
    collection: 'admin_locks',
    name: 'admin_locks_key_unique',
    keys: { key: 1 },
    options: { unique: true },
  },
  {
    collection: 'admin_locks',
    name: 'ttl_locked_until',
    keys: { lockedUntil: 1 },
    options: { expireAfterSeconds: 0 },
  },
  {
    collection: 'review_votes',
    name: 'review_user_unique',
    keys: { reviewId: 1, userId: 1 },
    options: { unique: true },
  },
  {
    collection: 'review_votes',
    name: 'reviewId_idx',
    keys: { reviewId: 1 },
    options: {},
  },
];

function normalizeKeys(keys) {
  return JSON.stringify(keys);
}

function checkOption(indexDoc, optionName, expectedValue) {
  if (typeof expectedValue === 'undefined') return true;
  return indexDoc?.[optionName] === expectedValue;
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);

  let hasFailure = false;

  for (const spec of INDEX_SPECS) {
    const indexes = await db.collection(spec.collection).listIndexes().toArray().catch(() => []);
    const indexDoc = indexes.find((idx) => idx.name === spec.name);

    if (!indexDoc) {
      hasFailure = true;
      console.error(`❌ [MISSING] ${spec.collection}.${spec.name}`);
      continue;
    }

    const keyMatched = normalizeKeys(indexDoc.key) === normalizeKeys(spec.keys);
    const uniqueMatched = checkOption(indexDoc, 'unique', spec.options.unique);
    const ttlMatched = checkOption(indexDoc, 'expireAfterSeconds', spec.options.expireAfterSeconds);

    if (!keyMatched || !uniqueMatched || !ttlMatched) {
      hasFailure = true;
      console.error(`❌ [MISMATCH] ${spec.collection}.${spec.name}`);
      console.error('   - actual keys:', JSON.stringify(indexDoc.key));
      console.error('   - expected keys:', JSON.stringify(spec.keys));
      if (typeof spec.options.unique !== 'undefined') {
        console.error(`   - unique(actual/expected): ${String(indexDoc.unique)} / ${String(spec.options.unique)}`);
      }
      if (typeof spec.options.expireAfterSeconds !== 'undefined') {
        console.error(`   - expireAfterSeconds(actual/expected): ${String(indexDoc.expireAfterSeconds)} / ${String(spec.options.expireAfterSeconds)}`);
      }
      continue;
    }

    console.log(`✅ [OK] ${spec.collection}.${spec.name}`);
  }

  if (hasFailure) process.exit(2);
  console.log('[check-runtime-indexes] 모든 런타임 인덱스 상태가 기대값과 일치합니다.');
} finally {
  await client.close();
}
