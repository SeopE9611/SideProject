import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const RECOVERY_TOKEN_SECRET = process.env.RECOVERY_TOKEN_SECRET!;

export async function POST(req: Request) {
  // body에서 token 꺼내기
  let body: any = null;
  try {
    body = await req.json();
  } catch (e) {
    console.error('[users/me/restore] invalid json', e);
    return NextResponse.json({ ok: false, message: 'INVALID_JSON' }, { status: 400 });
  }

  const token = body?.token;
  if (typeof token !== 'string' || !token) {
    return NextResponse.json({ ok: false, message: 'INVALID_TOKEN' }, { status: 400 });
  }
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
  const userId = String(payload.sub ?? '');
  if (!userId || !ObjectId.isValid(userId)) {
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
