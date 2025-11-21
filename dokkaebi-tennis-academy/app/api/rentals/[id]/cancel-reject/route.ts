import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import jwt from 'jsonwebtoken';
import { writeRentalHistory } from '@/app/features/rentals/utils/history';

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
      return new NextResponse('관리자만 접근 가능합니다.', { status: 403 });
    }

    // ───────── 비즈니스 로직 ─────────
    const currentStatus = String(existing.status ?? 'pending');
    const cancel = existing.cancelRequest;

    if (!cancel || cancel.status !== 'requested') {
      return NextResponse.json({ ok: false, message: 'INVALID_STATE', detail: '거절할 취소 요청이 없습니다.' }, { status: 409 });
    }

    const now = new Date();

    // 1) rental_orders 상태 업데이트 (대여 status는 유지)
    await rentals.updateOne({ _id }, {
      $set: {
        'cancelRequest.status': 'rejected',
        'cancelRequest.processedAt': now,
        updatedAt: now,
      },
    } as any);

    // 2) 히스토리 기록
    await writeRentalHistory(db, _id, {
      action: 'cancel-rejected',
      from: currentStatus,
      to: currentStatus,
      actor: { role: 'admin', id: user.sub },
      snapshot: {
        cancelRequest: {
          ...(cancel || {}),
          status: 'rejected',
          processedAt: now,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/rentals/[id]/cancel-reject 오류:', error);
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 });
  }
}
