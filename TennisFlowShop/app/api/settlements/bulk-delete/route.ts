// 스냅샷 일괄 삭제 API
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';
import { enforceAdminRateLimit } from '@/lib/admin/adminRateLimit';
import { ADMIN_EXPENSIVE_ENDPOINT_POLICIES } from '@/lib/admin/adminEndpointCostPolicy';
import { acquireAdminExecutionLock, releaseAdminExecutionLock } from '@/lib/admin/adminExecutionLock';

export async function POST(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allow = process.env.NEXT_PUBLIC_SITE_URL;
  if (allow && origin && !origin.startsWith(allow)) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  let lockOwner: string | null = null;
  let lockDb: import('mongodb').Db | null = null;

  try {
    const g = await requireAdmin(req);
    if (!g.ok) return g.res;

    const limited = await enforceAdminRateLimit(req, g.db, String(g.admin._id), ADMIN_EXPENSIVE_ENDPOINT_POLICIES.settlementsMutation);
    if (limited) return limited;

    const db = g.db;
    lockDb = db;
    lockOwner = String(g.admin._id);

    // 대량 삭제는 단일 실행 락으로 겹침 실행을 차단한다.
    const lock = await acquireAdminExecutionLock({
      db,
      lockKey: 'admin.settlements.bulk-delete',
      owner: lockOwner,
      ttlMs: 2 * 60 * 1000,
      meta: { route: '/api/settlements/bulk-delete' },
    });
    if (!lock.ok) {
      return NextResponse.json({ ok: false, error: { code: 'execution_locked', message: '정산 스냅샷 일괄 삭제가 이미 실행 중입니다.' } }, { status: 409 });
    }

    const body = await req.json().catch(() => null);
    const raw = body?.yyyymms;

    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json({ success: false, message: '삭제할 항목을 선택하세요.' }, { status: 400 });
    }

    const yyyymms = Array.from(new Set(raw.map((v: unknown) => String(v ?? '').trim()).filter((v: string) => /^\d{6}$/.test(v))));
    if (yyyymms.length === 0) {
      return NextResponse.json({ success: false, message: '유효한 YYYYMM이 없습니다.' }, { status: 400 });
    }

    const result = await db.collection('settlements').deleteMany({ yyyymm: { $in: yyyymms } });

    await appendAdminAudit(
      db,
      {
        type: 'admin.settlements.bulk-delete',
        actorId: g.admin._id,
        message: '정산 스냅샷 일괄 삭제',
        diff: { yyyymms, deletedCount: result.deletedCount },
      },
      req,
    );

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount}개의 스냅샷이 삭제되었습니다.`,
      deletedCount: result.deletedCount,
    });
  } catch (e) {
    console.error('[settlements/bulk-delete]', e);
    return NextResponse.json({ message: 'internal_error' }, { status: 500 });
  } finally {
    if (lockDb && lockOwner) {
      await releaseAdminExecutionLock(lockDb, 'admin.settlements.bulk-delete', lockOwner);
    }
  }
}
