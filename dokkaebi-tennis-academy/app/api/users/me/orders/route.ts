import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

// DB 문서 타입 (Mongo 표현)
type OrderDoc = {
  _id: ObjectId;
  userId: ObjectId;
  createdAt: Date;
  status: string;
  totalPrice: number;
  items: Array<{
    productId?: ObjectId | string;
    name: string;
    price: number;
    imageUrl?: string | null;
    quantity: number;
  }>;
  shippingInfo?: {
    deliveryMethod?: string;
    withStringService?: boolean;
  };
};

// API 응답 타입 (클라이언트 표현)
type OrderResponseItem = {
  id: string; // _id(ObjectId) -> string
  date: string; // createdAt(Date) ->  ISO string
  status: string;
  totalPrice: number;
  items: Array<{ name: string; quantity: number; price: number; imageUrl?: string | null }>;
  shippingInfo?: { deliveryMethod?: string; withStringService?: boolean };
  isStringServiceApplied: boolean;
  reviewAllDone?: boolean;
  unreviewedCount?: number;
  reviewNextTargetProductId?: string | null;
};

type OrderResponse = {
  items: OrderResponseItem[];
  total: number;
};

// DB -> 응답 매핑
function mapOrderDocToResponse(order: OrderDoc, appliedCount: number, reviewAllDone: boolean, extras?: { unreviewedCount?: number; reviewNextTargetProductId?: string | null }): OrderResponseItem {
  return {
    id: order._id.toHexString(),
    date: order.createdAt.toISOString(),
    status: order.status,
    totalPrice: order.totalPrice ?? 0,
    items: order.items.map((it) => ({
      name: it.name,
      quantity: it.quantity,
      price: it.price ?? 0,
      imageUrl: it.imageUrl ?? null,
    })),
    shippingInfo: order.shippingInfo ?? {},
    isStringServiceApplied: appliedCount > 0,
    reviewAllDone,
    unreviewedCount: extras?.unreviewedCount ?? 0,
    reviewNextTargetProductId: extras?.reviewNextTargetProductId ?? null,
  };
}

//  GET 요청 처리 함수 (로그인된 유저의 주문 내역 조회)
export async function GET(req: NextRequest) {
  // 인증
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = verifyAccessToken(token);
  if (!payload?.sub) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  const userId = payload.sub;

  // 페이징
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  const skip = (page - 1) * limit;

  try {
    const client = await clientPromise;
    const db = client.db();

    // 총합
    const total = await db.collection<OrderDoc>('orders').countDocuments({ userId: new ObjectId(userId) });

    // 목록 조회
    const rawOrders = await db
      .collection<OrderDoc>('orders')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // 항목별 계산/매핑
    const items: OrderResponseItem[] = await Promise.all(
      rawOrders.map(async (order) => {
        // 스트링 신청 여부
        const appliedCount = await db.collection('stringing_applications').countDocuments({ orderId: order._id });

        // 리뷰 완료 여부 계산(상품 기준)
        const productIdsRaw = (order.items ?? []).map((it) => it.productId).filter(Boolean);
        const productIds = [...new Set(productIdsRaw.map((x) => String(x!)))]; // 문자열로 통일

        let reviewAllDone = false;
        let unreviewedCount = 0;
        let reviewNextTargetProductId: string | null = null;
        if (productIds.length > 0) {
          const reviewed = await db
            .collection('reviews')
            .find({
              userId: new ObjectId(userId),
              orderId: new ObjectId(order._id),
              productId: { $in: productIds.map((id) => new ObjectId(id)) },
              isDeleted: { $ne: true },
            })
            .project({ productId: 1 })
            .toArray();

          const reviewedSet = new Set(reviewed.map((r: any) => String(r.productId)));
          reviewAllDone = productIds.every((id) => reviewedSet.has(id));
          const unreviewedIds = productIds.filter((id) => !reviewedSet.has(id));
          unreviewedCount = unreviewedIds.length;
          reviewNextTargetProductId = unreviewedIds[0] ?? null;
        }

        // 최종 매핑
        return mapOrderDocToResponse(order, appliedCount, reviewAllDone, {
          unreviewedCount,
          reviewNextTargetProductId,
        });
      })
    );

    // 응답
    return NextResponse.json({ items, total } satisfies OrderResponse);
  } catch (err) {
    console.error('ORDER_LIST_ERR', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
