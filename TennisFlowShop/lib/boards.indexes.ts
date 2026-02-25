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
  // 커뮤니티 조회수 디듀프 TTL (30분~24시간 범위로 안전하게 제한)
  const communityViewDedupeTtlRaw = Number(process.env.COMMUNITY_VIEW_DEDUPE_TTL_SECONDS ?? 60 * 30);
  const communityViewDedupeTtl = Number.isFinite(communityViewDedupeTtlRaw)
    ? Math.max(60 * 30, Math.min(60 * 60 * 24, Math.floor(communityViewDedupeTtlRaw)))
    : 60 * 30;

  // 기본 조회 패턴: 타입/상태별 최신
  await ensureIndex(db, 'board_posts', { type: 1, status: 1, createdAt: -1 }, { name: 'idx_board_type_status_created' });
  // 공지 상단 고정 + 최신
  await ensureIndex(db, 'board_posts', { isPinned: -1, createdAt: -1 }, { name: 'idx_board_pinned_created' });
  // 상품 상세 탭: productRef.productId별 최신
  await ensureIndex(db, 'board_posts', { 'productRef.productId': 1, createdAt: -1 }, { name: 'idx_board_product_created' });
  // 작성자별 히스토리(마이페이지 확장 대비)
  await ensureIndex(db, 'board_posts', { authorId: 1, createdAt: -1 }, { name: 'idx_board_author_created' });
  // 목록용: type/status + isPinned desc + createdAt desc
  await ensureIndex(db, 'board_posts', { type: 1, status: 1, isPinned: -1, createdAt: -1 }, { name: 'boards_list_compound' });
  // 최신 수정순: updatedAt desc
  await ensureIndex(db, 'board_posts', { updatedAt: -1 }, { name: 'boards_updatedAt_desc' });
  // 첨부 경로: attachments.storagePath (스토리지 삭제/정합 점검용)
  await ensureIndex(db, 'board_posts', { 'attachments.storagePath': 1 }, { name: 'boards_attachments_storagePath' });

  // 조회수 중복 방지(dedupe)
  await ensureIndex(db, 'board_view_dedupe', { postId: 1, viewerKey: 1 }, { name: 'board_view_dedupe_unique', unique: true });
  await ensureIndex(db, 'board_view_dedupe', { createdAt: 1 }, { name: 'board_view_dedupe_ttl_30m', expireAfterSeconds: 60 * 30 });

  // 커뮤니티 좋아요 중복 방지 (postId + userId 1회)
  await ensureIndex(db, 'community_likes', { postId: 1, userId: 1 }, { name: 'community_likes_post_user_unique', unique: true });

  // 커뮤니티 조회수 중복 방지 (postId + viewerKey 1회, TTL 이후 재집계 허용)
  await ensureIndex(db, 'community_post_view_dedupe', { postId: 1, viewerKey: 1 }, { name: 'community_post_view_dedupe_unique', unique: true });
  await ensureIndex(db, 'community_post_view_dedupe', { expireAt: 1 }, { name: 'community_post_view_dedupe_expire_at_ttl', expireAfterSeconds: 0 });

  // 기존 createdAt 기반 TTL 인덱스와 달리 expireAt 절대시각을 사용하면 TTL 변경을 즉시 반영하기 쉽다.
  await db.collection('community_post_view_dedupe').updateMany(
    { expireAt: { $exists: false } },
    [
      {
        $set: {
          expireAt: {
            $dateAdd: {
              startDate: '$createdAt',
              unit: 'second',
              amount: communityViewDedupeTtl,
            },
          },
        },
      },
    ],
  );
}
