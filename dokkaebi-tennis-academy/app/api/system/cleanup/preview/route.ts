import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import clientPromise from '@/lib/mongodb';
import { ACCESS_TOKEN_SECRET } from '@/lib/constants'; // 혹은 process.env.ACCESS_TOKEN_SECRET!

export async function GET(req: NextRequest) {
  // JWT 토큰 가져오기
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  const token = authHeader.slice(7);

  // 토큰 검증
  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
  } catch {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  // 관리자 권한 체크
  if (payload.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  // 7일 지난 soft-deleted 유저 조회
  const db = (await clientPromise).db();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const users = await db
    .collection('users')
    .find({ isDeleted: true, deletedAt: { $lte: cutoff } })
    .project({ hashedPassword: 0, password: 0 })
    .toArray();

  return NextResponse.json(users);
}
