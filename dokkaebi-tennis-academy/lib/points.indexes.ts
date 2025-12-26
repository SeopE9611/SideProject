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

    // 인덱스 이름은 환경/히스토리에 따라 달라질 수 있으므로 키 패턴 + 유니크 여부가 동일하면 이미 존재한다고 판단.
    return samePairs && uniqueOk;
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

  // refKey 단독 멱등(가장 강한 중복 방지)
  // - 이미 {refKey:1} 비유니크 인덱스가 존재할 수 있으므로, 발견 시 drop 후 unique로 재생성
  // - 데이터에 중복 refKey가 있으면 unique 생성이 실패할 수 있으니, 실패하더라도 전체 부팅이 죽지 않게 처리
  const col = db.collection('points_transactions');
  try {
    const idxs = await col.indexes();
    const refKeyIdx = idxs.find((idx) => {
      const key = idx.key as Record<string, IndexDirection>;
      return Object.keys(key).length === 1 && key.refKey === 1;
    });

    if (refKeyIdx && refKeyIdx.name && refKeyIdx.unique !== true) {
      // 같은 키패턴({refKey:1})의 non-unique 인덱스가 있으면, unique 인덱스를 만들 수 없어 먼저 제거
      try {
        await col.dropIndex(refKeyIdx.name);
      } catch (e) {
        console.warn('[points] dropIndex failed (refKey)', e);
      }
    }

    // unique refKey (partial)
    await ensureIndex(
      db,
      'points_transactions',
      { refKey: 1 },
      {
        name: 'uq_points_refKey',
        unique: true,
        partialFilterExpression: { refKey: { $type: 'string' } },
      }
    );
  } catch (e) {
    console.warn('[points] ensure unique refKey index skipped', e);
  }
}
