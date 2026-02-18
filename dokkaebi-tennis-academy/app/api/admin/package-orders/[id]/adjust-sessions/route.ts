import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { PackageOrder } from '@/lib/types/package-order';
import type { UpdateFilter } from 'mongodb';
import type { ServicePass } from '@/lib/types/pass';
import { ObjectId as OID } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';


type PassHistoryItem = {
  _id: OID;
  type: 'extend_expiry' | 'adjust_sessions';
  at: Date;
  from?: number | null; // 이전 remainingCount
  to?: number | null; // 이후 remainingCount
  delta?: number;
  reason?: string;
  adminId?: string | OID | null;
  adminName?: string | null;
  adminEmail?: string | null;
};

// 상수로 안전비교
type PassStatus = ServicePass['status'];
const PASS_STATUS = {
  active: 'active' as PassStatus,
  paused: 'paused' as PassStatus,
  cancelled: 'cancelled' as PassStatus,
};

// 이제 상태 변경해보기.STEP 3: 결제 상태에 따라 동작 잠금(서버+UI)

// body: { delta: number, clampZero?: boolean, reason?: string }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // 관리자 인증/인가 표준 가드
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  // Origin allowlist + double-submit 토큰 기반 CSRF 검증
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  try {
  const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

    // 입력 파싱
    const body = await req.json().catch(() => ({}));
    const delta = Number(body?.delta ?? 0);
    const clampZero = Boolean(body?.clampZero);
    const reason = String(body?.reason ?? '');
    if (!Number.isFinite(delta) || delta === 0) return NextResponse.json({ error: 'delta must be a non-zero number' }, { status: 400 });

    const db = (await clientPromise).db();
    const packageOrders = db.collection<PackageOrder>('packageOrders');
    const passes = db.collection<ServicePass & { history?: PassHistoryItem[] }>('service_passes');

    const _id = new ObjectId(id);

    const passDoc = await passes.findOne({ orderId: _id });
    if (!passDoc) {
      return NextResponse.json({ error: 'service pass not found for this order' }, { status: 404 });
    }

    const pkgOrder = await packageOrders.findOne({ _id });
    if (!pkgOrder) {
      return NextResponse.json({ error: 'order not found' }, { status: 404 });
    }

    if (pkgOrder.paymentStatus !== '결제완료') {
      return NextResponse.json({ error: '결제완료 상태에서만 횟수 조절이 가능합니다.' }, { status: 409 });
    }

    if (passDoc.status === PASS_STATUS.cancelled) {
      return NextResponse.json({ error: '취소된 패스입니다.' }, { status: 409 });
    }

    const now = new Date();
    if (passDoc.expiresAt && passDoc.expiresAt < now) {
      return NextResponse.json({ error: '만료된 패스입니다. 연장 후 이용해주세요.' }, { status: 409 });
    }

    const prev = Number(passDoc.remainingCount ?? 0);
    let next = prev + delta;
    if (clampZero && next < 0) next = 0;

    await passes.updateOne({ _id: passDoc._id }, {
      $set: { remainingCount: next, updatedAt: now },
      $push: {
        history: {
          $each: [
            {
              _id: new OID(),
              type: 'adjust_sessions',
              at: now,
              from: prev,
              to: next,
              delta,
              reason: reason || '',
              adminId: guard.admin._id,
              adminName: guard.admin.email ?? null,
              adminEmail: guard.admin.email ?? null,
            } as PassHistoryItem,
          ],
        },
      },
    } as UpdateFilter<ServicePass & { history: PassHistoryItem[] }>);

    await packageOrders.updateOne(
      { _id },
      {
        $push: {
          history: {
            $each: [
              {
                status: '횟수조절',
                date: now,
                description: `남은횟수 ${prev} → ${next}${reason ? ` (${reason})` : ''}`,
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
    console.error('[POST /api/package-orders/:id/adjust-sessions] error', e);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
