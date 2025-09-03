import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { issuePassesForPaidPackageOrder } from '@/lib/passes.service';
import type { PackageOrder } from '@/lib/types/package-order';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = (await cookies()).get('accessToken')?.value;
    const user = token ? verifyAccessToken(token) : null;
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = (await clientPromise).db();
    const packageOrders = db.collection<PackageOrder>('packageOrders');

    const body = await request.json();
    const statusStr = String(body?.status ?? '');

    const now = new Date();
    const _id = new ObjectId(id);

    const pkgOrder = await packageOrders.findOne({ _id });
    if (!pkgOrder) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    const historyEntry: PackageOrder['history'][number] = {
      status: statusStr,
      date: now,
      description: `상태 변경: ${statusStr}`,
    };

    await packageOrders.updateOne(
      { _id },
      {
        $set: {
          status: statusStr,
          updatedAt: now,
          ...(statusStr === '결제완료' ? { paymentStatus: '결제완료' } : {}),
        },
        $push: { history: { $each: [historyEntry] } },
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
