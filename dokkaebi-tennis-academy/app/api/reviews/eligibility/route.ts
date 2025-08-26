import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get('productId');
  const orderId = url.searchParams.get('orderId');
  const service = url.searchParams.get('service');
  const applicationId = url.searchParams.get('applicationId');

  const token = (await cookies()).get('accessToken')?.value;
  if (!token) return NextResponse.json({ eligible: false, reason: 'unauthorized' }, { status: 401 });
  const payload = verifyAccessToken(token);
  if (!payload) return NextResponse.json({ eligible: false, reason: 'unauthorized' }, { status: 401 });

  const db = await getDb();
  const userId = new ObjectId(payload.sub);

  // 상품 리뷰 eligibility (주문 단위 정책 반영)
  if (productId) {
    // 주문 유효성: orderId가 있으면 해당 주문이 내 것인지/해당 상품을 포함하는지 검증
    if (orderId) {
      const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId), userId });
      if (!order) return NextResponse.json({ eligible: false, reason: 'orderNotFound' }, { status: 404 });

      // 주문 내 상품 스냅샷에서 productId 포함 여부 확인
      const hasProduct = Array.isArray(order.items) && order.items.some((it: any) => String(it.productId) === productId);
      if (!hasProduct) return NextResponse.json({ eligible: false, reason: 'productNotInOrder' }, { status: 400 });

      // 동일 (userId, productId, orderId) 리뷰 존재 여부 -> 있으면 불가
      const already = await db.collection('reviews').findOne({
        isDeleted: { $ne: true },
        userId,
        productId: new ObjectId(productId),
        orderId: new ObjectId(orderId),
      });
      if (already) return NextResponse.json({ eligible: false, reason: 'already' });

      return NextResponse.json({ eligible: true, reason: null, suggestedOrderId: orderId });
    }

    // orderId가 없는 경우(상품 화면 등): “내 주문 중 아직 리뷰하지 않은 주문 하나”를 제안
    // 정책상 주문 단위 리뷰이므로, 사용자가 선택할 수 있도록 가장 최근 미작성 주문 추천
    const myOrdersWithProduct = await db
      .collection('orders')
      .find({ userId, 'items.productId': new ObjectId(productId) })
      .project({ _id: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .toArray();

    if (myOrdersWithProduct.length === 0) {
      return NextResponse.json({ eligible: false, reason: 'noPurchase' });
    }

    const reviewed = await db
      .collection('reviews')
      .find({ isDeleted: { $ne: true }, userId, productId: new ObjectId(productId), orderId: { $exists: true } })
      .project({ orderId: 1 })
      .toArray();
    const reviewedSet = new Set(reviewed.map((r) => String(r.orderId)));

    const candidate = myOrdersWithProduct.find((o: any) => !reviewedSet.has(String(o._id)));
    if (!candidate) return NextResponse.json({ eligible: false, reason: 'already' });

    return NextResponse.json({
      eligible: true,
      reason: null,
      suggestedOrderId: String(candidate._id), //  프론트에서 이 orderId로 self API 호출/작성 유도 가능
    });
  }

  // 서비스(스트링)
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
