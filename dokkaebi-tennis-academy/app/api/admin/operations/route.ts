import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { toISO, normalizeOrderStatus, normalizePaymentStatus, normalizeRentalStatus, summarizeOrderItems, pickCustomerFromDoc, normalizeRentalAmountTotal } from '@/lib/admin-ops-normalize';
export const dynamic = 'force-dynamic';

type Kind = 'order' | 'stringing_application' | 'rental';

type Flow = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type SettlementAnchor = 'order' | 'rental' | 'application';

type OpItem = {
  id: string;
  kind: Kind;
  createdAt: string | null;
  customer: { name: string; email: string };
  title: string; // 목록에서 한 줄로 보일 “요약”
  statusLabel: string; // 화면 표시용(한글)
  paymentLabel?: string; // 주문/신청서에서만 사용
  amount: number; // 화면 표시용 “총액”
  flow: Flow; // 7개 시나리오(운영자 언어) 판정 결과
  flowLabel: string; // 화면 표시용(한글)
  settlementAnchor: SettlementAnchor; // 정산 기준(앵커)
  settlementLabel: string; // 화면 표시용(짧은 라벨)
  href: string; // 상세 이동
  // 연결(통합) 판정용
  related?: { kind: Kind; id: string; href: string } | null;
  isIntegrated: boolean; // 통합(연결) 여부
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const MAX_FETCH_EACH = 300; // 각 컬렉션에서 상위 N개만 가져온 뒤 merge/sort

// warn=1 (경고만 보기) 서버 필터
type OpGroup = {
  key: string;
  anchor: OpItem;
  createdAt: string | null;
  items: OpItem[]; // anchor 포함
};

const KIND_PRIORITY: Record<Kind, number> = {
  order: 0,
  rental: 1,
  stringing_application: 2,
};

function hasRacketItems(items: any[] | undefined) {
  return Array.isArray(items) && items.some((it) => it?.kind === 'racket' || it?.kind === 'used_racket');
}

function flowLabelOf(flow: Flow) {
  switch (flow) {
    case 1:
      return '스트링 단품 구매';
    case 2:
      return '스트링 구매 + 교체서비스 신청(통합)';
    case 3:
      return '교체서비스 단일 신청';
    case 4:
      return '라켓 단품 구매';
    case 5:
      return '라켓 구매 + 스트링 선택 + 교체서비스 신청(통합)';
    case 6:
      return '라켓 단품 대여';
    case 7:
      return '라켓 대여 + 스트링 선택 + 교체서비스 신청(통합)';
    default:
      return '미분류';
  }
}

function settlementLabelOf(anchor: SettlementAnchor) {
  // 화면에서 “금액=정산금액?” 혼동을 막기 위한 최소 라벨
  switch (anchor) {
    case 'order':
      return '정산: 주문';
    case 'rental':
      return '정산: 대여';
    case 'application':
      return '정산: 신청(단독)';
    default:
      return '정산: -';
  }
}

function orderFlowByHasRacket(hasRacket: boolean, integrated: boolean): Flow {
  if (integrated) return (hasRacket ? 5 : 2) as Flow;
  return (hasRacket ? 4 : 1) as Flow;
}

function rentalFlowByWithService(withService: boolean): Flow {
  return (withService ? 7 : 6) as Flow;
}

function groupKeyOf(it: OpItem): string {
  // 주문/대여는 자기 자신이 앵커
  if (it.kind === 'order') return `order:${it.id}`;
  if (it.kind === 'rental') return `rental:${it.id}`;

  // 신청서는 연결된 "주문/대여"를 앵커로
  const rel = it.related;
  if (rel?.kind === 'order') return `order:${rel.id}`;
  if (rel?.kind === 'rental') return `rental:${rel.id}`;
  // 단독 신청서
  return `app:${it.id}`;
}

function pickAnchor(groupItems: OpItem[]): OpItem {
  return groupItems.find((x) => x.kind === 'order') ?? groupItems.find((x) => x.kind === 'rental') ?? groupItems[0]!;
}

function summarizeByKind(items: OpItem[], getLabel: (it: OpItem) => string | undefined | null) {
  const map = new Map<Kind, Set<string>>();
  for (const it of items) {
    const v = getLabel(it);
    if (!v) continue;
    if (!map.has(it.kind)) map.set(it.kind, new Set());
    map.get(it.kind)!.add(String(v));
  }

  return (['order', 'rental', 'stringing_application'] as Kind[])
    .map((k) => {
      const labels = Array.from(map.get(k) ?? []);
      if (labels.length === 0) return null;
      return { kind: k, mixed: labels.length > 1, text: labels.length === 1 ? labels[0] : `${labels[0]} 외 ${labels.length - 1}` };
    })
    .filter(Boolean) as Array<{ kind: Kind; mixed: boolean; text: string }>;
}

function isWarnGroup(g: OpGroup) {
  if (!g.items || g.items.length <= 1) return false;
  const anchorKey = `${g.anchor.kind}:${g.anchor.id}`;
  const children = g.items.filter((x) => `${x.kind}:${x.id}` !== anchorKey);
  if (children.length === 0) return false;

  const childStatusSummary = summarizeByKind(children, (it) => it.statusLabel);
  const childPaymentSummary = summarizeByKind(children, (it) => it.paymentLabel);
  const hasMixed = childStatusSummary.some((s) => s.mixed) || childPaymentSummary.some((p) => p.mixed);

  const anchorPay = g.anchor.paymentLabel ?? '-';
  const childPays = children.map((x) => x.paymentLabel).filter(Boolean) as string[];
  const payMismatch = anchorPay !== '-' && childPays.some((p) => p && p !== '-' && p !== anchorPay);

  return payMismatch || hasMixed;
}

function filterWarnGroups(list: OpItem[]): OpItem[] {
  const map = new Map<string, OpItem[]>();
  for (const it of list) {
    const key = groupKeyOf(it);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }

  const groups: OpGroup[] = Array.from(map.entries()).map(([key, items]) => {
    items.sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]);
    const anchor = pickAnchor(items);
    const ts = Math.max(...items.map((x) => (x.createdAt ? new Date(x.createdAt).getTime() : 0)));
    const createdAt = ts ? new Date(ts).toISOString() : null;
    return { key, anchor, createdAt, items };
  });

  const warnGroups = groups.filter((g) => isWarnGroup(g));

  // 그룹 최신순(운영자가 "최근 경고"부터 본다)
  warnGroups.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  // 그룹 내부는 kind 우선순위(주문 → 대여 → 신청서)
  return warnGroups.flatMap((g) => g.items);
}

function parseIntegrated(v: string | null): boolean | null {
  // integrated=1 (통합만) / integrated=0 (단독만)
  if (v === '1') return true;
  if (v === '0') return false;
  return null;
}

function parseFlow(v: string | null): Flow | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isInteger(n)) return null;
  if (n < 1 || n > 7) return null;
  return n as Flow;
}

function parseIntParam(v: string | null, opts: { defaultValue: number; min: number; max: number }) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;

  const url = new URL(req.url);
  const page = parseIntParam(url.searchParams.get('page'), { defaultValue: 1, min: 1, max: 10_000 });
  const pageSize = parseIntParam(url.searchParams.get('pageSize'), { defaultValue: DEFAULT_PAGE_SIZE, min: 1, max: MAX_PAGE_SIZE });
  const kind = (url.searchParams.get('kind') as Kind | 'all' | null) ?? 'all';
  const q = String(url.searchParams.get('q') ?? '')
    .trim()
    .toLowerCase();
  const warn = url.searchParams.get('warn') === '1';
  const flow = parseFlow(url.searchParams.get('flow'));
  const integrated = parseIntegrated(url.searchParams.get('integrated'));

  // 1) 신청서 먼저 조회해서 “연결 매핑(orderId/rentalId)”을 만든다.
  const rawApps = await db
    .collection('stringing_applications')
    .find({ status: { $ne: 'draft' } })
    .project({
      _id: 1,
      createdAt: 1,
      status: 1,
      paymentStatus: 1,
      totalPrice: 1,
      serviceAmount: 1,
      orderId: 1,
      rentalId: 1,
      customer: 1,
      userSnapshot: 1,
      guestName: 1,
      guestEmail: 1,
    })
    .sort({ createdAt: -1 })
    .limit(MAX_FETCH_EACH)
    .toArray();

  const orderToApp = new Map<string, string>();
  const rentalToApp = new Map<string, string>();
  for (const a of rawApps) {
    if (a?.orderId) orderToApp.set(String(a.orderId), String(a._id));
    if (a?.rentalId) rentalToApp.set(String(a.rentalId), String(a._id));
  }

  // 2) 주문 조회
  const rawOrders = await db
    .collection('orders')
    .find({})
    .project({
      _id: 1,
      createdAt: 1,
      status: 1,
      paymentStatus: 1,
      totalPrice: 1,
      customer: 1,
      userSnapshot: 1,
      guestInfo: 1,
      items: 1,
    })
    .sort({ createdAt: -1 })
    .limit(MAX_FETCH_EACH)
    .toArray();

  // 3) 대여 조회(+ userId 배치 매핑: 고객명/이메일 정확도 향상)
  const rawRentals = await db
    .collection('rental_orders')
    .find({})
    .project({
      _id: 1,
      createdAt: 1,
      status: 1,
      userId: 1,
      guest: 1,
      brand: 1,
      model: 1,
      days: 1,
      period: 1,
      amount: 1,
      fee: 1,
      deposit: 1,
      stringing: 1,
      stringingApplicationId: 1,
      isStringServiceApplied: 1,
    })
    .sort({ createdAt: -1 })
    .limit(MAX_FETCH_EACH)
    .toArray();

  const userIds = Array.from(new Set(rawRentals.map((r: any) => r?.userId).filter(Boolean)));
  const userMap = new Map<string, { name?: string; email?: string }>();
  if (userIds.length > 0) {
    const users = await db
      .collection('users')
      .find({ _id: { $in: userIds.map((id: any) => (ObjectId.isValid(String(id)) ? new ObjectId(String(id)) : id)) } })
      .project({ name: 1, email: 1 })
      .toArray();
    users.forEach((u: any) => userMap.set(String(u._id), { name: u.name, email: u.email }));
  }

  // 주문 아이템에서 '라켓 포함 여부'를 미리 계산해두면,
  // 신청서가 주문에 연결된 경우에도(Flow 2 vs 5) 정확히 판정가능
  const orderHasRacket = new Map<string, boolean>();
  for (const o of rawOrders as any[]) {
    orderHasRacket.set(String(o?._id), hasRacketItems(o?.items));
  }

  // 4) 공통 포맷으로 매핑
  const orderItems: OpItem[] = rawOrders.map((o: any) => {
    const id = String(o._id);
    const cust = pickCustomerFromDoc(o);
    const appId = orderToApp.get(id) ?? null;
    const isIntegrated = !!appId;
    return {
      id,
      kind: 'order',
      createdAt: toISO(o.createdAt),
      customer: cust,
      title: summarizeOrderItems(o.items),
      statusLabel: normalizeOrderStatus(o.status),
      paymentLabel: normalizePaymentStatus(o.paymentStatus),
      amount: Number(o.totalPrice ?? 0),
      flow: orderFlowByHasRacket(orderHasRacket.get(id) ?? false, isIntegrated),
      flowLabel: flowLabelOf(orderFlowByHasRacket(orderHasRacket.get(id) ?? false, isIntegrated)),
      settlementAnchor: 'order',
      settlementLabel: settlementLabelOf('order'),
      href: `/admin/orders/${id}`,
      related: appId ? { kind: 'stringing_application', id: appId, href: `/admin/applications/stringing/${appId}` } : null,
      isIntegrated,
    };
  });

  const appItems: OpItem[] = rawApps.map((a: any) => {
    const id = String(a._id);
    const cust = pickCustomerFromDoc(a);
    const linkedOrderId = a?.orderId ? String(a.orderId) : null;
    const linkedRentalId = a?.rentalId ? String(a.rentalId) : null;
    const isIntegrated = !!(linkedOrderId || linkedRentalId);

    // 신청서는 상세/정산에서 “가격 누락”이 치명적이므로,
    // totalPrice 우선, 없으면 serviceAmount로 보완.
    const amount = Number(a?.totalPrice ?? a?.serviceAmount ?? 0);

    // 연결 우선순위: 주문 연결 > 대여 연결 (필요 시 UX 기준으로 바꿔도 됨)
    const related = linkedOrderId ? { kind: 'order' as const, id: linkedOrderId, href: `/admin/orders/${linkedOrderId}` } : linkedRentalId ? { kind: 'rental' as const, id: linkedRentalId, href: `/admin/rentals/${linkedRentalId}` } : null;

    return {
      id,
      kind: 'stringing_application',
      createdAt: toISO(a.createdAt),
      customer: cust,
      title: '교체 서비스 신청',
      statusLabel: String(a?.status ?? '접수완료'),
      paymentLabel: normalizePaymentStatus(a?.paymentStatus),
      amount,
      flow: (() => {
        if (!isIntegrated) return 3 as Flow;
        if (related?.kind === 'order') return orderFlowByHasRacket(orderHasRacket.get(String(related.id)) ?? false, true);
        if (related?.kind === 'rental') return 7 as Flow;
        return 3 as Flow;
      })(),
      flowLabel: (() => {
        const f = (() => {
          if (!isIntegrated) return 3 as Flow;
          if (related?.kind === 'order') return orderFlowByHasRacket(orderHasRacket.get(String(related.id)) ?? false, true);
          if (related?.kind === 'rental') return 7 as Flow;
          return 3 as Flow;
        })();
        return flowLabelOf(f);
      })(),
      settlementAnchor: (() => {
        // 통합 신청서는 정산이 “앵커(주문/대여)”로 잡히는 것이 원칙
        if (!isIntegrated) return 'application' as SettlementAnchor;
        if (related?.kind === 'order') return 'order' as SettlementAnchor;
        if (related?.kind === 'rental') return 'rental' as SettlementAnchor;
        return 'application' as SettlementAnchor;
      })(),
      settlementLabel: (() => {
        const anchor = (() => {
          if (!isIntegrated) return 'application' as SettlementAnchor;
          if (related?.kind === 'order') return 'order' as SettlementAnchor;
          if (related?.kind === 'rental') return 'rental' as SettlementAnchor;
          return 'application' as SettlementAnchor;
        })();
        return settlementLabelOf(anchor);
      })(),
      href: `/admin/applications/stringing/${id}`,
      related,
      isIntegrated,
    };
  });

  const rentalItems: OpItem[] = rawRentals.map((r: any) => {
    const id = String(r._id);
    const u = r?.userId ? userMap.get(String(r.userId)) : null;
    const cust = u?.name || u?.email ? { name: String(u?.name ?? ''), email: String(u?.email ?? '') } : pickCustomerFromDoc(r);
    const rawAppId = (r as any)?.stringingApplicationId ?? null;
    const stringingApplicationId = rawAppId ? (typeof rawAppId === 'string' ? rawAppId : (rawAppId?.toString?.() ?? String(rawAppId))) : null;
    const appId = stringingApplicationId || (rentalToApp.get(id) ?? null);
    const withStringService = Boolean(r?.stringing?.requested) || Boolean((r as any)?.isStringServiceApplied) || Boolean(appId);
    const isIntegrated = Boolean(appId);
    const days = Number(r?.days ?? r?.period ?? 0);
    const amount = normalizeRentalAmountTotal(r);

    return {
      id,
      kind: 'rental',
      createdAt: toISO(r.createdAt),
      customer: cust,
      title: `${String(r?.brand ?? '')} ${String(r?.model ?? '')}`.trim() + (days ? ` (${days}일)` : ''),
      statusLabel: normalizeRentalStatus(r?.status),
      amount,
      flow: rentalFlowByWithService(withStringService),
      flowLabel: flowLabelOf(rentalFlowByWithService(withStringService)),
      settlementAnchor: 'rental',
      settlementLabel: settlementLabelOf('rental'),
      href: `/admin/rentals/${id}`,
      related: appId ? { kind: 'stringing_application', id: appId, href: `/admin/applications/stringing/${appId}` } : null,
      isIntegrated,
    };
  });

  // 5) 병합 → 최신순 정렬 → kind/q 필터 → 페이지 슬라이스
  let merged: OpItem[] = [...orderItems, ...appItems, ...rentalItems].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  if (kind !== 'all') merged = merged.filter((x) => x.kind === kind);

  if (q) {
    merged = merged.filter((x) => {
      const idMatch = x.id.toLowerCase().includes(q);
      const nameMatch = (x.customer?.name ?? '').toLowerCase().includes(q);
      const emailMatch = (x.customer?.email ?? '').toLowerCase().includes(q);
      const titleMatch = (x.title ?? '').toLowerCase().includes(q);
      return idMatch || nameMatch || emailMatch || titleMatch;
    });
  }

  // flow=1..7 (시나리오) 필터
  // - "그룹(통합)"의 구성(앵커/하위)을 깨지 않기 위해, '그룹 키' 기준으로 통째로 남긴다.
  // - 즉, 해당 그룹의 어떤 문서든 flow가 매칭되면 같은 그룹 키의 문서를 같이 남긴다.
  if (flow) {
    const allowedKeys = new Set<string>();
    for (const it of merged) {
      if (it.flow === flow) allowedKeys.add(groupKeyOf(it));
    }
    merged = merged.filter((it) => allowedKeys.has(groupKeyOf(it)));
  }

  // integrated=1/0 (통합/단독) 필터
  // - 그룹 키 기준으로 통째로 남김(앵커/하위 깨짐 방지)
  if (integrated !== null) {
    const groupIntegrated = new Map<string, boolean>();
    // 기본값 false로 두고, 그룹 내에 isIntegrated=true가 하나라도 있으면 true
    for (const it of merged) {
      const key = groupKeyOf(it);
      const prev = groupIntegrated.get(key) ?? false;
      if (prev) continue;
      if (it.isIntegrated) groupIntegrated.set(key, true);
      else groupIntegrated.set(key, prev);
    }
    const allowedKeys = new Set<string>();
    for (const [key, isInt] of groupIntegrated.entries()) {
      if (isInt === integrated) allowedKeys.add(key);
    }
    merged = merged.filter((it) => allowedKeys.has(groupKeyOf(it)));
  }

  // warn=1이면 서버에서 "경고 그룹"만 남긴 뒤 페이지네이션
  if (warn) merged = filterWarnGroups(merged);

  const total = merged.length;
  const start = (page - 1) * pageSize;
  const items = merged.slice(start, start + pageSize);

  return NextResponse.json({ items, total });
}
