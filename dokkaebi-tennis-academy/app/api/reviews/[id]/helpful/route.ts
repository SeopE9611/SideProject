import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

type DbAny = any;

// 투표 컬렉션 인덱스: (reviewId, userId) 유니크 -> 중복 투표 방지
async function ensureVotesIndexes(db: DbAny) {
  const col = db.collection('review_votes');
  const idxs = await col
    .listIndexes()
    .toArray()
    .catch(() => [] as any[]);
  const hasKey = (key: Record<string, number>) => idxs.some((i: any) => JSON.stringify(i.key) === JSON.stringify(key));
  if (!hasKey({ reviewId: 1, userId: 1 })) {
    await col.createIndex({ reviewId: 1, userId: 1 }, { unique: true, name: 'review_user_unique' });
  }
  if (!hasKey({ reviewId: 1 })) {
    await col.createIndex({ reviewId: 1 }, { name: 'reviewId_idx' });
  }
}
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const db = await getDb();
  await ensureVotesIndexes(db);

  // 쿠키에서 액세스 토큰 꺼내 인증
  const token = (await cookies()).get('accessToken')?.value;
  if (!token) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  const payload = verifyAccessToken(token);
  if (!payload) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

  //  파라미터 검증
  const { id } = params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, reason: 'badRequest' }, { status: 400 });

  const url = new URL(_req.url);
  const desiredParam = url.searchParams.get('desired'); // 'on' | 'off' | null

  const reviewId = new ObjectId(id);
  const userId = new ObjectId(String(payload.sub)); // 기존 작성 API와 동일 규칙

  const votes = db.collection('review_votes');
  const reviews = db.collection('reviews');

  // 토글 로직: 있으면 삭제, 없으면 생성
  const existing = await votes.findOne({ reviewId, userId });

  // 멱등 동작: desired=on|off면 그 상태를 "보장"
  if (desiredParam === 'on') {
    if (!existing) {
      await votes.insertOne({ reviewId, userId, createdAt: new Date() });
    }
  } else if (desiredParam === 'off') {
    if (existing) {
      await votes.deleteOne({ reviewId, userId });
    }
  } else {
    // === 기존 토글 동작 ===
    if (existing) {
      await votes.deleteOne({ reviewId, userId });
    } else {
      await votes.insertOne({ reviewId, userId, createdAt: new Date() });
    }
  }

  // 재집계(정확성 우선)
  const count = await votes.countDocuments({ reviewId });
  await reviews.updateOne({ _id: reviewId }, { $set: { helpfulCount: count } });

  // 최종 상태(현재 사용자 기준)
  const after = await votes.findOne({ reviewId, userId });
  return NextResponse.json({ ok: true, voted: Boolean(after), helpfulCount: count });
}
