import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    const token = (await cookies()).get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    const uid = payload?.id ?? payload?.sub ?? payload?._id ?? payload?.userId;
    if (!uid) {
      return NextResponse.json(null, { status: 200, headers: { 'Cache-Control': 'no-store', Vary: 'Cookie' } });
    }

    const db = await getDb();

    // 문자열/오브젝트ID 모두 커버하는 후보 배열
    const productIdCandidates: (string | ObjectId)[] = [productId];
    if (ObjectId.isValid(productId)) productIdCandidates.push(new ObjectId(productId));

    // userId도 프로젝트 스키마에 맞춰 string 또는 ObjectId로 사용
    const userId = ObjectId.isValid(String(uid)) ? new ObjectId(String(uid)) : String(uid);

    const review = await db.collection('reviews').findOne(
      {
        userId,
        isDeleted: { $ne: true },
        // 스키마가 productId 또는 target.productId 인 두 경우를 모두 커버
        $or: [{ productId: { $in: productIdCandidates } }, { 'target.productId': { $in: productIdCandidates } }],
      },
      {
        projection: {
          _id: 1,
          rating: 1,
          createdAt: 1,
          status: 1,
          userName: 1,
          content: 1,
          photos: 1,
        },
      }
    );

    if (!review) {
      return NextResponse.json(null, { status: 200, headers: { 'Cache-Control': 'no-store', Vary: 'Cookie' } });
    }

    return NextResponse.json(
      {
        _id: String(review._id),
        rating: review.rating,
        createdAt: review.createdAt,
        status: review.status, // hidden이어도 본인에게는 원문 그대로 보냄
        userName: review.userName,
        content: review.content,
        photos: review.photos ?? [],
        masked: false,
        ownedByMe: true,
      },
      { headers: { 'Cache-Control': 'no-store', Vary: 'Cookie' } }
    );
  } catch (e) {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
