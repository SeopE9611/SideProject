import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}


export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = (await clientPromise).db();
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'BAD_ID' }, { status: 400 });
  }
  const doc = await db.collection('rental_orders').findOne({ _id: new ObjectId(id) });
  if (!doc) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

  /**
   * 권한 가드(회원 대여건만)
   * - rental.userId가 있는 문서: 소유자/관리자만 조회 가능
   * - rental.userId가 없는 문서(비회원): 기존 흐름 유지(조회 허용)
   */
  if (doc.userId) {
    const jar = await cookies();
    const at = jar.get('accessToken')?.value;
    const payload = safeVerifyAccessToken(at);
    const ownerId = String(doc.userId);
    const isOwner = String(payload?.sub ?? '') === ownerId;
    const isAdmin = payload?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ message: 'FORBIDDEN' }, { status: 403 });
    }
  }

  // 고객 정보
  let user: { name?: string; email?: string; phone?: string } | null = null;

  const userId = doc.userId ? String(doc.userId) : '';
  if (ObjectId.isValid(userId)) {
    const u = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (u) user = { name: u.name ?? '', email: u.email ?? '', phone: u.phone ?? '' };
  }

  const cancelReq = doc.cancelRequest ?? null;

  // 응답 정리
  return NextResponse.json({
    id: doc._id.toString(),
    racketId: doc.racketId?.toString?.(),
    brand: doc.brand,
    model: doc.model,
    days: doc.days,
    status: typeof doc.status === 'string' ? doc.status.toLowerCase() : doc.status,
    servicePickupMethod: doc.servicePickupMethod ?? null,
    amount: doc.amount, // { deposit, fee, total }
    // 스트링 교체 요청
    stringing: doc.stringing
      ? {
          requested: !!doc.stringing.requested,
          stringId: doc.stringing.stringId?.toString?.() ?? null,
          name: doc.stringing.name ?? '',
          price: Number(doc.stringing.price ?? 0),
          mountingFee: Number(doc.stringing.mountingFee ?? 0),
          image: doc.stringing.image ?? null,
          requestedAt: doc.stringing.requestedAt ?? null,
        }
      : null,
    createdAt: doc.createdAt,
    outAt: doc.outAt ?? null, // 출고 시각
    dueAt: doc.dueAt ?? null, // 반납 예정
    returnedAt: doc.returnedAt ?? null, // 반납 완료
    depositRefundedAt: doc.depositRefundedAt ?? null, // 보증금 환불 시각
    shipping: {
      // 운송장/배송 정보
      outbound: doc.shipping?.outbound ?? null,
      return: doc.shipping?.return ?? null,
    },
    // 취소 요청 정보
    cancelRequest: cancelReq
      ? {
          status: cancelReq.status ?? 'requested',
          reasonCode: cancelReq.reasonCode ?? '',
          reasonText: cancelReq.reasonText ?? '',
          requestedAt: cancelReq.requestedAt ?? null,
          processedAt: cancelReq.processedAt ?? null,
        }
      : null,
    user,
  });
}
