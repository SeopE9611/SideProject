import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { canTransitIdempotent, RentalStatus } from '@/app/features/rentals/utils/status';
import { writeRentalHistory } from '@/app/features/rentals/utils/history';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

export const dynamic = 'force-dynamic';

/**
 * pay 라우터 입력 방어
 * - 목적: 잘못된 id/JSON/body로 500 터지는 걸 400/403으로 정리
 * - 주의: 기존 비즈니스 로직(0원 차단, pending→paid 전이)은 그대로 유지
 */
const POSTAL_RE = /^\d{5}$/;
const ALLOWED_BANKS = new Set(['shinhan', 'kookmin', 'woori'] as const);

const toTrimmedString = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const toDigits = (v: unknown) => toTrimmedString(v).replace(/\D/g, '');

// pay에서는 payment/shipping "선택" (안 보내면 기존 값 유지)
const PayBodySchema = z
  .object({
    payment: z
      .object({
        method: z.literal('bank_transfer'),
        bank: z.string().trim().min(1),
        depositor: z.string().trim().min(2),
      })
      .passthrough()
      .optional(),
    shipping: z
      .object({
        name: z.string().trim().min(2),
        phone: z.preprocess(toDigits, z.string().min(10).max(11)),
        postalCode: z.preprocess(toDigits, z.string().regex(POSTAL_RE)),
        address: z.string().trim().min(1),
        addressDetail: z.string().trim().optional(),
        deliveryRequest: z.string().trim().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rentalId } = await params;
    const db = (await clientPromise).db();
    // 1) params 유효성: ObjectId 방어 (500 방지)
    if (!ObjectId.isValid(rentalId)) {
      return NextResponse.json({ ok: false, message: 'BAD_ID' }, { status: 400 });
    }

    // 2) body 파싱/검증: 깨진 JSON은 400으로 정리
    const raw = await req.text();
    let body: any = {};
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        return NextResponse.json({ ok: false, message: 'INVALID_JSON' }, { status: 400 });
      }
    }
    const parsed = PayBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'INVALID_BODY' }, { status: 400 });
    }
    body = parsed.data;

    // 주문 조회
    const _id = new ObjectId(rentalId);
    const order = await db.collection('rental_orders').findOne({ _id });
    if (!order) {
      return NextResponse.json({ ok: false, message: 'NOT_FOUND' }, { status: 404 });
    }

    // 3) 인증/인가: 회원 대여건이면 소유자만 결제 확정 가능 (prepare/cancel-request와 동일 패턴)
    if ((order as any).userId) {
      const jar = await cookies();
      const at = jar.get('accessToken')?.value;
      let payload: any = null;
      try {
        payload = at ? verifyAccessToken(at) : null;
      } catch {
        payload = null;
      }
      if (!payload || payload.sub !== String((order as any).userId)) {
        return NextResponse.json({ ok: false, message: 'FORBIDDEN' }, { status: 403 });
      }
    }

    // 멱등 처리: 이미 paid면 OK
    if ((order.status ?? 'pending') === 'paid') {
      return NextResponse.json({ ok: true, id: rentalId });
    }

    // 4) bank allowlist 최종 방어
    if (body?.payment?.bank && !ALLOWED_BANKS.has(body.payment.bank as any)) {
      return NextResponse.json({ ok: false, message: 'INVALID_BANK' }, { status: 400 });
    }

    // 금액 무결성 가드: total이 0원이면 결제 차단
    const amt = order.amount ?? { fee: 0, deposit: 0, total: 0 };
    const total = Number(amt.total ?? 0);
    if (!total || total <= 0) {
      return NextResponse.json({ ok: false, code: 'INVALID_AMOUNT', message: '0원 결제는 허용되지 않습니다.' }, { status: 409 });
    }

    // 금액 가드 아래쪽에, 상태 전이 가드 정리
    const currentStatus = (order.status ?? 'pending') as RentalStatus;

    // 상태 전이 가능성 선검사(가독용) - 진짜 보호는 조건부 updateOne
    if (!canTransitIdempotent(currentStatus, 'paid') || currentStatus !== 'pending') {
      return NextResponse.json({ ok: false, code: 'INVALID_STATE', message: '결제 불가 상태', status: order.status }, { status: 409 });
    }

    // pay에서 body를 비워서 보내는 케이스가 많아 "없으면 기존 값 유지"로 스냅샷/저장을 맞춘다.
    const nextPayment = typeof body.payment !== 'undefined' ? body.payment : ((order as any).payment ?? null);
    const nextShipping = typeof body.shipping !== 'undefined' ? body.shipping : ((order as any).shipping ?? null);

    // 원자 전이: pending → paid (경합 시 1건만 성공)
    const setDoc: any = {
      status: 'paid',
      paidAt: new Date(),
      updatedAt: new Date(),
    };
    // body에 포함된 경우에만 갱신(없으면 기존 값 유지)
    if (typeof body.payment !== 'undefined') setDoc.payment = body.payment;
    if (typeof body.shipping !== 'undefined') setDoc.shipping = body.shipping;

    const u = await db.collection('rental_orders').updateOne(
      { _id, status: 'pending' },
      {
        $set: {
          ...setDoc,
        },
      },
    );

    if (u.matchedCount === 0) {
      return NextResponse.json({ ok: false, code: 'INVALID_STATE' }, { status: 409 });
    }

    // 처리 이력 기록
    await writeRentalHistory(db, _id, {
      action: 'paid',
      from: 'pending',
      to: 'paid',
      actor: { role: 'user' },
      snapshot: { payment: nextPayment, shipping: nextShipping },
    });

    // 라켓 상태 동기화: 단일 수량일 때만 status 보정(복수 수량이면 status 미변경)
    const updated = await db.collection('rental_orders').findOne({ _id });
    if (updated?.racketId) {
      const racketIdStr = String(updated.racketId);
      if (!ObjectId.isValid(racketIdStr)) {
        return NextResponse.json({ ok: true, id: rentalId }); // 라켓 동기화는 부가 처리라서 결제 성공은 유지
      }
      const rack = await db.collection('used_rackets').findOne({ _id: new ObjectId(racketIdStr) }, { projection: { quantity: 1 } });
      const qty = Number(rack?.quantity ?? 1);
      if (qty <= 1) {
        await db.collection('used_rackets').updateOne({ _id: new ObjectId(racketIdStr) }, { $set: { status: 'rented', updatedAt: new Date() } });
      }
    }

    return NextResponse.json({ ok: true, id: rentalId });
  } catch (err) {
    console.error('POST /api/rentals/[id]/pay error:', err);
    return NextResponse.json({ ok: false, message: 'SERVER_ERROR' }, { status: 500 });
  }
}
