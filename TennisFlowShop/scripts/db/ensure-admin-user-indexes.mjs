import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'tennis_academy';

if (!uri) {
  console.error('[ensure-admin-user-indexes] MONGODB_URI is required');
  process.exit(1);
}

/** @type {{ collection: string, keys: Record<string, 1 | -1>, options?: import('mongodb').CreateIndexesOptions }[]} */
const indexSpecs = [
  { collection: 'orders', keys: { userId: 1, createdAt: -1 }, options: { name: 'orders_userId_createdAt' } },
  { collection: 'stringing_applications', keys: { userId: 1, createdAt: -1 }, options: { name: 'apps_userId_createdAt' } },
  { collection: 'reviews', keys: { userId: 1, createdAt: -1 }, options: { name: 'reviews_userId_createdAt' } },
  { collection: 'user_audit_logs', keys: { userId: 1, at: -1 }, options: { name: 'audit_userId_at' } },
  { collection: 'user_sessions', keys: { userId: 1, at: -1 }, options: { name: 'sessions_userId_at' } },
];

async function main() {
  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);

    for (const spec of indexSpecs) {
      const result = await db.collection(spec.collection).createIndex(spec.keys, spec.options);
      console.log(`[ok] ${spec.collection}: ${result}`);
    }

    console.log('[done] admin users API indexes ensured');
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('[ensure-admin-user-indexes] failed', error);
  process.exit(1);
});
