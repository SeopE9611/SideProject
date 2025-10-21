import type { Db } from 'mongodb';

/**
 * 문자열 교체/초안 청소를 DB 레벨에서 안전하게 보장하는 인덱스 세트
 * - ttl_expireAt: expireAt 필드가 설정된 문서를 즉시(TTL=0) 만료 처리
 * - uniq_draft_per_order: 주문당 draft 1건만 허용(부분 유일 인덱스)
 */
export async function ensureStringingTTLIndexes(db: Db) {
  const col = db.collection('stringing_applications');
  const names = (await col.listIndexes().toArray()).map((i) => i.name);

  if (!names.includes('ttl_expireAt')) {
    await col.createIndex({ expireAt: 1 }, { name: 'ttl_expireAt', expireAfterSeconds: 0 });
  }
  if (!names.includes('uniq_draft_per_order')) {
    await col.createIndex({ orderId: 1, status: 1 }, { name: 'uniq_draft_per_order', unique: true, partialFilterExpression: { status: 'draft' } });
  }
}
