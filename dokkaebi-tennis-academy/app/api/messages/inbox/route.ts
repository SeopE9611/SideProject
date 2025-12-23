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
