import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import jwt from 'jsonwebtoken';

/**
 * 주문 취소 "요청" API
 * - 실제 status 를 '취소'로 바꾸지 않고, cancelRequest 필드와 history 만 남긴다.
 * - 운송장(배송정보) 입력 전까지만 요청 가능.
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

    // 1) 주문 조회
    const _id = new ObjectId(id);
    const existing: any = await orders.findOne({ _id });

    if (!existing) {
      return new NextResponse('해당 주문을 찾을 수 없습니다.', { status: 404 });
    }

    // 2) 인증/인가 (기존 /api/orders/[id] PATCH 의 패턴과 동일하게 맞춤)
    const jar = await cookies();
    const at = jar.get('accessToken')?.value;
    const rt = jar.get('refreshToken')?.value;

    let user: any = at ? verifyAccessToken(at) : null;

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

    // 관리자 화이트리스트 (기존 로직 재사용)
    const adminList = (process.env.ADMIN_EMAIL_WHITELIST || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const isOwner = existing.userId && user.sub === existing.userId.toString();
    const isAdmin = user.role === 'admin' || (user.email && adminList.includes(user.email));

    // 비회원 주문(guest)의 경우 관리자만 취소 요청을 넣을 수 있도록 제한
    if (existing.userId ? !(isOwner || isAdmin) : !isAdmin) {
      return new NextResponse('권한이 없습니다.', { status: 403 });
    }

    // 3) 비즈니스 룰 체크

    // 3-1) 이미 취소된 주문이면 추가 요청 불가
    if (existing.status === '취소' || existing.status === '환불') {
      return new NextResponse('이미 취소되었거나 환불된 주문입니다.', { status: 400 });
    }

    // 3-2) 운송장(배송정보)이 이미 입력된 경우 취소 요청 불가
    //     => 우리가 합의한 규칙 A: "운송장 입력 전까지만 취소 요청 가능"
    const invoice = existing.shippingInfo?.invoice;
    const hasTrackingNumber = invoice && typeof invoice.trackingNumber === 'string' && invoice.trackingNumber.trim().length > 0;

    if (hasTrackingNumber) {
      return new NextResponse('이미 배송이 진행 중이어서 취소 요청을 할 수 없습니다.', { status: 400 });
    }

    // 3-3) 이미 취소 요청이 들어간 주문인지 검사
    if (existing.cancelRequest && existing.cancelRequest.status === 'requested') {
      return new NextResponse('이미 취소 요청이 접수된 주문입니다.', { status: 400 });
    }

    // 4) 요청 바디 파싱
    let body: any;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const reasonCode: string | undefined = typeof body.reasonCode === 'string' ? body.reasonCode.trim() : undefined;
    const reasonText: string | undefined = typeof body.reasonText === 'string' ? body.reasonText.trim() : undefined;

    const now = new Date();

    // 5) cancelRequest 필드 구성
    const cancelRequest = {
      status: 'requested' as const,
      reasonCode: reasonCode || '기타',
      reasonText: reasonText || '',
      requestedAt: now,
      // processedAt / processedByAdminId 는 승인/거절 시 채움
    };

    // 6) history 엔트리 구성
    const descBase = reasonCode || '사유 미입력';
    const descDetail = reasonText ? ` (${reasonText})` : '';

    const historyEntry = {
      status: '취소요청',
      date: now,
      description: `고객이 주문 취소를 요청했습니다. 사유: ${descBase}${descDetail}`,
    };

    // 7) DB 업데이트
    await orders.updateOne({ _id }, {
      $set: { cancelRequest },
      $push: { history: historyEntry },
    } as any);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/orders/[id]/cancel-request 오류:', error);
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 });
  }
}
