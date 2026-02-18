import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { writeRentalHistory } from '@/app/features/rentals/utils/history';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  // 변경성 엔드포인트 공통 파이프라인: 관리자 인증 이후 CSRF를 바로 검증한다.
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, message: '유효하지 않은 대여 ID입니다.' }, { status: 400 });

    const rentals = guard.db.collection('rental_orders');
    const _id = new ObjectId(id);
    const existing: any = await rentals.findOne({ _id });
    if (!existing) return NextResponse.json({ ok: false, message: '대여를 찾을 수 없습니다.' }, { status: 404 });

    const currentStatus = String(existing.status ?? 'pending');
    const cancel = existing.cancelRequest;
    if (!cancel || cancel.status !== 'requested') {
      return NextResponse.json({ ok: false, message: 'INVALID_STATE', detail: '거절할 취소 요청이 없습니다.' }, { status: 409 });
    }

    const now = new Date();
    const updated = await rentals.updateOne(
      { _id, 'cancelRequest.status': 'requested' },
      {
        $set: {
          'cancelRequest.status': 'rejected',
          'cancelRequest.processedAt': now,
          updatedAt: now,
        },
      } as any,
    );

    if (updated.matchedCount === 0) {
      return NextResponse.json({ ok: false, message: 'INVALID_STATE', detail: '거절 가능한 상태가 아닙니다.' }, { status: 409 });
    }

    await writeRentalHistory(guard.db, _id, {
      action: 'cancel-rejected',
      from: currentStatus,
      to: currentStatus,
      actor: { role: 'admin', id: String(guard.admin._id) },
      snapshot: {
        cancelRequest: {
          ...(cancel || {}),
          status: 'rejected',
          processedAt: now,
        },
      },
    });

    await appendAdminAudit(
      guard.db,
      {
        type: 'admin.rentals.status.cancel-rejected',
        actorId: guard.admin._id,
        targetId: _id,
        message: '대여 취소 요청 거절 처리',
        diff: { from: currentStatus, to: currentStatus, cancelRequestStatus: 'rejected' },
      },
      req,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/admin/rentals/[id]/cancel-reject 오류:', error);
    return NextResponse.json({ ok: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
