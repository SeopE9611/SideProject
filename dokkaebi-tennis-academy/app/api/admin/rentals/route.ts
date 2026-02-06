import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';

export const dynamic = 'force-dynamic';

// 숫자 쿼리 파라미터 안전 파싱 (NaN/Infinity/소수/음수 방지 + 범위 보정)
function parseIntParam(v: string | null, opts: { defaultValue: number; min: number; max: number }) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

export async function GET(req: Request) {
  // 관리자 권한
  const guard = await requireAdmin(req);
  if (!('ok' in guard) || !guard.ok) return guard.res;
  const db = guard.db;

  const { searchParams } = new URL(req.url);
  const pay = searchParams.get('pay'); // 'paid' | 'unpaid' | null
  const ship = searchParams.get('ship'); // 'outbound-set' | 'return-set' | 'none' | null

  const q: any = {};
  // --- 결제 필터 ---
  if (pay === 'paid') {
    q.$or = [{ status: { $in: ['paid', 'out', 'returned'] } }, { 'payment.paidAt': { $exists: true } }, { paidAt: { $exists: true } }];
  } else if (pay === 'unpaid') {
    q.$and = [{ status: { $nin: ['paid', 'out', 'returned'] } }, { 'payment.paidAt': { $exists: false } }, { paidAt: { $exists: false } }];
  }

  // --- 배송(운송장) 필터 ---
  if (ship === 'outbound-set') {
    q['shipping.outbound.trackingNumber'] = { $exists: true, $ne: '' };
  } else if (ship === 'return-set') {
    q['shipping.return.trackingNumber'] = { $exists: true, $ne: '' };
  } else if (ship === 'both-set') {
    q['shipping.outbound.trackingNumber'] = { $exists: true, $ne: '' };
    q['shipping.return.trackingNumber'] = { $exists: true, $ne: '' };
  } else if (ship === 'none') {
    q.$and = (q.$and ?? []).concat([
      { $or: [{ 'shipping.outbound.trackingNumber': { $in: [null, '', undefined] } }, { 'shipping.outbound': { $exists: false } }] },
      { $or: [{ 'shipping.return.trackingNumber': { $in: [null, '', undefined] } }, { 'shipping.return': { $exists: false } }] },
    ]);
  }

  const page = parseIntParam(searchParams.get('page'), { defaultValue: 1, min: 1, max: 10_000 });
  const pageSize = parseIntParam(searchParams.get('pageSize'), { defaultValue: 20, min: 1, max: 100 });
  const status = searchParams.get('status') || ''; // '', created, paid, out, returned, canceled
  const brand = searchParams.get('brand') || '';
  const from = searchParams.get('from') || ''; // 'YYYY-MM-DD'
  const to = searchParams.get('to') || ''; // 'YYYY-MM-DD'
  const sortParam = searchParams.get('sort') || '-createdAt'; // 예: -createdAt / +createdAt

  if (status) q.status = status;
  if (brand) q.brand = { $regex: brand, $options: 'i' };

  // 날짜 필터: 문자열 비교 대신 Date 비교 (KST 기준 포함 범위)
  if (from || to) {
    const createdAtCond: any = {};
    if (from) {
      // from일 00:00:00.000 KST → UTC Date
      createdAtCond.$gte = new Date(`${from}T00:00:00+09:00`);
    }
    if (to) {
      // to일 23:59:59.999 KST → UTC Date
      createdAtCond.$lte = new Date(`${to}T23:59:59.999+09:00`);
    }
    q.createdAt = createdAtCond;
  }

  // 정렬 파싱(-: desc / +: asc)
  const sortKey = sortParam.startsWith('-') || sortParam.startsWith('+') ? sortParam.slice(1) : sortParam;
  const sortDir: 1 | -1 = sortParam.startsWith('-') ? -1 : 1;
  const sort = { [sortKey]: sortDir } as Record<string, 1 | -1>;

  const cursor = db
    .collection('rental_orders')
    .find(q)
    .sort(sort)
    .skip((page - 1) * pageSize)
    .limit(pageSize);

  const items = await cursor.toArray();
  const total = await db.collection('rental_orders').countDocuments(q);

  const docs = await db
    .collection('rental_orders')
    .find(q)
    .sort(sort)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  // 사용자 배치 조회
  const userIds = Array.from(
    new Set(
      docs.map((d) => d.userId).filter(Boolean), // null/undefined 제거
    ),
  );

  const userMap = new Map<string, { name?: string; email?: string }>();
  if (userIds.length > 0) {
    const users = await db
      .collection('users')
      .find({ _id: { $in: userIds } }) // userId가 ObjectId라면 그대로 OK
      .project({ name: 1, email: 1 })
      .toArray();

    users.forEach((u) => userMap.set(String(u._id), { name: u.name, email: u.email }));
  }

  const mapped = docs.map((r: any) => {
    const out = r?.shipping?.outbound ?? null;
    const ret = r?.shipping?.return ?? null;
    const cust = (r.userId && userMap.get(String(r.userId))) || (r.guest ? { name: r.guest.name, email: r.guest.email } : { name: '', email: '' });

    /**
     * amount 정규화 (프론트/AdminRentalsClient 표시 정합성 보장)
     * - 신규 데이터: r.amount에 stringPrice/stringingFee가 이미 포함될 수 있음
     * - 구버전 데이터: amount가 없거나, amount에 fee/deposit/total만 있을 수 있음
     * - 또한 스트링 스냅샷이 r.stringing에 저장되어 있으므로(요청된 경우),
     *   amount에 값이 없으면 stringing 기반으로 보완.
     */
    const fee = Number(r?.amount?.fee ?? r?.fee ?? 0);
    const deposit = Number(r?.amount?.deposit ?? r?.deposit ?? 0);
    const requested = !!r?.stringing?.requested;
    const stringPrice = Number(r?.amount?.stringPrice ?? (requested ? (r?.stringing?.price ?? 0) : 0));
    const stringingFee = Number(r?.amount?.stringingFee ?? (requested ? (r?.stringing?.mountingFee ?? 0) : 0));
    const total = Number(r?.amount?.total ?? fee + deposit + stringPrice + stringingFee);

    /**
     * 대여 기반 교체서비스 신청서 연결 정보
     * - Flow 7(대여 + 스트링 선택 + 교체서비스 신청)에서 rental_orders에 stringingApplicationId가 저장됨
     * - 목록에서 "교체서비스 포함 대여인지"를 즉시 구분하기 위해 내려준다.
     * - 레거시/예외 케이스에서 requested=true인데 ID가 비어 있을 수 있어 withStringService도 함께 제공.
     */
    const rawAppId = (r as any)?.stringingApplicationId ?? null;
    const stringingApplicationId = rawAppId ? (typeof rawAppId === 'string' ? rawAppId : (rawAppId?.toString?.() ?? String(rawAppId))) : null;
    const withStringService = Boolean(r?.stringing?.requested) || Boolean((r as any)?.isStringServiceApplied) || Boolean(stringingApplicationId);

    return {
      id: r._id?.toString(),
      racketId: r.racketId?.toString(),
      brand: r.brand || '',
      model: r.model || '',
      status: r.status,
      days: r.days ?? r.period ?? 0,
      amount: { fee, deposit, stringPrice, stringingFee, total },
      createdAt: r.createdAt,
      outAt: r.outAt ?? null,
      dueAt: r.dueAt ?? null,
      returnedAt: r.returnedAt ?? null,
      depositRefundedAt: r.depositRefundedAt ?? null,

      // 교체서비스 연결(목록용)
      stringingApplicationId,
      withStringService,

      shipping: {
        outbound: out
          ? {
              courier: out.courier ?? '',
              trackingNumber: out.trackingNumber ?? '',
              shippedAt: out.shippedAt ?? null,
            }
          : null,
        return: ret
          ? {
              courier: ret.courier ?? '',
              trackingNumber: ret.trackingNumber ?? '',
              shippedAt: ret.shippedAt ?? null,
            }
          : null,
      },

      // 요약이 필요하면 brief 유지 가능
      // outboundShippingBrief: out?.trackingNumber
      //   ? { courier: out.courier ?? '', trackingLast4: String(out.trackingNumber).slice(-4) }
      //   : null,

      // 취소 요청 정보(한글/영문 상태 모두 정규화)
      cancelRequest: r.cancelRequest
        ? {
            status:
              r.cancelRequest.status === '요청' || r.cancelRequest.status === 'requested'
                ? 'requested'
                : r.cancelRequest.status === '승인' || r.cancelRequest.status === 'approved'
                  ? 'approved'
                  : r.cancelRequest.status === '거절' || r.cancelRequest.status === 'rejected'
                    ? 'rejected'
                    : 'requested',
          }
        : null,

      customer: {
        name: cust?.name || '',
        email: cust?.email || '',
      },
    };
  });

  return NextResponse.json({ page, pageSize, total, items: mapped });
}
