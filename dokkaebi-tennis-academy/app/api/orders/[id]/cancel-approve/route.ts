import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import jwt from 'jsonwebtoken';
import { revertConsumption } from '@/lib/passes.service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return new NextResponse('유효하지 않은 주문 ID입니다.', { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const orders = db.collection('orders');

    const _id = new ObjectId(id);
    const existing: any = await orders.findOne({ _id });

    if (!existing) {
      return new NextResponse('주문을 찾을 수 없습니다.', { status: 404 });
    }

    // ───────────────── 인증/인가: 관리자만 ─────────────────
    const jar = await cookies();
    const at = jar.get('accessToken')?.value;
    const rt = jar.get('refreshToken')?.value;

    let user: any = at ? verifyAccessToken(at) : null;

    // access 만료 시 refresh 토큰으로 한 번 더 시도
    if (!user && rt) {
      try {
        user = jwt.verify(rt, process.env.REFRESH_TOKEN_SECRET!);
      } catch {
        /* ignore */
      }
    }

    if (!user?.sub) {
      return new NextResponse('인증이 필요합니다.', { status: 401 });
    }

    const adminList = (process.env.ADMIN_EMAIL_WHITELIST || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const isAdmin = user.role === 'admin' || (user.email && adminList.includes(user.email));

    if (!isAdmin) {
      return new NextResponse('관리자만 취소를 승인할 수 있습니다.', { status: 403 });
    }

    // ───────────────── 배송 전인지 재확인 (A 규칙) ─────────────────
    const hasTrackingNumber = existing.shippingInfo?.invoice?.trackingNumber && typeof existing.shippingInfo.invoice.trackingNumber === 'string' && existing.shippingInfo.invoice.trackingNumber.trim().length > 0;

    if (hasTrackingNumber) {
      return new NextResponse('이미 배송이 진행 중이어서 취소 승인을 할 수 없습니다.', { status: 400 });
    }

    // ───────────────── 요청 바디에서 사유 받기 ─────────────────
    const body = await req.json().catch(() => ({}));
    const inputReasonCode = typeof body.reasonCode === 'string' ? body.reasonCode.trim() : undefined;
    const inputReasonText = typeof body.reasonText === 'string' ? body.reasonText.trim() : undefined;

    const existingReq = existing.cancelRequest || {};
    const now = new Date();

    // reasonCode / reasonText 우선순위:
    // 1) 관리자 입력값 > 2) 기존 cancelRequest 값 > 3) 기본값 '기타'
    const reasonCode = inputReasonCode || existingReq.reasonCode || '기타';
    const reasonText = inputReasonText ?? existingReq.reasonText ?? '';

    const updatedCancelRequest = {
      ...existingReq,
      status: 'approved' as const,
      reasonCode,
      reasonText,
      requestedAt: existingReq.requestedAt ?? now,
      processedAt: now,
      processedByAdminId: user.sub,
    };

    // ───────────────── 주문 상태/결제 상태/취소 사유 정리 ─────────────────
    const updateFields: any = {
      status: '취소',
      paymentStatus: '결제취소',
      cancelRequest: updatedCancelRequest,
    };

    // 기존 cancelReason / cancelReasonDetail 필드도 같이 맞춰줌
    updateFields.cancelReason = reasonCode;
    if (reasonCode === '기타') {
      updateFields.cancelReasonDetail = reasonText;
    } else {
      updateFields.cancelReasonDetail = reasonText || undefined;
    }

    // 히스토리 메시지 생성
    const descriptionBase = existingReq && existingReq.status === 'requested' ? '고객의 취소 요청을 관리자 권한으로 승인했습니다.' : '관리자가 직접 주문을 취소했습니다.';

    const descReason = reasonCode || reasonText ? ` 사유: ${reasonCode}${reasonText ? ` (${reasonText})` : ''}` : '';

    const historyEntry = {
      status: '취소',
      date: now,
      description: `${descriptionBase}${descReason}`,
    };

    await orders.updateOne({ _id }, {
      $set: updateFields,
      $push: { history: historyEntry },
    } as any);

    // 연결된 스트링 교체 서비스 신청이 있는 경우 함께 취소 처리
    // 연결된 스트링 교체 서비스 신청이 있는 경우 함께 취소 처리
    try {
      const appsCol = db.collection('stringing_applications');

      // orderId 기준으로 모든 신청 조회
      const linkedApps = await appsCol.find({ orderId: existing._id }).toArray();

      const now = new Date();

      for (const appDoc of linkedApps) {
        if (!appDoc) continue;
        if (appDoc.status === '취소') continue;

        const appKey = appDoc._id;

        // 1) 패키지 사용분 복원
        if (appDoc.packageApplied && appDoc.packagePassId) {
          try {
            await revertConsumption(db, appDoc.packagePassId, appKey);
          } catch (e) {
            console.error('[cancel-approve] revertConsumption error (linked application)', e);
          }
        }

        // 2) cancelRequest + status + history 업데이트
        const currentCancel = appDoc.cancelRequest ?? {};

        await appsCol.updateOne(
          { _id: appKey } as any,
          {
            $set: {
              status: '취소',
              cancelRequest: {
                ...currentCancel,
                status: 'approved',
                approvedAt: now,
              },
            },
            $push: {
              history: {
                status: '취소',
                date: now,
                description: '주문 취소 승인에 따라 신청도 함께 취소되었습니다.',
              },
            },
          } as any
        );
      }
    } catch (e) {
      console.error('[cancel-approve] linked stringing application cancel error:', e);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/orders/[id]/cancel-approve 오류:', error);
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 });
  }
}
