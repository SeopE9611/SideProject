import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { mapMessageDetail, notExpiredClause } from '../_utils';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  const db = await getDb();
  const col = db.collection('messages');

  const now = new Date();
  const oid = new ObjectId(id);

  const doc = await col.findOne({
    _id: oid,
    ...notExpiredClause(now),
  });

  if (!doc) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  const meId = String(me.id);
  const toId = doc.toUserId ? String(doc.toUserId) : null;
  const fromId = doc.fromUserId ? String(doc.fromUserId) : null;

  const isToMe = toId === meId;
  const isFromMe = fromId === meId;

  // 당사자가 아니면 접근 불가(관리자라도 유저간 쪽지는 열람 불가로 두는 게 안전)
  if (!isToMe && !isFromMe) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  // 소프트 삭제된 메시지는 각 박스에서 숨김
  if (isToMe && doc.toDeletedAt) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
  if (isFromMe && doc.fromDeletedAt) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // 받는 사람이 열면 읽음 처리
  if (isToMe && !doc.readAt) {
    await col.updateOne({ _id: oid, readAt: null }, { $set: { readAt: new Date() } });
    // 다시 조회(정확한 readAt 반영)
    const updated = await col.findOne({ _id: oid });
    return NextResponse.json({ ok: true, item: mapMessageDetail(updated ?? doc) }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  }

  return NextResponse.json({ ok: true, item: mapMessageDetail(doc) }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
}
