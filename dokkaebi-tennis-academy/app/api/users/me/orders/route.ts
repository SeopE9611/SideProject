import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

/**
 * 숫자 쿼리 파라미터 안전 파싱 (NaN/Infinity 방지)
 * - 비정상 값이면 defaultValue 적용
 * - min/max 범위로 clamp
 */
function parseIntParam(v: string | null, opts: { defaultValue: number; min: number; max: number }) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

type OrderDoc = {
  _id: ObjectId;
  userId: ObjectId;
  createdAt: Date;
  status: string;
  totalPrice?: number;
  items: Array<{
    productId?: ObjectId | string;
    name?: string;
    price?: number;
    quantity?: number;
    imageUrl?: string | null;
    unitPrice?: number;
    qty?: number;
    count?: number;
    image?: string | null;
    thumbnail?: string | null;
    thumbnailUrl?: string | null;
    images?: string[];
    title?: string;
    productName?: string;
    total?: number;
  }>;
  shippingInfo?: any;
  paymentStatus?: string;
  history?: any[];
};

/** 클라이언트로 내려줄 형태 */
type OrderListItem = {
  id: string;
  date: string;
  status: string;
  total: number; // 합계(하위호환)
  totalPrice: number; // 합계(UI가 쓰는 필드)
  items: Array<{ name: string; price: number; quantity: number; imageUrl?: string | null }>;
  shippingInfo: any;
  paymentStatus: string;
  // 리뷰 관련
  reviewAllDone: boolean;
  unreviewedCount: number;
  reviewNextTargetProductId: string | null;
  // 교체 서비스 관련(프런트 CTA/배너 제어용)
  isStringServiceApplied: boolean;
  stringingApplicationId: string | null;
  // 취소 요청 요약 정보(마이페이지 카드용)
  cancelStatus?: string; // 'none' | 'requested' | 'approved' | 'rejected' 등
  cancelReasonSummary?: string | null;
};

/** 전체 응답 */
type OrderResponse = {
  items: OrderListItem[];
  total: number;
};

/* 주문 총액 계산: 명시 총액이 있으면 그것, 없으면 아이템 합계 */
function calcOrderTotal(o: any): number {
  const explicit = o.totalPrice ?? o.total ?? o.finalAmount ?? o.totalAmount ?? null;
  if (typeof explicit === 'number') return explicit;

  const items: any[] = Array.isArray(o.items) ? o.items : [];
  return items.reduce((sum, it) => {
    const unit = it.price ?? it.unitPrice ?? 0;
    const qty = it.quantity ?? it.qty ?? it.count ?? 1;
    const line = it.total ?? unit * qty;
    return sum + (typeof line === 'number' ? line : 0);
  }, 0);
}

export async function GET(req: NextRequest) {
  try {
    // 인증
    const token = (await cookies()).get('accessToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
    // verifyAccessToken은 throw 가능 → Phase 0: 500 방지(401로 정리)
    let payload: any = null;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
    if (!payload?.sub) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const url = new URL(req.url);
    // Query NaN 방지
    const page = parseIntParam(url.searchParams.get('page'), { defaultValue: 1, min: 1, max: 10_000 });
    const limit = parseIntParam(url.searchParams.get('limit'), { defaultValue: 10, min: 1, max: 20 });
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db();
    // payload.sub → ObjectId 변환 전 선검증 (throw → 500 방지)
    const subStr = String(payload.sub);
    if (!ObjectId.isValid(subStr)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
    const userId = new ObjectId(subStr);

    // 내 주문 조회 (최신순)
    const [orders, total] = await Promise.all([db.collection<OrderDoc>('orders').find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(), db.collection('orders').countDocuments({ userId })]);

    // 주문들에 연결된 '실제 신청서'를 한 번에 조회(draft 제외)
    const orderIds = orders.map((o) => o._id);
    const apps = await db
      .collection('stringing_applications')
      .find({ userId, orderId: { $in: orderIds }, status: { $ne: 'draft' } }, { projection: { _id: 1, orderId: 1 } })
      .toArray();
    const appByOrderId = new Map<string, string>();
    for (const a of apps) appByOrderId.set(String(a.orderId), String(a._id));

    // 각 주문별 리뷰 진행상태 계산
    const list: OrderListItem[] = [];
    for (const order of orders) {
      const items = Array.isArray(order.items) ? order.items : [];

      // 이 주문에서 리뷰 대상이 될 상품 ID 목록 (문자열로 정규화)
      const productIds = items.map((it) => (it?.productId ? String(it.productId) : null)).filter((v): v is string => !!v);
      // ObjectId 변환 throw 방지 (비정상 productId는 리뷰 대상에서 제외)
      const validProductIds = productIds.filter((pid) => ObjectId.isValid(pid));

      // 이미 작성한 리뷰 (user+order + 해당 productIds)
      let reviewedSet = new Set<string>();
      if (validProductIds.length) {
        const reviewed = await db
          .collection('reviews')
          .find({
            userId,
            orderId: order._id,
            productId: { $in: validProductIds.map((s) => new ObjectId(s)) },
            isDeleted: { $ne: true },
          })
          .project({ productId: 1 })
          .toArray();
        reviewedSet = new Set(reviewed.map((r: any) => String(r.productId)));
      }

      const unreviewedIds = validProductIds.filter((pid) => !reviewedSet.has(pid));
      const unreviewedCount = unreviewedIds.length;
      const reviewNextTargetProductId = unreviewedIds.length ? unreviewedIds[0] : null;
      const reviewAllDone = validProductIds.length > 0 && unreviewedCount === 0;

      // 총액 계산
      const totalPrice = calcOrderTotal(order);

      // 취소 요청 정보 정리
      const cancel: any = (order as any).cancelRequest ?? {};
      const rawCancelStatus = cancel.status ?? 'none';

      let cancelReasonSummary: string | null = null;
      if (rawCancelStatus && rawCancelStatus !== 'none') {
        if (cancel.reasonCode) {
          cancelReasonSummary = cancel.reasonCode + (cancel.reasonText ? ` (${cancel.reasonText})` : '');
        } else if (cancel.reasonText) {
          cancelReasonSummary = cancel.reasonText;
        }
      }

      list.push({
        id: String(order._id),
        date: order.createdAt ? new Date(order.createdAt).toISOString() : '',
        status: order.status ?? '',
        total: totalPrice,
        totalPrice,

        // 스냅샷 키 정규화
        items: items.map((it: any) => ({
          name: it.name ?? it.productName ?? it.title ?? '상품',
          price: it.price ?? it.unitPrice ?? 0,
          quantity: it.quantity ?? it.qty ?? it.count ?? 1,
          imageUrl: it.imageUrl ?? it.image ?? it.thumbnail ?? it.thumbnailUrl ?? (Array.isArray(it.images) && it.images[0]) ?? null,
        })),

        shippingInfo: {
          ...(order.shippingInfo ?? {}),
          // 체크아웃에서 온 의사 표시가 없을 때 undefined 방지
          withStringService: Boolean(order.shippingInfo?.withStringService),
        },
        paymentStatus: order.paymentStatus ?? '결제대기',

        reviewAllDone,
        unreviewedCount,
        reviewNextTargetProductId,
        // 실제 신청 여부/ID
        isStringServiceApplied: appByOrderId.has(String(order._id)),
        stringingApplicationId: appByOrderId.get(String(order._id)) ?? null,

        // 취소 요청 요약(마이페이지용)
        cancelStatus: rawCancelStatus,
        cancelReasonSummary,
      });
    }

    return NextResponse.json(
      { items: list, total } satisfies OrderResponse,
      { headers: { 'Cache-Control': 'no-store' } }, // 캐시 금지 (바로 갱신 반영)
    );
  } catch (err) {
    console.error('ORDER_LIST_ERR', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
