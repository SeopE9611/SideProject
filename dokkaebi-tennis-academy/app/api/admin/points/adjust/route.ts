import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { deductPoints, getPointsBalance, grantPoints } from '@/lib/points.service';

/**
 * body: { userId: string, amount: number, reason?: string, refKey?: string }
 *
 * amount > 0  => 지급(+)
 * amount < 0  => 차감(-)  (기본: 잔액 부족이면 실패)
 */
export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;

  const body = await req.json().catch(() => ({} as any));
  const userId = String(body?.userId ?? '');
  const amountRaw = Number(body?.amount);
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  const refKey = typeof body?.refKey === 'string' ? body.refKey.trim() : '';

  // 1) 기본 검증
  if (!ObjectId.isValid(userId)) {
    return NextResponse.json({ ok: false, error: 'INVALID_USER_ID' }, { status: 400 });
  }
  if (!Number.isFinite(amountRaw) || amountRaw === 0) {
    return NextResponse.json({ ok: false, error: 'INVALID_AMOUNT' }, { status: 400 });
  }

  const targetUserId = new ObjectId(userId);

  // 관리자 id를 ref에 남기고 싶으면 guard.user가 있는 경우만 사용
  const adminIdStr = (guard as any)?.user?.id;
  const adminId = ObjectId.isValid(adminIdStr) ? new ObjectId(adminIdStr) : undefined;

  try {
    // 2) 지급/차감 분기 (원장 + users.pointsBalance 캐시 동시 갱신)
    if (amountRaw > 0) {
      await grantPoints(db, {
        userId: targetUserId,
        amount: amountRaw,
        type: 'admin_adjust',
        ...(refKey ? { refKey } : {}),
        ...(reason ? { reason } : {}),
        ...(adminId ? { ref: { adminId } } : {}),
      });
    } else {
      await deductPoints(db, {
        userId: targetUserId,
        amount: Math.abs(amountRaw),
        type: 'admin_adjust',
        ...(refKey ? { refKey } : {}),
        ...(reason ? { reason } : {}),
        ...(adminId ? { ref: { adminId } } : {}),
        // 기본 정책: 마이너스 잔액 금지 (필요하면 true로 열어도 됨)
        allowNegativeBalance: false,
      });
    }

    // 3) 조정 후 잔액 반환
    const balance = await getPointsBalance(db, targetUserId);

    return NextResponse.json({ ok: true, userId, delta: amountRaw, balance }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    // points.service.ts에서 던지는 코드 기반으로 분기
    const code = err?.code || err?.message;

    if (code === 'INSUFFICIENT_POINTS') {
      return NextResponse.json({ ok: false, error: 'INSUFFICIENT_POINTS' }, { status: 400 });
    }
    if (code === 'USER_NOT_FOUND') {
      return NextResponse.json({ ok: false, error: 'USER_NOT_FOUND' }, { status: 404 });
    }

    // refKey 멱등(중복) 케이스를 “성공(이미 반영됨)”으로 처리하고 싶으면 여기서 E11000 처리 추가 가능
    console.error('[admin points adjust] failed', err);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
