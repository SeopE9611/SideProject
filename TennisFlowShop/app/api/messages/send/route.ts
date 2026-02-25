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
    fromUserId: new ObjectId(me.id),
    fromDeletedAt: null,
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

  const payload = (await req.json().catch(() => null)) as null | {
    toUserId?: unknown;
    title?: unknown;
    body?: unknown;
  };

  const toUserId = typeof payload?.toUserId === 'string' ? payload.toUserId : '';
  const title = typeof payload?.title === 'string' ? payload.title.trim() : '';
  const body = typeof payload?.body === 'string' ? payload.body.trim() : '';

  if (!ObjectId.isValid(toUserId)) return NextResponse.json({ ok: false, error: 'Invalid toUserId' }, { status: 400 });
  if (!title) return NextResponse.json({ ok: false, error: '제목을 입력해주세요.' }, { status: 400 });
  if (!body) return NextResponse.json({ ok: false, error: '내용을 입력해주세요.' }, { status: 400 });
  if (toUserId === me.id) return NextResponse.json({ ok: false, error: '본인에게는 쪽지를 보낼 수 없습니다.' }, { status: 400 });

  const db = await getDb();

  // 받는 사람 확인
  const toOid = new ObjectId(toUserId);
  const toUser = (await db.collection('users').findOne({ _id: toOid, isDeleted: { $ne: true } }, { projection: { name: 1, role: 1 } })) as null | { name?: string; role?: string };

  if (!toUser) return NextResponse.json({ ok: false, error: '사용자를 찾을 수 없습니다. \n (탈퇴한 회원)' }, { status: 404 });

  const isFromAdmin = me.role === 'admin';
  const isToAdmin = toUser.role === 'admin';

  // 조건(게시글 5 + 댓글 5), 단 관리자/관리자에게 보내기는 예외
  if (!isFromAdmin && !isToAdmin) {
    const fromOid = new ObjectId(me.id);
    const [communityPostCount, qnaPostCount, communityCommentCount] = await Promise.all([
      db.collection('community_posts').countDocuments({ userId: fromOid, status: 'public' }),
      db.collection('board_posts').countDocuments({ authorId: me.id, type: 'qna', status: 'published' }),
      db.collection('community_comments').countDocuments({ userId: fromOid, status: 'public' }),
    ]);

    const postCount = communityPostCount + qnaPostCount;
    const commentCount = communityCommentCount;

    if (postCount < 5 || commentCount < 5) {
      return NextResponse.json(
        {
          ok: false,
          error: '쪽지는 게시글 5개 이상 + 댓글 5개 이상부터 이용할 수 있습니다. (스팸 광고 방지)',
          required: { posts: 5, comments: 5 },
          current: { posts: postCount, comments: commentCount },
        },
        { status: 403 },
      );
    }
  }

  // 레이트리밋
  if (!isFromAdmin) {
    const fromOid = new ObjectId(me.id);
    const msgCol = db.collection('messages');

    const now = Date.now();
    const oneMinAgo = new Date(now - 60 * 1000);
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const [cnt1m, cnt24h] = await Promise.all([msgCol.countDocuments({ fromUserId: fromOid, createdAt: { $gt: oneMinAgo } }), msgCol.countDocuments({ fromUserId: fromOid, createdAt: { $gt: dayAgo } })]);

    if (cnt1m >= 3) return NextResponse.json({ ok: false, error: '분당 3회 제한' }, { status: 429 });
    if (cnt24h >= 20) return NextResponse.json({ ok: false, error: '하루 20회 제한' }, { status: 429 });
  }

  // 저장
  const now = new Date();
  const doc = {
    fromUserId: new ObjectId(me.id),
    fromName: me.name ?? '회원',
    toUserId: toOid,
    toName: toUser.name ?? '회원',
    title,
    body,
    createdAt: now,
    readAt: null,
    fromDeletedAt: null,
    toDeletedAt: null,
    isAdmin: isFromAdmin,
    isBroadcast: false,
  };

  const res = await db.collection('messages').insertOne(doc);
  return NextResponse.json({ ok: true, id: res.insertedId.toString() });
}
