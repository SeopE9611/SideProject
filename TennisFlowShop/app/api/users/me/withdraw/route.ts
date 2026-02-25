import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { ACCESS_TOKEN_SECRET } from '@/lib/constants';
import { auth } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  // 요청 본문에서 탈퇴 사유(reason)와 세부 사유(detail)를 추출
  let body: any = null;
  try {
    body = await req.json();
  } catch (e) {
    console.error('[users/me/withdraw] invalid json', e);
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const { reason, detail } = body;
  if (typeof reason !== 'string' || (detail != null && typeof detail !== 'string')) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json({ error: 'invalid user id' }, { status: 401 });
  }

  if (!userId) {
    return NextResponse.json({ message: 'Invalid token payload' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    // 기존: 진행 중 주문이 있는 경우 탈퇴 차단
    const hasOngoingOrder = await db.collection('orders').findOne({
      userId: userId,
      status: { $in: ['결제대기', '결제완료', '배송중', '대기중'] },
    });
    if (hasOngoingOrder) {
      return NextResponse.json({ error: '진행 중인 주문이 있어 탈퇴할 수 없습니다.\n마이페이지 (주문 내역)에서 확인하세요' }, { status: 400 });
    }

    // 기존: soft delete 처리
    const userEmail = (await db.collection('users').findOne({ _id: new ObjectId(userId) }))?.email;

    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          withdrawalReason: reason || null,
          withdrawalDetail: detail || null,
          name: '(탈퇴한 회원)',
          email: '',
          phone: '',
          address: '',
          postalCode: '',
        },
      }
    );

    // 성공 응답 (이메일 반환)
    return NextResponse.json({ message: '탈퇴 완료', email: userEmail }, { status: 200 });
  } catch (error) {
    console.error('탈퇴 처리 중 오류:', error);
    return NextResponse.json({ message: '서버 오류 발생' }, { status: 500 });
  }
}
