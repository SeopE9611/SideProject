import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { issuePassesForPaidPackageOrder } from '@/lib/passes.service';
import type { PackageOrder } from '@/lib/types/package-order';
import jwt from 'jsonwebtoken';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // 토큰 읽기 (access 우선, refresh 보조)
    const jar = await cookies();
    const at = jar.get('accessToken')?.value;
    const rt = jar.get('refreshToken')?.value;

    let user: any = at ? verifyAccessToken(at) : null;
    if (!user && rt) {
      try {
        user = jwt.verify(rt, process.env.REFRESH_TOKEN_SECRET!);
      } catch {}
    }
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 관리자 체크 (+ 이메일 화이트리스트)
    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin = user?.role === 'admin' || user?.roles?.includes?.('admin') || user?.isAdmin === true || ADMIN_EMAILS.includes((user?.email ?? '').toLowerCase());

    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = (await clientPromise).db();
    const packageOrders = db.collection<PackageOrder>('packageOrders');

    const body = await request.json();
    const statusStr = String(body?.status ?? '');
    const now = new Date();
    const _id = new ObjectId(id);

    const pkgOrder = await packageOrders.findOne({ _id });
    if (!pkgOrder) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    await packageOrders.updateOne(
      { _id },
      {
        $set: {
          status: statusStr,
          updatedAt: now,
          ...(statusStr === '결제완료' ? { paymentStatus: '결제완료' } : {}),
        },
        $push: {
          history: {
            $each: [
              {
                status: statusStr,
                date: now,
                description: `상태 변경: ${statusStr}`,
              } satisfies PackageOrder['history'][number],
            ],
          },
        },
      }
    );

    if (statusStr === '결제완료') {
      // 결제완료 시 패스 발급(멱등)
      await issuePassesForPaidPackageOrder(db, { ...pkgOrder, _id });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[PATCH /api/package-orders/[id]] error', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
