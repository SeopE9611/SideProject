import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import clientPromise from '@/lib/mongodb';
import { ObjectId, ObjectId as OID, UpdateFilter } from 'mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import jwt from 'jsonwebtoken';
import type { PackageOrder } from '@/lib/types/package-order';
import type { ServicePass } from '@/lib/types/pass';


function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

type PassHistoryItem = {
  _id: OID;
  type: 'status_change';
  at: Date;
  from?: 'active' | 'paused' | 'cancelled' | null;
  to: 'active' | 'paused' | 'cancelled';
  reason?: string;
  adminId?: string | OID | null;
  adminName?: string | null;
};

// POST /api/package-orders/:id/pass-status
// body: { status: 'active' | 'paused' | 'cancelled', reason?: string }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

    // 인증 + 관리자
    const jar = await cookies();
    const at = jar.get('accessToken')?.value || null;
    const rt = jar.get('refreshToken')?.value || null;

    let user: any = safeVerifyAccessToken(at);
    if (!user && rt) {
      try {
        user = jwt.verify(rt, process.env.REFRESH_TOKEN_SECRET!);
      } catch {}
    }
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin = user?.role === 'admin' || user?.roles?.includes?.('admin') || user?.isAdmin === true || ADMIN_EMAILS.includes((user?.email ?? '').toLowerCase());
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // 입력
    const body = await req.json().catch(() => ({}));
    const next: 'active' | 'paused' | 'cancelled' = body?.status;
    const reason: string = String(body?.reason ?? '');
    if (!['active', 'paused', 'cancelled'].includes(next)) {
      return NextResponse.json({ error: 'status must be active|paused|cancelled' }, { status: 400 });
    }

    const db = (await clientPromise).db();
    const passes = db.collection<ServicePass & { history?: PassHistoryItem[] }>('service_passes');
    const orders = db.collection<PackageOrder>('packageOrders');

    // 이 주문에 연결된 패스 찾기
    const orderId = new ObjectId(id);
    const pass = await passes.findOne({ orderId });
    if (!pass) return NextResponse.json({ error: 'service pass not found for this order' }, { status: 404 });

    const now = new Date();
    const prev = (pass.status ?? 'active') as 'active' | 'paused' | 'cancelled';
    const adminIdValue = user?.sub && ObjectId.isValid(user.sub) ? new OID(user.sub) : user?.sub ?? null;

    // 패스 상태 업데이트 + 이력
    await passes.updateOne({ _id: pass._id }, {
      $set: { status: next, updatedAt: now },
      $push: {
        history: {
          $each: [
            {
              _id: new OID(),
              type: 'status_change',
              at: now,
              from: prev,
              to: next,
              reason: reason || '',
              adminId: adminIdValue,
              adminName: user?.name ?? user?.email ?? null,
            } as PassHistoryItem,
          ],
        },
      },
    } as UpdateFilter<ServicePass & { history: PassHistoryItem[] }>);

    // 감사 로그(선택) - 주문에도 간단히 남겨두기
    await orders.updateOne(
      { _id: orderId },
      {
        $push: {
          history: {
            $each: [
              {
                status: '패스상태변경',
                date: now,
                description: `패스 상태 ${prev} → ${next}${reason ? ` (${reason})` : ''}`,
              } satisfies PackageOrder['history'][number],
            ],
          },
        },
        $set: { updatedAt: now },
      }
    );

    const fresh = await passes.findOne({ _id: pass._id });
    return NextResponse.json({ ok: true, pass: fresh });
  } catch (e) {
    console.error('[POST /api/package-orders/:id/pass-status] error', e);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
