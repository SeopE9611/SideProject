import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

/**
 * 복기 메모
 * - 상품: ?productId=... [&orderId=...]
 *   - orderId 있으면: 해당 주문이 내 것인지 + 해당 상품을 포함하는지 검증 후
 *     이미 리뷰 쓴 경우 => { eligible:false, reason:'already' }
 *     아니면 => { eligible:true }
 *   - orderId 없으면: 내 주문 중 해당 상품 포함 + 아직 리뷰 안 쓴 주문을 찾아
 *     => { eligible:true, suggestedOrderId:'...' }
 *     없으면 => { eligible:false, reason:'already' | 'noPurchase' }
 *
 * - 서비스: ?service=stringing [&applicationId=...]
 *   (기존 로직 유지. 아직 리뷰 안 쓴 신청서 있으면 추천)
 */
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

  // ===== 상품 리뷰 =====
  if (productId) {
    if (!ObjectId.isValid(productId)) {
      return NextResponse.json({ eligible: false, reason: 'invalid' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    const productIdObj = new ObjectId(productId);

    // orderId가 있으면: 그 주문이 내 것인지 + 상품 포함 여부 확인
    if (orderId) {
      if (!ObjectId.isValid(orderId)) {
        return NextResponse.json({ eligible: false, reason: 'invalid' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
      }
      const orderIdObj = new ObjectId(orderId);
      const order = await db.collection('orders').findOne({ _id: orderIdObj, userId });
      if (!order) return NextResponse.json({ eligible: false, reason: 'orderNotFound' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

      const hasProduct =
        Array.isArray(order.items) &&
        order.items.some((it: any) => {
          const pid = it.productId ? String(it.productId) : null;
          return pid === productId;
        });
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

      if (already) {
        return NextResponse.json({ eligible: false, reason: 'already' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
      }
      return NextResponse.json({ eligible: true, reason: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // orderId 없으면: 내 주문 중 해당 상품 포함 + 아직 리뷰 안 쓴 주문 추천
    const myOrders = await db.collection('orders').find({ userId, 'items.productId': productIdObj }).project({ _id: 1, createdAt: 1 }).sort({ createdAt: -1 }).toArray();

    if (myOrders.length === 0) {
      return NextResponse.json({ eligible: false, reason: 'noPurchase' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
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
    if (!candidate) {
      return NextResponse.json({ eligible: false, reason: 'already' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({ eligible: true, reason: null, suggestedOrderId: String(candidate._id) }, { headers: { 'Cache-Control': 'no-store' } });
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

    if (myApps.length === 0) {
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
