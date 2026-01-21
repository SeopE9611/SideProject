import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import { writeRentalHistory } from '@/app/features/rentals/utils/history';
import type { RentalCancelRequestStatus } from '@/lib/types/rental-order';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// 취소 요청 body 최종 유효성(서버 방어)
const toOptionalTrimmedString = (v: unknown) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') {
    const s = v.trim();
    return s.length ? s : undefined; // 빈 문자열은 "없음"으로 취급
  }
  if (typeof v === 'number') {
    const s = String(v).trim();
    return s.length ? s : undefined;
  }
  return undefined;
};

const toTrimmedString = (v: unknown) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v).trim();
  return undefined;
};

const CancelRequestBodySchema = z
  .object({
    reasonCode: z.preprocess(toOptionalTrimmedString, z.string().max(30)).optional(),
    reasonText: z.preprocess(toTrimmedString, z.string().max(500)).optional(),
  })
  .passthrough();

/**
 * 대여 취소 "요청" API
 * - 실제 status 를 'canceled'로 바꾸지 않고, cancelRequest 필드와 history 만 남긴다.
 * -  출고 전(status = pending/paid 이면서 출고 운송장 미등록)까지만 취소 요청 가능.
 * - 대여 소유자만 호출 가능.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: 'BAD_ID' }, { status: 400 });
    }

    const db = (await clientPromise).db();
    const _id = new ObjectId(id);
    const rental: any = await db.collection('rental_orders').findOne({ _id });

    if (!rental) {
      return NextResponse.json({ ok: false, message: 'NOT_FOUND' }, { status: 404 });
    }

    // 1) 인증/인가: 회원 대여건이면 소유자만 취소 요청 가능
    if (rental.userId) {
      const jar = await cookies();
      const at = jar.get('accessToken')?.value;
      // 토큰이 깨져 verifyAccessToken이 throw 되어도 500이 아니라 "FORBIDDEN"으로 정리
      let payload: any = null;
      try {
        payload = at ? verifyAccessToken(at) : null;
      } catch {
        payload = null;
      }
      if (!payload || payload.sub !== String(rental.userId)) {
        return NextResponse.json({ ok: false, message: 'FORBIDDEN' }, { status: 403 });
      }
    }

    // 2) 비즈니스 룰
    const currentStatus: string = rental.status ?? 'pending';

    // 이미 취소된 건에 대한 추가 요청 차단
    if (currentStatus === 'canceled') {
      return NextResponse.json({ ok: false, message: 'ALREADY_CANCELED' }, { status: 400 });
    }

    // 출고 이후(out/returned)는 취소가 아니라 반납/정산 영역이므로 차단
    if (currentStatus === 'out' || currentStatus === 'returned') {
      return NextResponse.json({ ok: false, message: 'INVALID_STATE', detail: '출고 이후에는 취소 요청이 불가합니다.' }, { status: 409 });
    }

    // 출고 운송장 등록 여부 확인
    const outbound = (rental.shipping as any)?.outbound ?? null;
    const outboundTracking = typeof outbound?.trackingNumber === 'string' ? outbound.trackingNumber.trim() : '';

    if (outboundTracking) {
      // 출고가 시작된 이후에는 취소 요청 불가
      return NextResponse.json(
        {
          ok: false,
          message: 'INVALID_STATE',
          detail: '출고 운송장이 등록된 이후에는 취소 요청이 불가합니다.',
        },
        { status: 409 },
      );
    }

    // pending / paid 이외 상태는 모두 막기
    if (!(currentStatus === 'pending' || currentStatus === 'paid')) {
      return NextResponse.json(
        {
          ok: false,
          message: 'INVALID_STATE',
          detail: '대여 취소 요청이 불가능한 상태입니다.',
        },
        { status: 409 },
      );
    }
    // 이미 취소 요청이 걸려있으면 중복 요청 차단
    const existingReq = rental.cancelRequest ?? null;
    if (existingReq && existingReq.status === 'requested') {
      return NextResponse.json({ ok: false, message: 'ALREADY_REQUESTED' }, { status: 400 });
    }

    // 3) body 파싱 (취소 사유)
    let rawBody: unknown = {};
    try {
      rawBody = await req.json();
    } catch {
      rawBody = {};
    }

    const parsedBody = CancelRequestBodySchema.safeParse(rawBody);

    // 스키마 실패 시에도 기존처럼 기본값으로 처리(동작/UX 유지)
    const reasonCode = parsedBody.success ? (parsedBody.data.reasonCode ?? '기타') : '기타';
    const reasonText = parsedBody.success ? (parsedBody.data.reasonText ?? '') : '';
    
    const now = new Date();

    // 4) cancelRequest 업데이트
    const cancelRequest = {
      status: 'requested' as RentalCancelRequestStatus,
      reasonCode,
      reasonText,
      requestedAt: now,
    };

    await db.collection('rental_orders').updateOne(
      { _id },
      {
        $set: {
          cancelRequest,
          updatedAt: now,
        },
      },
    );

    // 5) 이력 기록 (status 자체는 아직 paid 유지)
    await writeRentalHistory(db, _id, {
      action: 'cancel-request',
      from: currentStatus,
      to: currentStatus,
      actor: { role: 'user' },
      snapshot: { cancelRequest },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('rental cancel-request error', e);
    return NextResponse.json({ ok: false, message: 'SERVER_ERROR' }, { status: 500 });
  }
}
