import { getDb } from '@/lib/mongodb';

async function main() {
  const db = await getDb();
  const r = await db.collection('users').updateMany({ $or: [{ lastLoginAt: { $exists: false } }, { lastLoginAt: null }] }, [{ $set: { lastLoginAt: { $ifNull: ['$updatedAt', '$createdAt'] } } }]);
  console.log('modified:', r.modifiedCount);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
