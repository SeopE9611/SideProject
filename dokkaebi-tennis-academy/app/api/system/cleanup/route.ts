import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { deleteExpiredAccounts } from '@/lib/deleteExpiredAccounts';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;

export async function GET(req: NextRequest) {
  // Bearer 토큰 파싱
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.slice(7);

  // JWT 검증
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
  } catch {
    return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
  }

  // 관리자 권한 확인 (role 클레임이 payload에 있어야)
  if (decoded.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const deletedCount = await deleteExpiredAccounts();
  return NextResponse.json({ deletedCount });
}
