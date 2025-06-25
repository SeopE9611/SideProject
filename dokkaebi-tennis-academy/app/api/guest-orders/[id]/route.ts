import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

// 단일 비회원 주문 상세 조회
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db();

    // 요청된 주문 ID로 주문 조회
    const order = await db.collection('orders').findOne({ _id: new ObjectId(params.id) });

    if (!order) {
      return NextResponse.json({ success: false, error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;

    // 보호 로직: 회원 주문일 경우, 로그인된 사용자만 접근 가능
    if (order.userId) {
      if (!payload || payload.sub !== order.userId.toString()) {
        return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
      }
    }

    // 비회원 주문은 userId 없음 -> 누구나 접근 허용
    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('[GUEST_ORDER_DETAIL_ERROR]', err);
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
}
