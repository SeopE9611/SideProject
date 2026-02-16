import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';

export async function DELETE(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

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
  }
}
