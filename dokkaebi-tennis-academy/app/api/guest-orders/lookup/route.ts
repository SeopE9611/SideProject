import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function POST(req: Request) {
  try {
    const { name, email, phone } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ success: false, error: '이름과 이메일은 필수입니다.' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const query = {
      guestInfo: {
        $exists: true,
        $ne: null,
      },
      'guestInfo.name': name,
      'guestInfo.email': email,
      // 전화번호는 선택 조건 (있으면 추가로 일치시킴)
      ...(phone && { 'guestInfo.phone': phone }),
    };

    const orders = await db.collection('orders').find(query).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('[GUEST_ORDER_LOOKUP_ERROR]', error);
    return NextResponse.json({ success: false, error: '주문 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
