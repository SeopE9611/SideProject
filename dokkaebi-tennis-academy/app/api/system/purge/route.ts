import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import clientPromise from '@/lib/mongodb';
import { ACCESS_TOKEN_SECRET } from '@/lib/constants';

export async function GET(req: NextRequest) {
  // JWT 토큰 검증 (cleanup/preview와 동일)
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  const token = authHeader.slice(7);

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
  } catch {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  if (payload.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  // 1년 지난 soft-deleted 유저 하드 삭제
  const db = (await clientPromise).db();
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const result = await db.collection('users').deleteMany({
    isDeleted: true,
    deletedAt: { $lte: cutoff },
  });

  return NextResponse.json({ deletedCount: result.deletedCount });
}
