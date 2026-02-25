import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/hooks/get-current-user';

/**
 * - 상단 '쪽지함 N' 뱃지용
 * - 로그인 사용자 기준으로 미열람(= readAt: null) 쪽지 개수를 반환
 */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const now = new Date();

    const count = await db.collection('messages').countDocuments({
      toUserId: new ObjectId(me.id),
      readAt: null,
      toDeletedAt: null,
      // TTL 삭제 직전까지 남아있을 수 있으니, 이미 만료된 expiresAt은 제외
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
    });

    return NextResponse.json({ ok: true, count });
  } catch (e) {
    console.error('[messages/unread-count] error', e);
    return NextResponse.json({ ok: false, error: 'DB unavailable' }, { status: 503 });
  }
}
