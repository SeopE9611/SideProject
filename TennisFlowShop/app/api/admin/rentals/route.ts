import { NextResponse } from 'next/server';
import { ObjectId, type Document, type Filter } from 'mongodb';
import { z } from 'zod';

import { requireAdmin } from '@/lib/admin.guard';
import type { AdminRentalListItemDto, AdminRentalsListResponseDto } from '@/types/admin/rentals';
import { normalizeRentalPaymentMeta } from '@/lib/admin-ops-normalize';

export const dynamic = 'force-dynamic';

function getApplicationLines(stringDetails: any): any[] {
  if (Array.isArray(stringDetails?.lines)) return stringDetails.lines;
  if (Array.isArray(stringDetails?.racketLines)) return stringDetails.racketLines;
  return [];
}

function getReceptionLabel(collectionMethod?: string | null): string {
  if (collectionMethod === 'visit') return '방문 접수';
  if (collectionMethod === 'courier_pickup') return '기사 방문 수거';
  return '발송 접수';
}


function normalizeServicePickupMethod(v: any): 'SELF_SEND' | 'COURIER_VISIT' | 'SHOP_VISIT' | null {
  const raw = String(v ?? '').trim().toUpperCase();
  if (raw === 'SELF_SEND' || raw === 'COURIER_VISIT' || raw === 'SHOP_VISIT') return raw;
  if (raw === 'DELIVERY') return 'SELF_SEND';
  if (raw === 'PICKUP') return 'SHOP_VISIT';
  return null;
}

function getPickupMethodLabel(method: 'SELF_SEND' | 'COURIER_VISIT' | 'SHOP_VISIT' | null): string {
  if (method === 'SHOP_VISIT') return '방문 수령';
  if (method === 'COURIER_VISIT') return '기사 방문 수거';
  return '택배 발송';
}

function getTensionSummary(lines: any[]): string | null {
  const set = Array.from(
    new Set(
      lines
        .map((line: any) => {
          const main = String(line?.tensionMain ?? '').trim();
          const cross = String(line?.tensionCross ?? '').trim();
          if (!main && !cross) return '';
          return cross && cross !== main ? `${main}/${cross}` : main || cross;
        })
        .filter(Boolean),
    ),
  );
  return set.length ? set.join(', ') : null;
}


function parseIntParam(v: string | null, opts: { defaultValue: number; min: number; max: number }) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

const querySchema = z.object({
  pay: z.enum(['all', 'paid', 'unpaid']).default('all'),
  ship: z.enum(['all', 'outbound-set', 'return-set', 'both-set', 'none']).default('all'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().default(''),
  brand: z.string().default(''),
  from: z.string().default(''),
  to: z.string().default(''),
  sort: z.string().default('-createdAt'),
});

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!('ok' in guard) || !guard.ok) return guard.res;
  const db = guard.db;

  const sp = new URL(req.url).searchParams;
  const parsed = querySchema.parse({
    pay: sp.get('pay') ?? 'all',
    ship: sp.get('ship') ?? 'all',
    page: parseIntParam(sp.get('page'), { defaultValue: 1, min: 1, max: 10_000 }),
    pageSize: parseIntParam(sp.get('pageSize'), { defaultValue: 20, min: 1, max: 100 }),
    status: sp.get('status') ?? '',
    brand: sp.get('brand') ?? '',
    from: sp.get('from') ?? '',
    to: sp.get('to') ?? '',
    sort: sp.get('sort') ?? '-createdAt',
  });

  const q: Filter<Document> = {};
  if (parsed.pay === 'paid') {
    q.$or = [{ status: { $in: ['paid', 'out', 'returned'] } }, { 'payment.paidAt': { $exists: true } }, { paidAt: { $exists: true } }];
  } else if (parsed.pay === 'unpaid') {
    q.$and = [{ status: { $nin: ['paid', 'out', 'returned'] } }, { 'payment.paidAt': { $exists: false } }, { paidAt: { $exists: false } }];
  }

  if (parsed.ship === 'outbound-set') {
    q['shipping.outbound.trackingNumber'] = { $exists: true, $ne: '' };
  } else if (parsed.ship === 'return-set') {
    q['shipping.return.trackingNumber'] = { $exists: true, $ne: '' };
  } else if (parsed.ship === 'both-set') {
    q['shipping.outbound.trackingNumber'] = { $exists: true, $ne: '' };
    q['shipping.return.trackingNumber'] = { $exists: true, $ne: '' };
  } else if (parsed.ship === 'none') {
    q.$and = (q.$and ?? []).concat([
      { $or: [{ 'shipping.outbound.trackingNumber': { $in: [null, '', undefined] } }, { 'shipping.outbound': { $exists: false } }] },
      { $or: [{ 'shipping.return.trackingNumber': { $in: [null, '', undefined] } }, { 'shipping.return': { $exists: false } }] },
    ]);
  }

  if (parsed.status) q.status = parsed.status;
  if (parsed.brand) q.brand = { $regex: parsed.brand, $options: 'i' };
  if (parsed.from || parsed.to) {
    const createdAtCond: Record<string, Date> = {};
    if (parsed.from) createdAtCond.$gte = new Date(`${parsed.from}T00:00:00+09:00`);
    if (parsed.to) createdAtCond.$lte = new Date(`${parsed.to}T23:59:59.999+09:00`);
    q.createdAt = createdAtCond;
  }

  const sortKey = parsed.sort.startsWith('-') || parsed.sort.startsWith('+') ? parsed.sort.slice(1) : parsed.sort;
  const sortDir: 1 | -1 = parsed.sort.startsWith('-') ? -1 : 1;
  const sort = { [sortKey]: sortDir } as Record<string, 1 | -1>;

  const docs = await db.collection('rental_orders').find(q).sort(sort).skip((parsed.page - 1) * parsed.pageSize).limit(parsed.pageSize).toArray();
  const total = await db.collection('rental_orders').countDocuments(q);

  const userIds = Array.from(new Set(docs.map((d) => d.userId).filter(Boolean)));
  const userMap = new Map<string, { name?: string; email?: string }>();

  if (userIds.length > 0) {
    const users = await db.collection('users').find({ _id: { $in: userIds } }).project({ name: 1, email: 1 }).toArray();
    users.forEach((u) => userMap.set(String(u._id), { name: u.name, email: u.email }));
  }

  // 대여 목록에서 통합 플로우 핵심 요약을 즉시 보여주기 위해 신청서 읽기용 필드를 병합
  const appIds = Array.from(
    new Set(
      docs
        .map((doc) => {
          const raw = (doc as Record<string, unknown>).stringingApplicationId;
          const id = raw ? String(raw) : '';
          return ObjectId.isValid(id) ? id : '';
        })
        .filter(Boolean),
    ),
  );

  const appSummaryMap = new Map<string, { status: string; receptionLabel: string; racketCount: number; tensionSummary: string | null; stringNames: string[]; reservationLabel: string | null }>();

  if (appIds.length > 0) {
    const apps = await db
      .collection('stringing_applications')
      .find({ _id: { $in: appIds.map((id) => new ObjectId(id)) } }, { projection: { status: 1, collectionMethod: 1, stringDetails: 1 } })
      .toArray();

    apps.forEach((app: any) => {
      const lines = getApplicationLines(app?.stringDetails);
      const preferredDate = String(app?.stringDetails?.preferredDate ?? '').trim();
      const preferredTime = String(app?.stringDetails?.preferredTime ?? '').trim();
      appSummaryMap.set(String(app._id), {
        status: String(app?.status ?? 'draft'),
        receptionLabel: getReceptionLabel(app?.collectionMethod),
        racketCount: lines.length,
        tensionSummary: getTensionSummary(lines),
        stringNames: Array.from(new Set(lines.map((line: any) => String(line?.stringName ?? '').trim()).filter(Boolean))),
        reservationLabel: preferredDate && preferredTime ? `${preferredDate} ${preferredTime}` : null,
      });
    });
  }

  const items: AdminRentalListItemDto[] = docs.map((rentalDoc) => {
    const out = rentalDoc?.shipping?.outbound ?? null;
    const ret = rentalDoc?.shipping?.return ?? null;
    const cust = (rentalDoc.userId && userMap.get(String(rentalDoc.userId))) || (rentalDoc.guest ? { name: rentalDoc.guest.name, email: rentalDoc.guest.email } : { name: '', email: '' });

    const fee = Number(rentalDoc?.amount?.fee ?? rentalDoc?.fee ?? 0);
    const deposit = Number(rentalDoc?.amount?.deposit ?? rentalDoc?.deposit ?? 0);
    const requested = !!rentalDoc?.stringing?.requested;
    const stringPrice = Number(rentalDoc?.amount?.stringPrice ?? (requested ? (rentalDoc?.stringing?.price ?? 0) : 0));
    const stringingFee = Number(rentalDoc?.amount?.stringingFee ?? (requested ? (rentalDoc?.stringing?.mountingFee ?? 0) : 0));
    const totalAmount = Number(rentalDoc?.amount?.total ?? fee + deposit + stringPrice + stringingFee);

    const record = rentalDoc as Record<string, unknown>;
    const rawAppId = record.stringingApplicationId ?? null;
    const withStringService = Boolean(rentalDoc?.stringing?.requested) || Boolean(record.isStringServiceApplied) || Boolean(rawAppId);
    const stringingApplicationId = rawAppId ? (typeof rawAppId === 'string' ? rawAppId : String(rawAppId)) : null;

    const paymentMeta = normalizeRentalPaymentMeta(rentalDoc);
    const appSummary = stringingApplicationId ? appSummaryMap.get(stringingApplicationId) : null;
    const servicePickupMethod = normalizeServicePickupMethod((rentalDoc as any)?.servicePickupMethod);

    return {
      id: rentalDoc._id?.toString(),
      racketId: rentalDoc.racketId?.toString(),
      brand: rentalDoc.brand || '',
      model: rentalDoc.model || '',
      status: rentalDoc.status,
      days: rentalDoc.days ?? rentalDoc.period ?? 0,
      amount: { fee, deposit, stringPrice, stringingFee, total: totalAmount },
      createdAt: rentalDoc.createdAt ?? null,
      outAt: rentalDoc.outAt ?? null,
      dueAt: rentalDoc.dueAt ?? null,
      returnedAt: rentalDoc.returnedAt ?? null,
      depositRefundedAt: rentalDoc.depositRefundedAt ?? null,
      stringingApplicationId,
      withStringService,
      stringingApplicationStatus: appSummary?.status ?? null,
      stringingReceptionLabel: appSummary?.receptionLabel ?? null,
      stringingRacketCount: appSummary?.racketCount ?? null,
      stringingTensionSummary: appSummary?.tensionSummary ?? null,
      stringingNames: appSummary?.stringNames ?? [],
      stringingReservationLabel: appSummary?.reservationLabel ?? null,
      paymentStatusLabel: paymentMeta.label as '결제완료' | '결제대기',
      paymentStatusSource: paymentMeta.source,
      servicePickupMethod,
      pickupMethodLabel: getPickupMethodLabel(servicePickupMethod),
      shipping: {
        outbound: out ? { courier: out.courier ?? '', trackingNumber: out.trackingNumber ?? '', shippedAt: out.shippedAt ?? null } : null,
        return: ret ? { courier: ret.courier ?? '', trackingNumber: ret.trackingNumber ?? '', shippedAt: ret.shippedAt ?? null } : null,
      },
      cancelRequest: rentalDoc.cancelRequest
        ? {
            status:
              rentalDoc.cancelRequest.status === '요청' || rentalDoc.cancelRequest.status === 'requested'
                ? 'requested'
                : rentalDoc.cancelRequest.status === '승인' || rentalDoc.cancelRequest.status === 'approved'
                  ? 'approved'
                  : 'rejected',
          }
        : null,
      customer: { name: cust?.name || '', email: cust?.email || '' },
    };
  });

  const response: AdminRentalsListResponseDto = { page: parsed.page, pageSize: parsed.pageSize, total, items };
  return NextResponse.json(response);
}
