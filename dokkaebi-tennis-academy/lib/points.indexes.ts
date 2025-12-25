/**
 * 포인트(points_transactions) 인덱스 보장 유틸
 * - mongodb.ts(getDb)에서 컨테이너 생애당 1회만 실행되도록 래핑 호출
 *
 * 컬렉션/인덱스 설계 의도
 * 1) userId + createdAt : 마이페이지 히스토리 조회(최신순) 최적화
 * 2) userId + type + refKey unique(partial) : 이벤트 기반 지급의 "중복 적립"을 구조적으로 차단(멱등성)
 */
import type { CreateIndexesOptions, Db, IndexDirection } from 'mongodb';

type Keys = Record<string, IndexDirection>;

async function ensureIndex(db: Db, collectionName: string, keys: Keys, options: CreateIndexesOptions = {}) {
  const col = db.collection(collectionName);

  // 서버리스/로컬 모두 안전: 컬렉션이 없으면 만들어 둠
  try {
    await db.createCollection(collectionName);
  } catch {}

  const existing = await col.indexes();
  const want = Object.entries(keys);

  const exists = existing.some((idx) => {
    const key = idx.key as Record<string, IndexDirection>;
    const sameLen = Object.keys(key).length === want.length;
    const samePairs = sameLen && want.every(([k, v]) => key[k] === v);

    // options 비교는 최소(주요 필드만)로 유지
    const uniqueOk = options.unique ? idx.unique === true : true;
    const nameOk = options.name ? idx.name === options.name : true;

    return samePairs && uniqueOk && nameOk;
  });

  if (!exists) {
    await col.createIndex(keys, options);
  }
}

export async function ensurePointsIndexes(db: Db) {
  // 조회 최적화: userId별 최신 히스토리
  await ensureIndex(db, 'points_transactions', { userId: 1, createdAt: -1 }, { name: 'idx_points_user_created' });

  // 멱등(중복 방지): refKey가 있는 경우에만 unique 적용
  await ensureIndex(
    db,
    'points_transactions',
    { userId: 1, type: 1, refKey: 1 },
    {
      name: 'uq_points_user_type_refKey',
      unique: true,
      partialFilterExpression: { refKey: { $type: 'string' } },
    }
  );

  // 디버깅/운영 추적용: refKey 단독 조회
  await ensureIndex(
    db,
    'points_transactions',
    { refKey: 1 },
    {
      name: 'idx_points_refKey',
      partialFilterExpression: { refKey: { $type: 'string' } },
    }
  );
}
