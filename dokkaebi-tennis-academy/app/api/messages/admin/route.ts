import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { mapMessageListItem, notExpiredClause, parseListQuery } from '../_utils';

export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const db = await getDb();
  const col = db.collection('messages');
  const now = new Date();

  const filter = {
    toUserId: new ObjectId(me.id),
    toDeletedAt: null,
    isAdmin: true,
    ...notExpiredClause(now),
  };

  const total = await col.countDocuments(filter);
  const docs = await col
    .find(filter, {
      projection: {
        title: 1,
        body: 1,
        createdAt: 1,
        readAt: 1,
        fromUserId: 1,
        fromName: 1,
        toUserId: 1,
        toName: 1,
        isAdmin: 1,
        isBroadcast: 1,
        broadcastId: 1,
        expiresAt: 1,
      },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return NextResponse.json({ ok: true, items: docs.map(mapMessageListItem), total, page, limit }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const payload = (await req.json().catch(() => null)) as null | {
    title?: unknown;
    body?: unknown;
    /** 0 또는 미지정이면 만료 없음 */
    expireDays?: unknown;
  };

  const title = typeof payload?.title === 'string' ? payload.title.trim() : '';
  const body = typeof payload?.body === 'string' ? payload.body.trim() : '';
  const expireDaysRaw = typeof payload?.expireDays === 'number' ? payload.expireDays : Number(payload?.expireDays);
  const expireDays = Number.isFinite(expireDaysRaw) ? Math.floor(expireDaysRaw) : 0;

  if (!title) return NextResponse.json({ ok: false, error: '제목을 입력해주세요.' }, { status: 400 });
  if (!body) return NextResponse.json({ ok: false, error: '내용을 입력해주세요.' }, { status: 400 });

  const db = await getDb();

  // 전체 사용자 대상 (관리자 제외)
  const users = await db
    .collection('users')
    .find(
      {
        isDeleted: { $ne: true },
        role: { $ne: 'admin' },
      },
      { projection: { _id: 1, name: 1 } }
    )
    .toArray();

  if (users.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, broadcastId: null, expiresAt: null });
  }

  const now = new Date();
  const broadcastId = new ObjectId();
  const expiresAt = expireDays > 0 ? new Date(now.getTime() + expireDays * 24 * 60 * 60 * 1000) : undefined;

  const fromOid = new ObjectId(me.id);

  const docs = users.map((u) => ({
    fromUserId: fromOid,
    fromName: me.name ?? '관리자',
    toUserId: u._id,
    toName: (u as any).name ?? '회원',
    title,
    body,
    createdAt: now,
    readAt: null,
    // 관리자 발송은 '보낸쪽지함'에 찍히면 수천 건이 쌓일 수 있어 기본 숨김 처리
    fromDeletedAt: now,
    toDeletedAt: null,
    isAdmin: true,
    isBroadcast: true,
    broadcastId,
    ...(expiresAt ? { expiresAt } : {}),
  }));

  const res = await db.collection('messages').insertMany(docs, { ordered: false });

  return NextResponse.json({ ok: true, sent: res.insertedCount ?? docs.length, broadcastId: broadcastId.toString(), expiresAt: expiresAt ? expiresAt.toISOString() : null });
}
