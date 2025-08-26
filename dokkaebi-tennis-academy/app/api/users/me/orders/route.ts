import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

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
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get('limit') || '10')));
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db();
    const userId = new ObjectId(payload.sub);

    // 내 주문 조회 (최신순)
    const [orders, total] = await Promise.all([db.collection<OrderDoc>('orders').find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(), db.collection('orders').countDocuments({ userId })]);

    // 각 주문별 리뷰 진행상태 계산
    const list: OrderListItem[] = [];
    for (const order of orders) {
      const items = Array.isArray(order.items) ? order.items : [];

      // 이 주문에서 리뷰 대상이 될 상품 ID 목록 (문자열로 정규화)
      const productIds = items.map((it) => (it?.productId ? String(it.productId) : null)).filter((v): v is string => !!v);

      // 이미 작성한 리뷰 (user+order + 해당 productIds)
      let reviewedSet = new Set<string>();
      if (productIds.length) {
        const reviewed = await db
          .collection('reviews')
          .find({
            userId,
            orderId: order._id,
            productId: { $in: productIds.map((s) => new ObjectId(s)) },
            isDeleted: { $ne: true },
          })
          .project({ productId: 1 })
          .toArray();
        reviewedSet = new Set(reviewed.map((r: any) => String(r.productId)));
      }

      const unreviewedIds = productIds.filter((pid) => !reviewedSet.has(pid));
      const unreviewedCount = unreviewedIds.length;
      const reviewNextTargetProductId = unreviewedIds.length ? unreviewedIds[0] : null;
      const reviewAllDone = productIds.length > 0 && unreviewedCount === 0;

      // 총액 계산
      const totalPrice = calcOrderTotal(order);

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

        shippingInfo: order.shippingInfo ?? {},
        paymentStatus: order.paymentStatus ?? '결제대기',

        reviewAllDone,
        unreviewedCount,
        reviewNextTargetProductId,
      });
    }

    return NextResponse.json(
      { items: list, total } satisfies OrderResponse,
      { headers: { 'Cache-Control': 'no-store' } } // 캐시 금지 (바로 갱신 반영)
    );
  } catch (err) {
    console.error('ORDER_LIST_ERR', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
