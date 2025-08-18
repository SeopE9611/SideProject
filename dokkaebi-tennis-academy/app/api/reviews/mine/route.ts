import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

type DbAny = any;

export async function GET(req: Request) {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sub) return NextResponse.json({ message: 'unauthorized' }, { status: 401 });

  const db = await getDb();
  const userId = new ObjectId(String(payload.sub));

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 10)));
  const cursorB64 = url.searchParams.get('cursor');

  // 커서: createdAt, _id (desc)
  let cursorMatch: any = {};
  if (cursorB64) {
    try {
      const c = JSON.parse(Buffer.from(cursorB64, 'base64').toString('utf-8'));
      cursorMatch = { $or: [{ createdAt: { $lt: new Date(c.createdAt) } }, { createdAt: new Date(c.createdAt), _id: { $lt: new ObjectId(c.id) } }] };
    } catch {
      /* 무시하고 첫 페이지로 */
    }
  }

  const pipeline: any[] = [
    { $match: { userId, isDeleted: { $ne: true } } },
    { $match: cursorMatch },
    { $sort: { createdAt: -1, _id: -1 } },
    { $limit: limit + 1 },

    // 상품명 등 표시용 조인 (상품 리뷰인 경우)
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product',
        pipeline: [{ $project: { name: 1, images: 1 } }],
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },

    {
      $project: {
        _id: 1,
        type: { $cond: [{ $ifNull: ['$productId', null] }, 'product', 'service'] },
        productName: '$product.name',
        rating: 1,
        content: 1,
        status: 1, // 'visible' | 'hidden'
        photos: 1,
        helpfulCount: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ];

  const rows = await db.collection('reviews').aggregate(pipeline).toArray();

  let nextCursor: string | null = null;
  if (rows.length > limit) {
    const last = rows[limit - 1];
    rows.length = limit;
    nextCursor = Buffer.from(JSON.stringify({ id: String(last._id), createdAt: last.createdAt }), 'utf-8').toString('base64');
  }

  return NextResponse.json({ items: rows, nextCursor });
}
