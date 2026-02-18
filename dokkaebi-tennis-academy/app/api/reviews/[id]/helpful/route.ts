import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

type DbAny = any;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await getDb();

  // 쿠키에서 액세스 토큰 꺼내 인증
  const token = (await cookies()).get('accessToken')?.value;
  if (!token) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

  // verifyAccessToken이 만료/깨진 토큰에서 throw 되어도 500으로 터지지 않게 방어
  let payload: any = null;
  try {
    payload = verifyAccessToken(token);
  } catch {
    payload = null;
  }
  const subStr = payload?.sub ? String(payload.sub) : '';
  // sub는 ObjectId 문자열이어야 함 (new ObjectId에서 500 방지)
  if (!subStr || !ObjectId.isValid(subStr)) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, reason: 'badRequest' }, { status: 400 });

  const url = new URL(_req.url);
  const desiredParam = url.searchParams.get('desired'); // 'on' | 'off' | null

  const reviewId = new ObjectId(id);
  const userId = new ObjectId(subStr); // ObjectId 유효성 보장된 값만 사용

  const votes = db.collection('review_votes');
  const reviews = db.collection('reviews');

  // 리뷰 존재 검증(삭제/미존재 리뷰에 투표 로그가 남는 데이터 오염 방지)
  const exists = await reviews.findOne({ _id: reviewId, isDeleted: { $ne: true } }, { projection: { _id: 1 } });
  if (!exists) return NextResponse.json({ ok: false, reason: 'notFound' }, { status: 404 });

  // 토글 로직: 있으면 삭제, 없으면 생성
  const existing = await votes.findOne({ reviewId, userId });

  // insertOne이 동시 요청에서 중복키(11000)로 터질 수 있어 멱등 처리 필요
  const safeInsertVote = async () => {
    try {
      await votes.insertOne({ reviewId, userId, createdAt: new Date() });
    } catch (e: any) {
      // 유니크 인덱스에 의해 "이미 투표됨"이면 정상 케이스로 간주(500 방지)
      if (e?.code === 11000) return;
      throw e;
    }
  };

  // 멱등 동작: desired=on|off면 그 상태를 "보장"
  if (desiredParam === 'on') {
    if (!existing) {
      await safeInsertVote();
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
      await safeInsertVote();
    }
  }

  // 재집계(정확성 우선)
  const count = await votes.countDocuments({ reviewId });
  await reviews.updateOne({ _id: reviewId }, { $set: { helpfulCount: count } });

  // 최종 상태(현재 사용자 기준)
  const after = await votes.findOne({ reviewId, userId });
  return NextResponse.json({ ok: true, voted: Boolean(after), helpfulCount: count });
}
