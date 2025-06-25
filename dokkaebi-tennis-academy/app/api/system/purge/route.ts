import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function DELETE(req: NextRequest) {
  // 내가만든 쿠키ㅣ이이ㅣㅣㅣ
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyAccessToken(token);

  if (payload?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    // 1년 지난 soft-deleted 유저 하드 삭제
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await db.collection('users').deleteMany({
      isDeleted: true,
      deletedAt: { $lt: cutoff },
    });

    return NextResponse.json({
      message: '삭제 완료',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('[SYSTEM_PURGE_DELETE]', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
