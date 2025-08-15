import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ reviews: [], summary: { count: 0, avg: 0 } });
  }

  const db = await getDb();
  const idObj = new ObjectId(id);

  // 리스트(혼종 포함)
  const reviews = await db
    .collection('reviews')
    .find({
      status: 'visible',
      $or: [{ productId: idObj }, { productId: id }],
    })
    .project({
      rating: 1,
      content: 1,
      photos: 1,
      userName: 1,
      createdAt: 1,
      helpfulCount: 1,
    })
    .sort({ createdAt: -1 })
    .toArray();

  // 요약 (집계)
  const agg = await db
    .collection('reviews')
    .aggregate([
      {
        $match: {
          status: 'visible',
          $or: [{ productId: idObj }, { productId: id }],
        },
      },
      { $group: { _id: null, avg: { $avg: '$rating' }, cnt: { $sum: 1 } } },
    ])
    .toArray();

  const summary = agg.length ? { count: agg[0].cnt, avg: Math.round(agg[0].avg * 10) / 10 } : { count: 0, avg: 0 };

  return NextResponse.json({ reviews, summary });
}
