import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;

export async function DELETE(req: NextRequest) {
  try {
    // 바디 파싱 (reason/detail 없으면 null 처리)
    let reason: string | null = null;
    let detail: string | null = null;
    try {
      const body = await req.json();
      reason = body.reason ?? null;
      detail = body.detail ?? null;
    } catch {
      // DELETE 요청 시 바디를 안 보내도 에러 나지 않도록
    }

    // 토큰 검증
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    const userId = payload?.sub;
    if (!userId) return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 });

    // MongoDB 연결
    const db = (await clientPromise).db();

    // 아직 처리 중인 주문 있는지 확인 (배송 완료 전, 취소 전)
    const pending = await db.collection('orders').findOne({
      userId: new ObjectId(userId),
      status: { $in: ['대기중', '배송중'] },
    });
    if (pending) {
      return NextResponse.json({ error: '아직 처리 중인 주문이 있어 탈퇴할 수 없습니다.' }, { status: 400 });
    }

    // soft-delete 처리
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          withdrawalReason: reason,
          withdrawalDetail: detail,
        },
      }
    );

    // 성공 응답
    return NextResponse.json({ message: '탈퇴 완료' }, { status: 200 });
  } catch (err) {
    console.error('회원 탈퇴 중 오류:', err);
    return NextResponse.json({ error: '서버 오류 발생' }, { status: 500 });
  }
}
