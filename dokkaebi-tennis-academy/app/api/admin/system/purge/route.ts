import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';
import { enforceAdminRateLimit } from '@/lib/admin/adminRateLimit';
import { ADMIN_EXPENSIVE_ENDPOINT_POLICIES } from '@/lib/admin/adminEndpointCostPolicy';
import { acquireAdminExecutionLock, releaseAdminExecutionLock } from '@/lib/admin/adminExecutionLock';

export async function DELETE(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const limited = await enforceAdminRateLimit(req, guard.db, String(guard.admin._id), ADMIN_EXPENSIVE_ENDPOINT_POLICIES.adminSystemMutation);
  if (limited) return limited;

  const lockOwner = String(guard.admin._id);
  const lock = await acquireAdminExecutionLock({
    db: guard.db,
    lockKey: 'admin.system.purge',
    owner: lockOwner,
    ttlMs: 3 * 60 * 1000,
    meta: { route: '/api/admin/system/purge' },
  });
  if (!lock.ok) {
    return NextResponse.json({ ok: false, error: { code: 'execution_locked', message: '동일 영구 정리 작업이 이미 실행 중입니다.' } }, { status: 409 });
  }

  try {
    const db = guard.db;
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const result = await db.collection('users').deleteMany({
      isDeleted: true,
      deletedAt: { $lt: cutoff },
    });

    await appendAdminAudit(
      db,
      {
        type: 'admin.system.purge',
        actorId: guard.admin._id,
        message: '휴면 삭제 사용자 영구 정리 실행',
        diff: { cutoff, deletedCount: result.deletedCount },
      },
      req,
    );

    return NextResponse.json({
      message: '삭제 완료',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('[ADMIN_SYSTEM_PURGE_DELETE]', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  } finally {
    await releaseAdminExecutionLock(guard.db, 'admin.system.purge', lockOwner);
  }
}
