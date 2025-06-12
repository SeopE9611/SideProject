// app/api/users/me/leave/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const RECOVERY_TOKEN_SECRET = process.env.RECOVERY_TOKEN_SECRET!;

export async function DELETE(req: NextRequest) {
  try {
    // 인증
    const authHeader = req.headers.get('authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let payload: JwtPayload;
    try {
      payload = jwt.verify(authHeader.slice(7), ACCESS_TOKEN_SECRET) as JwtPayload;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }
    const userId = payload.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 });
    }

    // soft-delete
    const db = (await clientPromise).db();
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          // withdrawalReason: null,
          // withdrawalDetail: null,
          // name: '(탈퇴한 회원)',
          // email: '',
          // phone: '',
          // address: '',
          // postalCode: '',
        },
      }
    );
    // recoveryToken 생성
    const recoveryToken = jwt.sign({ sub: userId.toString() }, RECOVERY_TOKEN_SECRET, {
      expiresIn: '24h',
    });

    // 정상 JSON 응답
    return NextResponse.json({ message: '탈퇴 완료', recoveryToken }, { status: 200 });
  } catch (err) {
    console.error('회원 탈퇴 중 오류:', err);
    // 500 일 때도 JSON으로 돌려주기
    return NextResponse.json({ error: '서버 오류 발생' }, { status: 500 });
  }
}
