import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const RECOVERY_TOKEN_SECRET = process.env.RECOVERY_TOKEN_SECRET!;

export async function POST(req: Request) {
  // body에서 token 꺼내기
  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: '토큰이 필요합니다.' }, { status: 400 });
  }

  // 토큰 검증
  let payload: any;
  try {
    payload = jwt.verify(token, RECOVERY_TOKEN_SECRET);
  } catch {
    return NextResponse.json({ error: '유효하지 않거나 만료된 토큰입니다.' }, { status: 403 });
  }

  // sub 클레임(사용자 ID) 확인
  const userId = payload.sub;
  if (!userId) {
    return NextResponse.json({ error: '잘못된 토큰입니다.' }, { status: 400 });
  }

  // soft-delete 해제
  const client = await clientPromise;
  const db = client.db();
  const result = await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: { isDeleted: false, deletedAt: null },
      $unset: { withdrawalReason: '', withdrawalDetail: '' },
    }
  );

  // 실패 시
  if (result.modifiedCount === 0) {
    return NextResponse.json({ error: '사용자 복구에 실패했습니다.' }, { status: 500 });
  }

  // 성공 시
  return NextResponse.json({ message: '계정이 정상 복구되었습니다.' }, { status: 200 });
}
