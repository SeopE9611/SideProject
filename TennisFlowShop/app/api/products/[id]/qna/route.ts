import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';

function toInt(v: string | null, fallback: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  return Math.min(max, Math.max(min, i));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = await getDb();
  const url = new URL(req.url);
  const page = toInt(url.searchParams.get('page'), 1, 1, 100000);
  const limit = toInt(url.searchParams.get('limit'), 10, 1, 50);

  const { id } = await params;

  const productId = id; // 문자열 ObjectId 그대로 저장했으므로 문자열 비교

  const filter: any = { type: 'qna', status: 'published', 'productRef.productId': productId };
  const total = await db.collection('board_posts').countDocuments(filter);
  const items = await db
    .collection('board_posts')
    .find(filter)
    .project({ content: 0, attachments: 0 })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  return NextResponse.json({ items, total, page, limit });
}
