import type { Db } from 'mongodb';

export async function ensureStringingTTLIndexes(db: Db) {
  const col = db.collection('stringing_applications');

  // Use full index definitions to allow safe migrations.
  const indexes = await col.listIndexes().toArray();
  const set = new Set(indexes.map((i: any) => i.name));

  // 1) TTL index
  if (!set.has('ttl_expireAt')) {
    await col.createIndex({ expireAt: 1 }, { name: 'ttl_expireAt', expireAfterSeconds: 0 });
  }

  // 2) legacy TTL index cleanup
  if (set.has('ttl_draftExpire')) {
    await col.dropIndex('ttl_draftExpire').catch(() => {});
    set.delete('ttl_draftExpire');
  }

  // 2-1) legacy unique index cleanup
  if (set.has('uniq_order_one_inprogress_application')) {
    await col.dropIndex('uniq_order_one_inprogress_application').catch(() => {});
    set.delete('uniq_order_one_inprogress_application');
  }

  // 3) migrate legacy uniq_draft_per_order
  // Legacy definition: partialFilterExpression: { status: 'draft' }
  // Problem: documents without orderId are indexed as orderId=null and can collide (e.g., rental drafts).
  const orderDraftIdx = indexes.find((i: any) => i.name === 'uniq_draft_per_order');
  const partial = (orderDraftIdx as any)?.partialFilterExpression;
  const isLegacyOrderDraft = !!orderDraftIdx && (!partial || (partial.status === 'draft' && (partial as any).orderId === undefined));

  if (isLegacyOrderDraft) {
    await col.dropIndex('uniq_draft_per_order').catch(() => {});
    set.delete('uniq_draft_per_order');
  }

  // 4) enforce one draft per order (only when orderId exists and is not null)
  if (!set.has('uniq_draft_per_order')) {
    await col.createIndex(
      { orderId: 1, status: 1 },
      {
        name: 'uniq_draft_per_order',
        unique: true,
        // $ne:null 은 서버/Atlas 버전에 따라 partial index에서 금지된 $not 형태로 변환될 수 있음
        // null/미존재 제외 + 실제 타입(ObjectId|string)만 포함
        partialFilterExpression: {
          status: 'draft',
          $or: [{ orderId: { $type: 'objectId' } }, { orderId: { $type: 'string' } }],
        },
      }
    );
  }

  // 5) enforce one draft per rental (only when rentalId exists)
  if (!set.has('uniq_draft_per_rental')) {
    await col.createIndex(
      { rentalId: 1, status: 1 },
      {
        name: 'uniq_draft_per_rental',
        unique: true,
        // rentalId는 ObjectId 타입만 허용(없거나 null이면 제외)
        partialFilterExpression: { status: 'draft', rentalId: { $type: 'objectId' } },
      }
    );
  }
}
