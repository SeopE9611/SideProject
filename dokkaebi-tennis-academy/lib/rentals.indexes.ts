import { Db } from 'mongodb';

/**
 * rental_orders 컬렉션 필수 인덱스
 * - userId + status: 마이페이지 목록 조회 최적화
 * - racketId + status: 운영(라켓별 대여상태) 조회 최적화
 * - createdAt: 최근순 정렬
 */
export async function ensureRentalIndexes(db: Db) {
  const collection = db.collection('rental_orders');

  await collection.createIndex({ userId: 1, status: 1 }, { name: 'user_status' });
  await collection.createIndex({ racketId: 1, status: 1 }, { name: 'racket_status' });
  await collection.createIndex({ createdAt: -1 }, { name: 'createdAt_desc' });
}
