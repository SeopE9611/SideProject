/**
 * 패키지(횟수권) 기능용 인덱스 보장 유틸
 * - service_passes: 보유 패키지(유저별 조회/상태/타입)
 * - service_pass_consumptions: 신청서별 차감 멱등 기록
 *
 * 안전 설계:
 * 1) 컬렉션이 없으면 먼저 createCollection 시도(있으면 no-op)
 * 2) 동일 키 조합 인덱스가 이미 있으면 생성 스킵(이름만 다르면 통과)
 * 3) Unique 옵션도 반영하여 정확한 제약 보장
 */

import type { CreateIndexesOptions, Db, IndexDirection } from 'mongodb';

type Keys = Record<string, IndexDirection>;

/**
 * 주어진 컬렉션에 인덱스를 "필요할 때만" 생성한다.
 * - 이미 키 구성이 같은 인덱스가 있으면 생성하지 않음(이름만 달라도 OK)
 */
async function ensureIndex(db: Db, collectionName: string, keys: Keys, options: CreateIndexesOptions = {}) {
  const col = db.collection(collectionName);

  // 컬렉션이 없을 수도 있으므로 선 생성(있으면 no-op)
  try {
    await db.createCollection(collectionName);
  } catch {
    // 이미 있으면 에러가 나므로 조용히 무시
  }

  // 현재 인덱스 목록을 불러와 동일 키 인덱스가 있는지 검사
  const existing = await col.indexes();
  const wantKeyEntries = Object.entries(keys);
  const existsSameKeys = existing.some((idx) => {
    const key = idx.key as Record<string, IndexDirection>;
    const keyEntries = Object.entries(key);
    // 키 개수 동일 + 모든 키의 방향이 동일하면 "같은 인덱스"로 간주
    const sameLength = keyEntries.length === wantKeyEntries.length;
    const samePairs = sameLength && wantKeyEntries.every(([name, dir]) => key[name] === dir);

    // unique 옵션이 필요한 경우, 기존 인덱스도 unique 여야 동일하다고 인정
    const uniqueOk = options.unique ? idx.unique === true : true;

    return samePairs && uniqueOk;
  });

  // 동일 키 인덱스가 없으면 생성
  if (!existsSameKeys) {
    await col.createIndex(keys, options);
  }
}

/**
 * 패키지 관련 모든 인덱스를 한 번에 보장한다.
 * - 서버 부팅 시 1회만 호출되도록 mongodb 연결 모듈에서 래핑
 */
export async function ensurePassIndexes(db: Db) {
  // ===== service_passes (보유 패키지) =====
  // 유저별 + 상태 + 타입(예: 'stringing') 조회가 잦음
  await ensureIndex(db, 'service_passes', { userId: 1, status: 1, type: 1 }, { name: 'idx_pass_user_status_type' });

  // 주문과의 연결로 역추적/운영 편의
  await ensureIndex(
    db,
    'service_passes',
    { orderId: 1 },
    { name: 'idx_pass_orderId', sparse: true } // orderId가 없을 수도 있으니 sparse
  );

  // (선택 사항) 만료 자동 삭제(TTL)는 정책 확정 후 고려
  // TTL은 expiresAt에 expireAfterSeconds 를 설정해야 하므로 지금은 보류
  // await ensureIndex(db, 'service_passes', { expiresAt: 1 }, { name: 'ttl_pass_expiresAt', expireAfterSeconds: 0 });

  // ===== service_pass_consumptions (차감 멱등 기록) =====
  // (passId, applicationId) 조합은 절대 중복되면 안 됨 → Unique
  await ensureIndex(db, 'service_pass_consumptions', { passId: 1, applicationId: 1 }, { name: 'uniq_pass_application', unique: true });

  // 신청서 기준으로도 역추적이 잦음
  await ensureIndex(db, 'service_pass_consumptions', { applicationId: 1 }, { name: 'idx_consumption_application' });
}
