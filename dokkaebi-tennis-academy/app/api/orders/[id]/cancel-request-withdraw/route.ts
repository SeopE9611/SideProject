import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import jwt from 'jsonwebtoken';


function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * 주문 취소 "요청 철회" API
 * - 이미 넣어둔 취소 요청(cancelRequest.status === 'requested')을 취소한다.
 * - 실제 주문 status 는 그대로 두고, cancelRequest 상태만 되돌린다.
 * - 운송장(배송정보) 입력 전까지만 철회 가능.
 * - 주문 소유자 또는 관리자만 호출 가능.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return new NextResponse('유효하지 않은 주문 ID입니다.', { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const orders = db.collection('orders');

    const _id = new ObjectId(id);
    const existing: any = await orders.findOne({ _id });

    if (!existing) {
      return new NextResponse('해당 주문을 찾을 수 없습니다.', { status: 404 });
    }

    // ───────── 1) 인증/인가 (cancel-request 라우트와 동일 패턴) ─────────
    const jar = await cookies();
    const at = jar.get('accessToken')?.value;
    const rt = jar.get('refreshToken')?.value;

    let user: any = safeVerifyAccessToken(at);

    if (!user && rt) {
      try {
        user = jwt.verify(rt, process.env.REFRESH_TOKEN_SECRET!);
      } catch {
        // refresh 도 실패하면 아래에서 401 처리
      }
    }

    if (!user?.sub) {
      return new NextResponse('인증이 필요합니다.', { status: 401 });
    }

    const adminList = (process.env.ADMIN_EMAIL_WHITELIST || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const isOwner = existing.userId && user.sub === existing.userId.toString();
    const isAdmin = user.role === 'admin' || (user.email && adminList.includes(user.email));

    // 비회원 주문(guest)의 경우 관리자만 취소 요청 철회 가능
    if (existing.userId ? !(isOwner || isAdmin) : !isAdmin) {
      return new NextResponse('권한이 없습니다.', { status: 403 });
    }

    // ───────── 2) 비즈니스 룰 체크 ─────────

    // 2-1) 이미 취소/환불된 주문이면 철회 자체가 의미 없음
    if (existing.status === '취소' || existing.status === '환불') {
      return new NextResponse('이미 취소되었거나 환불된 주문입니다.', { status: 400 });
    }

    // 2-2) 운송장(배송정보)이 이미 입력된 경우 철회 불가
    //      => 규칙 A: "운송장 입력 전까지만 취소 요청/철회 가능"
    const invoice = existing.shippingInfo?.invoice;
    const hasTrackingNumber = invoice && typeof invoice.trackingNumber === 'string' && invoice.trackingNumber.trim().length > 0;

    if (hasTrackingNumber) {
      return new NextResponse('이미 배송이 진행 중이어서 취소 요청을 철회할 수 없습니다.', { status: 400 });
    }

    // 2-3) 현재 cancelRequest 상태가 'requested' 인지 확인
    const existingReq: any = existing.cancelRequest || {};
    if (existingReq.status !== 'requested') {
      return new NextResponse('현재 취소 요청 상태가 아니어서 철회할 수 없습니다.', { status: 400 });
    }

    const now = new Date();

    // ───────── 3) cancelRequest 필드 업데이트 ─────────
    const updatedCancelRequest = {
      ...existingReq,
      status: 'none' as const, // 취소 요청 상태 초기화
      // 필요한 경우, 철회 시각을 남겨두고 싶으면 추가 필드로 저장
      withdrawnAt: now,
    };

    // ───────── 4) history 엔트리 추가 ─────────
    const historyEntry = {
      status: '취소요청철회',
      date: now,
      description: '고객이 주문 취소 요청을 철회했습니다.',
    };

    // ───────── 5) DB 업데이트 ─────────
    await orders.updateOne({ _id }, {
      $set: { cancelRequest: updatedCancelRequest },
      $push: { history: historyEntry },
    } as any);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/orders/[id]/cancel-request-withdraw 오류:', error);
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 });
  }
}
