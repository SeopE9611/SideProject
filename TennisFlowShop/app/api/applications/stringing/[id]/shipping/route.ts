import { handleUpdateShippingInfo } from '@/app/features/stringing-applications/api/handlers';
import { verifyAccessToken, verifyOrderAccessToken } from '@/lib/auth.utils';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * 사용자(또는 게스트/관리자) 자가발송 운송장 저장 API
 *
 * 권한 규칙
 * - 로그인 유저: 신청서 userId와 accessToken.sub 일치
 * - 관리자: accessToken.role === 'admin'
 * - 게스트: orderAccessToken.orderId 와 신청서 orderId 일치
 *
 * 허용 바디(사용자 화면)
 * - { shippingInfo: { selfShip: { courier, trackingNo, shippedAt?, note? } } }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // id 검증
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, message: 'BAD_ID' }, { status: 400 });
  }

  // 신청서 조회 + 상태/권한 판단에 필요한 최소 필드만 가져오기
  const db = await getDb();
  const app = await db.collection('stringing_applications').findOne({ _id: new ObjectId(id) }, { projection: { userId: 1, orderId: 1, status: 1 } as any });

  if (!app) {
    return NextResponse.json({ ok: false, message: 'NOT_FOUND' }, { status: 404 });
  }

  // 종료 상태에서는 수정 금지 — 프론트에서 막아도 서버에서 한 번 더 방어
  const CLOSED = ['작업 중', '교체완료'];
  if (CLOSED.includes(String((app as any).status ?? ''))) {
    return NextResponse.json({ ok: false, message: 'CLOSED_APPLICATION' }, { status: 400 });
  }

  // 쿠키 기반 권한 체크
  const jar = await cookies();
  const at = jar.get('accessToken')?.value ?? null;
  const oax = jar.get('orderAccessToken')?.value ?? null;

  const payload = at ? verifyAccessToken(at) : null;
  const isAdmin = payload?.role === 'admin';
  const userId = typeof payload?.sub === 'string' ? payload.sub : null;

  const isOwner = !!userId && !!(app as any).userId && String((app as any).userId) === String(userId);

  const guestClaims = oax ? verifyOrderAccessToken(oax) : null;
  const guestOwns = !!guestClaims && !!(app as any).orderId && String(guestClaims.orderId) === String((app as any).orderId);

  if (!isOwner && !isAdmin && !guestOwns) {
    return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
  }

  // 바디 파싱 + 사용자용 필드만 허용(selfShip만)
  const body = await req.json().catch(() => null);
  const incoming = body?.shippingInfo?.selfShip ?? null;

  const courier = typeof incoming?.courier === 'string' ? incoming.courier.trim() : '';
  const trackingNo = typeof incoming?.trackingNo === 'string' ? incoming.trackingNo.trim() : '';
  const shippedAt = typeof incoming?.shippedAt === 'string' ? incoming.shippedAt.trim() : '';
  const note = typeof incoming?.note === 'string' ? incoming.note.trim() : '';

  if (!courier || !trackingNo) {
    return NextResponse.json({ ok: false, message: 'INVALID_SELF_SHIP' }, { status: 400 });
  }

  const safeBody = {
    shippingInfo: {
      selfShip: {
        courier,
        trackingNo,
        shippedAt,
        note,
      },
    },
  };

  // 기존 공용 업데이트 로직(주문서 shippingInfo 병합 + 히스토리 작성) 재사용
  //    주의: req.json()을 이미 읽었으므로 새 Request를 만들어서 넘긴다.
  const nextReq = new Request(req.url, {
    method: 'PATCH',
    headers: req.headers,
    body: JSON.stringify(safeBody),
  });

  return handleUpdateShippingInfo(nextReq, { params: { id } });
}
