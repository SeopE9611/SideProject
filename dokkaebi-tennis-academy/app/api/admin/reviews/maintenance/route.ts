import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { ensureReviewIndexes, dedupActiveReviews, rebuildProductRatingSummary } from '@/lib/reviews.maintenance';

export async function POST(req: Request) {
  // 관리자 권한 검사
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sub || payload.role !== 'admin') {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  const db = await getDb();

  // 동시 실행 방지(간단 락)
  const locks = db.collection('admin_locks');
  const now = new Date();
  const res = await locks.findOneAndUpdate(
    { key: 'reviews_maintenance', $or: [{ lockedUntil: { $lte: now } }, { lockedUntil: { $exists: false } }] },
    { $set: { key: 'reviews_maintenance', lockedUntil: new Date(now.getTime() + 5 * 60 * 1000) } },
    { upsert: true, returnDocument: 'after' }
  );

  const lockDoc = res?.value;
  if (!lockDoc) {
    return NextResponse.json({ message: 'locked' }, { status: 423 }); // 잠금 중
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
    // 락 해제(만료 자동 삭제도 TTL 인덱스로 보조)
    await locks.updateOne({ key: 'reviews_maintenance' }, { $set: { lockedUntil: new Date(0) } });
  }
}
