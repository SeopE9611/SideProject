import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';
import { enforceAdminRateLimit } from '@/lib/admin/adminRateLimit';
import { ADMIN_EXPENSIVE_ENDPOINT_POLICIES } from '@/lib/admin/adminEndpointCostPolicy';
import { acquireAdminExecutionLock, releaseAdminExecutionLock } from '@/lib/admin/adminExecutionLock';
import { buildDangerousActionToken, createDangerousActionHash, getDangerousActionReconfirmText, isDangerousActionConfirmationValid } from '@/lib/admin/adminDangerousAction';

interface PurgeRequestBody {
  mode?: 'dry-run' | 'execute';
  previewHash?: string;
  requestHash?: string;
  confirmationToken?: string;
  confirmationText?: string;
}

async function listPurgeCandidates(db: any) {
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const candidates = await db
    .collection('users')
    .find({
      isDeleted: true,
      deletedAt: { $lt: cutoff },
    })
    .project({ _id: 1 })
    .toArray();

  return {
    cutoff,
    candidateIds: candidates.map((item: { _id?: unknown }) => String(item?._id ?? '')).filter(Boolean),
  };
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const limited = await enforceAdminRateLimit(req, guard.db, String(guard.admin._id), ADMIN_EXPENSIVE_ENDPOINT_POLICIES.adminSystemMutation);
  if (limited) return limited;

  const body: PurgeRequestBody = await req.json().catch(() => ({}));
  const mode = body.mode === 'execute' ? 'execute' : 'dry-run';

  const { cutoff, candidateIds } = await listPurgeCandidates(guard.db);
  const previewHash = createDangerousActionHash('admin.system.purge', candidateIds);

  if (mode !== 'execute') {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      mode,
      deletedCount: candidateIds.length,
      previewHash,
      requestHash: previewHash,
      confirmationToken: buildDangerousActionToken('admin.system.purge', String(guard.admin._id), previewHash),
      reconfirmText: getDangerousActionReconfirmText('admin.system.purge'),
    });
  }

  if (!body.previewHash || !body.requestHash || body.previewHash !== previewHash || body.requestHash !== previewHash) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'preview_hash_mismatch',
          message: '미리보기 대상이 변경되었습니다. 최신 미리보기를 다시 확인해 주세요.',
        },
      },
      { status: 409 },
    );
  }

  if (!isDangerousActionConfirmationValid({
    actionKey: 'admin.system.purge',
    adminId: String(guard.admin._id),
    previewHash,
    confirmationToken: body.confirmationToken,
    confirmationText: body.confirmationText,
  })) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'confirmation_required',
          message: `확인 토큰 또는 재확인 문자열("${getDangerousActionReconfirmText('admin.system.purge')}")이 필요합니다.`,
        },
      },
      { status: 400 },
    );
  }

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
    const result = await guard.db.collection('users').deleteMany({
      isDeleted: true,
      deletedAt: { $lt: cutoff },
    });

    await appendAdminAudit(
      guard.db,
      {
        type: 'admin.system.purge',
        actorId: guard.admin._id,
        message: '휴면 삭제 사용자 영구 정리 실행',
        diff: { cutoff, deletedCount: result.deletedCount, previewHash },
      },
      req,
    );

    return NextResponse.json({
      message: '삭제 완료',
      deletedCount: result.deletedCount,
      previewHash,
    });
  } catch (error) {
    console.error('[ADMIN_SYSTEM_PURGE_DELETE]', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  } finally {
    await releaseAdminExecutionLock(guard.db, 'admin.system.purge', lockOwner);
  }
}
