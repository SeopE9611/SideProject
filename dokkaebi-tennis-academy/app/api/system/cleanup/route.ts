import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function DELETE(req: NextRequest) {
  // 쿠키에서 accessToken 추출
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyAccessToken(token);

  // 관리자 전용
  if (payload?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    // 탈퇴한 계정 중 탈퇴 후 7일 지난 사용자 완전 삭제
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const result = await db.collection('users').deleteMany({
      isDeleted: true,
      deletedAt: { $lt: cutoff },
    });

    return NextResponse.json({
      message: '정리 완료',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('[SYSTEM_CLEANUP_DELETE]', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
