import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { signOrderAccessToken } from '@/lib/auth.utils';

type GuestOrderMode = 'off' | 'legacy' | 'on';

function getGuestOrderMode(): GuestOrderMode {
  const raw = (process.env.GUEST_ORDER_MODE ?? 'on').trim();
  return raw === 'off' || raw === 'legacy' || raw === 'on' ? raw : 'on';
}

// POST /api/orders/:id/guest-token
// - 게스트 주문에 한해, 해당 주문으로 접근 가능한 HttpOnly 쿠키를 심어준다.
// - 같은 브라우저에서 /services/apply?orderId=... 진입 시 서버가 게스트 권한을 인정할 수 있게 함.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    // 운영 정책: 비회원 주문이 중단(off/legacy)된 경우, 게스트 토큰 발급 중단
    // (토큰 발급 엔드포인트 존재 여부/행동 가능성을 외부에 드러내지 않기 위해 404로 통일)
    if (getGuestOrderMode() !== 'on') {
      return NextResponse.json({ message: 'not found' }, { status: 404 });
    }
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'invalid order id' }, { status: 400 });
    }

    const db = await getDb();
    const order = await db.collection('orders').findOne({ _id: new ObjectId(id) });
    if (!order) return NextResponse.json({ message: 'order not found' }, { status: 404 });

    // 게스트 주문 판단 기준: userId가 없거나 guest=true 등 프로젝트 규칙에 맞춤
    const isGuestOrder = !order.userId || order.guest === true;
    if (!isGuestOrder) {
      return NextResponse.json({ message: 'not a guest order' }, { status: 400 });
    }

    // (선택) 이메일 해시 생성 지점: 프라이버시를 위해 원문은 저장/서명하지 않음
    // const emailHash = order?.customer?.email ? hash(order.customer.email) : undefined;

    const token = signOrderAccessToken({ orderId: String(order._id) });

    // HttpOnly 쿠키 세팅 (SameSite=Lax, Path=/, Secure=prod)
    const res = NextResponse.json({ success: true });
    res.cookies.set('orderAccessToken', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/', // 전체 경로에서 접근 가능
      maxAge: 60 * 60 * 24 * 7, // 7일
    });
    return res;
  } catch (e) {
    console.error('[guest-token] error', e);
    return NextResponse.json({ message: 'server error' }, { status: 500 });
  }
}
