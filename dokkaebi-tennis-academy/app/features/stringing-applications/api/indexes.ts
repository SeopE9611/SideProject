import type { Db } from 'mongodb';

/**
 * 문자열 교체/초안 청소를 DB 레벨에서 안전하게 보장하는 인덱스 세트
 * - ttl_expireAt: expireAt 필드가 설정된 문서를 즉시(TTL=0) 만료 처리
 * - uniq_draft_per_order: 주문당 draft 1건만 허용(부분 유일 인덱스)
 */
export async function ensureStringingTTLIndexes(db: Db) {
  const col = db.collection('stringing_applications');
  const names = (await col.listIndexes().toArray()).map((i) => i.name);

  // 1) TTL 인덱스
  if (!names.includes('ttl_expireAt')) {
    await col.createIndex({ expireAt: 1 }, { name: 'ttl_expireAt', expireAfterSeconds: 0 });
  }

  // 2) 레거시 인덱스 정리
  // 예전 설계에서 "주문당 진행 중 신청 1건"을 강제로 막던 인덱스
  // 지금은 한 주문에서 여러 번 교체 신청을 허용해야 하므로 반드시 제거해야 함
  if (names.includes('uniq_order_one_inprogress_application')) {
    await col.dropIndex('uniq_order_one_inprogress_application');
  }

  // 3) 현재 설계: 주문당 draft 1건만 허용 (제출된 건 여러 개 가능)
  if (!names.includes('uniq_draft_per_order')) {
    await col.createIndex(
      { orderId: 1, status: 1 },
      {
        name: 'uniq_draft_per_order',
        unique: true,
        partialFilterExpression: { status: 'draft' },
      }
    );
  }
}
