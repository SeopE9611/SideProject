import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import jwt from 'jsonwebtoken';
import { writeRentalHistory } from '@/app/features/rentals/utils/history';
import { grantPoints } from '@/lib/points.service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return new NextResponse('유효하지 않은 대여 ID입니다.', { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const rentals = db.collection('rental_orders');

    const _id = new ObjectId(id);
    const existing: any = await rentals.findOne({ _id });

    if (!existing) {
      return new NextResponse('대여를 찾을 수 없습니다.', { status: 404 });
    }

    // ───────── 인증/인가: 관리자만 ─────────
    const jar = await cookies();
    const at = jar.get('accessToken')?.value;
    const rt = jar.get('refreshToken')?.value;

    // accessToken이 깨져 verifyAccessToken이 throw 되어도 500이 아니라 인증 실패로 정리
    let user: any = null;
    try {
      user = at ? verifyAccessToken(at) : null;
    } catch {
      user = null;
    }

    if (!user && rt) {
      try {
        user = jwt.verify(rt, process.env.REFRESH_TOKEN_SECRET!);
      } catch {
        /* ignore */
      }
    }

    if (!user?.sub) {
      return new NextResponse('인증이 필요합니다.', { status: 401 });
    }

    const adminList = (process.env.ADMIN_EMAIL_WHITELIST || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const isAdmin = user.role === 'admin' || (user.email && adminList.includes(user.email));

    if (!isAdmin) {
      return new NextResponse('관리자만 접근 가능합니다.', { status: 403 });
    }

    // ───────── 비즈니스 로직 ─────────
    const currentStatus = String(existing.status ?? 'pending');
    const cancel = existing.cancelRequest;

    // 취소 요청이 없으면 승인 불가
    if (!cancel) {
      return NextResponse.json({ ok: false, message: 'INVALID_STATE', detail: '승인할 취소 요청이 없습니다.' }, { status: 409 });
    }

    // 멱등 처리:
    // - 이미 승인(approved)된 요청에 대해 다시 호출되더라도, "히스토리 중복"은 막고
    //   "포인트 복원/재고 복구"는 refKey 유니크 인덱스로 1회만 반영되도록 한다.
    const cancelStatus = String(cancel.status ?? '');
    const isRequested = cancelStatus === 'requested';
    const isApproved = cancelStatus === 'approved';

    // requested / approved 외 상태면 승인 불가
    if (!isRequested && !isApproved) {
      return NextResponse.json({ ok: false, message: 'INVALID_STATE', detail: '승인 가능한 취소 요청 상태가 아닙니다.' }, { status: 409 });
    }

    // 이미 (status=canceled + cancelRequest=approved) 상태면 "상태 업데이트/히스토리"는 스킵
    const alreadyCanceledApproved = currentStatus === 'canceled' && isApproved;

    const now = new Date();

    if (!alreadyCanceledApproved) {
      // 1) rental_orders 상태 업데이트
      await rentals.updateOne({ _id }, {
        $set: {
          status: 'canceled',
          'cancelRequest.status': 'approved',
          'cancelRequest.processedAt': now,
          updatedAt: now,
        },
      } as any);

      // 2) 히스토리 기록
      await writeRentalHistory(db, _id, {
        action: 'cancel-approved',
        from: currentStatus,
        to: 'canceled',
        actor: { role: 'admin', id: user.sub },
        snapshot: {
          cancelRequest: {
            ...(cancel || {}),
            status: 'approved',
            processedAt: now,
          },
        },
      });
    }

    // 3) 포인트 복원(즉시 차감 정책)
    // - rentals 생성 시 pointsUsed를 즉시 차감했으므로, 취소 확정(승인) 시 사용 포인트를 복원한다.
    // - refKey 유니크 인덱스로 멱등 처리되어, 중복 호출되더라도 1회만 복원된다.
    try {
      const uid = existing.userId;
      const uidStr = uid ? String(uid) : '';

      if (ObjectId.isValid(uidStr)) {
        const userOid = new ObjectId(uidStr);
        const rentalObjectId = String(existing._id);
        const txCol = db.collection('points_transactions');

        const spendRefKey = `rental:${rentalObjectId}:spend`;
        const restoreRefKey = `rental:${rentalObjectId}:spend_reversal`;

        const spendTx: any = await txCol.findOne({ refKey: spendRefKey, status: 'confirmed' });
        const amountFromTx = Math.abs(Number(spendTx?.amount ?? 0));
        const amountFromRental = Number(existing.pointsUsed ?? 0);
        const amountToRestore = Math.max(0, Math.trunc(amountFromTx || amountFromRental || 0));

        if (amountToRestore > 0) {
          await grantPoints(db, {
            userId: userOid,
            amount: amountToRestore,
            type: 'reversal',
            status: 'confirmed',
            refKey: restoreRefKey,
            reason: `대여 취소로 사용 포인트 복원 (대여ID: ${rentalObjectId})`,
          });
        }
      }
    } catch (e) {
      // 포인트 처리 실패가 "취소 승인" 자체를 막으면 관리자 UX가 깨짐 → 로그만 남기고 진행
      console.error('[rentals/cancel-approve] points restore error:', e);
    }

    // (B안) 단품 라켓이면 rented -> available 복구 (멀티 수량은 rental_orders로만 점유/해제됨)
    if (existing?.racketId) {
      // racketId가 오염된 경우 new ObjectId에서 500이 나지 않도록 방어
      const racketIdStr = String(existing.racketId);
      if (ObjectId.isValid(racketIdStr)) {
        const rid = new ObjectId(racketIdStr);
        const rack = await db.collection('used_rackets').findOne({ _id: rid }, { projection: { quantity: 1 } });
        const qty = Number(rack?.quantity ?? 1);
        if (!Number.isFinite(qty) || qty <= 1) {
          await db.collection('used_rackets').updateOne({ _id: rid, status: 'rented' }, { $set: { status: 'available', updatedAt: new Date() } });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/rentals/[id]/cancel-approve 오류:', error);
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 });
  }
}
