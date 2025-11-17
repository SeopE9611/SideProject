import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import jwt from 'jsonwebtoken';

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
      return new NextResponse('주문을 찾을 수 없습니다.', { status: 404 });
    }

    // ───────────────── 인증/인가: 관리자만 ─────────────────
    const jar = await cookies();
    const at = jar.get('accessToken')?.value;
    const rt = jar.get('refreshToken')?.value;

    let user: any = at ? verifyAccessToken(at) : null;

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
      return new NextResponse('관리자만 취소 요청을 거절할 수 있습니다.', { status: 403 });
    }

    const existingReq = existing.cancelRequest || {};

    if (existingReq.status !== 'requested') {
      return new NextResponse('취소 요청 상태의 주문이 아닙니다.', { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const inputReasonText = typeof body.adminMemo === 'string' ? body.adminMemo.trim() : undefined;

    const now = new Date();

    const updatedCancelRequest = {
      ...existingReq,
      status: 'rejected' as const,
      processedAt: now,
      processedByAdminId: user.sub,
    };

    const descBase = '관리자가 주문 취소 요청을 거절했습니다.';
    const descReason = inputReasonText ? ` 사유: ${inputReasonText}` : '';

    const historyEntry = {
      status: '취소요청거절',
      date: now,
      description: `${descBase}${descReason}`,
    };

    await orders.updateOne({ _id }, {
      $set: { cancelRequest: updatedCancelRequest },
      $push: { history: historyEntry },
    } as any);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/orders/[id]/cancel-reject 오류:', error);
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 });
  }
}
