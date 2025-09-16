import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = verifyAccessToken(token);
  if (payload?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    // 1년(365일) 지난 soft-deleted 유저 미리보기
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const users = await db
      .collection('users')
      .find({ isDeleted: true, deletedAt: { $lt: cutoff } })
      .project({ hashedPassword: 0, password: 0 })
      .toArray();

    return NextResponse.json({ candidates: users });
  } catch (error) {
    console.error('[SYSTEM_PURGE_PREVIEW]', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
