// app/api/reviews/eligibility/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get('productId');
  const service = url.searchParams.get('service');
  const applicationId = url.searchParams.get('applicationId');

  const token = (await cookies()).get('accessToken')?.value;
  if (!token) return NextResponse.json({ eligible: false, reason: 'unauthorized' }, { status: 401 });
  const payload = verifyAccessToken(token);
  if (!payload) return NextResponse.json({ eligible: false, reason: 'unauthorized' }, { status: 401 });

  const db = await getDb();
  const userId = new ObjectId(payload.sub);

  // ---- 상품
  if (productId) {
    if (!ObjectId.isValid(productId)) {
      return NextResponse.json({ eligible: false, reason: 'invalid' }, { status: 400 });
    }
    const productIdObj = new ObjectId(productId);

    // 구매 이력
    const bought = await db.collection('orders').findOne({ userId, 'items.productId': { $in: [productId, productIdObj] } }, { projection: { _id: 1 } });
    if (!bought) return NextResponse.json({ eligible: false, reason: 'notPurchased' });

    // 이미 작성?
    const already = await db.collection('reviews').findOne({
      userId,
      $or: [{ productId: productIdObj }, { productId }],
    });
    if (already) return NextResponse.json({ eligible: false, reason: 'already' });

    return NextResponse.json({ eligible: true, reason: null });
  }

  // ---- 서비스(스트링)
  if (service === 'stringing') {
    const apps = await db.collection('stringing_applications').find({ userId }).project({ _id: 1, desiredDateTime: 1, createdAt: 1 }).toArray();

    if (!apps.length) return NextResponse.json({ eligible: false, reason: 'notPurchased' });

    if (applicationId && ObjectId.isValid(applicationId)) {
      const owned = apps.some((a) => String(a._id) === applicationId);
      if (!owned) return NextResponse.json({ eligible: false, reason: 'forbidden' });

      const appIdObj = new ObjectId(applicationId);
      const exists = await db.collection('reviews').findOne({
        userId,
        service: 'stringing',
        $or: [{ serviceApplicationId: appIdObj }, { serviceApplicationId: applicationId }],
      });
      return NextResponse.json({ eligible: !exists, reason: exists ? 'already' : null });
    }

    // 추천 대상(아직 리뷰 안 쓴 신청서)
    const reviewed = await db.collection('reviews').find({ userId, service: 'stringing' }).project({ serviceApplicationId: 1 }).toArray();
    const reviewedSet = new Set(reviewed.map((r) => String(r.serviceApplicationId)));
    const candidate = apps.find((a) => !reviewedSet.has(String(a._id)));
    if (!candidate) return NextResponse.json({ eligible: false, reason: 'already' });

    return NextResponse.json({
      eligible: true,
      reason: null,
      suggestedApplicationId: String(candidate._id),
    });
  }

  return NextResponse.json({ eligible: false, reason: 'badRequest' }, { status: 400 });
}
