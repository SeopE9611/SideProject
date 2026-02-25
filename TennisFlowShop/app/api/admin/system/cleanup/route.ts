import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';
import { enforceAdminRateLimit } from '@/lib/admin/adminRateLimit';
import { ADMIN_EXPENSIVE_ENDPOINT_POLICIES } from '@/lib/admin/adminEndpointCostPolicy';
import { acquireAdminExecutionLock, releaseAdminExecutionLock } from '@/lib/admin/adminExecutionLock';
import { buildDangerousActionToken, createDangerousActionHash, getDangerousActionReconfirmText, isDangerousActionConfirmationValid } from '@/lib/admin/adminDangerousAction';

interface CleanupRequestBody {
  mode?: 'dry-run' | 'execute';
  previewHash?: string;
  requestHash?: string;
  confirmationToken?: string;
  confirmationText?: string;
}

async function listCleanupCandidates(db: any) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
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

  // [보안 1/4] 상태 변경 API 이므로 CSRF 토큰 검증을 가장 먼저 수행한다.
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  // [보호 2/4] 고비용 시스템 정리 API에 대해 IP + adminId 단위 레이트리밋을 적용한다.
  const limited = await enforceAdminRateLimit(req, guard.db, String(guard.admin._id), ADMIN_EXPENSIVE_ENDPOINT_POLICIES.adminSystemMutation);
  if (limited) return limited;

  const body: CleanupRequestBody = await req.json().catch(() => ({}));
  const mode = body.mode === 'execute' ? 'execute' : 'dry-run';

  const { cutoff, candidateIds } = await listCleanupCandidates(guard.db);
  const previewHash = createDangerousActionHash('admin.system.cleanup', candidateIds);

  // [안전 3/4] 고위험 작업은 기본 dry-run 응답을 우선 반환해 대상 검증을 강제한다.
  if (mode !== 'execute') {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      mode,
      deletedCount: candidateIds.length,
      previewHash,
      requestHash: previewHash,
      confirmationToken: buildDangerousActionToken('admin.system.cleanup', String(guard.admin._id), previewHash),
      reconfirmText: getDangerousActionReconfirmText('admin.system.cleanup'),
    });
  }

  // [안전 4/4] 사용자가 본 preview 해시와 실행 요청 해시가 현재 대상과 일치하는지 검증한다.
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
    actionKey: 'admin.system.cleanup',
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
          message: `확인 토큰 또는 재확인 문자열("${getDangerousActionReconfirmText('admin.system.cleanup')}")이 필요합니다.`,
        },
      },
      { status: 400 },
    );
  }

  const lockOwner = String(guard.admin._id);
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
    const result = await guard.db.collection('users').deleteMany({
      isDeleted: true,
      deletedAt: { $lt: cutoff },
    });

    await appendAdminAudit(
      guard.db,
      {
        type: 'admin.system.cleanup',
        actorId: guard.admin._id,
        message: '삭제 사용자 단기 정리 실행',
        diff: { cutoff, deletedCount: result.deletedCount, previewHash },
      },
      req,
    );

    return NextResponse.json({
      message: '정리 완료',
      deletedCount: result.deletedCount,
      previewHash,
    });
  } catch (error) {
    console.error('[ADMIN_SYSTEM_CLEANUP_DELETE]', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  } finally {
    await releaseAdminExecutionLock(guard.db, 'admin.system.cleanup', lockOwner);
  }
}
