import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import jwt from 'jsonwebtoken';

/**
 * 주문 취소 "요청" API
 * - 실제 status 를 '취소'로 바꾸지 않고, cancelRequest 필드와 history 만 남긴다.
 * - 운송장(배송정보) 입력 전까지만 요청 가능.
 * - 주문 소유자 또는 관리자만 호출 가능.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return new NextResponse('유효하지 않은 주문 ID입니다.', { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const orders = db.collection('orders');

    // 주문 조회
    const _id = new ObjectId(id);
    const existing: any = await orders.findOne({ _id });

    if (!existing) {
      return new NextResponse('해당 주문을 찾을 수 없습니다.', { status: 404 });
    }

    // 인증/인가 (기존 /api/orders/[id] PATCH 의 패턴과 동일하게 맞춤)
    const jar = await cookies();
    const at = jar.get('accessToken')?.value;
    const rt = jar.get('refreshToken')?.value;

    let user: any = at ? verifyAccessToken(at) : null;

    if (!user && rt) {
      try {
        user = jwt.verify(rt, process.env.REFRESH_TOKEN_SECRET!);
      } catch {
        // refresh 도 실패하면 아래에서 401 처리
      }
    }

    if (!user?.sub) {
      return new NextResponse('인증이 필요합니다.', { status: 401 });
    }

    // 관리자 화이트리스트 (기존 로직 재사용)
    const adminList = (process.env.ADMIN_EMAIL_WHITELIST || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const isOwner = existing.userId && user.sub === existing.userId.toString();
    const isAdmin = user.role === 'admin' || (user.email && adminList.includes(user.email));

    // 비회원 주문(guest)의 경우 관리자만 취소 요청을 넣을 수 있도록 제한
    if (existing.userId ? !(isOwner || isAdmin) : !isAdmin) {
      return new NextResponse('권한이 없습니다.', { status: 403 });
    }

    // 비즈니스 룰 체크

    // 이미 취소된 주문이면 추가 요청 불가
    if (existing.status === '취소' || existing.status === '환불') {
      return new NextResponse('이미 취소되었거나 환불된 주문입니다.', { status: 400 });
    }

    // 운송장(배송정보)이 이미 입력된 경우 취소 요청 불가
    //     => 우리가 합의한 규칙 A: "운송장 입력 전까지만 취소 요청 가능"
    const invoice = existing.shippingInfo?.invoice;
    const hasTrackingNumber = invoice && typeof invoice.trackingNumber === 'string' && invoice.trackingNumber.trim().length > 0;

    if (hasTrackingNumber) {
      return new NextResponse('이미 배송이 진행 중이어서 취소 요청을 할 수 없습니다.', { status: 400 });
    }

    // 이미 취소 요청이 들어간 주문인지 검사
    if (existing.cancelRequest && existing.cancelRequest.status === 'requested') {
      return new NextResponse('이미 취소 요청이 접수된 주문입니다.', { status: 400 });
    }

    // 요청 바디 파싱
    let body: any;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const reasonCode: string | undefined = typeof body.reasonCode === 'string' ? body.reasonCode.trim() : undefined;
    const reasonText: string | undefined = typeof body.reasonText === 'string' ? body.reasonText.trim() : undefined;

    // 연결된 스트링 교체 서비스 신청도 함께 취소되도록 요청하는지 여부
    const withStringing: boolean = typeof body.withStringing === 'boolean' ? body.withStringing : false;

    // 이 주문과 연결된 스트링 교체 서비스 신청 존재 여부 검사
    //    - 이미 작업 중/완료된 신청이 있으면 취소 요청 자체를 막는다.
    //    - 취소 가능 상태의 신청만 있고, withStringing 동의가 없으면
    //      경고용 에러코드만 내려보내고 실제 cancelRequest는 등록하지 않는다.
    const stringingAppsCol = db.collection('stringing_applications');

    const linkedApps = await stringingAppsCol
      .find({
        orderId: existing._id, // 이 주문에서 생성된 신청들
        status: { $nin: ['취소', 'cancelled', '거절'] }, // 이미 취소/거절된 건 제외
      })
      .project({ _id: 1, status: 1, totalPrice: 1, packageApplied: 1 })
      .toArray();

    if (linkedApps.length > 0) {
      // 작업 중/완료 상태가 하나라도 있으면: 취소 요청 자체를 막는다.
      const inProgressApps = linkedApps.filter((app: any) => ['작업 중', '교체완료', '완료'].includes(app.status));

      if (inProgressApps.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            errorCode: 'STRINGING_IN_PROGRESS',
            message: '이미 작업 중이거나 교체가 완료된 교체 서비스 신청이 있어 주문 취소 요청을 할 수 없습니다. 관리자에게 문의해 주세요.',
          },
          { status: 409 }
        );
      }

      //  모두 취소 가능한 상태이고, 아직 withStringing 동의가 없는 경우:
      //     => 먼저 경고용 에러코드만 내려보낸다.
      if (!withStringing) {
        return NextResponse.json(
          {
            ok: false,
            errorCode: 'STRINGING_APPS_EXIST',
            message: '이 주문으로 접수된 교체 서비스 신청이 있습니다. 주문을 취소하면 해당 신청도 함께 취소되도록 요청됩니다.',
            data: {
              count: linkedApps.length,
              applications: linkedApps.map((app: any) => ({
                id: app._id.toString(),
                status: app.status,
                totalPrice: app.totalPrice ?? 0,
                packageApplied: !!app.packageApplied,
              })),
            },
          },
          { status: 409 }
        );
      }

      // withStringing === true 인 경우:
      //     - 여기서는 추가 처리 없이 아래 cancelRequest 로직으로 진행한다.
      //     - 실제 신청 취소/패키지 회차 복원은 관리자 취소 승인 단계에서 처리.
    }

    const now = new Date();

    // cancelRequest 필드 구성
    const cancelRequest = {
      status: 'requested' as const,
      reasonCode: reasonCode || '기타',
      reasonText: reasonText || '',
      requestedAt: now,
      // processedAt / processedByAdminId 는 승인/거절 시 채움
    };

    // history 엔트리 구성
    const descBase = reasonCode || '사유 미입력';
    const descDetail = reasonText ? ` (${reasonText})` : '';

    const historyEntry = {
      status: '취소요청',
      date: now,
      description: `고객이 주문 취소를 요청했습니다. 사유: ${descBase}${descDetail}`,
    };

    // 연결된 스트링 교체 서비스 신청에도 취소 "요청" 플래그/히스토리 반영
    // - linkedApps: 위에서 미리 조회한 이 주문 기반 신청들
    // - withStringing === true 일 때만 실제로 신청에 반영
    if (linkedApps.length > 0 && withStringing) {
      // 이번 주문으로 접수된 신청들의 _id 목록
      const appIds = linkedApps.map((app: any) => app._id);

      // 신청 쪽에 저장할 cancelRequest (status 값은 신청 스키마에 맞춰 '요청' 사용)
      const appCancelRequest = {
        status: '요청' as const, // 주문은 'requested', 신청은 '요청'으로 관리
        reasonCode: cancelRequest.reasonCode,
        reasonText: cancelRequest.reasonText,
        requestedAt: now,
      };

      const appHistoryEntry = {
        status: '취소요청',
        date: now,
        description: `주문 취소 요청과 함께 교체 서비스 신청도 취소를 요청했습니다. 사유: ${cancelRequest.reasonCode}${cancelRequest.reasonText ? ` (${cancelRequest.reasonText})` : ''}`,
      };

      await stringingAppsCol.updateMany(
        { _id: { $in: appIds } } as any,
        {
          $set: {
            cancelRequest: appCancelRequest,
          },
          $push: {
            history: appHistoryEntry,
          },
        } as any
      );
    }

    // 7) DB 업데이트
    await orders.updateOne({ _id }, {
      $set: { cancelRequest },
      $push: { history: historyEntry },
    } as any);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/orders/[id]/cancel-request 오류:', error);
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 });
  }
}
