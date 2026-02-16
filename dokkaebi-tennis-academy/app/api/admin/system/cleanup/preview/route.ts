import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { enforceAdminRateLimit } from '@/lib/admin/adminRateLimit';
import { ADMIN_EXPENSIVE_ENDPOINT_POLICIES } from '@/lib/admin/adminEndpointCostPolicy';
import { buildDangerousActionToken, createDangerousActionHash, getDangerousActionReconfirmText } from '@/lib/admin/adminDangerousAction';

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  // 삭제 후보 미리보기는 대량 조회가 될 수 있으므로 고비용 조회 정책으로 제한한다.
  const limited = await enforceAdminRateLimit(req, guard.db, String(guard.admin._id), ADMIN_EXPENSIVE_ENDPOINT_POLICIES.adminSystemPreview);
  if (limited) return limited;

  try {
    const db = guard.db;
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const users = await db
      .collection('users')
      .find({
        isDeleted: true,
        deletedAt: { $lt: cutoff },
      })
      .project({ hashedPassword: 0, password: 0 })
      .toArray();

    const candidateIds = users.map((user) => String(user?._id ?? '')).filter(Boolean);
    const previewHash = createDangerousActionHash('admin.system.cleanup', candidateIds);
    const confirmationToken = buildDangerousActionToken('admin.system.cleanup', String(guard.admin._id), previewHash);

    return NextResponse.json({
      dryRun: true,
      candidates: users,
      previewHash,
      requestHash: previewHash,
      confirmationToken,
      reconfirmText: getDangerousActionReconfirmText('admin.system.cleanup'),
    });
  } catch (error) {
    console.error('[ADMIN_SYSTEM_CLEANUP_PREVIEW]', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
