import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth.utils';

export async function GET(req: Request) {
  // 토큰 추출
  const token = getTokenFromHeader(req.headers);
  const payload = token ? verifyAccessToken(token) : null;

  if (!payload) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 사용자 이메일
  const email = payload.email;

  // DB 연결
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection('applications');

  // 이메일 기준 필터링
  const applications = await collection.find({ email }).toArray();

  return NextResponse.json(applications);
}
