import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';
import { RENTAL_CLEANUP_CREATED_DISABLED_MESSAGE, isRentalCleanupCreatedEnabledForServer } from '@/lib/admin/rentalCleanupCreatedFeature';

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  // [운영 스위치] 플래그가 꺼져 있으면 도메인 메시지와 함께 즉시 중단한다.
  if (!isRentalCleanupCreatedEnabledForServer()) {
    return NextResponse.json({ ok: false, error: 'feature_disabled', message: RENTAL_CLEANUP_CREATED_DISABLED_MESSAGE }, { status: 403 });
  }

  const requestUrl = new URL(req.url);
  const requestedHours = Number(requestUrl.searchParams.get('hours') ?? '2');
  // hours 파라미터는 1~168 범위(최대 7일)로 제한한다.
  const hours = Number.isFinite(requestedHours) ? Math.min(Math.max(Math.floor(requestedHours), 1), 168) : 2;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  try {
    const result = await guard.db.collection('rental_orders').deleteMany({
      status: 'created',
      createdAt: { $lt: cutoff },
    });

    await appendAdminAudit(
      guard.db,
      {
        type: 'admin.rentals.cleanup-created',
        actorId: guard.admin._id,
        message: 'created 상태 장기 대여 신청 정리 실행',
        diff: {
          hours,
          cutoff,
          deletedCount: result.deletedCount,
        },
      },
      req,
    );

    return NextResponse.json({
      ok: true,
      message: '데이터 정리 완료',
      deleted: result.deletedCount,
      hours,
      cutoff,
    });
  } catch (error) {
    console.error('[admin/rentals/cleanup-created] cleanup failed', error);
    return NextResponse.json({ ok: false, error: 'cleanup_failed', message: '데이터 정리 실패' }, { status: 500 });
  }
}
