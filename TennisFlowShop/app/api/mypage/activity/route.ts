import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';

export const dynamic = 'force-dynamic';

// 숫자 쿼리 파라미터 안전 파싱 (NaN/Infinity/음수 방지 + 범위 보정)
function parseIntParam(v: string | null, opts: { defaultValue: number; min: number; max: number }) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

type ActivityKind = 'order' | 'rental' | 'application';
type ActivityScope = 'all' | 'todo' | 'order' | 'application' | 'rental';

function parseScopeParam(v: string | null): ActivityScope {
  if (v === 'todo' || v === 'order' || v === 'application' || v === 'rental') return v;
  return 'all';
}

type ActivityOrderSummary = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  firstItemName: string;
  itemsCount: number;
  withStringService: boolean;
  stringingApplicationIds: string[];
  applicationSummaries: ActivityApplicationSummary[];
  stringingApplicationId: string | null;
  cancelStatus?: string | null;
  cancelReasonSummary?: string | null;
  hasRacketItem: boolean;
  hasStringItem: boolean;
  hasProductItem: boolean;
  linkedApplicationCount: number;
};

type ActivityRentalSummary = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  brand?: string;
  model?: string;
  days?: number;
  totalAmount?: number;
  deposit?: number;
  fee?: number;
  withStringService: boolean;
  stringingApplicationIds: string[];
  applicationSummaries: ActivityApplicationSummary[];
  stringingApplicationId: string | null;
  cancelStatus?: string | null;
  linkedApplicationCount: number;
};

type FlowType = 'order_only' | 'order_plus_stringing' | 'rental_only' | 'rental_plus_stringing' | 'application_only';

type DetailTarget = {
  type: 'order' | 'application' | 'rental';
  id: string;
};

type ActivityApplicationSummary = {
  id: string;
  createdAt: string; // appliedAt/createdAt 기준
  updatedAt: string;
  status: string;
  racketType: string;
  orderId: string | null;
  rentalId: string | null;
  hasTracking: boolean;
  userConfirmedAt: string | null;
  cancelStatus?: string | null;
  cancelReasonSummary?: string | null;
  inboundRequired: boolean; // 고객→매장 입고가 필요한가?
  needsInboundTracking: boolean; // 입고가 필요하고 + 자가발송(self_ship)이라 운송장 입력이 필요한가?
};

export type ActivityGroup = {
  key: string; // 예: "order:<id>", "rental:<id>", "application:<id>"
  kind: ActivityKind;
  sortAt: string; // 정렬 기준 시각(ISO)
  order?: ActivityOrderSummary;
  rental?: ActivityRentalSummary;
  application?: ActivityApplicationSummary;
  flowType: FlowType;
  flowLabel: string;
  detailTarget: DetailTarget;
};

function getOrderFlowLabel(opts: { hasRacketItem: boolean; hasStringItem: boolean; hasProductItem: boolean; linkedApplicationCount: number }): string {
  const { hasRacketItem, hasStringItem, hasProductItem, linkedApplicationCount } = opts;
  const hasLinked = linkedApplicationCount > 0;

  if (!hasLinked) {
    if (hasRacketItem && hasStringItem) return '라켓 + 스트링 주문';
    if (hasRacketItem) return hasProductItem ? '라켓 포함 주문' : '라켓 주문';
    if (hasStringItem) return '스트링 단품 주문';
    return '일반 상품 주문';
  }

  if (hasRacketItem && hasStringItem) return '라켓 구매 + 스트링 + 교체서비스';
  if (hasStringItem) return '스트링 구매 + 교체서비스';
  if (hasRacketItem) return '라켓 구매 + 교체서비스';
  return '주문 + 교체서비스';
}

function toISO(v: any): string {
  // Date/string/number 모두 안전하게 ISO로 변환
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return new Date(0).toISOString();
  return d.toISOString();
}

function isoMax(...values: Array<string | null | undefined>): string {
  const base = new Date(0).toISOString();
  return values.filter((v): v is string => Boolean(v)).reduce((acc, cur) => (cur > acc ? cur : acc), base);
}

function compareByUpdatedThenCreatedDesc(a: Pick<ActivityApplicationSummary, 'updatedAt' | 'createdAt'>, b: Pick<ActivityApplicationSummary, 'updatedAt' | 'createdAt'>) {
  return b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt);
}

function isActionableInboundTracking(app?: Pick<ActivityApplicationSummary, 'needsInboundTracking' | 'hasTracking'> | null) {
  return Boolean(app?.needsInboundTracking && !app?.hasTracking);
}

function pickPrimaryLinkedApplication(apps: ActivityApplicationSummary[]) {
  // 정책:
  // 1) 사용자 액션(운송장 등록)이 필요한 신청서를 우선 대표로 노출
  // 2) 없으면 최신 업데이트 신청서를 대표로 사용
  return apps.find((app) => isActionableInboundTracking(app)) ?? apps[0];
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

  const subStr = String(payload.sub);
  if (!ObjectId.isValid(subStr)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const userId = new ObjectId(subStr);

  // 2) 페이지네이션 파라미터
  const url = new URL(req.url);
  const page = parseIntParam(url.searchParams.get('page'), { defaultValue: 1, min: 1, max: 10_000 });
  const pageSize = parseIntParam(url.searchParams.get('pageSize'), { defaultValue: 10, min: 1, max: 50 });
  const scope = parseScopeParam(url.searchParams.get('scope'));
  const skip = (page - 1) * pageSize;

  // 병합형 페이지네이션의 현실적인 구현:
  // - 각 컬렉션에서 (page*pageSize + buffer) 만큼만 먼저 가져온 뒤,
  // - 합쳐서 정렬하고 slice 하는 방식(유저 데이터가 무한정 크지 않다는 전제에서 v1로 충분)
  const take = page * pageSize + pageSize; // buffer = pageSize

  const db = (await clientPromise).db();

  const standaloneAppsFilter = {
    userId,
    status: { $ne: 'draft' },
    $and: [{ $or: [{ orderId: { $exists: false } }, { orderId: null }] }, { $or: [{ rentalId: { $exists: false } }, { rentalId: null }] }],
  };

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
            updatedAt: 1,
            status: 1,
            paymentStatus: 1,
            totalPrice: 1,
            total: 1,
            items: 1,
            shippingInfo: 1,
            cancelRequest: 1,
          },
        },
      )
      .sort({ updatedAt: -1, createdAt: -1 })
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
            updatedAt: 1,
            status: 1,
            brand: 1,
            model: 1,
            days: 1,
            amount: 1,
            stringingApplicationId: 1,
            stringing: 1,
            cancelRequest: 1,
          },
        },
      )
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(take)
      .toArray(),

    db
      .collection('stringing_applications')
      .find(standaloneAppsFilter, {
        projection: {
          _id: 1,
          createdAt: 1,
          updatedAt: 1,
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
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(take)
      .toArray(),
  ]);

  /**
   * order 기반 신청서의 "라켓 포함 여부"를 미리 계산
   * - order.items[].kind === 'racket' | 'used_racket' 이면: 매장 라켓(구매/중고) 기반 → 고객 입고/운송장 불필요
   * - (Activity API는 take만큼만 로드하므로, 여기서는 로드된 orders 범위에서만 판단하면 충분)
   */
  const orderHasRacketById = new Map<string, boolean>();
  for (const o of orders as any[]) {
    const items = Array.isArray(o.items) ? o.items : [];
    const hasRacket = items.some((it: any) => it?.kind === 'racket' || it?.kind === 'used_racket');
    orderHasRacketById.set(String(o._id), hasRacket);
  }

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
          updatedAt: 1,
          appliedAt: 1,
          status: 1,
          stringDetails: 1,
          shippingInfo: 1,
          orderId: 1,
          rentalId: 1,
          userConfirmedAt: 1,
          cancelRequest: 1,
        },
      },
    )
    .toArray();

  // orderId/rentalId → applicationSummary 매핑
  const appByOrderId = new Map<string, ActivityApplicationSummary[]>();
  const appByRentalId = new Map<string, ActivityApplicationSummary[]>();

  for (const doc of linkedApps as any[]) {
    const details = doc.stringDetails ?? {};
    const shipping = doc.shippingInfo ?? {};
    const hasTracking = Boolean(getTrackingNoFromShippingInfo(shipping));

    // 수거 방식(visit/self_ship) 정규화
    const collectionMethod = normalizeCollection((shipping as any)?.collectionMethod ?? (doc as any)?.collectionMethod ?? 'self_ship');

    // 입고 필요 여부 판단
    // - rentalId 연결: 매장 라켓 기반 → 고객 입고 불필요
    // - orderId 연결 + 해당 주문에 racket 포함: 매장 라켓(구매) 기반 → 고객 입고 불필요
    // - 그 외(주문에 라켓 없음 / 스트링만 구매+서비스 등): 고객 라켓 기반 → 입고 필요
    const orderIdStr = doc.orderId ? String(doc.orderId) : null;
    const inboundRequired = doc.rentalId ? false : orderIdStr && orderHasRacketById.get(orderIdStr) ? false : true;
    const needsInboundTracking = inboundRequired && collectionMethod === 'self_ship';

    const rawCancelStatus = doc?.cancelRequest?.status ?? null;
    let cancelReasonSummary: string | null = null;
    const reasonCode = doc?.cancelRequest?.reasonCode;
    const reasonText = doc?.cancelRequest?.reasonText;
    if (reasonCode) cancelReasonSummary = reasonCode + (reasonText ? ` (${reasonText})` : '');
    else if (reasonText) cancelReasonSummary = reasonText;

    const createdAt = toISO(doc.appliedAt ?? doc.createdAt);
    const updatedAt = toISO(doc.updatedAt ?? doc.appliedAt ?? doc.createdAt);

    const app: ActivityApplicationSummary = {
      id: String(doc._id),
      createdAt,
      updatedAt,
      status: doc.status ?? '접수',
      racketType: summarizeRacketType(details),
      orderId: doc.orderId ? String(doc.orderId) : null,
      rentalId: doc.rentalId ? String(doc.rentalId) : null,
      hasTracking,
      userConfirmedAt: doc.userConfirmedAt instanceof Date ? doc.userConfirmedAt.toISOString() : typeof doc.userConfirmedAt === 'string' ? doc.userConfirmedAt : null,
      cancelStatus: rawCancelStatus,
      cancelReasonSummary,
      inboundRequired,
      needsInboundTracking,
    };

    if (doc.orderId) {
      const key = String(doc.orderId);
      const bucket = appByOrderId.get(key) ?? [];
      bucket.push(app);
      appByOrderId.set(key, bucket);
    }
    if (doc.rentalId) {
      const key = String(doc.rentalId);
      const bucket = appByRentalId.get(key) ?? [];
      bucket.push(app);
      appByRentalId.set(key, bucket);
    }
  }

  for (const [, apps] of appByOrderId) {
    apps.sort(compareByUpdatedThenCreatedDesc);
  }
  for (const [, apps] of appByRentalId) {
    apps.sort(compareByUpdatedThenCreatedDesc);
  }

  // 6) 그룹 생성(주문/대여 + 단독신청)
  const groups: ActivityGroup[] = [];

  for (const o of orders as any[]) {
    const orderId = String(o._id);
    const items = Array.isArray(o.items) ? o.items : [];
    const first = items[0] ?? null;

    const linkedApps = appByOrderId.get(orderId) ?? [];
    const linked = pickPrimaryLinkedApplication(linkedApps);
    const hasRacketItem = items.some((item: any) => item?.kind === 'racket' || item?.kind === 'used_racket');
    const hasStringItem = items.some((item: any) => item?.kind === 'string');
    const hasProductItem = items.some((item: any) => !['racket', 'used_racket', 'string'].includes(String(item?.kind ?? '')));

    const rawCancelStatus = o?.cancelRequest?.status ?? null;
    let cancelReasonSummary: string | null = null;
    const reasonCode = o?.cancelRequest?.reasonCode;
    const reasonText = o?.cancelRequest?.reasonText;
    if (reasonCode) cancelReasonSummary = reasonCode + (reasonText ? ` (${reasonText})` : '');
    else if (reasonText) cancelReasonSummary = reasonText;

    const withStringService = Boolean(o?.shippingInfo?.withStringService);
    const createdAt = toISO(o.createdAt ?? new ObjectId(o._id).getTimestamp());
    const updatedAt = toISO(o.updatedAt ?? o.createdAt ?? new ObjectId(o._id).getTimestamp());
    const sortAt = isoMax(updatedAt, createdAt, linked?.updatedAt, linked?.createdAt);

    groups.push({
      key: `order:${orderId}`,
      kind: 'order',
      sortAt,
      flowType: linkedApps.length > 0 ? 'order_plus_stringing' : 'order_only',
      flowLabel: getOrderFlowLabel({ hasRacketItem, hasStringItem, hasProductItem, linkedApplicationCount: linkedApps.length }),
      detailTarget: {
        type: 'order',
        id: orderId,
      },
      order: {
        id: orderId,
        createdAt,
        updatedAt,
        status: o.status ?? '',
        paymentStatus: o.paymentStatus ?? '',
        totalPrice: calcOrderTotal(o),
        firstItemName: first?.name ?? '(상품명 없음)',
        itemsCount: items.length,
        withStringService,
        stringingApplicationIds: linkedApps.map((app) => app.id),
        applicationSummaries: linkedApps,
        stringingApplicationId: linked?.id ?? null,
        cancelStatus: rawCancelStatus,
        cancelReasonSummary,
        hasRacketItem,
        hasStringItem,
        hasProductItem,
        linkedApplicationCount: linkedApps.length,
      },
      application: linked, // 연결 신청서가 있으면 같이 내려줌(카드에서 CTA 가능)
    });
  }

  for (const r of rentals as any[]) {
    const rentalId = String(r._id);
    const linkedApps = appByRentalId.get(rentalId) ?? [];
    const linked = pickPrimaryLinkedApplication(linkedApps);

    const createdAt = toISO(r.createdAt ?? new ObjectId(r._id).getTimestamp());
    const updatedAt = toISO(r.updatedAt ?? r.createdAt ?? new ObjectId(r._id).getTimestamp());
    const sortAt = isoMax(updatedAt, createdAt, linked?.updatedAt, linked?.createdAt);

    const withStringService = Boolean(r?.stringing?.requested) || Boolean(r?.stringingApplicationId);

    groups.push({
      key: `rental:${rentalId}`,
      kind: 'rental',
      sortAt,
      flowType: linkedApps.length > 0 ? 'rental_plus_stringing' : 'rental_only',
      flowLabel: linkedApps.length > 0 ? '라켓 대여 + 교체서비스' : '라켓 대여',
      detailTarget: {
        type: 'rental',
        id: rentalId,
      },
      rental: {
        id: rentalId,
        createdAt,
        updatedAt,
        status: r.status ?? '',
        brand: r.brand,
        model: r.model,
        days: r.days,
        totalAmount: r?.amount?.total,
        deposit: r?.amount?.deposit,
        fee: r?.amount?.fee,
        withStringService,
        stringingApplicationIds: linkedApps.map((app) => app.id),
        applicationSummaries: linkedApps,
        stringingApplicationId: linked?.id ?? null,
        cancelStatus: r?.cancelRequest?.status ?? null,
        linkedApplicationCount: linkedApps.length,
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

    // 단독 신청서는 기본적으로 "고객 라켓 입고"가 필요
    const collectionMethod = normalizeCollection((shipping as any)?.collectionMethod ?? (doc as any)?.collectionMethod ?? 'self_ship');
    const inboundRequired = true;
    const needsInboundTracking = inboundRequired && collectionMethod === 'self_ship';

    const rawCancelStatus = doc?.cancelRequest?.status ?? null;
    let cancelReasonSummary: string | null = null;
    const reasonCode = doc?.cancelRequest?.reasonCode;
    const reasonText = doc?.cancelRequest?.reasonText;
    if (reasonCode) cancelReasonSummary = reasonCode + (reasonText ? ` (${reasonText})` : '');
    else if (reasonText) cancelReasonSummary = reasonText;

    const createdAt = toISO(doc.appliedAt ?? doc.createdAt ?? new ObjectId(doc._id).getTimestamp());
    const updatedAt = toISO(doc.updatedAt ?? doc.appliedAt ?? doc.createdAt ?? new ObjectId(doc._id).getTimestamp());
    const sortAt = isoMax(updatedAt, createdAt);
    groups.push({
      key: `application:${String(doc._id)}`,
      kind: 'application',
      sortAt,
      flowType: 'application_only',
      flowLabel: '교체서비스 단독 신청',
      detailTarget: {
        type: 'application',
        id: String(doc._id),
      },
      application: {
        id: String(doc._id),
        createdAt,
        updatedAt,
        status: doc.status ?? '접수',
        racketType: summarizeRacketType(details),
        orderId: doc.orderId ? String(doc.orderId) : null,
        rentalId: doc.rentalId ? String(doc.rentalId) : null,
        hasTracking,
        userConfirmedAt: doc.userConfirmedAt instanceof Date ? doc.userConfirmedAt.toISOString() : typeof doc.userConfirmedAt === 'string' ? doc.userConfirmedAt : null,
        cancelStatus: rawCancelStatus,
        cancelReasonSummary,
        inboundRequired,
        needsInboundTracking,
      },
    });
  }

  // 7) scope 필터 + 정렬 + 페이지 슬라이스
  const scopedGroups = groups.filter((group) => {
    if (scope === 'all') return true;
    if (scope === 'order') return group.kind === 'order';
    if (scope === 'rental') return group.kind === 'rental';
    if (scope === 'application') return group.kind === 'application';

    if (scope === 'todo') {
      const status = String(group.kind === 'order' ? group.order?.status ?? '' : group.kind === 'rental' ? group.rental?.status ?? '' : group.application?.status ?? '');
      const orderNeedsAction =
        group.kind === 'order' &&
        Boolean(
          group.order?.cancelStatus === 'requested' ||
            ['대기중', '결제완료'].includes(status) ||
            status === '배송완료' ||
            group.order?.stringingApplicationId,
        );

      const applicationNeedsAction =
        group.kind === 'application' &&
        Boolean(
          (group.application?.needsInboundTracking && !group.application?.hasTracking) ||
            group.application?.cancelStatus === 'requested' ||
            group.application?.cancelStatus === '요청' ||
            ['접수완료', '검토 중'].includes(status) ||
            (status === '교체완료' && !group.application?.userConfirmedAt),
        );

      const rentalNeedsAction =
        group.kind === 'rental' &&
        Boolean(
          group.rental?.cancelStatus === 'requested' ||
            ['pending', 'paid'].includes(status) ||
            (!group.rental?.stringingApplicationId && group.rental?.withStringService),
        );

      return orderNeedsAction || applicationNeedsAction || rentalNeedsAction;
    }

    return true;
  });

  scopedGroups.sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());
  const paged = scopedGroups.slice(skip, skip + pageSize);

  return NextResponse.json({
    page,
    pageSize,
    total: scopedGroups.length,
    items: paged,
  });
}
