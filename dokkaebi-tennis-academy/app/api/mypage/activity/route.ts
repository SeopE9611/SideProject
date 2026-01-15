import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

export const dynamic = 'force-dynamic';

type ActivityKind = 'order' | 'rental' | 'application';

type ActivityOrderSummary = {
  id: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  firstItemName: string;
  itemsCount: number;
  withStringService: boolean;
  stringingApplicationId: string | null;
  cancelStatus?: string | null;
  cancelReasonSummary?: string | null;
};

type ActivityRentalSummary = {
  id: string;
  createdAt: string;
  status: string;
  brand?: string;
  model?: string;
  days?: number;
  totalAmount?: number;
  deposit?: number;
  fee?: number;
  withStringService: boolean;
  stringingApplicationId: string | null;
  cancelStatus?: string | null;
};

type ActivityApplicationSummary = {
  id: string;
  createdAt: string; // appliedAt/createdAt 기준
  status: string;
  racketType: string;
  orderId: string | null;
  rentalId: string | null;
  hasTracking: boolean;
  userConfirmedAt: string | null;
  cancelStatus?: string | null;
  cancelReasonSummary?: string | null;
};

export type ActivityGroup = {
  key: string; // 예: "order:<id>", "rental:<id>", "application:<id>"
  kind: ActivityKind;
  sortAt: string; // 정렬 기준 시각(ISO)
  order?: ActivityOrderSummary;
  rental?: ActivityRentalSummary;
  application?: ActivityApplicationSummary;
};

function toISO(v: any): string {
  // Date/string/number 모두 안전하게 ISO로 변환
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return new Date(0).toISOString();
  return d.toISOString();
}

function calcOrderTotal(o: any): number {
  // 기존 /api/users/me/orders 로직의 축약판(총액이 있으면 우선, 없으면 items 합산)
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

function summarizeRacketType(details: any): string {
  // 신청서 목록(route.ts)처럼 “완벽”하게 만들기보다, 통합 피드용 최소 요약만
  if (details?.racketType && typeof details.racketType === 'string' && details.racketType.trim()) {
    return details.racketType.trim();
  }
  const lines = Array.isArray(details?.racketLines) ? details.racketLines : [];
  if (lines.length > 0) return `라켓 ${lines.length}자루`;
  return '-';
}

// 신청서 배송정보
function getTrackingNoFromShippingInfo(shippingInfo: any): string | null {
  const v = shippingInfo?.selfShip?.trackingNo ?? shippingInfo?.invoice?.trackingNumber ?? shippingInfo?.trackingNumber ?? shippingInfo?.trackingNo ?? null;

  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

/**
 * 통합 활동 API
 * - orders + rental_orders + (standalone) stringing_applications 를 한 리스트로 합친다.
 * - 단, orderId/rentalId가 있는 신청서는 “별도 항목”으로 만들지 않고,
 *   해당 주문/대여 그룹에 붙여서 1건의 활동으로 보여준다.
 */
export async function GET(req: Request) {
  // 1) 인증(프로젝트 기존 패턴 준수)
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  if (!at) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  let payload: any;
  try {
    payload = verifyAccessToken(at);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!payload?.sub) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const userId = new ObjectId(payload.sub);

  // 2) 페이지네이션 파라미터
  const url = new URL(req.url);
  const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(url.searchParams.get('pageSize') || '10', 10), 1), 50);
  const skip = (page - 1) * pageSize;

  // 병합형 페이지네이션의 현실적인 구현:
  // - 각 컬렉션에서 (page*pageSize + buffer) 만큼만 먼저 가져온 뒤,
  // - 합쳐서 정렬하고 slice 하는 방식(유저 데이터가 무한정 크지 않다는 전제에서 v1로 충분)
  const take = page * pageSize + pageSize; // buffer = pageSize

  const db = (await clientPromise).db();

  // 3) total 계산(“그룹 수” 기준)
  // - 주문(orders) + 대여(rental_orders) + 단독 신청서(standalone apps)
  // - orderId/rentalId 연결 신청서는 그룹에 흡수되므로 standalone만 count
  const standaloneAppsFilter = {
    userId,
    status: { $ne: 'draft' },
    $and: [{ $or: [{ orderId: { $exists: false } }, { orderId: null }] }, { $or: [{ rentalId: { $exists: false } }, { rentalId: null }] }],
  };

  const [ordersTotal, rentalsTotal, standaloneAppsTotal] = await Promise.all([
    db.collection('orders').countDocuments({ userId }),
    db.collection('rental_orders').countDocuments({ userId }),
    db.collection('stringing_applications').countDocuments(standaloneAppsFilter),
  ]);

  const total = ordersTotal + rentalsTotal + standaloneAppsTotal;

  // 4) 후보 데이터 로드
  const [orders, rentals, standaloneApps] = await Promise.all([
    db
      .collection('orders')
      .find(
        { userId },
        {
          projection: {
            _id: 1,
            createdAt: 1,
            status: 1,
            paymentStatus: 1,
            totalPrice: 1,
            total: 1,
            items: 1,
            shippingInfo: 1,
            cancelRequest: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .limit(take)
      .toArray(),

    db
      .collection('rental_orders')
      .find(
        { userId },
        {
          projection: {
            _id: 1,
            createdAt: 1,
            status: 1,
            brand: 1,
            model: 1,
            days: 1,
            amount: 1,
            stringingApplicationId: 1,
            stringing: 1,
            cancelRequest: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .limit(take)
      .toArray(),

    db
      .collection('stringing_applications')
      .find(standaloneAppsFilter, {
        projection: {
          _id: 1,
          createdAt: 1,
          appliedAt: 1,
          status: 1,
          stringDetails: 1,
          shippingInfo: 1,
          orderId: 1,
          rentalId: 1,
          userConfirmedAt: 1,
          cancelRequest: 1,
        },
      })
      .sort({ createdAt: -1 })
      .limit(take)
      .toArray(),
  ]);

  // 5) 연결 신청서 로드(주문/대여 후보에 붙일 용도)
  const orderIdsAny = orders.flatMap((o: any) => [o._id, String(o._id)]);
  const rentalIdsAny = rentals.flatMap((r: any) => [r._id, String(r._id)]);

  const linkedApps = await db
    .collection('stringing_applications')
    .find(
      {
        userId,
        status: { $ne: 'draft' },
        $or: [{ orderId: { $in: orderIdsAny } }, { rentalId: { $in: rentalIdsAny } }],
      },
      {
        projection: {
          _id: 1,
          createdAt: 1,
          appliedAt: 1,
          status: 1,
          stringDetails: 1,
          shippingInfo: 1,
          orderId: 1,
          rentalId: 1,
          userConfirmedAt: 1,
          cancelRequest: 1,
        },
      }
    )
    .toArray();

  // orderId/rentalId → applicationSummary 매핑
  const appByOrderId = new Map<string, ActivityApplicationSummary>();
  const appByRentalId = new Map<string, ActivityApplicationSummary>();

  for (const doc of linkedApps as any[]) {
    const details = doc.stringDetails ?? {};
    const shipping = doc.shippingInfo ?? {};
    const hasTracking = Boolean(getTrackingNoFromShippingInfo(shipping));

    const rawCancelStatus = doc?.cancelRequest?.status ?? null;
    let cancelReasonSummary: string | null = null;
    const reasonCode = doc?.cancelRequest?.reasonCode;
    const reasonText = doc?.cancelRequest?.reasonText;
    if (reasonCode) cancelReasonSummary = reasonCode + (reasonText ? ` (${reasonText})` : '');
    else if (reasonText) cancelReasonSummary = reasonText;

    const app: ActivityApplicationSummary = {
      id: String(doc._id),
      createdAt: toISO(doc.appliedAt ?? doc.createdAt),
      status: doc.status ?? '접수',
      racketType: summarizeRacketType(details),
      orderId: doc.orderId ? String(doc.orderId) : null,
      rentalId: doc.rentalId ? String(doc.rentalId) : null,
      hasTracking,
      userConfirmedAt: doc.userConfirmedAt instanceof Date ? doc.userConfirmedAt.toISOString() : typeof doc.userConfirmedAt === 'string' ? doc.userConfirmedAt : null,
      cancelStatus: rawCancelStatus,
      cancelReasonSummary,
    };

    if (doc.orderId) appByOrderId.set(String(doc.orderId), app);
    if (doc.rentalId) appByRentalId.set(String(doc.rentalId), app);
  }

  // 6) 그룹 생성(주문/대여 + 단독신청)
  const groups: ActivityGroup[] = [];

  for (const o of orders as any[]) {
    const orderId = String(o._id);
    const items = Array.isArray(o.items) ? o.items : [];
    const first = items[0] ?? null;

    const linked = appByOrderId.get(orderId);

    const rawCancelStatus = o?.cancelRequest?.status ?? null;
    let cancelReasonSummary: string | null = null;
    const reasonCode = o?.cancelRequest?.reasonCode;
    const reasonText = o?.cancelRequest?.reasonText;
    if (reasonCode) cancelReasonSummary = reasonCode + (reasonText ? ` (${reasonText})` : '');
    else if (reasonText) cancelReasonSummary = reasonText;

    const withStringService = Boolean(o?.shippingInfo?.withStringService);
    const createdAt = toISO(o.createdAt ?? new ObjectId(o._id).getTimestamp());
    const sortAt = linked ? (new Date(linked.createdAt) > new Date(createdAt) ? linked.createdAt : createdAt) : createdAt;

    groups.push({
      key: `order:${orderId}`,
      kind: 'order',
      sortAt,
      order: {
        id: orderId,
        createdAt,
        status: o.status ?? '',
        paymentStatus: o.paymentStatus ?? '',
        totalPrice: calcOrderTotal(o),
        firstItemName: first?.name ?? '(상품명 없음)',
        itemsCount: items.length,
        withStringService,
        stringingApplicationId: linked?.id ?? null,
        cancelStatus: rawCancelStatus,
        cancelReasonSummary,
      },
      application: linked, // 연결 신청서가 있으면 같이 내려줌(카드에서 CTA 가능)
    });
  }

  for (const r of rentals as any[]) {
    const rentalId = String(r._id);
    const linked = appByRentalId.get(rentalId);

    const createdAt = toISO(r.createdAt ?? new ObjectId(r._id).getTimestamp());
    const sortAt = linked ? (new Date(linked.createdAt) > new Date(createdAt) ? linked.createdAt : createdAt) : createdAt;

    const withStringService = Boolean(r?.stringing?.requested) || Boolean(r?.stringingApplicationId);

    groups.push({
      key: `rental:${rentalId}`,
      kind: 'rental',
      sortAt,
      rental: {
        id: rentalId,
        createdAt,
        status: r.status ?? '',
        brand: r.brand,
        model: r.model,
        days: r.days,
        totalAmount: r?.amount?.total,
        deposit: r?.amount?.deposit,
        fee: r?.amount?.fee,
        withStringService,
        stringingApplicationId: r.stringingApplicationId ? String(r.stringingApplicationId) : linked?.id ?? null,
        cancelStatus: r?.cancelRequest?.status ?? null,
      },
      application: linked,
    });
  }

  // 단독 신청서는 “그 자체가 하나의 그룹”
  for (const doc of standaloneApps as any[]) {
    const details = doc.stringDetails ?? {};
    const shipping = doc.shippingInfo ?? {};
    const trackingNo = String((shipping as any)?.trackingNo ?? shipping?.trackingNumber ?? '').trim();
    const hasTracking = Boolean(getTrackingNoFromShippingInfo(shipping));

    const rawCancelStatus = doc?.cancelRequest?.status ?? null;
    let cancelReasonSummary: string | null = null;
    const reasonCode = doc?.cancelRequest?.reasonCode;
    const reasonText = doc?.cancelRequest?.reasonText;
    if (reasonCode) cancelReasonSummary = reasonCode + (reasonText ? ` (${reasonText})` : '');
    else if (reasonText) cancelReasonSummary = reasonText;

    const createdAt = toISO(doc.appliedAt ?? doc.createdAt ?? new ObjectId(doc._id).getTimestamp());

    groups.push({
      key: `application:${String(doc._id)}`,
      kind: 'application',
      sortAt: createdAt,
      application: {
        id: String(doc._id),
        createdAt,
        status: doc.status ?? '접수',
        racketType: summarizeRacketType(details),
        orderId: doc.orderId ? String(doc.orderId) : null,
        rentalId: doc.rentalId ? String(doc.rentalId) : null,
        hasTracking,
        userConfirmedAt: doc.userConfirmedAt instanceof Date ? doc.userConfirmedAt.toISOString() : typeof doc.userConfirmedAt === 'string' ? doc.userConfirmedAt : null,
        cancelStatus: rawCancelStatus,
        cancelReasonSummary,
      },
    });
  }

  // 7) 정렬 + 페이지 슬라이스
  groups.sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());
  const paged = groups.slice(skip, skip + pageSize);

  return NextResponse.json({
    page,
    pageSize,
    total,
    items: paged,
  });
}
