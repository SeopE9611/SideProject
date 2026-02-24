import { verifyAccessToken } from '@/lib/auth.utils';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type UsedRacketDoc = { _id: ObjectId | string } & Record<string, any>;

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = (await clientPromise).db();
  const col = db.collection<UsedRacketDoc>('used_rackets');
  const { id } = await params;

  const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
  const doc = await col.findOne(filter);

  if (!doc) {
    return NextResponse.json({ message: 'Not Found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  // 라켓 상세에서도 리뷰 탭이 보이도록: 최신 리뷰 + 요약(평균/개수) 포함
  // - 리뷰 스키마는 productId로 통일되어 있으므로(라켓도 productId 사용), 그대로 reuse
  // - hidden 리뷰는 공개 화면에서 마스킹
  // - 로그인 유저면 ownedByMe 표시(클라에서 /api/reviews/self로 원문 병합 가능)
  const token = (await cookies()).get('accessToken')?.value;
  let currentUserId: ObjectId | null = null;
  const payload = safeVerifyAccessToken(token);
  if (payload?.sub && ObjectId.isValid(String(payload.sub))) {
    currentUserId = new ObjectId(String(payload.sub));
  }

  const objId = ObjectId.isValid(id) ? new ObjectId(id) : null;

  const reviews = objId
    ? await db
        .collection('reviews')
        .aggregate([
          {
            $match: {
              productId: objId,
              status: { $in: ['visible', 'hidden'] },
              isDeleted: { $ne: true },
            },
          },
          { $sort: { createdAt: -1, _id: -1 } },
          { $limit: 10 },
          {
            $project: {
              _id: 1,
              rating: 1,
              createdAt: 1,
              status: 1,
              helpfulCount: 1,
              userId: 1, // ownedByMe 계산용 (다음 스테이지에서 제거)
              // 숨김이면 보안상 원본 차단(마스킹)
              userName: { $cond: [{ $eq: ['$status', 'hidden'] }, null, '$userName'] },
              content: { $cond: [{ $eq: ['$status', 'hidden'] }, null, '$content'] },
              photos: { $cond: [{ $eq: ['$status', 'hidden'] }, [], { $ifNull: ['$photos', []] }] },
              masked: { $eq: ['$status', 'hidden'] },
            },
          },
          ...(currentUserId ? [{ $addFields: { ownedByMe: { $eq: ['$userId', currentUserId] } } }] : [{ $addFields: { ownedByMe: false } }]),
          { $project: { userId: 0 } },
        ])
        .toArray()
    : [];

  const agg = objId
    ? await db
        .collection('reviews')
        .aggregate([{ $match: { productId: objId, status: 'visible', isDeleted: { $ne: true } } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }])
        .toArray()
    : [];

  const payloadDoc: any = {
    ...doc,
    id: String(doc._id),
    _id: undefined,
    reviews: (reviews ?? []).map((r: any) => ({
      _id: r._id,
      user: r.userName,
      rating: r.rating,
      date: r.createdAt?.toISOString?.().slice(0, 10) ?? null,
      content: r.content,
      status: r.status,
      photos: r.photos,
      masked: r.masked,
      ownedByMe: r.ownedByMe,
    })),
    reviewSummary: {
      average: agg[0]?.avg ? Number(agg[0].avg.toFixed(2)) : 0,
      count: agg[0]?.count ?? 0,
    },
  };

  return NextResponse.json(payloadDoc, { headers: { 'Cache-Control': 'no-store' } });
}
