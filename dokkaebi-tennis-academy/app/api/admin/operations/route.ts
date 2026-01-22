import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { toISO, normalizeOrderStatus, normalizePaymentStatus, normalizeRentalStatus, summarizeOrderItems, pickCustomerFromDoc, normalizeRentalAmountTotal } from '@/lib/admin-ops-normalize';
export const dynamic = 'force-dynamic';

type Kind = 'order' | 'stringing_application' | 'rental';

type OpItem = {
  id: string;
  kind: Kind;
  createdAt: string | null;
  customer: { name: string; email: string };
  title: string; // 목록에서 한 줄로 보일 “요약”
  statusLabel: string; // 화면 표시용(한글)
  paymentLabel?: string; // 주문/신청서에서만 사용
  amount: number; // 화면 표시용 “총액”
  href: string; // 상세 이동
  // 연결(통합) 판정용
  related?: { kind: Kind; id: string; href: string } | null;
  isIntegrated: boolean; // 통합(연결) 여부
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const MAX_FETCH_EACH = 300; // 각 컬렉션에서 상위 N개만 가져온 뒤 merge/sort

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const pageSize = Math.max(1, Math.min(MAX_PAGE_SIZE, Number(url.searchParams.get('pageSize') ?? DEFAULT_PAGE_SIZE)));
  const kind = (url.searchParams.get('kind') as Kind | 'all' | null) ?? 'all';
  const q = String(url.searchParams.get('q') ?? '')
    .trim()
    .toLowerCase();

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
      href: `/admin/applications/stringing/${id}`,
      related,
      isIntegrated,
    };
  });

  const rentalItems: OpItem[] = rawRentals.map((r: any) => {
    const id = String(r._id);
    const u = r?.userId ? userMap.get(String(r.userId)) : null;
    const cust = u?.name || u?.email ? { name: String(u?.name ?? ''), email: String(u?.email ?? '') } : pickCustomerFromDoc(r);
    const appId = rentalToApp.get(id) ?? null;
    const isIntegrated = !!appId;
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

  const total = merged.length;
  const start = (page - 1) * pageSize;
  const items = merged.slice(start, start + pageSize);

  return NextResponse.json({ items, total });
}
