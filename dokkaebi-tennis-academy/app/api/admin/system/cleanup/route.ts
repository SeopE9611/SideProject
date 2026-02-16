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

  // [보안 1/3] 상태 변경 API 이므로 CSRF 토큰 검증을 가장 먼저 수행한다.
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  // [보호 2/3] 고비용 시스템 정리 API에 대해 IP + adminId 단위 레이트리밋을 적용한다.
  const limited = await enforceAdminRateLimit(req, guard.db, String(guard.admin._id), ADMIN_EXPENSIVE_ENDPOINT_POLICIES.adminSystemMutation);
  if (limited) return limited;

  const lockOwner = String(guard.admin._id);
  // [보호 3/3] 장시간 정리 작업은 단일 실행 락으로 직렬화해 중복 실행을 방지한다.
  const lock = await acquireAdminExecutionLock({
    db: guard.db,
    lockKey: 'admin.system.cleanup',
    owner: lockOwner,
    ttlMs: 2 * 60 * 1000,
    meta: { route: '/api/admin/system/cleanup' },
  });
  if (!lock.ok) {
    return NextResponse.json({ ok: false, error: { code: 'execution_locked', message: '동일 정리 작업이 이미 실행 중입니다. 잠시 후 다시 시도해 주세요.' } }, { status: 409 });
  }

  try {
    const db = guard.db;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const result = await db.collection('users').deleteMany({
      isDeleted: true,
      deletedAt: { $lt: cutoff },
    });

    await appendAdminAudit(
      db,
      {
        type: 'admin.system.cleanup',
        actorId: guard.admin._id,
        message: '삭제 사용자 단기 정리 실행',
        diff: { cutoff, deletedCount: result.deletedCount },
      },
      req,
    );

    return NextResponse.json({
      message: '정리 완료',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('[ADMIN_SYSTEM_CLEANUP_DELETE]', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  } finally {
    await releaseAdminExecutionLock(guard.db, 'admin.system.cleanup', lockOwner);
  }
}
