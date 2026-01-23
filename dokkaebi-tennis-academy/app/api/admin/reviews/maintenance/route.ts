import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { ensureReviewIndexes, dedupActiveReviews, rebuildProductRatingSummary } from '@/lib/reviews.maintenance';

type MaintAction = 'createIndexes' | 'dedup' | 'rebuildSummary' | 'all' | undefined;

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

// 공통: 관리자 토큰 체크
async function requireAdmin() {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = safeVerifyAccessToken(token);
  if (!payload?.sub || payload.role !== 'admin') {
    return null;
  }
  return payload;
}

export async function POST(req: Request) {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = safeVerifyAccessToken(token);
  if (!payload?.sub || payload.role !== 'admin') {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  const db = await getDb();
  const locks = db.collection('admin_locks');

  // 1) key에 유니크 인덱스 보장(최초 1회 생성, 에러는 무시)
  await locks.createIndex({ key: 1 }, { unique: true }).catch(() => {});

  const now = new Date();
  const until = new Date(now.getTime() + 5 * 60 * 1000);

  // 2) 락 획득: 만료되었거나 없는 경우에만 갱신/업서트
  try {
    const res = await locks.updateOne({ key: 'reviews_maintenance', $or: [{ lockedUntil: { $lte: now } }, { lockedUntil: { $exists: false } }] }, { $setOnInsert: { key: 'reviews_maintenance' }, $set: { lockedUntil: until } }, { upsert: true });
    // res가 매치/업서트 둘 다 못했으면 락 실패로 간주
    if (res.matchedCount === 0 && !res.upsertedId) {
      return NextResponse.json({ message: 'locked' }, { status: 423 });
    }
  } catch (e: any) {
    // 이미 존재(=누가 선점)해서 업서트가 중복키로 실패하는 경우 → 잠김
    if (e?.code === 11000) {
      return NextResponse.json({ message: 'locked' }, { status: 423 });
    }
    // 그 외 에러 전파
    throw e;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as 'createIndexes' | 'dedup' | 'rebuildSummary' | 'all' | undefined;

    const result: any = {};
    if (!action || action === 'createIndexes' || action === 'all') {
      await ensureReviewIndexes(db);
      result.createIndexes = 'ok';
    }
    if (!action || action === 'dedup' || action === 'all') {
      result.dedup = await dedupActiveReviews(db);
    }
    if (!action || action === 'rebuildSummary' || action === 'all') {
      result.rebuildSummary = await rebuildProductRatingSummary(db);
    }

    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown' }, { status: 500 });
  } finally {
    // 3) 락 해제
    await locks.updateOne({ key: 'reviews_maintenance' }, { $set: { lockedUntil: new Date(0) } }, { upsert: true });
  }
}
/**
 * GET  /api/admin/reviews/maintenance
 * 현재 락 상태 조회 (운영자 확인용)
 */
export async function GET() {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

  const db = await getDb();
  const locks = db.collection('admin_locks');
  const doc = await locks.findOne({ key: 'reviews_maintenance' });
  const now = new Date();
  const locked = !!doc && doc.lockedUntil && doc.lockedUntil > now;
  return NextResponse.json({
    locked,
    lockedUntil: doc?.lockedUntil ?? null,
    startedAt: doc?.startedAt ?? null,
  });
}

/**
 * DELETE /api/admin/reviews/maintenance
 * 강제 해제 (stuck시 관리자 수동 풀기)
 */
export async function DELETE() {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

  const db = await getDb();
  const locks = db.collection('admin_locks');
  await locks.updateOne({ key: 'reviews_maintenance' }, { $set: { lockedUntil: new Date(0) } });
  return NextResponse.json({ ok: true });
}
