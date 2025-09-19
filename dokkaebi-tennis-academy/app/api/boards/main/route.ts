import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  const db = await getDb();
  const col = db.collection('board_posts');
  const notices = await col.find({ type: 'notice', status: 'published' }).project({ content: 0, attachments: 0 }).sort({ isPinned: -1, createdAt: -1 }).limit(5).toArray();
  const qna = await col.find({ type: 'qna', status: 'published' }).project({ content: 0, attachments: 0 }).sort({ createdAt: -1 }).limit(5).toArray();
  return NextResponse.json({ notices, qna });
}
