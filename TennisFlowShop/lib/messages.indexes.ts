/**
 * 쪽지(messages) 인덱스 보장 유틸
 * - 서버 생애당 1회만 실행되도록 mongodb.ts에서 래핑 호출
 *
 * NOTE
 * - 현재 단계(2-2)에서는 '미열람 카운트' 조회가 핵심이므로
 *   inbox/sent/unread 쿼리 패턴에 맞춘 인덱스만 먼저 보장.
 * - 브로드캐스트 자동 삭제(TTL)는 expiresAt 기반으로 처리.
 */

import type { CreateIndexesOptions, Db, IndexDirection } from 'mongodb';

type Keys = Record<string, IndexDirection>;

async function ensureIndex(db: Db, collectionName: string, keys: Keys, options: CreateIndexesOptions = {}) {
  const col = db.collection(collectionName);

  // 컬렉션이 없으면 만들어 둠(서버리스/로컬 모두 안전)
  try {
    await db.createCollection(collectionName);
  } catch {}

  const existing = await col.indexes();
  const want = Object.entries(keys);

  const exists = existing.some((idx) => {
    const key = idx.key as Record<string, IndexDirection>;
    const sameLen = Object.keys(key).length === want.length;
    const samePairs = sameLen && want.every(([k, v]) => key[k] === v);
    const uniqueOk = options.unique ? idx.unique === true : true;
    const nameOk = options.name ? idx.name === options.name : true;
    return samePairs && uniqueOk && nameOk;
  });

  if (!exists) {
    await col.createIndex(keys, options);
  }
}

export async function ensureMessageIndexes(db: Db) {
  // 받은쪽지함: toUserId 기준 최신
  await ensureIndex(db, 'messages', { toUserId: 1, createdAt: -1 }, { name: 'idx_messages_to_created' });

  // 보낸쪽지함: fromUserId 기준 최신
  await ensureIndex(db, 'messages', { fromUserId: 1, createdAt: -1 }, { name: 'idx_messages_from_created' });

  // 미열람 카운트: toUserId + readAt(null)
  await ensureIndex(db, 'messages', { toUserId: 1, readAt: 1 }, { name: 'idx_messages_to_readAt' });

  // 브로드캐스트 묶음 일괄 삭제/조회: broadcastId
  await ensureIndex(db, 'messages', { broadcastId: 1 }, { name: 'idx_messages_broadcastId' });

  // TTL: expiresAt이 지난 문서는 자동 삭제 (broadcast에서만 expiresAt을 넣는 것을 권장)
  await ensureIndex(
    db,
    'messages',
    {
      expiresAt: 1,
    },
    {
      name: 'ttl_messages_expiresAt',
      expireAfterSeconds: 0,
      partialFilterExpression: { expiresAt: { $type: 'date' } },
    }
  );
}
