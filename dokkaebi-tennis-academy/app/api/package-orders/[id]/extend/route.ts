import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import jwt from 'jsonwebtoken';
import type { PackageOrder } from '@/lib/types/package-order';
import { ObjectId as OID } from 'mongodb';
import type { UpdateFilter } from 'mongodb';
import type { ServicePass } from '@/lib/types/pass';
type PassHistoryItem = {
  _id: OID;
  type: 'extend_expiry' | 'adjust_sessions';
  at: Date;
  from?: Date | null;
  to?: Date | null;
  daysAdded?: number;
  reason?: string;
  adminId?: string | OID | null;
  adminName?: string | null;
  delta?: number; // adjust_sessions용
};

type PassStatus = ServicePass['status'];
const PASS_STATUS = {
  active: 'active' as PassStatus,
  paused: 'paused' as PassStatus,
  cancelled: 'cancelled' as PassStatus,
};
// body: { mode: 'days'|'absolute', days?: number, newExpiry?: string, reason?: string }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

    // 인증 & 관리자 체크 (access -> refresh, ADMIN_EMAILS 포함)
    const jar = await cookies();
    const at = jar.get('accessToken')?.value || null;
    const rt = jar.get('refreshToken')?.value || null;
    let user: any = at ? verifyAccessToken(at) : null;
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

    // 입력 파싱
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode as 'days' | 'absolute';
    const reason = String(body?.reason ?? '');
    if (mode !== 'days' && mode !== 'absolute') return NextResponse.json({ error: 'mode must be days|absolute' }, { status: 400 });

    const db = (await clientPromise).db();
    const packageOrders = db.collection<PackageOrder>('packageOrders');
    const passes = db.collection<ServicePass & { history?: PassHistoryItem[] }>('service_passes');

    const _id = new ObjectId(id);
    const now = new Date();

    // 연결된 pass 찾기 (orderId = packageOrder._id)
    const passDoc = await passes.findOne({ orderId: _id });
    if (!passDoc) {
      return NextResponse.json({ error: 'service pass not found for this order' }, { status: 404 });
    }

    const pkgOrder = await packageOrders.findOne({ _id });
    if (!pkgOrder) {
      return NextResponse.json({ error: 'order not found' }, { status: 404 });
    }

    if (pkgOrder.paymentStatus !== '결제완료') {
      return NextResponse.json({ error: '결제완료 상태에서만 연장이 가능합니다.' }, { status: 409 });
    }

    if (passDoc.status === PASS_STATUS.cancelled) {
      return NextResponse.json({ error: '취소된 패스입니다.' }, { status: 409 });
    }

    const currentExpiry = passDoc.expiresAt ? new Date(passDoc.expiresAt) : null;
    let nextExpiry: Date;
    if (mode === 'days') {
      const days = Number(body?.days || 0);
      if (!Number.isFinite(days) || days === 0) return NextResponse.json({ error: 'days must be non-zero number' }, { status: 400 });
      const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
      nextExpiry = new Date(base.getTime() + days * 86400000);
    } else {
      const d = new Date(body?.newExpiry);
      if (!d || Number.isNaN(d.getTime())) return NextResponse.json({ error: 'invalid newExpiry' }, { status: 400 });
      nextExpiry = d;
    }

    // daysAdded 계산(절대일 모드일 때도 안전하게 계산)
    const daysAdded = mode === 'days' ? Number(body?.days || 0) : Math.round((nextExpiry.getTime() - (currentExpiry && currentExpiry > now ? currentExpiry : now).getTime()) / 86400000);

    await passes.updateOne({ _id: passDoc._id }, {
      $set: { expiresAt: nextExpiry, updatedAt: now },
      $push: {
        history: {
          $each: [
            {
              _id: new OID(), // 히스토리 식별자
              type: 'extend_expiry', // 필터 키
              at: now, // 처리 시각
              from: currentExpiry || null, // 이전 만료일
              to: nextExpiry, // 이후 만료일
              daysAdded, // 며칠 연장했는지(절대일도 환산)
              reason: reason || '',
              // 관리자를 토큰에서 최대한 남김 (sub이 ObjectId 문자열인 경우만 캐스팅)
              adminId: user?.sub && ObjectId.isValid(user.sub) ? new OID(user.sub) : user?.sub ?? null,
              adminName: user?.name ?? user?.email ?? null,
            } as PassHistoryItem,
          ],
        },
      },
    } as UpdateFilter<ServicePass & { history: PassHistoryItem[] }>);

    // 감사 로그: packageOrders.history에 기록
    await packageOrders.updateOne(
      { _id },
      {
        $push: {
          history: {
            $each: [
              {
                status: '만료연장',
                date: now,
                description: `만료일 ${currentExpiry ? currentExpiry.toISOString() : '-'} → ${nextExpiry.toISOString()}${reason ? ` (${reason})` : ''}`,
              } satisfies PackageOrder['history'][number],
            ],
          },
        },
        $set: { updatedAt: now },
      }
    );

    const freshPass = await passes.findOne({ _id: passDoc._id });
    return NextResponse.json({ ok: true, pass: freshPass });
  } catch (e) {
    console.error('[POST /api/package-orders/:id/extend] error', e);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
