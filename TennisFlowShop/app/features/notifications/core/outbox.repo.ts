import { OutboxDoc } from '@/app/features/notifications/core/type';
import { getDb } from '@/lib/mongodb';

export async function upsertOutbox(doc: Omit<OutboxDoc, 'createdAt' | 'status' | 'retries'> & { dedupeKey?: string }) {
  const db = await getDb();
  const coll = db.collection('notifications_outbox');
  const now = new Date();

  // dedupeKey가 있으면 같은 키로 "한 번만" 만들고 재사용
  if (doc.dedupeKey) {
    // 1) upsert
    await coll.updateOne({ dedupeKey: doc.dedupeKey }, { $setOnInsert: { ...doc, status: 'queued', retries: 0, createdAt: now } }, { upsert: true });
    // 2) 안정적으로 재조회 (null 방지)
    const found = await coll.findOne({ dedupeKey: doc.dedupeKey }, { projection: { _id: 1 } });
    if (!found?._id) {
      throw new Error('Outbox upsert failed (no document found after upsert).');
    }
    return found._id;
  }

  // dedupeKey가 없으면 그냥 insert
  const res = await coll.insertOne({ ...doc, status: 'queued', retries: 0, createdAt: now });
  return res.insertedId;
}

export async function markSent(_id: any) {
  const db = await getDb();
  await db.collection('notifications_outbox').updateOne({ _id }, { $set: { status: 'sent', sentAt: new Date(), error: null } });
}

export async function markFailed(_id: any, error: string) {
  const db = await getDb();
  await db.collection('notifications_outbox').updateOne({ _id }, { $set: { status: 'failed', error } });
}
