/**
 * 게시판(board_posts) 인덱스 보장 유틸
 * - 서버 생애당 1회만 실행되도록 mongodb.ts에서 래핑 호출
 */
import type { CreateIndexesOptions, Db, IndexDirection } from 'mongodb';

type Keys = Record<string, IndexDirection>;

async function ensureIndex(db: Db, collectionName: string, keys: Keys, options: CreateIndexesOptions = {}) {
  const col = db.collection(collectionName);
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
    return samePairs && uniqueOk;
  });
  if (!exists) await col.createIndex(keys, options);
}

export async function ensureBoardIndexes(db: Db) {
  // 기본 조회 패턴: 타입/상태별 최신
  await ensureIndex(db, 'board_posts', { type: 1, status: 1, createdAt: -1 }, { name: 'idx_board_type_status_created' });
  // 공지 상단 고정 + 최신
  await ensureIndex(db, 'board_posts', { isPinned: -1, createdAt: -1 }, { name: 'idx_board_pinned_created' });
  // 상품 상세 탭: productRef.productId별 최신
  await ensureIndex(db, 'board_posts', { 'productRef.productId': 1, createdAt: -1 }, { name: 'idx_board_product_created' });
  // 작성자별 히스토리(마이페이지 확장 대비)
  await ensureIndex(db, 'board_posts', { authorId: 1, createdAt: -1 }, { name: 'idx_board_author_created' });
}
