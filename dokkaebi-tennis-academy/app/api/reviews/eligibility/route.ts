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

  // 인증
  const token = (await cookies()).get('accessToken')?.value;
  if (!token) return NextResponse.json({ eligible: false, reason: 'unauthorized' }, { status: 401 });
  const payload = verifyAccessToken(token);
  if (!payload) return NextResponse.json({ eligible: false, reason: 'unauthorized' }, { status: 401 });

  const db = await getDb();
  const userId = new ObjectId(payload.sub);

  // 상품 모드: productId (+ 선택적으로 orderId) 가 있을 때
  if (productId) {
    if (!ObjectId.isValid(productId)) {
      return NextResponse.json({ eligible: false, reason: 'invalid' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    const productIdObj = new ObjectId(productId);

    // orderId가 같이 온 경우: 소유/포함/중복 체크
    if (orderId) {
      if (!ObjectId.isValid(orderId)) {
        return NextResponse.json({ eligible: false, reason: 'invalid' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
      }
      const orderIdObj = new ObjectId(orderId);

      const order = await db.collection('orders').findOne({ _id: orderIdObj, userId });
      if (!order) return NextResponse.json({ eligible: false, reason: 'orderNotFound' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

      const hasProduct = Array.isArray(order.items) && order.items.some((it: any) => String(it.productId || '') === String(productId));
      if (!hasProduct) {
        return NextResponse.json({ eligible: false, reason: 'productNotInOrder' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
      }

      // 해당 (user, product, order)로 이미 작성했는지
      const already = await db.collection('reviews').findOne({
        userId,
        productId: productIdObj,
        orderId: orderIdObj,
        isDeleted: { $ne: true },
      });
      if (already) return NextResponse.json({ eligible: false, reason: 'already' }, { headers: { 'Cache-Control': 'no-store' } });

      return NextResponse.json({ eligible: true, reason: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // orderId가 없으면: 내 주문 중 아직 리뷰 안 쓴 주문을 추천
    const myOrders = await db.collection('orders').find({ userId, 'items.productId': productIdObj }).project({ _id: 1, createdAt: 1 }).sort({ createdAt: -1 }).toArray();

    if (!myOrders.length) {
      return NextResponse.json({ eligible: false, reason: 'noPurchase' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // 해당 상품으로 이미 리뷰한 주문 목록
    const reviewed = await db
      .collection('reviews')
      .find({ userId, productId: productIdObj, orderId: { $exists: true }, isDeleted: { $ne: true } })
      .project({ orderId: 1 })
      .toArray();
    const reviewedSet = new Set(reviewed.map((r) => String(r.orderId)));

    // 아직 리뷰 안 쓴 최신 주문 pick
    const candidate = myOrders.find((o) => !reviewedSet.has(String(o._id)));
    if (!candidate) return NextResponse.json({ eligible: false, reason: 'already' }, { headers: { 'Cache-Control': 'no-store' } });

    return NextResponse.json({ eligible: true, reason: null, suggestedOrderId: String(candidate._id) }, { headers: { 'Cache-Control': 'no-store' } });
  }

  // productId 없이 orderId만 있을 때 → 주문 내 “다음 미작성 상품” 추천
  if (orderId && !productId && !service) {
    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json({ eligible: false, reason: 'invalid' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    const orderIdObj = new ObjectId(orderId);

    const order = await db.collection('orders').findOne({ _id: orderIdObj, userId });
    if (!order) return NextResponse.json({ eligible: false, reason: 'orderNotFound' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

    const productIds: string[] = (Array.isArray(order.items) ? order.items : []).map((it: any) => (it.productId ? String(it.productId) : null)).filter((v: any): v is string => !!v);

    if (!productIds.length) {
      return NextResponse.json({ eligible: false, reason: 'noPurchase' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const reviewed = await db
      .collection('reviews')
      .find({
        userId,
        orderId: orderIdObj,
        productId: { $in: productIds.map((pid) => new ObjectId(pid)) },
        isDeleted: { $ne: true },
      })
      .project({ productId: 1 })
      .toArray();
    const reviewedSet = new Set(reviewed.map((r) => String(r.productId)));

    const candidatePid = productIds.find((pid) => !reviewedSet.has(pid));
    if (!candidatePid) {
      return NextResponse.json({ eligible: false, reason: 'already' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({ eligible: true, reason: null, suggestedProductId: candidatePid, suggestedOrderId: String(orderIdObj) }, { headers: { 'Cache-Control': 'no-store' } });
  }

  // ===== 서비스(스트링) =====
  if (service === 'stringing') {
    // 특정 신청서 검사 모드
    if (applicationId) {
      if (!ObjectId.isValid(applicationId)) {
        return NextResponse.json({ eligible: false, reason: 'invalid' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
      }
      const appIdObj = new ObjectId(applicationId);
      const app = await db.collection('applications').findOne({ _id: appIdObj, userId });
      if (!app) return NextResponse.json({ eligible: false, reason: 'notPurchased' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

      const already = await db.collection('reviews').findOne({
        userId,
        service: 'stringing',
        serviceApplicationId: appIdObj,
        isDeleted: { $ne: true },
      });
      if (already) return NextResponse.json({ eligible: false, reason: 'already' }, { headers: { 'Cache-Control': 'no-store' } });

      return NextResponse.json({ eligible: true, reason: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // 추천 모드: 아직 리뷰 안 쓴 신청서 하나 추천
    const myApps = await db.collection('applications').find({ userId }).project({ _id: 1, createdAt: 1, desiredDateTime: 1 }).sort({ createdAt: -1 }).toArray();

    if (!myApps.length) {
      return NextResponse.json({ eligible: false, reason: 'notPurchased' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const reviewed = await db
      .collection('reviews')
      .find({ userId, service: 'stringing', serviceApplicationId: { $exists: true }, isDeleted: { $ne: true } })
      .project({ serviceApplicationId: 1 })
      .toArray();
    const reviewedSet = new Set(reviewed.map((r) => String(r.serviceApplicationId)));

    const candidate = myApps.find((a) => !reviewedSet.has(String(a._id)));
    if (!candidate) return NextResponse.json({ eligible: false, reason: 'already' }, { headers: { 'Cache-Control': 'no-store' } });

    return NextResponse.json({ eligible: true, reason: null, suggestedApplicationId: String(candidate._id) }, { headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json({ eligible: false, reason: 'badRequest' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
}
